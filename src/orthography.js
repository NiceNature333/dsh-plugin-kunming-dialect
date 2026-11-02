// Optional local user spelling preferences. No dictionary rules are bundled.
import {readFileSync} from 'node:fs';
export function loadOrthography(path){
 if(!path)return [];
 const rules=JSON.parse(readFileSync(path,'utf8'));
 if(!Array.isArray(rules)||rules.length>100)throw new Error('INVALID_ORTHOGRAPHY');
 for(const r of rules)if(typeof r.source!=='string'||!r.source||r.source.length>32||typeof r.target!=='string'||!r.target||r.target.length>32||!Array.isArray(r.excludePhrases)||r.excludePhrases.some(x=>typeof x!=='string'||!x||x.length>80)||(r.onlyBefore!==undefined&&(!Array.isArray(r.onlyBefore)||r.onlyBefore.some(x=>typeof x!=='string'||!x||x.length>32))))throw new Error('INVALID_ORTHOGRAPHY');
 return rules;
}
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function protectedPattern(rules){
 const terms=[...new Set(rules.flatMap(r=>r.excludePhrases))].sort((a,b)=>b.length-a.length);
 return new RegExp('```[\\s\\S]*?```|`[^`]*`|https?:\\/\\/[^\\s]+|[A-Za-z]:[\\\\/][^\\s]+|“[^”]*”|「[^」]*」'+(terms.length?'|'+terms.map(escape).join('|'):''),'g');
}
export function applyOrthography(text,rules){
 if(!rules.length)return text;
 const re=protectedPattern(rules);let last=0,result='';
 const rewrite=part=>{for(const r of rules)part=r.onlyBefore?part.replace(new RegExp(escape(r.source)+'(?='+r.onlyBefore.map(escape).join('|')+')','g'),()=>r.target):part.split(r.source).join(r.target);return part;};
 for(const match of text.matchAll(re)){result+=rewrite(text.slice(last,match.index))+match[0];last=match.index+match[0].length;}
 return result+rewrite(text.slice(last));
}
export function assertProtectedSpellings(draft,text,rules){
 for(const match of draft.matchAll(protectedPattern(rules)))if(!text.includes(match[0]))throw new Error('FACT_CHANGED');
}
export function maskProtectedSpellings(draft,rules){
 if(!rules.length)return {text:draft,restore:text=>text};
 let prefix='KUNMINGKEEP';while(draft.includes(prefix))prefix+='X';
 const saved=[];
 const text=draft.replace(protectedPattern(rules),part=>{const token=prefix+saved.length+'END';saved.push({token,part});return token;});
 return {text,restore(output){
  if(typeof output!=='string')throw new Error('INVALID_OUTPUT');
  for(const {token,part} of saved){if(output.split(token).length!==2)throw new Error('FACT_CHANGED');output=output.replace(token,()=>part);}
  if(output.includes(prefix))throw new Error('INVALID_OUTPUT');return output;
 }};
}

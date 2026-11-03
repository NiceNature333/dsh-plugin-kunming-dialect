// Optional local user spelling preferences. No dictionary rules are bundled.
import {readFileSync} from 'node:fs';
export function loadOrthography(path){
 if(!path)return [];
 const rules=JSON.parse(readFileSync(path,'utf8'));
 if(!Array.isArray(rules)||rules.length>100)throw new Error('INVALID_ORTHOGRAPHY');
 for(const r of rules)if(typeof r.source!=='string'||!r.source||r.source.length>32||typeof r.target!=='string'||!r.target||r.target.length>32||!Array.isArray(r.excludePhrases)||r.excludePhrases.some(x=>typeof x!=='string'||!x||x.length>80)||(r.onlyBefore!==undefined&&(!Array.isArray(r.onlyBefore)||r.onlyBefore.some(x=>typeof x!=='string'||!x||x.length>32))))throw new Error('INVALID_ORTHOGRAPHY');
 for(const rule of rules){
  if(rule.kind!==undefined&&!['literal','repeated-negation','possessive'].includes(rule.kind))throw new Error('INVALID_ORTHOGRAPHY');
  if(rule.probability!==undefined&&(typeof rule.probability!=='number'||!Number.isFinite(rule.probability)||rule.probability<0||rule.probability>1))throw new Error('INVALID_ORTHOGRAPHY');
  if(['possessive','repeated-negation'].includes(rule.kind)&&rule.onlyBefore!==undefined)throw new Error('INVALID_ORTHOGRAPHY');
 }
 return rules;
}
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function protectedPattern(rules){
 const terms=[...new Set(rules.flatMap(r=>r.excludePhrases))].sort((a,b)=>b.length-a.length);
 return new RegExp('```[\\s\\S]*?```|`[^`]*`|https?:\\/\\/[^\\s]+|[A-Za-z]:[\\\\/][^\\s]+|“[^”]*”|「[^」]*」'+(terms.length?'|'+terms.map(escape).join('|'):''),'g');
}
export function applyOrthography(text,rules,{random=Math.random,semanticMarkers=[]}={}){
 if(!rules.length)return text;
 const re=protectedPattern(rules);let last=0,result='';
 const rewrite=part=>{
  for(const [index,rule] of rules.entries()){
   const choose=(original,replacement)=>(rule.probability===undefined||random()<rule.probability)?replacement:original;
   if(rule.kind==='possessive'){
    const marker=semanticMarkers[index];
    if(marker)part=part.replace(new RegExp(escape(marker),'g'),()=>choose(rule.source,rule.target));
   }else if(rule.kind==='repeated-negation'){
    part=part.replace(new RegExp('([\\p{Script=Han}]{1,4})'+escape(rule.source)+'\\1','gu'),(original,word)=>choose(original,rule.target+word));
   }else{
    const suffix=rule.onlyBefore?'(?='+rule.onlyBefore.map(escape).join('|')+')':'';
    part=part.replace(new RegExp(escape(rule.source)+suffix,'g'),original=>choose(original,rule.target));
   }
  }
  return part;
 };
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

import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fixture} from './fixtures/synthetic-dictionary.js';
import {lookup_dialect} from '../src/retrieval.js';
import {parseRewrite,adoption} from '../src/adoption.js';
import {createRewriter} from '../src/rewrite.js';
import {configure} from '../src/config.js';
import {lookup} from '../src/lookup.js';
import {Feedback} from '../src/feedback.js';
import {diagnostics} from '../src/diagnostics.js';
test('common single character overlap cannot recall unrelated entries; reverse meaning wins',()=>{
 const f=fixture();const db=new DatabaseSync(f.path);db.prepare('INSERT INTO search_index VALUES(?,?,?)').run('b','问',99);db.close();
 try{const rows=lookup_dialect(f.dictionary,'发出问候');assert.equal(rows[0].id,'a');assert.ok(!rows.some(r=>r.id==='b'));assert.ok(f.dictionary.lastQueryCount<=21);}finally{f.close();}
});
test('lookup handles alias and sentence, keeps review risk and missing status',()=>{const f=fixture();const db=new DatabaseSync(f.path);db.exec('CREATE TABLE aliases(entry_id TEXT,alias TEXT)');db.prepare('INSERT INTO aliases VALUES(?,?)').run('c','虚构别写');db.close();try{assert.equal(lookup(f.dictionary,'请解释虚构别写').entries[0].id,'c');assert.equal(lookup(f.dictionary,'虚构别写').entries[0].uncertain,true);assert.equal(lookup(f.dictionary,'不在库中的测试标记').status,'not_recorded');}finally{f.close();}});
test('adoption separates unsupported claims, existing words and inserted headwords',()=>{const candidates=[{id:'a',lemma:'虚构甲词',mandarin_meaning:'问候'},{id:'b',lemma:'已有词'},{id:'c',lemma:'通用',mandarin_meaning:'通用'}];const r=adoption('已有词','已有词虚构甲词通用',candidates,['a','b','unknown']);assert.deepEqual(r.verified_adopted_ids,['a']);assert.deepEqual(r.preexisting_ids,['b']);assert.ok(r.uncertain_ids.includes('unknown'));assert.ok(r.uncertain_ids.includes('c'));});
test('malformed structured output never leaks JSON',async()=>{assert.throws(()=>parseRewrite('{"text":'));const llm={async *stream(){yield {type:'text-delta',text:'{"text": "broken"'};yield {type:'finish',reason:{kind:'stop'}};}};const r=await createRewriter(configure({retries:0}),{candidates:()=>[]},{llm})({draft:'原始草稿'});assert.equal(r.text,'原始草稿');assert.notEqual(r.status,'ok');});
test('structured output renders only text and reports verified adoption',async()=>{const c={id:'a',lemma:'虚构甲词',mandarin_meaning:'问候',score:2};const llm={async *stream(){yield {type:'text-delta',text:JSON.stringify({text:'虚构甲词',used_entry_ids:['a']})};yield {type:'finish',reason:{kind:'stop'}};}};const r=await createRewriter(configure(),{candidates:()=>[c]},{llm})({draft:'问候'});assert.equal(r.text,'虚构甲词');assert.equal(r.adopted_count,1);});
test('feedback is scoped, pending and administratively reversible',()=>{const dir=mkdtempSync(join(tmpdir(),'feedback-')),f=new Feedback(join(dir,'overlay.sqlite'));try{assert.throws(()=>f.submit({term:'甲',meaning:'乙',explicit_user_feedback:true},''));const r=f.submit({term:'甲',meaning:'乙',explicit_user_feedback:true},'group-a');assert.equal(f.list('group-b').length,0);assert.equal(f.list('group-a')[0].review_status,'pending');assert.throws(()=>f.review(r.id,'group-a',{status:'dictionary_verified'}));assert.equal(f.review(r.id,'group-b',{status:'corroborated'}),0);assert.equal(f.review(r.id,'group-a',{status:'corroborated',meaning:'丙'}),1);assert.equal(f.delete(r.id,'group-a'),1);}finally{f.close();rmSync(dir,{recursive:true,force:true});}});
test('aggregate diagnostics exclude content, bound retention and clear',()=>{const dir=mkdtempSync(join(tmpdir(),'diagnostic-')),path=join(dir,'stats.json'),d=diagnostics(path,{retention:2});try{for(let i=0;i<3;i++)d.record({text:'private marker',adopted_count:i},{draft:'private marker'});const raw=readFileSync(path,'utf8');assert.ok(!raw.includes('private marker'));assert.equal(JSON.parse(raw).length,2);d.clear();}finally{rmSync(dir,{recursive:true,force:true});}});

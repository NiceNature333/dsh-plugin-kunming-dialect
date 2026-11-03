import test from 'node:test';import assert from 'node:assert/strict';
import {applyOrthography,assertProtectedSpellings,loadOrthography,maskProtectedSpellings} from '../src/orthography.js';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
// Fictional mappings only; real user spelling rules live outside the repository.
const rules=[{source:'甲',target:'乙',excludePhrases:['甲技术','甲专名']}];
test('local spelling applies to ordinary text only',()=>{assert.equal(applyOrthography('甲，甲技术，“甲”，`甲`，https://example.com/甲',rules),'乙，甲技术，“甲”，`甲`，https://example.com/甲');});
test('quoted spans and technical exceptions must remain literal',()=>{assert.throws(()=>assertProtectedSpellings('甲技术','乙技术',rules));assert.doesNotThrow(()=>assertProtectedSpellings('“甲”','“甲”',rules));});
test('empty mapping preserves output',()=>{assert.equal(applyOrthography('original',[]),'original');assert.deepEqual(loadOrthography(),[]);});
test('protected spans are hidden and restored exactly once',()=>{const m=maskProtectedSpellings('甲技术与“甲”',rules);assert.ok(!m.text.includes('甲'));assert.equal(m.restore(m.text),'甲技术与“甲”');assert.throws(()=>m.restore('lost tokens'));assert.throws(()=>m.restore(m.text+m.text));});
test('context-limited mappings do not rewrite unrelated words',()=>{assert.equal(applyOrthography('甲好，甲技术，甲差',[{source:'甲',target:'乙',onlyBefore:['好'],excludePhrases:[]}]),'乙好，甲技术，甲差');});
test('repeated structures preserve context, protected spans and subsequent mappings',()=>{
 const mapping=[{kind:'repeated-negation',source:'否',target:'丙',excludePhrases:['甲否甲专名']},{source:'甲',target:'乙',excludePhrases:[]}];
 assert.equal(applyOrthography('你甲否甲，甲丁否甲丁，甲否丁，“甲否甲”，甲否甲专名',mapping),'你丙乙，丙乙丁，乙否丁，“甲否甲”，甲否甲专名');
});
test('semantic replacements sample each marked occurrence and leave unmarked source alone',()=>{
 const mapping=[{kind:'possessive',source:'甲',target:'乙',probability:0.75,excludePhrases:[]}];
 const samples=[0,0.749999,0.75,0.999];
 let draws=0;
 assert.equal(applyOrthography('TAG TAG TAG TAG 甲 “TAG”',mapping,{semanticMarkers:['TAG'],random:()=>samples[draws++]}),'乙 乙 甲 甲 甲 “TAG”');
 assert.equal(draws,4);
 assert.equal(applyOrthography('甲',mapping,{random:()=>{throw Error('unexpected draw')}}),'甲');
});
test('invalid probability and rule kinds are rejected',()=>{
 const directory=mkdtempSync(join(tmpdir(),'orthography-test-'));
 try{
  const path=join(directory,'rules.json');
  for(const extra of [{probability:-0.1},{probability:1.1},{probability:'0.75'},{kind:'unknown'},{kind:'possessive',onlyBefore:['甲']}]){
   writeFileSync(path,JSON.stringify([{source:'甲',target:'乙',excludePhrases:[],...extra}]));
   assert.throws(()=>loadOrthography(path),/INVALID_ORTHOGRAPHY/);
  }
 }finally{rmSync(directory,{recursive:true,force:true});}
});

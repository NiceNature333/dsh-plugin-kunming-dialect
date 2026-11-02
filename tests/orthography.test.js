import test from 'node:test';import assert from 'node:assert/strict';
import {applyOrthography,assertProtectedSpellings,loadOrthography,maskProtectedSpellings} from '../src/orthography.js';
// Fictional mappings only; real user spelling rules live outside the repository.
const rules=[{source:'甲',target:'乙',excludePhrases:['甲技术','甲专名']}];
test('local spelling applies to ordinary text only',()=>{assert.equal(applyOrthography('甲，甲技术，“甲”，`甲`，https://example.com/甲',rules),'乙，甲技术，“甲”，`甲`，https://example.com/甲');});
test('quoted spans and technical exceptions must remain literal',()=>{assert.throws(()=>assertProtectedSpellings('甲技术','乙技术',rules));assert.doesNotThrow(()=>assertProtectedSpellings('“甲”','“甲”',rules));});
test('empty mapping preserves output',()=>{assert.equal(applyOrthography('original',[]),'original');assert.deepEqual(loadOrthography(),[]);});
test('protected spans are hidden and restored exactly once',()=>{const m=maskProtectedSpellings('甲技术与“甲”',rules);assert.ok(!m.text.includes('甲'));assert.equal(m.restore(m.text),'甲技术与“甲”');assert.throws(()=>m.restore('lost tokens'));assert.throws(()=>m.restore(m.text+m.text));});
test('context-limited mappings do not rewrite unrelated words',()=>{assert.equal(applyOrthography('甲好，甲技术，甲差',[{source:'甲',target:'乙',onlyBefore:['好'],excludePhrases:[]}]),'乙好，甲技术，甲差');});

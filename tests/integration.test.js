import test from 'node:test';import assert from 'node:assert/strict';
import {apply} from '../src/index.js';import {fixture} from './fixtures/synthetic-dictionary.js';
test('tool registration and rewrite work without any imported dictionary',async()=>{
 const f=fixture();let tool,section;const registered=[];const disposers=[];
 const ctx={llm:{async *stream(){yield {type:'text-delta',text:'你好呀。'};yield {type:'finish',reason:{kind:'stop'}};}},tools:{register(t){tool=t;registered.push(t.name);}},systemPrompt:{section(s){section=s;return ()=>{};}},effect(fn){fn();},on(name,fn){disposers.push(fn);}};
 try{apply(ctx,{dbPath:f.path,diagnosticsMode:'off'});assert.equal(tool.name,'kunming_rewrite');assert.deepEqual(registered,['kunming_lookup','kunming_feedback','kunming_rewrite']);assert.ok(section.text.includes('不得输出'));const r=await tool.execute({draft:'你好。'});assert.equal(r.status,'ok');assert.equal(r.text,'你好呀。');}finally{for(const dispose of disposers)dispose();f.close();}
});

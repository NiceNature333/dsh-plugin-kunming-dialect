import {readFileSync,writeFileSync} from 'node:fs';
import {Dictionary} from '../src/dictionary.js';
import {configure} from '../src/config.js';
import {lookup_dialect} from '../src/retrieval.js';
import {createRewriter} from '../src/rewrite.js';
export async function evaluate(llm){
 const config=configure(),dict=new Dictionary(config.dbPath),rewrite=createRewriter(config,dict,{llm});
 const cases=JSON.parse(readFileSync(new URL('../tests/fixtures/rewrite-cases.json',import.meta.url),'utf8'));const output=[];
 try{for(const item of cases){const candidates=lookup_dialect(dict,item.draft);const result=await rewrite(item);output.push({...item,candidates,...result,evaluation_notes:'自动检查数字/英文保留；自然度、本土性和人格一致性待昆明母语者复核。'});writeFileSync(new URL('../data/evaluation.json',import.meta.url),JSON.stringify(output,null,2));}}
 finally{dict.close();}return output;
}

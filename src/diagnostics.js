import {mkdirSync,readFileSync,writeFileSync,unlinkSync,existsSync} from 'node:fs';
import {dirname} from 'node:path';
// One bounded local file. Aggregate mode never serializes drafts or headwords.
export function diagnostics(path,{mode='aggregate',retention=200}={}){
  if(!['off','aggregate','private'].includes(mode)||!Number.isInteger(retention)||retention<1||retention>10000)throw Error('invalid diagnostics');
  return {clear(){if(path&&existsSync(path))unlinkSync(path);},record(result,detail={}){
    if(!path||mode==='off')return;
    try{
      let rows=[];try{rows=JSON.parse(readFileSync(path,'utf8'));}catch{}
      const row={time:new Date().toISOString()};
      for(const key of ['matched_count','retrieved_count','example_count','adopted_count','rewrite_status','retrieval_ms','rewrite_ms','elapsed_ms'])row[key]=result[key];
      if(mode==='private')Object.assign(row,detail,result);
      mkdirSync(dirname(path),{recursive:true});writeFileSync(path,JSON.stringify([...rows,row].slice(-retention)));
    }catch{/* Diagnostics never break a reply. */}
  }};
}

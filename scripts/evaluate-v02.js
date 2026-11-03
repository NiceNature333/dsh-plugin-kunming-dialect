import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {Dictionary} from '../src/dictionary.js';
import {configure} from '../src/config.js';
import {lookup_dialect} from '../src/retrieval.js';
import {createRewriter} from '../src/rewrite.js';
import {lookup} from '../src/lookup.js';
import {cases} from '../tests/fixtures/evaluation-120.js';
const root=resolve('data/private/reports'),file=root+'/EVALUATION_120.json';
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
export async function evaluate(llm){
 mkdirSync(root,{recursive:true});
 const config=configure({includeUnreviewed:true,includeExampleCandidates:true,examplesPerEntry:3,retrievalLimit:12,retries:0,orthographyPath:existsSync('data/private/orthography.json')?resolve('data/private/orthography.json'):undefined});
 const legacy=await import(pathToFileURL(root+'/v02-before/src/dictionary.js'));
 const oldSearch=await import(pathToFileURL(root+'/v02-before/src/retrieval.js'));
 const dict=new Dictionary(config.dbPath,config),old=new legacy.Dictionary(config.dbPath,config);
 const identity={dictionary_sha256:hash(config.dbPath),prompt_sha256:hash('src/prompts/kunming-rewrite.md'),cases_sha256:hash('tests/fixtures/evaluation-120.js'),model:config.model,provider:config.provider,maxOutputTokens:config.maxOutputTokens,seed:null,retries:0,comparison:'same current structured prompt, old vs new retrieval; not historical model outputs'};
 let report={identity,started_at:new Date().toISOString(),cases:[]};
 if(existsSync(file)){
  const previous=JSON.parse(readFileSync(file));
  if(JSON.stringify(previous.identity)!==JSON.stringify(identity)){
   const {cases_sha256:a,...oldIdentity}=previous.identity,{cases_sha256:b,...newIdentity}=identity;
   if(process.env.KUNMING_REFRESH_CASES!=='1'||JSON.stringify(oldIdentity)!==JSON.stringify(newIdentity))throw Error('Evaluation identity changed; archive existing report before rerunning');
   writeFileSync(root+'/EVALUATION_120.before-case-refresh.json',JSON.stringify(previous,null,2));
   previous.cases=previous.cases.filter(r=>cases.some(c=>c.id===r.id&&c.draft===r.draft&&c.context===r.context));previous.identity=identity;
  }
  report=previous;
 }
 let calls=0;
 try{
  for(let offset=0;offset<cases.length;offset+=3){
   await Promise.all(cases.slice(offset,offset+3).map(async item=>{
    let row=report.cases.find(x=>x.id===item.id);if(!row){row={...item,variants:{},human_evaluation:'待人工评价',...(item.category==='方言理解'?{input_lookup:lookup(dict,item.context)}:{})};report.cases.push(row);}
    for(const variant of ['old','new']){
     if(row.variants[variant])continue;
     if(++calls>240)throw Error('CALL_BUDGET');
     const d=variant==='old'?{candidates:()=>oldSearch.lookup_dialect(old,item.draft,12)}:dict;
     const start=performance.now(),candidates=variant==='old'?oldSearch.lookup_dialect(old,item.draft,12):lookup_dialect(dict,item.draft,12),retrieval_ms=performance.now()-start;
     let usage=[];const measured={async *stream(options){for await(const chunk of llm.stream(options)){if(chunk.usage)usage.push(chunk.usage);yield chunk;}}};
     const result=await createRewriter(config,d,{llm:measured})(item);
     row.variants[variant]={candidates,retrieval_ms,db_operations:variant==='new'?dict.lastQueryCount:null,...result,token_usage:usage.length?usage:null,semantic_check:'numeric/technical/date checks only; full semantic fidelity requires human review'};
     writeFileSync(file,JSON.stringify(report,null,2));
    }
   }));
   console.log('EVALUATION_PROGRESS',Math.min(offset+3,120));
  }
 }finally{dict.close();old.close();}
 report.completed_at=new Date().toISOString();report.summary={};
 for(const variant of ['old','new']){const rows=report.cases.map(x=>x.variants[variant]).filter(Boolean),mean=k=>rows.reduce((n,r)=>n+(r[k]||0),0)/rows.length;report.summary[variant]={count:rows.length,success:rows.filter(r=>r.status==='ok').length,fallback:rows.filter(r=>r.status!=='ok').length,coverage:rows.filter(r=>r.hits>0).length/rows.length,mean_candidates:mean('hits'),mean_adopted:mean('adopted_count'),mean_retrieval_ms:mean('retrieval_ms'),mean_rewrite_ms:mean('rewrite_ms'),human_precision:'待人工评价',naturalness:'待人工评价'};}
 writeFileSync(file,JSON.stringify(report,null,2));
 writeFileSync(root+'/EVALUATION_120.md','# 120-case private evaluation\n\nNo fixed seed; generation can vary. Human dialect and relevance ratings pending.\n\n```json\n'+JSON.stringify(report.summary,null,2)+'\n```\n\n'+report.cases.sort((a,b)=>cases.findIndex(x=>x.id===a.id)-cases.findIndex(x=>x.id===b.id)).map(r=>'## '+r.id+' '+r.category+'\n\n草稿：'+r.draft+'\n\n旧：'+r.variants.old.text+'\n\n新：'+r.variants.new.text+'\n\n人工评价：待人工评价\n').join('\n'));
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 writeFileSync(root+'/EVALUATION_120.html','<!doctype html><meta charset="utf-8"><title>私有评测</title><style>body{font:16px system-ui;max-width:1000px;margin:40px auto}article{border-top:1px solid #ccc;padding:20px}pre{white-space:pre-wrap}textarea{width:95%}</style><h1>120 条私有对照：待人工评价</h1><pre>'+escape(JSON.stringify(report.summary,null,2))+'</pre>'+report.cases.map(r=>'<article><h2>'+escape(r.id+' '+r.category)+'</h2><p>'+escape(r.draft)+'</p><p>旧：'+escape(r.variants.old.text)+'</p><p>新：'+escape(r.variants.new.text)+'</p><details><summary>候选及统计</summary><pre>'+escape(JSON.stringify(r.variants,null,2))+'</pre></details><p>人工打分请记录到独立私有标注文件；页面不自动保存。</p></article>').join(''));
 return report;
}

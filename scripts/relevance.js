// Export private candidate judgments, then calculate metrics only after human labeling.
// node scripts/relevance.js [path-to-private-labels.json]
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {cases} from '../tests/fixtures/evaluation-120.js';
const root=resolve('data/private/reports');mkdirSync(root,{recursive:true});
const evaluation=JSON.parse(readFileSync(root+'/EVALUATION_120.json','utf8'));
const labelPath=process.argv[2];
if(!labelPath){
 const judgments=evaluation.cases.map(row=>({id:row.id,draft:row.draft,no_relevant_entries:null,relevant_ids:[],pool:[...new Map(Object.values(row.variants).flatMap(v=>v.candidates).map(c=>[c.id,{id:c.id,lemma:c.lemma,meaning:c.mandarin_meaning,relevant:null}])).values()],complete:false}));
 writeFileSync(root+'/RELEVANCE_LABEL_TEMPLATE.json',JSON.stringify(judgments,null,2));console.log('Private annotation template exported; no human scores fabricated.');
}else{
 const labels=JSON.parse(readFileSync(labelPath,'utf8')),results={};
 for(const variant of ['old','new']){
  const scores=[];
  for(const label of labels){
   if(label.complete!==true)continue;
   const row=evaluation.cases.find(r=>r.id===label.id);if(!row)throw Error('Unknown case');
   const relevance=new Map(label.pool.map(x=>[x.id,x.relevant]));
   if([...relevance.values()].some(v=>typeof v!=='boolean'))throw Error('Complete cases require boolean judgments for the entire pool');
   const ids=row.variants[variant].candidates.map(c=>c.id),precision=k=>ids.slice(0,k).filter(id=>relevance.get(id)===true).length/k;
   const total=label.relevant_ids.length;
   scores.push({id:label.id,precision5:precision(5),precision10:precision(10),recall10:total?ids.slice(0,10).filter(id=>label.relevant_ids.includes(id)).length/total:null,false_positive_ratio:ids.length?ids.filter(id=>relevance.get(id)===false).length/ids.length:0,no_relevant_false_hits:label.no_relevant_entries===true?ids.length:null});
  }
  results[variant]={human_annotated_cases:scores.length,scores,note:'Recall uses only the explicitly supplied relevant_ids; pooled judgments may miss unretrieved relevant entries.'};
 }
 writeFileSync(root+'/RELEVANCE_METRICS.json',JSON.stringify(results,null,2));console.log('Private human-judged metrics saved.');
}

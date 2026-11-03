import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Dictionary} from '../src/dictionary.js';
import {lookup_dialect} from '../src/retrieval.js';
import {cases} from '../tests/fixtures/evaluation-120.js';
const root=resolve('data/private/reports'),baseline=resolve(process.argv[2]||root+'/v02-before');
const {Dictionary:Legacy}=await import(pathToFileURL(baseline+'/src/dictionary.js'));
const {lookup_dialect:oldLookup}=await import(pathToFileURL(baseline+'/src/retrieval.js'));
const options={includeUnreviewed:true,includeExampleCandidates:true,examplesPerEntry:3};
const current=new Dictionary(resolve('data/kunming.sqlite'),options),old=new Legacy(resolve('data/kunming.sqlite'),options);
const rows=[];
try{
 current.open();old.open();
 for(const c of cases){
  let operations=0;
  const counted={candidates(terms){const all=old.candidates(terms);operations=terms.length+all.length*2;return all;}};
  let start=performance.now();const before=oldLookup(counted,c.draft,12),beforeMs=performance.now()-start;
  start=performance.now();const after=lookup_dialect(current,c.draft,12),afterMs=performance.now()-start;
  rows.push({id:c.id,old:{ms:beforeMs,db_operations:operations,hits:before.length},new:{ms:afterMs,db_operations:current.lastQueryCount,hits:after.length,matched:current.lastMatchedCount}});
 }
 const summary={};for(const v of ['old','new']){const mean=k=>rows.reduce((n,r)=>n+r[v][k],0)/rows.length;summary[v]={mean_ms:mean('ms'),mean_db_operations:mean('db_operations'),mean_hits:mean('hits')};}
 writeFileSync(root+'/RETRIEVAL_PERFORMANCE.json',JSON.stringify({note:'Warm database. Counts include executed recall and example SELECTs; exclude schema discovery and prepare calls. Latency depends on cache and host load.',summary,rows},null,2));
 console.log(JSON.stringify(summary));
}finally{current.close();old.close();}

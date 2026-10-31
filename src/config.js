import { fileURLToPath } from 'node:url';
export function configure(input={}) {
  if (!input || typeof input!=='object' || Array.isArray(input)) throw new Error('config');
  const c={dbPath:process.env.KUNMING_DB||fileURLToPath(new URL('../data/kunming.sqlite',import.meta.url)), provider:'deepseek-account',model:process.env.KUNMING_MODEL||'deepseek-flash', transport:'harness',apiBase:process.env.KUNMING_API_BASE||'https://api.deepseek.com/v1',apiKeyEnv:'KUNMING_API_KEY',timeoutMs:30000,maxOutputTokens:2048,intensity:'heavy',retrievalLimit:10,maxDraftChars:6000,maxContextChars:500,retries:1,...input};
  c.includeUnreviewed??=false;
  if(typeof c.includeUnreviewed!=='boolean')throw new Error('invalid includeUnreviewed');
  for (const [k,min,max] of [['timeoutMs',100,120000],['maxOutputTokens',64,8192],['retrievalLimit',1,12],['maxDraftChars',1,12000],['maxContextChars',0,1000],['retries',0,2]]) if(!Number.isInteger(c[k])||c[k]<min||c[k]>max) throw new Error('invalid '+k);
  for (const k of ['dbPath','provider','model','apiBase','apiKeyEnv']) if(typeof c[k]!=='string'||!c[k]) throw new Error('invalid '+k);
  if(!['harness','openai'].includes(c.transport)||!['light','medium','heavy'].includes(c.intensity)) throw new Error('invalid mode');
  const url=new URL(c.apiBase); if(url.protocol!=='https:' && !(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname))) throw new Error('invalid URL');
  if(c.statusPath!==undefined&&typeof c.statusPath!=='string')throw new Error('invalid statusPath');
  if(url.username||url.password||url.search||url.hash) throw new Error('invalid URL');
  return c;
}
export const Config={'~standard':{version:1,vendor:'kunming',validate(value){try{return {value:configure(value??{})}}catch{return {issues:[{message:'昆明方言插件配置无效'}]}}}}};

import { readFileSync } from 'node:fs';
import { lookup_dialect } from './retrieval.js';
const system=readFileSync(new URL('./prompts/kunming-rewrite.md',import.meta.url),'utf8');
export function validateOutput(draft,text){
  if(typeof text!=='string'||!text.trim()||text.length>draft.length*3+200)throw new Error('INVALID_OUTPUT');
  if(/[\u0250-\u02ff\ufffd]/u.test(text)||/^(?:改写|翻译|昆明话|方言版)[：:]/.test(text))throw new Error('INVALID_OUTPUT');
  for(const group of [['昨天','昨个'],['明天','明个'],['今天','今个']])if(group.some(t=>text.includes(t))&&!group.some(t=>draft.includes(t)))throw new Error('FACT_CHANGED');
  if(/(?:休息|睡觉)/.test(draft)&&/(?:先去|去|先)歇下/.test(text))throw new Error('FACT_CHANGED');
  if(JSON.stringify((draft.match(/\d+(?:\.\d+)?/g)||[]).sort())!==JSON.stringify((text.match(/\d+(?:\.\d+)?/g)||[]).sort()))throw new Error('FACT_CHANGED');
  const tokens=draft.match(/```[\s\S]*?```|`[^`]+`|https?:\/\/[^\s]+|[A-Za-z][A-Za-z0-9_.:+/-]*|\d+(?:\.\d+)?/g)||[];
  for(const token of tokens)if(!text.includes(token))throw new Error('FACT_CHANGED');
  return text.trim();
}
export function createRewriter(config,dictionary,{llm,fetchImpl=fetch,log=()=>{}}={}){
  return async function rewrite({draft,context='',intensity=config.intensity}={},externalSignal){
    const start=Date.now();
    if(typeof draft!=='string'||!draft.trim())return {text:'',status:'invalid_input',hits:0};
    const fallback=(status,hits=0)=>({text:draft,status,hits,elapsed_ms:Date.now()-start});
    // Never silently drop the tail of a draft. Long drafts are returned unchanged.
    if(draft.length>config.maxDraftChars)return fallback('too_long');
    if(typeof context!=='string'||!['heavy','medium','light'].includes(intensity))return fallback('invalid_input');
    let candidates;
    try{candidates=lookup_dialect(dictionary,draft,config.retrievalLimit);}catch{return fallback('dictionary_unavailable');}
    const payload=JSON.stringify({draft,context:context.slice(0,config.maxContextChars),intensity,candidates});
    let last='model_unavailable';
    for(let attempt=0;attempt<=config.retries;attempt++){
      const timeout=AbortSignal.timeout(config.timeoutMs);const signal=externalSignal?AbortSignal.any([externalSignal,timeout]):timeout;
      try{
        let text='',finished=false;
        if(config.transport==='harness'){
          if(!llm?.stream)throw new Error('MODEL_UNAVAILABLE');
          for await(const chunk of llm.stream({provider:config.provider,model:config.model,reasoningEffort:'off',system,messages:[{role:'user',content:[{type:'text',text:payload}]}],maxTokens:config.maxOutputTokens,signal})){
            if(chunk.type==='text-delta')text+=chunk.text;
            if(chunk.type==='finish'&&chunk.reason?.kind!=='stop')throw new Error('INCOMPLETE');
            if(chunk.type==='finish')finished=true;
            if(text.length>config.maxDraftChars*3+200)throw new Error('INVALID_OUTPUT');
          }
          if(!finished)throw new Error('INCOMPLETE');
        }else{
          const key=process.env[config.apiKeyEnv];if(!key)throw new Error('MISSING_KEY');
          const response=await fetchImpl(config.apiBase.replace(/\/$/,'')+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},signal,body:JSON.stringify({model:config.model,messages:[{role:'system',content:system},{role:'user',content:payload}],max_tokens:config.maxOutputTokens,stream:false})});
          if(!response.ok){const e=new Error('HTTP');e.retryable=response.status===429||response.status>=500;throw e;}
          const body=await response.json();if(body.choices?.[0]?.finish_reason!=='stop')throw new Error('INCOMPLETE');text=body.choices[0].message?.content;
        }
        text=validateOutput(draft,text);
        const result={text,status:'ok',hits:candidates.length,elapsed_ms:Date.now()-start};log({status:'ok',hits:result.hits,elapsed_ms:result.elapsed_ms});return result;
      }catch(error){last=signal.aborted?'timeout':'model_unavailable';if(externalSignal?.aborted||error.retryable===false||['MISSING_KEY','FACT_CHANGED','INVALID_OUTPUT','INCOMPLETE'].includes(error.message))break;}
    }
    log({status:last,hits:candidates.length,elapsed_ms:Date.now()-start});return fallback(last,candidates.length);
  };
}

import { Dictionary } from './dictionary.js';
import { configure } from './config.js';
import { createRewriter } from './rewrite.js';
import {writeFileSync} from 'node:fs';
export {Config} from './config.js';
export const name='kunming-dialect';
export const inject=['tools','systemPrompt','llm'];
export function apply(ctx,input={}){
  const config=configure(input),dictionary=new Dictionary(config.dbPath,{includeUnreviewed:config.includeUnreviewed,includeExampleCandidates:config.includeExampleCandidates,examplesPerEntry:config.examplesPerEntry});
  const rewrite=createRewriter(config,dictionary,{llm:ctx.llm,log:meta=>console.error('[kunming-dialect]',JSON.stringify(meta))});
  ctx.tools.register({name:'kunming_rewrite',description:'将已完成的普通话草稿改写为昆明口语，保留事实和人格。只传当前回复必需的草稿，context不要包含群历史或其他成员隐私。返回text原样作为唯一最终回复，失败时text为原草稿，不重复调用。',
    parameters:{type:'object',properties:{draft:{type:'string'},context:{type:'string'},intensity:{type:'string',enum:['light','medium','heavy']}},required:['draft'],additionalProperties:false},
    output:{schema:{type:'object',properties:{text:{type:'string'},status:{type:'string'},hits:{type:'integer'},elapsed_ms:{type:'integer'}},required:['text','status','hits'],additionalProperties:false},render:(_args,value)=>[{type:'text',text:JSON.stringify(value)}]},
    async execute(args,exec){return rewrite(args,exec?.signal);}
  });
  ctx.effect(()=>ctx.systemPrompt.section({name:'kunming-dialect',order:75,text:'QQ日常聊天中，如果工具列表包含kunming_rewrite：先内部构思普通话草稿，再调用kunming_rewrite。调用前不得输出草稿或预告；调用后只把返回text作为唯一最终回复，不附解释。不改写工具数据、附件或记忆存储内容；失败时使用返回text，不输出错误。保留原角色人格。若工具不可用则正常回复，不能虚构调用。非QQ会话仅在用户要求方言时使用。'}));
  ctx.on('dispose',()=>dictionary.close());
  if(config.statusPath){const timer=setTimeout(async()=>{try{await ctx.get('loader')?.await();const db=dictionary.open();writeFileSync(config.statusPath,JSON.stringify({time:new Date().toISOString(),...dictionary.statistics(),retrievalLimit:config.retrievalLimit,registeredTools:ctx.tools.schemas().map(x=>x.name),dbAvailable:true,includeUnreviewed:config.includeUnreviewed,orthographyEnabled:!!config.orthographyPath,curationEnabled:dictionary.hasCuration,searchableEntries:db.prepare('SELECT count(DISTINCT s.entry_id) n FROM search_index s JOIN entries e ON e.id=s.entry_id'+(dictionary.hasCuration?' LEFT JOIN entry_curation c ON c.entry_id=e.id':'')+' WHERE 1=1'+(dictionary.hasCuration?' AND c.duplicate_of IS NULL':'')+(config.includeUnreviewed?'':" AND e.review_status='verified'")).get().n,provider:config.provider,model:config.model},null,2));}catch{console.error('[kunming-dialect] startup_check_failed');}},1000);ctx.on('dispose',()=>clearTimeout(timer));}
}

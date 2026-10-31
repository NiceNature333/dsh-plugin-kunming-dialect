import {writeFileSync} from 'node:fs';
import {evaluate} from './evaluate.js';
export const name='kunming-live-probe';
export const inject=['llm','tools'];
export function apply(ctx){setTimeout(async()=>{try{await ctx.get('loader')?.await();const tools=ctx.tools.schemas();writeFileSync(new URL('../data/live-registration.json',import.meta.url),JSON.stringify({tools}));const results=await evaluate(ctx.llm);console.log('KUNMING_EVALUATION',results.length,results.filter(x=>x.status==='ok').length);process.exit(0);}catch(e){console.error('KUNMING_PROBE_FAILED',e.code||e.name);process.exit(1);}},1000);}

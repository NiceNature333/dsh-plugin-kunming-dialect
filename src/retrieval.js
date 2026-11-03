export function termsOf(text){
  const terms=new Set();
  for(const phrase of String(text).normalize('NFKC').match(/[\p{Script=Han}]+/gu)||[]){
    if(phrase.length===1)terms.add(phrase);
    for(const n of [2,3,4,5,6,7,8])for(let i=0;i<=phrase.length-n;i++)terms.add(phrase.slice(i,i+n));
  }
  return [...terms].slice(0,1800);
}
export function lookup_dialect(dictionary,text,limit=10){
  const normalized=String(text).normalize('NFKC');
  const rank=rows=>{
    const df=new Map();for(const e of rows)for(const t of new Set(e.reasons))df.set(t,(df.get(t)||0)+1);
    const seen=new Set();
    return rows.map(e=>{
      const matches=[...new Set(e.reasons)].sort((a,b)=>b.length-a.length).filter((t,i,all)=>!all.slice(0,i).some(long=>long.includes(t)));
      const semantic=matches.some(t=>String(e.mandarin_meaning||'').includes(t));
      const exact=e.lemma.length>=2&&normalized.includes(e.lemma);
      const base=matches.reduce((n,t)=>n+t.length*Math.log(2+rows.length/(df.get(t)||1)),0);
      return {...e,priority_score:0,score:base+(semantic?12:0)+(exact?12:0)+(e.review_status==='verified'?2:0),match_tier:exact?'headword':semantic?'reverse_meaning':'supplement'};
    }).filter(e=>e.reasons.some(t=>t.length>=2)||normalized===e.lemma)
      .sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id))
      .filter(e=>{const key=e.lemma+'\0'+e.mandarin_meaning+'\0'+e.definition;if(seen.has(key))return false;seen.add(key);return true;});
  };
  return dictionary.candidates(termsOf(text),{rank,text,limit:Math.max(1,Math.min(12,limit))}).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,Math.max(1,Math.min(12,limit)));
}

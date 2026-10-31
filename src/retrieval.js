export function termsOf(text){
  const terms=new Set();
  for(const phrase of String(text).normalize('NFKC').match(/[\p{Script=Han}]+/gu)||[])for(const n of [1,2,3,4])for(let i=0;i<=phrase.length-n;i++)terms.add(phrase.slice(i,i+n));
  return [...terms].slice(0,24000);
}
export function lookup_dialect(dictionary,text,limit=10){return dictionary.candidates(termsOf(text)).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,Math.max(1,Math.min(12,limit)));}

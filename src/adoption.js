export function parseRewrite(raw){
  if(typeof raw!=='string')throw Error('INVALID_OUTPUT');
  const clean=raw.trim().replace(/^```(?:json)?\s*|\s*```$/g,'');
  if(/^[{[]/.test(clean)){
    let value;try{value=JSON.parse(clean);}catch{throw Error('INVALID_OUTPUT');}
    if(typeof value.text!=='string'||!Array.isArray(value.used_entry_ids)||value.used_entry_ids.some(x=>typeof x!=='string'))throw Error('INVALID_OUTPUT');
    return {text:value.text,ids:[...new Set(value.used_entry_ids)]};
  }
  if(/"(?:text|used_entry_ids)"\s*:/.test(clean))throw Error('INVALID_OUTPUT');
  return {text:raw,ids:[]}; // Legacy plain-text providers remain compatible.
}
export function adoption(draft,text,candidates,claimed=[]){
  const verified=[],uncertain=new Set(claimed),preexisting=[];
  for(const e of candidates){
    if(!e.lemma||!text.includes(e.lemma))continue;
    if(draft.includes(e.lemma)){preexisting.push(e.id);continue;}
    // Only an inserted, multi-character, distinct dialect headword is verifiable.
    if(e.lemma.length<2||e.lemma===e.mandarin_meaning){uncertain.add(e.id);continue;}
    verified.push(e.id);uncertain.delete(e.id);
  }
  return {model_claimed_ids:claimed,verified_adopted_ids:verified,uncertain_ids:[...uncertain],preexisting_ids:preexisting,adopted_count:verified.length};
}

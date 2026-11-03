export function lookup(dictionary,text,{context=''}={}){
  if(typeof text!=='string'||!text.trim()||text.length>6000)return {status:'invalid_input',entries:[]};
  const db=dictionary.open();
  const hasAliases=db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='aliases'").get();
  const rows=db.prepare("SELECT e.id,e.lemma,e.mandarin_meaning,e.definition,e.usage_notes,e.review_status,e.source_pdf_page FROM entries e WHERE (e.lemma=? OR (length(e.lemma)>=2 AND instr(?,e.lemma)>0))"+(hasAliases?" OR e.id IN (SELECT entry_id FROM aliases WHERE alias=? OR (length(alias)>=2 AND instr(?,alias)>0))":'')).all(...(hasAliases?[text,text,text,text]:[text,text]));
  const entries=rows.sort((a,b)=>b.lemma.length-a.lemma.length||a.id.localeCompare(b.id)).slice(0,30).map(e=>({...e,source_type:e.review_status==='verified'?'dictionary_verified':'dictionary_unreviewed',uncertain:e.review_status!=='verified',context_match:!!context&&!!e.mandarin_meaning&&context.includes(e.mandarin_meaning)}));
  return {status:entries.length?'found':'not_recorded',entries,disambiguation:entries.length>1?'multiple entries; context_match is lexical evidence only, meanings require review':'',context_used:!!context};
}

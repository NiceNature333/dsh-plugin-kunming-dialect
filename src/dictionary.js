import { DatabaseSync } from 'node:sqlite';
export class Dictionary {
  constructor(path,{includeUnreviewed=false}={}){this.path=path;this.includeUnreviewed=includeUnreviewed;}
  open(){if(!this.db){const db=new DatabaseSync(this.path,{readOnly:true});try{db.prepare('SELECT term FROM search_index LIMIT 1').get();this.hasCuration=!!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='entry_curation'").get();this.db=db;}catch(e){db.close();throw e;}}return this.db;}
  close(){this.db?.close();this.db=null;}
  candidates(terms){
    if(!terms.length)return [];
    const db=this.open(); const scores=new Map();
    const definition=this.hasCuration?'COALESCE(c.definition_clean,e.definition)':'e.definition';
    const query=db.prepare('SELECT e.id,e.lemma,'+definition+" AS definition,e.mandarin_meaning,e.usage_notes,e.source_pdf_page,e.source_printed_page,e.review_status,s.term,s.weight FROM search_index s JOIN entries e ON e.id=s.entry_id"+(this.hasCuration?' LEFT JOIN entry_curation c ON c.entry_id=e.id':'')+" WHERE s.term=?"+(this.hasCuration?' AND c.duplicate_of IS NULL':'')+(this.includeUnreviewed?'':" AND e.review_status='verified'"));
    for(const term of terms)for(const e of query.all(term)){const prev=scores.get(e.id)||{...e,score:0,reasons:[]};prev.score+=e.weight*term.length;prev.reasons.push(term);scores.set(e.id,prev);}
    const examples=db.prepare('SELECT dialect FROM examples WHERE entry_id=? LIMIT 2');
    const excerpt=text=>String(text||'').replace(/\[[^\]]*\]|［[^］]*］/g,' ').replace(/[^\p{Script=Han}，。；：、！？（）“”《》～\s]/gu,' ').replace(/\s+/g,' ').trim().slice(0,240);
    return [...scores.values()].map(e=>({id:e.id,lemma:e.lemma,mandarin_meaning:e.mandarin_meaning,definition_excerpt:excerpt(e.definition),usage_notes:e.usage_notes||(e.review_status==='verified'?'':'用户允许试用的OCR词条；释义片段可能含错字、混合义项或例句。无可靠释义时不要猜测用法。'),examples:examples.all(e.id).map(x=>x.dialect),score:e.score,reasons:e.reasons,source_pdf_page:e.source_pdf_page,source_printed_page:e.source_printed_page,review_status:e.review_status}));
  }
}

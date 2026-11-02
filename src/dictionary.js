import { DatabaseSync } from 'node:sqlite';
export class Dictionary {
  constructor(path,{includeUnreviewed=false,includeExampleCandidates=false,examplesPerEntry=2}={}){this.path=path;this.includeUnreviewed=includeUnreviewed;this.includeExampleCandidates=includeExampleCandidates;this.examplesPerEntry=Math.max(1,Math.min(4,examplesPerEntry));}
  open(){if(!this.db){const db=new DatabaseSync(this.path,{readOnly:true});try{db.prepare('SELECT term FROM search_index LIMIT 1').get();const tables=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(x=>x.name));this.hasCuration=tables.has('entry_curation');this.hasExampleCandidates=tables.has('example_candidates');this.hasEnrichment=tables.has('entry_enrichment');this.db=db;}catch(e){db.close();throw e;}}return this.db;}
  close(){this.db?.close();this.db=null;}
  statistics(){const db=this.open();return {includeExampleCandidates:this.includeExampleCandidates,examplesPerEntry:this.examplesPerEntry,enrichmentEnabled:this.hasEnrichment,storedExampleRecords:db.prepare('SELECT count(*) n FROM examples').get().n,automaticExampleRecords:this.includeExampleCandidates&&this.hasExampleCandidates?db.prepare('SELECT count(*) n FROM example_candidates').get().n:0};}
  candidates(terms){
    if(!terms.length)return [];
    const db=this.open(); const scores=new Map();
    const definition=this.hasCuration?'COALESCE(c.definition_clean,e.definition)':'e.definition';
    const meaning=this.hasEnrichment?"COALESCE(NULLIF(e.mandarin_meaning,''),n.mandarin_hint,'')":'e.mandarin_meaning';
    const query=db.prepare('SELECT e.id,e.lemma,'+definition+' AS definition,'+meaning+' AS mandarin_meaning,'+(this.hasEnrichment?'COALESCE(n.priority_score,0)':'0')+" AS priority_score,e.usage_notes,e.source_pdf_page,e.source_printed_page,e.review_status,s.term,s.weight FROM search_index s JOIN entries e ON e.id=s.entry_id"+(this.hasCuration?' LEFT JOIN entry_curation c ON c.entry_id=e.id':'')+(this.hasEnrichment?' LEFT JOIN entry_enrichment n ON n.entry_id=e.id':'')+" WHERE s.term=?"+(this.hasCuration?' AND c.duplicate_of IS NULL':'')+(this.includeUnreviewed?'':" AND e.review_status='verified'"));
    for(const term of terms)for(const e of query.all(term)){const prev=scores.get(e.id)||{...e,score:0,reasons:[]};prev.score+=e.weight*term.length;prev.reasons.push(term);scores.set(e.id,prev);}
    const examples=db.prepare('SELECT dialect FROM examples WHERE entry_id=? ORDER BY rowid LIMIT 4');
    const autoExamples=this.includeExampleCandidates&&this.hasExampleCandidates?db.prepare('SELECT dialect,source_pdf_page,review_status FROM example_candidates WHERE entry_id=?'+(this.hasCuration?' OR entry_id IN (SELECT entry_id FROM entry_curation WHERE duplicate_of=?)':'')+' ORDER BY length(dialect),dialect LIMIT 32'):null;
    const excerpt=text=>String(text||'').replace(/\[[^\]]*\]|［[^］]*］/g,' ').replace(/[^\p{Script=Han}，。；：、！？（）“”《》～\s]/gu,' ').replace(/\s+/g,' ').trim().slice(0,240);
    return [...scores.values()].map(e=>{
      const pool=examples.all(e.id).map(x=>({...x,source_pdf_page:e.source_pdf_page,review_status:e.review_status==='verified'?'source_checked':e.review_status,origin:'stored_example'}));
      if(autoExamples)pool.push(...autoExamples.all(...(this.hasCuration?[e.id,e.id]:[e.id])).map(x=>({...x,origin:'automatic_candidate'})));
      const unique=new Map();for(const x of pool)if(!unique.has(x.dialect))unique.set(x.dialect,x);
      const chosen=[...unique.values()].slice(0,this.examplesPerEntry);
      return {id:e.id,lemma:e.lemma,mandarin_meaning:e.mandarin_meaning,meaning_origin:e.review_status==='verified'?'source_checked':'automatic_gloss_projection',definition_excerpt:excerpt(e.definition),usage_notes:e.usage_notes||(e.review_status==='verified'?'':'用户允许试用的OCR词条；释义片段可能含错字、混合义项或例句。无可靠释义时不要猜测用法。'),examples:chosen.map(x=>x.dialect),example_provenance:chosen.map(({source_pdf_page,review_status,origin})=>({source_pdf_page,review_status,origin})),score:e.score+Math.min(3,e.priority_score/10),reasons:e.reasons,source_pdf_page:e.source_pdf_page,source_printed_page:e.source_printed_page,review_status:e.review_status};
    });
  }
}

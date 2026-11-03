import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
export class Feedback {
  constructor(path){this.path=path;}
  open(){if(!this.db){mkdirSync(dirname(this.path),{recursive:true});this.db=new DatabaseSync(this.path);this.db.exec(`CREATE TABLE IF NOT EXISTS feedback(id TEXT PRIMARY KEY,term TEXT,meaning TEXT,example TEXT,source_type TEXT,group_scope TEXT,review_status TEXT,confidence REAL,created_at TEXT,updated_at TEXT);`);}return this.db;}
  submit({term,meaning,example='',explicit_user_feedback=false},scope){
    if(!scope||explicit_user_feedback!==true)throw Error('EXPLICIT_FEEDBACK_AND_TRUSTED_SCOPE_REQUIRED');
    for(const [v,max] of [[term,80],[meaning,500],[example,300]])if(typeof v!=='string'||v.length>max)throw Error('INVALID_FEEDBACK');
    if(!term.trim()||!meaning.trim())throw Error('INVALID_FEEDBACK');
    const db=this.open();if(db.prepare("SELECT count(*) n FROM feedback WHERE group_scope=? AND review_status='pending'").get(scope).n>=100)throw Error('REVIEW_QUEUE_FULL');
    const id=randomUUID(),now=new Date().toISOString();db.prepare('INSERT INTO feedback VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,term,meaning,example,'user_reported',scope,'pending',0.25,now,now);return {id,status:'pending',source_type:'user_reported'};
  }
  list(scope){if(!scope)throw Error('SCOPE_REQUIRED');return this.open().prepare('SELECT * FROM feedback WHERE group_scope=? ORDER BY created_at DESC LIMIT 100').all(scope);}
  candidates(text,scope){
    if(!scope)return [];
    return this.list(scope).filter(r=>r.review_status==='corroborated'&&(text.includes(r.term)||text.includes(r.meaning))).map(r=>({id:'overlay:'+r.id,lemma:r.term,mandarin_meaning:r.meaning,examples:r.example?[r.example]:[],score:30,review_status:'corroborated',source_type:'user_reported',usage_notes:'经本地管理员确认的群范围用法，非原书词典事实。'}));
  }
  // Administrative API only. Never registered as a model-visible tool.
  review(id,scope,{status,meaning}){
    if(!scope||!['corroborated','rejected','pending'].includes(status))throw Error('INVALID_REVIEW');
    if(meaning!==undefined&&(typeof meaning!=='string'||meaning.length>500))throw Error('INVALID_REVIEW');
    return this.open().prepare('UPDATE feedback SET review_status=?,meaning=coalesce(?,meaning),confidence=?,updated_at=? WHERE id=? AND group_scope=?').run(status,meaning??null,status==='corroborated'?0.75:0.25,new Date().toISOString(),id,scope).changes;
  }
  delete(id,scope){if(!scope)throw Error('SCOPE_REQUIRED');return this.open().prepare('DELETE FROM feedback WHERE id=? AND group_scope=?').run(id,scope).changes;}
  close(){this.db?.close();this.db=null;}
}

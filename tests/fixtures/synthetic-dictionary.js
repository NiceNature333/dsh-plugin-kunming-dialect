// Independently authored software fixtures. These are fictional, not Kunming vocabulary.
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,unlinkSync,rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Dictionary} from '../../src/dictionary.js';
export function fixture(options={}){
 const dir=mkdtempSync(join(tmpdir(),'kunming-synthetic-')),path=join(dir,'test.sqlite');
 const db=new DatabaseSync(path);
 db.exec(`CREATE TABLE entries(id TEXT PRIMARY KEY,lemma TEXT,definition TEXT,mandarin_meaning TEXT,usage_notes TEXT,source_pdf_page INTEGER,source_printed_page INTEGER,review_status TEXT);
 CREATE TABLE search_index(entry_id TEXT,term TEXT,weight REAL);
 CREATE TABLE examples(entry_id TEXT,dialect TEXT);`);
 const rows=[['a','示例称呼甲','虚构的问候测试标记','问候','verified'],['b','示例状态乙','虚构的疲惫测试标记','疲惫','verified'],['c','示例动作丙','虚构的散步测试标记','散步','pending']];
 for(const [id,lemma,definition,meaning,status] of rows){db.prepare('INSERT INTO entries VALUES(?,?,?,?,?,1,1,?)').run(id,lemma,definition,meaning,'仅作原创软件测试',status);for(const term of [lemma,meaning])db.prepare('INSERT INTO search_index VALUES(?,?,3)').run(id,term);db.prepare('INSERT INTO examples VALUES(?,?)').run(id,'原创测试句，不代表真实方言。');}
 db.close();const dictionary=new Dictionary(path,options);
 return {path,dictionary,close(){dictionary.close();unlinkSync(path);rmdirSync(dir);}};
}

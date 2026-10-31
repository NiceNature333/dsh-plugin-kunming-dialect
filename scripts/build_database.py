import json,sqlite3,os
from inspect_pdf import ROOT
from search_fields import index_terms

def build():
    target=ROOT/'data/kunming.sqlite'; temp=target.with_suffix('.sqlite.tmp')
    if temp.exists(): temp.unlink()
    db=sqlite3.connect(temp)
    db.executescript('''
    PRAGMA foreign_keys=ON;
    CREATE TABLE entries(id TEXT PRIMARY KEY,lemma TEXT NOT NULL,pronunciation_raw TEXT,pronunciation_verified TEXT,part_of_speech TEXT,definition TEXT,mandarin_meaning TEXT,usage_notes TEXT,source_pdf_page INTEGER,source_printed_page INTEGER,ocr_confidence REAL,review_status TEXT,raw_text TEXT,derived_fields TEXT);
    CREATE TABLE meanings(id INTEGER PRIMARY KEY,entry_id TEXT REFERENCES entries(id),definition TEXT,derived INTEGER);
    CREATE TABLE examples(id INTEGER PRIMARY KEY,entry_id TEXT REFERENCES entries(id),dialect TEXT,mandarin_translation TEXT,translation_derived INTEGER);
    CREATE TABLE aliases(entry_id TEXT REFERENCES entries(id),alias TEXT);
    CREATE TABLE source_pages(page INTEGER PRIMARY KEY,pdf TEXT,raw_file TEXT);
    CREATE TABLE entry_pages(entry_id TEXT REFERENCES entries(id),page INTEGER REFERENCES source_pages(page),PRIMARY KEY(entry_id,page));
    CREATE TABLE search_index(entry_id TEXT REFERENCES entries(id),term TEXT,weight REAL,PRIMARY KEY(entry_id,term));
    CREATE INDEX search_term ON search_index(term);
    ''')
    for file in (ROOT/'data/raw').glob('page-*.json'):
        p=json.loads(file.read_text(encoding='utf-8')); db.execute('INSERT INTO source_pages VALUES(?,?,?)',(p['page'],p['pdf'],str(file.relative_to(ROOT))))
    entries=[json.loads(x) for x in (ROOT/'data/entries.jsonl').read_text(encoding='utf-8').splitlines()]
    seed_path=ROOT/'data/private/dialect_seed.json'
    seeds=json.loads(seed_path.read_text(encoding='utf-8')) if seed_path.exists() else []
    seed_ids={x['id'] for x in seeds}
    for e in [x for x in entries if x['id'] not in seed_ids]+seeds:
        cols=['id','lemma','pronunciation_raw','pronunciation_verified','part_of_speech','definition','mandarin_meaning','usage_notes','source_pdf_page','source_printed_page','ocr_confidence','review_status','raw_text','derived_fields']
        db.execute('INSERT INTO entries VALUES('+','.join('?' for _ in cols)+')',tuple(json.dumps(e.get(c,[]),ensure_ascii=False) if c=='derived_fields' else e.get(c) for c in cols))
        db.execute('INSERT INTO meanings(entry_id,definition,derived) VALUES(?,?,0)',(e['id'],e['definition']))
        for page in e.get('source_pages',[e['source_pdf_page']]): db.execute('INSERT OR IGNORE INTO entry_pages VALUES(?,?)',(e['id'],page))
        for ex in e.get('examples',[]): db.execute('INSERT INTO examples(entry_id,dialect,translation_derived) VALUES(?,?,0)',(e['id'],ex))
        for term,weight in index_terms(e).items():
            db.execute('INSERT INTO search_index VALUES(?,?,?)',(e['id'],term,weight))
    db.commit(); assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'; db.close(); os.replace(temp,target)
    print('built',target,'seeds',len(seeds))
if __name__=='__main__': build()

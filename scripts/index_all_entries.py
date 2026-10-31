"""Index all stored entries without marking OCR as human-verified."""
import sqlite3,json
from datetime import datetime
from inspect_pdf import ROOT
from search_fields import index_terms

db=sqlite3.connect(ROOT/'data/kunming.sqlite',timeout=30)
backup_path=ROOT/'data'/('kunming-before-full-'+datetime.now().strftime('%Y%m%d-%H%M%S')+'.sqlite')
with sqlite3.connect(backup_path) as backup: db.backup(backup)
db.row_factory=sqlite3.Row
# Keep manually curated keyword weights from the existing index.
with db:
    for row in db.execute('SELECT id,lemma,definition,mandarin_meaning FROM entries').fetchall():
        for term,weight in index_terms(dict(row)).items():
            db.execute('INSERT INTO search_index VALUES(?,?,?) ON CONFLICT(entry_id,term) DO UPDATE SET weight=max(weight,excluded.weight)',(row['id'],term,weight))
assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
count=db.execute('SELECT count(distinct entry_id) FROM search_index').fetchone()[0]
total=db.execute('SELECT count(*) FROM entries').fetchone()[0]
assert count==total
print(json.dumps(dict(entries=total,indexed_entries=count,backup=str(backup_path)),ensure_ascii=False))
db.close()

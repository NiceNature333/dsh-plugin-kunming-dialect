import sqlite3
from inspect_pdf import ROOT
db=sqlite3.connect(ROOT/'data/kunming.sqlite')
assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
assert not db.execute('PRAGMA foreign_key_check').fetchall()
assert not db.execute('SELECT id FROM entries WHERE source_pdf_page IS NULL OR lemma=""').fetchall()
print(dict(db.execute('SELECT review_status,count(*) FROM entries GROUP BY review_status')))

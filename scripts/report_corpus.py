"""Export private inventory from the local database, never into public docs."""
import sqlite3,json,argparse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def report(path):
 db=sqlite3.connect('file:'+Path(path).as_posix()+'?mode=ro',uri=True);db.row_factory=sqlite3.Row
 curated=bool(db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='entry_curation'").fetchone())
 entries=[dict(r) for r in db.execute('SELECT id,lemma,review_status,source_pdf_page,source_printed_page FROM entries ORDER BY source_pdf_page,id')]
 annotations={r['entry_id']:dict(r) for r in db.execute('SELECT * FROM entry_curation')} if curated else {}
 examples=[dict(r) for r in db.execute('SELECT e.lemma,e.source_pdf_page,x.dialect FROM examples x JOIN entries e ON e.id=x.entry_id ORDER BY e.source_pdf_page,e.lemma')]
 lines=['# 当前本地语料清单','','私有文件，包含导入资料。禁止提交到公开仓库。',f'原始及核验记录 {len(entries)}；显式重复折叠 {sum(bool(a.get("duplicate_of")) for a in annotations.values())}；来源核对种子 {sum(e["review_status"]=="verified" for e in entries)}；核验例句 {len(examples)}。','', '## 来源核对种子','','、'.join(e['lemma'] for e in entries if e['review_status']=='verified'),'','## 已存储核验例句','']
 lines += [f"- {x['lemma']} / PDF {x['source_pdf_page']}：{x['dialect']}" for x in examples]
 lines+=['','## 全部记录','','|词头|状态|PDF页|重复指向|自动问题|','|---|---|---:|---|---|']
 for e in entries:
  a=annotations.get(e['id'],{});lines.append(f"|{e['lemma']}|{e['review_status']}|{e['source_pdf_page']}|{a.get('duplicate_of') or ''}|{a.get('quality_flags','')}|")
 out=ROOT/'data/private/reports';out.mkdir(parents=True,exist_ok=True);(out/'ACTIVE_CORPUS_INVENTORY.md').write_text('\n'.join(lines),encoding='utf8');db.close()
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--db',default=str(ROOT/'data/kunming.sqlite'));report(p.parse_args().db)

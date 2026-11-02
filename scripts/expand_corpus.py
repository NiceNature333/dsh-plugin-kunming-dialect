"""Derive local reverse glosses and common-use priorities; do not mark them verified."""
import argparse,json,sqlite3,re
from pathlib import Path
from datetime import datetime
from search_fields import index_terms
ROOT=Path(__file__).resolve().parents[1]

def enrich(entry,gloss):
    hint=re.sub(r'\s+','',gloss or '')[:180]
    pos=entry.get('part_of_speech','').split('/')[0]
    score={'代':24,'助':24,'副':22,'动':18,'形':14,'名':6}.get(pos,4)
    score+=8 if 1<=len(entry['lemma'])<=4 else 0
    score+=8 if 3<=len(hint)<=80 else 0
    category={'代':'人称指示与疑问','助':'语气与结构','副':'否定时间与程度','动':'日常动作','形':'状态与评价','名':'事物称谓'}.get(pos,'其他或词性待定')
    return hint,score,category

def expand(path):
    db=sqlite3.connect(path,timeout=30);db.row_factory=sqlite3.Row
    backup=ROOT/'data/private'/('before-expansion-'+datetime.now().strftime('%Y%m%d-%H%M%S')+'.sqlite')
    backup.parent.mkdir(parents=True,exist_ok=True)
    with sqlite3.connect(backup) as target:db.backup(target)
    db.execute('CREATE TABLE IF NOT EXISTS entry_enrichment(entry_id TEXT PRIMARY KEY,mandarin_hint TEXT,priority_score REAL,category TEXT,derivation TEXT)')
    curated={r['entry_id']:dict(r) for r in db.execute('SELECT * FROM entry_curation')} if db.execute("SELECT name FROM sqlite_master WHERE name='entry_curation'").fetchone() else {}
    report=[]
    with db:
        for row in db.execute('SELECT * FROM entries').fetchall():
            e=dict(row);c=curated.get(e['id'],{});hint,score,category=enrich(e,c.get('definition_clean',e['definition']))
            db.execute('INSERT OR REPLACE INTO entry_enrichment VALUES(?,?,?,?,?)',(e['id'],hint,score,category,'automatic_projection_not_human_verified'))
            if hint:
                for term,weight in index_terms({'lemma':e['lemma'],'mandarin_meaning':hint}).items():
                    db.execute('INSERT INTO search_index VALUES(?,?,?) ON CONFLICT(entry_id,term) DO UPDATE SET weight=max(weight,excluded.weight)',(e['id'],term,weight))
            if not c.get('duplicate_of'):report.append(dict(id=e['id'],lemma=e['lemma'],hint=hint,score=score,category=category,page=e['source_pdf_page'],review_status=e['review_status']))
    report.sort(key=lambda x:(-x['score'],x['page'],x['id']))
    out=ROOT/'data/private/reports';out.mkdir(parents=True,exist_ok=True)
    (out/'COMMON_USE_EXPANSION.jsonl').write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in report),encoding='utf8')
    summary=dict(entries_enriched=len(report),entries_with_reverse_hint=sum(bool(x['hint']) for x in report),common_priority_records=sum(x['score']>=30 and bool(x['hint']) for x in report),automatic_examples_available=db.execute('SELECT count(*) FROM example_candidates').fetchone()[0] if db.execute("SELECT name FROM sqlite_master WHERE name='example_candidates'").fetchone() else 0)
    (out/'EXPANSION_SUMMARY.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf8')
    lines=['# 全量试用与常用词扩充','','自动整理和用户放行不等于逐条人工核验。',json.dumps(summary,ensure_ascii=False),'','## 常用优先队列（前300条）','','|词头|类别|反向释义投影|PDF页|审核状态|','|---|---|---|---:|---|']
    lines += [f"|{r['lemma']}|{r['category']}|{r['hint'].replace('|','／')}|{r['page']}|{r['review_status']}|" for r in report[:300]]
    (out/'COMMON_USE_EXPANSION.md').write_text('\n'.join(lines),encoding='utf8')
    assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok';db.close();print(json.dumps(summary,ensure_ascii=False))
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--db',default=str(ROOT/'data/kunming.sqlite'));expand(p.parse_args().db)

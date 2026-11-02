"""Non-destructive local corpus curation. All reports remain private.
Raw entries and review statuses are never replaced by automatic results.
"""
import argparse,json,re,sqlite3,hashlib
from pathlib import Path
from datetime import datetime
from search_fields import index_terms,clean_excerpt
ROOT=Path(__file__).resolve().parents[1]

def normalize(text):return re.sub(r'\s+','',text or '')
def analyze(entry):
    raw=entry.get('raw_text') or '';flags=[];text=raw
    # Cut only a subsequent heading with pronunciation evidence; retain raw text.
    headings=list(re.finditer(r'(?m)^([\u4e00-\u9fff]{1,12})(?:（[\u4e00-\u9fff]+）)?\s*[a-z][^\n]{0,80}',raw))
    boundary=next((m.start() for m in headings[1:] if re.search(r'[\[［（(]',raw[m.start():m.start()+140])),None)
    if boundary is not None:text=raw[:boundary];flags.append('possible_merged_heading')
    pos=re.search(r'[（(]\s*(名|动|形|副|代|助|叹|量|数|介|连|象|缀)\s*[）)]',text)
    definition=entry.get('definition') or '';method='existing'
    if pos and pos.start()<180:
        definition=text[pos.end():];method='pos_boundary'
    elif pos and pos.start()>=180:
        flags.append('late_pos_marker');definition=''
    if not definition:
        close=re.search(r'[\]］]',text)
        if close and close.end()<180 and len(re.findall(r'[\u4e00-\u9fff]',text[close.end():]))>=3:
            definition=text[close.end():];method='pronunciation_boundary_candidate';flags.append('inferred_definition_boundary')
    if not definition:flags.append('definition_missing')
    if entry.get('review_status')=='problem':flags.append('original_problem')
    if len(raw)>4000:flags.append('oversized_entry')
    if '\ufffd' in raw:flags.append('replacement_character')
    # Index gloss clauses, not names/events in examples.
    senses=[];examples=[]
    for part in re.split(r'[①②③④⑤⑥⑦⑧⑨＠]',definition):
        gloss,sep,tail=part.partition('：')
        gloss=clean_excerpt(gloss)
        if gloss:senses.append(gloss[:120])
        if sep:
            for example in re.split(r'\n\s*[I1|]\s*|[。！？]',tail):
                example=re.sub(r'（[^）]*[〉）]|《[^》]*》','',example)
                example=re.sub(r'\s+','',example).strip('：；，。')
                if '～' in example and 5<=len(example)<=80 and not re.search(r'[A-Za-z\[\]［］\u0250-\u02ff]',example):examples.append(example)
    return dict(definition_clean=clean_excerpt('；'.join(senses)),examples=list(dict.fromkeys(examples))[:4],flags=flags,method=method)

def curate(path):
    db=sqlite3.connect(path,timeout=30);db.row_factory=sqlite3.Row
    out=ROOT/'data/private/reports';out.mkdir(parents=True,exist_ok=True)
    backup=ROOT/'data/private'/('before-curation-'+datetime.now().strftime('%Y%m%d-%H%M%S')+'.sqlite')
    with sqlite3.connect(backup) as target:db.backup(target)
    db.executescript('''CREATE TABLE IF NOT EXISTS entry_curation(entry_id TEXT PRIMARY KEY,definition_clean TEXT,quality_flags TEXT,duplicate_of TEXT,method TEXT);
    CREATE TABLE IF NOT EXISTS example_candidates(entry_id TEXT,dialect TEXT,source_pdf_page INTEGER,review_status TEXT,PRIMARY KEY(entry_id,dialect));''')
    entries=[dict(r) for r in db.execute('SELECT * FROM entries')];by_location={};seen={};stats={'entries':len(entries),'exact_duplicates':0,'seed_duplicates':0,'definition_recovered':0,'examples_for_review':0};questions=[]
    for e in entries:
        if e['review_status']=='verified':by_location[(e['lemma'],e['source_pdf_page'])]=e['id']
    with db:
        db.execute('DELETE FROM entry_curation');db.execute('DELETE FROM example_candidates')
        for e in entries:
            result=analyze(e) if e['review_status']!='verified' else dict(definition_clean=clean_excerpt(e['definition']),examples=[],flags=[],method='source_checked_seed')
            duplicate=None
            key=(e['lemma'],e['source_pdf_page'],normalize(e['definition']),normalize(e['pronunciation_raw']))
            if e['review_status']!='verified' and (e['lemma'],e['source_pdf_page']) in by_location:
                duplicate=by_location[(e['lemma'],e['source_pdf_page'])];stats['seed_duplicates']+=1
            elif key in seen and normalize(e['definition']):duplicate=seen[key];stats['exact_duplicates']+=1
            else:seen[key]=e['id']
            if not e['definition'] and result['definition_clean']:stats['definition_recovered']+=1
            db.execute('INSERT INTO entry_curation VALUES(?,?,?,?,?)',(e['id'],result['definition_clean'],json.dumps(result['flags']),duplicate,result['method']))
            if e['review_status']!='verified':
                # Rebuild this entry's projection from glosses, never overwrite source.
                db.execute('DELETE FROM search_index WHERE entry_id=?',(e['id'],))
                for term,weight in index_terms({**e,'definition':result['definition_clean']}).items():db.execute('INSERT INTO search_index VALUES(?,?,?)',(e['id'],term,weight))
                for example in result['examples']:db.execute('INSERT OR IGNORE INTO example_candidates VALUES(?,?,?,?)',(e['id'],example,e['source_pdf_page'],'pending'))
            if result['flags']:questions.append(dict(id=e['id'],lemma=e['lemma'],page=e['source_pdf_page'],flags=result['flags']))
        stats['examples_for_review']=db.execute('SELECT count(*) FROM example_candidates').fetchone()[0]
    assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
    (out/'CURATION_QUESTIONS.jsonl').write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in questions),encoding='utf8')
    (out/'CURATION_SUMMARY.json').write_text(json.dumps(stats,ensure_ascii=False,indent=2),encoding='utf8')
    lines=['# 语料自动整理与待确认项','','自动整理不等于人工核验；原文、原审核状态均保留。',json.dumps(stats,ensure_ascii=False),'','## 处理方式','','精确重复及同页种子重复仅在检索层折叠；同形异义不自动合并。候选例句另存，不自动晋升成原书核验例句。','', '## 待确认清单','','|词头|PDF页|问题|','|---|---:|---|']
    lines += [f"|{q['lemma']}|{q['page']}|{', '.join(q['flags'])}|" for q in questions]
    (out/'CURATION_QUESTIONS.md').write_text('\n'.join(lines),encoding='utf8')
    db.close();print(json.dumps(stats,ensure_ascii=False))
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--db',default=str(ROOT/'data/kunming.sqlite'));curate(parser.parse_args().db)

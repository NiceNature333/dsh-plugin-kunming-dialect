import re,json,hashlib
from inspect_pdf import ROOT
from extract_pdf import extract

def parse(**options):
    entries=[]; current=None
    for block in extract(**options):
        for line in block['text'].splitlines():
            line=line.strip()
            match=re.match(r'^([\u4e00-\u9fff]{1,12})([1-4I]?)\s*(?=[a-z])',line)
            if match:
                if current: entries.append(current)
                lemma=match[1]
                current=dict(id=hashlib.sha256(f"{block['page']}:{block['column']}:{len(entries)}:{lemma}".encode()).hexdigest()[:20],lemma=lemma,
                    source_pdf_page=block['page'],source_printed_page=block['printed_page'],source_pages=[block['page']],raw_text=line,
                    pronunciation_raw='',pronunciation_verified=None,part_of_speech='',definition='',mandarin_meaning='',usage_notes='',examples=[],ocr_confidence=None,review_status='pending',derived_fields=[])
            elif current:
                current['raw_text']+='\n'+line
                if block['page'] not in current['source_pages']: current['source_pages'].append(block['page'])
    if current: entries.append(current)
    for entry in entries:
        text=entry['raw_text']
        pos=re.search(r'[（(](名|动|形|副|代|助|叹|量|数|介|连|象)[）)]',text)
        if pos:
            entry['part_of_speech']=pos[1]
            entry['pronunciation_raw']=text[len(entry['lemma']):pos.start()]
            entry['definition']=text[pos.end():]
        else: entry['review_status']='problem'
        if len(text)>4000 or len(entry['source_pages'])>2: entry['review_status']='problem'
    (ROOT/'data/entries.jsonl').write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in entries),encoding='utf-8')
    (ROOT/'data/review_candidates.jsonl').write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in entries),encoding='utf-8')
    report=dict(entries=len(entries),pending=sum(x['review_status']=='pending' for x in entries),problem=sum(x['review_status']=='problem' for x in entries),extraction_options=options,notes=['All automatic entries require review. No OCR probability is invented.','Column order left then right, page continuations retained; possible missed headings remain raw.'])
    (ROOT/'data/extraction_report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    # Stratify by POS and then evenly across all pages. These are review samples, not verified entries.
    sample=[]
    for pos in sorted(set(x['part_of_speech'] for x in entries)):
        group=[x for x in entries if x['part_of_speech']==pos]
        sample.extend(group[::max(1,len(group)//6)][:6])
    (ROOT/'data/private/reports').mkdir(parents=True,exist_ok=True)
    (ROOT/'data/private/reports/OCR_SAMPLES.md').write_text('# 自动提取人工复核样本\n\n均未人工核验；原文见 data/raw/page-NNNN.json，跨页见来源列表。\n\n'+ '\n\n'.join(f"## {x['lemma']} / {x['part_of_speech']} / PDF {x['source_pages']} / 印刷 {x['source_printed_page']}\n\n{x['raw_text']}" for x in sample),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False))
    return entries
if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser(description='Local-only OCR parsing; inspect page layout before selecting ranges.')
    for name,default in [('start-page',1),('end-page',None),('printed-offset',0),('header',195),('footer',75)]: parser.add_argument('--'+name,type=int,default=default)
    parse(**vars(parser.parse_args()))

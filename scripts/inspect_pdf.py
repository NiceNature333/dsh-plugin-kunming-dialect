"""Inspect text layer without OCR; preserve page geometry for column analysis."""
import json
import os
from pathlib import Path
import pymupdf

ROOT = Path(__file__).resolve().parents[1]
def source_pdfs():
    if os.environ.get('KUNMING_SOURCE_PDF'): return [Path(os.environ['KUNMING_SOURCE_PDF'])]
    return [p for folder in (ROOT,ROOT/'source') if folder.exists() for p in folder.iterdir() if p.is_file() and p.suffix.lower()=='.pdf']
def inspect():
    out = []
    (ROOT/'data/raw').mkdir(parents=True, exist_ok=True)
    (ROOT/'tmp/pdfs').mkdir(parents=True, exist_ok=True)
    for path in source_pdfs():
        doc = pymupdf.open(path)
        pages = []
        for i, page in enumerate(doc):
            text = page.get_text()
            record = dict(pdf=path.name, page=i+1, width=page.rect.width, height=page.rect.height,
                          text=text, blocks=page.get_text('blocks'))
            (ROOT/f'data/raw/page-{i+1:04}.json').write_text(json.dumps(record, ensure_ascii=False), encoding='utf-8')
            pages.append(dict(page=i+1, chars=len(text)))
            if i in (8, 20, 50, 100):
                page.get_pixmap(matrix=pymupdf.Matrix(1,1)).save(ROOT/f'tmp/pdfs/page-{i+1}.png')
        out.append(dict(file=path.name, bytes=path.stat().st_size, pages=len(doc), text_pages=pages))
    (ROOT/'data/inspection.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps([{k:v for k,v in x.items() if k!='text_pages'} for x in out],ensure_ascii=False))
if __name__=='__main__': inspect()

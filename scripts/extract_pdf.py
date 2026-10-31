"""Read OCR columns geometrically; never re-run OCR."""
import json
import pymupdf
from pathlib import Path
from inspect_pdf import ROOT,source_pdfs

def extract(start_page=1,end_page=None,printed_offset=0,header=195,footer=75):
    output=[]
    paths=source_pdfs()
    if len(paths)!=1: raise ValueError('Select exactly one PDF using KUNMING_SOURCE_PDF')
    doc=pymupdf.open(paths[0])
    for index in range(start_page-1,min(end_page or len(doc),len(doc))):
        page=doc[index]
        columns=[[],[]]
        for block in page.get_text('dict')['blocks']:
                for line in block.get('lines',[]):
                    x,y,_,_=line['bbox']
                    if y<header or y>page.rect.height-footer: continue
                    text=''.join(s['text'] for s in line['spans']).strip()
                    if text: columns[0 if x<page.rect.width*.46 else 1].append((y,x,text))
        for col,lines in enumerate(columns):
            for y,x,text in sorted(lines):
                output.append(dict(page=index+1,printed_page=index+1-printed_offset,column=col+1,text=text))
    (ROOT/'data/columns.jsonl').write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in output),encoding='utf-8')
    return output
if __name__=='__main__': print(len(extract()))

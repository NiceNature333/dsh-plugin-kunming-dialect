"""Import user-supplied, locally authorized seed JSON. No dictionary data is bundled."""
import argparse,json
from pathlib import Path
from inspect_pdf import ROOT

def import_seed(source):
    entries=json.loads(Path(source).read_text(encoding='utf-8'))
    if not isinstance(entries,list): raise ValueError('Expected an array')
    ids=set()
    for e in entries:
        for key in ('id','lemma','definition','source_pdf_page','review_status'):
            if key not in e: raise ValueError('Missing '+key)
        if e['id'] in ids: raise ValueError('Duplicate id')
        ids.add(e['id'])
    target=ROOT/'data/private/dialect_seed.json'
    target.parent.mkdir(parents=True,exist_ok=True)
    if target.exists(): raise FileExistsError('Seed file exists; review or back it up first')
    target.write_text(json.dumps(entries,ensure_ascii=False,indent=2),encoding='utf-8')
    print('Imported local seeds:',len(entries))
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input',required=True,help='JSON you have the right to use locally')
    import_seed(parser.parse_args().input)

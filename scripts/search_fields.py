"""Reversible search projections. Never overwrite original OCR or review status."""
import re

def clean_excerpt(text):
    text=re.sub(r'\[[^\]]*\]|［[^］]*］',' ',text or '')
    text=re.sub(r'[^\u4e00-\u9fff，。；：、！？（）“”《》～\s]',' ',text)
    return re.sub(r'\s+',' ',text).strip()[:240]

def index_terms(entry):
    terms={}
    for keyword in entry.get('keywords',[]): terms[keyword]=3
    lemma=entry.get('lemma','')
    if lemma: terms[lemma]=max(terms.get(lemma,0),3)
    # Reviewed reverse meanings remain stronger than raw OCR definition matches.
    for text,weight in [(entry.get('mandarin_meaning',''),1),(clean_excerpt(entry.get('definition','')),0.25)]:
        for phrase in re.findall(r'[\u4e00-\u9fff]+',text):
            for n in (2,3,4):
                for i in range(len(phrase)-n+1):
                    term=phrase[i:i+n];terms[term]=max(terms.get(term,0),weight)
    return terms

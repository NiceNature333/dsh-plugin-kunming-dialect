"""Scan staged files and reachable history; never print matching secret values.
This is a release guard, not a guarantee of legal rights or absence of secrets.
"""
import json,re,subprocess,sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
def git(*args): return subprocess.check_output(['git',*args],cwd=ROOT)
BLOCKED_PREFIXES=('data/','source/','cache/','logs/','tmp/','.venv/','node_modules/','.references/')
BLOCKED_SUFFIXES=('.pdf','.sqlite','.db','.jsonl','.csv','.png','.jpg','.jpeg','.gif','.tif','.tiff','.webp','.bundle','.zip','.7z','.log')
PATTERNS={
 'github_token':re.compile(r'gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}'),
 'api_secret':re.compile(r'\bsk-[A-Za-z0-9_-]{24,}'),
 'private_key':re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
 'personal_path':re.compile(r'[A-Z]:[\\/]+Users[\\/]+(?!Public\b|<)[A-Za-z0-9_-]+',re.I),
 'email_address':re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b'),
 'qq_credentials':re.compile(r'(?im)^\s*(?:appSecret|access_token|refresh_token)\s*[:=]\s*[\x22\x27]?[A-Za-z0-9_-]{12,}'),
}
def normalized(text):return ''.join(re.findall(r'[\u4e00-\u9fff]',text))
def reference_fragments():
 fragments=set()
 # Local-only comparison source; never serialized or printed.
 paths=[ROOT/'data/private/dialect_seed.json',ROOT/'data/entries.jsonl']
 for path in paths:
  if not path.exists():continue
  entries=json.loads(path.read_text(encoding='utf8')) if path.suffix=='.json' else (json.loads(line) for line in path.read_text(encoding='utf8').splitlines())
  for entry in entries:
   for text in [entry.get('definition',''),*entry.get('examples',[])]:
    text=normalized(text)
    for i in range(0,max(0,len(text)-23),8):fragments.add(text[i:i+24])
 return fragments
def check(path,blob,fragments,scope):
 errors=[]
 low=path.lower()
 if low.startswith(BLOCKED_PREFIXES) or low.endswith(BLOCKED_SUFFIXES) or (Path(path).name.startswith('.env') and Path(path).name!='.env.example'): errors.append((scope,path,'prohibited_path'))
 if b'\x00' in blob or blob.startswith((b'%PDF-',b'SQLite format 3')):errors.append((scope,path,'binary_or_imported_data'))
 try:text=blob.decode('utf8')
 except UnicodeDecodeError:return errors+[(scope,path,'non_utf8_review_required')]
 for name,pattern in PATTERNS.items():
  if pattern.search(text): errors.append((scope,path,name))
 normalized_text=normalized(text)
 if fragments and any(normalized_text[i:i+24] in fragments for i in range(max(0,len(normalized_text)-23))):errors.append((scope,path,'local_dictionary_overlap'))
 return errors
def main():
 fragments=reference_fragments();errors=[];seen=set();counts={'index':0,'history':0}
 for record in git('ls-files','--stage','-z').decode('utf8').split('\0'):
  if not record:continue
  meta,path=record.split('\t',1);mode,oid,stage=meta.split()
  if mode not in ('100644','100755') or stage!='0':errors.append(('index',path,'unsupported_entry'));continue
  errors+=check(path,git('cat-file','blob',oid),fragments,'index');counts['index']+=1
 for record in git('rev-list','--objects','--all').decode('utf8').splitlines():
  oid,_,path=record.partition(' ')
  if oid in seen or not path:continue
  seen.add(oid)
  if git('cat-file','-t',oid).strip()!=b'blob':continue
  errors+=check(path,git('cat-file','blob',oid),fragments,'history');counts['history']+=1
 print(json.dumps({'scanned':counts,'local_overlap_reference_available':bool(fragments),'findings':[{'scope':s,'path':p,'rule':r} for s,p,r in errors]},ensure_ascii=True,indent=2))
 return 1 if errors else 0
if __name__=='__main__':sys.exit(main())

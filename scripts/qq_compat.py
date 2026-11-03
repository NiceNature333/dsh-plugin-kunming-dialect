"""Guarded migration from the known QQ 0.5.3 allowlist patch to groupExtraTools.

No credentials or group IDs are printed. PyYAML is needed for migration validation.
"""
import argparse, hashlib, json, re, shutil, copy
from datetime import datetime
from pathlib import Path

BASE="const QQ_SAFE_TOOLS = ['memory_search', 'memory_save', 'qqbot_describe_image'];"
PATCHED="const QQ_SAFE_TOOLS = ['memory_search', 'memory_save', 'qqbot_describe_image', 'kunming_rewrite'];"
TOOLS=['kunming_rewrite','kunming_lookup','kunming_feedback']

def digest(data):return hashlib.sha256(data).hexdigest()

def plan(profile,enabled=True):
    import yaml
    package=profile/'node_modules/@tencent-connect/dsh-qqbot'
    version=json.loads((package/'package.json').read_text(encoding='utf-8-sig'))['version']
    source=package/'dist/session/session-manager.js';config=profile/'cordis.patch.yml'
    original=source.read_bytes();text=original.decode('utf8')
    if version!='0.5.3' or text.count(BASE)+text.count(PATCHED)!=1 or 'this.config.groupExtraTools' not in text:
        raise ValueError('Unknown version/source; manual review required')
    raw=config.read_bytes();settings=raw.decode('utf-8-sig');parsed=yaml.safe_load(settings)
    qq=next(x for x in parsed if x.get('id')=='im-qqbot')
    mapping=qq.get('config',{}).get('groupExtraTools',{})
    if not isinstance(mapping,dict) or any(not isinstance(v,list) for v in mapping.values()):raise ValueError('Invalid existing allowlist')
    merged={k:list(dict.fromkeys([x for x in v if x not in TOOLS]+(TOOLS if enabled else []))) for k,v in mapping.items()}
    if enabled:merged.setdefault('*',TOOLS)
    block='    groupExtraTools:\n'+''.join('      '+json.dumps(str(k))+': '+json.dumps(v)+'\n' for k,v in merged.items())
    # Preserve all unrelated configuration bytes, comments and secrets.
    match=re.search(r'(?m)^- id: im-qqbot\r?\n  config:\r?\n',settings)
    if not match:raise ValueError('Unknown QQ config layout')
    end=re.search(r'(?m)^- ',settings[match.end():]);stop=match.end()+end.start() if end else len(settings)
    section=settings[match.end():stop]
    if re.search(r'(?m)^    groupExtraTools:',section):
        section,n=re.subn(r'(?m)^    groupExtraTools:[^\n]*\n(?:[ \t]*(?:\n)|[ \t]{6,}[^\n]*\n)*',lambda _:block,section,count=1)
        if n!=1:raise ValueError('Cannot merge allowlist')
    else:section=block+section
    updated=settings[:match.end()]+section+settings[stop:]
    validated=yaml.safe_load(updated)
    expected=copy.deepcopy(parsed);next(x for x in expected if x.get('id')=='im-qqbot')['config']['groupExtraTools']=merged
    if validated!=expected:raise ValueError('Unrelated config changed; refusing migration')
    return source,config,original,raw,text.replace(PATCHED,BASE).encode('utf8'),updated.encode('utf8'),version

def migrate(profile,expected_hash=None,apply=False,enabled=True):
    source,config,old_source,old_config,new_source,new_config,version=plan(profile,enabled)
    state={'version':version,'source_sha256':digest(old_source),'config_sha256':digest(old_config),'source_changed':old_source!=new_source,'config_changed':old_config!=new_config,'scope':'group only; non-owner private tools need separate upstream support'}
    if not apply:return state
    if expected_hash!=digest(old_source):raise ValueError('Source hash must match reviewed plan')
    backup=profile/'.kunming-backups'/('v02-'+datetime.now().strftime('%Y%m%d-%H%M%S-%f'));backup.mkdir(parents=True)
    (backup/'session-manager.js').write_bytes(old_source);(backup/'cordis.patch.yml').write_bytes(old_config)
    try:
        if source.read_bytes()!=old_source or config.read_bytes()!=old_config:raise ValueError('Files changed during planning')
        source.write_bytes(new_source);config.write_bytes(new_config)
        if source.read_bytes()!=new_source or config.read_bytes()!=new_config:raise ValueError('Verification failed')
    except Exception:
        source.write_bytes(old_source);config.write_bytes(old_config);raise
    (backup/'manifest.json').write_text(json.dumps({'source':str(source),'config':str(config),'source_after':digest(new_source),'config_after':digest(new_config)}),encoding='utf8')
    return {**state,'backup':str(backup),'restart_required':True}

def restore(backup):
    m=json.loads((backup/'manifest.json').read_text(encoding='utf8'));source,config=Path(m['source']),Path(m['config'])
    if digest(source.read_bytes())!=m['source_after'] or digest(config.read_bytes())!=m['config_after']:raise ValueError('Files changed since migration; refusing overwrite')
    source.write_bytes((backup/'session-manager.js').read_bytes());config.write_bytes((backup/'cordis.patch.yml').read_bytes())

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('profile',type=Path);p.add_argument('--apply',action='store_true');p.add_argument('--expected-sha256');p.add_argument('--restore',type=Path);p.add_argument('--disable',action='store_true');a=p.parse_args()
    if a.restore:restore(a.restore);print('Restored guarded snapshot')
    else:print(json.dumps(migrate(a.profile,a.expected_sha256,a.apply,not a.disable),indent=2))

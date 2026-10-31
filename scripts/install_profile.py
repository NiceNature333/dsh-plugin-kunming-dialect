"""Install bundle and authorized QQ allowlist adjustment; snapshot before mutations."""
import json,os,re
from pathlib import Path
from datetime import datetime
ROOT=Path(__file__).resolve().parents[1]
profile=Path(os.environ['USERPROFILE'])/'.dsh/profiles/desktop'
backup=profile/'.kunming-backups'/datetime.now().strftime('%Y%m%d-%H%M%S')
backup.mkdir(parents=True)
paths={'package.json':profile/'package.json','cordis.patch.yml':profile/'cordis.patch.yml','session-manager.js':profile/'node_modules/@tencent-connect/dsh-qqbot/dist/session/session-manager.js'}
for name,path in paths.items(): (backup/name).write_bytes(path.read_bytes())
manifest=json.loads(paths['package.json'].read_text(encoding='utf-8-sig'))
bundle='dsh-plugin-kunming-dialect'
if bundle not in manifest['dsh']['profile']['bundles']:manifest['dsh']['profile']['bundles'].append(bundle)
paths['package.json'].write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
text=paths['session-manager.js'].read_text(encoding='utf8')
old="const QQ_SAFE_TOOLS = ['memory_search', 'memory_save', 'qqbot_describe_image'];"
new="const QQ_SAFE_TOOLS = ['memory_search', 'memory_save', 'qqbot_describe_image', 'kunming_rewrite'];"
if old not in text and new not in text: raise RuntimeError('QQ allowlist changed; inspect before patching')
paths['session-manager.js'].write_text(text.replace(old,new),encoding='utf8')
patch=paths['cordis.patch.yml'].read_text(encoding='utf8')
if '    showToolResults: false' not in patch:
 patch,count=re.subn(r'(- id: im-qqbot\n  config:\n)',r'\1    showToolResults: false\n    streaming: false\n',patch,count=1)
 if count!=1: raise RuntimeError('Cannot locate original QQ config; inspect before merging')
 paths['cordis.patch.yml'].write_text(patch,encoding='utf8')
(ROOT/'data/install-state.json').write_text(json.dumps(dict(backup=str(backup),profile=str(profile),bundle=bundle,qq_allowlist_modified=True,restart_required=True),indent=2),encoding='utf8')
print('Installed; snapshot:',backup)

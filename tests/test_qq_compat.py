import importlib.util,json,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('qq_compat',Path(__file__).resolve().parents[1]/'scripts/qq_compat.py')
q=importlib.util.module_from_spec(spec);spec.loader.exec_module(q)
class CompatibilityTests(unittest.TestCase):
 def test_guarded_migration_preserves_configuration_and_restores(self):
  with tempfile.TemporaryDirectory() as tmp:
   profile=Path(tmp);package=profile/'node_modules/@tencent-connect/dsh-qqbot';(package/'dist/session').mkdir(parents=True)
   (package/'package.json').write_text(json.dumps({'version':'0.5.3'}))
   source=package/'dist/session/session-manager.js';source.write_text(q.PATCHED+'\nconst config = this.config.groupExtraTools;')
   config=profile/'cordis.patch.yml';config.write_text('- id: im-qqbot\n  config:\n    replyProbability: 0.1\n    groupExtraTools:\n      "synthetic-group": [web_search]\n    streaming: false\n',encoding='utf8')
   originals=(source.read_bytes(),config.read_bytes());plan=q.migrate(profile)
   with self.assertRaises(ValueError):q.migrate(profile,'wrong',True)
   result=q.migrate(profile,plan['source_sha256'],True)
   self.assertIn(q.BASE,source.read_text());self.assertIn('web_search',config.read_text())
   second=q.migrate(profile);self.assertFalse(second['source_changed']);self.assertFalse(second['config_changed'])
   disabled=q.plan(profile,False)[5].decode('utf8');self.assertNotIn('kunming_rewrite',disabled);self.assertIn('web_search',disabled)
   q.restore(Path(result['backup']));self.assertEqual(originals,(source.read_bytes(),config.read_bytes()))
 def test_unknown_version_is_rejected(self):
  with tempfile.TemporaryDirectory() as tmp:
   p=Path(tmp);pkg=p/'node_modules/@tencent-connect/dsh-qqbot';(pkg/'dist/session').mkdir(parents=True)
   (pkg/'package.json').write_text('{"version":"unknown"}');(pkg/'dist/session/session-manager.js').write_text(q.BASE)
   with self.assertRaises(ValueError):q.plan(p)
if __name__=='__main__':unittest.main()

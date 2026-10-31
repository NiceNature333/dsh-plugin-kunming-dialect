"""Original synthetic safety fixtures; no real tokens or publication excerpts."""
import importlib.util
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location('public_audit',Path(__file__).resolve().parents[1]/'scripts/audit_public.py')
audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)

class PublicAuditTests(unittest.TestCase):
    def rules(self,path,blob,fragments=None):
        return {rule for _,_,rule in audit.check(path,blob,fragments or set(),'test')}
    def test_private_paths_and_binary_magic(self):
        self.assertIn('prohibited_path',self.rules('data/private/example.json',b'{}'))
        self.assertIn('binary_or_imported_data',self.rules('docs/disguised.md',b'%PDF-'+b'synthetic'))
        self.assertIn('binary_or_imported_data',self.rules('docs/disguised.txt',b'SQLite format 3'+b'synthetic'))
    def test_synthetic_secret_redacted(self):
        token=('gh'+'p_'+'A'*40).encode()
        findings=audit.check('src/fake.js',token,set(),'test')
        self.assertIn('github_token',{x[2] for x in findings})
        self.assertNotIn(token.decode(),str(findings))
    def test_synthetic_local_source_overlap(self):
        passage='这是完全原创的用于测试公开扫描行为的虚构长句并非来自任何出版物'
        fragment=audit.normalized(passage)[:24]
        self.assertIn('local_dictionary_overlap',self.rules('docs/fake.md',passage.encode(),{fragment}))
    def test_original_fixture_is_allowed(self):
        self.assertEqual(self.rules('tests/fixtures/sample.json',b'{"original": true}'),set())

if __name__=='__main__':unittest.main()

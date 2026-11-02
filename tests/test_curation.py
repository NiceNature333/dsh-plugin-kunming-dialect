"""Synthetic corpus examples; no publication content."""
import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from curate_corpus import analyze
class CurationTests(unittest.TestCase):
 def test_recovers_boundary_without_modifying_raw(self):
  e={'lemma':'虚构甲','raw_text':'虚构甲jia3 [x]（名）虚构的测试解释：甲～乙。','definition':'','review_status':'pending'}
  raw=e['raw_text'];a=analyze(e);self.assertIn('虚构的测试解释',a['definition_clean']);self.assertEqual(e['raw_text'],raw)
 def test_missing_definition_stays_flagged(self):
  self.assertIn('definition_missing',analyze({'raw_text':'虚构甲jia3','review_status':'problem'})['flags'])
 def test_example_names_do_not_enter_semantic_index(self):
  a=analyze({'raw_text':'甲jia3（名）虚构的招呼：陌生人物～。','definition':'','review_status':'pending'})
  self.assertNotIn('陌生人物',a['definition_clean'])
if __name__=='__main__':unittest.main()

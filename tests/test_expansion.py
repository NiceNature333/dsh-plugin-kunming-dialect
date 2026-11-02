"""Synthetic expansion ranking fixtures, independent from imported data."""
import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from expand_corpus import enrich
class ExpansionTests(unittest.TestCase):
 def test_common_short_function_words_receive_priority(self):
  hint,score,category=enrich({'lemma':'虚构','part_of_speech':'代'},' 原创 释义 ')
  self.assertEqual(hint,'原创释义');self.assertGreaterEqual(score,40);self.assertEqual(category,'人称指示与疑问')
 def test_missing_gloss_is_not_invented(self):
  self.assertEqual(enrich({'lemma':'虚构','part_of_speech':''},'')[0],'')
if __name__=='__main__':unittest.main()

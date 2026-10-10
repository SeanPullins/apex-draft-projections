"""Tests: an outcome-maturity timeline cannot be bypassed by correct feature dates."""
import unittest
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
import guard_nfl_outcome_maturity as guard

class HistoricalMaturityTests(unittest.TestCase):
    def test_claimed_muse_2018_fold_is_invalid(self):
        d=guard.inspect_fold(2018,[2015,2016,2017],4)
        self.assertFalse(d["passes_maturity"])
        self.assertEqual(d["latest_permitted_training_draft_year"],2014)
        self.assertEqual([v["last_nfl_outcome_season"] for v in d["invalid_training_classes"]],[2018,2019,2020])
        with self.assertRaisesRegex(guard.MaturityViolation,"FUTURE-OUTCOME LEAK"):
            guard.require_valid_fold(2018,[2015,2016,2017],4)

    def test_2019_to_2022_dev_train_caps_have_matured(self):
        for test,cap in [(2019,2015),(2020,2016),(2021,2017),(2022,2018)]:
            years=list(range(2015,cap+1))
            self.assertTrue(guard.require_valid_fold(test,years,4)["passes_maturity"])

    def test_genuine_2018_pre_draft_training_can_only_use_2014_or_earlier(self):
        self.assertTrue(guard.require_valid_fold(2018,[2011,2012,2013,2014],4)["passes_maturity"])
        self.assertEqual(guard.latest_eligible_training_year(2018,4),2014)

    def test_partial_outcomes_require_separate_target_version(self):
        # Two-season metric matures earlier, but cannot be represented as four-season success.
        self.assertTrue(guard.require_valid_fold(2018,[2016],2)["passes_maturity"])
        with self.assertRaises(guard.MaturityViolation):
            guard.require_valid_fold(2018,[2016],4)

    def test_empty_duplicate_and_invalid_are_rejected(self):
        with self.assertRaises(guard.MaturityViolation):guard.require_valid_fold(2019,[],4)
        with self.assertRaises(ValueError):guard.require_valid_fold(2019,[2015,2015],4)
        with self.assertRaises(ValueError):guard.inspect_fold(2019,[2015],"four")
        with self.assertRaises(ValueError):guard.inspect_fold(2019,[2015],0)

if __name__=="__main__":
    unittest.main()

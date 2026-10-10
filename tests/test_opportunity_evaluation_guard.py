"""Phase 1 opportunity-model benchmark contract tests — synthetic, private-data-free."""
import copy
import json
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
import guard_opportunity_evaluation as g

def valid_manifest():
    return {
        "schema_version":1,"test_draft_year":2022,"outcome_seasons":4,
        "training_draft_years":[2013,2014,2015,2016,2017,2018],
        "forecast_as_of":"2022-04-20","draft_start_date":"2022-04-28",
        "label_id":"APEX_V3B_POSITION_WORKLOAD_V1",
        "threshold_provenance":{
            "mode":"training_label_fit","fitted_draft_years":[2013,2014,2015,2016,2017,2018],
            "position_cutoffs":{"QB":0.64,"WR":0.78,"OL":0.75}
        },
        "talent_feature_sources":[
            {"name":"recruiting_rank","available_at":"2021-12-31","is_post_draft":False},
            {"name":"college_2021_stats","available_at":"2022-01-03","is_post_draft":False}
        ],
        "baselines":[
            {"name":"recruiting_position","kind":"pre_draft",
             "uses_actual_draft_round_or_pick":False,"available_at":"2022-01-01"},
            {"name":"actual_round_oracle","kind":"hindsight_diagnostic",
             "uses_actual_draft_round_or_pick":True},
        ]
    }

class OpportunityEvaluationGuardTests(unittest.TestCase):
    def test_accept_vintage_clean_research_with_oracle_marked_separately(self):
        result=g.validate_manifest(valid_manifest())
        self.assertEqual(result["fold"]["latest_permitted_training_draft_year"],2018)
        self.assertTrue(result["baselines"][0]["usable_for_pre_draft_model_comparison"])
        self.assertFalse(result["baselines"][1]["usable_for_pre_draft_model_comparison"])
        self.assertEqual(result["validation_gate"],"PASS_METADATA_CONTRACT_NOT_RAW_REPLAY")

    def test_reject_actual_round_masquerading_as_predraft(self):
        p=valid_manifest()
        p["baselines"][1]["kind"]="pre_draft"
        p["baselines"][1]["available_at"]="2022-04-15"
        with self.assertRaisesRegex(g.EvaluationContractError,"HINDSIGHT"):
            g.validate_manifest(p)

    def test_reject_actual_round_as_talent_predictor(self):
        p=valid_manifest()
        p["talent_feature_sources"].append({
            "name":"actual_draft_round","available_at":"2022-04-20","is_post_draft":False
        })
        with self.assertRaisesRegex(g.EvaluationContractError,"cannot enter Talent"):
            g.validate_manifest(p)

    def test_reject_position_label_thresholds_from_future(self):
        p=valid_manifest()
        p["threshold_provenance"]["fitted_draft_years"].append(2022)
        with self.assertRaisesRegex(g.EvaluationContractError,"outside training"):
            g.validate_manifest(p)

    def test_reject_opportunity_threshold_training_outcomes_not_mature(self):
        p=valid_manifest()
        p["training_draft_years"].append(2020)
        p["threshold_provenance"]["fitted_draft_years"].append(2020)
        with self.assertRaisesRegex(g.EvaluationContractError,"FUTURE-OUTCOME"):
            g.validate_manifest(p)

    def test_reject_2018_future_outcome_fold_even_with_clean_feature_dates(self):
        p=valid_manifest()
        p["test_draft_year"]=2018
        p["training_draft_years"]=[2015,2016,2017]
        p["forecast_as_of"]="2018-04-10"
        p["draft_start_date"]="2018-04-26"
        with self.assertRaisesRegex(g.EvaluationContractError,"FUTURE-OUTCOME"):
            g.validate_manifest(p)

    def test_reject_unversioned_label(self):
        p=valid_manifest();p["label_id"]="A"
        with self.assertRaisesRegex(g.EvaluationContractError,"unversioned"):
            g.validate_manifest(p)

    def test_reject_post_draft_forecast(self):
        p=valid_manifest();p["forecast_as_of"]="2022-05-01"
        with self.assertRaisesRegex(g.EvaluationContractError,"precede"):
            g.validate_manifest(p)

    def test_reject_late_feature_or_consensus_board(self):
        for field in ("talent","market"):
            p=valid_manifest()
            if field=="talent":
                p["talent_feature_sources"][0]["available_at"]="2022-04-29"
                pattern="after forecast"
            else:
                p["baselines"][0]["available_at"]="2022-04-29"
                pattern="no as-of-available"
            with self.assertRaisesRegex(g.EvaluationContractError,pattern):
                g.validate_manifest(p)

    def test_reject_no_actionable_benchmark(self):
        p=valid_manifest();p["baselines"]=p["baselines"][1:]
        with self.assertRaisesRegex(g.EvaluationContractError,"no genuine pre-draft baseline"):
            g.validate_manifest(p)

    def test_static_precommitted_cutoff_must_predate_forecast(self):
        p=valid_manifest()
        p["threshold_provenance"]={"mode":"precommitted_fixed","defined_at":"2022-05-01"}
        with self.assertRaisesRegex(g.EvaluationContractError,"defined after"):
            g.validate_manifest(p)
        p["threshold_provenance"]["defined_at"]="2022-01-01"
        self.assertEqual(g.validate_manifest(p)["threshold_mode"],"precommitted_fixed")

if __name__=="__main__":
    unittest.main()

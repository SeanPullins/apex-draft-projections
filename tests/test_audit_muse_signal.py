"""Synthetic, source-free unit tests for Phase 3 prediction-only statistical audit."""
import csv
import gzip
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
import zipfile

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
import audit_muse_signal as m

def synthetic_zip(path, include_invalid_year=False, damaged=False):
    headers=["gsis_id","name","draft_year","pos_group"]
    headers += [f"y_{t}" for t in "ABC"]
    headers += [f"p_{t}_{k}" for t in "ABC" for k in m.MODELS]
    data=[]
    for year in (2019,2020,2021,2022):
        for i in range(4):
            row={"gsis_id":f"ID{year}-{i}","name":"SYNTHETIC",
                 "draft_year":str(2018 if include_invalid_year and year==2019 else year),
                 "pos_group":"QB" if i%2 else "WR"}
            for t in "ABC":
                row["y_"+t]=str(i%2)
                for mod in m.MODELS:
                    p=0.25 if i%2==0 else 0.75
                    if mod=="M1G34":p=0.20 if i%2==0 else 0.80
                    if mod=="M1G2":p=0.30 if i%2==0 else 0.70
                    row[f"p_{t}_{mod}"]=str(p)
            data.append(row)
    if damaged:data[0]["p_A_M1"]="1.5"
    mem=io.StringIO()
    w=csv.DictWriter(mem,fieldnames=headers)
    w.writeheader();w.writerows(data)
    with zipfile.ZipFile(path,"w") as z:
        z.writestr("backtest/predictions_dev.csv.gz",
                   gzip.compress(mem.getvalue().encode()))
        z.writestr("scripts/03_run_backtest_v3.py",
                   "FOLDS = {2018: 2017, 2019: 2015}\n")

class IndependentResearchTests(unittest.TestCase):
    def test_brier_and_delta_are_reproduced(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/"phase3.zip"
            synthetic_zip(p)
            out=m.run(p)
            self.assertEqual(out["source"]["prediction_rows"],16)
            self.assertEqual(out["outcomes"]["A"]["models"]["M1"]["brier"],0.0625)
            d=out["outcomes"]["A"]["paired"]["M1G34-minus-M1"]
            self.assertAlmostEqual(d["delta_brier"],-0.0225,places=7)
            self.assertEqual(d["cluster_bootstrap_95_ci"],[-0.0225,-0.0225])
            self.assertFalse(d["eligible_for_promotion"])
            self.assertTrue(out["not_an_independent_holdout"])
            self.assertIn("invalid 2018", " ".join(out["limitations"]))

    def test_2018_development_rows_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/"bad.zip"
            synthetic_zip(p,include_invalid_year=True)
            with self.assertRaisesRegex(ValueError,"2018 or unexpected"):
                m.run(p)

    def test_bad_probability_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/"bad.zip"
            synthetic_zip(p,damaged=True)
            with self.assertRaisesRegex(ValueError,"invalid APEX label or model prediction"):
                m.run(p)

    def test_uncertainty_becomes_wider_when_only_one_class_wins(self):
        rows=[]
        for y in m.YEARS:
            for i in range(10):
                outcome=i%2
                p=0.6 if outcome else 0.4
                q=(0.51 if outcome else 0.49) if y==2021 else (
                     0.7 if outcome else 0.3)
                rows.append({"year":y,"A":outcome,"A_M1":p,"A_M1G34":q})
        lo,hi=m.ci_cluster_exact(rows,"A_M1G34","A_M1","A")
        self.assertLess(lo,0)
        self.assertGreater(hi,0)

    def test_outcome_probability_auc(self):
        rows=[
            {"label":0,"p":0.1},{"label":0,"p":0.2},
            {"label":1,"p":0.8},{"label":1,"p":0.9}]
        self.assertEqual(m.auc(rows,"p","label"),1.)
        self.assertLess(m.brier(rows,"p","label"),0.04)
        self.assertEqual(m.auc([{"label":1,"p":0.5}], "p","label"),None)

    def test_phase1_v3b_labels_alone_do_not_validate_prediction(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/"p1.zip"
            with zipfile.ZipFile(p,"w") as z:
                z.writestr("phase1/robust_labels_v3b.csv",
                           "gsis_id,draft_year,V3b_posaware\n"
                           "ID,2019,1\nID,2019,0\n,2019,0\n")
            with zipfile.ZipFile(p) as z:
                result=m.phase1_inventory(z)
            self.assertEqual(result["duplicate_gsis_year_keys"],1)
            self.assertEqual(result["missing_gsis_rows"],1)
            self.assertEqual(result["status"],"LABELS_ONLY_NOT_A_VALID_V3B_BACKTEST")

if __name__=="__main__":
    unittest.main()

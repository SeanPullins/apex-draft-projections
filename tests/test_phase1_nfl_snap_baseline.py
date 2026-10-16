"""Synthetic Phase 1 NFL target and draft-slot baseline contract tests (no internet)."""
from __future__ import annotations
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location("phase1_nfl",ROOT/"scripts"/"phase1_nfl_snap_baseline.py")
m=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(m)

def draft(year,pick,pfr_id,pos="QB"):
    return {"year":year,"pick":pick,"position_group":pos,
            "pfr_id":pfr_id,"position":pos,"source_is_drafted":True}

def snap_record(off=0,defense=0,st=0):
    return {"off":off,"def":defense,"st":st,"games":{"x"},"seasons":{2021},
            "off_pct_games":[],"def_pct_games":[]}

class NFLPhase1Tests(unittest.TestCase):
    def test_private_data_outside_repo(self):
        with self.assertRaisesRegex(ValueError,"outside PUBLIC repo"):
            m.private_path(ROOT/"private"/"raw")
        with tempfile.TemporaryDirectory() as td:
            self.assertEqual(m.private_path(td),Path(td).resolve())

    def test_stat_and_position_definitions(self):
        self.assertEqual(m.position_group("OT"),"OL")
        self.assertEqual(m.position_group("DT"),"IDL")
        self.assertEqual(m.position_group("DE"),"EDGE")
        self.assertIsNone(m.position_group("K"))
        self.assertIsNone(m.number("","offense_pct"))
        for val in ("negative","-3","inf","NaN"):
            with self.assertRaises(ValueError):m.number(val,"snap")
        self.assertEqual(m.band_for(1),"1-16")
        self.assertEqual(m.band_for(32),"17-32")
        self.assertEqual(m.band_for(260),"201-300")

    def test_realized_zero_not_false_talent_grade(self):
        seasons={str(y):{"regular_games":256} for y in range(2013,2026)}
        rows=[draft(2013,1,"A"),draft(2013,2,"B"),draft(2013,3,""),
              draft(2012,4,"C"),draft(2022,5,"D"),draft(2013,6,"E","K")]
        snaps={
           (2013,"A"):snap_record(off=200,st=60),
           (2014,"A"):snap_record(off=550),
           (2015,"A"):snap_record(off=250),
           (2016,"A"):snap_record(off=300),
           (2022,"D"):snap_record(defense=100),
           (2023,"D"):snap_record(defense=300),
        }
        labels,counts=m.build_labels(rows,snaps,seasons)
        self.assertEqual(labels[0]["four_year_unit_snaps"],1300)
        self.assertEqual(labels[0]["role_y3_proxy"],1)
        self.assertEqual(labels[0]["four_year_st_snaps"],60)
        self.assertEqual(labels[1]["status"],"NO_SNAP_ENTRY_UNCONFIRMED")
        self.assertIsNone(labels[1]["four_year_unit_snaps"])
        self.assertEqual(labels[2]["status"],"ID_UNRESOLVED")
        self.assertEqual(labels[3]["status"],"SNAP_FEED_BEFORE_COVERAGE")
        self.assertEqual(labels[4]["four_year_unit_snaps"],400)
        self.assertEqual(labels[5]["status"],"POSITION_UNSUPPORTED")
        self.assertEqual(counts["COMPLETE_OBSERVED_PARTICIPANT"],2)

    def test_complete_source_season_gate(self):
        years={str(y):{"regular_games":256} for y in range(2013,2026)}
        years["2015"]["regular_games"]=159
        with self.assertRaisesRegex(ValueError,"incomplete snap feed"):
            m.build_labels([draft(2013,1,"A")],{(2013,"A"):snap_record(200)},years)

    def test_pick_baseline_uses_only_supplied_training_classes(self):
        examples=[]
        for y in range(2013,2023):
            for i in range(1,30):
                examples.append({**draft(y,i,"P"+str(i), "QB" if i%2 else "WR"),
                  "status":"COMPLETE_OBSERVED_PARTICIPANT",
                  "four_year_unit_snaps":(y-2000)*1000+i})
        older=m.expected_by_pick(examples,list(range(2013,2018)),replicates=100)
        later=m.expected_by_pick(examples,list(range(2013,2023)),replicates=100)
        self.assertTrue(older)
        self.assertTrue(later)
        o=next(x for x in older if x["position_group"]=="QB" and x["pick_band"]=="1-16")
        n=next(x for x in later if x["position_group"]=="QB" and x["pick_band"]=="1-16")
        self.assertLess(o["expected_four_year_unit_snaps_conditional_on_recorded_participation"],
                        n["expected_four_year_unit_snaps_conditional_on_recorded_participation"])
        self.assertFalse(o["usable_as_true_market_surplus"])
        self.assertTrue(o["bootstrap_95_ci"])

    def test_report_is_aggregate_only_and_marks_incomplete(self):
        examples=[]
        for y in range(2010,2023):
            examples.append({**draft(y,1,"P"+str(y)),
              "status":"NO_SNAP_ENTRY_UNCONFIRMED",
              "four_year_unit_snaps":None})
        r=m.build_report(examples,examples,{"NO_SNAP_ENTRY_UNCONFIRMED":len(examples)},
                         {},{},[],replicates=100)
        self.assertFalse(r["phase1_complete"])
        self.assertEqual(r["conditional_by_pick_curve"],[])
        self.assertEqual(r["forward_vintage_2020_2022"]["2022"]["train_classes"][-1],2018)
        self.assertTrue(r["user_approval_required_before_phase2"])
        self.assertNotIn("P2013",json.dumps(r))
        self.assertNotIn("P2022",json.dumps(r))

if __name__=="__main__":
    unittest.main()

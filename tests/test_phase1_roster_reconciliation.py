"""Exact-ID NFL roster/no-snap reconciliation: synthetic, privacy-safe fixtures."""
from __future__ import annotations
import importlib.util,io,csv,json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
import sys
sys.path.insert(0,str(ROOT/"scripts"))
import phase1_roster_reconciliation as r

def row(year,rank,player,status="NO_SNAP_ENTRY_UNCONFIRMED",pos="QB"):
    return {"year":year,"pick":rank,"pfr_id":player,"status":status,"position_group":pos}

class RosterJoinTests(unittest.TestCase):
    def test_no_snap_not_equated_with_failure(self):
        seen={
            "SOME":{"years":{2013,2014},"gsis_ids":{"ID-1"},"weeks":{(2013,1,"CLE")},"rows":2},
            "AMBIG":{"years":{2014,2015},"gsis_ids":{"ID-1","ID-2"},"weeks":{(2014,1,"CLE")},"rows":2},
        }
        draft=[row(2013,20,"SOME"),row(2013,52,"NONE"),row(2014,199,"AMBIG"),
               row(2014,70,"HAS_SNAPS","COMPLETE_OBSERVED_PARTICIPANT")]
        report=r.reconcile(draft,seen)
        self.assertEqual(report["base_no_snap_selections"],3)
        self.assertEqual(report["roster_seen_no_snap_match"],2)
        self.assertEqual(report["no_roster_match_or_unobserved"],1)
        self.assertEqual(report["true_zero_playing_time_confirmed"],0)
        self.assertEqual(report["by_class"]["2013"]["ROSTER_SEEN_NO_SNAP_MATCH"],1)
        self.assertEqual(report["conflict_flags"]["pfr_to_multiple_gsis_any_year"],1)
        self.assertNotIn("SOME",json.dumps(report))
        self.assertNotIn("AMBIG",json.dumps(report))
        self.assertNotIn("HAS_SNAPS",json.dumps(report))

    def test_match_must_be_exact_pfr_id(self):
        draft=[row(2020,75,"NOPE")]
        evidence={"nope":{"years":{2020},"gsis_ids":set(),"weeks":set(),"rows":1}}
        report=r.reconcile(draft,evidence)
        self.assertEqual(report["roster_seen_no_snap_match"],0)

    def test_beyond_roster_window_no_false_match(self):
        rows=[row(2013,1,"LATER")]
        evidence={"LATER":{"years":{2025},"gsis_ids":{"ID"},"weeks":set(),"rows":1}}
        report=r.reconcile(rows,evidence)
        self.assertEqual(report["roster_seen_no_snap_match"],0)

    def test_roster_source_checksum_tamper_detected(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            for year in range(r.FIRST,r.LAST_SNAP+1):
                src=root/f"roster_weekly_{year}.csv"
                raw=b"season,week,team,pfr_id\n"+(b"2013,1,CLE,PLAYER\n"*400)
                src.write_bytes(raw)
                (root/(src.name+".receipt.json")).write_text(json.dumps({
                    "source_url":r.ROSTER_URL.format(year=year),
                    "sha256":"0"*64,"retrieved_at":"2026-10-09T00:00:00+00:00"
                }))
            with self.assertRaisesRegex(ValueError,"SHA256 verification failed"):
                r.fetch_roster_cache(root,False)

    def test_unsupported_zero_status_never_fabricated(self):
        report=r.reconcile([row(2019,2,"MISSING")],{})
        self.assertEqual(report["status_counts"]["NO_ROSTER_MATCH_OR_UNOBSERVED"],1)
        self.assertEqual(report["true_zero_playing_time_confirmed"],0)

if __name__=="__main__":
    unittest.main()

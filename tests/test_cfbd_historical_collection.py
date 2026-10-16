"""Historical CFBD collection and staging: synthetic fixtures, no live API calls."""
from __future__ import annotations
from datetime import datetime, timezone
import csv
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / filename)
    obj = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(obj)
    return obj


collector = module("collect_cfbd_history", "collect_cfbd_history.py")
# Works when Python unittest runner starts in repo root, as Github Actions does.
sys.path.insert(0, str(ROOT / "scripts"))
stager = module("stage_cfbd_history", "stage_cfbd_history.py")
opponent = module("opponent_adjusted_development", "opponent_adjusted_development.py")


def put(folder, name, path, params, obj):
    raw = json.dumps(obj, sort_keys=True, separators=(",", ":")).encode()
    receipt = collector.receipt(path, params, raw, obj, "2026-10-09T00:00:00Z")
    collector.store(folder, name, obj, raw, receipt)
    return receipt


def athlete(aid, name, att, yards):
    return {
        "id": aid,
        "name": name,
        "stat": str(att) + "/" + str(att) if att is not None else "0/0"
    }


def team(name, pid, person, opportunities, yards):
    return {"team": name, "categories": [
        {"name": "passing", "types": [
            {"name": "C/ATT", "athletes": [
                {"id": pid, "name": person, "stat": f"16/{opportunities}"}]},
            {"name": "YDS", "athletes": [
                {"id": pid, "name": person, "stat": str(yards)}]}
        ]},
        {"name": "receiving", "types": [
            {"name": "REC", "athletes": [
                {"id": "3000", "name": "Pass Catcher", "stat": "3"}]},
            {"name": "YDS", "athletes": [
                {"id": "3000", "name": "Pass Catcher", "stat": "55"}]}
        ]}
    ]}


def cache_fixture(folder):
    for year in (2023, 2024, 2025):
        schedule = []
        for week in (1, 2, 3, 4):
            gid = year * 100 + week
            schedule.append({
                "id": gid, "season": year, "seasonType": "regular",
                "week": week, "completed": True,
                "startDate": f"{year}-09-{week + 1:02}T12:00:00Z",
                "homeTeam": "Alpha", "awayTeam": "Beta"})
            entry = {"id": gid, "teams": [
                team("Alpha", "9001", "Fictional Quarterback", 30, 220 + week),
                team("Beta", "9002", "Other Quarterback", 31, 200 + week),
            ]}
            put(folder, f"players_{year}_regular_week_{week:02}",
                "/games/players", {"year": year, "week": week, "seasonType": "regular"}, [entry])
        put(folder, f"schedule_{year}_regular", "/games",
            {"year": year, "seasonType": "regular"}, schedule)


def crosswalk(path):
    path.write_text(
        "apex_rank,player_name,school,apex_position,decision,cfbd_athlete_id\n"
        "20,Fictional Quarterback,Alpha,QB,ACCEPTED_VERIFIED,9001\n"
        "21,Other Quarterback,Beta,QB,NOT_MATCHED,\n", encoding="utf8")


class HistoricalCollectorTests(unittest.TestCase):
    def test_plan_cost_is_deterministic_and_no_key_needed(self):
        p = subprocess.run([
            sys.executable, str(ROOT / "scripts" / "collect_cfbd_history.py"), "--plan"],
            capture_output=True, text=True, check=True)
        result = json.loads(p.stdout)
        self.assertEqual(result["year_schedule_requests"], 3)
        self.assertEqual(result["upper_bound_first_run"], 54)
        self.assertTrue(result["calls_are_not_made_in_plan_mode"])
        self.assertFalse(result["historical_vintage_verified"])

    def test_resumption_from_verified_cache_makes_zero_calls(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            cache_fixture(folder)
            safe = collector.collect([2023, 2024, 2025], folder, "unused", max_calls=1)
            self.assertEqual(safe["api_calls_this_run"], 0)
            self.assertEqual(safe["weekly_requests_or_cached"], 12)
            self.assertFalse(safe["historical_asof_eligible_for_backtest"])

    def test_corrupted_cache_aborts(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            cache_fixture(folder)
            path = folder / "players_2024_regular_week_01.json"
            path.write_bytes(path.read_bytes() + b"x")
            with self.assertRaisesRegex(ValueError, "SHA256"):
                collector.collect([2024], folder, "unused", max_calls=2)

    def test_public_repo_protection(self):
        with self.assertRaisesRegex(ValueError, "PUBLIC"):
            collector.output_path(ROOT / "research" / "private")
        with self.assertRaisesRegex(ValueError, "PUBLIC"):
            collector.output_path(ROOT / "private")

    def test_gamelog_extraction_and_vintage_block(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            cache_fixture(folder)
            identities = folder / "crosswalk.csv"
            crosswalk(identities)
            doc, report = stager.build_contract(folder, identities)
            self.assertEqual(report["board_size"], 2)
            self.assertEqual(report["accepted_2026_cfbd_identity_count"], 1)
            self.assertEqual(report["qb_player_games_staged"], 8)
            self.assertEqual(report["qb_previous_year_priors"], 2)
            self.assertEqual(report["qb_defensive_team_games_staged"], 16)
            self.assertFalse(report["historical_opponent_adjusted_rates_eligible"])
            self.assertTrue(all(r["position"] == "QB" for r in doc["player_games"]))
            self.assertEqual(doc["player_games"][0]["opportunities"], 30)
            self.assertEqual(doc["player_games"][0]["yards"], 221)
            self.assertTrue(all(r["available_at"].startswith("2026") for r in doc["player_games"]))
            safe, private = opponent.compute(doc)
            self.assertEqual(safe["player_seasons_research_ready"], 0,
                             "retrospective download must not be backdated to historical kickoff")
            self.assertEqual(safe["adjacent_season_research_trends"], 0)
            self.assertNotIn("Fictional Quarterback", json.dumps(report))

    def test_staging_private_export_requires_explicit_rights(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            cache_fixture(folder)
            identities = folder / "crosswalk.csv"
            crosswalk(identities)
            output = folder / "research.json"
            cp = subprocess.run([
                sys.executable, str(ROOT / "scripts" / "stage_cfbd_history.py"),
                "--cache", str(folder), "--crosswalk", str(identities),
                "--private-output", str(output)
            ], capture_output=True, text=True)
            self.assertEqual(cp.returncode, 2)
            self.assertIn("rights attestation", cp.stderr)
            self.assertFalse(output.exists())

    def test_invalid_id_and_player_stat_do_not_invent_values(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            cache_fixture(folder)
            identity_file = folder / "crosswalk.csv"
            crosswalk(identity_file)
            # Make a 2025 QB player name disagree with the accepted crosswalk;
            # the games must be flagged and omitted, not joined by player ID alone.
            name = "players_2025_regular_week_01"
            raw, _ = collector.load_receipt(folder, name)
            raw[0]["teams"][0]["categories"][0]["types"][0]["athletes"][0]["name"] = "Different Person"
            raw[0]["teams"][0]["categories"][0]["types"][1]["athletes"][0]["name"] = "Different Person"
            (folder / (name + ".json")).unlink()
            (folder / (name + ".receipt.json")).unlink()
            put(folder, name, "/games/players",
                {"year": 2025, "seasonType": "regular", "week": 1}, raw)
            data, report = stager.build_contract(folder, identity_file)
            self.assertGreater(report["reasons"]["board_identity_name_mismatch"], 0)
            self.assertEqual(report["qb_player_games_staged"], 7)


if __name__ == "__main__":
    unittest.main()

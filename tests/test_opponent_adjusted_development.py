"""Tests use synthetic team/player IDs; no licensed raw data or claims of accuracy."""
import copy
from datetime import datetime, timedelta, timezone
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "opponent_adjusted_development", ROOT / "scripts" / "opponent_adjusted_development.py")
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)


def iso(d):
    return d.isoformat().replace("+00:00", "Z")


def fixture():
    """Two seasons, four games apiece against defenses with THREE prior games each."""
    cut = "2026-01-01T00:00:00Z"
    doc = {"schema_version": 1, "feature_cutoff_at": cut,
           "priors": [], "defense_games": [], "player_games": []}
    for yr in (2024, 2025):
        july = datetime(yr, 7, 1, tzinfo=timezone.utc)
        doc["priors"].append({
            "season": yr, "source_year": yr - 1, "position": "QB",
            "mean_rate": 7.0, "pseudo_opportunities": 100,
            "available_at": iso(july), "rights": "internal-authorized",
            "source_id": "locked-prior-" + str(yr)})
        for idx in range(4):
            opp = "Defense-" + str(idx)
            for week in range(3):
                kickoff = datetime(yr, 8, 17, tzinfo=timezone.utc) + timedelta(days=7 * week)
                doc["defense_games"].append({
                    "season": yr, "position": "QB", "game_id": f"D-{yr}-{idx}-{week}",
                    "defense_team_id": opp, "offense_team_id": f"Other-{idx}-{week}",
                    "kickoff_at": iso(kickoff), "available_at": iso(kickoff + timedelta(hours=5)),
                    "opportunities_allowed": 35, "yards_allowed": 210 + idx * 10,
                    "rights": "internal-authorized", "source_id": f"fixture-defense-{yr}"})
            kickoff = datetime(yr, 9, 21, tzinfo=timezone.utc) + timedelta(days=7 * idx)
            doc["player_games"].append({
                "player_id": "Synthetic-P", "season": yr, "position": "QB",
                "game_id": f"P-{yr}-{idx}", "offense_team_id": "Synthetic-U",
                "defense_team_id": opp, "kickoff_at": iso(kickoff),
                "available_at": iso(kickoff + timedelta(hours=5)),
                "opportunities": 35, "yards": 250 + idx * 11 + (yr - 2024) * 9,
                "rights": "internal-authorized", "source_id": f"fixture-player-{yr}"})
    return doc


class TemporalContextTests(unittest.TestCase):
    def test_reproducible_private_two_year_rate(self):
        doc = fixture()
        safe, private = mod.compute(doc)
        self.assertEqual(safe["input_player_game_rows"], 8)
        self.assertEqual(safe["player_seasons_research_ready"], 2)
        self.assertEqual(safe["adjacent_season_research_trends"], 1)
        self.assertFalse(safe["nfl_predictive_uplift_validated"])
        self.assertNotIn("Synthetic-P", json.dumps(safe))
        self.assertEqual(len(private["trends"]), 1)
        self.assertTrue(private["trends"][0]["research_only"])
        self.assertEqual(private["seasons"][0]["coverage"], 1.0)
        self.assertGreater(private["seasons"][0]["opponent_prior_allowed_residual"], 0)

    def test_abstains_if_no_historical_defense_games(self):
        doc = fixture()
        doc["defense_games"] = []
        safe, private = mod.compute(doc)
        self.assertEqual(safe["player_seasons_research_ready"], 0)
        self.assertEqual(safe["adjacent_season_research_trends"], 0)
        self.assertEqual(safe["reasons"]["no_prior_defense_games"], 8)
        self.assertTrue(all(s["status"] == "ABSTAIN" for s in private["seasons"]))

    def test_no_future_defense_leak_or_current_game_injection(self):
        doc = fixture()
        baseline, _ = mod.compute(doc)
        # Append a post-player-game defense observation with extravagant yardage;
        # it must never influence any prior-game adjustment, even in the same year.
        for yr in (2024, 2025):
            kickoff = datetime(yr, 11, 3, tzinfo=timezone.utc)
            doc["defense_games"].append({
                "season": yr, "position": "QB", "game_id": f"Future-{yr}",
                "defense_team_id": "Defense-0", "offense_team_id": "Other",
                "kickoff_at": iso(kickoff), "available_at": iso(kickoff + timedelta(hours=4)),
                "opportunities_allowed": 40, "yards_allowed": 8000,
                "rights": "internal-authorized", "source_id": "fixture-future"})
        future, _ = mod.compute(doc)
        self.assertEqual(future["player_seasons_research_ready"],
                         baseline["player_seasons_research_ready"])
        a = mod.compute(fixture())[1]["seasons"]
        b = mod.compute(doc)[1]["seasons"]
        self.assertEqual([x["opponent_prior_allowed_residual"] for x in a],
                         [x["opponent_prior_allowed_residual"] for x in b])

    def test_late_ingestion_snapshots_cannot_leak(self):
        doc = fixture()
        for d in doc["defense_games"]:
            d["available_at"] = "2025-12-15T00:00:00Z"
            if d["season"] == 2025:
                # This satisfies input cutoff but is later than each target game.
                pass
        # First-season defense observations acquired in Dec 2025 cannot be
        # presumed available in 2024, despite retrospectively known performance.
        _, private = mod.compute(doc)
        self.assertTrue(all(s["status"] == "ABSTAIN" for s in private["seasons"]))

    def test_abstain_missing_prior_and_opportunity(self):
        doc = fixture()
        doc["priors"] = doc["priors"][1:]
        doc["player_games"][4]["opportunities"] = 0
        safe, _ = mod.compute(doc)
        self.assertEqual(safe["adjacent_season_research_trends"], 0)
        self.assertIn("missing_preseason_prior", safe["reasons"])
        self.assertIn("no_player_opportunities", safe["reasons"])

    def test_cutoff_and_rights_fail_closed(self):
        doc = fixture()
        doc["defense_games"][0]["rights"] = "unspecified"
        with self.assertRaisesRegex(ValueError, "rights"):
            mod.compute(doc)
        doc = fixture()
        doc["priors"][0]["source_year"] = 2024
        with self.assertRaisesRegex(ValueError, "PREVIOUS"):
            mod.compute(doc)
        doc = fixture()
        doc["player_games"][0]["available_at"] = "2026-02-01T00:00:00Z"
        with self.assertRaisesRegex(ValueError, "cutoff"):
            mod.compute(doc)
        doc = fixture()
        doc["nfl_outcomes"] = [1]
        with self.assertRaisesRegex(ValueError, "NFL outcomes"):
            mod.compute(doc)
        doc = fixture()
        doc["player_games"][0]["kickoff_at"] = "2024-09-21T00:00:00"
        with self.assertRaisesRegex(ValueError, "timezone"):
            mod.compute(doc)

    def test_identity_and_duplicate_games_rejected(self):
        doc = fixture()
        doc["player_games"].append(copy.deepcopy(doc["player_games"][0]))
        with self.assertRaisesRegex(ValueError, "duplicate player-game"):
            mod.compute(doc)
        doc = fixture()
        doc["defense_games"][0]["offense_team_id"] = doc["defense_games"][0]["defense_team_id"]
        with self.assertRaisesRegex(ValueError, "identical teams"):
            mod.compute(doc)

    def test_cli_does_not_output_individual_ids(self):
        doc = fixture()
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "private_input.json"
            p.write_text(json.dumps(doc), encoding="utf8")
            result = subprocess.run([
                sys.executable, str(ROOT / "scripts" / "opponent_adjusted_development.py"),
                "--input", str(p)
            ], capture_output=True, text=True, check=True)
            data = json.loads(result.stdout)
            self.assertEqual(data["player_seasons_research_ready"], 2)
            self.assertNotIn("Synthetic-P", result.stdout)
            self.assertNotIn("Defense-0", result.stdout)
            path = Path(tmp) / "private_output.json"
            subprocess.run([
                sys.executable, str(ROOT / "scripts" / "opponent_adjusted_development.py"),
                "--input", str(p), "--private-output", str(path)
            ], capture_output=True, text=True, check=True)
            self.assertIn("Synthetic-P", path.read_text())


if __name__ == "__main__":
    unittest.main()

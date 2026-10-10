"""Synthetic, aggregate-only 2026 Phase1 Elo join audit regression."""
import csv
import gzip
import importlib.util
from io import StringIO
from pathlib import Path
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("phase1_audit", ROOT / "scripts" / "audit_phase1_opponent_coverage.py")
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


def csv_bytes(fields, records, zipped=False):
    stream = StringIO()
    writer = csv.DictWriter(stream, fieldnames=fields)
    writer.writeheader()
    writer.writerows(records)
    data = stream.getvalue().encode("utf8")
    return gzip.compress(data) if zipped else data


class FrozenPackageAuditTest(unittest.TestCase):
    def test_deduplicates_metrics_and_keeps_athlete_private(self):
        with tempfile.TemporaryDirectory() as tmp:
            archive = Path(tmp) / "fictional_phase1.zip"
            with zipfile.ZipFile(archive, "w") as z:
                cross = [
                    {"apex_rank": "10", "cfbd_athlete_id": "fictional-id-123",
                     "decision": "ACCEPTED_VERIFIED"},
                    {"apex_rank": "11", "cfbd_athlete_id": "", "decision": "NOT_MATCHED"},
                ]
                meta = [
                    {"id": "G1", "season": "2026", "within_phase1_cutoff_wk1_5_completed": "True",
                     "homeTeam": "School A", "awayTeam": "School B",
                     "homePregameElo": "1500", "awayPregameElo": "1600"},
                    {"id": "G2", "season": "2026", "within_phase1_cutoff_wk1_5_completed": "True",
                     "homeTeam": "School A", "awayTeam": "School C",
                     "homePregameElo": "1500", "awayPregameElo": ""},
                    {"id": "G3", "season": "2026", "within_phase1_cutoff_wk1_5_completed": "False",
                     "homeTeam": "School A", "awayTeam": "School D",
                     "homePregameElo": "1500", "awayPregameElo": "1700"},
                ]
                games = [
                    {"athleteId": "fictional-id-123", "gameId": "G1",
                     "team": "School A", "category": "passing", "statType": "YDS"},
                    {"athleteId": "fictional-id-123", "gameId": "G1",
                     "team": "School A", "category": "passing", "statType": "ATT"},
                    {"athleteId": "fictional-id-123", "gameId": "G2",
                     "team": "School A", "category": "passing", "statType": "YDS"},
                    {"athleteId": "fictional-id-123", "gameId": "G3",
                     "team": "School A", "category": "passing", "statType": "YDS"},
                ]
                z.writestr("fake/02_IDENTITY/apex_201_player_crosswalk.csv",
                           csv_bytes(["apex_rank", "cfbd_athlete_id", "decision"], cross))
                z.writestr("fake/01_CFBD_2026/cfbd_2026_game_metadata.csv.gz",
                           csv_bytes(list(meta[0]), meta, True))
                z.writestr("fake/01_CFBD_2026/cfbd_2026_games_part01.csv.gz",
                           csv_bytes(list(games[0]), games, True))
            report = audit.audit_zip(archive)
            self.assertEqual(report["board_players"], 2)
            self.assertEqual(report["matched_player_games"], 2)
            self.assertEqual(report["with_opponent_pregame_team_elo"], 1)
            self.assertEqual(report["without_opponent_pregame_team_elo"], 1)
            self.assertEqual(report["coverage_pct"], 50.0)
            self.assertFalse(report["nfl_prediction_accuracy_validated"])
            self.assertNotIn("fictional-id-123", str(report))
            self.assertNotIn("School A", str(report))


if __name__ == "__main__":
    unittest.main()

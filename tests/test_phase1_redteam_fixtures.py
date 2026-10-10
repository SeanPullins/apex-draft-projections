"""Claude red-team breaking fixtures for Phase 1 labels (no internet).

Each test encodes a defect found on 2026-10-10 against the real nflverse
sources. They are EXPECTED TO FAIL on main until the defect is fixed; do not
weaken an assertion to make it pass.
"""
from __future__ import annotations
import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("phase1_nfl", ROOT / "scripts" / "phase1_nfl_snap_baseline.py")
m = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(m)


def draft(year, pick, pfr_id, pos="QB"):
    return {"year": year, "pick": pick, "position_group": pos, "pfr_id": pfr_id,
            "position": pos, "source_is_drafted": True}


class Phase1RedTeamFixtures(unittest.TestCase):
    def test_partial_season_must_not_pass_schedule_gate(self):
        """A 16-game season missing 76 games (one team-quarter of the league)
        currently passes the >=170 gate and silently undercounts snaps."""
        seasons = {str(y): {"regular_games": 272 if y >= 2021 else 256} for y in range(2013, 2026)}
        seasons["2014"] = {"regular_games": 180}
        with self.assertRaises(ValueError):
            m.build_labels([draft(2013, 1, "A")], {}, seasons)

    def test_generic_db_is_not_silently_a_cornerback(self):
        """Real data: of 163 drafted 'DB' participants 2013-22, 69 (42%) logged
        NFL snaps primarily at SS/FS/S. Mapping DB->CB contaminates CB and S labels."""
        self.assertNotEqual(m.position_group("DB"), "CB")

    def test_kicker_punter_longsnapper_are_out_of_scope_not_pending(self):
        """All 45 POSITION_UNSUPPORTED rows are K/P/LS. They should carry an
        explicit out-of-scope status so they never read as an open data gap."""
        seasons = {str(y): {"regular_games": 256} for y in range(2013, 2026)}
        labels, _ = m.build_labels([{**draft(2013, 200, "K1"), "position_group": None, "position": "K"}], {}, seasons)
        self.assertEqual(labels[0]["status"], "OUT_OF_SCOPE_SPECIALIST")


if __name__ == "__main__":
    unittest.main()

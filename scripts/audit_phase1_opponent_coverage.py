#!/usr/bin/env python3
"""Aggregate-only audit of an OFFLINE APEX Phase 1 ZIP.

Reads the user's existing private CFBD research receipt bundle, not GitHub
assets. Does not expose individual athletes, scores, teams, opponents or IDs.
Does NOT calculate a player efficiency or defensive opponent adjustment.
"""
import argparse
import csv
import gzip
import io
import json
from collections import defaultdict
from pathlib import Path
import zipfile


FILES = (
    "apex_201_player_crosswalk.csv",
    "cfbd_2026_game_metadata.csv.gz",
    "cfbd_2026_games_part01.csv.gz",
)


def audit_zip(path):
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        def load(base):
            matches = [n for n in names if n.endswith("/" + base)]
            if len(matches) != 1:
                raise ValueError("Expected exactly one input named " + base)
            content = archive.read(matches[0])
            if base.endswith(".gz"):
                content = gzip.decompress(content)
            return list(csv.DictReader(io.StringIO(content.decode("utf-8"))))
        crosswalk, metadata, rows = [load(base) for base in FILES]
        require_season = 2026
        identity = {}
        for row in crosswalk:
            if row["cfbd_athlete_id"] and row["decision"].startswith("ACCEPTED"):
                if row["cfbd_athlete_id"] in identity:
                    raise ValueError("Accepted athlete identifier duplicated")
                identity[row["cfbd_athlete_id"]] = row
        by_id = {r["id"]: r for r in metadata}
        keys = {(r["athleteId"], r["gameId"], r["team"]) for r in rows
                if r["athleteId"] in identity}
        coverage = defaultdict(lambda: {"seen": set(), "with_elo": set(), "missing": set(), "mismatch": set()})
        for athlete, game, team in keys:
            rec = identity[athlete]
            game_row = by_id.get(game)
            if not game_row or game_row["season"] != str(require_season) or \
                    game_row["within_phase1_cutoff_wk1_5_completed"] != "True":
                continue
            if team == game_row["homeTeam"]:
                elo = game_row["awayPregameElo"]
            elif team == game_row["awayTeam"]:
                elo = game_row["homePregameElo"]
            else:
                coverage[rec["apex_rank"]]["mismatch"].add(game)
                continue
            c = coverage[rec["apex_rank"]]
            c["seen"].add(game)
            try:
                n = float(elo) if elo.strip() else None
            except ValueError:
                n = None
            (c["with_elo"] if n is not None else c["missing"]).add(game)
        total = sum(len(c["seen"]) for c in coverage.values())
        with_elo = sum(len(c["with_elo"]) for c in coverage.values())
        safe = {
            "status": "COVERAGE_AUDIT_ONLY_NO_OPPONENT_ADJUSTMENT",
            "year": 2026,
            "window": "Weeks 1-5 (package frozen October 9, 2026)",
            "board_players": len(crosswalk),
            "accepted_unique_athlete_ids": len(identity),
            "players_with_recorded_game": sum(bool(c["seen"]) for c in coverage.values()),
            "matched_player_games": total,
            "with_opponent_pregame_team_elo": with_elo,
            "without_opponent_pregame_team_elo": sum(len(c["missing"]) for c in coverage.values()),
            "team_game_identity_mismatches": sum(len(c["mismatch"]) for c in coverage.values()),
            "players_at_least_2_elo_games": sum(len(c["with_elo"]) >= 2 for c in coverage.values()),
            "players_at_least_4_elo_games": sum(len(c["with_elo"]) >= 4 for c in coverage.values()),
            "coverage_pct": round(100 * with_elo / total, 1) if total else 0,
            "historical_2024_2025_player_games_present": False,
            "defense_specific_opponent_quality_validated": False,
            "nfl_prediction_accuracy_validated": False,
        }
        return safe


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--phase1-zip", required=True, help="Private local ZIP; never check in to GitHub")
    args = p.parse_args()
    print(json.dumps(audit_zip(Path(args.phase1_zip)), indent=2, sort_keys=True))


if __name__ == "__main__":
    main()

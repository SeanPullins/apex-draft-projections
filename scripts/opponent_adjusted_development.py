#!/usr/bin/env python3
"""APEX private research: chronological opponent-allowed production context.

No network, no licensed input bundled, no public player output by default.
These are opportunity-weighted descriptive residuals, NOT NFL probabilities.
Input JSON contract and time/rights gates: docs/OPPONENT_ADJUSTMENT_RESEARCH.md.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from datetime import datetime
import json
import math
from pathlib import Path
import sys

POSITIONS = {"QB", "RB", "WR", "TE"}
MIN_DEFENSE_GAMES = 2
MIN_DEFENSE_OPPORTUNITIES = {"QB": 30, "RB": 12, "WR": 8, "TE": 8}
MIN_PLAYER_OPPORTUNITIES = {"QB": 80, "RB": 30, "WR": 20, "TE": 20}
MIN_PLAYER_GAMES = 3
MIN_COVERAGE = 0.70
RIGHTS = {"internal-authorized", "public-stat-summary"}


def require(condition, reason):
    if not condition:
        raise ValueError(reason)


def time(value, field):
    require(isinstance(value, str) and bool(value), field + " must be an ISO timestamp")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(field + " must be a valid ISO timestamp") from exc
    require(parsed.tzinfo is not None and parsed.utcoffset() is not None,
            field + " must include timezone")
    return parsed


def integer(value, field, minimum=0):
    require(type(value) is int and value >= minimum,
            field + " must be an integer >= " + str(minimum))
    return value


def number(value, field, *, positive=False):
    require(type(value) in (float, int) and math.isfinite(value),
            field + " must be finite")
    if positive:
        require(value > 0, field + " must be positive")
    return value


def text_id(value, field):
    require(isinstance(value, str) and bool(value.strip()), field + " is required")
    return value


def check_source(row, prefix):
    require(row.get("rights") in RIGHTS, prefix + ": rights must be explicit and authorized")
    text_id(row.get("source_id"), prefix + ".source_id")


def read_contract(doc):
    require(type(doc) is dict and doc.get("schema_version") == 1,
            "input must be a schema_version 1 object")
    cutoff = time(doc.get("feature_cutoff_at"), "feature_cutoff_at")
    for key in ("player_games", "defense_games", "priors"):
        require(type(doc.get(key)) is list, key + " must be an array")
    # Never accept already-joined / future-labelled outcomes as features.
    require("nfl_outcomes" not in doc and "draft_slot" not in doc,
            "NFL outcomes and draft slot cannot enter the feature assembly")
    players, defenses, priors = [], defaultdict(list), {}
    seen_player, seen_defense = set(), set()
    for i, raw in enumerate(doc["priors"]):
        field = "priors[" + str(i) + "]"
        pos = raw.get("position")
        require(pos in POSITIONS, field + ": unsupported position")
        season = integer(raw.get("season"), field + ".season", 2000)
        require(raw.get("source_year") == season - 1,
                field + ": pooled prior must use PREVIOUS season only")
        observed = time(raw.get("available_at"), field + ".available_at")
        rate = number(raw.get("mean_rate"), field + ".mean_rate", positive=True)
        pseudon = number(raw.get("pseudo_opportunities"), field + ".pseudo_opportunities", positive=True)
        check_source(raw, field)
        require(observed <= cutoff, field + ": prior appears after feature cutoff")
        k = (season, pos)
        require(k not in priors, "ambiguous season/position prior")
        priors[k] = (observed, rate, pseudon)
    for i, raw in enumerate(doc["defense_games"]):
        field = "defense_games[" + str(i) + "]"
        pos = raw.get("position")
        require(pos in POSITIONS, field + ": unsupported position")
        yr = integer(raw.get("season"), field + ".season", 2000)
        gid = text_id(raw.get("game_id"), field + ".game_id")
        team = text_id(raw.get("defense_team_id"), field + ".defense_team_id")
        opponent = text_id(raw.get("offense_team_id"), field + ".offense_team_id")
        require(team != opponent, field + ": identical teams")
        kickoff = time(raw.get("kickoff_at"), field + ".kickoff_at")
        available = time(raw.get("available_at"), field + ".available_at")
        require(kickoff.year == yr, field + ": game year inconsistent")
        require(kickoff <= available <= cutoff, field + ": impossible availability/cutoff")
        opps = integer(raw.get("opportunities_allowed"), field + ".opportunities_allowed")
        yards = number(raw.get("yards_allowed"), field + ".yards_allowed")
        check_source(raw, field)
        key = (yr, pos, gid, team)
        require(key not in seen_defense, field + ": duplicate defensive game/group")
        seen_defense.add(key)
        defenses[(yr, pos, team)].append({
            "game_id": gid, "offense": opponent, "kickoff": kickoff, "available": available,
            "n": opps, "yards": yards,
        })
    for i, raw in enumerate(doc["player_games"]):
        field = "player_games[" + str(i) + "]"
        pos = raw.get("position")
        require(pos in POSITIONS, field + ": unsupported position")
        yr = integer(raw.get("season"), field + ".season", 2000)
        gid = text_id(raw.get("game_id"), field + ".game_id")
        pid = text_id(raw.get("player_id"), field + ".player_id")
        team = text_id(raw.get("offense_team_id"), field + ".offense_team_id")
        opponent = text_id(raw.get("defense_team_id"), field + ".defense_team_id")
        require(team != opponent, field + ": identical teams")
        kickoff = time(raw.get("kickoff_at"), field + ".kickoff_at")
        available = time(raw.get("available_at"), field + ".available_at")
        require(kickoff.year == yr, field + ": game year inconsistent")
        require(kickoff <= available <= cutoff, field + ": impossible availability/cutoff")
        n = integer(raw.get("opportunities"), field + ".opportunities")
        yards = number(raw.get("yards"), field + ".yards")
        check_source(raw, field)
        key = (yr, pos, gid, pid)
        require(key not in seen_player, field + ": duplicate player-game")
        seen_player.add(key)
        players.append({"year": yr, "position": pos, "game_id": gid, "player_id": pid,
                        "team": team, "opponent": opponent,
                        "kickoff": kickoff, "n": n, "yards": yards})
    return players, defenses, priors


def compute(doc):
    players, defenses, priors = read_contract(doc)
    reasons = Counter()
    game_groups = defaultdict(list)
    for g in players:
        game_groups[(g["player_id"], g["position"], g["year"])].append(g)
    private_seasons = []
    for (pid, pos, year), games in sorted(game_groups.items()):
        eligible, total = [], sum(g["n"] for g in games)
        for g in sorted(games, key=lambda r: (r["kickoff"], r["game_id"])):
            if g["n"] <= 0:
                reasons["no_player_opportunities"] += 1
                continue
            prior = priors.get((year, pos))
            if not prior or prior[0] >= g["kickoff"]:
                reasons["missing_preseason_prior"] += 1
                continue
            prior_time, prior_rate, strength = prior
            # Prior defense entries must have been publicly available BEFORE kickoff.
            # Never use current-game rows, future games or later revision snapshots.
            history = [d for d in defenses.get((year, pos, g["opponent"]), [])
                       if d["kickoff"] < g["kickoff"] and d["available"] < g["kickoff"]
                       and d["game_id"] != g["game_id"]]
            if not history:
                reasons["no_prior_defense_games"] += 1
                continue
            hist_n = sum(d["n"] for d in history)
            if len(history) < MIN_DEFENSE_GAMES or hist_n < MIN_DEFENSE_OPPORTUNITIES[pos]:
                reasons["insufficient_prior_defense_games"] += 1
                continue
            expected = (prior_rate * strength + sum(d["yards"] for d in history)) / (strength + hist_n)
            eligible.append((g, expected, len(history)))
        observed_n = sum(g["n"] for g, _, _ in eligible)
        coverage = observed_n / total if total else 0
        enough = len(eligible) >= MIN_PLAYER_GAMES and \
                 observed_n >= MIN_PLAYER_OPPORTUNITIES[pos] and coverage >= MIN_COVERAGE
        if not enough:
            reasons["season_below_quality_gate"] += 1
        private_seasons.append({
            "player_id": pid, "position": pos, "season": year,
            "total_opportunities": total,
            "eligible_games": len(eligible),
            "opponent_history_games_min": min((count for _, _, count in eligible), default=0),
            "eligible_opportunities": observed_n,
            "coverage": round(coverage, 6),
            "status": "RESEARCH_READY" if enough else "ABSTAIN",
            "observed_yards_per_opportunity": round(sum(g["yards"] for g, _, _ in eligible) / observed_n, 6) if enough else None,
            "pregame_expected_yards_per_opportunity": round(sum(g["n"] * e for g, e, _ in eligible) / observed_n, 6) if enough else None,
            "opponent_prior_allowed_residual": round(sum(g["yards"] - g["n"] * e for g, e, _ in eligible) / observed_n, 6) if enough else None,
        })
    by_id = defaultdict(dict)
    for s in private_seasons:
        by_id[(s["player_id"], s["position"])][s["season"]] = s
    private_trends = []
    for (pid, pos), seasons in by_id.items():
        for year in sorted(seasons):
            earlier = seasons.get(year - 1)
            later = seasons[year]
            if earlier and earlier["status"] == "RESEARCH_READY" and later["status"] == "RESEARCH_READY":
                private_trends.append({
                    "player_id": pid, "position": pos, "from_season": year - 1, "to_season": year,
                    "delta_prior_allowed_residual": round(
                        later["opponent_prior_allowed_residual"] - earlier["opponent_prior_allowed_residual"], 6),
                    "research_only": True,
                })
    safe = {
        "schema_version": 1,
        "status": "RESEARCH_ONLY_NO_MODEL_PROMOTION",
        "method": "Prior-game opponent allowed; position-matched; season-prior shrinkage; opportunity-weighted residual",
        "input_player_game_rows": len(players),
        "input_defense_game_rows": sum(len(v) for v in defenses.values()),
        "input_preseason_priors": len(priors),
        "player_seasons_total": len(private_seasons),
        "player_seasons_research_ready": sum(s["status"] == "RESEARCH_READY" for s in private_seasons),
        "player_seasons_abstained": sum(s["status"] != "RESEARCH_READY" for s in private_seasons),
        "adjacent_season_research_trends": len(private_trends),
        "reasons": dict(sorted(reasons.items())),
        "nfl_predictive_uplift_validated": False,
        "public_player_level_output": False,
    }
    return safe, {"schema_version": 1, "status": "PRIVATE_RESEARCH_NOT_VALIDATED",
                  "seasons": private_seasons, "trends": private_trends}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="Private, locally held JSON; never checked into the public site")
    parser.add_argument("--private-output", help="Optional player-level results outside public repository only")
    args = parser.parse_args(argv)
    raw = json.loads(Path(args.input).read_text(encoding="utf-8"))
    safe, private = compute(raw)
    if args.private_output:
        out = Path(args.private_output).resolve()
        repo = Path(__file__).resolve().parents[1]
        require(repo not in out.parents and out != repo,
                "private output inside the public repository is prohibited")
        require(out != Path(args.input).resolve(),
                "private output must not overwrite the original input")
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(private, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(safe, sort_keys=True, indent=2))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, json.JSONDecodeError) as exc:
        print("Research gate failed: " + str(exc), file=sys.stderr)
        sys.exit(2)

#!/usr/bin/env python3
"""Private, identity-checked historical CFBD boxscore normalizer.

Consumes only checksummed, privately cached CFBD games/players and schedules.
Produces aggregate QC by default. Optional private research contract is
retrospective, with TRUE retrieval timestamps (no fake historical availability).
QB game vs team pass-defense is supported. RB/WR/TE positions have NO defensible
position-specific defensive baseline from this source alone.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import csv
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import re
import sys
import zipfile

try:
    from collect_cfbd_history import load_receipt, output_path
except ModuleNotFoundError:
    from scripts.collect_cfbd_history import load_receipt, output_path

REPO = Path(__file__).resolve().parents[1]
POSITIONS = {"QB": ("passing", "C/ATT"), "RB": ("rushing", "CAR"),
             "WR": ("receiving", "REC"), "TE": ("receiving", "REC")}
REQUIRED_YEARS = (2023, 2024, 2025)


def require(ok, text):
    if not ok:
        raise ValueError(text)


def norm(name):
    return re.sub(r"[^a-z0-9]", "", str(name).lower())


def is_athlete(athlete_id):
    return str(athlete_id).strip().isdigit() and int(athlete_id) > 0


def total(value):
    text = str(value).strip()
    require(re.fullmatch(r"-?\d+", text) is not None, "bad numeric athlete stat")
    return int(text)


def extract(teams):
    """per-game team dictionaries: athlete id -> category metric; duplicate conflicts fail."""
    extracted = {}
    for team in teams:
        name = team.get("team")
        require(isinstance(name, str) and name, "game team name missing")
        require(name not in extracted, "duplicate team in game")
        players = defaultdict(lambda: defaultdict(dict))
        for cat in team.get("categories", []):
            category = cat.get("name")
            if category not in ("passing", "rushing", "receiving"):
                continue
            for typ in cat.get("types", []):
                stat_type = typ.get("name")
                if stat_type not in ("C/ATT", "CAR", "REC", "YDS"):
                    continue
                for raw in typ.get("athletes", []):
                    aid = str(raw.get("id", ""))
                    if not is_athlete(aid):
                        continue
                    key = (category, stat_type)
                    entry = players[aid][category]
                    value = raw.get("stat")
                    if stat_type == "C/ATT":
                        parts = str(value).strip().split("/")
                        require(len(parts) == 2, "bad QB completions/attempts")
                        metric = total(parts[1])
                    else:
                        metric = total(value)
                    require(stat_type not in entry or entry[stat_type] == metric,
                            "conflicting duplicate athlete stat")
                    entry[stat_type] = metric
                    players[aid]["identity"]["name"] = raw.get("name", "")
        extracted[name] = dict(players)
    return extracted


def safe_identity(csv_or_zip):
    """Only accepts human-reviewed, unambiguous 2026 player identity matches."""
    path = Path(csv_or_zip)
    if path.suffix == ".zip":
        with zipfile.ZipFile(path) as z:
            paths = [n for n in z.namelist() if n.endswith("/apex_201_player_crosswalk.csv")]
            require(len(paths) == 1, "private source ZIP has no unique crosswalk")
            content = z.read(paths[0]).decode("utf8").splitlines()
            rows = list(csv.DictReader(content))
    else:
        rows = list(csv.DictReader(path.read_text(encoding="utf8").splitlines()))
    require(len(rows) > 0, "missing crosswalk")
    out, seen_rank = {}, set()
    for r in rows:
        rank = str(r.get("apex_rank", "")).strip()
        require(rank.isdigit() and rank not in seen_rank, "invalid/duplicate APEX rank")
        seen_rank.add(rank)
        athlete_id = str(r.get("cfbd_athlete_id", "")).strip()
        decision = str(r.get("decision", ""))
        if not (decision.startswith("ACCEPTED") and is_athlete(athlete_id)):
            continue
        require(athlete_id not in out, "duplicate confirmed CFBD identity")
        out[athlete_id] = {"rank": int(rank),
                           "name": str(r["player_name"]),
                           "position": str(r["apex_position"])}
    return out, len(rows)


def timestamp(raw):
    d = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    require(d.utcoffset() is not None, "input dates require offset")
    return d


def parse_cached(cache, identity):
    games_by_year, metrics_by_year = {}, defaultdict(list)
    reasons = Counter()
    all_gameids = set()
    for year in REQUIRED_YEARS:
        got = load_receipt(cache, f"schedule_{year}_regular")
        require(got is not None, f"missing cached schedule for {year}")
        schedule, receipt = got
        games = {}
        for g in schedule:
            if g.get("season") == year and g.get("seasonType") == "regular" and \
                    g.get("completed") is True and g.get("startDate"):
                games[str(g["id"])] = g
        require(games, f"no valid regular season game schedule for {year}")
        games_by_year[year] = games
        # Historical API responses are retrospective. Preserve actual acquisition.
        receipts = [timestamp(receipt["retrieved_at"])]
        weeks = sorted({g["week"] for g in games.values() if type(g.get("week")) is int
                        and 1 <= g["week"] <= 17})
        for week in weeks:
            got = load_receipt(cache, f"players_{year}_regular_week_{week:02}")
            require(got is not None, f"missing player stats {year} week {week}")
            payload, receipt = got
            receipts.append(timestamp(receipt["retrieved_at"]))
            for game in payload:
                gid = str(game.get("id"))
                if gid not in games:
                    reasons["game_not_in_completed_schedule"] += 1
                    continue
                require(gid not in all_gameids, "duplicate game across week responses")
                all_gameids.add(gid)
                meta = games[gid]
                tms = extract(game.get("teams", []))
                home, away = meta["homeTeam"], meta["awayTeam"]
                if home not in tms or away not in tms:
                    reasons["team_stats_missing"] += 1
                    continue
                kickoff = timestamp(meta["startDate"])
                require(kickoff.year in (year, year + 1), "invalid season/game date")
                for tname in (home, away):
                    opponent = away if tname == home else home
                    all_players = tms[tname]
                    # QB passing game aggregates across ALL passers on a team,
                    # unlike RB/WR/TE unit-specific totals for which position
                    # denominators are not authenticated here.
                    passing = []
                    for aid, metrics in all_players.items():
                        p = metrics.get("passing", {})
                        if "C/ATT" in p and "YDS" in p:
                            passing.append((aid, p["C/ATT"], p["YDS"]))
                        elif ("C/ATT" in p) != ("YDS" in p):
                            reasons["incomplete_team_passing_pair"] += 1
                    if passing:
                        opps = sum(q[1] for q in passing)
                        yards = sum(q[2] for q in passing)
                        if opps > 0:
                            metrics_by_year[year].append({
                                "kind": "team_qb_passing", "year": year, "gid": gid,
                                "offense": tname, "defense": opponent,
                                "kickoff": kickoff, "n": opps, "yards": yards,
                                "retrieved_at": max(receipts)})
                    for aid, athlete in all_players.items():
                        record = identity.get(aid)
                        if record is None or record["position"] not in POSITIONS:
                            continue
                        if norm(athlete["identity"].get("name")) != norm(record["name"]):
                            reasons["board_identity_name_mismatch"] += 1
                            continue
                        category, denominator = POSITIONS[record["position"]]
                        stats = athlete.get(category, {})
                        if denominator not in stats or "YDS" not in stats:
                            reasons["player_rate_denominator_missing"] += 1
                            continue
                        n, yards = stats[denominator], stats["YDS"]
                        if n <= 0:
                            reasons["player_zero_opportunities"] += 1
                            continue
                        metrics_by_year[year].append({
                            "kind": "board_player", "year": year, "gid": gid,
                            "player_id": aid, "position": record["position"],
                            "offense": tname, "defense": opponent,
                            "kickoff": kickoff, "n": n, "yards": yards,
                            "retrieved_at": timestamp(receipt["retrieved_at"])})
        reasons["year_" + str(year) + "_schedule_games"] = len(games)
    return metrics_by_year, reasons


def build_contract(cache, crosswalk):
    identities, board = safe_identity(crosswalk)
    stats, reasons = parse_cached(cache, identities)
    player_games, defense_games, priors = [], [], []
    for year in (2024, 2025):
        for r in stats[year]:
            if r["kind"] == "board_player" and r["position"] == "QB":
                player_games.append({
                    "season": year, "position": "QB", "player_id": r["player_id"],
                    "game_id": r["gid"], "offense_team_id": r["offense"],
                    "defense_team_id": r["defense"], "kickoff_at": r["kickoff"].isoformat(),
                    "available_at": r["retrieved_at"].isoformat(), "opportunities": r["n"],
                    "yards": r["yards"], "source_id": "CFBD-private-QB-game-" + str(year),
                    "rights": "internal-authorized",
                })
            if r["kind"] == "team_qb_passing":
                defense_games.append({
                    "season": year, "position": "QB", "game_id": r["gid"],
                    "offense_team_id": r["offense"], "defense_team_id": r["defense"],
                    "kickoff_at": r["kickoff"].isoformat(),
                    "available_at": r["retrieved_at"].isoformat(),
                    "opportunities_allowed": r["n"], "yards_allowed": r["yards"],
                    "source_id": "CFBD-private-QB-team-" + str(year),
                    "rights": "internal-authorized",
                })
        old = [s for s in stats[year-1] if s["kind"] == "team_qb_passing"]
        n = sum(s["n"] for s in old)
        require(n > 0, f"no denominator for prior year {year-1}")
        # Available-at is genuinely the cache retrieval timestamp, not a
        # retroactively INVENTED timestamp for 2023/2024.
        priors.append({
            "season": year, "source_year": year-1, "position": "QB",
            "mean_rate": sum(s["yards"] for s in old)/n,
            "pseudo_opportunities": 100,
            "available_at": max(s["retrieved_at"] for s in old).isoformat(),
            "source_id": "CFBD-private-QB-prior-" + str(year-1),
            "rights": "internal-authorized",
        })
    all_private = {
        "schema_version": 1,
        "feature_cutoff_at": datetime.now(timezone.utc).isoformat(),
        "player_games": player_games,
        "defense_games": defense_games,
        "priors": priors,
    }
    seasons = defaultdict(set)
    for y in (2024, 2025):
        for r in stats[y]:
            if r["kind"] == "board_player":
                seasons[r["position"]].add((r["player_id"], y))
    safe = {
        "status": "STAGED_HISTORICAL_RECONSTRUCTION_ONLY",
        "accepted_2026_cfbd_identity_count": len(identities),
        "board_size": board,
        "completed_game_stats_observed_by_season": {
            str(y): len({r["gid"] for r in stats[y] if r["kind"] == "team_qb_passing"})
            for y in REQUIRED_YEARS},
        "board_player_seasons_with_rate_data": {
            pos: sum(1 for _, yr in entries if yr in (2024, 2025))
            for pos, entries in sorted(seasons.items())},
        "qb_player_games_staged": len(player_games),
        "qb_defensive_team_games_staged": len(defense_games),
        "qb_previous_year_priors": len(priors),
        "reasons": dict(sorted(reasons.items())),
        "asof_event_availability_proven": False,
        "historical_opponent_adjusted_rates_eligible": False,
        "historical_nfl_success_backtest_ready": False,
        "player_level_public_values": False,
    }
    return all_private, safe


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--cache", required=True, help="Private CFBD collector output folder")
    p.add_argument("--crosswalk", required=True, help="Private Phase1 ZIP or CSV with approved athlete IDs")
    p.add_argument("--private-output", help="Optional PRIVATE output JSON path, outside GitHub repo")
    p.add_argument("--rights-attested", action="store_true",
                   help="Operator confirms these individual CFBD records may be used internally")
    args = p.parse_args(argv)
    data, qc = build_contract(Path(args.cache), Path(args.crosswalk))
    if args.private_output:
        require(args.rights_attested, "private export requires operator rights attestation")
        out = output_path(args.private_output)
        out.parent.mkdir(parents=True, exist_ok=True)
        require(not out.exists(), "refuse to overwrite an existing private file")
        out.write_text(json.dumps(data, indent=2) + "\n", encoding="utf8")
    print(json.dumps(qc, indent=2, sort_keys=True))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError, TypeError, json.JSONDecodeError) as ex:
        print("Historical staging withheld: " + str(ex), file=sys.stderr)
        sys.exit(2)

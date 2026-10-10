#!/usr/bin/env python3
"""Private CFBD historical collector; resumable, checksum-audited, no keys in output.

Only game schedule metadata and per-week player box scores are fetched.
No API calls are made in --plan mode.
The response JSON is never committed to the public APEX repository.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ORIGIN = "https://api.collegefootballdata.com"
ALLOWED_YEARS = (2023, 2024, 2025)
VERSION = 1
REPO = Path(__file__).resolve().parents[1]


def require(ok, msg):
    if not ok:
        raise ValueError(msg)


def output_path(path):
    out = Path(path).expanduser().resolve()
    require(out != REPO and REPO not in out.parents,
            "private data output must be outside the PUBLIC GitHub repository")
    return out


def fetch(path, params, token):
    require(path in ("/games", "/games/players"), "unsupported endpoint")
    query = urlencode(sorted(params.items()))
    url = ORIGIN + path + "?" + query
    request = Request(url, headers={"Authorization": "Bearer " + token,
                                    "Accept": "application/json",
                                    "User-Agent": "APEX-internal-historical-research/1"})
    try:
        with urlopen(request, timeout=35) as response:
            raw = response.read()
            if response.status != 200:
                raise RuntimeError("CFBD HTTP " + str(response.status))
    except HTTPError as err:
        # Response bodies may include rate-limit details. Never print secrets/URL parameters.
        raise RuntimeError("CFBD HTTP " + str(err.code) +
                           "; no source data cached; check token/quota") from None
    except URLError as err:
        raise RuntimeError("CFBD request failed (network unavailable)") from None
    try:
        obj = json.loads(raw)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError("CFBD returned non-JSON response") from exc
    require(type(obj) is list, "CFBD endpoint response must be a JSON array")
    return obj, raw


def receipt(path, params, raw, obj, collected_at):
    return {
        "path": path, "params": dict(params),
        "sha256": hashlib.sha256(raw).hexdigest(),
        "bytes": len(raw), "items": len(obj), "retrieved_at": collected_at,
        "as_of_history_verified": False,
        "historical_availability_basis": "NOT_VERIFIED_RETROSPECTIVE_DOWNLOAD",
        "rights_review": "PENDING_REVIEW",
    }


def load_receipt(folder, name):
    raw_path = folder / (name + ".json")
    meta_path = folder / (name + ".receipt.json")
    if not raw_path.is_file() and not meta_path.is_file():
        return None
    require(raw_path.is_file() and meta_path.is_file(),
            "incomplete cache; do not silently redownload " + name)
    raw = raw_path.read_bytes()
    info = json.loads(meta_path.read_text(encoding="utf8"))
    require(hashlib.sha256(raw).hexdigest() == info.get("sha256"),
            "cached source SHA256 does not match receipt: " + name)
    require(info.get("as_of_history_verified") is False,
            "unexpected cache vintage tag")
    obj = json.loads(raw)
    require(type(obj) is list and info.get("items") == len(obj),
            "cached record count differs: " + name)
    return obj, info


def store(folder, name, obj, raw, info):
    folder.mkdir(parents=True, exist_ok=True)
    f = folder / (name + ".json")
    m = folder / (name + ".receipt.json")
    require(not f.exists() and not m.exists(),
            "will not overwrite cached source; remove intentionally to re-fetch")
    f.write_bytes(raw)
    m.write_text(json.dumps(info, indent=2, sort_keys=True) + "\n", encoding="utf8")


def plans(years):
    return [{"year": year, "seasonType": "regular"} for year in years]


def week_plan(schedule):
    weeks = set()
    for item in schedule:
        if item.get("seasonType") == "regular" and item.get("completed") is True:
            w = item.get("week")
            if type(w) is int and 1 <= w <= 17:
                weeks.add(w)
    return sorted(weeks)


def collect(years, folder, key, max_calls):
    log = []
    actual_requests = 0
    results = {}
    for params in plans(years):
        year = params["year"]
        name = f"schedule_{year}_regular"
        cached = load_receipt(folder, name)
        if cached:
            schedule, info = cached
            origin = "cache"
        else:
            require(actual_requests < max_calls, "max API call cap reached; rerun with cache")
            schedule, raw = fetch("/games", params, key)
            actual_requests += 1
            info = receipt("/games", params, raw, schedule,
                           datetime.now(timezone.utc).isoformat())
            store(folder, name, schedule, raw, info)
            origin = "api"
        weeks = week_plan(schedule)
        require(weeks, "no completed regular-season weeks for season " + str(year))
        # Distinct weeks return all participating teams for that week (not one API
        # call per team or player), depending on CFBD account permissions.
        for week in weeks:
            args = {"year": year, "week": week, "seasonType": "regular"}
            label = f"players_{year}_regular_week_{week:02}"
            cached = load_receipt(folder, label)
            if cached:
                payload, pmeta = cached
                mode = "cache"
            else:
                require(actual_requests < max_calls,
                        "max API call cap reached; rerun with already cached responses")
                payload, raw = fetch("/games/players", args, key)
                actual_requests += 1
                pmeta = receipt("/games/players", args, raw, payload,
                                datetime.now(timezone.utc).isoformat())
                store(folder, label, payload, raw, pmeta)
                mode = "api"
            require(all(type(x) is dict and "id" in x and "teams" in x
                        for x in payload), "malformed weekly player-game results")
            log.append({"year": year, "week": week, "game_count": len(payload),
                        "source": mode, "hash_prefix": pmeta["sha256"][:12]})
        results[year] = {"completed_regular_weeks": weeks,
                         "game_schedule_entries": len(schedule)}
    # Top-level summary is intentionally aggregate-only, with no private records.
    summary = {"status": "RETRIEVED_REQUIRES_IDENTITY_RIGHTS_VINTAGE_REVIEW",
               "season_years": list(years), "api_calls_this_run": actual_requests,
               "max_calls_this_run": max_calls, "year_summaries": results,
               "weekly_requests_or_cached": len(log),
               "game_entries_reported": sum(z["game_count"] for z in log),
               "stored_outside_public_repo": True,
               "historical_asof_eligible_for_backtest": False,
               "position_specific_defense_join_verified": False}
    return summary


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--years", nargs="+", type=int, default=list(ALLOWED_YEARS))
    parser.add_argument("--output", default=None, help="Absolute private cache folder")
    parser.add_argument("--max-calls", type=int, default=52,
                        help="Hard cap on NEW API requests for this run (default 52)")
    parser.add_argument("--plan", action="store_true",
                        help="Print upper-bound request plan; makes NO API requests")
    args = parser.parse_args(argv)
    years = sorted(set(args.years))
    require(bool(years) and all(year in ALLOWED_YEARS for year in years),
            "research scope is 2023, 2024 and/or 2025")
    require(type(args.max_calls) is int and 1 <= args.max_calls <= 200,
            "--max-calls must be 1..200")
    if args.plan:
        print(json.dumps({
            "year_schedule_requests": len(years),
            "maximum_weekly_player_requests_if_17_weeks_per_year": len(years) * 17,
            "upper_bound_first_run": len(years) * 18,
            "calls_are_not_made_in_plan_mode": True,
            "purpose": "2023 baseline / 2024 and 2025 target historical games",
            "team_roster_position_data_included": False,
            "historical_vintage_verified": False,
        }, indent=2, sort_keys=True))
        return
    require(args.output is not None,
            "private output path required in fetch mode")
    folder = output_path(args.output)
    token = os.getenv("CFBD_API_KEY")
    require(bool(token and token.strip()), "CFBD_API_KEY must be configured locally")
    summary = collect(years, folder, token, args.max_calls)
    print(json.dumps(summary, indent=2, sort_keys=True))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, RuntimeError, json.JSONDecodeError) as err:
        print("Collection halted: " + str(err), file=sys.stderr)
        sys.exit(2)

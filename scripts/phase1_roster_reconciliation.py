#!/usr/bin/env python3
"""Phase 1b: Reconcile drafted players without snap rows against exact PFR roster IDs.

Full weekly-roster CSVs live in a private, checksum-verified temporary cache.
The public/Actions artifact is AGGREGATE ONLY: no individual names, birth dates,
medical statuses, weekly health notes, or identifiers are exposed.

Roster presence is NOT equivalent to being active on game day. Missing from
rosters is NOT proof of never having been in the NFL. Do not invent zero-talent
or zero-efficiency labels from either result.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import csv
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path
import sys
from urllib.request import Request,urlopen
from urllib.error import URLError,HTTPError

from phase1_nfl_snap_baseline import (
    FIRST,LAST_DRAFT,LAST_SNAP,private_path,collect,parse_sources,
    build_labels,ensure,REPO
)

ROSTER_URL="https://github.com/nflverse/nflverse-data/releases/download/weekly_rosters/roster_weekly_{year}.csv"
MAX_ROSTER_BYTES=25*1024*1024
SEASON_MIN_ROWS=5000

def fetch_roster_cache(cache,allow_fetch):
    """Cache annual source and immutable retrieval receipt (never overwrite)."""
    cache.mkdir(parents=True,exist_ok=True)
    receipts=[]
    for year in range(FIRST,LAST_SNAP+1):
        fname=f"roster_weekly_{year}.csv"
        url=ROSTER_URL.format(year=year)
        file=cache/fname
        rec_file=cache/(fname+".receipt.json")
        if file.exists() or rec_file.exists():
            ensure(file.is_file() and rec_file.is_file(),
                   f"incomplete roster source/receipt pair {year}")
            raw=file.read_bytes()
            rec=json.loads(rec_file.read_text())
            ensure(rec.get("sha256")==hashlib.sha256(raw).hexdigest(),
                   "roster SHA256 verification failed "+str(year))
            ensure(rec.get("source_url")==url,
                   "roster source URL mismatch "+str(year))
        else:
            ensure(allow_fetch,"roster source absent "+str(year)+" (use --fetch)")
            try:
                with urlopen(Request(url,headers={"User-Agent":"APEX-roster-quality/1.0",
                           "Accept":"text/csv,application/octet-stream"}),timeout=75) as resp:
                    raw=resp.read(MAX_ROSTER_BYTES+1)
            except (HTTPError,URLError,TimeoutError) as exc:
                raise RuntimeError("roster source unavailable "+str(year)) from exc
            ensure(6000<len(raw)<=MAX_ROSTER_BYTES,
                   "unexpected roster size "+str(year))
            ensure(not raw[:20].lower().startswith(b"<!doctype html"),
                   "roster response is HTML, not CSV")
            rec={
                "source_url":url,"sha256":hashlib.sha256(raw).hexdigest(),
                "bytes":len(raw),"retrieved_at":datetime.now(timezone.utc).isoformat(),
                "license_use_review":"PENDING",
                "original_historical_vintage_verified":False,
            }
            file.write_bytes(raw)
            rec_file.write_text(json.dumps(rec,indent=2,sort_keys=True)+"\n")
        receipts.append({"season":year,"sha256":rec["sha256"],"bytes":len(raw),
                         "historical_vintage_verified":False})
    return receipts

def roster_evidence(cache):
    """Index only exact PFR ID matches, explicitly never name-only matches."""
    evidence=defaultdict(lambda:{"years":set(),"weeks":set(),"teams":set(),
                                  "gsis_ids":set(),"statuses":set(),
                                  "rows":0})
    gsis_index=defaultdict(lambda:{"years":set(),"pfr_ids":set()})
    audit={}
    missing_id_counts=Counter()
    for season in range(FIRST,LAST_SNAP+1):
        raw=(cache/f"roster_weekly_{season}.csv").read_bytes()
        reader=csv.DictReader(io.StringIO(raw.decode("utf-8-sig")))
        fields=set(reader.fieldnames or [])
        ensure({"season","week","team"}.issubset(fields),
               "weekly roster required columns missing "+str(season))
        id_key="pfr_id" if "pfr_id" in fields else "pfr_player_id" if "pfr_player_id" in fields else None
        ensure(id_key is not None,"weekly roster has no PFR identifier "+str(season))
        issues=Counter();rows=0;matched=0;season_ids=set();gsis_ids=set()
        for row in reader:
            rows+=1
            ensure(str(row.get("season","")).strip()==str(season),
                   f"roster cross-season contamination {season}")
            pfr=(row.get(id_key) or "").strip()
            try:
                week=int(str(row.get("week","")).strip())
            except (TypeError,ValueError):
                issues["invalid_week"]+=1
                continue
            if not 1<=week<=23:
                issues["out_of_range_week"]+=1
                continue
            game_type=(row.get("game_type") or "REG").upper().strip()
            if game_type not in ("REG","REGULAR","","R"):
                continue
            team=(row.get("team") or "").strip().upper()
            if not team:
                issues["missing_team"]+=1
                continue
            gsis=(row.get("gsis_id") or "").strip()
            if gsis:
                gsis_ids.add(gsis)
                gsis_index[gsis]["years"].add(season)
                if pfr:gsis_index[gsis]["pfr_ids"].add(pfr)
            else:
                issues["missing_gsis_id"]+=1
            if not pfr:
                issues["missing_pfr_id"]+=1
                continue
            matched+=1;season_ids.add(pfr)
            rec=evidence[pfr]
            rec["years"].add(season)
            rec["weeks"].add((season,week,team))
            rec["teams"].add((season,team))
            rec["rows"]+=1
            if gsis:rec["gsis_ids"].add(gsis)
            # NEVER export potentially sensitive individual status metadata
            status=(row.get("status") or "").strip().upper()
            if status:rec["statuses"].add(status)
        ensure(rows>=SEASON_MIN_ROWS,"roster season has too few rows "+str(season))
        audit[str(season)]={
            "rows":rows,"valid_pfr_id_rows":matched,
            "distinct_pfr_ids":len(season_ids),
            "distinct_gsis_ids":len(gsis_ids),
            "issues":dict(issues)
        }
        for k,v in issues.items():missing_id_counts[k]+=v
    return evidence,gsis_index,audit,dict(missing_id_counts)

def reconcile(labels,evidence,gsis_evidence=None):
    """Four-season roster evidence cannot confirm no-snap player skill/ability."""
    statuses=Counter()
    by_class=defaultdict(Counter)
    by_band=defaultdict(Counter)
    by_position=defaultdict(Counter)
    conflicts=Counter()
    matches=0
    gsis_only_matches=0
    gsis_evidence=gsis_evidence or {}
    # Do not expose records. Track one row per selection.
    for row in labels:
        original=row["status"]
        if original!="NO_SNAP_ENTRY_UNCONFIRMED":
            continue
        pid=row["pfr_id"]
        gsis=(row.get("gsis_id") or "").strip()
        years=set(range(row["year"],row["year"]+4))
        roster=evidence.get(pid) if pid else None
        gsis_roster=gsis_evidence.get(gsis) if gsis else None
        pfr_present=bool(roster and (roster["years"] & years))
        gsis_present=bool(gsis_roster and (gsis_roster["years"] & years))
        if pfr_present:
            if gsis and roster["gsis_ids"] and gsis not in roster["gsis_ids"]:
                status="PFR_GSIS_IDENTITY_CONFLICT"
                conflicts["draft_gsis_conflicts_with_roster_pfr"]+=1
            else:
                status="ROSTER_SEEN_NO_SNAP_MATCH"
                matches+=1
                if len(roster["gsis_ids"])>1:
                    conflicts["pfr_to_multiple_gsis_any_year"]+=1
                if (roster["years"] & years)!=years:
                    conflicts["not_present_every_year"]+=1
        elif gsis_present:
            status="GSIS_ONLY_ROSTER_SEEN_NO_SNAP_MATCH"
            gsis_only_matches+=1
            if len(gsis_roster["pfr_ids"])>1:
                conflicts["gsis_multiple_pfr_ids"]+=1
            if pid and gsis_roster["pfr_ids"] and pid not in gsis_roster["pfr_ids"]:
                conflicts["gsis_roster_uses_different_pfr_id"]+=1
        else:
            status="NO_ROSTER_MATCH_OR_UNOBSERVED"
        statuses[status]+=1
        by_class[str(row["year"])][status]+=1
        p=row.get("position_group") or "UNKNOWN"
        by_position[p][status]+=1
        pick=row["pick"]
        b=("1-32" if pick<=32 else "33-64" if pick<=64 else
           "65-100" if pick<=100 else "101-200" if pick<=200 else "201+")
        by_band[b][status]+=1
    ensure(sum(statuses.values())==sum(row["status"]=="NO_SNAP_ENTRY_UNCONFIRMED"
                                     for row in labels),
           "reconciliation accidentally lost rows")
    return {
        "base_no_snap_selections":sum(statuses.values()),
        "roster_seen_no_snap_match":matches,
        "gsis_only_roster_match":gsis_only_matches,
        "total_exact_identifier_roster_match":matches+gsis_only_matches,
        "no_roster_match_or_unobserved":statuses["NO_ROSTER_MATCH_OR_UNOBSERVED"],
        "status_counts":dict(statuses),
        "by_class":{k:dict(v) for k,v in sorted(by_class.items())},
        "by_pick_bucket":{k:dict(v) for k,v in sorted(by_band.items())},
        "by_position":{k:dict(v) for k,v in sorted(by_position.items())},
        "conflict_flags":dict(conflicts),
        "true_zero_playing_time_confirmed":0,
        "what_roster_absence_means":"No exact PFR ID match in available weekly roster source; not proof of no NFL roster or no intrinsic skill",
        "what_roster_presence_means":"Observed a weekly roster listing; not necessarily active on a game day, no validated zero efficiency"
    }

def run(args=None):
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--cache",required=True,help="source cache outside public git")
    p.add_argument("--out",required=True,help="aggregate output folder outside public git")
    p.add_argument("--fetch",action="store_true")
    opts=p.parse_args(args)
    cache=private_path(opts.cache);out=private_path(opts.out)
    ensure(cache!=out,"source and output dirs must be different")
    # Existing snap source receipts are reused instead of duplicate fetching.
    collect(cache,opts.fetch)
    receipts=fetch_roster_cache(cache,opts.fetch)
    picks,snaps,season_audit,issues=parse_sources(cache)
    labels,_=build_labels(picks,snaps,season_audit)
    evidence,gsis_evidence,audit,issues=roster_evidence(cache)
    result={
        "schema_version":1,"phase":"phase1_roster_exact_id_reconciliation",
        "state":"RESEARCH_AUDIT_ONLY_NOT_LABEL_PROMOTION",
        "core_classes":[FIRST,LAST_DRAFT],
        "source_vintage":"retrospective_2026_download",
        "source_roster_receipts":receipts,
        "season_roster_coverage":audit,
        "roster_issue_counts":issues,
        "no_snap_reconciliation":reconcile(labels,evidence,gsis_evidence),
        "candidate_count":len(picks),
        "next_gate":["verify GSIS/PFR conflicts and unresolved players with authoritative crosswalk",
                     "verify game-level active status and injury-inactive roster rules",
                     "establish complete team-game unit-snap denominators before Y3 share",
                     "do not impute intrinsic ability as zero",
                     "do not train/deploy Phase 2+ before review"],
        "phase1_complete":False
    }
    out.mkdir(parents=True,exist_ok=True)
    path=out/"APEX_phase1_roster_aggregate.json"
    ensure(not path.exists(),"refuse overwrite aggregate report")
    path.write_text(json.dumps(result,sort_keys=True,indent=2)+"\n")
    print(json.dumps({"no_snap_reconciliation":result["no_snap_reconciliation"],
         "season_counts":len(audit),"source_receipts":len(receipts),
         "phase1_complete":False},indent=2))
    return result

if __name__=="__main__":
    try:run()
    except (ValueError,RuntimeError,KeyError,OSError,UnicodeDecodeError) as e:
        print("PHASE1 RECONCILIATION GATED: "+str(e),file=sys.stderr);sys.exit(2)

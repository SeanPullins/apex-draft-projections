#!/usr/bin/env python3
"""APEX Phase 1: independent, source-gated NFL four-year snap labels and pick baselines.

Runs entirely with Python's standard library. Requires authorized access to the
public nflverse release URLs; source JSON/CSV remains OUTSIDE the public APEX repo.
All output is aggregate-only unless --private-output explicitly names a private
directory. Does not build a player talent model, predict 2027, or use future
training data in any historical baseline.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import csv
from datetime import datetime, timezone
import hashlib
import io
import json
import math
import os
from pathlib import Path
import random
import statistics
import sys
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

REPO = Path(__file__).resolve().parents[1]
DRAFT_URL = "https://github.com/nflverse/nflverse-data/releases/download/draft_picks/draft_picks.csv"
SNAP_URL = "https://github.com/nflverse/nflverse-data/releases/download/snap_counts/snap_counts_{year}.csv"
FIRST = 2013
LAST_DRAFT = 2022
LAST_SNAP = 2025
SNAP_FIELDS = {"game_id","season","game_type","pfr_player_id","offense_snaps",
               "defense_snaps","st_snaps","offense_pct","defense_pct"}
PICK_FIELDS = {"season","pick","position","pfr_player_id"}
BANDS = [(1,16),(17,32),(33,64),(65,100),(101,150),(151,200),(201,300)]
POSITIONS = {"QB","RB","WR","TE","OL","IDL","EDGE","LB","CB","S"}
POSITION_MAP = {
  "QB":"QB","RB":"RB","FB":"RB","WR":"WR","TE":"TE",
  "T":"OL","OT":"OL","G":"OL","OG":"OL","C":"OL","OL":"OL",
  "DT":"IDL","NT":"IDL","DL":"IDL","DE":"EDGE","EDGE":"EDGE","ED":"EDGE",
  "OLB":"LB","ILB":"LB","LB":"LB","MLB":"LB",
  "CB":"CB","DB":"CB","FS":"S","SS":"S","S":"S",
}

def ensure(condition, reason):
    if not condition:
        raise ValueError(reason)

def private_path(raw):
    p=Path(raw).expanduser().resolve()
    ensure(p!=REPO and REPO not in p.parents,
           "source records and private outputs must be outside PUBLIC repo")
    return p

def read_csv(raw, required, label):
    try:
        text=raw.decode("utf-8-sig")
        reader=csv.DictReader(io.StringIO(text))
        cols=set(reader.fieldnames or [])
        ensure(required.issubset(cols),
               label+": missing columns "+",".join(sorted(required-cols)))
        rows=list(reader)
    except UnicodeDecodeError as exc:
        raise ValueError(label+": source is not UTF-8 CSV") from exc
    return rows

def collect(cache, fetch):
    """Use the upstream-release CSVs (not career-after-draft statistics)."""
    cache.mkdir(parents=True,exist_ok=True)
    paths=[("draft_picks.csv",DRAFT_URL)]+[
        ("snap_counts_"+str(y)+".csv",SNAP_URL.format(year=y))
        for y in range(FIRST,LAST_SNAP+1)]
    receipts=[]
    for filename,url in paths:
        location=cache/filename
        receipt_file=cache/(filename+".receipt.json")
        if location.exists() or receipt_file.exists():
            ensure(location.exists() and receipt_file.exists(),
                   "incomplete source/receipt pair "+filename)
            raw=location.read_bytes()
            rec=json.loads(receipt_file.read_text())
            ensure(rec.get("sha256")==hashlib.sha256(raw).hexdigest(),
                   "cached source integrity failure "+filename)
            ensure(rec.get("source_url")==url,
                   "cached source URL differs from approved upstream "+filename)
        else:
            ensure(fetch,"missing "+filename+" in cache; use --fetch with authorized source")
            try:
                with urlopen(Request(url,headers={"User-Agent":"APEX-phase1-verification/1.0",
                      "Accept":"text/csv,application/octet-stream"}),timeout=65) as response:
                    raw=response.read(8*1024*1024+1)
                    ensure(len(raw)<=8*1024*1024,filename+" exceeds size cap")
            except (URLError,HTTPError,TimeoutError) as exc:
                raise RuntimeError("unable to retrieve "+filename+"; no partial data accepted") from exc
            ensure(raw[:5]!=b"<html" and len(raw)>5000,
                   "unexpected non-CSV or truncated upstream source "+filename)
            rec={"source_url":url,"sha256":hashlib.sha256(raw).hexdigest(),
                 "bytes":len(raw),"retrieved_at":datetime.now(timezone.utc).isoformat(),
                 "rights_review":"PENDING: redistributability and ML-use require operator review",
                 "historical_vintage_verified":False}
            location.write_bytes(raw)
            receipt_file.write_text(json.dumps(rec,sort_keys=True,indent=2)+"\n")
        receipts.append({"file":filename,"sha256":rec["sha256"],
                         "bytes":len(raw),"historical_vintage_verified":False})
    return receipts

def number(x,label):
    if x is None or str(x).strip()=="":
        return None
    try:
        result=float(x)
    except (TypeError,ValueError):
        raise ValueError("invalid numeric "+label)
    ensure(math.isfinite(result) and result>=0,"invalid nonnegative "+label)
    return result

def position_group(value,category="",side=""):
    p=(value or "").strip().upper()
    # Important: DE/OLB are formation-context dependent. Treat broad DL/DE
    # mapping as provisional; position audit must reconcile before modeling.
    return POSITION_MAP.get(p)

def band_for(pick):
    for lo,hi in BANDS:
        if lo<=pick<=hi:return f"{lo}-{hi}"
    raise ValueError("pick outside declared band")

def parse_sources(cache):
    draft=read_csv((cache/"draft_picks.csv").read_bytes(),PICK_FIELDS,"draft_picks")
    picks, issues=[],Counter()
    seen=set()
    for r in draft:
        try: season=int(r["season"]);pick=int(r["pick"])
        except (TypeError,ValueError):
            issues["invalid_draft_year_or_pick"]+=1;continue
        if not 2010<=season<=LAST_DRAFT:continue
        ensure((season,pick) not in seen,
               "duplicate actual draft year/pick ("+str(season)+","+str(pick)+")")
        seen.add((season,pick))
        ensure(1<=pick<=300,"pick outside supported range")
        # Canonical modern nflverse picks: pfr_player_id. Older alternative
        # data file may use pfr_id; do not silently mix schemas.
        rawid=(r.get("pfr_player_id") or "").strip()
        pg=position_group(r.get("position"),r.get("category"),r.get("side"))
        picks.append({"year":season,"pick":pick,"position_group":pg,
                     "pfr_id":rawid,"position":r.get("position"),
                     "source_is_drafted":True})
    if any(x["year"]==2010 for x in picks):
        ensure(len([x for x in picks if x["year"]==2022])>=200,
               "2022 draft-pick coverage unexpectedly low")
    ensure(len(picks)>=2800,"2010-22 drafted population unexpectedly small")
    snaps=defaultdict(lambda:{"off":0,"def":0,"st":0,"games":set(),"seasons":set(),
                               "off_pct_games":[],"def_pct_games":[]})
    season_audit={}
    for year in range(FIRST,LAST_SNAP+1):
        rows=read_csv((cache/f"snap_counts_{year}.csv").read_bytes(),SNAP_FIELDS,
                      "snap_counts_"+str(year))
        ensure(len(rows)>=6000,"snap season "+str(year)+" has too few game rows")
        gameids=set()
        seen_gameplayer=set()
        issues_year=Counter()
        for row in rows:
            y_raw=row.get("season")
            ensure(str(y_raw).strip()==str(year),
                   "year-scope contamination in snaps season "+str(year))
            game_type=str(row.get("game_type","")).upper().strip()
            if game_type not in ("REG","REGULAR"):
                if game_type in ("WC","DIV","CON","SB","POST","PLAYOFF","WILDCARD",""):
                    continue
                raise ValueError("unrecognized game_type "+repr(game_type))
            gid=(row.get("game_id") or "").strip()
            player=(row.get("pfr_player_id") or "").strip()
            team=(row.get("team") or "").strip()
            if not player or not gid or not team:
                issues_year["missing_pfr_id_game_team"]+=1
                continue
            key=(gid,player,team)
            ensure(key not in seen_gameplayer,
                   "duplicate PFR player/game/team "+str(year)+" "+player)
            seen_gameplayer.add(key);gameids.add(gid)
            off=number(row.get("offense_snaps"),"offense_snaps")
            defense=number(row.get("defense_snaps"),"defense_snaps")
            st=number(row.get("st_snaps"),"st_snaps")
            for key,val in [("off",off),("def",defense),("st",st)]:
                if val is None:issues_year["missing_"+key]+=1
            rec=snaps[(year,player)]
            for k,v in [("off",off),("def",defense),("st",st)]:
                if v is not None:rec[k]+=int(v)
            rec["games"].add(gid);rec["seasons"].add(year)
            for col,key in [("offense_pct","off_pct_games"),("defense_pct","def_pct_games")]:
                pct=number(row.get(col),col)
                if pct is not None:rec[key].append(pct)
        ensure(len(gameids)>=170,"snap regular season game count unexpectedly low "+str(year))
        season_audit[str(year)]={"regular_games":len(gameids),
                                "player_game_rows":len(seen_gameplayer),
                                "source_issues":dict(issues_year)}
    return picks,snaps,season_audit,issues

def build_labels(picks,snaps,season_audit):
    labels=[]
    quality=Counter()
    for p in picks:
        yr=p["year"];pid=p["pfr_id"];grp=p["position_group"]
        if yr<FIRST:
            status="SNAP_FEED_BEFORE_COVERAGE";value=None
        elif not pid:
            status="ID_UNRESOLVED";value=None
        elif not grp or grp not in POSITIONS:
            status="POSITION_UNSUPPORTED";value=None
        else:
            # All four constituent seasons must have complete league schedules.
            years=range(yr,yr+4)
            ensure(all(season_audit[str(y)]["regular_games"]>=170 for y in years),
                   "incomplete snap feed within four-year window")
            seq=[snaps.get((y,pid)) for y in years]
            if not any(seq):
                # No confirmed on-field role. Could also be a PFR ID or roster
                # resolution issue; do NOT transform absence into known zero talent.
                status="NO_SNAP_ENTRY_UNCONFIRMED";value=None
            else:
                status="COMPLETE_OBSERVED_PARTICIPANT"
                value=sum((x["off"]+x["def"]) for x in seq if x)
        y3=None
        if status=="COMPLETE_OBSERVED_PARTICIPANT":
            # Research-only absolute playing-time proxy, not the approved
            # season-snap-share target (which requires team-game denominators).
            series=[((x["off"]+x["def"]) if x else 0) for x in seq]
            y3=int(max(series[:3])>=500 or sum(x>=250 for x in series[:3])>=2)
        quality[status]+=1
        labels.append({**p,"status":status,"four_year_unit_snaps":value,
                       "role_y3_proxy":y3,
                       "four_year_st_snaps":sum(x["st"] for x in seq if x)
                         if status=="COMPLETE_OBSERVED_PARTICIPANT" else None,
                       "regular_snap_game_count":sum(len(x["games"]) for x in seq if x)
                         if status=="COMPLETE_OBSERVED_PARTICIPANT" else None})
    return labels,quality

def pooled_estimate(rows,band,position):
    matching=[float(r["four_year_unit_snaps"]) for r in rows
              if r["status"]=="COMPLETE_OBSERVED_PARTICIPANT"
              and r["year"]<=LAST_DRAFT and band_for(r["pick"])==band
              and r["position_group"]==position]
    same_band=[float(r["four_year_unit_snaps"]) for r in rows
              if r["status"]=="COMPLETE_OBSERVED_PARTICIPANT"
              and band_for(r["pick"])==band]
    # This is a CONDITIONAL-on-seeing NFL snaps baseline. It is not unbiased
    # market surplus for the whole drafted class; keep sample sizes visible.
    if len(same_band)<8:return None,len(matching),len(same_band)
    mean=sum(same_band)/len(same_band)
    alpha=20
    shrink=(sum(matching)+alpha*mean)/(len(matching)+alpha)
    return shrink,len(matching),len(same_band)

def expected_by_pick(labels,training_classes,replicates=400,seed=20261009):
    """Training-only, position-shrunk band estimates; class bootstrap by counts.

    Pre-aggregating sums/denominators also avoids reading thousands of source
    rows inside each bootstrap replicate. No opponent, NFL future, or salary
    information is introduced. This is STILL participants-only.
    """
    years=sorted(set(training_classes))
    ensure(years and max(years)<=LAST_DRAFT,"invalid training years")
    # year -> band -> [(all-count, all-sum), positional buckets]
    counters=defaultdict(lambda:defaultdict(lambda:[0,0.0]))
    for r in labels:
        if r["year"] not in years or r["status"]!="COMPLETE_OBSERVED_PARTICIPANT":
            continue
        band=band_for(r["pick"]);grp=r["position_group"]
        v=float(r["four_year_unit_snaps"])
        for key in [(band,"ALL"),(band,grp)]:
            rec=counters[r["year"]][key]
            rec[0]+=1;rec[1]+=v
    def estimate(draw,band,group):
        a_n=a_sum=p_n=p_sum=0
        for year in draw:
            annual=counters[year]
            g=annual.get((band,"ALL"),(0,0.0))
            p=annual.get((band,group),(0,0.0))
            a_n+=g[0];a_sum+=g[1]
            p_n+=p[0];p_sum+=p[1]
        if a_n<8:return None,p_n,a_n
        pooled=(p_sum+20*(a_sum/a_n))/(p_n+20)
        return pooled,p_n,a_n

    output=[];rng=random.Random(seed)
    for group in sorted(POSITIONS):
        for lo,hi in BANDS:
            band=f"{lo}-{hi}"
            est,n_group,n_band=estimate(years,band,group)
            if est is None:continue
            samples=[]
            if len(years)>=4:
                for _ in range(replicates):
                    draw=[years[rng.randrange(len(years))] for __ in years]
                    v,_,_=estimate(draw,band,group)
                    if v is not None:samples.append(v)
            samples.sort()
            interval=([samples[int(.025*(len(samples)-1))],
                       samples[int(.975*(len(samples)-1))]]
                      if len(samples)>=.9*replicates else None)
            output.append({
              "position_group":group,"pick_band":band,"pick_min":lo,"pick_max":hi,
              "expected_four_year_unit_snaps_conditional_on_recorded_participation":round(est,2),
              "training_position_band_participants":n_group,
              "training_band_participants":n_band,
              "bootstrap_95_ci":[round(x,2) for x in interval] if interval else None,
              "classes_used":len(years),"participants_only":True,
              "usable_as_true_market_surplus":False,
            })
    return output

def build_report(picks,labels,quality,season_audit,issues,receipts,replicates):
    by_year=defaultdict(Counter)
    by_position=defaultdict(Counter)
    for x in labels:
        by_year[x["year"]][x["status"]]+=1
        by_position[x["position_group"] or "UNKNOWN"][x["status"]]+=1
    first_training=list(range(FIRST,LAST_DRAFT+1))
    curve=expected_by_pick(labels,first_training,replicates=replicates)
    forward={}
    for forecast in range(2020,LAST_DRAFT+1):
        train=list(range(FIRST,forecast-3))
        valid=[x for x in labels if x["year"]==forecast]
        forward[str(forecast)]={"train_classes":train,
                               "mature_as_of_pre_draft":forecast,
                               "test_rows":len(valid),
                               "curve_preview":expected_by_pick(labels,train,replicates=replicates,seed=forecast)[:4],
                               "future_outcomes_in_training":False}
    return {
      "status":"PHASE1_PARTICIPANT_CONDITIONAL_EXPLORATORY_BASELINE",
      "evaluation_as_of":"2026-10-09","source_data_retrieval_timing":"retrospective",
      "source_receipts":receipts,
      "core_draft_classes":list(range(FIRST,LAST_DRAFT+1)),
      "snap_game_years":list(range(FIRST,LAST_SNAP+1)),
      "drafted_rows_2010_2022":len(labels),
      "drafted_2012_2022":sum(FIRST<=x["year"]<=LAST_DRAFT for x in labels),
      "status_counts":dict(quality),
      "status_by_draft_year":{str(y):dict(c) for y,c in sorted(by_year.items())},
      "status_by_position":{str(g):dict(c) for g,c in sorted(by_position.items())},
      "regular_season_source_audit":season_audit,
      "issues":dict(issues),
      "conditional_by_pick_curve":curve,
      "forward_vintage_2020_2022":forward,
      "limitations":[
         "This baseline conditions on a player appearing in snap counts; cannot estimate whole-draft surplus.",
         "No-snap names lack independent roster/identity follow-up and remain unconfirmed, not zero-talent labels.",
         "Snaps measure opportunity and realized role, not causal intrinsic player ability.",
         "Year-three snap-share requires team-game denominators and full roster availability, still unavailable.",
         "Conditional efficiency for OL/defense has no authenticated role denominator.",
         "Current source downloads cannot prove historical as-of source vintages.",
         "Drafted-only cohorts exclude eligible UDFAs; no comparison to full prospect population.",
         "PFR position mapping (DE/OLB/DB) is provisional for pass-rush/coverage grouping.",
         "2012 NFL snap release is a header-only 154-byte placeholder; 2012 drafted cohort has no complete four-year snaps.",
      "The 2019–2022 cohorts already inspected by Muse are development, not fresh holdouts.",
         "NFL labels or baseline may not be promoted without operator source-rights review and independent validation."
      ],
      "phase1_complete":False,
      "user_approval_required_before_phase2":True,
    }

def run(argv=None):
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--cache",required=True)
    ap.add_argument("--out",required=True)
    ap.add_argument("--fetch",action="store_true")
    ap.add_argument("--bootstrap",type=int,default=400)
    args=ap.parse_args(argv)
    ensure(100<=args.bootstrap<=5000,"bootstrap replicas must be 100..5000")
    cache=private_path(args.cache);out=private_path(args.out)
    ensure(cache!=out,"raw cache and aggregate output must use separate locations")
    receipts=collect(cache,args.fetch)
    picks,snaps,season_audit,issues=parse_sources(cache)
    labels,quality=build_labels(picks,snaps,season_audit)
    report=build_report(picks,labels,quality,season_audit,issues,receipts,args.bootstrap)
    out.mkdir(parents=True,exist_ok=True)
    dest=out/"APEX_phase1_nfl_snap_aggregate.json"
    ensure(not dest.exists(),"refuse to overwrite aggregate evaluation output")
    dest.write_text(json.dumps(report,sort_keys=True,indent=2)+"\n")
    # Print only aggregate counts into Actions logs.
    print(json.dumps({"phase1_status":report["status"],
       "drafted_rows":report["drafted_rows_2010_2022"],
       "core_drafted":report["drafted_2012_2022"],
       "statuses":report["status_counts"],
       "bootstrap_curves":len(report["conditional_by_pick_curve"]),
       "forward_years":list(report["forward_vintage_2020_2022"]),
       "report_path":str(dest),"not_a_true_market_surplus":True},indent=2))
    return report

if __name__=="__main__":
    try:run()
    except (ValueError,OSError,RuntimeError,KeyError,TypeError,csv.Error) as e:
        print("PHASE1 GATED: "+str(e),file=sys.stderr);sys.exit(2)

#!/usr/bin/env python3
"""Independent, read-only APEX prediction-evidence audit.

Research only. Recomputes predictive accuracy from existing private Muse ZIP
prediction exports without importing or executing untrusted bundled scripts.
No player-level records, identities, or licensed features are exported.
Chronologically invalid 2018 "untouched" results are explicitly EXCLUDED.

Usage:
  python3 scripts/audit_muse_signal.py --phase3-zip /private/APEX_Phase3_Predictive_Validation.zip \
      --phase1-zip /private/APEX_Phase1_Reproducibility_Package.zip \
      --out /private/apex_phase3_signal_aggregate.json

All 2019-22 metrics are DEVELOPMENT / sensitivity, not proof of new accuracy.
"""
from __future__ import annotations
import argparse
from collections import Counter, defaultdict
from datetime import datetime, timezone
import csv
import gzip
import hashlib
import io
import itertools
import json
import math
from pathlib import Path
import statistics
import sys
import zipfile

TARGETS=("A","B","C")
YEARS=(2019,2020,2021,2022)
MODELS=("M0","M1","M1G2","M1G3","M1G4","M1G34","M1G345")
# Fixed in advance for this verifier; not selected to make a comparison win.
PAIRINGS=(("M1","M0"),("M1G34","M1"),("M1G2","M1"),
          ("M1G3","M1"),("M1G4","M1"),("M1G345","M1"))
POSITIONS=("QB","RB","WR","TE","OL","DL","LB","DB")

def require(ok,why):
    if not ok:raise ValueError(why)

def read_csv_member(archive,member,gz=True):
    require(member in archive.namelist(),"missing required "+member)
    raw=archive.read(member)
    if gz:raw=gzip.decompress(raw)
    reader=csv.DictReader(io.StringIO(raw.decode("utf-8-sig")))
    require(reader.fieldnames is not None,member+" empty")
    return list(reader),hashlib.sha256(archive.read(member)).hexdigest()

def brier(rows,pcol,target):
    return sum((r[pcol]-r[target])**2 for r in rows)/len(rows)

def logloss(rows,pcol,target):
    eps=1e-15
    return -sum(r[target]*math.log(min(1-eps,max(eps,r[pcol])))+
                (1-r[target])*math.log(min(1-eps,max(eps,1-r[pcol])))
                for r in rows)/len(rows)

def auc(rows,pcol,target):
    seq=sorted(rows,key=lambda r:r[pcol]);pos=0;rank_sum=0.0;i=0
    while i<len(seq):
        j=i+1
        while j<len(seq) and seq[j][pcol]==seq[i][pcol]:j+=1
        rank=(i+j+1)/2
        n=sum(r[target] for r in seq[i:j])
        rank_sum+=n*rank;pos+=n;i=j
    neg=len(seq)-pos
    return (rank_sum-pos*(pos+1)/2)/(pos*neg) if pos and neg else None

def ece_ten_equal_size(rows,pcol,target):
    seq=sorted(rows,key=lambda r:r[pcol])
    n=len(seq)
    if not n:return None
    total=0
    for k in range(10):
        sub=seq[(k*n)//10:((k+1)*n)//10]
        if sub:
            total+=len(sub)/n*abs(sum(x[pcol] for x in sub)/len(sub)-
                                 sum(x[target] for x in sub)/len(sub))
    return total

def metrics(rows,pcol,target):
    return {"n":len(rows),"brier":round(brier(rows,pcol,target),8),
            "log_loss":round(logloss(rows,pcol,target),8),
            "auc":round(auc(rows,pcol,target),6) if auc(rows,pcol,target) is not None else None,
            "ece_10bin":round(ece_ten_equal_size(rows,pcol,target),6),
            "base_rate":round(sum(x[target] for x in rows)/len(rows),6)}

def ci_cluster_exact(rows,pcol,baseline,target):
    """Exact 4^4 bootstrap distribution; resample YEAR clusters, preserving player pairs.

    Only 4 time clusters: this interval is exploratory and likely fragile.
    """
    groups=[ [r for r in rows if r["year"]==y] for y in YEARS]
    require(all(groups),"all four draft classes required")
    Ns=[len(g) for g in groups]
    delta=[sum((r[pcol]-r[target])**2-
               (r[baseline]-r[target])**2 for r in g) for g in groups]
    values=[]
    for take in itertools.product(range(len(YEARS)),repeat=len(YEARS)):
        values.append(sum(delta[i] for i in take)/sum(Ns[i] for i in take))
    values.sort()
    def q(t):
        x=(len(values)-1)*t
        lo=math.floor(x);hi=math.ceil(x)
        return values[lo] if lo==hi else values[lo]*(hi-x)+values[hi]*(x-lo)
    return [round(q(.025),8),round(q(.975),8)]

def validate_rows(raw):
    require(bool(raw),"no prediction rows")
    out=[];seen=set();issues=Counter()
    expected={f"y_{t}" for t in TARGETS}
    expected|={f"p_{t}_{m}" for t in TARGETS for m in MODELS}
    require(expected.issubset(raw[0].keys()),
            "missing required prediction columns: "+",".join(sorted(expected-set(raw[0]))))
    for r in raw:
        y=int(r["draft_year"])
        require(y in YEARS,"2018 or unexpected year in permitted development predictions")
        require(r["pos_group"] in POSITIONS,"position outside frozen group list")
        key=(y,r.get("gsis_id","").strip(),r.get("name",""))
        require(key not in seen,"duplicate player prediction record")
        seen.add(key)
        rid=(r.get("gsis_id") or "").strip()
        if not rid:issues["missing_gsis_id"]+=1
        item={"year":y,"position":r["pos_group"],"has_id":bool(rid)}
        for t in TARGETS:
            try:
                y0=float(r[f"y_{t}"])
                require(y0 in (0.,1.),"non-binary NFL outcome")
                item[t]=int(y0)
                for m in MODELS:
                    p=float(r[f"p_{t}_{m}"])
                    require(math.isfinite(p) and 0<p<1,"invalid probability "+m)
                    item[f"{t}_{m}"]=p
            except (TypeError,ValueError,KeyError) as e:
                raise ValueError("invalid APEX label or model prediction") from e
        out.append(item)
    counts=Counter(r["year"] for r in out)
    require(sorted(counts)==list(YEARS),"missing historic development class")
    return out,dict(issues)

def provenance_flags(archive):
    """Scan package manifest text only; never execute any code inside a ZIP."""
    flags=["2018 evaluation explicitly excluded: Muse's four-year-outcome training through 2017 leaks future 2018-20 NFL seasons."]
    if "scripts/03_run_backtest_v3.py" in archive.namelist():
        code=archive.read("scripts/03_run_backtest_v3.py").decode("utf-8")
        if "2018:2017" in code.replace(" ",""):
            flags.append("Confirmed source script contains invalid 2018:2017 training-cap fold.")
        else:
            flags.append("2018 fold training cap could not be confirmed using simple literal scan.")
    return flags

def phase1_inventory(p1):
    records,sha=read_csv_member(p1,"phase1/robust_labels_v3b.csv",gz=False)
    keys=Counter((r["gsis_id"],r["draft_year"]) for r in records)
    blank=sum(not r["gsis_id"].strip() for r in records)
    invalid=sum(r.get("V3b_posaware") not in ("0","1") for r in records)
    have_v3b_predictions=any("v3b_predictions" in n.lower() and n.endswith(".csv.gz")
                              for n in p1.namelist())
    return {"v3b_label_rows":len(records),"missing_gsis_rows":blank,
            "duplicate_gsis_year_keys":sum(v-1 for v in keys.values() if v>1),
            "invalid_v3b_labels":invalid,
            "v3b_prediction_file_present":have_v3b_predictions,
            "label_file_sha256":sha,
            "status":"LABELS_ONLY_NOT_A_VALID_V3B_BACKTEST" if not have_v3b_predictions
                     else "V3B_PREDICTION_FILE_PRESENT_REQUIRES_SEPARATE_REPLAY"}

def run(phase3_zip,phase1_zip=None):
    p3=Path(phase3_zip)
    require(p3.exists(),"Phase 3 ZIP not found")
    with zipfile.ZipFile(p3) as archive:
        require(archive.testzip() is None,"Phase 3 ZIP CRC error")
        raw,sha=read_csv_member(archive,"backtest/predictions_dev.csv.gz")
        rows,issues=validate_rows(raw)
        flags=provenance_flags(archive)
    cohort=Counter(r["year"] for r in rows)
    sample_by_pos=Counter(r["position"] for r in rows)
    result={
      "status":"RESEARCH_ONLY_NO_MODEL_PROMOTION",
      "not_an_independent_holdout":True,
      "source":{"phase3_zip_sha256":hashlib.sha256(p3.read_bytes()).hexdigest(),
                "predictions_member_sha256":sha,"prediction_rows":len(rows),
                "classes":{str(k):cohort[k] for k in YEARS},
                "position_counts":dict(sorted(sample_by_pos.items())),
                "missing_id":issues.get("missing_gsis_id",0),
                "training_inputs_present":False,
                "reproduced_scores_not_training":True},
      "limitations":flags+[
        "2019-2022 classes already repeatedly studied; reuse is development analysis.",
        "No raw original CFBD/recruiting/NFL outcome sources inside uploaded Phase 3 ZIP.",
        "Performance targets A/B/C are opportunity-biased participation outcomes, not latent talent.",
        "Drafted-only sample cannot validate undrafted-player discovery.",
        "Model evaluation against public APEX production on identical target/population is not available.",
        "All candidates were previously studied; no retrospective candidate selection or performance promotion."
      ],"outcomes":{}}
    for t in TARGETS:
        outcome={"target":t,"models":{},"paired":{},"by_year":{},
                 "by_position":{},"identity_clean":{"excluded":issues.get("missing_gsis_id",0)}}
        for m in MODELS:
            outcome["models"][m]=metrics(rows,f"{t}_{m}",t)
        for newer,older in PAIRINGS:
            label=newer+"-minus-"+older
            delta=brier(rows,f"{t}_{newer}",t)-brier(rows,f"{t}_{older}",t)
            interval=ci_cluster_exact(rows,f"{t}_{newer}",f"{t}_{older}",t)
            outcome["paired"][label]={
                "delta_brier":round(delta,8),"cluster_bootstrap_95_ci":interval,
                "class_clusters":len(YEARS),"improvement_established":interval[1]<0,
                "eligible_for_promotion":False
            }
        for y in YEARS:
            group=[r for r in rows if r["year"]==y]
            outcome["by_year"][str(y)]={
                "n":len(group),
                "delta_g34_vs_recruiting":round(
                    brier(group,f"{t}_M1G34",t)-brier(group,f"{t}_M1",t),8),
                "delta_raw_production_g2_vs_recruiting":round(
                    brier(group,f"{t}_M1G2",t)-brier(group,f"{t}_M1",t),8)}
        for pos in POSITIONS:
            subset=[r for r in rows if r["position"]==pos]
            if not subset:
                continue
            outcome["by_position"][pos]={
                "n":len(subset),
                "delta_g34_vs_recruiting":round(
                    brier(subset,f"{t}_M1G34",t)-brier(subset,f"{t}_M1",t),8),
                "undersized":len(subset)<50}
        outcome["leave_one_class_out_g34"]={
            str(y):round(
                brier([r for r in rows if r["year"]!=y],f"{t}_M1G34",t)-
                brier([r for r in rows if r["year"]!=y],f"{t}_M1",t),8)
            for y in YEARS}
        if issues.get("missing_gsis_id"):
            clean=[r for r in rows if r["has_id"]]
            outcome["identity_clean"].update({
                "n":len(clean),"delta_g34_vs_recruiting":round(
                    brier(clean,f"{t}_M1G34",t)-brier(clean,f"{t}_M1",t),8)})
        result["outcomes"][t]=outcome
    if phase1_zip:
        p1=Path(phase1_zip)
        with zipfile.ZipFile(p1) as archive:
            require(archive.testzip() is None,"Phase 1 ZIP CRC failure")
            result["phase1_label_inventory"]=phase1_inventory(archive)
    return result

def main(argv=None):
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--phase3-zip",required=True)
    ap.add_argument("--phase1-zip")
    ap.add_argument("--out",required=True)
    opts=ap.parse_args(argv)
    try:
        report=run(opts.phase3_zip,opts.phase1_zip)
        dest=Path(opts.out).expanduser().resolve()
        require(dest!=Path(opts.phase3_zip).resolve(),"output cannot overwrite source")
        require(not dest.exists(),"refuse to overwrite research report")
        dest.parent.mkdir(parents=True,exist_ok=True)
        dest.write_text(json.dumps(report,indent=2,sort_keys=True)+"\n")
        print(json.dumps({
             "status":report["status"],
             "rows":report["source"]["prediction_rows"],
             "outcome_A_M1_brier":report["outcomes"]["A"]["models"]["M1"]["brier"],
             "outcome_A_G34_delta":report["outcomes"]["A"]["paired"]["M1G34-minus-M1"],
             "v3b":report.get("phase1_label_inventory",{}).get("status","not_supplied")},indent=2))
        return 0
    except (ValueError,KeyError,OverflowError,OSError,zipfile.BadZipFile,EOFError) as e:
        print("APEX RESEARCH AUDIT BLOCKED: "+str(e),file=sys.stderr)
        return 2
if __name__=="__main__":
    sys.exit(main())

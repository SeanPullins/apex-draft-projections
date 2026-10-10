#!/usr/bin/env python3
"""Validate APEX Phase 1 evaluation contracts before scoring historical NFL talent.

Separates:
- usable pre-draft comparisons (requires information available as-of forecast)
- ex-post actual-draft-slot diagnostic comparisons (NOT suitable for prospect forecasts)
- label thresholds that are fixed beforehand or estimated only on mature training cohorts.

This is an independent research gate, not a substitute for fully replaying
historical training/selection and not part of the 2027 production engine.
"""
from __future__ import annotations
from datetime import date
import json
import math
from pathlib import Path
import sys
import argparse

from guard_nfl_outcome_maturity import require_valid_fold

class EvaluationContractError(ValueError):
    pass

def req(cond,reason):
    if not cond:
        raise EvaluationContractError(reason)

def parse_iso(value,field):
    req(isinstance(value,str),field+" must be ISO date YYYY-MM-DD")
    try:return date.fromisoformat(value)
    except ValueError as e:raise EvaluationContractError(field+" invalid ISO date") from e

def validate_manifest(data):
    req(isinstance(data,dict),"manifest must be JSON object")
    req(data.get("schema_version")==1,"schema_version must be 1")
    test=data.get("test_draft_year")
    n=data.get("outcome_seasons")
    cohort=data.get("training_draft_years")
    req(isinstance(test,int) and 1900<=test<=2100,"invalid test draft year")
    req(isinstance(n,int) and 1<=n<=10,"invalid outcome seasons")
    req(isinstance(cohort,list) and cohort,"training_draft_years must be a nonempty list")
    # Let the vetted existing historical maturity rule do the calendar check.
    try:fold=require_valid_fold(test,cohort,n)
    except ValueError as e:raise EvaluationContractError(str(e)) from e
    stamp=parse_iso(data.get("forecast_as_of"),"forecast_as_of")
    draft_start=parse_iso(data.get("draft_start_date"),"draft_start_date")
    req(stamp.year==test and draft_start.year==test and stamp<draft_start,
        "forecast_as_of must precede the actual NFL draft start date")
    req(isinstance(data.get("label_id"),str) and len(data["label_id"].strip())>=8,
        "unversioned/ambiguous outcome label: specify a unique versioned label_id")
    req("_" in data["label_id"] and any(ch.isdigit() for ch in data["label_id"]),
        "label_id must include a target and version, not raw A/B/C")
    method=data.get("threshold_provenance")
    req(isinstance(method,dict),"threshold_provenance required")
    mode=method.get("mode")
    req(mode in {"precommitted_fixed","training_label_fit"},
        "threshold provenance must be precommitted_fixed or training_label_fit")
    if mode=="precommitted_fixed":
        dt=parse_iso(method.get("defined_at"),"threshold_provenance.defined_at")
        req(dt<=stamp,"label threshold defined after forecast date")
    else:
        years=method.get("fitted_draft_years")
        req(isinstance(years,list) and years,
            "training-label-fit threshold missing fitted_draft_years")
        req(set(years).issubset(set(cohort)),
            "threshold estimated using classes outside training cohort")
        try:require_valid_fold(test,years,n)
        except ValueError as e:raise EvaluationContractError("threshold hindsight: "+str(e)) from e
        thresholds=method.get("position_cutoffs")
        req(isinstance(thresholds,dict) and thresholds,
            "position-aware label needs frozen per-position cutoffs")
        for pos,v in thresholds.items():
            req(isinstance(pos,str) and pos and
                isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v) and 0<=v<=1,
                "invalid position cutoff for "+str(pos))
    features=data.get("talent_feature_sources")
    req(isinstance(features,list),"talent_feature_sources must be list")
    forbidden={"actual_draft_slot","actual_draft_pick","actual_draft_round","draft_position_actual"}
    for i,feat in enumerate(features):
        req(isinstance(feat,dict) and isinstance(feat.get("name"),str),
            "invalid talent_feature_sources item")
        req(feat["name"].lower() not in forbidden,
            "actual post-draft slot/round cannot enter Talent Engine")
        req(feat.get("is_post_draft") is False,
            "Talent Engine feature includes post-draft data")
        observed=parse_iso(feat.get("available_at"),f"talent_feature_sources[{i}].available_at")
        req(observed<=stamp,"Talent Engine feature available after forecast")
    baselines=data.get("baselines")
    req(isinstance(baselines,list) and baselines,"at least one baseline required")
    outputs=[]
    for i,item in enumerate(baselines):
        req(isinstance(item,dict) and isinstance(item.get("name"),str),
            f"baselines[{i}].name required")
        kind=item.get("kind")
        req(kind in {"pre_draft","hindsight_diagnostic"},
            "baseline kind must be pre_draft or hindsight_diagnostic")
        actual=item.get("uses_actual_draft_round_or_pick")
        req(type(actual) is bool,
            "baseline requires explicit uses_actual_draft_round_or_pick boolean")
        if actual:
            req(kind=="hindsight_diagnostic",
                "actual draft round/pick is only a HINDSIGHT DIAGNOSTIC")
        if kind=="pre_draft":
            req(not actual,"pre-draft baseline cannot depend on actual draft round")
            observed=parse_iso(item.get("available_at"),"baseline available_at")
            req(observed<=stamp,
                "pre-draft market baseline has no as-of-available evidence")
        outputs.append({"name":item["name"],"kind":kind,
                        "usable_for_pre_draft_model_comparison":kind=="pre_draft",
                        "actual_round_used":actual})
    req(any(x["kind"]=="pre_draft" for x in outputs),
        "no genuine pre-draft baseline supplied")
    return {
        "schema_version":1,"forecast_as_of":str(stamp),"target":data["label_id"],
        "fold":fold,"threshold_mode":mode,"baselines":outputs,
        "validation_gate":"PASS_METADATA_CONTRACT_NOT_RAW_REPLAY",
        "warning":"This validator trusts declared feature vintages and does not prove source fidelity or untreated holdout status."
    }

def main(argv=None):
    ap=argparse.ArgumentParser()
    ap.add_argument("manifest")
    args=ap.parse_args(argv)
    try:
        result=validate_manifest(json.loads(Path(args.manifest).read_text()))
        print(json.dumps(result,indent=2))
        return 0
    except (OSError,json.JSONDecodeError,ValueError,TypeError) as e:
        print("EVALUATION CONTRACT REJECTED: "+str(e),file=sys.stderr)
        return 2

if __name__=="__main__":
    sys.exit(main())

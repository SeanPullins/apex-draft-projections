#!/usr/bin/env python3
"""Fail closed on NFL outcome maturity in historical pre-draft backtests.

A first-N-seasons label for draft class Y uses NFL regular seasons:
[Y,...,Y+N-1]. A pre-draft prediction for year T can train only on classes
whose last season ended before T began. Do NOT use historical lookback
features as a substitute for outcome-label availability checks.

Usage:
  python scripts/guard_nfl_outcome_maturity.py --test-year 2019 --training-classes 2015 --n-seasons 4
  python scripts/guard_nfl_outcome_maturity.py --test-year 2018 --training-classes 2015,2016,2017 --n-seasons 4
"""
from __future__ import annotations
import argparse
import json
import sys

class MaturityViolation(ValueError):
    """A training outcome includes an NFL season unavailable before target draft."""

def latest_eligible_training_year(test_draft_year:int,n_seasons:int=4)->int:
    if not isinstance(test_draft_year,int) or not 1900<=test_draft_year<=2100:
        raise ValueError("test draft year must be a plausible integer year")
    if not isinstance(n_seasons,int) or not 1<=n_seasons<=10:
        raise ValueError("n_seasons must be 1..10")
    return test_draft_year-n_seasons

def inspect_fold(test_draft_year,training_draft_years,n_seasons=4)->dict:
    cap=latest_eligible_training_year(test_draft_year,n_seasons)
    years=list(training_draft_years)
    if not years:
        raise MaturityViolation("no historical training classes provided")
    if any(not isinstance(y,int) or not 1900<=y<=2100 for y in years):
        raise ValueError("training years must be plausible integers")
    if len(set(years))!=len(years):
        raise ValueError("duplicate training class in fold")
    invalid=[{
        "training_draft_year":y,
        "last_nfl_outcome_season":y+n_seasons-1,
    } for y in sorted(years) if y>cap]
    report={
        "test_draft_year":test_draft_year,
        "n_outcome_seasons":n_seasons,
        "latest_permitted_training_draft_year":cap,
        "training_classes":sorted(years),
        "invalid_training_classes":invalid,
        "passes_maturity":len(invalid)==0,
    }
    return report

def require_valid_fold(test_draft_year,training_draft_years,n_seasons=4):
    report=inspect_fold(test_draft_year,training_draft_years,n_seasons)
    if not report["passes_maturity"]:
        raise MaturityViolation(
          "FUTURE-OUTCOME LEAK: test "+str(test_draft_year)+
          " cannot train on draft classes "+str([r["training_draft_year"] for r in report["invalid_training_classes"]])+
          "; latest mature draft class is "+str(report["latest_permitted_training_draft_year"]))
    return report

def main(argv=None):
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--test-year",type=int,required=True)
    ap.add_argument("--training-classes",required=True)
    ap.add_argument("--n-seasons",type=int,default=4)
    args=ap.parse_args(argv)
    try:
        years=[int(s.strip()) for s in args.training_classes.split(",") if s.strip()]
        result=require_valid_fold(args.test_year,years,args.n_seasons)
        print(json.dumps(result,indent=2))
        return 0
    except (MaturityViolation,ValueError) as exc:
        print("MATURITY GATE FAILED: "+str(exc),file=sys.stderr)
        return 2

if __name__=="__main__":
    sys.exit(main())

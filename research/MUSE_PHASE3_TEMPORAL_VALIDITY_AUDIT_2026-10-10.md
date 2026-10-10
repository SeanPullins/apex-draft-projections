# Muse Phase 3 independent audit — temporal maturity veto
**Reviewed 2026-10-10. STATUS: RESEARCH ONLY / DO NOT PROMOTE MODEL.**

Submitted private archive: `APEX_Phase3_Predictive_Validation.zip`, SHA256 `39e177e6b941906e29466be9303320bfb620446c72b8162b76cf204b14fa6969`. **No private rows or licensed source files committed.**

## Critical chronology failure in the purported untouched 2018 fold

Muse's frozen `scripts/03_run_backtest_v3.py` specifies `FOLDS = {2018:2017,2019:2015,2020:2016,2021:2017,2022:2018}` (near lines 359–369) and `run_fold` trains on `draft_year <= train_max` (near lines 267–270). The 2018 evaluation's **498 training records are 2015–2017 drafted players**; labels cover the first **four NFL seasons after a player's draft**. In April 2018, the full 2015 outcome through the 2018 NFL season, and 2017 outcomes through the 2020 season, **had not occurred**. This is direct training-label leakage into a claimed historical pre-draft forecast.

For a four-season NFL label and a test draft year T, training draft class y must satisfy **y + 3 < T**; equivalently **y <= T−4**. The most recent eligible training class for a legitimate April 2018 replay would be **2014**. Muse's crosswalk starts in 2015, so **it supplies no eligible mature-label training records for the 2018 fold**. Freezing scripts before executing them does not repair future-label contamination.

**EXCLUDE the 2018 test from all untouched evaluation, pooled five-fold significance claims, and promotion decisions.** It may be retained as an explicitly labeled descriptive hindsight fit, not as genuine validation.

The 2019–2022 folds use permitted caps (2015,2016,2017,2018 respectively), matching first-four-year NFL outcome maturity. They were repeatedly inspected in v1/v2 and are **development evidence only**.

## Arithmetic reproduced independently from supplied predictions

Source `backtest/predictions_dev.csv.gz`: **896 drafted test players**, 2019 n230, 2020 n219, 2021 n227, 2022 n220. The separate invalid 2018 file has n220. Three frozen code SHA256s match the package's freeze manifest; ZIP integrity passed. The raw CFBD, recruiting input and NFL label source tables used for fitting were **not** included, so score calculations were verified, **not** raw extraction/model fitting.

Brier, lower is better, **2019–2022 development only**:

| NFL role target | M0 position-only | M1 recruiting | M1G34 recruiting+opponent | M1G34−M1 | Paired draft-class-bootstrap 95% CI |
|---|---:|---:|---:|---:|---|
| A: NFL role | .235978 | .231901 | .229624 | **−.002277** | [−.01048, +.00355] |
| B: sustained role | .234083 | .232644 | .229843 | **−.002801** | [−.00868, +.00064] |
| C: higher workload | .212312 | .207587 | .204885 | **−.002702** | [−.00704, +.00160] |

These cluster CIs come from independent seeded 10,000-replicate paired draft-class bootstrap of the provided development predictions; all include zero. For outcome A, per-class increments of M1G34−M1: 2019 −.000639, 2020 +.001026, **2021 −.014184**, **2022 +.005007**. 2021 drives the apparent gain and 2022 reverses.

M1−M0 development outcome-A Brier difference **−.004077**, 95% class CI [−.00638, −.00179]; outcome-C **−.004725**, CI [−.00789, −.00138]; sustained role B CI includes zero. This indicates recruiting is a useful historical research prior on inspected cohorts, **not** a validated reason to replace the existing production APEX talent model.

## Further unresolved validity limitations

- **Opportunity-biased labels:** approved APEX Phase 1 review found 180 selections without PFR snap rows; 146 have exact PFR/GSIS weekly roster evidence. No-snap or no-roster entries must not automatically be treated as observed zero intrinsic talent. Need verify outcome semantics and full PFR/GSIS source join.
- **Drafted-only selection:** primary analysis excludes undrafted eligible prospects, so it does not validate a discovery model for the full pre-draft prospect population.
- **Cannot compare against APEX production:** Muse confirms APEX 4.0 QB-only continuous target, whereas M1/M1G34 predict all-position A/B/C. No same-target replay exists; cannot claim an improvement over current APEX.
- **Retrospective reconstruction:** CFBD/other source vintages downloaded in 2026 are not demonstrably historical pre-draft snapshots.
- **Source replay not possible from provided archive:** upstream CFBD responses, recruiting predictor files, feature v2 files and full NFL outcome join are external to the delivered ZIP.
- **Small classes/positions:** only four inspected development draft classes and 23 evaluated dev QBs. All 2018 QB metrics are from the temporally invalid fold.
- **New holdout needed:** complete four-year outcomes for 2023 NFL draft class do not mature until the 2026 NFL season ends in early 2027; do not prematurely evaluate them in October 2026.

## Decision / project gate

**No Phase 3 promotion. No modifications to 2027 ranks or probabilities. Phase 1 label validation remains current approved work.** Preserve M1 as a candidate informed prior and opponent data as research-only. Do not delete collected data; fix chronology and true population/outcome semantics first. Request missing upstream source files in a private, checksummed research archive.

Regression code `scripts/guard_nfl_outcome_maturity.py` and `tests/test_nfl_outcome_maturity.py` add a fail-closed prerequisite for future evaluations: an as-of test date may never train on future-matured NFL outcomes.

The first truly independent eligible future cohort must be prospectively registered before outcome labels mature. Claude should red-team this chronology and opportunity-bias issue; Muse must re-run the corrected research before any candidate is considered for APEX.

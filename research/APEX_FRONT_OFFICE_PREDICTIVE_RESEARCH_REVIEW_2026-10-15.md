# APEX Independent Front-Office Research Review — 2026-10-15

**RESEARCH ONLY · NO PRODUCTION PROMOTION.** Objective: prove that pre-draft APEX information outperforms credible alternatives at predicting future NFL contribution, without disguising draft capital as talent or hindsight as foresight.

## Evidence audit

- Public README explicitly warns that legacy v10 calibration reused evaluation labels, later 2022–2026 scores were retrospectively revised, and the complete production model/raw legally authorized inputs live elsewhere. Public score payloads alone cannot reproduce the current Talent Engine training.
- Muse Phase 3 ZIP: 896 **drafted** 2019–2022 development observations (2019 n230, 2020 n219, 2021 n227, 2022 n220); original training/recruiting/NFL label source rows absent. Reproduced exported prediction arithmetic, **NOT source-to-model training**.
- Its proposed untouched 2018 evaluation is invalid: models train on 2015–2017 draftees' complete four-year NFL outcome labels (up to 2020), unknown at the April 2018 NFL Draft. See the already merged Muse Phase 3 temporal audit. Disallow all 2018 claims as independent validation.
- Muse Phase 1 ZIP has 5,766 V3b high-workload label rows, 11 with blank GSIS ID, six repeated GSIS/year keys, **no V3b prediction export**. No defensible validation of a V3b predictive edge.
- In nflverse-based APEX Phase 1 source audit: 2,558 selections drafted 2013–2022; 2,333 recorded with snaps, 180 missing from snap records, 146 of these matched to rosters using exact PFR/GSIS, 34 remain unmatched, and 45 unsupported position assignments. Never equate no record, no opportunity, and no talent.
- APEX production has not been replayed on the same labels or players as Muse, and archived truly pre-draft consensus boards are not proven available/rights-cleared. **No credible APEX-vs-market win has yet been demonstrated.**

## Recomputed development performance

All numbers below come from the uploaded Phase 3 predictions for 896 drafted 2019–2022 prospects; the first-four-year outcomes A/B/C are snap-based participation/workload, **not intrinsic NFL talent**.

| Outcome | M0 position Brier | M1 recruiting Brier | M1+G34 opponent Brier | G34 minus M1 | Exact class-bootstrap 95% CI |
|---|---:|---:|---:|---:|---|
| A: NFL role | .235978 | .231901 | .229624 | **−.002277** | [−.010483, +.003548] |
| B: sustained role | .234083 | .232644 | .229843 | **−.002801** | [−.008683, +.000638] |
| C: high workload | .212312 | .207587 | .204885 | **−.002702** | [−.007043, +.001600] |

Exact bootstrap enumerates 4^4 = 256 ways to draw four entire draft classes with replacement, preserving paired player outcomes. All CIs include zero. Historical cohorts already inspected; class-level uncertainty is weak with only four time units.

- A G34−M1 by year: 2019 −.000639, 2020 **+.001026**, 2021 **−.014184**, 2022 **+.005007**. Without 2021, A delta becomes **+.001763** (n669): direction reverses.
- Position-level discrepancy: Muse's position report uses QB **n23** while the supplied full prediction export includes QB **n41**. Reported position totals sum to **878** rather than **896**; investigate the missing 18 quarterbacks/eligibility filter before citing any QB position effect.
- Raw production G2 added to recruiting **worsens** Brier by +.004979 A, +.005107 B, +.013064 C.
- Pure opponent G3 without evidence-quality G4 improves A −.002370 vs M1, essentially the same as G34 −.002277: complexity G4 not justified by A Brier.
- G345 adds transfer/consistency/interaction ideas; A delta −.000222 vs M1, worse than G34.
- A: 10 equal-size-bin calibration ECE (a diagnostic, NOT logit calibration slope) is **.02793 M1** and **.04280 G34**. Do not claim that every calibration measure improves.
- Worst G34-vs-M1 A regressions include downgrading players with positive observed role outcomes such as Brian Robinson Jr. (2022), Khalil Herbert (2021) and Alec Pierce (2022), while it successfully downgraded non-role outcomes for Gerrid Doaks, Ben Mason and Amari Rodgers (2021). These are examples, not causal mechanisms.

### Verified improvements vs hypotheses

- **Verified:** calculations on submitted exported prediction rows, chronology invalidity of 2018 claim, absence of V3b prediction data, no opportunity-neutrality of snaps, class-specific fragility.
- **Promising but NOT promotion-ready:** recruiting signal versus position-only on explored cohorts; G3 opponent context may help selected positions/years; a properly versioned V3b can be studied as *secondary workload*, never direct quality.
- **Unsupported:** current APEX is better than consensus, advanced G34 improves real out-of-sample performance reliably, 2018 was untouched, V3b has validated forecast accuracy, or draft-round association quantifies causal opportunity effects.

## Three highest-value weaknesses and falsifiable experiments

### 1. Outcome/selection bias — TOP PRIORITY

**Football mechanism:** Draft investment changes snaps, depth-chart access and coaching patience; four-year playing time records actual realized opportunity plus talent, not pure ability. Undrafted players and unverified no-snap cases are selected/missing.

**Hypothesis:** Separate first-four-year realized impact, first-three-year opportunity probability and opportunity-conditional positional efficiency will improve honest out-of-year calibration and discovery. The null is that added labels do not improve forecasting or cannot be measured reliably.

**Exact evidence:** nflverse historical drafts, full 2013–2025 snap-count and weekly roster source; exact PFR/GSIS crosswalk; team-game offense/defense denominator; play-level NFL pbp/player stats for positions where events are attributed. Raw film pressure, true routes and coverage assignments are **unavailable/licensing-unverified**, never inferred from sacks/defensive snaps. Existing roster reconciliation has 34 unresolved and 45 unsupported position classes. Muse V3b labels lack fold-specific inputs and predictions.

**Method/tools:** Version original A/B/C separately from approved APEX Y3 role threshold (>=50% in one of Y1–3 OR >=30% in two Y1–3) and candidate V3b Y2–4 position-75th percentile threshold. Fit percentiles from fully matured TRAINING classes only; check source gaps, zero vs unknown, stratification by historical actual round **as hindsight diagnosis**. If eligible denominators exist, test two-part P(exposure) x conditional quality with regularization and uncertainty. Code base: phase1_nfl_snap_baseline.py, phase1_roster_reconciliation.py, guard_opportunity_evaluation.py. No training allowed before Phase 1 gate approval.

**Predeclared win/kill:** >=95% verified exact identity and denominator coverage in supported drafted cohorts; zero unverified entries labeled as true zero. Subsequent fresh-cohort paired Brier improvement <=−.005 AND upper class-level 95% CI below zero versus M1 baseline, with no adequately supported position deteriorating >.005. If conditional quality is unobservable, report UNKNOWN and do not create fictitious grades. If gain fails, keep descriptive opportunity labels only.

### 2. Invalid/unreproducible production accuracy — HIGH PRIORITY

**Mechanism:** Recalibrating on evaluation labels, historical revisions, data-vintage errors and even future four-year labels masquerading as contemporaneous training can manufacture a "winning" backtest.

**Hypothesis:** A reproducible fully pre-draft-frozen APEX prediction still beats conventional pre-draft position/recruiting/consensus under identical players/outcomes. Null: APEX's apparent advantage disappears.

**Exact evidence:** private APEX training code and verified source features; explicit release/vintage and forecast date per row; NFL label as-of dates; raw source/signed receipts; real pre-draft market snapshot only if date-archived and rights-cleared. These original inputs are currently NOT all attached or in public repo.

**Method/tools:** SHA-pinned source-to-feature-to-model replay; fail-closed chronology (training draft y <= test year − n outcome seasons); nested preprocessing/imputation/calibration fitted on training only; forecast timestamp before actual draft; matched-player position/recruiting and published historically dated market baseline. Actual round only an EX-POST ORACLE. Pair Brier, log loss, AUC, calibration, top-decile scouting discoveries; class-block bootstrap, position errors, and source cohort registry. Existing scripts: guard_nfl_outcome_maturity.py, guard_opportunity_evaluation.py, evaluate_candidate.cjs, and the new read-only audit_muse_signal.py. Do NOT reuse 2019–2022 as fresh untouched.

**Predeclared win/kill:** All prediction rows replay within 1e−8; 0 future leaks or unresolved identity joins in evaluation; positive pre-registered matched improvement in BOTH Brier and log loss with class-bootstrap upper CI below zero in genuinely untouched future classes. If fails, publish negative evidence and retain simple model. No training before Phase 2 approval.

### 3. Unstable incremental college signals — HIGH PRIORITY

**Mechanism:** Opponent weakness, age, competition level, production volatility, positional interaction and missing opportunities can hide true player development; unregulated feature additions also amplify noise and selective success.

**Hypothesis:** A position-specific, training-only pregame-opponent-aware college progression measure adds repeatable lift over position plus recruiting. Null: observed 2021 gain is an unstable cohort effect.

**Exact evidence:** Muse CFBD 2014–2021 college game/source observations and recruiting; original opponent game exposures/kickoff/available-at receipts; 2026 CFBD prospective cohort (source timestamps separated from retrospective extraction). Full historical CFBD and recruiting upstream records NOT all present in provided ZIP; no automatic additional API calls. nflverse NFL target from #1. Film charting only with appropriate license.

**Method/tools:** Pre-register M1 vs M1G2 (raw), M1G3 (opponent), M1G34 (opponent+evidence-quality), M1G345 (transfer/development), using same population; build L2 logistic and position-shrunk hierarchical priors first, then gradient boosting / nonlinear age-development interactions ONLY after demonstrated lift, with nested chronological training and as-of provenance. Conduct game-source permutation negative controls, leave-one-class-out stability diagnostic, missingness ablations. Existing predictions audited via NEW audit_muse_signal.py with equal-sample Brier/log loss, AUC, 10-bin ECE and exact four-class bootstrap.

**Predeclared win/kill:** In genuinely untouched future cohorts, candidate reduces Brier >=.005, improves log loss, 95% class-block paired upper CI below 0, improves at least 3 individual draft classes, and no adequately sampled position is harmed >.005 Brier. Current opponent group FAILS stability/uncertainty: don't deploy it.

## Runnable research now (no model fitting, no API keys)

    python3 scripts/audit_muse_signal.py \
      --phase3-zip /private/APEX_Phase3_Predictive_Validation.zip \
      --phase1-zip /private/APEX_Phase1_Reproducibility_Package.zip \
      --out /private/APEX_signal_aggregate.json

- Script uses Python standard library, does NOT execute code from either uploaded ZIP; outputs aggregate JSON only. CI regression tests use synthetic records; actual private ZIP stays outside public GitHub.
- Existing Phase 1 snap and roster workflows can be rerun privately with source SHA receipts. Exact source-to-model training cannot yet be reproduced; no claim to the contrary.

## Sequencing / independent proof

1. **Current authorized Phase 1:** fix identity/denominator/source rights, record actual versioned outcomes and missingness; user approval needed for next phase.
2. **Phase 2 (on approval):** end-to-end private APEX source/model replay with feature-and-label availability dates, public source rights and class/source checksums.
3. **Phase 3 (on approval):** frozen challenger experiments with identical targets, strong pre-draft baselines, position-specific uncertainty, class-wise stability. Reject unnecessary complexity.
4. **True future proof:** time-stamp/freeze 2027 APEX predictions and pre-draft consensus now, before NFL Draft 2027. The full four-year NFL outcome of the 2027 class cannot mature before the **2030 NFL season completes**; first-year outcomes can be tracked only as separate partial targets.
5. **Only afterward:** market draft availability and team decision portfolio modeling. Do not invest in new UX/model features before proven Talent advantage.

**Legal gate:** PFF consumer access is not blanket permission for public/commercial competitor models or redistributing raw/derived datasets. PFF terms updated October 12, 2026 must be reviewed for rights of historical training and existing published PFF-derived content: https://www.pff.com/terms . Other nflverse/CFBD/PFR/ESPN/RAS rights separately require a source registry. Do not scrape/repackage protected film/charting.

**Ultimate gate not yet met:** Demonstrated prospect forecasting improvement versus honest, contemporaneous consensus and recruiting baselines for an untouched future cohort, with reproducible evidence and estimated real-team selection-value gains.


## October 15 amendment: private APEX v19 is available and separately replayed

After the first audit, the connected **private** repository SeanPullins/nfl-prospect-dataset-private proved accessible. Its V19 source script, model metadata, frozen summaries and saved compressed predictions ARE present there. This upgrades the status from "public-only model unavailable" to **private saved V19 predictions independently replayed, but source-to-model fitting and contemporaneous source availability not independently replayed**.

A read-only independently implemented private audit was merged in PR #46 (separate private repo). It validates:
- SHA256 of the original compressed private V19 predictions against frozen summary.
- 3,638 unique draft pick/outcome prediction records: **1,826 hit4** and **1,812 starter4**.
- 16 declared mature training-window folds, 2011–2018 test drafts, four-year label training cap <= test year − 4.
- Recomputed Brier, log loss and AUC for market, existing_features, logistic, boost, blend, no_pick; all matches to saved summary within 1e−9.
- Fresh 10,000-replicate **paired class-block uncertainty** on identical rows, separately all positions and QBs. All results remain previously inspected historical classes, not untouched validation.
- NO change in production APEX scores. No raw or player-level private PFF input released.

**V19 hit4, all positions (n1,826):** market Brier **.155680**, existing feature model **.155218**, market/boost blend **.154621**, no actual-draft-pick model **.187600**. Reproduced blend−market Brier delta **−.001059**, 95% class-bootstrap **[−.002073, −.000097]**; corresponding log-loss improvement CI also below zero. A *small historical improvement on the already-explored outcome*, NOT independent validation that pre-draft APEX is superior.

**V19 hit4, QBs only (n78):** market **.144594** Brier, existing features **.153289**, market/boost blend **.155051**, no-pick **.194380**. Reproduced blend−market delta **+.010457**, 95% class-bootstrap **[+.001355, +.020764]**. The draft-market baseline wins this historical QB comparison.

**V19 starter4, all positions (n1,812):** market **.165220**, blend **.163594**, Brier delta **−.001627** with class CI **[−.003308, +.000053]**, including zero. No established advantage.

**Crucial information-set distinction:** V19 explicitly uses actual draft slot/round, pick-value curves and draft-market priors in market and blend model features. Those are valid for a POST-DRAFT expectation and may predict team opportunity; they are **not available as actual selections before the NFL Draft** and must not be presented as a fully independent pre-draft Talent Engine. The no_pick challenger uses a different information set and cannot be presented as a pure algorithmic defect just because it loses to draft-market information.

V19's versioned target definitions also differ sharply from Muse's A/B/C:
- hit4 = top quartile of first-four-year Approximate Value within draft class and position, with AV >= 1.
- starter4 = two of first four seasons with at least eight NFL starts.
Neither is a licensed position-specific snap/rep quality label. V19's archived features include market, combine/RAS, college production and private PFF-derived inputs; **data-use rights require explicit review**.

Links (private permission required):
- https://github.com/SeanPullins/nfl-prospect-dataset-private/pull/46
- https://github.com/SeanPullins/nfl-prospect-dataset-private/blob/main/scripts/independent_replay_apex_v19.py
- https://github.com/SeanPullins/nfl-prospect-dataset-private/blob/main/reports/apex_v19/protocol.json

**Scientific implication:** Two different model families are now empirically documented: (1) APEX V19 post-draft market-conditioned 4Y AV/starter predictions; (2) Muse slot-blind recruiting-based role/workload predictions. Their numbers cannot be compared or blended without a matched common outcome, age/as-of horizon, universe and information set. The best immediate challenger is a **legally clear slot-blind talent model evaluated separately from the strong market baseline**. No market simulation/decision optimizer should be promoted before this has demonstrated incremental decision utility.

# APEX 2027 Muse evidence: five-stage gate execution

**Date:** 2026-10-08  
**Verdict:** **HOLD — no live score, rank or uncertainty promotion.**  
**Scope:** Public-safe diagnostic report of Muse's 2026-10-08 attachment, official public source checks, and existing historical backtests. Private licensed raw data are not uploaded here.

## 1. Dataset completeness — BLOCKED

- Frozen work queue: **201 prospects** (`research/muse_evidence_queue_2027.json`).
- Received file length: **2,097,152 bytes**; JSON terminates inside an unfinished string for another record.
- A non-importing diagnostic recovers **114 complete players** before the broken object. **87 ranks** from the frozen 201-player queue are not yet represented by complete recoverable records; this does **not** establish that Muse never researched them.
- Recovered subset: 7,363 metric entries, 109 self-labeled `VERIFIED`, 3 `HISTORICAL_ONLY`, and 2 `SOURCE_RECEIVED_PENDING_CHECK`. Labels are *claims of data coverage*, not forecast reliability.
- Use `python3 scripts/validate_muse_evidence.py --evidence /path/to/private/muse.json --queue research/muse_evidence_queue_2027.json --partial-recovery --report /path/to/private/intake-summary.json`.
- A partial recovery **never passes** the structural gate. Demand complete re-export with manifest, chunk hashes, record counts and exact identity keys.

## 2. Conflict review — BLOCKED

- **64 players** have conflict notes, **81 conflict notes** in the recoverable portion.
- **62** of those players are simultaneously marked `VERIFIED`; this is an evidence-state/workflow inconsistency, not necessarily 62 incorrect facts.
- Classify each conflict: `STALE_WINDOW`, `DIFFERENT_DEFINITION`, `ROLE_OR_IDENTITY`, `SOURCE_UNAVAILABLE`, `RESEARCH_ERROR`, or `UNRESOLVED`. Do not collapse a season-count discrepancy into an assumed truth without matched games and counting conventions.
- In the original intake, **Jordan Seaton** has no conflict item for the 2025 difference noted below: conflicting cases must also be *discovered* during independent source sampling, not merely read from the Muse conflicts array.

## 3. Official-source spot checks — PARTIALLY COMPLETED

| Prospect | Official/public cross-check | Audit disposition |
| --- | --- | --- |
| CJ Carr (#20) | Notre Dame officially reported **1,197 passing yards and 13 passing TDs through five games** as of October 5, 2026. Muse's 2026 CFBD volume is lower although its notes cite five games. [Notre Dame](https://fightingirish.com/news/2026/10/05/carr-named-to-davey-obrien-great-8). | **STALE_WINDOW / pending refresh:** verify game-by-game snapshots, and separately resolve the already-flagged 2025 PFF-vs-CFBD scope difference. |
| Kade Pieper (#38) | Iowa's official 2026 bio says **right guard in the first five games**. [Iowa](https://hawkeyesports.com/sports/football/roster/player/kade-pieper). | **ROLE clarified (2026): right guard.** Keep exact play-by-play alignment and private provider snapping totals pending original-source verification. |
| Jordan Seaton (#9) | LSU's bio for the Colorado 2025 season says **one sack and three penalties**, whereas Muse's private 2025 charting metrics have different counts. [LSU](https://lsusports.net/sports/fb/roster/player/jordan-seaton). Colorado's bio independently reports one sack and five pressures; team snap totals differ between LSU and Colorado bios. [Colorado](https://cubuffs.com/sports/football/roster/Jordan-Seaton/17759). | **DIFFERENT_DEFINITION / unresolved:** check provider, play responsibility and official 2025 season window; do not overwrite private observations with team-bio numbers without provenance. |
| Nico Iamaleava (#105) | Muse itself identifies apparent 2026 CFBD volume lag. [UCLA roster](https://uclabruins.com/sports/football/roster/player/nico-iamaleava) establishes identity but not a matching current five-game quantitative snapshot. | **PENDING independent window audit**, not verified by roster alone. |

**Private provenance check:** 4,442 `licensed-pff-private` and 2,113 `licensed-cfbd` metric entries do not have per-field web URLs; receipts and exact access rights must be verified privately. A missing URL alone does not prove a licensed entry inaccurate.

## 4. Historical model validation — EXISTING BASELINES REVIEWED, NEW MUSE CANDIDATE BLOCKED

The private repository already provides frozen historical research, but none backtests this incomplete Muse delivery.

- `reports/apex_v10/backtest_summary.json`: the historical market/draft-slot-dependent comparator reports **hit Brier 0.1510** and **starter Brier 0.1591**. It is not an acceptable **draft-slot-free** baseline for the requested prospect discovery use case without declaring that difference.
- `reports/qb_v9/five_model_summary.json`: the exploratory QB *translation* branch improves Brier **0.17258 -> 0.16299** against its own reported baseline, but exploratory **ceiling**, **floor**, and **bust** branches have **worse** Brier scores than their respective baselines. These four tasks have different labels, cohorts and horizons: **never average or compare their Brier scores as one leaderboard**. All are explicitly `experimental_do_not_publish`.
- `reports/apex_qb_quality_validation/summary.json`: a separate 2019–22 exploratory QB passing-quality test reports **MAE 0.10115 age-only vs 0.10055 age + college box score on 16 QBs** while RMSE worsens. This is **not** evidence that the uploaded Muse evidence improved live APEX.
- A genuine next test requires complete accepted Muse data *and* historical, timestamp-valid equivalents for mature draft classes; hold out draft years, fit without future-season leakage, and compare candidate versus appropriate **no-draft-slot baseline** on common eligible players. Register targets and metrics before inspecting test outcomes; evaluate Brier, log loss, AUC, calibration, uncertainty bands, position slices and missingness stability.

## 5. Promotion — NO GO

**Decision:** No accepted Muse candidate, no equivalent historical version of the Muse scouting fields, no new out-of-sample evaluation. Consequently **no live APEX ranking, probability, confidence color, or team-fit estimate is changed**.

**Implementation in this branch:** `scripts/validate_muse_evidence.py` and synthetic tests provide repeatable, licensed-value-safe completeness and integrity checks. Even a structurally complete and conflict-free JSON would receive `promotion_gate: BLOCKED_REQUIRES_INDEPENDENT_SOURCE_AUDIT_AND_HISTORICAL_BACKTEST`; source truth and actual forecast improvement are different tests.

## Required handoff from Muse

1. Valid 201-player export, chunk hashes, completed manifest; place raw licensed data in an authorized private channel only.
2. Reconciliation for all 81 recorded conflicts **plus new official-source mismatches**; paired provider/source and matching game windows.
3. Source license and identity audit, season participation, and a separate historical-only category when 2026 opportunities are truly absent.
4. Proposed *feature changes* and validation-ready historical analogs; cannot merely feed 2026 grades to a backtest of older draft classes.
5. An explicit promote/hold decision **after** chronological pre-draft backtesting; until then scores are frozen.

Related: [Audit](./MUSE_EVIDENCE_AUDIT_2026-10-08.md) · [Handoff](./MUSE_EVIDENCE_HANDOFF.md) · [Issue #22](https://github.com/SeanPullins/apex-draft-projections/issues/22).

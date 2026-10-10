# APEX historical Muse SLIM package — independent research audit

**Audit date:** October 9, 2026 ET
**Package:** User-uploaded `apex_historical_package_SLIM.zip`
**Verdict:** **HOLD** for public player statistics, prospect confidence, or NFL predictive-model promotion. Research-only evidence.

## Independently verified from the supplied SLIM archive

- 13/13 derived files in `build/MANIFEST.json` match both SHA-256 and byte-size receipts. **The original CFBD raw responses/manifest were excluded**; derived-file integrity is NOT proof of source authenticity or complete replay.
- Crosswalk contains **201** board prospects, **199** with athlete IDs; staged prospect games cover **177** players. **156** have two-year 2024/25 feature rows.
- Independently parsed **3,550** enriched prospect-games: 2023 **509**, 2024 **1,311**, 2025 **1,730**; 2024/25 combined **3,041**. Distinct 2023–25 player-game IDs have no duplicate (season/game/player) rows.
- Opponent-context presence: **80.1%** rolling defense metrics, **92.3%** pregame Elo. Coverage DOES NOT validate that all denominators or source vintages are usable.
- **148** crosswalk entries are marked `medium` confidence, **51** `high`, **2** `none`. Independent historical ID and alias checking remains required.
- Independently reran supplied leave-one-player-out *college-to-college* code on **155** players: raw efficiency RMSE **1.8473** vs adjusted-only **1.9044** (**worse**). Raw+adjusted RMSE **1.7354**, but paired t p≈**0.0565**, Wilcoxon p≈**0.0797**; **not an established improvement**. Excluding the 2025-derived transfer flag yielded RMSE raw **1.7838**, adjusted **1.8412**, combined **1.6766**; conclusion unchanged.
- These tests do **not** evaluate professional/NFL success outcomes. The supplied mature NFL outcome cohorts and the 2027 prospect college seasons have **no matched class/time window**.

## Explicit methodological and provenance blockers

1. **Source replay incomplete:** the 45 claimed original 2023–25 CFBD API responses, original raw provenance manifest, and rights memo are missing from the SLIM archive. The README also states **46 API calls** while reports describe **42 weekly + 3 schedules = 45**; actual quota cannot be independently determined here.
2. **Incorrect 2025-season note:** Muse describes 2025 as 'incomplete' during October 2026. By then the regular season was completed. Its game data are correctly described as **regular-season-only, omitting postseason**; do not annualize or mark 2025 as an in-progress season.
3. **Look-ahead in opponent 'strong' category:** the Muse implementation ranks each team's **maximum pregame Elo across the final entire season**, which contains future information relative to early games. This label is not a purely pregame strength classification. Replace with kickoff-local strength rankings.
4. **Incomparable efficiency denominators:** QB passing+rushing yards/opportunities are compared against an opponent's aggregate offensive yards/play allowed; WR/TE yards/catch are compared against opponent passing yards/attempt. Defender DL/LB/DB 'adjustments' subtract a tempo/opportunity factor, **not a validated opponent-quality difficulty measure**. Do not describe these as calibrated position-specific defensive quality.
5. **Inadequate exposure gates:** three non-null opponent games may still represent very few athlete opportunities, and per-player opponent coverage is not required to pass a robust opportunity share. Require position-specific denominator floors, opportunity-weighted expected production and a coverage threshold.
6. **Reviewed Player DNA season reconciliation:** compared 20 existing public pilot profiles across 2024/25: **11/40** year/player rows match both yardage and opportunity totals; **29/40** differ, largely explained by the absence of postseason. Some regular-season-derived totals *exceed* public full-season values, so don't silently dismiss every discrepancy as postseason. Resolve differences with original receipts and source as-of dates.
7. **Statistical validation:** group sizes as small as TE n=8; correlations within teams and positions and the lack of draft-class chronological holdouts constrain inference. Marginal paired tests are not sufficient for an NFL predictive claim.

## Correct next research actions

1. Obtain the **complete privately held** raw CFBD response package, raw source provenance/checksum manifest, license/rights memo, and the actual 45-vs-46 request receipts. Keep all raw responses off this public repository.
2. Independently verify the **148 medium-confidence** athlete IDs, prioritizing top-ranked prospects/transfers and 20 existing Player DNA profiles.
3. Reconcile 2024/25 completed regular season against existing public all-games/bowl-inclusive season totals, with provider revision and game-scope notes; remove the incorrect '2025 incomplete' interpretation.
4. Rebuild pregame strong-opponent classification without full-season maxima; separate QB pass and run rates, use comparable WR/TE opportunity denominators, and relabel tempo corrections as **opportunity adjustment**, not opponent quality.
5. Obtain authorized 2014–2021 game-level history (~120 historical calls is a planning estimate, not quota guarantee) and mature draft-cohort identity joins. Preserve true retrospective `retrieved_at` timestamps. Run frozen **chronological NFL draft-class** holdouts against APEX no-draft-slot baseline before considering any scoring change.

**Production gate: HOLD.** Do not upload these derived rows to `data2027.js`, public Player DNA or Pages. No licensed raw data, private source IDs, player-level NFL outcome rows or commercial rights assertions were incorporated here. Existing user data stay private.

**Reproducibility within SLIM ZIP only:** run `build/backtest_assessment.py` from extracted `build/` after installing NumPy, pandas, SciPy and scikit-learn. This reproduces the above research comparison, not CFBD raw acquisition or NFL success.

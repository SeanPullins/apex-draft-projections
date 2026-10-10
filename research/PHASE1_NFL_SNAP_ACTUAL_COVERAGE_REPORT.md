# Phase 1 NFL Opportunity Outcomes — Actual Source Audit

**Run:** 2026-10-09 ET / 2026-10-10 UTC. Workflow 38021496062.
**Status: VERIFIED SOURCE INGESTION; PHASE 1 NOT YET COMPLETE.**
No changes to 2027 rankings, predictions or live player data.

The new APEX Phase 1 Python build obtained draft-pick and annual 2013–2025 NFL snap-count CSVs from the nflverse-data releases. It checked SHA-256 receipts, required source columns, draft-year/pick uniqueness, and game-season completeness. Approximately 31 MB of downloaded provider records were kept in a temporary GitHub Actions runner, **not published**. An aggregate-only JSON with source receipt hashes, class-level coverage and 70 preliminary reference cells is available in the 7-day Actions artifact named apex-phase1-nfl-aggregate-audit.

## Verified counts

| Cohort | Count |
|---|---:|
| 2010–2022 NFL draft selections in current PFR release | 3,320 |
| 2010–2012 picks lacking complete four-year snap feeds | 762 |
| 2013–2022 core picks with all four NFL source years | 2,558 |
| Drafted players matched to at least one regular-season snap entry | 2,333 |
| No snap entry, not proven zero talent or even zero eligible snaps | 180 |
| Position categories excluded pending role-aware mapping | 45 |
| Regular-season player/game rows collected, 2013–2025 | 310,476 |
| Regular-season games represented, 2013–2025 | 3,407 |
| Preliminary conditional position/pick-band baseline estimates | 70 |

The nflverse 2012 snap-count CSV release contains only **154 bytes** (a header-only source), while the 2013 release is approximately 2.1 MB. Thus, contrary to the documented loader start year, the empirically viable first **complete drafted cohort is 2013**. A separate older draft-data source has 3,319 picks through 2022, one fewer because its 2019 count is 253 versus 254 in the current release. Reconcile that source-version difference before finalizing the model registry.

### Matched participants by class (2013–2022)

| Class | Recorded player | No entry, unknown | Position unsupported |
|---|---:|---:|---:|
| 2013 | 226 | 24 | 4 |
| 2014 | 223 | 30 | 3 |
| 2015 | 225 | 29 | 2 |
| 2016 | 232 | 16 | 5 |
| 2017 | 224 | 25 | 4 |
| 2018 | 233 | 16 | 7 |
| 2019 | 230 | 19 | 5 |
| 2020 | 241 | 8 | 6 |
| 2021 | 249 | 6 | 4 |
| 2022 | 250 | 7 | 5 |

### Exploratory expected snaps, NOT NFL draft surplus

These are four-year offensive-plus-defensive snaps for drafted players **conditional on appearing in the snap feed**. Players with no entries are not called busts or replaced with zero values. Estimates use position-and-pick-band shrinkage to the pick-band mean (20 pseudo-observations), 400 class-bootstrap replicates, and explicitly report sample size.

| Draft slot | QB four-year snaps [95% class CI], n | WR four-year snaps [95% class CI], n |
|---|---|---|
| 1–16 | 2,926 [2,699, 3,153], 24 | 2,700 [2,466, 2,942], 21 |
| 33–64 | 2,015 [1,826, 2,217], 7 | 2,123 [1,964, 2,284], 51 |
| 101–150 | 893 [732, 1,163], 17 | 1,014 [909, 1,138], 54 |
| 201–300 | 503 [342, 659], 13 | 487 [391, 594], 58 |

These participant-conditional curves are *not* a whole-draft expected-value baseline because the 180 no-entry selections have not been independently reconciled. Snap volume reflects realized playing time and draft investment, **not intrinsic skill**. The all-class 2013–2022 curve is retrospective only; the script also computes forward-reference training curves for 2020–2022 using only NFL classes with matured four-year outcomes by the forecast draft date.

## Remaining Phase 1 acceptance items

1. Resolve all 180 no-entry draft selections against weekly rosters and exact PFR/GSIS IDs. Genuine observed zeros, source missing and identity conflicts must stay separate. A participant-only average cannot become a surplus target until this is resolved.
2. Independently verify team-game unit snaps and player roster-eligible zero-snap games. The approved annual snap-share definition (50% in one year / 30% across two years) remains UNCOMPUTED. The script's absolute-snap role_y3_proxy is illustrative, not a promotion-ready label.
3. Verify hybrid DE/DL/OLB/DB position group assignments and seek legal/quality-specific positional performance denominators. No defensive pass-rush or coverage efficiency has been invented.
4. Map the eligible undrafted prospect population; a drafted-only cohort is selection-biased and cannot validate the complete discovery problem.
5. Review actual provider source licensing, attribution and ML-use rights; nflverse-data states CC BY 4.0 but PFR-derived inputs may warrant additional rights review.
6. Preserve true as-of data-vintage limitations: the source feed downloaded in 2026 cannot independently prove what was available before any historic draft. Prior 2019–2022 Muse analyses are development, not new untouched validation.

**User phase gate:** Phase 1 is partially built and empirically verified. Do NOT retrain the Talent Engine, calculate monetary surplus, start Phase 2 or deploy anything until these gaps have been reviewed and the user approves the completed Phase 1 output.

Sources: https://nflreadr.nflverse.com/reference/load_draft_picks.html ; https://nflreadr.nflverse.com/reference/load_snap_counts.html ; https://github.com/nflverse/nflverse-data/blob/main/LICENSE.md .

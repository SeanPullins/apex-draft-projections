# Phase 1 Red-Team Review — Claude

Date: 2026-10-10 · Scope: `phase1_nfl_snap_baseline.py`, `phase1_roster_reconciliation.py`, Phase 1 RFC and reports · Production impact: **NONE**

## Reproduction

Re-ran both scripts against live nflverse-data releases (2026-10-10 download). Counts reproduce exactly: 3,320 picks; 2,558 core; 2,333 participants; 180 no-snap; 45 unsupported; roster recovery 71 PFR + 75 GSIS + 34 unmatched. Probe script and fixtures are aggregate-only; no player identifiers are published.

## Prioritized defects

### D1 — Excluding no-snap players creates survival bias where APEX most wants to claim edge (HIGH)

The 180 are concentrated in late picks. Measured four-year unit snaps, participants-only vs. treating the 180 as zero:

| Pick band | Participants only | No-snap = 0 | n participants / n no-snap | Inflation |
|---|---:|---:|---:|---:|
| 1–32 | 2,585 | 2,585 | 320 / 0 | 0% |
| 33–100 | 1,826 | 1,793 | 667 / 12 | +2% |
| 101–200 | 997 | 935 | 913 / 61 | +7% |
| 201–300 | 529 | 424 | 433 / 107 | **+25%** |

Day-3 "sleeper beats slot" comparisons are exactly where this bias lands. Holding these rows as permanently UNCONFIRMED is not neutral; it removes the worst outcomes. **Fix:** report every by-pick baseline as a bound pair (excluded / zero) until reconciliation is done, and never compare a prospect to the participant-only curve alone.

### D2 — The "0 confirmed true zeros" verdict is more conservative than the evidence (HIGH)

Probes show the snap feed is complete (every regular-season game present, 256/272 per season; only gap is the cancelled 2022 BUF–CIN game) and has no missing snap values. Alternate-ID recovery is zero: no no-snap player's GSIS roster record carries a different PFR ID, and the draft PFR ID appears in the snap feed in-window for none of them (7 appear only after year 4). So the 180 are **not** a snap-feed ID problem.

For the 71 PFR roster matches, in-window roster statuses are dominated by CUT (55), DEV/practice squad (52), RES/IR (30), INA (10); only 32 were ever ACT. A player rostered in-window with a complete game feed and no snap row has **observed zero offense/defense snaps**. That matches the RFC's own `NO_OBSERVED_OPPORTUNITY` state (zero realized role, null conditional quality, not zero talent). **Fix:** assign `NO_OBSERVED_OPPORTUNITY` with a reason sub-code (IR, practice squad, cut, inactive, active-no-snap) when identity is exact and the window's schedule is complete. Keep the 34 roster-unmatched as `SOURCE_MISSING` pending crosswalk.

### D3 — GSIS-only roster matches lose their status evidence (MEDIUM, code)

`roster_evidence()` builds `gsis_index` with only years and PFR IDs; statuses are recorded only for PFR-keyed rows. The 75 GSIS-only matches therefore cannot be sub-coded under D2. **Fix:** store `statuses` (and weeks) in `gsis_index`.

### D4 — "DB" is mapped to CB; 42% are safeties (MEDIUM, label contamination)

Of 163 drafted-"DB" participants (2013–22), primary NFL snap position: CB 87, SS 33, FS 33, S 3, LB 5, DB 2. 69 safeties are in CB labels. Separately, 62 of 208 drafted "DE" participants logged most snaps as LB (3-4 edge), and 15 of 70 "OLB" as DE. **Fix:** derive the outcome-side group from the player's modal NFL snap position, keep draft listing as a separate pre-draft field, and flag DE/OLB/LB as `EDGE_LB_AMBIGUOUS` until a role rule is approved. Breaking fixture: `test_generic_db_is_not_silently_a_cornerback`.

### D5 — Schedule gate is too lax (MEDIUM, code)

`regular_games >= 170` passes a season missing 86 of 256 games. **Fix:** require 256 (2013–2020) or 272 (2021+), with an explicit allow-list for the cancelled 2022 BUF–CIN game; also verify per-team game counts. Breaking fixture: `test_partial_season_must_not_pass_schedule_gate`.

### D6 — 17-game era drift in absolute-snap targets (MEDIUM)

Picks 1–64 participants average 2,285 four-year snaps with zero 17-game seasons in window vs. 2,351–2,481 with one or more (n=316 vs. 64–128). Classes 2018–2022 get progressively more 17-game seasons, so forward curves trained on 2013–2016 under-predict later classes and absolute thresholds (role_y3_proxy 500/250) shift with era. **Fix:** normalize by team regular-season games (or use snap share once denominators exist). Also flag 2020 (COVID opt-outs, no preseason) as a season-level covariate.

### D7 — Specialists should be out of scope, not pending (LOW)

All 45 `POSITION_UNSUPPORTED` rows are P (20), K (17), LS (8). Labeling them as an open gap overstates unresolved work. Breaking fixture: `test_kicker_punter_longsnapper_are_out_of_scope_not_pending`.

### D8 — Inconsistent blank `game_type` handling (LOW, latent)

Snap parser silently drops blank `game_type` as postseason; roster parser treats blank as regular season. No blanks exist in current data (REG 310,476; WC/DIV/CON/SB only), so no current impact, but a future schema change would silently delete rows. **Fix:** blank → hard error in both.

## Challenges to the Phase 1 target contract

- **Opportunity bias needs a measurable, not just declared, treatment.** Labels A (role) and C (opportunity) are themselves draft-capital outcomes. The Talent Engine test on these labels will reward predicting draft position. Pre-register a comparison where APEX must beat a *consensus-rank-only* model on the same labels; otherwise any "edge" may be market signal laundered through realized opportunity.
- **Label B (conditional quality) has a selection problem the RFC names but does not size.** Efficiency is observed only for players coaches chose to play. Report what fraction of each position/pick band reaches the minimum-exposure threshold; if Day-3 coverage is low, B cannot evaluate Day-3 sleepers.
- **Snap share at 50%/30% will be noisy for rotational positions** (IDL, EDGE, WR3, TE2). Freeze per-position thresholds or use percentile-within-position-season before validation.
- **UDFA population is the largest unsized hole.** Without it, every result is conditional on being drafted, so "undervalued by the market" can only mean "drafted too late," never "missed entirely."

## Recommended next actions (in order)

1. Add bound-pair reporting (D1) — small change, removes the biggest bias immediately.
2. Implement D2/D3 status sub-coding; re-run. Expected result: ~146 rows move to `NO_OBSERVED_OPPORTUNITY`, 34 stay `SOURCE_MISSING`.
3. Fix D4/D5/D7 and make the three fixtures pass without weakening assertions.
4. Normalize snaps by team games (D6) before freezing any threshold.
5. Then present Phase 1 labels for user approval.

No accuracy claims, no model changes, no production predictions changed.

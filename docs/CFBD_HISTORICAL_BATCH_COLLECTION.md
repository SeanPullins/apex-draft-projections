# APEX historical CFBD acquisition: opponent-aware research

**State: collector and staging code implemented. Not yet run with authenticated historical data.**
Frozen as of October 9, 2026. No public APEX grade, rank, NFL outcome forecast or Player DNA changes.

## Why another dataset is needed

The user's original APEX Phase 1 ZIP includes verified **2026 weeks 1–5** game stats but zero 2024/2025 historical player-game observations. Three 2025 team-level season-stat probes are not historical per-game evidence. Accordingly, any claimed 2024→2025 adjusted player development today is unvalidated.

## Collection plan

CFBD currently provides GET /games?year=YYYY&seasonType=regular (game schedules with kickoff/opponents) and GET /games/players?year=YYYY&week=W&seasonType=regular (player box scores). Fetch 2023 to supply **2024 prior-year baselines**; 2024 to supply 2025 prior-year baselines and 2024 players; and 2025 for 2025 player games. A three-year request plan costs at most **54 API calls** (3 schedule responses plus up to 17 per-year weeks), often less if fewer weeks contain completed games. Calls are cached and receipts hashed. This bound is not a report of actual quota consumed; current CFBD free tier is 1,000 calls/month, subject to account access. Reference: https://api.collegefootballdata.com/api/games and https://collegefootballdata.com/api-tiers .

## Commands on a locally checked out repo

~~~~bash
# No key or network required; show estimated maximum request count
python3 scripts/collect_cfbd_history.py --plan

# This requires YOUR authorized key and network. Raw data lives outside the PUBLIC git repository.
export CFBD_API_KEY='YOUR_AUTHORIZED_KEY'
python3 scripts/collect_cfbd_history.py --years 2023 2024 2025 --output /private/apex-cfbd-history --max-calls 54

# Audit missing data / identities; default output is aggregate counts, not raw players.
python3 scripts/stage_cfbd_history.py --cache /private/apex-cfbd-history --crosswalk /private/APEX_phase1_2026-10-09.zip

# Optional PRIVATE staged research record after rights review (never commit this file).
python3 scripts/stage_cfbd_history.py --cache /private/apex-cfbd-history --crosswalk /private/APEX_phase1_2026-10-09.zip --rights-attested --private-output /private/historical-qb-research.json

# Downstream temporal engine abstains on post-game retrieval timestamps.
python3 scripts/opponent_adjusted_development.py --input /private/historical-qb-research.json
~~~~

- The collector never prints/persists the key; it caches original JSON and SHA-256 receipts separately for auditing. A corrupt/missing cache pair fails closed, and max-calls prevents surprises. Re-running completed requests consumes zero additional calls.
- Exact 2026 CFBD crosswalk ID and normalized historical athlete name AND position must match. Transfers are not joined on current school name. Missing/aliased names require human review; no fuzzy auto-merge.
- QB game rates require passing attempts parsed from C/ATT plus passing yards from the same named player/game/team. Opponent defensive pass-allowed rates use game-by-game passing totals from all quarterbacks of the opposite team, with original game schedule for defensive identity. No RB-only, WR-only or TE-only defense label is imputed: game boxscores alone cannot isolate opponent coverage by those positions. Their season rates can be audited but are not silently called adjusted.
- Missing or inconsistent team game stat pairs, no opportunities, pseudo-athletes, mismatched game identity and duplicated/conflicting stats are quarantined.
- Only completed regular season football games are covered. Postseason/January season mapping needs dedicated support and new tests.

## Essential retrospective-vs-as-of distinction

These 2024 and 2025 game reports would be DOWNLOADED IN 2026. Their checksum and true retrieval timestamp validate what the API returned in 2026, **not that the exact numbers were known before each 2024–25 game**. The private normalizer preserves the true time instead of inventing 2024 source timestamps. This means the pregame opponent engine correctly refuses to calculate or model-promote retrospective look-ahead data. Actual archived pregame vintages would be required for a strict as-of historical score, or a clearly separately labeled *retrospective explanatory experiment* would need to be designed and independently evaluated without making historical-as-of claims.

## Remaining promotion gates

1. Authorized retrieval and source-rights review.
2. Historical games/season totals reconciliation and transfer/roster ID checks; demonstrate position-specific defensive denominator validity.
3. Historical snapshot availability documentation; avoid full-season priors in earlier games.
4. Independent past-to-future draft-year holdout evaluations on **the same cohorts**, comparing Brier, log loss, AUC, calibration, class bootstrap intervals and missingness. Do not change NFL success models based on retrospective in-sample comparisons.
5. No source-licensed values, raw records, individual NFL joins or private results in the public GitHub Pages payload.

This pull request ships reproducible **research infrastructure and tests**, not an accomplished 2024/25 opponent-adjusted evaluation.

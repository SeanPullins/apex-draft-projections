# APEX — Opponent-aware development research gate

Date: October 9, 2026  
Status: **PRIVATE RESEARCH INFRASTRUCTURE ONLY — NOT DEPLOYED TO PLAYER DNA, NO NEW NFL MODEL**.

## What we genuinely have

The user-supplied, previously source-replayed APEX Phase 1 ZIP is a frozen **2026 Weeks 1–5** CFBD research package. The offline audit of the user's exact package found:

| Measure | Verified local count |
|---|---:|
| Current APEX board names in the identity crosswalk | 201 |
| Uniquely accepted CFBD athlete IDs | 198 |
| Board prospects with any matched recorded game | 162 |
| Distinct matched player-games | 694 |
| Of those, opponent pregame team Elo available | 624 (89.9%) |
| Missing opponent pregame Elo | 70 |
| Team-to-game identity mismatches | 0 |
| Players with at least two Elo-supported recorded games | 156 |
| Players with at least four Elo-supported recorded games | 118 |

This audit is a **coverage check**, not a player development score. Pregame Elo is an overall team proxy, **not** defensive difficulty for QB dropbacks, WR routes, RB rushes or TE targets. No opponent-adjusted player performance is justified from Elo alone.

The Phase 1 package's player-game files contain **2026 only**, not comparable 2024 and 2025 game-level series. The existing 20 public Player DNA historical profiles contain **season totals** rather than complete per-game opportunities versus actual opposing defenses. Accordingly **the 2024→2025 opponent-adjusted result count is zero until valid historical input arrives**. Do not equate this with zero player improvement.

## What's been implemented

- \`scripts/audit_phase1_opponent_coverage.py\`: replays aggregate 2026 player-game to pregame-opponent-Elo coverage from the user's **locally held** package ZIP. Prints only aggregate counts; no player, team or private CFBD raw record.
- \`scripts/opponent_adjusted_development.py\`: strict research-only Python engine to evaluate **previously allowed position-specific production**, using *defensive results actually available before each upcoming game*, with prior-season baseline shrinkage and opportunity weighting. Refuses data after observation cutoff, unsourced/unauthorized rows, naive timestamps, duplicate athlete-games and NFL outcomes masquerading as features. No player-level result unless explicitly requested as a **private output outside this public repo**.
- Synthetic regression tests for chronology, future-game exclusion, late source availability, small samples, missing prior, duplicate identity, rights gating, output containment, aggregation and correct interpretation.
- **No public web assets, grades, probability models, rankings, stability flags or existing player statistics change.**

### Algorithm (exploratory, not scientifically validated)

Per position and defense, select defensive opponent-game observations with:
- matching position group and same season, **strictly earlier kickoff** than the scored prospect game;
- source observation available **strictly before** that kickoff;
- at least two previous qualifying defensive games, plus a minimum denominator;
- an externally documented previous-season **position-specific** league-level prior supplied before that game.

For scored game \`g\`, with player opportunities \`n_g\` and offensive yards \`y_g\`:

\[
expected_g = \frac{priorMean_{s,pos} \cdot priorPseudoOpportunities_{s,pos} + \sum_{h<g} defensiveYardsAllowed_h}{priorPseudoOpportunities_{s,pos}+\sum_{h<g} defensiveOpportunitiesAllowed_h}
\]

\[
residual_{player,season} = \frac{\sum_{eligible\ g}(y_g-n_g \cdot expected_g)}{\sum_{eligible\ g} n_g}
\]

Thus a +1.0 residual means one yard **above the defense's prior-allowed expected production per recorded opportunity**, not an additional point of NFL value. QBs use passing yards/pass attempts; RBs use rushing yards/carries; WRs/TEs use yards/reception. Receptions are not targets, separation, or route success. Individual WR/TE defensive allowed baselines require reliably classified opposing receiving groups; a team's overall passing yards per attempt must **not** be relabeled a WR or TE baseline.

Priors must be previous-season data only (not final current-year national means), and must be sourced with an actual as-of date. For player-season eligibility, at least 3 evaluable games, >=70% of recorded player opportunities with valid opponent history, and at least 80 QB attempts / 30 RB carries / 20 WR or TE catches. A comparative two-year residual requires **both** adjacent seasons to pass. Small samples abstain; no completion-year training labels or NFL outcomes are accepted as inputs.

This approach is intentionally a simple **prior-defensive-rate residual**, not verified causal opponent adjustment. It is affected by opponents' earlier schedule strength, home/away, depth charts, coaching changes, risk of selection bias, passing roles and game-script. Treat results as candidate *research features* only.

## Input contract (private JSON, schema_version=1)

Top-level:
- \`feature_cutoff_at\`: timezone-aware ISO timestamp of when pre-draft evaluation could have been made.
- \`priors[]\`: season, position, **source_year=season-1**, source_id, rights, available_at, mean_rate, pseudo_opportunities.
- \`defense_games[]\`: season, position, game_id, defense_team_id, offense_team_id, kickoff_at, available_at, opportunities_allowed, yards_allowed, source_id, rights.
- \`player_games[]\`: season, position, player_id, game_id, offense_team_id, defense_team_id, kickoff_at, available_at, opportunities, yards, source_id, rights.

Every row requires \`rights\` to be one of \`internal-authorized\` or \`public-stat-summary\`; that flag is an operator attestation of permission and is not proof of license rights. Every date requires an offset or \`Z\`. \`available_at\` is when the **stat/result was usable for a historical decision**, not today's extraction timestamp. If authentic as-of availability cannot be established, **do not run historical outcome comparisons**.

This first version requires game kickoff to fall within its reported season year, so postseason games in January must be excluded until a separate season-calendar rule is implemented and tested. Raw zeros are permitted only if they are genuine zero opportunities, not missing data.

Example synthetic invocation (input stays private):
\`\`\`bash
python3 scripts/audit_phase1_opponent_coverage.py --phase1-zip /private/APEX_phase1_2026-10-09.zip
python3 scripts/opponent_adjusted_development.py --input /private/season_game_history.json
python3 scripts/opponent_adjusted_development.py --input /private/season_game_history.json --private-output /private/adjusted_research.json
\`\`\`

The normal JSON stdout is **aggregate counts only**. The optional per-player output is deliberately refused if its path resolves inside this public repository. Do not commit input ZIPs, source receipts, private derived game-level features, private outputs, licensed PFF values, or player-level NFL outcome labels.

## Validation needed before claiming predictive gain

1. Source-validate 2024/2025 player games (identifiers, opportunities and player team), defensive allowed game aggregates, prior-year league baselines, actual kickoff and historical availability dates, exposure/denominator semantics, and authorization.
2. Test offense-to-defense game-ID and position-group correspondence and bowl-year handling; add opponent schedule adjustments, home field, common opposition and game-script controls. Treat missingness as informative and publish per-position coverage.
3. Freeze pre-draft feature vintages for historical draft cohorts **before draft dates** and fit on prior draft classes; use untouched **later** held-out classes. Build this candidate in a separate, private version, never altering the live v3 site as a side effect.
4. Compare against the existing no-slot baseline on **the same eligible players and outcome definitions**: Brier, log loss, discrimination/AUC, calibration/reliability, class/position slices, missingness effects and draft-class bootstrap intervals. Do not select a feature or threshold based on the holdout after seeing it.
5. Only consider public-facing opponent-adjusted trends after source/rights, chronology, exact definition and denominator, game-coverage and error checks pass. Even a well-measured rate cannot demonstrate player skill improvement or NFL causal effect on its own.

## Current release verdict

**Opponent-adjusted historical Player DNA: HOLD.**  
**Public rankings/model: unchanged.**  
**2026 schedule difficulty coverage: demonstrable, but not a position-level defense adjustment.**  
**Historical NFL predictive uplift: not evaluated.**

Next data requirement: authorized game-by-game 2024 and 2025 player totals and opponent offensive/defensive position group denominators, plus documented previous-year position priors and as-of availability. The current APEX Phase 1 ZIP is insufficient by itself.

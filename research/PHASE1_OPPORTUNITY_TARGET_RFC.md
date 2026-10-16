# APEX Phase 1 — Opportunity-Aware Outcome Targets (RFC)

**Approval status: PROPOSED, NOT APPROVED.** This phase defines testable target contracts and source gates, but does not modify live APEX predictions or proceed to modeling/decision simulation.

## Why the opportunity correction matters

Draft capital affects a player's chances to get on the field, chances to receive a second opportunity after struggling, and coaching/support resources. A model can be slot-blind in its **input features** while still inheriting draft capital and team-selection biases from labels based on snaps or volume.

Critical distinction: **No snaps is an observed zero REALIZED NFL contribution if the source fully covers that NFL season; it is not a measured zero of latent talent.** Conditional efficiency cannot be observed in the absence of attempts/snaps. An immature four-year window is RIGHT_CENSORED; missing source coverage is SOURCE_MISSING. Neither can be silently scored as zero.

Draft-slot effects cannot be causally "removed" merely by regressing outcomes on draft pick. Capital also summarizes scouting signal; positional need, injury, ability and coaching confound the association. Correctly label any adjustment as an observational sensitivity study, not a demonstrated counterfactual.

## Phase 1 target contract — three separate targets

**A. REALIZED_NFL_ROLE_Y4:** first four complete regular NFL seasons after draft (draft year through draft year+3), recording offense/defense snaps, valid snap share with verified team-game denominators, games, and separate special-teams participation. Realized participation is useful to an acquiring NFL team but is NOT intrinsic skill. Store 0 snaps only if source coverage confirms it.

**B. OPPORTUNITY_CONDITIONAL_QUALITY:** measure real position-specific efficiency only when the underlying position/role-relevant denominator is verified and sufficiently large. Examples: QB EPA per attributed dropback; RB rush EPA/carry plus receiving separately; WR/TE target-level efficiency where targets are consistently captured. No reception=route equivalence. Do not relabel defensive sacks per defensive snap as pass-rush efficiency. For OL, IDL, EDGE, LB, CB and S, admit no trustworthy public position-specific role metric until verified. Missing attempts mean efficiency is unobserved—not zero. Use reliability shrinkage/intervals and pre-register minimum exposure via training-only checks.

**C. OPPORTUNITY_PROCESS_Y3:** chance to earn a meaningful NFL role and amount of role access. Candidate binary role test: verified snap share >=50% in any of years 1–3, OR >=30% in at least two distinct seasons. Both thresholds are proposed, not proven optimal; freeze before validation and test sensitivity without reusing an already-inspected class as a fresh holdout. Multi-team players require accurate team-game snap denominators.

Performance/salary/recognition annotations are supporting data, not an unprincipled composite target. PFR Approximate Value (AV) is **only** a secondary descriptive cross-position proxy; AP honors, second contracts and APY depend on more than NFL ability.

### Label states (mandatory, mutually interpretable)

- COMPLETE_OBSERVED: target window and source coverage fully verified.
- NO_OBSERVED_OPPORTUNITY: zero actual qualifying opportunities with complete source coverage. Realized on-field value may be zero; conditional skill quality remains null.
- PARTIAL_OBSERVED: player has some observations but not enough for stable efficiency; preserve volume and uncertainty.
- RIGHT_CENSORED: required years not yet completed.
- SOURCE_MISSING: snap source, exposure denominator, player games or outcome source cannot be confirmed. No zero-imputation.
- ID_UNRESOLVED: ambiguous college-player to NFL-player identity.
- LICENSE_BLOCKED: intended model training/evaluation or redistribution not authorized.
- UNKNOWN_CONTEXT: medically private/unavailable interviews, injury explanation or role assignments not known. Never invent their values.

Player-season records need: source IDs and rights, original checksum/vintage, exact identity joins, snap numerator/verified denominator, position, roster team and date, outcome-as-of date, drafted flag, nullable actual pick and a separate evidence-quality flag. Right-censored and missing-source are disjoint.

## Separating draft value from talent

The slot-blind **Talent Engine** predicts the distribution of opportunity, conditional performance when observed, and realized four-year impact using only pre-draft verified predictors. Draft slot must not enter that engine.

The historical **Market Reference** estimates expected observed realized value at each actual pick using **only mature, historically available TRAINING classes**. Use partial pooling across nearby picks and positions; publish coverage/sample counts and 95% intervals. Prospect surplus at hypothetical pick K is player value forecast minus training-only expected value for K. Dollar surplus additionally requires contract cost; until then call it role/value edge, not salary-cap surplus.

Scope:
- NFL draft-pick coverage can begin 2010 (nflreadr PFR picks available since 1980).
- PFR NFL game-level snap counts through nflreadr begin in **2012**, not 2010. Therefore **2012–2022** is the target core for opportunity-adjusted labels, pending actual source coverage audits. The 2010–11 draft classes may enter pick-only or other consistently verified ancillary baselines but **never** have missing snaps filled with zeros.
- 2022 drafted players have a completed four-season horizon ending 2025 by October 2026, conditional on full receipt verification. The 2023 draft class does NOT have a completed fourth season.
- Undrafted players remain in the eligibility/candidate universe when identity/pre-draft inputs support them; actual draft pick is null, not an artificial late pick. A drafted-only baseline is explicitly conditional on selection and does not prove performance among all prospects.

Additional observation: avoid using actual draft slot for the Talent Engine even when slot is used as a post-outcome diagnostic or stratification variable; latter analyses do not provide causal estimates of undiscovered skill.

## Position-specific measurement inventory: limitations, not invented ratings

| Group | Candidate public measures | Unresolved quality problem |
|---|---|---|
| QB | validated player-attributed dropbacks and EPA per dropback | protection, receiver and game-script attribution |
| RB | rush attempts, rushing EPA/success; receiving separately | blocking and selected carries |
| WR, TE | targets, receiving EPA/target / success if attribution verified | targets are selected; routes are missing |
| OL | snaps and playing-time exposure | no verified public block-rep quality or OL grade |
| IDL, EDGE | defensive snaps and event counts | snaps not equivalent to pass-rush reps |
| LB, CB, S | defensive snaps and outcomes recorded in public pbp | no reliable public coverage assignment/target exposure |

A separate, clearly named **efficiency-sensitive label** can be evaluated only for positions with trustworthy denominators. Do not force single-score comparisons between incompatible position stats.

## Source and licensing gates (not yet executed)

- Draft picks: https://nflreadr.nflverse.com/reference/load_draft_picks.html
- Game-level NFL snaps (2012+): https://nflreadr.nflverse.com/reference/load_snap_counts.html
- Weekly rosters/identity (2002+): https://nflreadr.nflverse.com/reference/load_rosters_weekly.html
- Selected player statistics: https://nflreadr.nflverse.com/reference/load_player_stats.html
- PFR AV definition and caveats: https://www.pro-football-reference.com/about/approximate_value.htm
- PFF terms: https://www.pff.com/terms — consumer/API permission **must not be assumed** to authorize ML training, evaluation or public APEX use; obtain separately authorized rights before considering that source.
- Historical dated consensus boards: availability and license **not established**. Do not build a Monte Carlo draft model from simulated historical vintages.

## Observational opportunity-bias assessment — NOT a causal correction

1. Report snap/outcome disparities by actual draft-pick bands after controlling for measured pre-draft information and position, with explicit confounding limitations.
2. Separately measure the full cohort's realized role/playing-time outcomes, the selected cohort's conditional efficiency, and coverage/selection probabilities.
3. Stress test across cap years, drafted/undrafted, injuries where legitimately sourced, positions and teams; avoid extrapolating conditional performance onto players with no exposure as though observed.
4. Compare a two-part probabilistic model against raw volume, shrinkage efficiency and recruiting/college-only baselines only in Phase 3, after explicit Phase 1 and Phase 2 approvals.

## Phase 1 definition of DONE

- Verified join/coverage report for draft picks 2010–22 and game-level snap outcomes 2012–22; counts and identity conflicts by class, pick range, position and source rights.
- Real raw NFL targets actually computed where permitted, with exact as-of and missingness contracts, plus versioned thresholds.
- Training-only expected-by-pick baseline with coverage, 95% bootstrap CIs and bounded extrapolation **only where labels are verified**.
- Audit actual no-snap zeros, source missing, limited opportunity and immature windows distinctly with synthetic fixture tests.
- Freeze prior-explored development classes (2019–2022 already inspected by Muse) and reserve genuinely untested evaluation dates.
- **USER APPROVAL GATE:** no Phase 2 leakage work, model rebuild, decision layers or deployment until these definitions and resulting verified counts are explicitly approved.

Current status: target-design RFC only. Raw 2012–2022 joins, per-pick expected values and performance data have **NOT** been ingested or calculated as part of this proposal; no accuracy or gain is claimed.

# APEX NORTH STAR — Front-Office Draft Intelligence
Version 1.0 · October 9, 2026 · Product and scientific decision contract

> **Mission:** Make the most useful evidence-based NFL draft talent-and-decision system possible with data we can lawfully obtain, verify and reproduce. The differentiator is better future predictions and draft decisions, not model novelty, artificial precision or more UI tabs.

## The four questions every APEX page and model must help answer

1. Who will become a valuable NFL player, and in what range of plausible outcomes?
2. Where is the pre-draft market wrong, and what pre-draft evidence supports our disagreement?
3. How credible and complete is that evidence, and what new observation would change the projection?
4. Given this particular team's needs, picks, alternatives and uncertainty, what action yields the best expected decision quality?

**Never optimize mock-draft agreement instead of NFL outcome forecasting.** Mock-draft accuracy is useful only for the separate Market Engine.

## One disciplined system, three distinct engines

**A. TALENT** — frozen, auditable pre-draft scouting estimate, slot-blind. Position-aware NFL opportunity and conditional quality, with uncertainty. Uses only lawful/available-as-of data. Separate observed failure from unobserved skill, including draft-capital opportunity bias.

**B. MARKET** — prospect acquisition probability and price, sourced to genuinely archived time-stamped consensus, team decision constraints, draft pick economics and correlated uncertainty. Realized draft slot is NEVER a Talent input.

**C. DECISION** — whole-draft pick/trade value across alternative opportunities and scenarios. Must NOT present TAKE/TRADE probabilities until A and B have demonstrated value. Team Fit is a transparent exploratory utility, not the Talent grade.

## Success criteria and non-negotiable scorecard

**Primary scientific goal:** On genuinely future / never-inspected draft classes, the slot-blind Talent engine must beat position+recruiting-only and a genuine as-of consensus baseline on *identical players* for calibrated NFL role and quality outcomes.

Use paired Brier and log-loss differences with 95% draft-class-cluster uncertainty; number of full draft classes, coverage by position and sample selection bias shown. AUC, calibration, top-32/64 discovery precision, and excess realized performance relative to market are secondary. Do not claim superiority if intervals are compatible with zero or if the edge disappears across most classes.

**Prospect discovery goal:** APEX REVIEW-UP / SLEEPER disagreement needs measurable prospective outperformance of similarly ranked consensus peers, assessed at multiple acquisition prices. Otherwise the designation is a scouting hypothesis.

**Front-office utility goal:** Once A and B pass, assess value improvement of recommendations versus actually feasible draft alternatives, transaction costs and realistic trade constraints. Later decisions should be replayed with only the pre-draft evidence present at that draft.

**Usability:** Football-first, accessible on a phone, complete evidence explanation and clear uncertainty. UX cannot obscure unsupported prediction precision. Lighthouse, real-phone testing, data freshness and keyboard access are independently tracked—not substitutes for predictive value.

## Phase-gated execution, NOT seven active parallel product builds

- **Current P1 — NFL labels & evidence:** Resolve all 180 no-snap selections, validate snap opportunity denominators, draft-to-roster identities, position labels, 2012 coverage limits, available efficiency measures and legal data-use scope. Freeze source-provenance receipts and four-year role targets. User reviews actual Phase 1 data.
- **P2 — Complete leakage audit:** Write per-file/line findings, vintage registry, drafted-only selection warnings, source rights and training-fold preprocessing. User approval.
- **P3 — Talent experiments:** Compare position/recruiting-only vs slot-blind APEX raw, development, opponent-aware, opportunity and evidence-quality features with chronological training-only nested validation. One cohort registry. User approval.
- **P4 — Independent test:** Freeze preprocessing/thresholds and benchmark candidate on untouched future classes, not previously inspected Muse 2019–22; register the test ahead of outcomes. Only deploy model improvements with observed evidence.
- **P5 — Market availability:** First audit genuine historical archived consensus boards and rights; then calibrated joint draft scenarios and marginal value of waiting.
- **P6 — Team decision optimizer:** Portfolio expected value and trade-off explanations, scenario analysis, realistic pick constraints.
- **P7 — Maintenance:** Automated annual as-of snapshots, drift and failure reports, auditable promotion and rollback.

**No moving a model into production until real improvements survive the relevant gate.** A phase-gate can be "blocked by missing data" rather than creating artificial data.

## Work ownership and challenge responsibilities

- **ChatGPT: Integrator and independent verifier.** Own repository integration, source/CI gates, chronology, unit tests, evaluation sanity checks, publication safety, coherent fan UX and final model comparisons. Research claims must survive independent replay. No claim of ongoing activity between turns.
- **Muse: Source acquisition and empirical research.** Prioritize raw historical college+NFL joins, crosswalk coverage, exact source vintages, affordable CFBD batching, meaningful positional denominators, proof of backtest construction. Deliver checksummed PRIVATE ZIP and aggregate comparison tables; do not invent scores or push production models.
- **Claude: Critical red-team reviewer.** Challenge target selection, opportunity bias, season vintage, training leakage, selection effects, assumptions and UX language. Return specific counterexamples, breaking fixtures and prioritized defects. Claude's prompts are hypotheses, not unreviewed acceptance criteria.
- **APEX production: Conservative by default.** Research changes isolated; private datasets never auto-commit to public GitHub or GitHub Pages.

## Standing rules

1. Never use actual draft slot as a Talent input; separate pure skill/role projections from expected market and decision value.
2. Never use later-collected evidence or in-sample fit information to impersonate historical predictive success.
3. Never treat missing source, no snaps and no talent as the same label.
4. Never infer licensed provider's ML/publication rights from public accessibility.
5. Track source ID, retrieved timestamp and genuine *available-at* date distinctly.
6. Position-aware measures must use defensible opportunities; no sacks per defensive snap described as pass-rush win rate.
7. Keep exact historical player identifiers and restricted data PRIVATE; aggregate safe results only on public GitHub.
8. Give fans plain-language explanations, but preserve missingness, confidence and abstention rather than making everything "green."
9. Every milestone records source bytes, join coverage, eligible years/positions, failure modes, tests and change to production predictions (usually NONE).
10. Do not allocate effort to shiny products until the upstream Talent performance/evidence gates pass.

## Current scoreboard at freeze

- **Board UX:** 201 ranks; 104 with context ratings and 97 not rated. Mobile 320–481px Chromium viewport tests passed; Lighthouse score not verified.
- **2013–2022 drafted cohort:** 2,558 eligible for a four-season NFL snap-feed window. Verified snap participants 2,333. No snap-feed row 180; unsupported/unknown position classifications 45. All-zero performance CANNOT be assumed for the 180.
- **NFL snapshot sources:** Current nflverse-data PFR snaps 2012 release is a ~154-byte placeholder; 2013 is earliest demonstrated usable first draft cohort. Snap-window receipts 2013–25 exist privately, not contemporaneous historical feature snapshots.
- **Opponent adjustment:** Muse 2019–22 models show an unproven incremental lift over recruiting (Brier difference approximately -0.00249, class bootstrap CI crosses zero; 2021 drives reported gain). NO production talent improvement established.
- **Production predictions:** No evidence-based promotion. Current model/2027 rankings frozen.
- **Next milestone:** Exact-ID roster reconciliation of the 180 no-snap selections and analysis of the missing 45 positions. Verify whether full-cohort playing-time outcomes can be constructed. No phase 2 training yet.

**Product acceptance is NOT a claim to be 'best ever' today; it is a reproducible way to earn and demonstrate that level of usefulness.**

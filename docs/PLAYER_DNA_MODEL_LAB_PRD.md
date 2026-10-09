# APEX Player DNA + Model Lab — Product Requirements (PRD)
Version 1.0 — October 9, 2026

## Product principle
**Know the evidence. Know the limits. Make a better decision.**
Target: a casual NFL fan who understands football but does not know data science; secondary audience: serious draft analysts. First useful answer within one click, in plain English, with deeper provenance available on demand.

## Navigation, hierarchy and user journeys
- **2027 Board**: scan all 201 prospects and compare short research actions.
- **Player DNA** (new top-level tab): find by name/school/position → choose player → read APEX view → inspect recorded facts and individually cited supporting role context → see what the numbers cannot prove → open full dossier or Draft Advisor.
- **Team Mode**: user-entered picks and roster priorities, explicitly not automatic live needs.
- **Draft Advisor**: follow player, storyline discovery, compare.
- **Model Lab** (renamed Validation): see completed historical research separately from prospect forecasts; choose one of three NFL participation outcomes and compare position-only, X9, X10 athletic, and X10 combined Brier scores. Expand methodology.
- **How APEX Works**: definitions and reasons for separating market rank, field evidence, and uncertainty.

### Mobile UX acceptance
- All six tabs visible on phone, large enough to tap, three-column two-row layout when narrow.
- Player selector immediately under introduction; filter by position and text; no horizontal-scrolling analytics charts.
- Compact stacked evidence and model-comparison rows on narrow devices; bright focus rings and correct button semantics; labels for inputs; reduced-motion support.
- Dark/light themes inherit base site tokens; contrasting dark editorial hero.

## What the UI does NOT claim
- Market rank is **consensus order**, not APEX NFL-talent rank.
- Player DNA is an evidence **dossier**, not a trained new Player DNA score or psychometric profile.
- Context stability GREEN/AMBER/RED is NOT talent quality or universal confidence.
- ESPN-derived October 7 2026 public snapshot is a secondary source, not the privately verified CFBD October 9 research package.
- Public player role evidence is precisely scoped to a dated sourced fact, never a full verified scouting report.
- Public OL box scores cannot produce an individual blocking grade. Missing is not zero.
- No restricted PFF/CFBD raw sources or internally quarantined player values are published.
- X9/X10 measure NFL *snap participation*, NOT actual Pro Football Reference annual AV or official GS.
- The X10 comparison is *exploratory* because it reuses cohorts already inspected for X9. It is not proof of independent predictive improvement, or permission to update current player probabilities.

## Data contracts
- Read-only `window.APEX2027.players` (201) with stable integer rank.
- Read-only `window.APEX2026.players`: existing public ESPN derived 2026 summaries; 201 keyed by rank.
- Read-only `window.APEX_STORIES`: source-aware narratives, stats, status, and position-specific limitations.
- Read-only `window.APEX2027Context.rows`: official / reported facts, verified scope and URLs; no fake model readiness.
- Model Lab aggregate published X9/X10 scores as of October 9, 2026: 2019–2022 drafted N=1,010; 3 separate defined workload labels; performance interpreted with limitations.

## Release gates
- Unit + browser-simulation tests on all 201 prospects and 3 workload outcomes.
- Existing navigation, mobile, PFF-receipt hygiene, historical-model safety and licensing-related tests all pass.
- Automated GitHub Pages publish from `main` only after PR merges.
- Validate published `gh-pages` content and CI results, do not claim deployment based solely on merging.

## Next phases (not shipped in v1)
- Stable provider-ID historical college identity and source-vintage engine.
- Real confidence intervals and uncertainty for validated player-success probabilities.
- X10 independent prospective outcome validation and calibration.
- Team fit informed by real roster/scheme only after authoritative feeds and accuracy assessment.
- Film charts with licensed access and repeatable agreement; never LLM hallucinated ratings.

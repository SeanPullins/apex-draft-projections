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


## Player DNA v2 — historical size neighbors and development evidence (Oct 9, 2026)

Shipped source-aware **non-predictive** comparison widgets. These do not implement a validated skill/production/NFL-outcome analog engine.

**Historical reference**
- Small 155-player sampled reference from 2015–2022 drafted non-specialists, selected using historical pre-draft measurements and 2027 physical-size coverage, **not NFL outcomes**.
- Position-group, listed height and weight ONLY. No age, skill, production, team fit, NFL success or win-probability comparison implied.
- Up to three closest historical neighbors when source roster measurements exist; cap 3 inches / 25 lb (35 lb OL/DT) and normalized size distance 1.8. Quarantine players with missing height or weight.
- Historical measurement records originated in existing APEX research exports and have NOT been independently source-fact-verified; this is clearly disclosed.
- Any future football-performance "success analogs" require independently authorized career data and out-of-time validation; **not released here**.

**2026 production context**
- Use public ESPN-derived October 7 2026 box-score data ONLY; never private CollegeFootballData or PFF files.
- Compare one metric appropriate to the position (QB pass yards, WR/TE receiving yards, RB rushing yards, EDGE/DT sacks, LB/S tackles, CB defended passes) **per recorded-stat game**.
- Only include same-position prospects with >=2 box-score-recorded games and valid metric entries, minimum comparison n=5.
- Report the player's rate, within-sample median and cohort size; never call this a national percentile, opponent-adjusted score, quality grade, or future projection.
- Abstain for offensive linemen, injuries/nonparticipants, and inadequate source coverage. Do not impute zero from missing data.

**Cross-season evidence**
- Display a previous season fact only when its existing source-linked research entry is verified and explicitly names 2023/2024/2025.
- Other prospects display a transparent unavailable state, not an artificial growth curve. Link original dated source when checked.
- The 2026 current snapshot remains independent and cannot itself establish a trajectory.

**Tests**
- Existing 201-player navigation and all privacy tests preserved.
- New browser-simulation tests cover physical match gates, 2026 same-position comparison, OL abstention, missing-measurement fallback, verified 2025 evidence, no private NFL success label, and mobile stacking.

## v3 UX redesign and explicit full-board requirement — October 9, 2026

User feedback: initial large-gradient dashboard, heavy text hierarchy, and apparent missing players were unacceptable. The old selector rendered only the first twelve of 201 records, hiding the rest behind a `Show more` interaction.

**Changes shipped in v3**

- Full 201-prospect **index, immediately rendered**, sorted by consensus rank, no first-12 slice, load-more or arbitrary limit.
- Visible `N of 201 shown`, dynamically accurate for search and position filters; search covers player name, school, position code and rank, accent-agnostic.
- Desktop directory+detail reading pattern; mobile browse screen → detail screen with clear `All prospects` back and chronological Previous/Next.
- Crisp editorial hierarchy: player name, source-limited APEX takeaway, three essential context facts, public observable production and dated research, one specific unanswered football question.
- Size-only historical peers, same-position stats and available earlier seasons are **progressively disclosed** rather than crowded into the default player view.
- Source, missingness and non-promotion limits remain explicit. No missing-player fallbacks, fake grades, invented NFL comparisons or silent model changes.
- Dark/light and high-contrast focus states inherited. One-column cards on narrow phones; tap targets 42–58px.
- Regression gate verifies all 201 controls and rank #201 exist immediately, every selection works, the mobile mode toggles correctly, and the rest of APEX remains operational.

Remaining known gap: a full board entry is not the same as a complete validated individual 2026 box-score record. Every player remains selectable even when their college performance is not measured or verified in public data.

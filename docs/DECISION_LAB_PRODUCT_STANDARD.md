# APEX public front-office product standard (October 8, 2026)

**Goal:** A public visitor should get a genuinely useful draft decision workflow within one minute, without needing an NFL analytics background or a paid data license. Product ambition is front-office-grade *process*, not unsupported claims of front-office-grade forecast accuracy.

## Differentiation, not another mock draft

Existing public platforms already cover customizable boards, team needs, mocks and premium stats. APEX should compete by exposing **why a draft decision remains unresolved**, what specific observation would change a scout's mind, and what the user should investigate next. A different color scheme or an undisclosed synthetic grade cannot create a predictive edge.

The first implemented module, **Decision Lab**, uses the 201-player frozen 2027 dataset, public-safe source receipts, and existing APEX dossier questions. It adds:

1. **Decision-first missions:** premium capital; challenge consensus; evidence gaps; overlooked prospects.
2. **Constrained scout dispatch:** 3/5/8 available assignments, default positional diversification, and explicit evidence-review urgency before frozen scouting priority. Assignment ordering is a transparent heuristic, **not statistical expected return**, real-team headcount, or a new talent rank.
3. **Red-team case file:** a working thesis, position-specific falsification test, and three explicitly hypothetical source outcomes. None change real scores.
4. **Scouting desk:** users may save up to 12 assignments locally, open the existing dossier and download a text brief with source-check and temporal validation requirements.
5. **Privacy and model lineage:** new source received is never called independently verified; forecast GREEN / AMBER / RED retains its earlier definition; no private numerical PFF/CFBD data enters public static JavaScript.

## The full experience we should ultimately earn

| User question | Proposed signature experience | Status / proof required |
| --- | --- | --- |
| Who deserves attention? | APEX Scouting Desk that allocates limited scouting effort based on data gaps, model uncertainty, draft stakes and mission | **Implemented as a rules-based research queue**; no claim of calibrated scouting ROI |
| Why should I doubt the market? | Contrarian council: consensus, PURE talent and independent scout each make a traceable, dissent-friendly case | Only grounded frozen APEX actions and qualitative review cases; neither E1 nor E2 passed promotion tests |
| What skill survives in the NFL? | Translation Genome: performance across pressure, role, alignment and opponent difficulty, with reliable context-specific distributions | Historical E3 topology had positive uncertainty/error detection but upside and capital protection **failed**. Do not portray as a validated talent ranking |
| What would change my mind? | Counterevidence engine: source-backed observation, provenance, matching denominator, independently quantified sensitivity | **Current sandbox is hypothetical workflow-only**; no synthetic projection delta until calibrated with historical counterfactual experiments |
| What about *my* team? | Decision Theater: actual validated pick inventory, positional roster opportunity, scheme assignments, cap and fit constraints, trade options | Existing Team Mode is **user-configured**, does **not** know official team picks or cap fit. Future work requires dated sources |
| Is APEX actually better? | Time Machine: exact historical as-of cutoffs, frozen forecasts, independent outcomes, calibration and failed experiments side by side | Requires genuinely untouched draft-time snapshots. Current research has retrospective source caveats |
| Why trust a conclusion? | Evidence Passport: canonical athlete ID, transfer path, original source rights, snapshot week, opportunity denominator, conflict state | Await complete 201-player Muse export + authorized private receipts. No all-green by fiat |

## Readability and public access rules

- **First 10 seconds:** one choice, one plain-English explanation, one actionable question.
- **Progressive disclosure:** explanatory labels on cards, historical formulas behind a deliberate technical detail action, not on every row.
- **Mobile-first:** primary Board, Team, Decision Lab and Validation remain accessible on narrow iPhones. All actions operate through accessible buttons and selects with labels.
- **No false precision:** never generate scouting grades, projected NFL career dollars, expected trade values, supposed percent odds, coach uplift or "what-if" score swings without an audited, validated source and applicable model.
- **Missing isn't bad:** injured, sitting-out and historical-only prospects remain eligible for earlier-season review; never zero their contributions.
- **No licensing shortcuts:** exact restricted PFF-derived rows and metric values are not in public assets, exported briefs or GitHub Pages.
- **Read-only frozen APEX:** decision-lab plans, what-if choices and team-specific preferences may change *workflow* but not underlying public APEX player facts.
- **No hidden personalization:** scouting desk is saved only in localStorage; no server or private conversation data.
- **Be falsifiable:** register target, available features, reliability and promotion gates before analyzing the historical NFL results.

## Next technical milestones

- Add a versioned public-safe `evidence_passport` extract **only after** original licensed scouting data are reconciled and authorized for distribution.
- Build a real team-needs/pick-inventory connector with exact dates, change history and a disclosed source. Until then Team Mode must state users provide picks.
- Extend private historical NFL outcome and college-context coverage so football-specific specialists can vote in a chronological no-draft-slot experiment. X1's first 2015–18 backtest showed small mixed gains but only its athletic specialist was eligible.
- Evaluate marginal **scouting value of information** against frozen front-office decisions and historical scouting-cost proxies. The present sorting heuristic is a research tool, not a trained value-of-information model.
- Investigate contextual out-of-distribution translation and potential coaching/scheme impact using actual changes of role and personnel, not just hypothesized transformations. No causal claims without matched evidence and uncertainty calibration.
- Hold a reproducible iPhone/desktop visual accessibility audit, including screen reader focus management, color-contrast verification and downloadable text quality, before declaring a "best in class" finished product.

## Release gate

No alteration to the existing live 2027 rankings, confidence labels, underlying model parameters or Team Mode computations in this Decision Lab release. All new assertions must come from visible frozen player metadata or explicitly be called an illustrative scouting process. The full model remains research-only until a legitimate out-of-sample forecast improvement is demonstrated.

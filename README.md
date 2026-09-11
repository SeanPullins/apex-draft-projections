# APEX — NFL Draft-to-Success Projections

Interactive site with retrospective hit / starter / Pro Bowl estimates for NFL draft picks since 2000.

The site is static. `.github/workflows/publish.yml` publishes main to the GitHub Pages branch after validation.

## Validation status

- 2000–2002: training-only fits, excluded from reported held-out metrics.
- 2003–2021: class-held-out base predictions. Legacy v10 calibration reused historical evaluation labels, so its probability metrics are descriptive, not independent validation.
- 2022–2026: retrospective projections. Scores have been revised and are not verified frozen draft-night forecasts. Outcome snapshots are not live NFL results.
- V11 and subsequent candidates remain research-only until evaluation supports promotion. AUC measures ranking, not the percentage of predictions that are correct.

September 11 research reran V11, a repaired V10 calibration pipeline, a market-offset V13 candidate, and a fixed V14 blend. V14 reduced overall Brier error for all three outcomes versus repaired V10, but a small recent-class starter regression failed the release gate. A chronological starter check did not resolve that uncertainty. Live player scores remain unchanged; `research-followup.js` publishes aggregate results only.

`accuracy-audit.js` recalculates supported summaries from the displayed score payload after QB patches. Raw PFF data and the model pipeline remain in the private research repository.

## Checks

Run `npm ci && npm test` before publishing. Checks cover score provenance and rankings, metric reconciliation, full startup, tab clicks, keyboard navigation, class selection and search.

## Data sources & credits

- [nflverse](https://github.com/nflverse) — draft, combine, and career outcome data
- [RAS.football](https://ras.football) (Kent Lee Platte) — Relative Athletic Scores
- [Jack Lichtenstein / ESPN](https://github.com/JackLich10/nfl-draft-data) — historical prospect grades
- [Lee Sharpe / nfldata](https://github.com/nflverse/nfldata) — draft pick value curves
- PFF-derived college data informs the model; only derived percentiles (never raw
  PFF values) appear in this repository or on the site.

Independent research project. Not affiliated with the NFL, PFF, ESPN, or any team.
Approximate Value courtesy of Pro-Football-Reference via nflverse.


September 11 follow-up tested V15 position-specific college evidence (including a TE receiving mapping repair), V16 market-offset regression, and a fixed V17 blend. None passed the existing release criteria; scores remain unchanged. `accuracy-lab.js` exposes matched per-position probability errors and data limitations. Backtest checkpoint integrity is repaired in the private pipeline.

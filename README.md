# APEX — NFL Draft-to-Success Projections

Interactive site with calibrated hit / starter / Pro Bowl probabilities for every
NFL draft pick since 2000, validated leave-one-year-out against a draft-slot prior.

The site is fully static and dependency-free — open `index.html` locally or serve
it from GitHub Pages (`.github/workflows/pages.yml` deploys on every push to main).

## What's here

- `index.html`, `styles.css`, `app.js` — the site
- `data.js` — baked projections payload (6,782 players, classes 2000–2026)

Scores for the 2000–2021 classes are out-of-fold backtest values (each class was
scored by a model that never saw it); 2022–2026 are true projections. The model
pipeline and full methodology live in a separate private research repository;
the Methodology tab of the site documents the approach, backtest results, and
limitations in full.

The 2022–2025 boards were frozen on draft night, before those players took an NFL
snap, and the Insights tab scores them against the draft order itself. So far the
two are running level — pooled hit AUC 0.825 for the model vs 0.822 for draft
position, well inside noise at n=1,016. That scoreboard is published win or lose.

## Data sources & credits

- [nflverse](https://github.com/nflverse) — draft, combine, and career outcome data
- [RAS.football](https://ras.football) (Kent Lee Platte) — Relative Athletic Scores
- [Jack Lichtenstein / ESPN](https://github.com/JackLich10/nfl-draft-data) — historical prospect grades
- [Lee Sharpe / nfldata](https://github.com/nflverse/nfldata) — draft pick value curves
- PFF-derived college data informs the model; only derived percentiles (never raw
  PFF values) appear in this repository or on the site.

Independent research project. Not affiliated with the NFL, PFF, ESPN, or any team.
Approximate Value courtesy of Pro-Football-Reference via nflverse.

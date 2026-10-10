# APEX 2027 — fan-first Draft Advisor (2026-10-08)

## Product correction

**Fans cannot go scout. APEX must give fans the result, not assign scouting work to them.** The October 8 Decision Lab created a research-task interface. That can remain an internal research workflow, but it was inappropriate as the public product.

The public `#lab` route now opens **Draft Advisor**. It immediately answers questions using the *already established* 201-player 2027 snapshot:

- **Potential sleepers:** market rank outside the first 32 with an existing `SLEEPER_DISCOVERY` or `EXECUTIVE_REVIEW_UP` flag. **Not** a validated player-success forecast.
- **Big names APEX questions:** existing `EXECUTIVE_REVIEW_DOWN` research actions, **not** a declaration someone will be a bust.
- **Players with shaky evidence:** elevated topology uncertainty or independently incomplete source receipts, **not** a low talent grade.
- **2026 evidence updates:** separates new licensed source receipts from public 2026 statistics, **not** breaking real-time news.
- **Top board:** top 32 current market prospects with accessible APEX verdict context.
- **Player explainer:** read-only natural-language explanation of the existing APEX action and unsettled football question.
- **Compare two:** opens the same research-backed comparison shown elsewhere on APEX; no fabricated winner.
- **Follow players:** up to 25 prospect bookmarks stored only in browser localStorage. No future push alerts implied.
- **Build my team's board:** uses existing Team Mode, explicitly powered by user-provided needs and picks.

## Accuracy and rights guardrails

The same frozen player data, APEX confidence, research actions, market ranking, and Team Mode calculations remain unchanged. The simplified experience does *not* launch a live AI agent to watch tape, scrape sources in real time, refresh metrics, build novel probabilities or apply untested X1 coefficients. It exposes prior research in consumer-readable form.

The public site ships no raw restricted PFF blocking grades. User watchlists are stored locally. The underlying forecast quality is still limited by retrospective training and source-timing gaps documented in the model notes. The source-received status may indicate private licensed data awaiting verification, not newly validated player performance.

## Next-stage differentiator

Build a real recurring source-verified evidence ingestion and analytical synthesis pipeline, then publish source timestamp, change log, independent cross-check and recalculated model score **only after the relevant historical validation gates pass**. For consumers, make a memorable, repeatable question-answer experience, not a professional scouting job checklist.

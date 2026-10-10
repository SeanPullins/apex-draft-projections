# APEX 2027 Draft Intelligence — public-data audit and fan UX release (October 9, 2026)

## Actual source audit (immutable input)

Audited `data2027.js` before UI work:

| Check | Result |
|---|---|
| Player rows | 201 |
| Rank range | 1–201 |
| Unique ranks | 201; no gaps or duplicates |
| APEX action present | 201/201 |
| Allowed action categories | HOLD_PRIOR, EXECUTIVE_REVIEW_UP/DOWN, SLEEPER_DISCOVERY, SCOUT_MORE, DATA_GAP, URGENT_DATA_GAP |
| Confidence/context-stability present | 104/201 |
| Confidence values when present | GREEN 52, AMBER 39, RED 13 |
| Confidence absent (null) | 97/201 |
| Unsupported confidence values | none |
| Summary says topology covered | 104, consistent with nonnull `ta` |

**The original request to make every row GREEN/AMBER/RED would misrepresent the data.** Many defensive players do not have the context-stability measure. The correct user-visible treatment is **Not rated**, visibly separated from player talent, evidence coverage, and forecasting confidence. Original 201 rows remain unchanged.

`data2027.js` only provides `f2_spearman=0.630336...`, `consensus_spearman=0.585854...`, and four-class / 3-of-4 directional flags, **not the per-class sample sizes or individual rank correlations**. No class-by-class values can be fabricated. The Model Lab copy now explicitly discloses that lack of per-class n, spread and confidence intervals and describes results as directional. An independently source-verified per-class table remains a research requirement.

## Practical UX fixes

- Canonicalizes unknown/legacy hashes (e.g. `#board/2023`) to `#board`, with a dismissible, accessible notice and route to How APEX Works.
- One clear homepage primary CTA; secondary research/draft navigation stays available.
- Displays context-profile availability in the board for all 201 prospects; no fake green confidence on 97 unrated rows.
- **One comparison interface:** same DOM controls moved between Board and Advisor instead of maintaining duplicate pickers; same existing modal/comparison output preserved.
- Responsive stacked board and Team Fit cards below 640px, with explicit field labels, keyboard-selectable rows and preserved desktop tables.
- Advisor defaults to top-ranked prospect by design (already existed; retained).
- Watchlist portable via bounded JSON export/import. Import only accepts schema_version 1, APEX_WATCHLIST, 2027, <=25 unique known integer ranks; invalid input leaves existing list unchanged. No cloud sync is implied.
- Clarifies Sleeper Watch = positive market disagreement outside the consensus top 32; avoids conflating it with broader Possible Upside.
- Standardizes product naming to APEX 2027 Draft Intelligence and removes undefined Muse references from ordinary fan pages. Preserves scientific caveats where removing them would mislead.
- Corrects Team Mode copy: the **201 ranked prospects** are not a claim about real draft-pick availability or a prospect's draft slot.

## Scope and non-changes

No changes to `data2027.js`, `data2026.js`, `data.js`, source receipts, historical outcomes, APEX player scoring, ranking, NFL probability, trust/stability flags, or draft/team decision formulas. This is strictly navigation, explanatory copy, interaction and accessible styling.

## Tests / release bar

- Regression asserts 201 distinct players, 104 rated / 97 not rated, 6-column board and 7-column Team Fit mobile-card fields.
- Tests one shared comparator in both Board and Draft Advisor, watchlist JSON round trip and malicious/invalid-file rejection, legacy route canonicalization and notice dismissal, unchanged player inputs.
- Full npm test and preview workflow must pass on this PR; GitHub Pages publication must pass after merge.

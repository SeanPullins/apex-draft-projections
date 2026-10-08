# Muse → APEX: full 201-player evidence completion handoff

**Copy this instruction into Muse:**

> Research every prospect listed in [the JSON task queue](./muse_evidence_queue_2027.json). Start with the priority 1 players and unresolved gaps, then work through the entire 201-player set. For each player, independently verify current season identity, playing status, 2024–2026 season role and opportunity (snaps), and position-specific quantitative evidence. Address the listed `archived_scouting_question` using high-quality film/charting, historical context and opponent-adjusted splits. Provide a machine-readable response matching the requested output schema. Include dated links and source permissions for every metric. Separate data not found, no opportunity due to injury/ineligibility and data received but unverified. Do not invent numbers, impute absence as zero, publish licensed PFF raw data, or manipulate confidence to GREEN. Flag every source conflict. Work in small batches if necessary, preserving exact rank and identity keys.

## Why 201 players instead of just the 44 original gaps?

The previous 44-player handoff addressed missing season evidence, but full evaluation also needs specific scouting contexts on 52 AMBER/RED offensive prospects plus a 97-player defensive cohort with no Translation Topology confidence score.

The green goal is **complete, auditable scouting coverage**, not GREEN forecast stability. Forecast GREEN/AMBER/RED must remain empirically derived. Some unavailable 2026 seasons can only have a validated **historical-only** status.

### Work-order phases

1. **Reconcile all 35 licensed-source OL receipts.** Match original source exports and roles; flag especially Austin Siereveld (2026 position/snaps), Kade Pieper (interior deployment), PJ Williams and Coen Echols (small/mismatched samples), and 2026 availability.
2. **Seven unscored source/historical cases:** Ahmad Hardy (#29), Brendan Sorsby (#61), Desmeal Leigh (#134), Elijah Green (#144), Ezra Christensen (#147), AJ Harris (#186), Charles Jagusah (#187). Use prior seasons and legitimate missingness, never 2026 zeros.
3. **52 old AMBER/RED stability cases:** collect the specific context target in `next_context`, with denominators and matched 2024–2026 splits. New information can legitimately keep a profile AMBER/RED.
4. **97 not-covered defensive players:** acquire systematic role/context and within-position season splits so APEX engineering can fit an entirely new validated defensive uncertainty engine (not fabricate existing scores).
5. **All 201:** finish the full-cohort quality audit, opponent strength and source provenance. Do not select only good-looking performers.

## Gate before promoting a record to 'Evidence verified'

- Stable player-season identity and school/transfer trajectory independently confirmed.
- Source dates and metric denominator known and internally consistent.
- Position, alignment, role and opportunity checked.
- All missing fields explain *why* absent, including no 2026 games.
- Licensed access reviewed; no raw PFF grades leaked to the public.
- Contradictory data held in `INSUFFICIENT` or `SOURCE_RECEIVED_PENDING_CHECK` until reconciled.
- Downstream model training, chronological cross-validation, and candidate promotion happen in the private APEX engine, **not** in Muse or this task list.

## Delivery

Return `muse_2027_evidence_2026_10_07.json`, a **private licensed raw/source sidecar** only when authorized, plus `muse_reconciliation_report.md` and `missing_evidence.csv`. Never share the licensed sidecar through GitHub Pages or public Git history.

[Open full 201-player queue](./muse_evidence_queue_2027.json)

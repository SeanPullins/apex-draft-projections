# Muse 2027 scouting evidence — intake audit (2026-10-08)

**State: RESEARCH INTAKE / QUARANTINED — NOT APPROVED FOR PRODUCTION**

This is an audit of the Muse-delivered file `apex_2027_full_evidence_2026-10-08.json`, not an endorsement of every claim in that file. The uploaded copy was exactly 2,097,152 bytes and terminated mid-string in record 115. **The JSON cannot be parsed or imported as supplied.** The counts below refer to the **114 fully recoverable records only**; do not infer the remainder are absent from Muse's source export.

## Observed intake

| Measure | Observation | Meaning |
| --- | ---: | --- |
| Full-board expected records | 201 | Existing APEX 2027 research scope |
| Complete records recovered in this attachment | 114 | Incomplete export; not the 201-player delivery |
| Unique rank keys in recovered portion | 114 | No duplicates in the recovered subset |
| Metric entries in recovered records (2024–26) | 7,363 | Includes raw private, licensed aggregate, and publicly sourced entries; **not** 7,363 independently authenticated measurements |
| Labeled `quality.coverage_state: VERIFIED` | 109 | Self-reported source-coverage status; not independently approved |
| `HISTORICAL_ONLY` | 3 | Do not invent 2026 production |
| `SOURCE_RECEIVED_PENDING_CHECK` | 2 | Still unresolved |
| Recovered records listing at least one conflict | 64 | Reconciliation required before accepting their affected claims |
| Total reported conflict notes | 81 | Conflicts range from minor identity conventions to substantive seasonal discrepancies |
| Licensed records with no per-field `source_url` | 6,555 | 4,442 `licensed-pff-private` plus 2,113 `licensed-cfbd`; private receipts/export manifests may provide provenance, but have **not** been audited here |

**Important:** The source supplied a `coverage_state`; this is **not** a model uncertainty score, a green-light to promote forecast confidence, or a verification of the licensed dataset's provenance.

## Sampling and reconciliation flags

- **Trevor Goosby (rank 8, Texas OT):** Public reporting of the Ohio State matchup provides a useful spot-check of the scouting narrative (46 pass-blocking snaps, zero sacks, one pressure), but does *not* authenticate privately labeled PFF season totals. Source cited by Muse: https://longhornswire.usatoday.com/story/sports/college/longhorns/football/2026/09/16/texas-lt-trevor-goosby-named-outland-trophy-national-player-of-week/91788120007/
- **CJ Carr (rank 20, Notre Dame QB):** The record's 2026 CFBD passing snapshot lists 73 attempts, 726 yards, six TDs, while its accompanying notes report five 2026 games. Reconcile with the official five-game Notre Dame statistics and capture the precise as-of game/week for both records. There is also an explicit 2025 CFBD versus article-quoted-PFF conflict. Source record and official team statistics must be independently rechecked.
- **Jordan Seaton (rank 9, LSU OT):** Muse's 2025 sack/penalty figures and LSU's official biography do not align; verify season coverage, play definition, and charting provider before resolving. LSU official athletics roster/bio is preferred for biographical and team-reported history. Do not assume an official-bio count and PFF count are equivalent events.
- **Kade Pieper (rank 38):** Position/alignment conflict (center vs. right guard); establish actual game-by-game 2026 deployment, not merely preseason position.
- **Nico Iamaleava (rank 105):** The intake itself flags older 2026 CFBD pass volume than contemporary reporting, indicating a potential snapshot lag.
- **Missingness:** Three complete entries are marked historical-only; other 2026 missingness must distinguish no opportunity, injury, transfer, source lag, and unsupported collection rather than filling zeros.

These are **audit flags** rather than blanket invalidations. Resolve by reconciling common game windows, denominators, team/school identity, source rights, and timestamp.

## Non-negotiable release gates

1. **Re-export:** Receive valid, complete JSON in size-bounded chunks or with a checksum/manifest; reassemble to exactly 201 unique rank + identity records, without orphaned/truncated objects. Preserve `apex_rank`, name, player ID, school-by-season, and transfer history.
2. **Provenance:** Every scored input needs provider/source identity, observed timestamp, license/redistribution treatment, unit, and denominator. Where a private metric cannot have a public URL, reconcile against the original authorized extract and retain an internal source receipt. A `license` tag is not proof of access.
3. **Conflict resolution:** Triage all 81 notes in this partial set, classify materiality, and record `resolved / unresolved / definition-different / snapshot-stale`. Never overwrite conflicting observations without keeping the original source and rationale.
4. **Time alignment:** For each year and particularly partial 2026, specify exact games/week covered; compare cumulative lines only over identical spans. Independently verify 2026 roles, actual participation, depth chart, injuries, and defensive positions.
5. **Quality states:** Keep `Evidence coverage: complete/partial/missing/historical-only/pending review` separate from `Forecast stability: GREEN/AMBER/RED/not-scored`. GREEN means empirically reliable *model uncertainty*, not simply possession of a record.
6. **Licensed-data containment:** Do **not** commit this uploaded raw file, private PFF numeric exports, or restricted CFBD raw records into public APEX, GitHub Pages, `data2026.js`, or bundled website JavaScript. Only publish reviewed, distribution-permitted derived features/status.
7. **Chronological training/evaluation:** Stage accepted additions privately; backtest on historical draft classes with genuine pre-draft availability. Compare baseline versus candidate using Brier, log loss, AUC where applicable, reliability/calibration and position/class slices; use appropriately grouped uncertainty intervals. Report missingness sensitivity, opponent/context adjustments and leakage controls.
8. **Promotion:** Do not change the October 7 frozen ranks, projections, model scores, or production GREEN/AMBER/RED labels until quality gates, tests, and out-of-sample candidate validation pass. Record change rationale and enable a rollback.

## Muse follow-up deliverables

- `manifest.json`: cohort size, split files, hashes, extraction dates, schema version, and counts by evidence state.
- `evidence_part_*.json`: all 201 complete rank-keyed records, **shared only through authorized private channels** if licensed entries are included.
- `muse_reconciliation_report.md`: 81+ conflicts with decision, source and games covered.
- `missing_evidence.csv`: exact unfilled attributes with legitimate missingness reason and next retrieval action.
- `provenance_receipts`: authorized source exports or traceable audit records for all private metrics.
- `research_candidate_review.md`: coverage improvements and candidate features only; **not** assertions of forecast improvement absent a backtest.

## Project integration

This report supplements [the 201-prospect Muse research handoff](./MUSE_EVIDENCE_HANDOFF.md), without altering the live board or the predictive engine. A GitHub issue tracks reconciliation and acceptance criteria. Public-facing changes should reflect new evidence as **pending review**, never auto-GREEN.

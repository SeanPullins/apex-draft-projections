# APEX Phase 1 — Exact-ID NFL roster reconciliation

Date: October 9, 2026 ET / October 10 UTC
Status: **REAL DATA SOURCE VERIFIED — NOT NFL TALENT LABEL PROMOTION**
Workflow: [Actual exact-ID roster analysis](https://github.com/SeanPullins/apex-draft-projections/actions/runs/38022183857)

## Why this check matters

A slot-blind talent model can still learn draft-capital privilege through its outcome labels. Snap-volume evaluation that excludes all players who never appear in PFR snap rows creates particularly dangerous drafted-population survival bias. Our source-audited 2013–2022 cohort has 2,558 draft selections, including 180 whose PFR player ID was not found in the corresponding four-season snap feed. They were deliberately not assigned zero NFL talent, zero pass-blocking grades, or a verified zero snap total.

## Verified historical roster join

- Input: nflverse-data PFR draft picks, 2013–2025 PFR snap-count CSV, and **2013–2025 weekly roster CSV** via nflreadr release conventions. Provider raw files retained exclusively in ephemeral GitHub Actions runner; 13 roster-file SHA-256 receipts published only as hashes.
- Source aggregate: **562,246 weekly roster records** across 13 seasons, representing approximately **178 MB of source CSVs**. For context, individual roster records do NOT prove active-game participation. In 2013, **20,514 of 31,901 weekly roster rows lacked a PFR ID** (the dataset had 2,027 distinct GSIS IDs but only 624 distinct populated PFR IDs).
- Exact join key 1: draft **PFR ID** to weekly roster PFR ID. Matches **71 of 180** absent-snap selections within years draft_year..draft_year+3.
- Exact join key 2: draft **GSIS ID** to weekly roster GSIS ID, only when there was no PFR match. **75 additional** roster matches; these were excluded by a PFR-only audit. No name-only fuzzy matches were used.
- **Total roster evidence: 146/180 (81.1%)**; **34/180 (18.9%)** remain unmatched in the available weekly roster feed. Source coverage and eligibility are not exhaustively proven.
- **OL diagnostic:** All 39 no-snap OL selections were PFR-unmatched; exact GSIS linking recovers **33**, leaving **6** unmatched. A lack of PFR data was overwhelmingly an **identity/join coverage** issue for this group.
- The source did **not** produce any automatically validated true-zero snap outcomes: **0 confirmed**. Roster presence is not the same as being active in a game, and no roster entry is not evidence of lacking NFL talent.

### Resolution summary

| Evidence status | Selections |
|---|---:|
| Exact PFR weekly roster match, no PFR snap match | 71 |
| Exact GSIS weekly roster match, no PFR snap match | 75 |
| Neither ID matched to weekly roster source | 34 |
| **Total originally missing from snap feed** | **180** |

### Remaining unmatched by position

| Position | No roster match |
|---|---:|
| CB | 8 |
| OL | 6 |
| WR | 5 |
| LB | 5 |
| EDGE | 2 |
| QB | 2 |
| RB | 2 |
| TE | 2 |
| IDL | 1 |
| S | 1 |

### What this verifies — and what it does not

Verifies: exact-ID roster source coverage, separate ID collision/conflict counters, no-snap class and position sample counts, synthetic testing of non-joins, source receipts, aggregate privacy.

Does **NOT** verify: games played on a roster, how much opportunity coaches would have provided, whether a roster-only player has genuinely zero counted snaps, missing PFR snap rows by position, on-field blocking / coverage quality, UDFA sampling, rights for broader model training or historical source vintages.

The pre-existing exploratory 70-cell first-four-year snap-by-pick table **only includes matched snap participants**; do not promote it as genuine whole-draft surplus until all 180 are correctly accounted for.

## Next Phase 1 tasks, in order

1. Reconcile the final 34 via nflverse authoritative player crosswalk and independently checked GSIS/PFR IDs; preserve unresolved rather than guess or match names.
2. Audit roster-source game types, active/inactive status, team-game identifiers and PFR snap count feeds; establish when a missing game record genuinely represents zero observed offensive/defensive participation. Do not infer talent from opportunity.
3. Verify per-team regular-season offensive/defensive plays and player snap-share denominators to compute approved Y3 role threshold; handle multi-team stints and seasons with missing rows.
4. Document usable position-specific NFL efficiency/role denominators and model rights, plus undrafted eligible population; freeze target versions.
5. User reviews complete Phase 1 labels. Only then proceed to the Phase 2 leakage audit; **no production predictions change**.

This is empirical evidence for the larger APEX north star, not proof of improvement in draft scouting accuracy.

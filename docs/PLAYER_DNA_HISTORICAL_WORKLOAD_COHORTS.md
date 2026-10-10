# APEX Player DNA — Historical four-year NFL workload context
Released in October 2026. Aggregate research UI only.

## Problem solved
Previously the DNA experience showed a handful of named size-only draft peers without explaining the actual NFL outcomes of a representative historical group. The new module adds an **observed historical cohort**, not an inferred player-to-player NFL trajectory.

## Input provenance and reproducibility
- Historical NFL outcomes: user-supplied `APEX_phase4_2026-10-09.zip` (original nflverse snap-based Phase 4 locked first-four-year workload outcomes).
- Combine anthropometrics: private APEX X9 feature export `apex-x9-predraft-inputs-private.zip`, derived from APEX's existing historical combine/RAS research and matched via stable PFR ID; not a fresh direct source receipt.
- Raw outcome population: 2,513 determined, non-specialist drafted players from 2013–2022, across nine football position groups. Four records lack usable combine weight; **2,509** included in the published aggregate.
- Outcome A: >=25% season offensive/defensive snap workload in one of first 4 NFL seasons; B: same in at least 3 seasons; C: position-relative starter-equivalent workload in at least 2 seasons. These do **not** mean AV, official games started, or high-quality play.
- Cohort construction: weight tertiles **within historical position groups**; boundaries and observed four-year outcome counts preserved in `apex-historical-context.js`. Three band counts must exactly sum to the position total.
- Player side: current APEX 2027 publicly displayed October 7 2026 ESPN-derived **listed school weight**. Height and weight of named reference peers are from the separate pre-existing v2 feature. School listed weight and historical NFL Combine measurements are not identical measurement modalities.
- Position map: ED -> EDGE, DT -> DL, CB and S -> DB (historical DB pool groups cornerbacks and safeties). QB, RB, WR, TE, OL, LB identity group unchanged.
- No roster weight: show full historical drafted position pool; never infer athlete measurement or talent quality.

## Historical drafted cohorts (known combine weight only)
| Historical group | N | Position weights grouped by boundaries (lb) |
|---|---:|---|
| DB | 520 | <=195, 196–204, >204 |
| DL | 217 | <=300, 301–315, >315 |
| EDGE | 300 | <=254, 255–270, >270 |
| LB | 243 | <=235, 236–242, >242 |
| OL | 425 | <=310, 311–318, >318 |
| QB | 113 | <=218, 219–225, >225 |
| RB | 229 | <=210, 211–223, >223 |
| TE | 143 | <=249, 250–255, >255 |
| WR | 319 | <=195, 196–210, >210 |
| **Total** | **2,509** | All disjoint |

One example: Jeremiah Smith's publicly listed 222 lb WR weight places him in the historical drafted **WR >210 lb group**, N=91. In that cohort 56 players earned a workload role, 31 sustained that role and 32 attained the locked high-workload threshold. Display 56/91 (62%) as historical frequency; **NEVER** describe it as Smith's NFL likelihood. For comparison all historical drafted WR are N=319.

## UX
- New "03B / NFL History" section sits immediately below existing named height/weight neighbors, inside progressive-disclosure "Historical comparisons & development".
- Clear title, comparative cohort counts, 3 readable bar rows with denominators and all-position rate, mobile stacked layout and expandable source definitions.
- Reuses public APEX prospects and stat summaries. No individually restricted NFL rows, CFBD metrics, PFF grades, names, identities or source payloads added to production.
- Does not alter existing Player DNA stats, Model Lab scores, current board ranks, APEX action labels, or deployed NFL predictive model.

## Known scientific limitations
1. Cohort is **drafted-only**; player selection and team opportunity make the historical frequency invalid as a probability for an undrafted or future player.
2. Weight alone is not enough to define a football archetype or prospect comps. A heavy WR may have a completely different role and skill set from a former WR at the same weight.
3. DB combines historical cornerbacks and safeties; defensive alignment, height and role are not matched.
4. No 2027 player has validated 2026 NFL success outcomes; work is descriptive, not predictive.
5. Young 2027 players' weights may change before their NFL combine.
6. Multi-year college skill/progression lines remain unavailable for most of the 201-player board and must **abstain** instead of inventing trajectories.
7. Licensed, PFR-origin and nflverse terms should be assessed before commercial use. Only count aggregates are published, not raw data.

## Validation gates
- Every band count and positive-label count reconciles to whole-position totals, all nine groups and 2,509 entrants.
- Named 2027 specific test #1 WR 222 lb maps >210 lb (91 drafted, 56 with role) and #8 OL 325 lb maps >318 lb (140 drafted).
- #61 missing weight falls back to all QBs (113); no guess.
- All 201 prospects remain selectable; old named similarity list, actual 2026 stats and Model Lab unchanged.
- No individual 2022+ PFR AV/official GS or licensed charting published.

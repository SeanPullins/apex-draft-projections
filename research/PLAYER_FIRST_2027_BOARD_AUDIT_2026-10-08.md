# APEX 2027 public-board editorial audit · October 8, 2026

## User problem
The 2027 board looked like a queue for paid scouts rather than a useful fan draft product. In the frozen research data, 26 WRs had the same `short` context, 15 QBs had `quick_pocket`, 35 OL had `run_block`, and 15 RBs had `pass_block`. Those are automated information-gain labels, **not evidence that the player has a verified short, quick-game, or pass-protection weakness**. Displaying the same question on every card made APEX appear less informed than its underlying public season snapshots.

## Changes
- Lead with the publicly recorded **2026 individual season totals, game sample, and position**. QB: passing yards/TD; receivers: receiving yards, receptions and TDs; RB: rush/receiving production; defenders: position-relevant pressures/defensive box-score indicators when available.
- Offensive-line players do **not** receive fake blocking statistics: show recorded listed roster position, height and weight as available, plus "no public blocking grade". The 35 private licensed blocking receipts remain separately flagged in internal data and open dossiers until source reconciliation; they do not get automatically promoted.
- Limited/injured/absent 2026 participation remains explicitly labeled. No zero season grade is imputed.
- Change homepage story cards to **possible risers, market cautions, uncertainty, and 2026 at a glance**, with concrete player-specific current-season snapshots rather than "validate short/quick".
- Simplify main 2027 board to **Rank / Player / APEX Take / Stability / 2026 Snapshot / APEX Summary**. Move internal scout priority and evidence intake action queues out of the consumer table.
- Move legacy topology context labels into technical details only; present position-specific interpretation limits. Original `data2027.js` and `data2026.js` remain unchanged.
- Align the fan Draft Advisor cards to the **same public-data facts** and remove the repetitious private research prompts.
- Unit and integration tests ensure all **201** player profiles have source-grounded text, genuine missingness stays missing, and no model values or licensed raw charting are fabricated.

## What this does NOT fix
- Raw Muse evidence has not been independently reconciled or converted into a new licensed/public-safe 2026 predictive feature set.
- Existing APEX `DATA_GAP` and older topology research remains in frozen internal records. Hiding an operational label from a fan view **is not** proof the data is complete or accurate.
- Defensive topology is still not supported by the 2025 role-specific research snapshots. A dash for forecast stability is not a negative grade.
- 2026 snapshot box-score values are descriptive, **not** draft-slot-free predicted NFL success probabilities.
- This does **not** recalculate any rankings, 2027 player order, confidence bands, 2026 graded stats, or Team Mode weights.

## Next real-data gate
Privately reconcile the full 201-player Muse evidence against original dated provider outputs, athlete identities/transfer histories, 2026 opportunities and denominator definition. Only after rights/verification/chronological backtest checks should new metrics, player-specific strengths and weaknesses, or probabilities be published. The interface should never substitute universal "more film" prompts for real player evidence.

# APEX Muse v2 opponent-adjusted NFL outcome backtest — independent check

Status: **RESEARCH HOLD. Do not promote predictions**. User-provided archive: `apex-opponent-adjusted-backtest-2026-10-09.zip`; reviewed October 9, 2026 (ET).

## Verifications performed

- ZIP CRC check passed; **41/41 non-manifest tracked files** passed SHA256. The manifest lists its own SHA256 inaccurately (a self-referential hash cannot serve as a reliable self-check).
- Supplied prediction file contains **896 drafted NFL prospects** from **2019–2022**, with five models each = **4,480 rows**. Only this drafted-population claim is supported for the main result. The 3,757 historical feature rows are not NFL outcome holdout observations.
- Independently reproduced Brier and log loss from all 4,480 supplied prediction records. This is **not** an independent rerun of raw CFBD extraction or model fitting: original CFBD game responses, recruiting training inputs and NFL labels are not present in the ZIP; provided code points to Muse's private workspace.
- Model M0: position base rate; M1: recruiting; M2: raw college production; M3: opponent-adjusted; M4: M1 + M3.

## Outcome A — earned an NFL role

| Model | Brier | Log loss |
|---|---:|---:|
| M0 | .235677 | .664822 |
| M1 | .231628 | .655699 |
| M2 | .238589 | .678224 |
| M3 | .231060 | .654732 |
| M4 | **.229142** | **.650545** |

The relevant claim is incremental benefit beyond an informed prior, **M4 vs M1**, not M4 vs M0:

- **M4 − M1 Brier = −.002486.** Paired individual-player 95% bootstrap [−.006406, +.001610]; draft-class-cluster 95% bootstrap **[−.010657, +.003298]** (6,000 seeded resamples).
- M4 − M1 log-loss = −.005153, player-bootstrap interval approximately [−.014410,+.004322]; draft-class interval [−.022935,+.007668] (8,000 seeded resamples).
- All intervals include zero. **The model's incremental superiority to recruiting alone is NOT established.**
- Per-class M4 − M1 Brier: 2019 n230: −.000933; 2020 n219: +.000923; 2021 n227: −.014381; 2022 n220: +.004772.
- Excluding 2021 reverses M4−M1 Brier to **+.001551** (n669). Gains depend markedly on 2021. Only four time units makes class-level uncertainty wide.
- Outcomes B/C do not demonstrate statistically reliable incremental benefit versus M1.

## Method and product gates

1. Compare to the **current production APEX model**, not just the weak M0 position-only baseline. The current test does not establish APEX uplift and does not cover all draft-eligible prospects.
2. The main 896-player test is **conditioned on eventual drafted status**. UDFA summaries are present, but individual UDFA predictions are not in the supplied ZIP and cannot independently establish population-wide improvement.
3. Real opponent source vintages are **retrospectively reconstructed**, not proven contemporary 2013–2021 game-time snapshots. Preserve this distinction and do not claim genuine pregame publication history.
4. CFBD raw `raw/`, historical recruiting predictor inputs and NFL label sources are missing from this ZIP. Derivative checksums do not establish end-to-end source reproducibility.
5. Four old crosswalk records lack GSIS ID, including **one Cole McDonald 2020 drafted test prediction**, which should have a verified unique NFL-outcome join instead of an ambiguous blank identifier.
6. Inner CV standardization/imputation is fit on the entire training window before CV splitting in supplied code. Place preprocessing inside inner folds in next methodological revision.
7. Existing 2019–2022 results have already been inspected, so subsequent ablations in those classes are development/sensitivity tests, **not new untouched validation**.
8. As of October 2026 the 2023 NFL cohort's fourth season is still incomplete. Do not treat 2023 as a mature four-year outcome holdout.

## Next decision gate

Request a private, rights-cleared raw provenance bundle from Muse. Independently replay extraction and reconstruct predictions. Separately test M1, M1+raw production, M1+adjusted production, M1+eq_* evidence-quality-only, M1+adjusted+eq_* using an identical population and as-of rules; reserve genuinely independent future cohorts for later evaluation. Do not upload player-level private records, raw licensed sources or labels to public GitHub Pages.

**Decision:** Keep the opponent-adjusted model in research; no prediction or 2027 board data changes warranted.

# APEX Opportunity Bias Audit — independent review
Date: October 10, 2026
Status: **PHASE 1 RESEARCH INTAKE, NOT INDEPENDENTLY REPRODUCED; NO MODEL PROMOTION**

Source: user-uploaded `OPPORTUNITY_BIAS_AUDIT.md` (160 lines). Claimed supporting data and scripts under `nfl_outcomes/phase1/` were **NOT included in the attachment**. The uploaded Markdown reports analyses; none of its raw cohort, predicted probabilities, scripts, labels or provenance receipts could be independently replayed.

## The central result worth preserving

Reported outcome A ("one season with at least 25% unit snap share") hit rates:
- R1 n319: **97.8%**, R2 n317: **93.4%**, R3 n382: **79.6%**, R4 n377: **67.1%**, R5 n353: **55.8%**, R6 n393: **39.2%**, R7 n372: **26.3%**.
- UDFA n3265: **5.3%**. UDFA ascertainment is uneven, limiting all-eligible comparisons.
- Drafted sample R1–R7 totals **2,513**, exactly matching our independent 2013–22 source-audited draft selections **2,558 minus 45 unsupported positions**. This arithmetic cross-check is reassuring, **not** a verified individual identity/outcome reconciliation.
- Recruiting stars alone do not equalize latent football quality across selected draft rounds. The audit's statement that within-star group differences have "minimal selection distortion" is not identified by these data.
- Draft capital's association with snap exposure is striking and should prevent us treating snap-based role targets as pure latent talent scores.

## Which recommendations can and cannot be accepted?

### ACCEPT (descriptive, no model changes)
- Track A/B/C as **participation / opportunity-and-talent** research targets, not intrinsic quality or "NFL stardom."
- Show draft-round-conditioned outcomes as an **ex-post diagnostic** in every role-label bias report.
- Maintain a separate slot-blind Talent Engine and market acquisition model; report drafted-only versus all-entrant coverage transparently.
- Consider separately defined Y2–Y4 position-aware workload label **V3b** as a *candidate secondary outcome*, **not yet approved or a replacement of quality/efficiency**.
- Reject V1 as a purported opportunity-bias cure if it barely moves outcomes. V2's construction from round medians is especially entangled with actual draft slot; investigate only as retrospective evaluation, not the primary talent target.

### DO NOT ACCEPT WITHOUT CORRECTION
1. **Round-aware hindsight is not an actionable pre-draft forecast baseline.** The M0r model reportedly uses **actual draft round**. That information is not known before the draft. It is valuable as an *oracle/after-draft diagnostic*, but must never count as a direct pre-draft competition against a slot-blind APEX model. The actionable benchmarks are position, recruiting, and archived point-in-time pre-draft consensus / expected-round signals (only where actually available).
2. **A/B/C definitions conflict with APEX's approved Phase 1 RFC.** The uploaded A is ≥25% snaps in any season; our approved `OPPORTUNITY_PROCESS_Y3` proposes ≥50% in one of Y1–Y3 OR ≥30% in two years, subject to versioning. Do not silently reuse names or thresholds; issue distinct names and label-version IDs. Audit B and C thresholds are incompletely specified in the Markdown.
3. **V3b thresholds may leak information.** The audit says "position 75th-percentile (C thresholds)" but supplies no per-position numeric thresholds, source vintage, sample sizes, or proof that each historical prediction used thresholds fitted on **eligible matured prior-training classes only**. If thresholds were calculated with test/future years, both the classification and accuracy comparison leak outcome information.
4. **No statistical proof that V3b beats the round diagnostic.** The reported incremental M1−M0r Brier = −0.0028 has no paired class-level CI in the attached report. AUC .542 is weak and does not by itself demonstrate a robust talent discovery edge. This is 2019–2022 development evidence, *already repeatedly inspected*, not an untouched holdout.
5. **A high workload label is not opportunity-neutral.** The report itself notes R1 V3b success 82% versus UDFA 2%. Call it position-adjusted workload, **not "earned stardom"** or measured efficiency.
6. **Residual odds ratios do not place a valid numerical upper bound on causal opportunity bias.** An adjusted R1-vs-R4–7 OR of 25.8 is correlational; omitted assessments, team preference, model specification and collider/selection effects prevent reliable causal partitioning. The reported 44–48% attenuation of round coefficients is **not** proof that 44–48% of bias is mediated by rookie playing time. Logistic OR scales are noncollapsible and coefficient attenuation is not a causal mediation estimate.
7. **The source cohort must be reconciled against our identity/roster audit.** The first pass recovered 146 exact PFR/GSIS roster links among 180 drafted players with no snap row, leaving 34 unresolved. The uploaded audit's full set of 5,778 participants includes 3,265 alleged UDFAs, with known under-identification; this cannot validate a full eligible-college-player talent model.
8. **Strange repeated V3b rows.** Both "Drafted" and "All" V3b rows report exactly identical −0.0065, −0.0028, .542, .563 values; request cohort-specific n, per-class rows and prediction files to confirm these were actually computed separately.
9. **Raw data and legal reuse cannot be verified.** The attached file references `SOURCE_PROVENANCE.md`, `denominator_unit_check.csv`, `recompute_check.csv`, `robust_predictability.csv`, `robust_labels_v3b.csv` and scripts, but none are attached. Claimed denominator agreement of 98–99.8% and bootstrap CIs are not reproducible from narrative-only material. PFF usage requires rights review; no PFF rows should be integrated without authorization.
10. **Historical labeling maturity remains mandatory.** Our Phase 3 Muse audit caught future-outcome leakage in a purported 2018 fold. Require `scripts/guard_nfl_outcome_maturity.py` on every historical train/test fold, including label threshold estimation. A "chronological" description by itself is not proof of maturity-safe training.

## Decision

- **YES:** Preserve this audit as an important opportunity/selection bias warning.
- **YES:** Add **ex-post actual-round / slot baselines as retrospective diagnostics**, *alongside genuine as-of market baselines*, clearly separated from production-suitable forecasts.
- **CANDIDATE:** Study V3b position-adjusted Y2–Y4 workload, requiring frozen train-only thresholds, consistent as-of, per-position cohort sizes, an independent label ID and class-level CI.
- **NO:** Promote V3b as true player quality, causal opportunity-neutrality or established edge.
- **NO:** Update 2027 production scores, market ranking, confidence status or NFL probability based on these summaries.

## Exact next files needed from Muse

Private ZIP with:
`nfl_outcomes/phase1/SOURCE_PROVENANCE.md`, `raw_inventory.csv`, `denominator_unit_check.csv`, `recompute_check.csv`, `audit_tables.json`, `robust_labels_v3b.csv`, `robust_predictability.csv`, `robust_predictability.json`, `01_provenance.py`, `02_bias_audit.py`, `03_robust_labels.py`; plus hashed feature/cohort joins, historical forecast predictions, training cutoff and label-threshold-vintage metadata. Include only legally shareable source inputs, never private credentials or medicals.

Require explicit:
- all V3b position thresholds, eligibility definition, samples and estimated dates;
- paired development-class intervals for V3b vs recruiting and market diagnostics;
- separate forecasts with/without **actual draft round**, flagged `hindsight_diagnostic`;
- fair comparison with pre-draft dated consensus where available;
- missing/undrafted selection bias and 34 unresolved identity decisions.

**Phase gate:** Research-only Phase 1 refinement. Do not advance to Phase 2 model work or select a new champion until approved NFL labels, rights and proper evaluation are complete.

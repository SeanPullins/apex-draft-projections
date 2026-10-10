# Paired candidate evaluation

`scripts/evaluate_candidate.cjs` compares a candidate probability with a baseline probability on exactly the same players. It is intended for predictions exported by the private training pipeline or another upstream system. It does not fit a model and it never makes a promotion decision.

Run it with Node 24 or newer:

```sh
node scripts/evaluate_candidate.cjs --input candidate-evaluation.json --output candidate-results.json
```

The optional `--bootstrap N` and `--seed N` arguments default to 5,000 draft-class bootstrap samples and seed `20260919`. Results include Brier score, log loss and tie-safe ROC AUC overall and in ascending draft-year order. The confidence interval is for candidate Brier minus baseline Brier; negative values favor the candidate. Whole draft classes are resampled because players from one class do not provide independent evidence about changes across eras.

## Input format

```json
{
  "schema_version": 1,
  "candidate": { "name": "candidate-v19" },
  "baseline": { "name": "draft-only-v3" },
  "evaluation_as_of": "2029-09-01T00:00:00Z",
  "already_explored_draft_years": [2022, 2023, 2024],
  "cohort_history_note": "These years appeared in earlier APEX experiments; no untouched-holdout claim is made.",
  "rows": [
    {
      "id": "2025-001",
      "draft_year": 2025,
      "label": 1,
      "forecast_timestamp": "2025-04-01T00:00:00Z",
      "outcome_mature_at": "2029-08-31T00:00:00Z",
      "candidate": {
        "id": "2025-001",
        "probability": 0.72,
        "training_outcome_cutoff": "2025-03-01T00:00:00Z"
      },
      "baseline": {
        "id": "2025-001",
        "probability": 0.65,
        "training_outcome_cutoff": "2025-03-01T00:00:00Z"
      }
    }
  ]
}
```

Every row must contain both predictions. The nested IDs must equal the row ID, IDs must be unique, labels must be binary, and probabilities must be strictly between zero and one. Both training-outcome cutoffs must precede the frozen forecast timestamp. The forecast must precede the date on which the outcome definition becomes mature, and that maturity date must be on or before `evaluation_as_of`. At least two draft classes are required so the class bootstrap is meaningful.

List every evaluation class known to have been examined during earlier research in `already_explored_draft_years`. An absent year is reported only as “not listed”; the evaluator does not call it untouched. Keep the note specific enough for a reviewer to find the experiment registry or explain its limits.

The timestamps and maturity dates are self-reported. Passing these checks does not prove that a forecast was archived at that time or that its features were free of future information. The evaluator also cannot validate that `outcome_mature_at` follows a fixed-window target definition. The producer must establish those facts from source snapshots and pipeline records, and must separately show that the prior-cohort registry is complete. Current APEX career labels have unequal follow-up, so they should not be relabeled as mature merely because a snapshot exists.

Run its focused test directly:

```sh
node scripts/test_candidate_evaluation.cjs
```

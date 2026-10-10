'use strict';

const assert = require('node:assert/strict');
const { evaluate } = require('./evaluate_candidate.cjs');

function validInput() {
  const rows = [
    ['2022-001', 2022, 1, 0.8, 0.6],
    ['2022-002', 2022, 0, 0.2, 0.4],
    ['2023-001', 2023, 1, 0.7, 0.55],
    ['2023-002', 2023, 0, 0.3, 0.45],
  ].map(([id, draftYear, label, candidate, baseline]) => ({
    id,
    draft_year: draftYear,
    label,
    forecast_timestamp: `${draftYear}-04-01T00:00:00Z`,
    outcome_mature_at: `${draftYear + 3}-09-01T00:00:00Z`,
    candidate: {
      id,
      probability: candidate,
      training_outcome_cutoff: `${draftYear - 1}-12-31T23:59:59Z`,
    },
    baseline: {
      id,
      probability: baseline,
      training_outcome_cutoff: `${draftYear - 1}-12-31T23:59:59Z`,
    },
  }));
  return {
    schema_version: 1,
    candidate: { name: 'candidate-v1' },
    baseline: { name: 'draft-only-v1' },
    evaluation_as_of: '2026-09-19T00:00:00Z',
    already_explored_draft_years: [2022],
    cohort_history_note: '2022 was used in prior model research; 2023 was reserved for this fixture.',
    rows,
  };
}

const result = evaluate(validInput(), { bootstrapReplicates: 1000, seed: 7 });
assert.equal(result.sample.paired_rows, 4);
assert.deepEqual(result.sample.draft_classes, [2022, 2023]);
assert.equal(result.overall.candidate.n, result.overall.baseline.n);
assert.equal(result.overall.candidate.auc, 1);
assert.equal(result.overall.baseline.auc, 1);
assert(result.overall.delta_candidate_minus_baseline.brier < 0);
assert(result.overall.delta_candidate_minus_baseline.logloss < 0);
assert.deepEqual(result.prior_cohort_use.already_explored_draft_years_in_sample, [2022]);
assert.deepEqual(result.prior_cohort_use.years_not_listed_as_explored, [2023]);
assert.equal(result.promotion.decision, 'not_made');
assert.equal(result.uncertainty.unit, 'draft_class');
assert.equal(result.uncertainty.replicates, 1000);
assert.match(result.sample.sha256, /^[a-f0-9]{64}$/);

const again = evaluate(validInput(), { bootstrapReplicates: 1000, seed: 7 });
assert.deepEqual(result.uncertainty, again.uncertainty, 'bootstrap must be deterministic for a fixed seed');

function rejects(change, pattern) {
  const input = validInput();
  change(input);
  assert.throws(() => evaluate(input, { bootstrapReplicates: 100 }), pattern);
}

rejects(input => { input.rows[0].candidate.id = 'wrong-id'; }, /does not match row id/);
rejects(input => { input.rows[1].id = input.rows[0].id; input.rows[1].candidate.id = input.rows[0].id; input.rows[1].baseline.id = input.rows[0].id; }, /duplicated/);
rejects(input => { input.rows[0].candidate.probability = 1; }, /strictly between 0 and 1/);
rejects(input => { input.rows[0].candidate.training_outcome_cutoff = input.rows[0].forecast_timestamp; }, /must precede forecast_timestamp/);
rejects(input => { input.rows[0].outcome_mature_at = '2027-09-01T00:00:00Z'; }, /immature outcome/);
rejects(input => { input.rows[0].forecast_timestamp = '2026-10-01T00:00:00Z'; }, /leaks the mature outcome/);
rejects(input => { delete input.cohort_history_note; }, /cohort_history_note/);
rejects(input => { input.rows = input.rows.filter(row => row.draft_year === 2022); }, /at least two draft classes/);

console.log('PASS: candidate evaluator metrics, class bootstrap, chronology, maturity, IDs and probabilities');

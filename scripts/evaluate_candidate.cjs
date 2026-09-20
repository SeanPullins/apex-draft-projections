#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_BOOTSTRAPS = 5000;
const DEFAULT_SEED = 20260919;

function fail(message) {
  throw new Error(message);
}

function parseTimestamp(value, field) {
  if (typeof value !== 'string' || !value.trim()) fail(`${field} must be a non-empty timestamp string`);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) fail(`${field} is not a valid timestamp: ${value}`);
  return milliseconds;
}

function probability(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value >= 1) {
    fail(`${field} must be a finite number strictly between 0 and 1`);
  }
  return value;
}

function binaryLabel(value, field) {
  if (value !== 0 && value !== 1) fail(`${field} must be 0 or 1`);
  return value;
}

function auc(rows, key) {
  const sorted = rows.slice().sort((a, b) => a[key] - b[key]);
  let positives = 0;
  let positiveRankSum = 0;
  for (let i = 0; i < sorted.length;) {
    let j = i + 1;
    while (j < sorted.length && sorted[j][key] === sorted[i][key]) j++;
    const averageRank = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) {
      if (sorted[k].label === 1) {
        positives++;
        positiveRankSum += averageRank;
      }
    }
    i = j;
  }
  const negatives = rows.length - positives;
  if (!positives || !negatives) return null;
  return (positiveRankSum - positives * (positives + 1) / 2) / (positives * negatives);
}

function modelMetrics(rows, key) {
  let brier = 0;
  let logloss = 0;
  let positives = 0;
  for (const row of rows) {
    const p = row[key];
    positives += row.label;
    brier += (p - row.label) ** 2;
    logloss -= row.label * Math.log(p) + (1 - row.label) * Math.log(1 - p);
  }
  return {
    n: rows.length,
    positives,
    base_rate: positives / rows.length,
    brier: brier / rows.length,
    logloss: logloss / rows.length,
    auc: auc(rows, key),
  };
}

function pairedMetrics(rows) {
  const candidate = modelMetrics(rows, 'candidate_probability');
  const baseline = modelMetrics(rows, 'baseline_probability');
  return {
    n: rows.length,
    candidate,
    baseline,
    delta_candidate_minus_baseline: {
      brier: candidate.brier - baseline.brier,
      logloss: candidate.logloss - baseline.logloss,
      auc: candidate.auc == null || baseline.auc == null ? null : candidate.auc - baseline.auc,
    },
  };
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function quantile(sorted, q) {
  if (!sorted.length) return null;
  const index = (sorted.length - 1) * q;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function classBootstrapBrier(rows, replicates, seed) {
  const grouped = new Map();
  for (const row of rows) {
    const delta = (row.candidate_probability - row.label) ** 2 -
      (row.baseline_probability - row.label) ** 2;
    const summary = grouped.get(row.draft_year) || { n: 0, sum: 0 };
    summary.n++;
    summary.sum += delta;
    grouped.set(row.draft_year, summary);
  }
  const classes = [...grouped.values()];
  if (classes.length < 2) fail('at least two draft classes are required for a class bootstrap');
  const random = seededRandom(seed);
  const deltas = [];
  for (let replicate = 0; replicate < replicates; replicate++) {
    let count = 0;
    let sum = 0;
    for (let draw = 0; draw < classes.length; draw++) {
      const sampled = classes[Math.floor(random() * classes.length)];
      count += sampled.n;
      sum += sampled.sum;
    }
    deltas.push(sum / count);
  }
  deltas.sort((a, b) => a - b);
  return {
    unit: 'draft_class',
    replicates,
    seed,
    brier_delta_candidate_minus_baseline_ci95: [quantile(deltas, 0.025), quantile(deltas, 0.975)],
    fraction_candidate_lower_brier: deltas.filter(value => value < 0).length / deltas.length,
  };
}

function normalizeInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('input must be a JSON object');
  if (input.schema_version !== 1) fail('schema_version must be 1');
  if (!input.candidate || typeof input.candidate.name !== 'string' || !input.candidate.name.trim()) {
    fail('candidate.name must be a non-empty string');
  }
  if (!input.baseline || typeof input.baseline.name !== 'string' || !input.baseline.name.trim()) {
    fail('baseline.name must be a non-empty string');
  }
  const evaluationAsOf = parseTimestamp(input.evaluation_as_of, 'evaluation_as_of');
  if (!Array.isArray(input.already_explored_draft_years)) {
    fail('already_explored_draft_years must be an array; use [] only when the registry is genuinely empty');
  }
  const exploredYears = new Set();
  for (const value of input.already_explored_draft_years) {
    if (!Number.isInteger(value)) fail('already_explored_draft_years must contain integers');
    exploredYears.add(value);
  }
  if (typeof input.cohort_history_note !== 'string' || !input.cohort_history_note.trim()) {
    fail('cohort_history_note must describe how prior cohort use was checked');
  }
  if (!Array.isArray(input.rows) || !input.rows.length) fail('rows must be a non-empty array');

  const seenIds = new Set();
  const rows = input.rows.map((row, index) => {
    const prefix = `rows[${index}]`;
    if (!row || typeof row !== 'object' || Array.isArray(row)) fail(`${prefix} must be an object`);
    if (typeof row.id !== 'string' || !row.id.trim()) fail(`${prefix}.id must be a non-empty string`);
    if (seenIds.has(row.id)) fail(`${prefix}.id is duplicated: ${row.id}`);
    seenIds.add(row.id);
    if (!Number.isInteger(row.draft_year) || row.draft_year < 1900 || row.draft_year > 3000) {
      fail(`${prefix}.draft_year must be a plausible integer year`);
    }
    const label = binaryLabel(row.label, `${prefix}.label`);
    const forecast = parseTimestamp(row.forecast_timestamp, `${prefix}.forecast_timestamp`);
    const mature = parseTimestamp(row.outcome_mature_at, `${prefix}.outcome_mature_at`);
    if (forecast >= mature) fail(`${prefix} leaks the mature outcome: forecast_timestamp must precede outcome_mature_at`);
    if (mature > evaluationAsOf) fail(`${prefix} has an immature outcome as of evaluation_as_of`);
    if (forecast > evaluationAsOf) fail(`${prefix}.forecast_timestamp is after evaluation_as_of`);
    if (new Date(forecast).getUTCFullYear() > row.draft_year) {
      fail(`${prefix}.forecast_timestamp is later than its draft year`);
    }

    for (const model of ['candidate', 'baseline']) {
      if (!row[model] || typeof row[model] !== 'object' || Array.isArray(row[model])) {
        fail(`${prefix}.${model} must be an object`);
      }
      if (row[model].id !== row.id) fail(`${prefix}.${model}.id does not match row id ${row.id}`);
      probability(row[model].probability, `${prefix}.${model}.probability`);
      const cutoff = parseTimestamp(row[model].training_outcome_cutoff,
        `${prefix}.${model}.training_outcome_cutoff`);
      if (cutoff >= forecast) {
        fail(`${prefix}.${model}.training_outcome_cutoff must precede forecast_timestamp`);
      }
    }

    return {
      id: row.id,
      draft_year: row.draft_year,
      label,
      forecast_timestamp: row.forecast_timestamp,
      outcome_mature_at: row.outcome_mature_at,
      candidate_training_outcome_cutoff: row.candidate.training_outcome_cutoff,
      baseline_training_outcome_cutoff: row.baseline.training_outcome_cutoff,
      candidate_probability: row.candidate.probability,
      baseline_probability: row.baseline.probability,
    };
  });

  return {
    candidateName: input.candidate.name.trim(),
    baselineName: input.baseline.name.trim(),
    evaluationAsOf: input.evaluation_as_of,
    exploredYears,
    cohortHistoryNote: input.cohort_history_note.trim(),
    rows,
  };
}

function fingerprint(rows) {
  const canonical = rows.slice().sort((a, b) => a.id.localeCompare(b.id)).map(row => [
    row.id, row.draft_year, row.label, row.candidate_probability, row.baseline_probability,
    row.forecast_timestamp, row.outcome_mature_at,
    row.candidate_training_outcome_cutoff, row.baseline_training_outcome_cutoff,
  ]);
  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

function evaluate(input, options = {}) {
  const normalized = normalizeInput(input);
  const replicates = options.bootstrapReplicates == null ? DEFAULT_BOOTSTRAPS : options.bootstrapReplicates;
  const seed = options.seed == null ? DEFAULT_SEED : options.seed;
  if (!Number.isInteger(replicates) || replicates < 100 || replicates > 1000000) {
    fail('bootstrap replicates must be an integer from 100 through 1000000');
  }
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    fail('seed must be an unsigned 32-bit integer');
  }

  const years = [...new Set(normalized.rows.map(row => row.draft_year))].sort((a, b) => a - b);
  const explored = years.filter(year => normalized.exploredYears.has(year));
  const notListedAsExplored = years.filter(year => !normalized.exploredYears.has(year));
  const byDraftClass = years.map(year => {
    const classRows = normalized.rows.filter(row => row.draft_year === year);
    return { draft_year: year, ...pairedMetrics(classRows) };
  });
  const overall = pairedMetrics(normalized.rows);
  if (overall.candidate.n !== overall.baseline.n || overall.n !== normalized.rows.length) {
    fail('internal error: candidate and baseline metric samples differ');
  }

  return {
    evaluator: 'apex-paired-candidate-evaluator-v1',
    candidate: normalized.candidateName,
    baseline: normalized.baselineName,
    evaluation_as_of: normalized.evaluationAsOf,
    sample: {
      paired_rows: normalized.rows.length,
      draft_classes: years,
      sha256: fingerprint(normalized.rows),
      rule: 'Every metric uses the same validated, ID-matched candidate/baseline rows.',
    },
    temporal_evidence: {
      order: 'draft_year_ascending',
      by_draft_class: byDraftClass,
    },
    overall,
    uncertainty: classBootstrapBrier(normalized.rows, replicates, seed),
    prior_cohort_use: {
      already_explored_draft_years_in_sample: explored,
      years_not_listed_as_explored: notListedAsExplored,
      note: normalized.cohortHistoryNote,
      interpretation: 'A year absent from the supplied registry is not proof that it is an untouched holdout.',
    },
    promotion: {
      decision: 'not_made',
      reason: 'This evaluator reports paired evidence and never auto-promotes a candidate.',
    },
    limitations: [
      'Timestamps and maturity dates are self-reported; they do not prove an archived forecast, absence of feature leakage, or a fixed-window target definition.',
      'The evaluator cannot prove that the supplied prior-cohort registry is complete.',
      'Statistical evidence does not replace a predeclared release rule or a genuinely untouched future cohort.',
    ],
  };
}

function usage() {
  return [
    'Usage: node scripts/evaluate_candidate.cjs --input FILE [--output FILE]',
    '       [--bootstrap N] [--seed N]',
  ].join('\n');
}

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const argument = argv[i];
    if (argument === '--help' || argument === '-h') return { help: true };
    if (!['--input', '--output', '--bootstrap', '--seed'].includes(argument)) {
      fail(`unknown argument: ${argument}`);
    }
    if (i + 1 >= argv.length) fail(`missing value for ${argument}`);
    const value = argv[++i];
    if (argument === '--input') options.input = value;
    if (argument === '--output') options.output = value;
    if (argument === '--bootstrap') options.bootstrapReplicates = Number(value);
    if (argument === '--seed') options.seed = Number(value);
  }
  if (!options.input) fail('--input is required');
  return options;
}

function main(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    process.stdout.write(usage() + '\n');
    return;
  }
  const inputPath = path.resolve(options.input);
  let input;
  try {
    input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  } catch (error) {
    fail(`cannot read valid JSON from ${inputPath}: ${error.message}`);
  }
  const result = evaluate(input, options);
  const output = JSON.stringify(result, null, 2) + '\n';
  if (options.output) fs.writeFileSync(path.resolve(options.output), output);
  else process.stdout.write(output);
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`ERROR: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { auc, classBootstrapBrier, evaluate, modelMetrics, normalizeInput, pairedMetrics };

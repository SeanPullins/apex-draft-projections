#!/usr/bin/env python3
"""Audit APEX Muse scouting evidence without redistributing licensed values.

Structural checks are NOT independent source authentication or model validation.
Exit 0 only for structurally complete inputs; otherwise exit 1.
No raw metric values are written to reports.
"""
import argparse
import collections
import datetime as dt
import hashlib
import json
import pathlib
import sys

STATES = {'VERIFIED', 'SOURCE_RECEIVED_PENDING_CHECK', 'HISTORICAL_ONLY', 'INSUFFICIENT', 'UNAVAILABLE'}
YEARS = ('2024', '2025', '2026')


def load_records(path, partial=False):
    raw = pathlib.Path(path).read_bytes()
    info = {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
            'json_valid': True, 'parse_error': None}
    try:
        doc = json.loads(raw)
        rows = doc if isinstance(doc, list) else doc.get('prospects', [])
        return rows, info
    except json.JSONDecodeError as exc:
        info.update(json_valid=False, parse_error=f'{exc.msg} at line {exc.lineno}, column {exc.colno}')
        if not partial:
            return [], info
        source = raw.decode('utf-8', errors='replace')
        offset = source.find('[')
        if offset == -1:
            return [], info
        offset += 1
        decoder = json.JSONDecoder()
        recovered = []
        while offset < len(source):
            while offset < len(source) and source[offset] in ', \t\r\n':
                offset += 1
            if offset >= len(source) or source[offset] == ']':
                break
            try:
                item, offset = decoder.raw_decode(source, offset)
                if not isinstance(item, dict):
                    break
                recovered.append(item)
            except json.JSONDecodeError:
                break
        info['partial_records_recovered'] = len(recovered)
        return recovered, info


def canonical_name(value):
    return ''.join(ch.lower() for ch in str(value or '') if ch.isalnum())


def audit(evidence_path, queue_path, partial=False):
    queue = json.loads(pathlib.Path(queue_path).read_text(encoding='utf-8'))
    expected = queue['prospects'] if isinstance(queue, dict) else queue
    baseline = {r['apex_rank']: r for r in expected}
    rows, info = load_records(evidence_path, partial=partial)
    if not isinstance(rows, list):
        rows = []
        info['parse_error'] = 'Expected a list or object with a prospects list'
    problems, missing_metadata = [], collections.Counter()
    ranks = [r.get('apex_rank') for r in rows if isinstance(r, dict)]
    duplicates = sorted((int(k), n) for k, n in collections.Counter(ranks).items()
                        if n > 1 and isinstance(k, int))
    reported = set(k for k in ranks if isinstance(k, int))
    off_queue = sorted(reported - set(baseline))
    missing = sorted(set(baseline) - reported)
    mismatches = []
    statuses = collections.Counter()
    metrics = collections.Counter()
    licensed_no_url = collections.Counter()
    conflicts_total = 0
    players_with_conflict = 0
    verified_with_conflict = 0
    empty_2026 = collections.Counter()
    for r in rows:
        if not isinstance(r, dict):
            problems.append('Non-object prospect record')
            continue
        rank = r.get('apex_rank')
        prior = baseline.get(rank)
        if not prior:
            continue
        if canonical_name(r.get('name')) != canonical_name(prior.get('name')):
            mismatches.append({'rank': rank, 'type': 'name'})
        if r.get('position') != prior.get('position'):
            mismatches.append({'rank': rank, 'type': 'position'})
        quality = r.get('quality') or {}
        state = quality.get('coverage_state', 'UNSPECIFIED')
        statuses[state] += 1
        if state not in STATES:
            problems.append(f'rank {rank}: invalid evidence state')
        conflicts = r.get('conflicts', [])
        if not isinstance(conflicts, list):
            problems.append(f'rank {rank}: conflicts must be a list')
            conflicts = []
        conflicts_total += len(conflicts)
        players_with_conflict += bool(conflicts)
        verified_with_conflict += bool(conflicts) and state == 'VERIFIED'
        seasons = r.get('seasons', {})
        if not isinstance(seasons, dict):
            problems.append(f'rank {rank}: invalid seasons object')
            continue
        for year in YEARS:
            season = seasons.get(year, {}) or {}
            if not isinstance(season, dict):
                problems.append(f'rank {rank} year {year}: invalid season')
                continue
            data = season.get('metrics', {}) or {}
            if not isinstance(data, dict):
                problems.append(f'rank {rank} year {year}: metrics not a map')
                continue
            if year == '2026' and not data:
                empty_2026[state] += 1
            for field, record in data.items():
                if not isinstance(record, dict):
                    problems.append(f'rank {rank} year {year}: invalid metric object')
                    continue
                license_tag = record.get('license') or 'unspecified'
                metrics[license_tag] += 1
                for required in ('value', 'unit', 'license', 'observed_at'):
                    if record.get(required) is None or record.get(required) == '':
                        missing_metadata[required] += 1
                if str(license_tag).startswith('licensed-') and not record.get('source_url'):
                    licensed_no_url[license_tag] += 1
                date = record.get('observed_at')
                if date:
                    try:
                        dt.date.fromisoformat(str(date))
                    except ValueError:
                        missing_metadata['bad_observed_at_format'] += 1
                url = record.get('source_url')
                if url and not str(url).startswith(('https://', 'http://')):
                    missing_metadata['bad_source_url'] += 1
    if not info['json_valid']:
        problems.append('JSON invalid or truncated')
    if len(rows) != len(expected):
        problems.append('Record count != frozen 201-player queue')
    if duplicates:
        problems.append('Duplicate rank keys')
    if missing:
        problems.append('Missing rank keys')
    if off_queue:
        problems.append('Unknown rank keys')
    if mismatches:
        problems.append('Identity or position mismatch')
    if missing_metadata:
        problems.append('Metric metadata gaps')
    if conflicts_total:
        problems.append('Reported conflicts need adjudication')
    if any(s not in {'VERIFIED', 'HISTORICAL_ONLY'} for s in statuses):
        problems.append('Evidence review still pending')
    return {
        'audit_type': 'STRUCTURAL_ONLY_NOT_SOURCE_VERIFICATION',
        'evidence_file': pathlib.Path(evidence_path).name,
        'file': info,
        'expected_count': len(expected),
        'received_count': len(rows),
        'unique_ranks': len(reported),
        'missing_rank_count': len(missing),
        'missing_ranks': missing,
        'off_queue_ranks': off_queue,
        'duplicate_ranks': duplicates,
        'identity_position_mismatches': mismatches,
        'coverage_states': dict(sorted(statuses.items())),
        'metric_entry_count': sum(metrics.values()),
        'metric_license_groups': dict(sorted(metrics.items())),
        'licensed_metrics_without_field_url': dict(sorted(licensed_no_url.items())),
        'source_receipt_verification': 'NOT_PERFORMED',
        'metadata_issues': dict(sorted(missing_metadata.items())),
        'conflicted_players': players_with_conflict,
        'conflict_notes': conflicts_total,
        'self_labeled_verified_with_conflicts': verified_with_conflict,
        'seasons_2026_without_metric_entries_by_state': dict(sorted(empty_2026.items())),
        'structural_gate': 'PASS' if not problems else 'BLOCKED',
        'promotion_gate': 'BLOCKED_REQUIRES_INDEPENDENT_SOURCE_AUDIT_AND_HISTORICAL_BACKTEST',
        'blockers': problems,
        'note': 'PASS never means source-verified or model-ready; no raw metrics are in this report.'
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--evidence', required=True)
    parser.add_argument('--queue', required=True)
    parser.add_argument('--report')
    parser.add_argument('--partial-recovery', action='store_true',
                        help='Recover complete objects from truncated JSON for diagnostics ONLY')
    args = parser.parse_args()
    result = audit(args.evidence, args.queue, partial=args.partial_recovery)
    output = json.dumps(result, indent=2, ensure_ascii=False)
    if args.report:
        pathlib.Path(args.report).write_text(output + '\n', encoding='utf-8')
    print(output)
    return 0 if result['structural_gate'] == 'PASS' else 1


if __name__ == '__main__':
    sys.exit(main())

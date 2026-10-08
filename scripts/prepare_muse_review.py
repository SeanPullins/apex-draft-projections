#!/usr/bin/env python3
"""Generate an actionable, public-safe Muse review queue from private evidence.

No licensed measurements, raw source text, grades, or conflict quotations
appear in the output. Truncated JSON can be analyzed but never approved.
"""
import argparse
import collections
import json
import pathlib
import re
from validate_muse_evidence import load_records


def conflict_tags(notes):
    tags = set()
    for note in notes:
        t = str(note).lower()
        if re.search(r'identity|same.name|wrong.player|merge[ds]?|position mismatch|school mismatch|roster conflict|jersey', t):
            tags.add('IDENTITY_OR_ROLE')
        if re.search(r'stale|snapshot|partial|through (?:week|oct|sep)|games?(?: played)? (?:count|total)|not.updated', t):
            tags.add('SNAPSHOT_WINDOW')
        if re.search(r'different counting|definitions?|discrepan|mismatch|versus|\bvs\b|conflict|counted|pff', t):
            tags.add('COUNTING_OR_PROVIDER')
        if re.search(r'injur|transfer|sit out|ineligib|opt.out|availab', t):
            tags.add('PARTICIPATION')
    if notes and not tags:
        tags.add('OTHER_DISCREPANCY')
    return sorted(tags)


def review_queue(evidence, queue, partial=True):
    frozen = json.loads(pathlib.Path(queue).read_text(encoding='utf-8'))
    expected = frozen['prospects'] if isinstance(frozen, dict) else frozen
    rows, info = load_records(evidence, partial=partial)
    recovered = {p.get('apex_rank'): p for p in rows if isinstance(p, dict)}
    tasks = []
    for q in expected:
        rank = q['apex_rank']
        p = recovered.get(rank)
        item = {'apex_rank': rank, 'name': q['name'], 'position': q['position'],
                'workflow_priority': q.get('workflow_priority'),
                'focus': q.get('next_context', 'source_quality')}
        if p is None:
            item.update(priority='P0', status='NOT_RECOVERED_FROM_ATTACHMENT',
                        conflicts=0, tags=[], missing_2026_reason='NOT_INSPECTABLE',
                        next_action='Request complete re-export; this does not mean Muse did not research the player')
        else:
            notes = p.get('conflicts') or []
            quality = p.get('quality') or {}
            state = quality.get('coverage_state') or 'UNSPECIFIED'
            tags = conflict_tags(notes)
            identity = (''.join(c.lower() for c in str(p.get('name') or '') if c.isalnum()) !=
                        ''.join(c.lower() for c in str(q['name']) if c.isalnum())
                        or p.get('position') != q['position']
                        or 'IDENTITY_OR_ROLE' in tags)
            metrics = (p.get('seasons') or {}).get('2026') or {}
            has_2026 = bool(metrics.get('metrics'))
            availability = (p.get('availability') or {}).get('2026_status', 'UNKNOWN')
            if identity:
                priority, status, action = 'P0', 'IDENTITY_REVIEW', 'Resolve identity, role and alignment before using features'
            elif notes:
                priority, status, action = 'P1', 'CONFLICT_REVIEW', 'Reconcile source, game window and counting conventions'
            elif state in ('SOURCE_RECEIVED_PENDING_CHECK', 'INSUFFICIENT', 'UNAVAILABLE'):
                priority, status, action = 'P1', 'SOURCE_REVIEW', 'Verify source receipts and explain missingness'
            elif state == 'HISTORICAL_ONLY':
                priority, status, action = 'P2', 'HISTORICAL_ONLY', 'Verify history; do not invent 2026 observations'
            else:
                priority, status, action = 'P3', 'RECEIVED_UNAUDITED', 'Independently spot-check sources and opportunity'
            if not has_2026 and status not in ('IDENTITY_REVIEW', 'HISTORICAL_ONLY'):
                priority, status, action = 'P1', 'NO_2026_METRICS', 'Establish actual availability and collection gap'
            item.update(priority=priority, status=status, conflicts=len(notes), tags=tags,
                        source_claim=state, availability=availability,
                        missing_2026_reason='AVAILABLE_METRICS' if has_2026 else 'NO_2026_METRICS',
                        next_action=action)
        tasks.append(item)
    level = {'P0': 0, 'P1': 1, 'P2': 2, 'P3': 3}
    tasks.sort(key=lambda x: (level[x['priority']], x.get('workflow_priority') or 99, x['apex_rank']))
    return {
        'report_type': 'PUBLIC_SAFE_RESEARCH_TASKS',
        'json_complete': info['json_valid'],
        'attachment_recovered': len(rows), 'cohort_total': len(expected),
        'status_counts': dict(collections.Counter(t['status'] for t in tasks)),
        'priority_counts': dict(collections.Counter(t['priority'] for t in tasks)),
        'warning': 'No licensed metric values included; no source claim independently authenticated.',
        'tasks': tasks,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--evidence', required=True)
    parser.add_argument('--queue', required=True)
    parser.add_argument('--output', required=True, help='Only safe summary; never raw private evidence')
    parser.add_argument('--strict', action='store_true', help='Disable diagnostic partial recovery')
    args = parser.parse_args()
    report = review_queue(args.evidence, args.queue, partial=not args.strict)
    pathlib.Path(args.output).write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps({'report': args.output, 'cohort': report['cohort_total'],
                      'attachment_recovered': report['attachment_recovered'],
                      'json_complete': report['json_complete'],
                      'priority_counts': report['priority_counts']}))
    return 0 if report['json_complete'] and report['attachment_recovered'] == report['cohort_total'] else 1


if __name__ == '__main__':
    raise SystemExit(main())

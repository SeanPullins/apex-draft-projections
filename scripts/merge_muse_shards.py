#!/usr/bin/env python3
"""Reassemble private Muse JSON shards with SHA-256 manifest checks.

Manifest: {"expected_total": 201,
 "chunks": [{"file": "part-001.json", "sha256": "...", "count": 50}, ...]}
Each chunk must be a JSON array. This tool refuses output inside public APEX checkout.
Keep merged licensed data under private access only.
"""
import argparse
import hashlib
import json
import os
import pathlib
import sys
import tempfile

PUBLIC_CHECKOUT = pathlib.Path(__file__).resolve().parents[1]


def merge(manifest_path, output_path, queue_path=None):
    manifest = pathlib.Path(manifest_path).resolve()
    dest = pathlib.Path(output_path).resolve()
    if dest == PUBLIC_CHECKOUT or PUBLIC_CHECKOUT in dest.parents:
        raise ValueError('REFUSED: licensed raw data must not be written into public APEX checkout')
    config = json.loads(manifest.read_text(encoding='utf-8'))
    chunks = config.get('chunks')
    expected = config.get('expected_total')
    if not isinstance(chunks, list) or not chunks or not isinstance(expected, int) or expected < 1:
        raise ValueError('Manifest needs nonempty chunks and positive expected_total')
    merged = []
    for chunk in chunks:
        name = chunk.get('file')
        if not isinstance(name, str) or not name:
            raise ValueError('Shard name missing')
        path = (manifest.parent / name).resolve()
        if path.parent != manifest.parent:
            raise ValueError('Shard paths must be flat local filenames')
        data = path.read_bytes()
        if hashlib.sha256(data).hexdigest() != chunk.get('sha256'):
            raise ValueError(f'SHA-256 checksum mismatch: {name}')
        rows = json.loads(data)
        if not isinstance(rows, list) or not all(isinstance(x, dict) for x in rows):
            raise ValueError(f'Shard contains non-player records: {name}')
        if len(rows) != chunk.get('count'):
            raise ValueError(f'Wrong record count in {name}')
        merged.extend(rows)
    if len(merged) != expected:
        raise ValueError(f'Wrong cohort count: {len(merged)} != {expected}')
    ranks = [row.get('apex_rank') for row in merged]
    if not all(type(x) is int for x in ranks) or len(set(ranks)) != len(ranks):
        raise ValueError('Duplicate or invalid rank keys')
    if queue_path:
        queue = json.loads(pathlib.Path(queue_path).read_text(encoding='utf-8'))
        records = queue['prospects'] if isinstance(queue, dict) else queue
        by_rank = {row['apex_rank']: (row['name'], row['position']) for row in records}
        if len(records) != expected or set(ranks) != set(by_rank):
            raise ValueError('Ranks differ from frozen 201-player queue')
        def canonical(s):
            return ''.join(c.casefold() for c in str(s or '') if c.isalnum())
        for row in merged:
            name, position = by_rank[row['apex_rank']]
            if canonical(row.get('name')) != canonical(name) or row.get('position') != position:
                raise ValueError(f"Name/position mismatch at rank {row['apex_rank']}")
    if not dest.parent.exists():
        raise ValueError('Destination parent does not exist')
    result = (json.dumps(merged, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
    fd, tmp = tempfile.mkstemp(prefix='.muse-', dir=dest.parent)
    try:
        with os.fdopen(fd, 'wb') as handle:
            handle.write(result)
        os.chmod(tmp, 0o600)
        os.replace(tmp, dest)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)
    return {'records': len(merged),
            'sha256': hashlib.sha256(result).hexdigest(),
            'next': 'Run validate_muse_evidence.py; independent source audit and backtest still required.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--queue', help='Frozen public APEX rank/identity queue')
    args = parser.parse_args()
    try:
        result = merge(args.manifest, args.output, args.queue)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f'BLOCKED: {exc}', file=sys.stderr)
        return 1
    print(json.dumps(result))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

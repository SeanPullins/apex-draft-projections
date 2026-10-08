"""Synthetic Muse chunk and task-queue tests; no proprietary scouting data."""
import hashlib
import importlib.util
import json
import pathlib
import sys
import tempfile
import unittest

SCRIPTS = pathlib.Path(__file__).resolve().parents[1] / 'scripts'
sys.path.insert(0, str(SCRIPTS))


def load(name):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / (name + '.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


review = load('prepare_muse_review')
shards = load('merge_muse_shards')


class MuseIntakeTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = pathlib.Path(temp.name)
        self.queue = self.root / 'queue.json'
        self.queue.write_text(json.dumps({'prospects': [
            {'apex_rank': 1, 'name': 'One', 'position': 'QB', 'workflow_priority': 1,
             'next_context': 'pressure'},
            {'apex_rank': 2, 'name': 'Two', 'position': 'OL', 'workflow_priority': 2,
             'next_context': 'pass_block'}]}))
        self.rows = [
            {'apex_rank': 1, 'name': 'One', 'position': 'QB', 'conflicts': ['2026 snapshot stale'],
             'quality': {'coverage_state': 'VERIFIED'}, 'availability': {'2026_status': 'ACTIVE'},
             'seasons': {'2026': {'metrics': {'private_grade': {
                 'value': 98765.4321, 'license': 'licensed-pff-private'}}}}},
            {'apex_rank': 2, 'name': 'Two', 'position': 'OL', 'conflicts': [],
             'quality': {'coverage_state': 'HISTORICAL_ONLY'},
             'availability': {'2026_status': 'INJURED'},
             'seasons': {'2026': {'metrics': {}}}},
        ]
        self.evidence = self.root / 'evidence.json'

    def test_conflicts_block_auto_green_and_hide_private_values(self):
        self.evidence.write_text(json.dumps(self.rows))
        result = review.review_queue(self.evidence, self.queue)
        by_rank = {t['apex_rank']: t for t in result['tasks']}
        self.assertEqual(by_rank[1]['status'], 'CONFLICT_REVIEW')
        self.assertIn('SNAPSHOT_WINDOW', by_rank[1]['tags'])
        self.assertEqual(by_rank[2]['status'], 'HISTORICAL_ONLY')
        self.assertNotIn('98765.4321', json.dumps(result))
        self.assertTrue(result['json_complete'])

    def test_truncation_recovery_marks_missing_not_assumed_absent(self):
        self.evidence.write_text(json.dumps(self.rows)[:-60])
        result = review.review_queue(self.evidence, self.queue)
        self.assertFalse(result['json_complete'])
        self.assertEqual(result['attachment_recovered'], 1)
        self.assertEqual(result['tasks'][0]['status'], 'NOT_RECOVERED_FROM_ATTACHMENT')

    def make_shards(self):
        entries = []
        for i, part in enumerate((self.rows[:1], self.rows[1:])):
            path = self.root / f'part-{i + 1}.json'
            data = json.dumps(part).encode()
            path.write_bytes(data)
            entries.append({'file': path.name, 'sha256': hashlib.sha256(data).hexdigest(),
                            'count': len(part)})
        manifest = self.root / 'manifest.json'
        manifest.write_text(json.dumps({'expected_total': 2, 'chunks': entries}))
        return manifest

    def test_shard_merge_checks_hash_count_and_frozen_identity(self):
        manifest = self.make_shards()
        out = self.root / 'merged-private.json'
        result = shards.merge(manifest, out, self.queue)
        self.assertEqual(result['records'], 2)
        self.assertEqual(len(json.loads(out.read_text())), 2)

    def test_shard_hash_mismatch_rejected(self):
        manifest = self.make_shards()
        (self.root / 'part-1.json').write_text('{}')
        with self.assertRaisesRegex(ValueError, 'checksum'):
            shards.merge(manifest, self.root / 'private.json', self.queue)

    def test_private_shards_cannot_be_written_to_public_repo(self):
        manifest = self.make_shards()
        with self.assertRaisesRegex(ValueError, 'public APEX'):
            shards.merge(manifest, shards.PUBLIC_CHECKOUT / 'research' / 'raw-pff.json',
                         self.queue)


if __name__ == '__main__':
    unittest.main()

"""Synthetic tests for Muse evidence intake — no licensed source data required."""
import importlib.util
import json
import pathlib
import tempfile
import unittest

PATH = pathlib.Path(__file__).resolve().parents[1] / 'scripts' / 'validate_muse_evidence.py'
spec = importlib.util.spec_from_file_location('muse_validator', PATH)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class MuseValidatorTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.folder = pathlib.Path(self.tmp.name)
        self.queue = self.folder / 'queue.json'
        self.evidence = self.folder / 'muse.json'
        self.queue.write_text(json.dumps({'prospects': [
            {'apex_rank': 1, 'name': 'One', 'position': 'QB'},
            {'apex_rank': 2, 'name': 'Two', 'position': 'OL'}
        ]}))
        self.rows = [
            {'apex_rank': rank, 'name': name, 'position': pos,
             'quality': {'coverage_state': 'VERIFIED'}, 'conflicts': [],
             'seasons': {year: {'metrics': {}} for year in ('2024', '2025', '2026')}}
            for rank, name, pos in [(1, 'One', 'QB'), (2, 'Two', 'OL')]
        ]

    def test_structural_pass_does_not_approve_model_promotion(self):
        self.evidence.write_text(json.dumps(self.rows))
        result = mod.audit(self.evidence, self.queue)
        self.assertEqual(result['structural_gate'], 'PASS')
        self.assertTrue(result['promotion_gate'].startswith('BLOCKED'))

    def test_incomplete_json_fails_even_with_partial_recovery(self):
        self.evidence.write_text(json.dumps(self.rows)[:-10])
        result = mod.audit(self.evidence, self.queue, partial=True)
        self.assertEqual(result['structural_gate'], 'BLOCKED')
        self.assertFalse(result['file']['json_valid'])

    def test_conflicted_verified_blocks_approval(self):
        self.rows[0]['conflicts'] = ['Provider mismatch']
        self.evidence.write_text(json.dumps(self.rows))
        result = mod.audit(self.evidence, self.queue)
        self.assertEqual(result['self_labeled_verified_with_conflicts'], 1)
        self.assertEqual(result['structural_gate'], 'BLOCKED')

    def test_private_values_are_never_output(self):
        self.rows[0]['seasons']['2026']['metrics']['private_grade'] = {
            'value': 87.65432, 'unit': 'grade', 'license': 'licensed-pff-private',
            'observed_at': '2026-10-08', 'denominator': 200, 'source_url': None
        }
        self.evidence.write_text(json.dumps(self.rows))
        result = mod.audit(self.evidence, self.queue)
        self.assertNotIn('87.65432', json.dumps(result))
        self.assertEqual(result['licensed_metrics_without_field_url']['licensed-pff-private'], 1)

    def test_player_identity_change_blocks_approval(self):
        self.rows[1]['name'] = 'Different Person'
        self.evidence.write_text(json.dumps(self.rows))
        result = mod.audit(self.evidence, self.queue)
        self.assertEqual(result['identity_position_mismatches'], [{'rank': 2, 'type': 'name'}])
        self.assertEqual(result['structural_gate'], 'BLOCKED')


if __name__ == '__main__':
    unittest.main()

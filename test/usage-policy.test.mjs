import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateWebUsage, foldSourceSeries } from '../scripts/lib/usage-policy.mjs';
import { modelFamily } from '../scripts/lib/claude-logs.mjs';

test('web estimate stays frozen after the migration cutoff', () => {
  const phases = [
    { from: '2026-01-01', to: '2026-07-21', convsPerDay: 1, tokensPerConv: 100 },
  ];

  assert.deepEqual(
    estimateWebUsage(phases, new Date('2026-07-21T12:00:00.000Z')),
    estimateWebUsage(phases, new Date('2026-08-21T12:00:00.000Z'))
  );
});

test('an open phase stops at the supplied as-of date', () => {
  const result = estimateWebUsage(
    [{ from: '2026-07-20', to: null, convsPerDay: 2, tokensPerConv: 50 }],
    new Date('2026-07-21T12:00:00.000Z')
  );

  assert.equal(result.breakdown[0].days, 2);
  assert.equal(result.total, 200);
});

test('fresh source days replace visible days and preserve archived days', () => {
  const prior = {
    '2026-07-20': { total: 10, models: { old: 10 } },
    '2026-07-21': { total: 20, models: { old: 20 } },
  };
  const fresh = {
    '2026-07-21': {
      tokens: 30,
      in: 27,
      out: 3,
      cr: 12,
      rz: 1,
      models: { 'gpt-5.6': { total: 30, in: 27, out: 3, cr: 12, rz: 1 } },
    },
  };

  const result = foldSourceSeries(prior, fresh);
  assert.equal(result['2026-07-20'].total, 10);
  assert.deepEqual(result['2026-07-21'], {
    total: 30,
    in: 27,
    out: 3,
    cr: 12,
    rz: 1,
    models: { 'gpt-5.6': 30 },
  });
});

test('accepts existing agent sources that expose total instead of tokens', () => {
  const result = foldSourceSeries({}, {
    '2026-07-21': { total: 9, out: 2, cr: 3, models: { k3: { total: 9 } } },
  });
  assert.equal(result['2026-07-21'].total, 9);
});

test('OpenAI Codex model names map to the Codex family', () => {
  assert.equal(modelFamily('gpt-5.6-sol'), 'Codex');
  assert.equal(modelFamily('codex-auto-review'), 'Codex');
  assert.equal(modelFamily('gpt-5.5'), 'Codex');
});

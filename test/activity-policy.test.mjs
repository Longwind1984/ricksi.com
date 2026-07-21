import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeAiActivity } from '../scripts/lib/activity-policy.mjs';

test('merges Claude and Codex messages by local day while preserving the split', () => {
  const claude = { days: { '2026-07-20': { msgs: 4 }, '2026-07-21': { msgs: 3 } }, files: 2 };
  const codex = { days: { '2026-07-21': { msgs: 7 }, '2026-07-22': { msgs: 5 } }, files: 6 };

  assert.deepEqual(mergeAiActivity(claude, codex), {
    days: {
      '2026-07-20': { total: 4, claude: 4, codex: 0 },
      '2026-07-21': { total: 10, claude: 3, codex: 7 },
      '2026-07-22': { total: 5, claude: 0, codex: 5 },
    },
    files: 8,
    claudeFiles: 2,
    codexFiles: 6,
  });
});

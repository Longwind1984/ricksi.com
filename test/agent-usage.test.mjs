import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { scanTraeCoverage } from '../scripts/lib/agent-usage.mjs';

test('Trae coverage counts only structured renderer token_usage events', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'trae-coverage-'));
  const run = path.join(root, '20260701T120000', 'window1');
  mkdirSync(run, { recursive: true });
  writeFileSync(path.join(run, 'renderer.log'), [
    '2026-07-02T00:00:01.000+08:00 [info] [ai-chat][chatStreamService] _onMessage sessionId=a, event=token_usage',
    '2026-07-01T23:59:59.000+08:00 [info] [ai-chat][chatStreamService] _onMessage sessionId=b, event=token_usage',
    '2026-07-02T00:00:02.000+08:00 [info] user text says event=token_usage',
    'not-a-date [info] [ai-chat][chatStreamService] _onMessage sessionId=c, event=token_usage',
  ].join('\n'));
  writeFileSync(path.join(run, 'ai-agent_0_stdout.log'), [
    '2026-07-02T00:00:03.000001+08:00 INFO service received local event: id=Some("11"), event=Some(String("token_usage"))',
    '2026-07-02T00:00:03.000003+08:00 INFO process_ipc received local event: id=Some("11"), event=Some(String("token_usage"))',
    'chat body mentions received local event: id=Some("12"), event=Some(String("token_usage")), but has no timestamp',
  ].join('\n'));

  assert.deepEqual(await scanTraeCoverage(root), {
    status: 'events_observed',
    events: 3,
    first_seen: '2026-07-01T15:59:59.000Z',
    last_seen: '2026-07-01T16:00:03.000Z',
    files: 2,
  });
});

test('Trae coverage keeps present-but-empty and missing sources distinct', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'trae-coverage-empty-'));
  mkdirSync(path.join(root, 'run'), { recursive: true });
  writeFileSync(path.join(root, 'run', 'renderer.log'), 'ordinary renderer line\n');

  assert.deepEqual(await scanTraeCoverage(root), {
    status: 'source_present_no_events',
    events: 0,
    first_seen: null,
    last_seen: null,
    files: 1,
  });
  assert.deepEqual(await scanTraeCoverage(path.join(root, 'missing')), {
    status: 'source_missing',
    events: 0,
    first_seen: null,
    last_seen: null,
    files: 0,
  });
});

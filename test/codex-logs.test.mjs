import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { scanCodexLogs } from '../scripts/lib/codex-logs.mjs';

const roots = [];

function fixtureRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'codex-logs-test-'));
  roots.push(root);
  return root;
}

function writeRollout(root, name, records) {
  const file = path.join(root, '2026', '07', '21', name);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, records.map((record) => typeof record === 'string' ? record : JSON.stringify(record)).join('\n') + '\n');
}

function turn(model, timestamp = '2026-07-21T01:00:00.000Z') {
  return { timestamp, type: 'turn_context', payload: { model } };
}

function meta(id) {
  return { timestamp: '2026-07-21T01:00:00.000Z', type: 'session_meta', payload: { id } };
}

function token(timestamp, total) {
  return {
    timestamp,
    type: 'event_msg',
    payload: {
      type: 'token_count',
      info: {
        total_token_usage: total,
        last_token_usage: total,
      },
    },
  };
}

function usage(totalTokens, { input = totalTokens, cached = 0, output = 0, reasoning = 0 } = {}) {
  return {
    input_tokens: input,
    cached_input_tokens: cached,
    cache_write_input_tokens: 0,
    output_tokens: output,
    reasoning_output_tokens: reasoning,
    total_tokens: totalTokens,
  };
}

function event(type, timestamp = '2026-07-21T01:00:00.000Z') {
  return { timestamp, type: 'event_msg', payload: { type } };
}

test.afterEach(() => {
  while (roots.length) rmSync(roots.pop(), { recursive: true, force: true });
});

test('uses cumulative deltas and treats cached input as an input subset', async () => {
  const root = fixtureRoot();
  writeRollout(root, 'usage.jsonl', [
    turn('gpt-5.6-terra'),
    token('2026-07-21T01:00:00.000Z', usage(120, { input: 100, cached: 60, output: 20, reasoning: 5 })),
    token('2026-07-21T01:01:00.000Z', usage(180, { input: 150, cached: 90, output: 30, reasoning: 7 })),
    token('2026-07-21T01:02:00.000Z', usage(180, { input: 150, cached: 90, output: 30, reasoning: 7 })),
  ]);

  const result = await scanCodexLogs(root);
  const day = result.days['2026-07-21'];
  assert.equal(day.tokens, 180);
  assert.equal(day.in, 150);
  assert.equal(day.cr, 90);
  assert.equal(day.out, 30);
  assert.equal(day.rz, 7);
  assert.equal(day.models['gpt-5.6-terra'].total, 180);
});

test('counts shared session ids as separate rollout files', async () => {
  const root = fixtureRoot();
  writeRollout(root, 'parent.jsonl', [meta('same-id'), turn('gpt-5.6-sol'), token('2026-07-21T01:00:00.000Z', usage(80))]);
  writeRollout(root, 'child.jsonl', [meta('same-id'), turn('gpt-5.6-sol'), token('2026-07-21T02:00:00.000Z', usage(40))]);

  const result = await scanCodexLogs(root);
  assert.equal(result.days['2026-07-21'].tokens, 120);
  assert.equal(result.files, 2);
});

test('counts visible collaboration messages and ignores tool events', async () => {
  const root = fixtureRoot();
  writeRollout(root, 'activity.jsonl', [
    event('user_message'),
    event('agent_message'),
    event('custom_tool_call'),
    event('agent_message'),
  ]);

  const result = await scanCodexLogs(root);
  assert.equal(result.days['2026-07-21'].msgs, 3);
  assert.equal(result.days['2026-07-21'].sessions, 1);
});

test('allocates deltas across local days and handles a counter reset', async () => {
  const root = fixtureRoot();
  writeRollout(root, 'cross-day.jsonl', [
    turn('gpt-5.6-terra'),
    token('2026-07-21T15:59:00.000Z', usage(100)),
    token('2026-07-21T16:01:00.000Z', usage(150)),
    token('2026-07-21T16:02:00.000Z', usage(40)),
  ]);

  const result = await scanCodexLogs(root);
  assert.equal(result.days['2026-07-21'].tokens, 100);
  assert.equal(result.days['2026-07-22'].tokens, 90);
});

test('keeps total_tokens from older records whose category fields are zero', async () => {
  const root = fixtureRoot();
  writeRollout(root, 'old.jsonl', [
    turn('gpt-5.5'),
    token('2026-07-21T01:00:00.000Z', usage(10, { input: 0 })),
    token('2026-07-21T01:01:00.000Z', usage(30, { input: 0 })),
  ]);

  const result = await scanCodexLogs(root);
  assert.equal(result.days['2026-07-21'].tokens, 30);
  assert.equal(result.days['2026-07-21'].in, 0);
});

test('skips malformed JSON and missing directories', async () => {
  const root = fixtureRoot();
  writeRollout(root, 'malformed.jsonl', ['not-json', turn('gpt-5.6-terra'), token('2026-07-21T01:00:00.000Z', usage(15))]);

  const result = await scanCodexLogs(root);
  assert.equal(result.days['2026-07-21'].tokens, 15);
  assert.deepEqual(await scanCodexLogs(path.join(root, 'missing')), { days: {}, files: 0, parsedLines: 0 });
});

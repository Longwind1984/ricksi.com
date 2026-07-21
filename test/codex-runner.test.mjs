import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runCodexStructured } from '../scripts/lib/codex-runner.mjs';

const config = { bin: '/bin/codex', model: 'gpt-test', timeoutMs: 1234 };
const schema = { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] };

test('runs an ephemeral read-only Codex exec and parses the last message', () => {
  let call;
  const spawn = (bin, args, options) => {
    call = { bin, args, options };
    fs.writeFileSync(args[args.indexOf('--output-last-message') + 1], '{"ok":true}\n');
    return { status: 0, stdout: '', stderr: '' };
  };
  assert.deepEqual(runCodexStructured('prompt', schema, config, { spawn }), { ok: true });
  assert.equal(call.bin, '/bin/codex');
  assert.deepEqual(call.args.slice(0, 3), ['exec', '--ephemeral', '--sandbox']);
  assert.ok(call.args.includes('read-only'));
  assert.ok(call.args.includes('--skip-git-repo-check'));
  assert.ok(call.args.includes('--output-schema'));
  assert.equal(call.args.at(-1), '-');
  assert.equal(call.options.input, 'prompt');
});

test('marks quota failures so the queue can stop without losing work', () => {
  const spawn = () => ({ status: 1, stdout: '', stderr: 'usage limit reached' });
  assert.throws(
    () => runCodexStructured('prompt', schema, config, { spawn }),
    (error) => error.rateLimited === true && /Codex 退出码 1/.test(error.message)
  );
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  assertProductionBranch,
  runNetworkWithRetry,
  runRecoverable,
  acquireSyncLock,
} from '../scripts/lib/sync-runtime.mjs';

test('rejects publication from a feature branch but allows no-push diagnostics', () => {
  assert.throws(() => assertProductionBranch('feat/demo', { noPush: false }), /main/);
  assert.doesNotThrow(() => assertProductionBranch('feat/demo', { noPush: true }));
});

test('recoverable failures are collected without throwing', async () => {
  const warnings = [];
  const value = await runRecoverable('frontier', () => { throw new Error('offline'); }, warnings);
  assert.equal(value, undefined);
  assert.deepEqual(warnings, [{ name: 'frontier', message: 'offline' }]);
});

test('network retry alternates proxy/direct modes and succeeds on a transient error', async () => {
  const attempts = [];
  let calls = 0;
  const value = await runNetworkWithRetry('git pull', ({ env, useProxy, attempt }) => {
    attempts.push({ attempt, useProxy, hasProxy: Boolean(env.HTTPS_PROXY) });
    calls++;
    if (calls === 1) {
      const error = new Error('Command failed');
      error.stderr = 'fatal: unable to access: SSL_ERROR_SYSCALL';
      throw error;
    }
    return 'ok';
  }, { env: { HTTPS_PROXY: 'http://127.0.0.1:7897' }, attempts: 3, delayMs: 0, logger: () => {} });
  assert.equal(value, 'ok');
  assert.deepEqual(attempts, [
    { attempt: 1, useProxy: true, hasProxy: true },
    { attempt: 2, useProxy: false, hasProxy: false },
  ]);
});

test('network retry does not hide deterministic git errors', async () => {
  let calls = 0;
  await assert.rejects(
    runNetworkWithRetry('git pull', () => {
      calls++;
      const error = new Error('Command failed');
      error.stderr = 'fatal: Not possible to fast-forward, aborting.';
      throw error;
    }, { env: { HTTPS_PROXY: 'http://127.0.0.1:7897' }, attempts: 3, delayMs: 0 }),
    /Command failed/
  );
  assert.equal(calls, 1);
});

test('lock prevents overlapping live runs and replaces a stale owner', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-lock-test-'));
  const file = path.join(dir, 'sync.lock');
  const release = acquireSyncLock(file, 101, { isPidAlive: (pid) => pid === 101 });
  assert.throws(() => acquireSyncLock(file, 202, { isPidAlive: (pid) => pid === 101 }), /正在运行/);
  release();

  fs.writeFileSync(file, '303\n');
  const releaseStale = acquireSyncLock(file, 404, { isPidAlive: () => false });
  assert.equal(fs.readFileSync(file, 'utf8').trim(), '404');
  releaseStale();
  assert.equal(fs.existsSync(file), false);
  fs.rmSync(dir, { recursive: true, force: true });
});

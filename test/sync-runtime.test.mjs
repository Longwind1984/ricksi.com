import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { assertProductionBranch, runRecoverable, acquireSyncLock } from '../scripts/lib/sync-runtime.mjs';

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

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  assertAllowedSyncPaths,
  assertProductionBranch,
  isAllowedSyncPath,
  isNonFastForwardPushError,
  mergeActivitySnapshots,
  parsePorcelainPaths,
  reconcileWithOriginMain,
  runNetworkWithRetry,
  runRecoverable,
  acquireSyncLock,
} from '../scripts/lib/sync-runtime.mjs';

test('rejects publication from a feature branch but allows no-push diagnostics', () => {
  assert.throws(() => assertProductionBranch('feat/demo', { noPush: false }), /main/);
  assert.doesNotThrow(() => assertProductionBranch('feat/demo', { noPush: true }));
});

test('path guard allows workbench data paths and blocks UI/code paths', () => {
  assert.equal(isAllowedSyncPath('data/activity.json'), true);
  assert.equal(isAllowedSyncPath('content/kb/note.md'), true);
  assert.equal(isAllowedSyncPath('public/assets/books/cover.svg'), true);
  assert.equal(isAllowedSyncPath('src/components/LiquidNightBg.astro'), false);
  assert.equal(isAllowedSyncPath('public/favicon.svg'), false);

  assert.doesNotThrow(() =>
    assertAllowedSyncPaths(['data/activity.json', 'content/kb/a.md', 'public/assets/books/x.png'], 'test')
  );
  assert.throws(
    () => assertAllowedSyncPaths(['data/activity.json', 'src/pages/index.astro'], 'test'),
    /安全护栏拦截/
  );

  const parsed = parsePorcelainPaths(' M data/activity.json\nR  old/a.ts -> src/new.ts\n?? src/ui.astro\n');
  assert.deepEqual(parsed, ['data/activity.json', 'old/a.ts', 'src/new.ts', 'src/ui.astro']);
});

test('mergeActivitySnapshots combines local dimensions and remote gh contributions losslessly', () => {
  const local = {
    generated_at: '2026-09-18T13:33:00.000Z',
    days: {
      '2026-09-18': { git: 3, notes: 2, ai: 5, ai_split: { claude: 4, codex: 1 }, gh: 0 },
    },
    coding: { commits: 1525, streak: 10, repos: 16 },
    sources: {
      git: { commits: 1525 },
      notes: { total: 2600 },
      ai: { daysCovered: 120 },
      gh: { daysWithContributions: 90, fetched_at: '2026-09-18T06:17:00.000Z' },
    },
  };
  const remote = {
    generated_at: '2026-11-15T01:58:00.000Z',
    days: {
      '2026-09-18': { git: 0, notes: 0, ai: 0, gh: 4 },
      '2026-11-14': { git: 0, notes: 0, ai: 0, gh: 7 },
    },
    coding: { commits: 1514, streak: 1, repos: 16 },
    sources: {
      git: { commits: 1514 },
      notes: { total: 2590 },
      ai: { daysCovered: 118 },
      gh: { daysWithContributions: 98, fetched_at: '2026-11-15T01:58:00.000Z' },
    },
  };
  const merged = mergeActivitySnapshots(local, remote, {
    heatmapWeeks: 1,
    buildWeeks: () => [['mock-week']],
    currentStreak: () => 42,
  });
  assert.equal(merged.generated_at, '2026-11-15T01:58:00.000Z');
  assert.deepEqual(merged.days['2026-09-18'], {
    git: 3,
    notes: 2,
    ai: 5,
    ai_split: { claude: 4, codex: 1 },
    gh: 4,
  });
  assert.deepEqual(merged.days['2026-11-14'], { git: 0, notes: 0, ai: 0, gh: 7 });
  assert.equal(merged.coding.commits, 1525);
  assert.equal(merged.coding.streak, 42);
  assert.equal(merged.sources.gh.daysWithContributions, 98);
});

test('reconcileWithOriginMain auto-merges data/activity.json rebase conflict and blocks UI divergence', async () => {
  const calls = [];
  let resolved = false;
  const outcome = await reconcileWithOriginMain({
    fetchRemote: async () => { calls.push('fetch'); },
    isAncestor: () => false,
    execGitOut: (args) => {
      const cmd = args.join(' ');
      if (cmd === 'rev-parse HEAD') return 'local123\n';
      if (cmd === 'rev-parse origin/main') return 'remote456\n';
      if (cmd === 'merge-base HEAD origin/main') return 'base000\n';
      if (cmd === 'diff --name-only base000..HEAD') return 'data/activity.json\ndata/usage.json\n';
      if (cmd === 'diff --name-only --diff-filter=U') return 'data/activity.json\n';
      throw new Error(`unexpected gitOut: ${cmd}`);
    },
    execGit: (args) => {
      const cmd = args.join(' ');
      calls.push(cmd);
      if (cmd === 'rebase origin/main') throw new Error('CONFLICT in data/activity.json');
    },
    resolveActivityConflict: () => { resolved = true; },
  });
  assert.equal(outcome, 'rebased-merged-activity');
  assert.equal(resolved, true);
  assert.deepEqual(calls, ['fetch', 'rebase origin/main', 'add data/activity.json', 'rebase --continue']);

  await assert.rejects(
    reconcileWithOriginMain({
      fetchRemote: async () => {},
      isAncestor: () => false,
      execGitOut: (args) => {
        const cmd = args.join(' ');
        if (cmd === 'rev-parse HEAD') return 'local123\n';
        if (cmd === 'rev-parse origin/main') return 'remote456\n';
        if (cmd === 'merge-base HEAD origin/main') return 'base000\n';
        if (cmd === 'diff --name-only base000..HEAD') return 'src/components/Hero.astro\n';
        return '';
      },
      execGit: () => {},
    }),
    /安全护栏拦截/
  );
});

test('isNonFastForwardPushError detects remote race rejections', () => {
  assert.equal(isNonFastForwardPushError({ stderr: ' ! [rejected] main -> main (fetch first)' }), true);
  assert.equal(isNonFastForwardPushError({ stderr: 'fatal: Authentication failed' }), false);
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

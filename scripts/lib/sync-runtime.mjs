import fs from 'node:fs';
import path from 'node:path';

export const ALLOWED_SYNC_PREFIXES = ['data/', 'content/kb/', 'public/assets/books/'];

export function assertProductionBranch(branch, { noPush = false } = {}) {
  if (!noPush && branch !== 'main') {
    throw new Error(`发布同步只能从 main 分支运行；当前分支是 ${branch || '（detached HEAD）'}`);
  }
}

export function isAllowedSyncPath(relPath) {
  const normalized = String(relPath || '')
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '')
    .trim();
  if (!normalized) return true;
  return ALLOWED_SYNC_PREFIXES.some(
    (prefix) => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix)
  );
}

export function assertAllowedSyncPaths(paths, context = 'sync') {
  const disallowed = [...new Set(
    (paths || [])
      .map((p) => String(p || '').trim())
      .filter((p) => p && !isAllowedSyncPath(p))
  )];
  if (disallowed.length > 0) {
    throw new Error(
      `安全护栏拦截（${context}）：检测到非工作台数据路径 [${disallowed.slice(0, 8).join(', ')}]，拒绝自动合并或发布 UI/代码改动`
    );
  }
}

export function parsePorcelainPaths(porcelainOutput) {
  const out = [];
  for (const rawLine of String(porcelainOutput || '').split('\n')) {
    if (rawLine.length < 4) continue;
    const body = rawLine.slice(3).trim();
    if (!body) continue;
    const arrowIdx = body.indexOf(' -> ');
    if (arrowIdx !== -1) {
      out.push(body.slice(0, arrowIdx).trim(), body.slice(arrowIdx + 4).trim());
    } else {
      out.push(body);
    }
  }
  return out;
}

export function mergeActivitySnapshots(localObj, remoteObj, {
  heatmapWeeks = 53,
  buildWeeks,
  currentStreak,
} = {}) {
  const local = localObj || {};
  const remote = remoteObj || {};
  const days = {};
  const allDates = [
    ...new Set([
      ...Object.keys(remote.days || {}),
      ...Object.keys(local.days || {}),
    ]),
  ].sort();

  for (const k of allDates) {
    const a = local.days?.[k];
    const b = remote.days?.[k];
    const rec = {
      git: Math.max(a?.git || 0, b?.git || 0),
      notes: Math.max(a?.notes || 0, b?.notes || 0),
      ai: Math.max(a?.ai || 0, b?.ai || 0),
    };
    if (a?.ai_split || b?.ai_split) {
      rec.ai_split = {
        claude: Math.max(a?.ai_split?.claude || 0, b?.ai_split?.claude || 0),
        codex: Math.max(a?.ai_split?.codex || 0, b?.ai_split?.codex || 0),
      };
    }
    rec.gh = Math.max(a?.gh || 0, b?.gh || 0);
    days[k] = rec;
  }

  const totalOf = (rec) => (rec ? (rec.git || 0) + (rec.notes || 0) + (rec.ai || 0) + (rec.gh || 0) : 0);
  const pickHigher = (x, y, key) => ((x?.[key] || 0) >= (y?.[key] || 0) ? x : y);
  const localGh = local.sources?.gh;
  const remoteGh = remote.sources?.gh;
  const ghSource = (localGh?.fetched_at || '') > (remoteGh?.fetched_at || '') ? localGh : (remoteGh || localGh);

  return {
    generated_at: (local.generated_at || '') > (remote.generated_at || '')
      ? local.generated_at
      : (remote.generated_at || new Date().toISOString()),
    days,
    weeks: typeof buildWeeks === 'function' ? buildWeeks(days, heatmapWeeks, totalOf) : (local.weeks || remote.weeks || []),
    coding: {
      commits: Math.max(local.coding?.commits || 0, remote.coding?.commits || 0),
      streak: typeof currentStreak === 'function' ? currentStreak(days, totalOf) : (local.coding?.streak || 0),
      repos: Math.max(local.coding?.repos || 0, remote.coding?.repos || 0),
    },
    sources: {
      git: pickHigher(local.sources?.git, remote.sources?.git, 'commits'),
      notes: pickHigher(local.sources?.notes, remote.sources?.notes, 'total'),
      ai: pickHigher(local.sources?.ai, remote.sources?.ai, 'daysCovered'),
      gh: ghSource,
    },
  };
}

export async function runRecoverable(name, fn, warnings) {
  try {
    return await fn();
  } catch (error) {
    warnings.push({ name, message: error?.message || String(error) });
    return undefined;
  }
}

const PROXY_KEYS = ['HTTPS_PROXY', 'HTTP_PROXY', 'https_proxy', 'http_proxy'];

function errorText(error) {
  return [error?.message, error?.stderr, error?.stdout]
    .filter(Boolean)
    .map((part) => String(part))
    .join('\n');
}

// GitHub 443 的短暂 SSL/DNS/代理故障不应让一整晚的采集直接跳过。
// 只对可识别的网络错误重试；分支分叉、权限、认证等确定性错误立即抛出，避免掩盖真正的发布问题。
export function isRetryableNetworkError(error) {
  return /(?:unable to access|could not resolve host|ssl|tls|timed? out|connection (?:reset|closed|refused)|network is unreachable|proxy|rpc failed|remote end hung up|temporary failure)/i.test(errorText(error));
}

export function isNonFastForwardPushError(error) {
  return /(?:non-fast-forward|fetch first|Updates were rejected because the remote contains work)/i.test(errorText(error));
}

/**
 * Reconcile local `main` with `origin/main` without ever rewriting remote history:
 * - Fast-forwards when `HEAD` is behind `origin/main`.
 * - Verifies path allowlist when `HEAD` is ahead or diverged (refuses UI/code divergence).
 * - Rebases data-only local sync commits onto `origin/main`, auto-merging `data/activity.json`
 *   when GitHub Actions (`fetch-github.mjs`) and local `sync.mjs` raced on `activity.json`.
 */
export async function reconcileWithOriginMain({
  fetchRemote,
  execGit,
  execGitOut,
  isAncestor,
  resolveActivityConflict,
  remote = 'origin',
  branch = 'main',
  maxRebaseSteps = 20,
}) {
  const remoteRef = `${remote}/${branch}`;
  await fetchRemote();

  const localHead = execGitOut(['rev-parse', 'HEAD']).trim();
  const remoteHead = execGitOut(['rev-parse', remoteRef]).trim();
  if (localHead === remoteHead) return 'up-to-date';

  if (isAncestor(localHead, remoteHead)) {
    execGit(['merge', '--ff-only', remoteRef]);
    return 'fast-forwarded';
  }

  if (isAncestor(remoteHead, localHead)) {
    const aheadFiles = execGitOut(['diff', '--name-only', `${remoteRef}..HEAD`]).split('\n').filter(Boolean);
    assertAllowedSyncPaths(aheadFiles, `${remoteRef}..HEAD`);
    return 'ahead-only';
  }

  const mergeBase = execGitOut(['merge-base', 'HEAD', remoteRef]).trim();
  const divergedLocalFiles = execGitOut(['diff', '--name-only', `${mergeBase}..HEAD`]).split('\n').filter(Boolean);
  assertAllowedSyncPaths(divergedLocalFiles, `分叉本地提交 ${mergeBase.slice(0, 7)}..HEAD`);

  try {
    execGit(['rebase', remoteRef]);
    return 'rebased';
  } catch (rebaseErr) {
    for (let step = 0; step < maxRebaseSteps; step++) {
      const conflicted = execGitOut(['diff', '--name-only', '--diff-filter=U']).split('\n').filter(Boolean);
      if (
        conflicted.length !== 1 ||
        conflicted[0] !== 'data/activity.json' ||
        typeof resolveActivityConflict !== 'function'
      ) {
        try { execGit(['rebase', '--abort']); } catch { /* ignore abort cleanup failure */ }
        throw new Error(
          `git rebase ${remoteRef} 遇到无法自动消解的冲突（${conflicted.join(', ') || rebaseErr?.message || 'unknown'}），已自动 abort`
        );
      }

      resolveActivityConflict();
      execGit(['add', 'data/activity.json']);
      try {
        execGit(['rebase', '--continue']);
        return 'rebased-merged-activity';
      } catch {
        // 若存在多个待重放的本地 daily sync 提交，继续下一轮冲突检查
      }
    }
    try { execGit(['rebase', '--abort']); } catch { /* ignore */ }
    throw new Error(`git rebase ${remoteRef} 超过最大重放步数（${maxRebaseSteps}），已自动 abort`);
  }
}

/**
 * Run a Git network operation with bounded retries.
 *
 * The first attempt preserves launchd's proxy environment. When a proxy was
 * injected, the next attempt removes it so a stale local proxy cannot block a
 * direct connection; later attempts alternate back to the original mode.
 * `fn` receives `{ env, attempt, useProxy }` and may be sync or async.
 */
export async function runNetworkWithRetry(name, fn, {
  env = process.env,
  attempts = 3,
  delayMs = 5000,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  logger = (message) => console.warn(message),
} = {}) {
  const baseEnv = { ...env, GIT_TERMINAL_PROMPT: '0' };
  const hasProxy = PROXY_KEYS.some((key) => baseEnv[key]);
  let lastError;

  for (let index = 0; index < attempts; index++) {
    const useProxy = !hasProxy || index % 2 === 0;
    const attemptEnv = { ...baseEnv };
    if (!useProxy) for (const key of PROXY_KEYS) delete attemptEnv[key];

    try {
      return await fn({ env: attemptEnv, attempt: index + 1, useProxy });
    } catch (error) {
      lastError = error;
      const detail = errorText(error).replace(/\s+/g, ' ').trim().slice(0, 220);
      const retryable = isRetryableNetworkError(error);
      const finalAttempt = index >= attempts - 1;
      if (!retryable || finalAttempt) throw error;
      logger(`⚠ ${name} 第 ${index + 1}/${attempts} 次失败${useProxy ? '（代理）' : '（直连）'}：${detail}；将重试`);
      await sleep(delayMs * (index + 1));
    }
  }

  throw lastError;
}

function defaultIsPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
}

export function acquireSyncLock(lockFile, pid = process.pid, options = {}) {
  const isPidAlive = options.isPidAlive || defaultIsPidAlive;
  fs.mkdirSync(path.dirname(lockFile), { recursive: true });

  const claim = () => {
    const fd = fs.openSync(lockFile, 'wx', 0o600);
    fs.writeFileSync(fd, `${pid}\n`);
    fs.closeSync(fd);
  };

  try {
    claim();
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    let owner = 0;
    try { owner = Number(fs.readFileSync(lockFile, 'utf8').trim()); } catch { /* 视为陈旧锁 */ }
    if (isPidAlive(owner)) throw new Error(`同步进程 ${owner} 正在运行，拒绝重叠执行`);
    try { fs.unlinkSync(lockFile); } catch (unlinkError) {
      if (unlinkError?.code !== 'ENOENT') throw unlinkError;
    }
    claim();
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    try {
      const owner = Number(fs.readFileSync(lockFile, 'utf8').trim());
      if (owner === pid) fs.unlinkSync(lockFile);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  };
}

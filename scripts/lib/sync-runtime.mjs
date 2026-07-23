import fs from 'node:fs';
import path from 'node:path';

export function assertProductionBranch(branch, { noPush = false } = {}) {
  if (!noPush && branch !== 'main') {
    throw new Error(`发布同步只能从 main 分支运行；当前分支是 ${branch || '（detached HEAD）'}`);
  }
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

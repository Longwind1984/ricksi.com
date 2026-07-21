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

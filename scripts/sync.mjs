// 一键同步：采集全部本地数据 →（可选）git commit + push 触发 EdgeOne / Vercel 重新部署
// 用法：npm run sync [-- --no-push]
//
// 发布走 HTTPS（remote 已改 https://…，仓库本地 credential.helper=store）：
//   SSH 22 端口在本机被 Clash fake-ip（198.18.0.0/15）黑洞，HTTPS 443 走代理可达 GitHub。
//   launchd 注入 HTTPS_PROXY=127.0.0.1:7897，凭证从 ~/.git-credentials 读、不碰 keychain。
//
// data/activity.json 有两个写者：GH Action（每天 06:17 写 gh 维度）和本地 sync（21:30 写全维度）。
// 生产同步只允许从独立 main worktree 发布；启动先 pull --ff-only，绝不在自动任务里改写历史。
//
// 每次运行向 ~/Library/Logs/workbench-sync.log 追加一行结果（成功/无变化/失败）。
// 任一致命步骤失败 → macOS 通知（osascript），不再静默吞错。
import { execFileSync } from 'node:child_process';
import { appendFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { writeVaultJournal } from './lib/sync-journal.mjs';
import { isProxyReachable } from './lib/proxy.mjs';
import { acquireSyncLock, assertProductionBranch, runRecoverable } from './lib/sync-runtime.mjs';

const noPush = process.argv.includes('--no-push');
const run = (cmd, args, opts) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
const git = (args) => run('git', args);
const gitOut = (args) => execFileSync('git', args, { encoding: 'utf8' });

const LOG_DIR = join(homedir(), 'Library', 'Logs');
const RUN_LOG = join(LOG_DIR, 'workbench-sync.log');
const LOCK_FILE = join(homedir(), 'Library', 'Caches', 'com.ricksi.workbench-sync.lock');
const startedAt = Date.now();
const warnings = [];
let releaseLock = null;
const durSec = () => Math.round((Date.now() - startedAt) / 1000);

// 每次运行追加一行：时间 · 结果 · 耗时。持久（不在 /tmp，重启不丢），便于回看「哪天没更新、为什么」。
function logRun(status) {
  const dur = Math.round((Date.now() - startedAt) / 1000);
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    appendFileSync(RUN_LOG, `${new Date().toISOString()}  ${status}  (${dur}s)\n`);
  } catch { /* 日志失败不致命 */ }
}
function notifyFail(detail) {
  const msg = `同步失败：${detail}`.replace(/["\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180);
  try {
    execFileSync('osascript', ['-e', `display notification "${msg}" with title "Workbench sync 失败" sound name "Basso"`]);
  } catch { /* 通知本身失败不致命 */ }
}
function notifyPartial(warnings) {
  const names = warnings.map((w) => w.name).join('、').slice(0, 160);
  try {
    execFileSync('osascript', ['-e', `display notification "已更新核心数据；沿用上次：${names}" with title "Workbench sync 部分完成"`]);
  } catch { /* 通知本身失败不致命 */ }
}
function markOk() {
  try { writeFileSync('/tmp/workbench-sync-last-ok', new Date().toISOString() + '\n'); } catch { /* 心跳失败不致命 */ }
}

async function main() {
  releaseLock = acquireSyncLock(LOCK_FILE);
  const branch = gitOut(['branch', '--show-current']).trim();
  assertProductionBranch(branch, { noPush });
  const hasRemote = !!gitOut(['remote']).trim();

  // 代理自适应：launchd 注入了 HTTPS_PROXY（国内 Clash 用），但代理可能没开——人在新加坡等无 GFW 环境根本不需要它。
  // 探测一次：连不上就把代理 env 全清掉，让 git push 与子采集脚本走直连，而不是被死代理拖到「整条同步挂」（6/23 事故）。
  const envProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (envProxy && !(await isProxyReachable(envProxy))) {
    for (const k of ['HTTPS_PROXY', 'HTTP_PROXY', 'https_proxy', 'http_proxy']) delete process.env[k];
    console.log(`── 0/6 代理 ${envProxy} 不可达 → 本次全程直连（无 GFW 环境无需 Clash）`);
  }

  if (!noPush && hasRemote) {
    console.log('── 0/7 更新生产 main（fast-forward only）');
    git(['pull', '--ff-only']);
  }

  console.log('── 1/7 活动热力图（git + Obsidian + Claude/Codex 日志）');
  run('node', ['scripts/collect-activity.mjs']);

  console.log('── 1.5/7 GitHub 贡献日历（可恢复）');
  await runRecoverable('GitHub 贡献', () => {
    const token = execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();
    if (!token) throw new Error('gh auth token 为空');
    run('node', ['scripts/fetch-github.mjs'], { env: { ...process.env, GITHUB_TOKEN: token } });
  }, warnings);

  console.log('── 2/7 Token 用量');
  run('node', ['scripts/collect-usage.mjs']);

  console.log('── 3/7 知识库图谱 + 笔记导出（三态：04AI full + 白名单域 stub）');
  run('node', ['scripts/sync-vault.mjs', '--migrate']);

  console.log('── 3.5/7 知识库隐私不变量');
  run('node', ['scripts/verify-privacy-invariants.mjs']);

  console.log('── 4/7 微信读书（可恢复）');
  await runRecoverable('微信读书', () => {
    run('node', ['scripts/collect-weread.mjs']);
  }, warnings);

  console.log('── 4.5/7 本地自上传 ePub 书 + 导言合入（可恢复）');
  await runRecoverable('本地 ePub', () => {
    run('node', ['scripts/merge-local-books.mjs']);
  }, warnings);

  console.log('── 5/7 前沿追踪（抓取 + Codex 梳理，可恢复）');
  await runRecoverable('前沿追踪', () => {
    run('node', ['scripts/collect-frontier.mjs']);
  }, warnings);

  for (const warning of warnings) console.warn(`   ⚠ ${warning.name}：${warning.message}；沿用上次数据`);

  if (noPush) {
    console.log('✓ 同步完成（--no-push，未提交）');
    logRun(warnings.length ? `⚠ partial no-push: ${warnings.map((w) => w.name).join(', ')}` : '⊙ no-push（已采集未提交）');
    writeVaultJournal({ outcome: warnings.length ? '⚠ 部分完成（no-push）' : '⊙ no-push', warnings, durSec: durSec() });
    return;
  }

  const status = gitOut(['status', '--porcelain', '--', 'data', 'content/kb', 'public/assets/books']);
  if (!status.trim()) {
    console.log('✓ 数据无变化，无需提交');
    markOk();
    if (warnings.length) notifyPartial(warnings);
    logRun(warnings.length ? `⚠ partial, no changes: ${warnings.map((w) => w.name).join(', ')}` : '⊙ no changes');
    writeVaultJournal({ outcome: warnings.length ? '⚠ 部分完成（无变化）' : '⊙ 无变化', warnings, durSec: durSec() });
    return;
  }
  const fileCount = status.trim().split('\n').length;
  git(['add', 'data', 'content/kb', 'public/assets/books']);
  git(['commit', '-m', `chore(data): daily sync ${new Date().toISOString().slice(0, 10)}`]);

  if (!hasRemote) {
    console.log('✓ 已提交（尚未配置远程仓库，跳过 push）');
    markOk();
    logRun(`⊙ committed, no remote (${fileCount} files)`);
    writeVaultJournal({ outcome: '⊙ 已提交（无远程）', fileCount, warnings, durSec: durSec() });
    return;
  }

  git(['push']);
  const head = gitOut(['rev-parse', '--short', 'HEAD']).trim();
  console.log('✓ 已推送，EdgeOne / Vercel 将自动重新部署');
  markOk();
  if (warnings.length) notifyPartial(warnings);
  logRun(warnings.length ? `⚠ partial pushed ${head}: ${warnings.map((w) => w.name).join(', ')}` : `✓ pushed ${head} (${fileCount} files)`);
  writeVaultJournal({ outcome: warnings.length ? '⚠ 部分完成并推送' : '✓ 推送', head, fileCount, warnings, durSec: durSec() });
}

main().catch((e) => {
  const detail = (e && e.message) || String(e);
  console.error('✗ 同步失败：', detail);
  notifyFail(detail);
  logRun(`✗ failed: ${detail.replace(/\s+/g, ' ').slice(0, 160)}`);
  writeVaultJournal({ outcome: '✗ 失败', error: detail, warnings, durSec: durSec() });
  process.exitCode = 1;
}).finally(() => {
  if (releaseLock) releaseLock();
});

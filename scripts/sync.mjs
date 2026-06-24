// 一键同步：采集全部本地数据 →（可选）git commit + push 触发 EdgeOne / Vercel 重新部署
// 用法：npm run sync [-- --no-push]
//
// 发布走 HTTPS（remote 已改 https://…，仓库本地 credential.helper=store）：
//   SSH 22 端口在本机被 Clash fake-ip（198.18.0.0/15）黑洞，HTTPS 443 走代理可达 GitHub。
//   launchd 注入 HTTPS_PROXY=127.0.0.1:7897，凭证从 ~/.git-credentials 读、不碰 keychain。
//
// data/activity.json 有两个写者：GH Action（每天 06:17 写 gh 维度）和本地 sync（21:30 写全维度）。
//   过去本地 sync 的工作树总落后 origin 一个 GH 提交 → pull --rebase 每天必在 activity.json 撞车。
//   修：① 本地 sync 自己也抓 gh 维度（fetch-github），让本地 activity.json 完整且新；
//       ② push 前 pull --rebase 用 -X theirs，activity.json 冲突一律以本地完整版为准（不丢 gh，已自抓）。
//
// 每次运行向 ~/Library/Logs/workbench-sync.log 追加一行结果（成功/无变化/失败）。
// 任一致命步骤失败 → macOS 通知（osascript），不再静默吞错。
import { execFileSync, execSync } from 'node:child_process';
import { appendFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { writeVaultJournal } from './lib/sync-journal.mjs';
import { isProxyReachable } from './lib/proxy.mjs';

const noPush = process.argv.includes('--no-push');
const run = (cmd, args, opts) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
const git = (args) => execSync(`git ${args}`, { stdio: 'inherit' });
const gitOut = (args) => execSync(`git ${args}`, { encoding: 'utf8' });

const LOG_DIR = join(homedir(), 'Library', 'Logs');
const RUN_LOG = join(LOG_DIR, 'workbench-sync.log');
const startedAt = Date.now();
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
function markOk() {
  try { writeFileSync('/tmp/workbench-sync-last-ok', new Date().toISOString() + '\n'); } catch { /* 心跳失败不致命 */ }
}

async function main() {
  // 代理自适应：launchd 注入了 HTTPS_PROXY（国内 Clash 用），但代理可能没开——人在新加坡等无 GFW 环境根本不需要它。
  // 探测一次：连不上就把代理 env 全清掉，让 git push 与子采集脚本走直连，而不是被死代理拖到「整条同步挂」（6/23 事故）。
  const envProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (envProxy && !(await isProxyReachable(envProxy))) {
    for (const k of ['HTTPS_PROXY', 'HTTP_PROXY', 'https_proxy', 'http_proxy']) delete process.env[k];
    console.log(`── 0/6 代理 ${envProxy} 不可达 → 本次全程直连（无 GFW 环境无需 Clash）`);
  }

  console.log('── 1/6 活动热力图（git + Obsidian + Claude 日志）');
  run('node', ['scripts/collect-activity.mjs']);

  console.log('── 1.5/6 GitHub 贡献日历（gh 维度，使本地 activity.json 完整、不与 GH Action 抢写）');
  try {
    const token = execSync('gh auth token', { encoding: 'utf8' }).trim();
    if (!token) throw new Error('gh auth token 为空');
    run('node', ['scripts/fetch-github.mjs'], { env: { ...process.env, GITHUB_TOKEN: token } });
  } catch {
    console.warn('   GitHub 贡献抓取跳过（无 gh token / 网络失败），沿用上次 gh 维度');
  }

  console.log('── 2/6 Token 用量');
  run('node', ['scripts/collect-usage.mjs']);

  console.log('── 3/6 知识库图谱 + 笔记导出（三态：04AI full + 白名单域 stub）');
  run('node', ['scripts/sync-vault.mjs', '--migrate']);

  console.log('── 4/6 微信读书（无 cookie 自动跳过）');
  try {
    run('node', ['scripts/collect-weread.mjs']);
  } catch {
    console.warn('   微信读书采集失败，沿用上次数据');
  }

  console.log('── 4.5/6 本地自上传 ePub 书 + 导言合入（独立幂等，无 key 也跑）');
  try {
    run('node', ['scripts/merge-local-books.mjs']);
  } catch {
    console.warn('   本地书合入失败，沿用上次 reading.json');
  }

  console.log('── 5/6 前沿追踪（抓取 + claude 梳理，单源失败不阻塞）');
  try {
    run('node', ['scripts/collect-frontier.mjs']);
  } catch {
    console.warn('   前沿追踪采集失败，沿用上次数据');
  }

  if (noPush) {
    console.log('✓ 同步完成（--no-push，未提交）');
    logRun('⊙ no-push（已采集未提交）');
    return;
  }

  const status = gitOut('status --porcelain data content/kb public/assets/books');
  if (!status.trim()) {
    console.log('✓ 数据无变化，无需提交');
    markOk();
    logRun('⊙ no changes');
    writeVaultJournal({ outcome: '⊙ 无变化' });
    return;
  }
  const fileCount = status.trim().split('\n').length;
  git('add data content/kb public/assets/books');
  git(`commit -m "chore(data): daily sync ${new Date().toISOString().slice(0, 10)}"`);

  if (!gitOut('remote').trim()) {
    console.log('✓ 已提交（尚未配置远程仓库，跳过 push）');
    markOk();
    logRun(`⊙ committed, no remote (${fileCount} files)`);
    writeVaultJournal({ outcome: '⊙ 已提交（无远程）', fileCount, durSec: durSec() });
    return;
  }

  // 推送前同步远端、防分叉。-X theirs：activity.json 与 GH Action 抢写时以本地完整版为准
  // （本地 gh 维度已由上面 fetch-github 刷新，不丢数据）。非 activity.json 的罕见冲突 → abort 兜底。
  try {
    git('pull --rebase --autostash -X theirs');
  } catch (e) {
    try { git('rebase --abort'); } catch { /* 没在 rebase 中 */ }
    throw new Error('pull --rebase 冲突，已 abort（本地 commit 保留，下次重试）：' + (e.message || e));
  }
  git('push');
  const head = gitOut('rev-parse --short HEAD').trim();
  console.log('✓ 已推送，EdgeOne / Vercel 将自动重新部署');
  markOk();
  logRun(`✓ pushed ${head} (${fileCount} files)`);
  writeVaultJournal({ outcome: '✓ 推送', head, fileCount, durSec: durSec() });
}

main().catch((e) => {
  const detail = (e && e.message) || String(e);
  console.error('✗ 同步失败：', detail);
  notifyFail(detail);
  logRun(`✗ failed: ${detail.replace(/\s+/g, ' ').slice(0, 160)}`);
  writeVaultJournal({ outcome: '✗ 失败', error: detail, durSec: durSec() });
  process.exit(1);
});

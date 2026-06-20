// 一键同步：采集全部本地数据 →（可选）git commit + push 触发 EdgeOne / Vercel 重新部署
// 用法：npm run sync [-- --no-push]
//
// 发布走 HTTPS（remote 已改 https://…，仓库本地 credential.helper=store）：
//   SSH 22 端口在本机被 Clash fake-ip（198.18.0.0/15）黑洞，HTTPS 443 走代理可达 GitHub。
//   launchd 注入 HTTPS_PROXY=127.0.0.1:7897，凭证从 ~/.git-credentials 读、不碰 keychain。
// push 前 `pull --rebase --autostash` 防分叉（GH Action / 其他会话可能已推进 origin）。
// 任一致命步骤失败 → macOS 通知（osascript），不再静默吞错。
import { execFileSync, execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const noPush = process.argv.includes('--no-push');
const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' });
const git = (args) => execSync(`git ${args}`, { stdio: 'inherit' });
const gitOut = (args) => execSync(`git ${args}`, { encoding: 'utf8' });

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
  console.log('── 1/5 活动热力图（git + Obsidian + Claude 日志）');
  run('node', ['scripts/collect-activity.mjs']);

  console.log('── 2/5 Token 用量');
  run('node', ['scripts/collect-usage.mjs']);

  console.log('── 3/5 知识库图谱 + 笔记导出（三态：04AI full + 白名单域 stub）');
  run('node', ['scripts/sync-vault.mjs', '--migrate']);

  console.log('── 4/5 微信读书（无 cookie 自动跳过）');
  try {
    run('node', ['scripts/collect-weread.mjs']);
  } catch {
    console.warn('   微信读书采集失败，沿用上次数据');
  }

  console.log('── 4.5/5 本地自上传 ePub 书 + 导言合入（独立幂等，无 key 也跑）');
  try {
    run('node', ['scripts/merge-local-books.mjs']);
  } catch {
    console.warn('   本地书合入失败，沿用上次 reading.json');
  }

  console.log('── 5/5 前沿追踪（抓取 + claude 梳理，单源失败不阻塞）');
  try {
    run('node', ['scripts/collect-frontier.mjs']);
  } catch {
    console.warn('   前沿追踪采集失败，沿用上次数据');
  }

  if (noPush) {
    console.log('✓ 同步完成（--no-push，未提交）');
    return;
  }

  const status = gitOut('status --porcelain data content/kb public/assets/books');
  if (!status.trim()) {
    console.log('✓ 数据无变化，无需提交');
    markOk();
    return;
  }
  git('add data content/kb public/assets/books');
  git(`commit -m "chore(data): daily sync ${new Date().toISOString().slice(0, 10)}"`);

  if (!gitOut('remote').trim()) {
    console.log('✓ 已提交（尚未配置远程仓库，跳过 push）');
    markOk();
    return;
  }

  // 推送前同步远端、防分叉。autostash 兼顾共享工作树里其他会话/采集器的未提交改动；
  // rebase 冲突则 abort（数据 commit 已落地，下次重试），把错误抛给顶层告警。
  try {
    git('pull --rebase --autostash');
  } catch (e) {
    try { git('rebase --abort'); } catch { /* 没在 rebase 中 */ }
    throw new Error('pull --rebase 冲突，已 abort（本地 commit 保留，下次重试）：' + (e.message || e));
  }
  git('push');
  console.log('✓ 已推送，EdgeOne / Vercel 将自动重新部署');
  markOk();
}

main().catch((e) => {
  const detail = (e && e.message) || String(e);
  console.error('✗ 同步失败：', detail);
  notifyFail(detail);
  process.exit(1);
});

// 一键同步：采集全部本地数据 → （可选）git commit + push 触发 EdgeOne 重新部署
// 用法：npm run sync [-- --no-push]
import { execFileSync, execSync } from 'node:child_process';

const noPush = process.argv.includes('--no-push');
const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' });

console.log('── 1/5 活动热力图（git + Obsidian + Claude 日志）');
run('node', ['scripts/collect-activity.mjs']);

console.log('── 2/5 Token 用量');
run('node', ['scripts/collect-usage.mjs']);

console.log('── 3/5 知识库图谱 + 笔记导出');
run('node', ['scripts/sync-vault.mjs']);

console.log('── 4/5 微信读书（无 cookie 自动跳过）');
try {
  run('node', ['scripts/collect-weread.mjs']);
} catch {
  console.warn('   微信读书采集失败，沿用上次数据');
}

console.log('── 5/5 前沿追踪（抓取 + claude 梳理，单源失败不阻塞）');
try {
  run('node', ['scripts/collect-frontier.mjs']);
} catch {
  console.warn('   前沿追踪采集失败，沿用上次数据');
}

if (noPush) {
  console.log('✓ 同步完成（--no-push，未提交）');
  process.exit(0);
}

try {
  const status = execSync('git status --porcelain data content/kb public/assets/books', { encoding: 'utf8' });
  if (!status.trim()) {
    console.log('✓ 数据无变化，无需提交');
    process.exit(0);
  }
  execSync('git add data content/kb public/assets/books', { stdio: 'inherit' });
  execSync(`git commit -m "chore(data): daily sync ${new Date().toISOString().slice(0, 10)}"`, { stdio: 'inherit' });
  const hasRemote = execSync('git remote', { encoding: 'utf8' }).trim();
  if (hasRemote) {
    execSync('git push', { stdio: 'inherit' });
    console.log('✓ 已推送，EdgeOne 将自动重新部署');
  } else {
    console.log('✓ 已提交（尚未配置远程仓库，跳过 push）');
  }
} catch (e) {
  console.error('✗ git 提交/推送失败：', e.message);
  process.exit(1);
}

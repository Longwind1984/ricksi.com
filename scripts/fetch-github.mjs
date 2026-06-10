// GitHub 贡献日历抓取（GitHub Actions 每日 cron 运行；本地有 GITHUB_TOKEN 也可跑）
// 只负责 gh 维度：合并进 data/activity.json 的 days，并重建 weeks/coding 派生数据。
import path from 'node:path';
import { CONFIG } from './config.mjs';
import { readJson, writeJson, buildWeeks, currentStreak } from './lib/util.mjs';

const OUT = path.join(CONFIG.dataDir, 'activity.json');
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
if (!token) {
  console.log('[github] 未设置 GITHUB_TOKEN，跳过（gh 维度由 Actions 维护）');
  process.exit(0);
}

const query = `query($login:String!){ user(login:$login){ contributionsCollection{
  contributionCalendar{ weeks{ contributionDays{ date contributionCount } } } } } }`;

const res = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query, variables: { login: CONFIG.githubUser } }),
});
if (!res.ok) {
  console.error(`[github] ✗ API ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const json = await res.json();
const weeks = json.data?.user?.contributionsCollection?.contributionCalendar?.weeks;
if (!weeks) {
  console.error('[github] ✗ 响应缺少贡献日历：', JSON.stringify(json).slice(0, 300));
  process.exit(1);
}

const activity = readJson(OUT);
if (!activity) {
  console.error('[github] ✗ data/activity.json 不存在，先跑 collect-activity.mjs');
  process.exit(1);
}

let merged = 0;
for (const w of weeks) {
  for (const d of w.contributionDays) {
    if (!d.contributionCount) continue;
    const rec = (activity.days[d.date] ??= { git: 0, notes: 0, ai: 0, gh: 0 });
    rec.gh = d.contributionCount;
    merged++;
  }
}

const totalOf = (rec) => (rec ? (rec.git || 0) + (rec.notes || 0) + (rec.ai || 0) + (rec.gh || 0) : 0);
activity.weeks = buildWeeks(activity.days, CONFIG.heatmapWeeks, totalOf);
activity.coding.streak = currentStreak(activity.days, totalOf);
activity.sources.gh = { user: CONFIG.githubUser, daysWithContributions: merged, fetched_at: new Date().toISOString() };
activity.generated_at = new Date().toISOString();

writeJson(OUT, activity);
console.log(`[github] 合并 ${merged} 天贡献 → ${OUT}`);

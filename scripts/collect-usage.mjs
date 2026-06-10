// Token 用量采集：解析 Claude Code 本地日志（真实）+ 早期按活跃度校准构造（标记 estimated）
// 产出 data/usage.json。仓库即存档：真实日数据一旦入库永不回退为估算。
import path from 'node:path';
import { CONFIG } from './config.mjs';
import { readJson, writeJson, dayKey, addDays, fmtCompact, WEEKDAY_CN } from './lib/util.mjs';
import { scanClaudeLogs, modelShare } from './lib/claude-logs.mjs';

const OUT = path.join(CONFIG.dataDir, 'usage.json');
const ACTIVITY = path.join(CONFIG.dataDir, 'activity.json');

const claude = await scanClaudeLogs(CONFIG.claudeProjects);
const prev = readJson(OUT, { series: {} });
const activity = readJson(ACTIVITY);

/* ---------- 真实序列：本次扫描 + 历史存档合并 ---------- */
const series = { ...prev.series };
for (const [day, v] of Object.entries(claude.days)) {
  if (v.tokens > 0 || !series[day] || series[day].estimated) {
    series[day] = { total: v.tokens, models: v.models };
  }
}

/* ---------- 估算回填：真实窗口之前、有活动的日子 ----------
   ratio = 真实窗口内 tokens / 活动点（git+notes+ai 消息），用它校准早期活跃日。
   仅在 activity.json 存在时回填；估算日标记 estimated:true，且绝不覆盖真实日。 */
let backfilled = 0;
if (activity?.days) {
  const realDays = Object.entries(series).filter(([, v]) => !v.estimated && v.total > 0);
  const firstRealDay = realDays.map(([k]) => k).sort()[0];
  if (firstRealDay && realDays.length >= 5) {
    const actOf = (k) => {
      const a = activity.days[k];
      return a ? (a.git || 0) * 30 + (a.notes || 0) * 10 + (a.ai || 0) : 0;
    };
    let tokSum = 0, actSum = 0;
    for (const [k, v] of realDays) {
      tokSum += v.total;
      actSum += actOf(k);
    }
    const ratio = actSum > 0 ? tokSum / actSum : 0;
    if (ratio > 0) {
      for (const k of Object.keys(activity.days)) {
        if (k >= firstRealDay || series[k]) continue;
        const act = actOf(k);
        if (act > 0) {
          series[k] = { total: Math.round(act * ratio), estimated: true };
          backfilled++;
        }
      }
    }
  }
}

/* ---------- 展示聚合 ---------- */
const todayKey = dayKey(new Date());
const today = series[todayKey]?.total || 0;

let week = 0;
for (let i = 0; i < 7; i++) {
  const k = dayKey(addDays(new Date(), -i));
  week += series[k]?.total || 0;
}
const cumulative = Object.values(series).reduce((s, v) => s + (v.total || 0), 0);

/* 近 7 日柱状（百万 token） */
const days7 = [];
for (let i = 6; i >= 0; i--) {
  const d = addDays(new Date(), -i);
  const k = dayKey(d);
  days7.push({
    d: i === 0 ? '今天' : WEEKDAY_CN[d.getDay()],
    v: Math.round(((series[k]?.total || 0) / 1e6) * 100) / 100,
  });
}

/* 模型占比：仅按真实日统计 */
const realOnly = {};
for (const [k, v] of Object.entries(series)) {
  if (!v.estimated && v.models) realOnly[k] = { models: v.models };
}
const models = modelShare(realOnly);

const estimatedTotal = Object.values(series).filter((v) => v.estimated).reduce((s, v) => s + v.total, 0);

const out = {
  generated_at: new Date().toISOString(),
  today,
  week: fmtCompact(week),
  cumulative: fmtCompact(cumulative),
  models: models.length ? models : [['Fable', 100]],
  days7,
  series,
  method: {
    real_window: Object.keys(claude.days).sort()[0] + ' 起（Claude Code 本地日志，按消息去重）',
    estimated_days: backfilled + Object.values(prev.series || {}).filter((v) => v.estimated).length,
    estimated_share: cumulative ? Math.round((estimatedTotal / cumulative) * 100) + '%' : '0%',
    note: '更早期按当日活跃度（git/笔记/AI 会话）校准估算，标记 estimated；真实数据逐日固化入库',
  },
};

writeJson(OUT, out);
console.log(
  `[usage] today=${fmtCompact(today)} week=${out.week} cumulative=${out.cumulative}` +
    ` models=${JSON.stringify(out.models)} backfilled=${backfilled} → ${OUT}`
);

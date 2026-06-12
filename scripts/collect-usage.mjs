// Token 用量采集 · 口径 v2（2026-06-12）
// 三段模型，方法全文见 docs/token-estimation.md：
//   A 实测：Claude Code 本地 JSONL（2026-05-27 起保留），按消息去重，逐日固化入库永不回退
//   B 估算：Claude Code 起用期 2026-05-01 ~ 实测窗口前一天，按当日活跃度相对实测中位日折算（标 estimated）
//   C 粗估：claude.ai 网页端（无任何日志依据），分两期参数化估算，独立成流、不进日序列
// v1 的错误（已纠正并在 method 里留档）：把 2023-2025 三年 git/笔记活动当低强度 AI 用量摊薄回填。
import path from 'node:path';
import { CONFIG } from './config.mjs';
import { readJson, writeJson, dayKey, addDays, fmtCompact, WEEKDAY_CN } from './lib/util.mjs';
import { scanClaudeLogs, modelShare } from './lib/claude-logs.mjs';

const OUT = path.join(CONFIG.dataDir, 'usage.json');
const ACTIVITY = path.join(CONFIG.dataDir, 'activity.json');

/* ---------- 估算参数（全部可调；出处/依据见 docs/token-estimation.md） ---------- */
const EST = {
  /* B 段：Claude Code 重度使用起点（用户口述：2026 年 5 月起用） */
  codeStart: '2026-05-01',
  /* C 段：claude.ai 网页端（用户口述：2025 下半年起、当前「中」档强度） */
  web: {
    since: '2025-07-01',
    phases: [
      // 爬坡期：2025H2，日均对话较少
      { from: '2025-07-01', to: '2025-12-31', convsPerDay: 8, tokensPerConv: 15_000 },
      // 常态期：日十几次对话 + 偶尔长文共创/深度研究（8 本 ePub 是实物锚点）
      { from: '2026-01-01', to: null, convsPerDay: 15, tokensPerConv: 22_000, longformPerWeek: 2, longformTokens: 500_000 },
    ],
  },
};

const claude = await scanClaudeLogs(CONFIG.claudeProjects);
const prev = readJson(OUT, { series: {} });
const activity = readJson(ACTIVITY);

/* ---------- A 段：真实序列 = 本次扫描 + 历史存档合并（真实日永不回退） ---------- */
const series = {};
for (const [day, v] of Object.entries(prev.series || {})) {
  if (!v.estimated) series[day] = v; // 仅继承真实日；旧估算（含 v1 的 2023-2025 回填）全部丢弃重算
}
for (const [day, v] of Object.entries(claude.days)) {
  if (v.tokens > 0 || !series[day]) {
    series[day] = { total: v.tokens, models: v.models };
  }
}

/* ---------- B 段：起用期估算（codeStart ~ 实测首日前一天） ---------- */
let backfilled = 0;
const realDays = Object.entries(series).filter(([, v]) => !v.estimated && v.total > 0);
const firstRealDay = realDays.map(([k]) => k).sort()[0];
if (activity?.days && firstRealDay && realDays.length >= 5) {
  const actOf = (k) => {
    const a = activity.days[k];
    return a ? (a.git || 0) * 30 + (a.notes || 0) * 10 + (a.ai || 0) : 0;
  };
  /* 锚点：实测窗口的「日中位 token」与「日中位活跃度」 */
  const med = (arr) => {
    const s = [...arr].sort((a, b) => a - b);
    return s.length ? s[Math.floor(s.length / 2)] : 0;
  };
  const medTok = med(realDays.map(([, v]) => v.total));
  const medAct = med(realDays.map(([k]) => actOf(k)).filter((x) => x > 0));
  if (medTok > 0 && medAct > 0) {
    for (let d = new Date(EST.codeStart); dayKey(d) < firstRealDay; d = addDays(d, 1)) {
      const k = dayKey(d);
      if (series[k]) continue;
      const act = actOf(k);
      if (act <= 0) continue;
      /* 当日估算 = 实测中位日 × 活跃度比值，封顶 1.2 倍中位日（起用期不应超过常态） */
      const v = Math.round(Math.min(medTok * (act / medAct), medTok * 1.2));
      if (v > 0) {
        series[k] = { total: v, estimated: true };
        backfilled++;
      }
    }
  }
}

/* ---------- C 段：网页端粗估（聚合值，不进日序列） ---------- */
function webEstimate() {
  const today = new Date();
  let total = 0;
  const breakdown = [];
  for (const p of EST.web.phases) {
    const from = new Date(p.from);
    const to = p.to ? new Date(p.to) : today;
    if (to < from) continue;
    const days = Math.max(0, Math.round((to - from) / 86_400_000) + 1);
    let t = days * p.convsPerDay * p.tokensPerConv;
    if (p.longformPerWeek) t += (days / 7) * p.longformPerWeek * p.longformTokens;
    t = Math.round(t);
    total += t;
    breakdown.push({ from: p.from, to: p.to || dayKey(today), days, tokens: t });
  }
  return { total, breakdown };
}
const web = webEstimate();

/* ---------- 展示聚合 ---------- */
const todayKey = dayKey(new Date());
const today = series[todayKey]?.total || 0;
/* 今日诚实分解：模型输出 / 缓存读占比（全口径大数的两个注脚） */
const todayModels = series[todayKey]?.models || {};
let todayOut = 0, todayCr = 0;
for (const t of Object.values(todayModels)) {
  todayOut += t.out || 0;
  todayCr += t.cr || 0;
}
const todayCacheShare = today ? Math.round((todayCr / today) * 100) : 0;

let week = 0;
for (let i = 0; i < 7; i++) {
  const k = dayKey(addDays(new Date(), -i));
  week += series[k]?.total || 0;
}
const cumulativeCode = Object.values(series).reduce((s, v) => s + (v.total || 0), 0);
const cumulative = cumulativeCode + web.total;

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

/* v1 累计值留档（只增不减的存档承诺：旧口径数字不消失，进方法档案） */
const v1Cumulative =
  prev.method?.version >= 2 ? prev.method.v1_cumulative : prev.cumulative || null;

const out = {
  generated_at: new Date().toISOString(),
  today,
  today_out: todayOut,
  today_cache_share: todayCacheShare,
  week: fmtCompact(week),
  cumulative: fmtCompact(cumulative),
  cumulative_code: fmtCompact(cumulativeCode),
  cumulative_web: fmtCompact(web.total),
  models: models.length ? models : [['Fable', 100]],
  days7,
  series,
  method: {
    version: 2,
    real_window: `${firstRealDay || '—'} 起（Claude Code 本地日志，按消息去重，含输入/输出/缓存读写全口径）`,
    real_days: realDays.length,
    estimated_days: backfilled,
    estimated_share: cumulativeCode ? Math.round((estimatedTotal / cumulativeCode) * 100) + '%' : '0%',
    web_estimate: {
      total: fmtCompact(web.total),
      since: EST.web.since,
      basis: '无日志依据的参数化粗估（日均对话数 × 单对话均量 + 长文共创），参数见 docs/token-estimation.md',
      breakdown: web.breakdown,
    },
    v1_cumulative: v1Cumulative,
    note:
      'v2 口径（2026-06-12）：Claude Code 实测 + 2026-05 起用期活跃度估算 + 网页端参数化粗估三段分列；' +
      'v1 曾把 2023-2025 的 git/笔记活动按低强度 AI 用量回填（已纠正，v1 数字留档于 v1_cumulative）',
  },
};

writeJson(OUT, out);
console.log(
  `[usage] today=${fmtCompact(today)}（输出 ${fmtCompact(todayOut)} · 缓存读 ${todayCacheShare}%） week=${out.week}` +
    `\n[usage] 累计=${out.cumulative}（Code ${out.cumulative_code} 实测${realDays.length}天+估算${backfilled}天 · 网页粗估 ${out.cumulative_web}）` +
    ` models=${JSON.stringify(out.models)} → ${OUT}`
);

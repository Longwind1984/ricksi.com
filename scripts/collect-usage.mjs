// Token 用量采集 · 口径 v5（2026-07-21）
// 方法全文见 docs/token-estimation.md。主数 cumulative = 全 harness 合计：
//   A 实测：Claude Code 本地 JSONL（2026-05-27 起保留），按消息去重，逐日固化入库永不回退
//   B 估算：Claude Code 起用期 2026-05-01 ~ 实测窗口前一天，按当日活跃度相对实测中位日折算（标 estimated）
//   C 粗估：claude.ai 网页端（无任何日志依据），截至迁移日冻结，独立成流、不进日序列
//   D 分源：Codex(~/.codex/sessions) + ZCode(~/.zcode model_usage) + Hermes(~/.hermes state.db) + Kimi Code(~/.kimi-code wire.jsonl)
//           + OpenClaw(~/.kimi_openclaw sessions) 本地用量，按 harness 汇总（scripts/lib/agent-usage.mjs）
//           去重①：Hermes 排除经 claude-proxy(localhost) 的会话——那些 claude -p 已计入 A 段，不排除会重复。
//           去重②：Kimi Code 只读 usage.record——同一次调用另有 step.end 记录、数值相同，都读会翻倍。
// v4→v5：并入 Codex rollout 实测；claude.ai 粗估冻结于 2026-07-21。
// v3→v4：并入 Kimi 订阅（Kimi Code + OpenClaw 两个 harness；Hermes 的 k3 原已计入、本次仅把模型家族正名为 Kimi）。
// v2→v3：v2 仅统计 Claude Code；v3 加 ZCode/Hermes 分源，主数改全 harness 合计。
// v1 的错误（已纠正并在 method 里留档）：把 2023-2025 三年 git/笔记活动当低强度 AI 用量摊薄回填。
import path from 'node:path';
import { CONFIG } from './config.mjs';
import { readJson, writeJson, dayKey, addDays, fmtCompact, WEEKDAY_CN } from './lib/util.mjs';
import { scanClaudeLogs, modelShare } from './lib/claude-logs.mjs';
import { scanCodexLogs } from './lib/codex-logs.mjs';
import { scanAgentUsage } from './lib/agent-usage.mjs';
import { estimateWebUsage, foldSourceSeries } from './lib/usage-policy.mjs';

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
      { from: '2026-01-01', to: '2026-07-21', convsPerDay: 15, tokensPerConv: 22_000, longformPerWeek: 2, longformTokens: 500_000 },
    ],
  },
};

const claude = await scanClaudeLogs(CONFIG.claudeProjects);
const codex = await scanCodexLogs(CONFIG.codexSessions);
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

/* ---------- C 段：网页端粗估（聚合值，不进日序列；迁移后冻结） ---------- */
const web = estimateWebUsage(EST.web.phases);

/* ---------- 分源：Agent harness 用量（Codex / ZCode / Hermes / Kimi Code / OpenClaw；缺源自动跳过、CI 用已提交历史） ---------- */
const agent = await scanAgentUsage(CONFIG.agentUsage);
/* 分源日序列：真实日永不回退——fresh 覆盖 + 继承历史存档（本机 DB 被清也不丢，CI 直接用已提交数据）。
   持久化的 models 简化为 {模型名: total}（够画模型条 + 分源趋势）。 */
const prevSources = prev.sources || {};
const codexSeries = foldSourceSeries(prevSources.codex?.series, codex.days);
const zcodeSeries = foldSourceSeries(prevSources.zcode?.series, agent.zcode);
const hermesSeries = foldSourceSeries(prevSources.hermes?.series, agent.hermes);
const kimiSeries = foldSourceSeries(prevSources.kimi_code?.series, agent.kimi_code);
const openclawSeries = foldSourceSeries(prevSources.openclaw?.series, agent.openclaw);
/* 除 Claude 外的全部分源序列（新增源只需加进这个数组，下面的合计/趋势/模型条自动带上） */
const agentSeriesList = [codexSeries, zcodeSeries, hermesSeries, kimiSeries, openclawSeries];
const sumSeries = (s) => Object.values(s).reduce((a, v) => a + (v.total || 0), 0);
const cumulativeCodex = sumSeries(codexSeries);
const cumulativeZcode = sumSeries(zcodeSeries);
const cumulativeHermes = sumSeries(hermesSeries);
const cumulativeKimi = sumSeries(kimiSeries);
const cumulativeOpenclaw = sumSeries(openclawSeries);

/* ---------- 展示聚合（全 harness 合计） ---------- */
const todayKey = dayKey(new Date());
/* 今日全口径分解：三源合并的模型输出 / 缓存读占比（全口径大数的两个注脚） */
let todayOut = 0, todayCr = 0;
for (const t of Object.values(series[todayKey]?.models || {})) { todayOut += t.out || 0; todayCr += t.cr || 0; }
for (const s of agentSeriesList) { const d = s[todayKey]; if (d) { todayOut += d.out || 0; todayCr += d.cr || 0; } }
const perDayGrand = (k) => (series[k]?.total || 0) + agentSeriesList.reduce((a, s) => a + (s[k]?.total || 0), 0);
const today = perDayGrand(todayKey);
const todayCacheShare = today ? Math.round((todayCr / today) * 100) : 0;

let week = 0;
for (let i = 0; i < 7; i++) week += perDayGrand(dayKey(addDays(new Date(), -i)));

const cumulativeCode = Object.values(series).reduce((s, v) => s + (v.total || 0), 0);
const cumulativeAgents = agentSeriesList.reduce((a, s) => a + sumSeries(s), 0);
const cumulative = cumulativeCode + cumulativeAgents + web.total;

/* 近 7 日柱状（百万 token，三源合计） */
const days7 = [];
for (let i = 6; i >= 0; i--) {
  const d = addDays(new Date(), -i);
  days7.push({
    d: i === 0 ? '今天' : WEEKDAY_CN[d.getDay()],
    v: Math.round((perDayGrand(dayKey(d)) / 1e6) * 100) / 100,
  });
}

/* 模型占比：全源合并（Claude 仅真实日 + 各 agent 源全序列；家族含 GLM/DeepSeek/Kimi） */
const familyDays = {};
let fi = 0;
for (const v of Object.values(series)) if (!v.estimated && v.models) familyDays['c' + fi++] = { models: v.models };
for (const s of agentSeriesList) {
  for (const [k, v] of Object.entries(s)) {
    familyDays['a' + fi++ + k] = { models: Object.fromEntries(Object.entries(v.models || {}).map(([m, t]) => [m, { total: t }])) };
  }
}
const models = modelShare(familyDays);

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
  cumulative_codex: fmtCompact(cumulativeCodex),
  cumulative_zcode: fmtCompact(cumulativeZcode),
  cumulative_hermes: fmtCompact(cumulativeHermes),
  cumulative_kimi_code: fmtCompact(cumulativeKimi),
  cumulative_openclaw: fmtCompact(cumulativeOpenclaw),
  cumulative_web: fmtCompact(web.total),
  models: models.length ? models : [['Fable', 100]],
  days7,
  series,
  /* 分源汇总（口径 v5）：主数 cumulative = 全 harness + 网页粗估之和，此处给分源明细供 UI 分列注脚 */
  sources: {
    claude_code: { label: 'Claude Code', tokens: cumulativeCode, compact: fmtCompact(cumulativeCode) },
    codex: { label: 'Codex', tokens: cumulativeCodex, compact: fmtCompact(cumulativeCodex), days: Object.keys(codexSeries).length, series: codexSeries },
    zcode: { label: 'ZCode', tokens: cumulativeZcode, compact: fmtCompact(cumulativeZcode), days: Object.keys(zcodeSeries).length, series: zcodeSeries },
    hermes: { label: 'Hermes', tokens: cumulativeHermes, compact: fmtCompact(cumulativeHermes), days: Object.keys(hermesSeries).length, series: hermesSeries },
    kimi_code: { label: 'Kimi Code', tokens: cumulativeKimi, compact: fmtCompact(cumulativeKimi), days: Object.keys(kimiSeries).length, series: kimiSeries },
    openclaw: { label: 'OpenClaw', tokens: cumulativeOpenclaw, compact: fmtCompact(cumulativeOpenclaw), days: Object.keys(openclawSeries).length, series: openclawSeries },
    web: { label: 'claude.ai 网页', tokens: web.total, compact: fmtCompact(web.total), estimated: true },
  },
  method: {
    version: 5,
    migration_date: '2026-07-21',
    real_window: `${firstRealDay || '—'} 起（Claude Code 本地日志，按消息去重，含输入/输出/缓存读写全口径）`,
    real_days: realDays.length,
    estimated_days: backfilled,
    estimated_share: cumulativeCode ? Math.round((estimatedTotal / cumulativeCode) * 100) + '%' : '0%',
    harness_split: {
      claude_code: fmtCompact(cumulativeCode),
      codex: fmtCompact(cumulativeCodex),
      zcode: fmtCompact(cumulativeZcode),
      hermes: fmtCompact(cumulativeHermes),
      kimi_code: fmtCompact(cumulativeKimi),
      openclaw: fmtCompact(cumulativeOpenclaw),
      web: fmtCompact(web.total),
      note:
        'Token 用量按 harness 分源汇总；Codex 按 rollout 文件内 token_count 的累计值做增量求和，cached_input_tokens 是 input_tokens 的子集、不重复相加。' +
        '两处去重：① Hermes 排除经 claude-proxy(localhost) 的会话（那些 claude -p 已计入 Claude Code）；' +
        '② Kimi Code 只读 usage.record（同一次调用另有 step.end 记录，两者数值相同，都读会翻倍）。' +
        'Kimi 订阅被 Kimi Code / OpenClaw / Hermes(调 api.kimi.com) 三个 harness 消耗，按 harness 分列；其订阅总消耗可从模型条的 Kimi 家族看。全口径含缓存读写。',
    },
    web_estimate: {
      total: fmtCompact(web.total),
      since: EST.web.since,
      basis: '无日志依据的参数化粗估（日均对话数 × 单对话均量 + 长文共创），参数见 docs/token-estimation.md',
      breakdown: web.breakdown,
    },
    v1_cumulative: v1Cumulative,
    note:
      'v5 口径（2026-07-21）：并入 Codex rollout 实测日志，并在迁移日冻结不再使用的 claude.ai 网页端粗估。' +
      'v4（2026-07-17）：在 v3 基础上并入 Kimi 订阅——新增 Kimi Code CLI 与 OpenClaw 两个 harness 源，模型家族识别 Kimi（Hermes 里原归「其他」的 k3 一并正名）。' +
      'v3（2026-07-11）：Token 用量按 harness 分源汇总（Claude Code + ZCode + Hermes + 网页），主数改为全 harness 合计；v2 仅统计 Claude Code。' +
      'v1 曾把 2023-2025 的 git/笔记活动按低强度 AI 用量回填（已纠正，v1 数字留档于 v1_cumulative）',
  },
};

writeJson(OUT, out);
console.log(
  `[usage] 今日=${fmtCompact(today)}（输出 ${fmtCompact(todayOut)} · 缓存读 ${todayCacheShare}%） 周=${out.week}` +
    `\n[usage] 累计=${out.cumulative} = Claude Code ${fmtCompact(cumulativeCode)}（实测${realDays.length}天+估算${backfilled}天）` +
    ` + Codex ${fmtCompact(cumulativeCodex)}（${Object.keys(codexSeries).length}天）` +
    ` + ZCode ${fmtCompact(cumulativeZcode)}（${Object.keys(zcodeSeries).length}天）` +
    ` + Hermes ${fmtCompact(cumulativeHermes)}（${Object.keys(hermesSeries).length}天）` +
    ` + Kimi Code ${fmtCompact(cumulativeKimi)}（${Object.keys(kimiSeries).length}天）` +
    ` + OpenClaw ${fmtCompact(cumulativeOpenclaw)}（${Object.keys(openclawSeries).length}天）` +
    ` + 网页粗估 ${fmtCompact(web.total)}` +
    `\n[usage] 模型=${JSON.stringify(out.models)} → ${OUT}`
);

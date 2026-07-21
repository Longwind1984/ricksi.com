import { dayKey } from './util.mjs';

/* 新扫描覆盖当前可见日，旧存档补足已经不在本机日志里的历史日。 */
export function foldSourceSeries(previous = {}, fresh = {}) {
  const series = { ...previous };
  for (const [day, value] of Object.entries(fresh)) {
    const models = {};
    for (const [model, usage] of Object.entries(value.models || {})) {
      models[model] = typeof usage === 'number' ? usage : Number(usage?.total) || 0;
    }
    series[day] = {
      total: Number(value.total ?? value.tokens) || 0,
      in: Number(value.in) || 0,
      out: Number(value.out) || 0,
      cr: Number(value.cr) || 0,
      rz: Number(value.rz) || 0,
      models,
    };
  }
  return series;
}

/* claude.ai 无本地日志，按显式阶段参数估算；固定 to 的阶段不会随当前日期继续增长。 */
export function estimateWebUsage(phases, asOf = new Date()) {
  const atLocalMidnight = (value) => {
    const key = typeof value === 'string' ? value : dayKey(value);
    const [year, month, day] = key.split('-').map(Number);
    return new Date(year, month - 1, day);
  };
  const asOfDay = atLocalMidnight(asOf);
  let total = 0;
  const breakdown = [];
  for (const phase of phases) {
    const from = atLocalMidnight(phase.from);
    const configuredTo = phase.to ? atLocalMidnight(phase.to) : asOfDay;
    const to = configuredTo > asOfDay ? asOfDay : configuredTo;
    if (to < from) continue;
    const days = Math.max(0, Math.floor((to - from) / 86_400_000) + 1);
    let tokens = days * phase.convsPerDay * phase.tokensPerConv;
    if (phase.longformPerWeek) tokens += (days / 7) * phase.longformPerWeek * phase.longformTokens;
    tokens = Math.round(tokens);
    total += tokens;
    breakdown.push({ from: phase.from, to: phase.to || dayKey(to), days, tokens });
  }
  return { total, breakdown };
}

/* 工作台 Token 展示统一格式：保留现有 K/M/B 单位，始终显示一位小数。
   兼容旧 usage.json 中已经压缩成 `14B` 的字符串，避免必须重跑采集才能生效。 */
export function formatCompactToken(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toFixed(1);
  }

  const text = String(value ?? '').trim();
  const compact = text.match(/^(-?\d+(?:\.\d+)?)\s*([KMB])$/i);
  if (compact) return `${Number(compact[1]).toFixed(1)}${compact[2].toUpperCase()}`;
  return text;
}

export function formatMillionToken(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${numeric.toFixed(1)}M` : String(value ?? '');
}

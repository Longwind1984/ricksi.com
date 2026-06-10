// 采集脚本共享工具
import fs from 'node:fs';
import path from 'node:path';

export function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export function writeJson(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 1) + '\n');
}

/* 本地时区的 YYYY-MM-DD */
export function dayKey(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/* 递归走目录（同步），yield 文件绝对路径 */
export function* walk(dir, { exclude = [], maxDepth = Infinity, depth = 0 } = {}) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (exclude.includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (depth < maxDepth) yield* walk(full, { exclude, maxDepth, depth: depth + 1 });
    } else if (e.isFile()) {
      yield full;
    }
  }
}

/* 把日计数 map 聚合成热力图周列（GitHub 风格：列=周、行=周日..周六） */
export function buildWeeks(days, weeksCount, totalOf) {
  const today = new Date();
  // 本周的周日
  const thisSunday = addDays(today, -today.getDay());
  const start = addDays(thisSunday, -(weeksCount - 1) * 7);
  // 等级阈值：非零日总量的分位数
  const inRange = [];
  for (let i = 0; i < weeksCount * 7; i++) {
    const k = dayKey(addDays(start, i));
    const t = totalOf(days[k]);
    if (t > 0) inRange.push(t);
  }
  inRange.sort((a, b) => a - b);
  const q = (p) => (inRange.length ? inRange[Math.min(inRange.length - 1, Math.floor(p * inRange.length))] : 1);
  const t1 = q(0.35), t2 = q(0.7), t3 = q(0.92);

  const weeks = [];
  for (let w = 0; w < weeksCount; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d);
      if (date > today) { col.push({ d: dayKey(date), n: 0, l: 0, future: true }); continue; }
      const k = dayKey(date);
      const rec = days[k];
      const n = totalOf(rec);
      const l = n === 0 ? 0 : n <= t1 ? 1 : n <= t2 ? 2 : n <= t3 ? 3 : 3;
      col.push({ d: k, n, l, b: rec || undefined });
    }
    weeks.push(col);
  }
  return weeks;
}

/* 连续活跃天数（自今天或昨天往回数） */
export function currentStreak(days, totalOf) {
  let streak = 0;
  let cursor = new Date();
  // 今天还没活动不打断连续：从今天开始，若今天为 0 则从昨天起算
  if (!totalOf(days[dayKey(cursor)])) cursor = addDays(cursor, -1);
  while (totalOf(days[dayKey(cursor)])) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/* 1234567 → "1.2M"，888 → "888"，45678 → "45.7K" */
export function fmtCompact(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'K';
  return String(n);
}

export const WEEKDAY_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

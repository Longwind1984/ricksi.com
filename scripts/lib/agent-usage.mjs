// 读取其他 Agent harness 的本地 Token 用量库（口径 v3 · 分源汇总）
//   ZCode  →  ~/.zcode/cli/db/db.sqlite  ·  model_usage 表（started_at = 毫秒 INTEGER）
//   Hermes →  ~/.hermes/state.db         ·  sessions 表（started_at = 秒 REAL）
// 产出与 claude-logs.scanClaudeLogs 同构：days[YYYY-MM-DD] = { total, in,out,cw,cr,rz, models:{name:{total,...}} }
// 设计取舍：
//   · 通过系统 sqlite3 CLI 读库（零依赖；macOS 自带 /usr/bin/sqlite3）；缺库/无 CLI 一律静默返回空
//     （CI、未装该工具的机器照常构建，用已提交的历史分源数据）。
//   · Hermes 排除经 claude-proxy(localhost) 的会话——那些 `claude -p` 已落 Claude JSONL、归 Claude Code，
//     不排除会与 Claude Code 重复计。
//   · 全口径 total：ZCode 用 provider 权威的 computed_total_tokens；Hermes = in+out+cache_write+cache_read+reasoning。
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

/* 跑一条只读 SQL，返回 tab 分隔的行数组；任何失败（库不存在/被锁/无 sqlite3）→ 空数组 */
function query(dbPath, sql) {
  if (!dbPath || !fs.existsSync(dbPath)) return [];
  try {
    const out = execFileSync(
      'sqlite3',
      [dbPath, '-readonly', '-noheader', '-separator', '\t', '-cmd', '.timeout 3000', sql],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
    );
    return out.split('\n').filter((l) => l.length > 0);
  } catch (e) {
    console.warn(`[usage] 读取 ${dbPath} 失败（跳过该源）：${e.message.split('\n')[0]}`);
    return [];
  }
}

/* 把 (day, model, in, out, cw, cr, rz, total) 行折叠进 days 结构 */
function foldRows(rows) {
  const days = {};
  for (const line of rows) {
    const [day, model, inp, outp, cw, cr, rz, tot] = line.split('\t');
    if (!day) continue;
    const n = (x) => Number(x) || 0;
    const slot = (days[day] ??= { total: 0, in: 0, out: 0, cw: 0, cr: 0, rz: 0, models: {} });
    const name = model || 'unknown';
    const total = n(tot);
    const m = (slot.models[name] ??= { in: 0, out: 0, cw: 0, cr: 0, rz: 0, total: 0 });
    m.in += n(inp); m.out += n(outp); m.cw += n(cw); m.cr += n(cr); m.rz += n(rz); m.total += total;
    slot.in += n(inp); slot.out += n(outp); slot.cw += n(cw); slot.cr += n(cr); slot.rz += n(rz);
    slot.total += total;
  }
  return days;
}

export function scanZcodeUsage(dbPath) {
  // computed_total_tokens 为 provider 权威总量（= in+out+cache+reasoning）；毫秒→本地日
  const rows = query(
    dbPath,
    `SELECT date(started_at/1000,'unixepoch','localtime') d, model_id,
            SUM(input_tokens), SUM(output_tokens),
            SUM(cache_creation_input_tokens), SUM(cache_read_input_tokens),
            SUM(reasoning_tokens), SUM(computed_total_tokens)
     FROM model_usage GROUP BY d, model_id`
  );
  return foldRows(rows);
}

export function scanHermesUsage(dbPath, excludeUrlLike = '%localhost%') {
  // 全口径 total 在 SQL 里直接算好放末列；排除 claude-proxy(localhost) 去重；秒→本地日
  const rows = query(
    dbPath,
    `SELECT date(started_at,'unixepoch','localtime') d, model,
            SUM(input_tokens), SUM(output_tokens),
            SUM(cache_write_tokens), SUM(cache_read_tokens), SUM(reasoning_tokens),
            SUM(input_tokens+output_tokens+cache_write_tokens+cache_read_tokens+reasoning_tokens)
     FROM sessions
     WHERE billing_base_url IS NULL OR billing_base_url NOT LIKE '${excludeUrlLike}'
     GROUP BY d, model`
  );
  return foldRows(rows);
}

/* 汇总入口：返回 { zcode:{days}, hermes:{days} }；缺库项为 {} */
export function scanAgentUsage(cfg = {}) {
  return {
    zcode: scanZcodeUsage(cfg.zcodeDb),
    hermes: scanHermesUsage(cfg.hermesDb, cfg.hermesExcludeUrlLike),
  };
}

/* 累计某源 days 的全口径 total */
export function sumDays(days) {
  return Object.values(days || {}).reduce((s, v) => s + (v.total || 0), 0);
}

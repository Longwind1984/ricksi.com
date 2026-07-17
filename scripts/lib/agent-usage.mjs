// 读取其他 Agent harness 的本地 Token 用量（口径 v4 · 按 harness 分源）
//   ZCode     →  ~/.zcode/cli/db/db.sqlite   ·  model_usage 表（sqlite；started_at = 毫秒 INTEGER）
//   Hermes    →  ~/.hermes/state.db          ·  sessions 表（sqlite；started_at = 秒 REAL）
//   Kimi Code →  ~/.kimi-code/sessions/**/agents/*/wire.jsonl  （JSONL；time = 毫秒）
//   OpenClaw  →  ~/.kimi_openclaw/agents/main/sessions/*.jsonl （JSONL；timestamp = ISO）
// 产出与 claude-logs.scanClaudeLogs 同构：days[YYYY-MM-DD] = { total, in,out,cw,cr,rz, models:{name:{total,...}} }
// 设计取舍：
//   · sqlite 类通过系统 sqlite3 CLI 读（零依赖；macOS 自带 /usr/bin/sqlite3）；缺库/无 CLI 一律静默返回空
//     （CI、未装该工具的机器照常构建，用已提交的历史分源数据）。
//   · Hermes 排除经 claude-proxy(localhost) 的会话——那些 `claude -p` 已落 Claude JSONL、归 Claude Code，
//     不排除会与 Claude Code 重复计。（Hermes 调 api.kimi.com 的 k3 是远程直连、不经本机 CLI，故归 Hermes，不与 Kimi Code 重复。）
//   · ⚠ Kimi Code 把同一次调用记了两遍：`usage.record`（带 model）与 `context.append_loop_event/step.end`（带 messageId），
//     数值完全相同（2026-07-17 实测两边 TOTAL 均为 8,454,393）。只读 usage.record，两个都读会翻倍。
//   · 全口径 total：ZCode 用 provider 权威的 computed_total_tokens；其余 = in+out+cache_write+cache_read+reasoning。
import fs from 'node:fs';
import readline from 'node:readline';
import { execFileSync } from 'node:child_process';
import { walk, dayKey } from './util.mjs';

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

/* ---------- JSONL 类来源（Kimi Code / OpenClaw） ---------- */

/* 把一条用量折进 days（与 foldRows 同构） */
function addUsage(days, day, model, { in: i = 0, out = 0, cw = 0, cr = 0, rz = 0 }) {
  if (!day || day.includes('NaN')) return;
  const slot = (days[day] ??= { total: 0, in: 0, out: 0, cw: 0, cr: 0, rz: 0, models: {} });
  const total = i + out + cw + cr + rz;
  const m = (slot.models[model || 'unknown'] ??= { in: 0, out: 0, cw: 0, cr: 0, rz: 0, total: 0 });
  m.in += i; m.out += out; m.cw += cw; m.cr += cr; m.rz += rz; m.total += total;
  slot.in += i; slot.out += out; slot.cw += cw; slot.cr += cr; slot.rz += rz; slot.total += total;
}

/* 逐行流式读 JSONL（大文件不吃内存）；文件读不了就跳过 */
async function* jsonlLines(file) {
  let stream;
  try {
    stream = fs.createReadStream(file, 'utf8');
  } catch {
    return;
  }
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (line && line[0] === '{') yield line;
  }
}

/* Kimi Code CLI：只读 type='usage.record'（它带 model；step.end 是同一次调用的另一种记法，读两个会翻倍）。
   去重：usage.record 无 id，用 time|model|四项用量 作键——同毫秒同模型同用量重复出现即同一条。 */
export async function scanKimiCodeUsage(sessionsDir) {
  const days = {};
  if (!sessionsDir || !fs.existsSync(sessionsDir)) return days;
  const files = [...walk(sessionsDir)].filter((f) => f.endsWith('wire.jsonl'));
  const seen = new Set();
  for (const file of files) {
    for await (const line of jsonlLines(file)) {
      let r;
      try { r = JSON.parse(line); } catch { continue; }
      if (r.type !== 'usage.record' || !r.usage) continue;
      const u = r.usage;
      const key = `${r.time}|${r.model}|${u.inputOther}|${u.output}|${u.inputCacheRead}|${u.inputCacheCreation}`;
      if (seen.has(key)) continue;
      seen.add(key);
      addUsage(days, dayKey(new Date(Number(r.time))), r.model, {
        in: u.inputOther || 0, out: u.output || 0, cr: u.inputCacheRead || 0, cw: u.inputCacheCreation || 0,
      });
    }
  }
  return days;
}

/* OpenClaw（本机跑 Kimi k2p6 等）：Claude 风格 JSONL —— {id, timestamp(ISO), message:{model, usage:{input,output,cacheRead,cacheWrite}}}。
   去重：记录顶层 id。 */
export async function scanOpenclawUsage(sessionsDir) {
  const days = {};
  if (!sessionsDir || !fs.existsSync(sessionsDir)) return days;
  const files = [...walk(sessionsDir)].filter((f) => f.endsWith('.jsonl'));
  const seen = new Set();
  for (const file of files) {
    for await (const line of jsonlLines(file)) {
      let r;
      try { r = JSON.parse(line); } catch { continue; }
      const msg = r.message;
      const u = msg?.usage;
      if (!u || typeof u !== 'object') continue;
      const id = r.id || msg.id;
      if (id) {
        if (seen.has(id)) continue;
        seen.add(id);
      }
      addUsage(days, dayKey(new Date(r.timestamp)), msg.model, {
        in: u.input || 0, out: u.output || 0, cr: u.cacheRead || 0, cw: u.cacheWrite || 0,
      });
    }
  }
  return days;
}

/* 汇总入口：返回 { zcode, hermes, kimi_code, openclaw }，各为 {days}；缺源项为 {} */
export async function scanAgentUsage(cfg = {}) {
  return {
    zcode: scanZcodeUsage(cfg.zcodeDb),
    hermes: scanHermesUsage(cfg.hermesDb, cfg.hermesExcludeUrlLike),
    kimi_code: await scanKimiCodeUsage(cfg.kimiCodeSessions),
    openclaw: await scanOpenclawUsage(cfg.openclawSessions),
  };
}

/* 累计某源 days 的全口径 total */
export function sumDays(days) {
  return Object.values(days || {}).reduce((s, v) => s + (v.total || 0), 0);
}

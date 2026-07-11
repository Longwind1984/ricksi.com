// 扫描 ~/.claude/projects/**/*.jsonl —— Claude Code 本地会话日志
// 一次扫描同时产出：每日消息数 / 会话数（活动维度）+ 每日各模型 token 用量（用量维度）
// 按 message.id + requestId 去重（同一条消息可能在续聊/恢复时重复出现）
import fs from 'node:fs';
import readline from 'node:readline';
import { walk, dayKey } from './util.mjs';

export async function scanClaudeLogs(projectsDir) {
  const files = [...walk(projectsDir)].filter((f) => f.endsWith('.jsonl'));
  const byDay = {}; // date -> { msgs, sessions:Set, tokens: { model: {in,out,cw,cr} } }
  const seen = new Set();
  let parsedLines = 0;

  for (const file of files) {
    const sessionId = file;
    let stream;
    try {
      stream = fs.createReadStream(file, 'utf8');
    } catch {
      continue;
    }
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line || line[0] !== '{') continue;
      let rec;
      try {
        rec = JSON.parse(line);
      } catch {
        continue;
      }
      const ts = rec.timestamp;
      if (!ts) continue;
      const day = dayKey(new Date(ts));
      const slot = (byDay[day] ??= { msgs: 0, sessions: new Set(), tokens: {} });
      slot.sessions.add(sessionId);
      parsedLines++;

      const msg = rec.message;
      if (rec.type === 'assistant' && msg?.usage) {
        const dedupeKey = (msg.id || '') + (rec.requestId || '');
        if (dedupeKey.length > 1) {
          if (seen.has(dedupeKey)) continue;
          seen.add(dedupeKey);
        }
        slot.msgs++;
        const model = (msg.model || 'unknown').replace(/^claude-/, '');
        const u = msg.usage;
        const t = (slot.tokens[model] ??= { in: 0, out: 0, cw: 0, cr: 0 });
        t.in += u.input_tokens || 0;
        t.out += u.output_tokens || 0;
        t.cw += u.cache_creation_input_tokens || 0;
        t.cr += u.cache_read_input_tokens || 0;
      } else if (rec.type === 'user') {
        slot.msgs++;
      }
    }
  }

  // Set → 数量；tokens 汇总
  const days = {};
  for (const [day, v] of Object.entries(byDay)) {
    let total = 0;
    const models = {};
    for (const [m, t] of Object.entries(v.tokens)) {
      const sum = t.in + t.out + t.cw + t.cr;
      models[m] = { ...t, total: sum };
      total += sum;
    }
    days[day] = { msgs: v.msgs, sessions: v.sessions.size, tokens: total, models };
  }
  return { days, files: files.length, parsedLines };
}

/* 模型名 → 家族（跨 harness 通用：Claude 四档 + 国产 GLM/DeepSeek）。
   glm-5-2-260617 / glm-5.2 → GLM；deepseek-v4-pro → DeepSeek */
export function modelFamily(m) {
  return /opus/i.test(m) ? 'Opus'
    : /sonnet/i.test(m) ? 'Sonnet'
    : /haiku/i.test(m) ? 'Haiku'
    : /fable/i.test(m) ? 'Fable'
    : /glm/i.test(m) ? 'GLM'
    : /deepseek/i.test(m) ? 'DeepSeek'
    : '其他';
}

/* 模型名归并为家族占比（可传多源合并后的 days） */
export function modelShare(days) {
  const fam = {};
  let total = 0;
  for (const v of Object.values(days)) {
    for (const [m, t] of Object.entries(v.models || {})) {
      const f = modelFamily(m);
      fam[f] = (fam[f] || 0) + t.total;
      total += t.total;
    }
  }
  if (!total) return [];
  return Object.entries(fam)
    .sort((a, b) => b[1] - a[1])
    .map(([m, v]) => [m, Math.round((v / total) * 100)])
    .filter(([, p]) => p > 0);
}

// 扫描 ~/.codex/sessions/**/*.jsonl —— Codex Desktop / CLI rollout 日志。
// Token 事件携带“本 rollout 累计值”，必须按相邻累计快照做增量，不能逐条相加。
// cached_input_tokens / reasoning_output_tokens 是 input / output 的诊断子集，不重复加入 total。
import fs from 'node:fs';
import readline from 'node:readline';
import { walk, dayKey } from './util.mjs';

const USAGE_FIELDS = [
  'total_tokens',
  'input_tokens',
  'cached_input_tokens',
  'output_tokens',
  'reasoning_output_tokens',
];

function usageDelta(current, previous, field) {
  const now = Number(current?.[field]) || 0;
  const before = Number(previous?.[field]) || 0;
  return now >= before ? now - before : now;
}

function validDay(timestamp) {
  const date = new Date(timestamp);
  return Number.isFinite(date.getTime()) ? dayKey(date) : null;
}

function daySlot(byDay, day) {
  return (byDay[day] ??= {
    msgs: 0,
    sessions: new Set(),
    tokens: 0,
    in: 0,
    out: 0,
    cr: 0,
    rz: 0,
    models: {},
  });
}

function addTokenDelta(slot, model, delta) {
  const total = delta.total_tokens;
  if (total === 0 && delta.input_tokens === 0 && delta.output_tokens === 0) return;
  const name = model || 'codex-unknown';
  const usage = (slot.models[name] ??= { in: 0, out: 0, cr: 0, rz: 0, total: 0 });
  usage.in += delta.input_tokens;
  usage.out += delta.output_tokens;
  usage.cr += delta.cached_input_tokens;
  usage.rz += delta.reasoning_output_tokens;
  usage.total += total;
  slot.in += delta.input_tokens;
  slot.out += delta.output_tokens;
  slot.cr += delta.cached_input_tokens;
  slot.rz += delta.reasoning_output_tokens;
  slot.tokens += total;
}

export async function scanCodexFiles(files) {
  const byDay = {};
  let parsedLines = 0;

  for (const file of [...files].sort()) {
    let stream;
    try {
      stream = fs.createReadStream(file, 'utf8');
    } catch {
      continue;
    }

    let activeModel = 'codex-unknown';
    let previousUsage = Object.fromEntries(USAGE_FIELDS.map((field) => [field, 0]));
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line || line[0] !== '{') continue;
      let record;
      try {
        record = JSON.parse(line);
      } catch {
        continue;
      }
      parsedLines++;

      if (record.type === 'turn_context' && record.payload?.model) {
        activeModel = record.payload.model;
        continue;
      }

      const eventType = record.type === 'event_msg' ? record.payload?.type : null;
      if (eventType === 'token_count' && record.payload?.info?.total_token_usage) {
        const currentUsage = record.payload.info.total_token_usage;
        const delta = Object.fromEntries(
          USAGE_FIELDS.map((field) => [field, usageDelta(currentUsage, previousUsage, field)])
        );
        previousUsage = Object.fromEntries(
          USAGE_FIELDS.map((field) => [field, Number(currentUsage[field]) || 0])
        );
        const day = validDay(record.timestamp);
        if (day) addTokenDelta(daySlot(byDay, day), activeModel, delta);
        continue;
      }

      if (eventType === 'user_message' || eventType === 'agent_message') {
        const day = validDay(record.timestamp);
        if (!day) continue;
        const slot = daySlot(byDay, day);
        slot.msgs++;
        slot.sessions.add(file);
      }
    }
  }

  const days = {};
  for (const [day, slot] of Object.entries(byDay)) {
    days[day] = {
      msgs: slot.msgs,
      sessions: slot.sessions.size,
      tokens: slot.tokens,
      in: slot.in,
      out: slot.out,
      cr: slot.cr,
      rz: slot.rz,
      models: slot.models,
    };
  }
  return { days, files: files.length, parsedLines };
}

export async function scanCodexLogs(sessionsDir) {
  const files = [...walk(sessionsDir)].filter((file) => file.endsWith('.jsonl'));
  return scanCodexFiles(files);
}

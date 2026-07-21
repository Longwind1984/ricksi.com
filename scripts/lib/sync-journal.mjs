// 工作台同步「富日志」：每次 sync 运行后把结构化结果写进 Obsidian 库。
// 落点 <vault>/00Meta/工作台同步日志/YYYY-MM.md（按月一文件，每次运行追加一节）。
// 00Meta 在 config 里既排除活动统计（vaultActivityExclude）、又硬隐藏不发布（hiddenFolders）——
// 含 Token 等私有数据不会泄到公开站。与 ~/Library/Logs/workbench-sync.log（一行式）互补：
// 那是机器可扫的运行流水，这里是可在 Obsidian 翻阅的详细记录（Token 用量 / 新增前沿标题 / 各维度计数）。
import fs from 'node:fs';
import path from 'node:path';
import { CONFIG } from '../config.mjs';

const DATA = path.resolve('data');
const readJson = (f) => {
  try { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch { return null; }
};

// 4.3e9 → "4.3B"；48886167 → "48.9M"
function human(n) {
  if (typeof n !== 'number' || !isFinite(n)) return n ?? '—';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

// 北京时间分段（库日志固定北京时间，跨设备一致）
function bj(d = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(d).map((x) => [x.type, x.value])
  );
  return { ym: `${p.year}-${p.month}`, full: `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}` };
}

/**
 * @param {{outcome:string, head?:string, fileCount?:number, durSec?:number, error?:string, warnings?:Array<{name:string,message:string}>}} info
 * outcome 形如 '✓ 推送' / '⊙ 无变化' / '✗ 失败'
 */
export function writeVaultJournal(info) {
  const vault = CONFIG?.vault;
  if (!vault || !fs.existsSync(vault)) return; // CI / 无库 静默跳过
  const dir = path.join(vault, '00Meta', '工作台同步日志');
  try {
    fs.mkdirSync(dir, { recursive: true });
    const t = bj();
    const L = [`## ${t.full} · ${info.outcome}${info.head ? ' ' + info.head : ''}`, ''];

    // 结果
    if (info.error) {
      L.push(`- 结果：✗ 失败 — ${String(info.error).replace(/\s+/g, ' ').slice(0, 220)}`);
    } else if (/无变化|no change/i.test(info.outcome)) {
      L.push('- 结果：数据无变化，未提交');
    } else {
      L.push(`- 结果：${info.fileCount != null ? info.fileCount + ' 文件改动' : '已提交'}${info.durSec != null ? `，耗时 ${info.durSec}s` : ''}`);
    }
    for (const warning of info.warnings || []) {
      L.push(`- 可恢复失败：${warning.name} — ${String(warning.message).replace(/\s+/g, ' ').slice(0, 180)}（沿用上次数据）`);
    }

    // Token 用量
    const u = readJson('usage.json');
    if (u) L.push(`- Token：今日 ${human(u.today)}${u.today_out ? `（输出 ${human(u.today_out)}）` : ''} · 累计 ${u.cumulative ?? '—'}`);

    // 前沿追踪：本次新增标题
    const ft = readJson('frontier.json');
    const lr = ft && ft.stats && ft.stats.lastRun;
    if (lr) {
      const skip = Array.isArray(lr.skippedSources) && lr.skippedSources.length ? ` / 跳过 ${lr.skippedSources.join('、')}` : '';
      L.push(`- 前沿追踪：新增 ${lr.added ?? 0}（抓取 ${lr.fetched ?? '?'} / 处理 ${lr.processed ?? '?'}${skip}）`);
      const titles = (ft.entries || [])
        .filter((e) => e.addedAt)
        .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
        .slice(0, lr.added || 0)
        .map((e) => e.titleZh)
        .filter(Boolean);
      for (const tt of titles) L.push(`    - ${tt}`);
    }

    // 活动 / 图谱 / 阅读
    const a = readJson('activity.json');
    if (a && a.sources) {
      const split = a.sources.ai?.claude || a.sources.ai?.codex
        ? `（Claude ${a.sources.ai?.claude?.files ?? 0} / Codex ${a.sources.ai?.codex?.files ?? 0}）`
        : '';
      L.push(`- 活动：git ${a.sources.git?.commits ?? '?'} 提交 / ${a.sources.git?.repos ?? '?'} 仓 · 笔记 ${a.sources.notes?.total ?? '?'} · AI 文件 ${a.sources.ai?.files ?? '?'}${split}`);
    }
    const g = readJson('graph.json');
    if (g && g.stats) L.push(`- 图谱：${g.stats.notes ?? '?'} 篇 / ${g.stats.links ?? '?'} 双链`);
    const r = readJson('reading.json');
    if (r && r.stats) L.push(`- 阅读：藏书 ${r.stats.total ?? '?'} · 划线 ${r.stats.notes ?? '?'}`);

    L.push('', '');
    const file = path.join(dir, `${t.ym}.md`);
    const header = fs.existsSync(file)
      ? ''
      : `# 工作台同步日志 ${t.ym}\n\n> 由 scripts/sync.mjs 自动追加。本目录（00Meta）不计入活动统计、不发布到公开站。\n\n`;
    fs.appendFileSync(file, header + L.join('\n'));
  } catch { /* 写库失败不致命 */ }
}

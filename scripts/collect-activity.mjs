// 多源活动采集：本地 git 全历史 + Obsidian 笔记时间线 + Claude/Codex 会话 + GitHub（可选）
// 产出 data/activity.json —— 仓库即存档：每次运行与既有数据合并，历史只增不减。
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { CONFIG } from './config.mjs';
import { readJson, writeJson, walk, dayKey, buildWeeks, currentStreak } from './lib/util.mjs';
import { scanClaudeLogs } from './lib/claude-logs.mjs';
import { scanCodexLogs } from './lib/codex-logs.mjs';
import { mergeAiActivity } from './lib/activity-policy.mjs';

const OUT = path.join(CONFIG.dataDir, 'activity.json');

/* ---------- 1. 本地 git 仓库 ---------- */
function findRepos() {
  const repos = new Set();
  for (const root of CONFIG.repoRoots) {
    const maxDepth = CONFIG.repoScanDepth[root] ?? CONFIG.defaultScanDepth;
    scanForGit(root, 0, maxDepth, repos);
  }
  return [...repos];
}
function scanForGit(dir, depth, maxDepth, repos) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  // .git 必须是目录（worktree 的 .git 是文件 → 排除，避免与主仓重复计数）
  if (entries.some((e) => e.name === '.git' && e.isDirectory())) {
    repos.add(dir);
    return; // 不往仓库内部继续扫
  }
  if (depth >= maxDepth) return;
  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith('.') || e.name === 'node_modules') continue;
    scanForGit(path.join(dir, e.name), depth + 1, maxDepth, repos);
  }
}

function gitCommitsByDay(repos) {
  const days = {};
  let total = 0;
  for (const repo of repos) {
    try {
      const out = execFileSync('git', ['log', '--all', '--pretty=%ad', '--date=short'], {
        cwd: repo,
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
      });
      for (const line of out.split('\n')) {
        if (!line) continue;
        days[line] = (days[line] || 0) + 1;
        total++;
      }
    } catch {
      /* 空仓或非常规仓库，跳过 */
    }
  }
  return { days, total };
}

/* ---------- 2. Obsidian 笔记创建时间线 ---------- */
function vaultNotesByDay() {
  const days = {};
  let total = 0;
  let icloudPlaceholders = 0;
  for (const f of walk(CONFIG.vault, { exclude: CONFIG.vaultActivityExclude })) {
    const base = path.basename(f);
    if (base.endsWith('.icloud')) {
      // 未下载的 iCloud 占位（".xxx.md.icloud"）：仍按占位文件时间计数
      if (!base.includes('.md')) continue;
      icloudPlaceholders++;
    } else if (!base.endsWith('.md')) continue;
    try {
      const st = fs.statSync(f);
      const created = st.birthtime && st.birthtime.getTime() > 0 ? st.birthtime : st.mtime;
      const k = dayKey(created);
      days[k] = (days[k] || 0) + 1;
      total++;
    } catch {
      /* skip */
    }
  }
  return { days, total, icloudPlaceholders };
}

/* ---------- main ---------- */
const repos = findRepos();
const git = gitCommitsByDay(repos);
const notes = vaultNotesByDay();
const claude = await scanClaudeLogs(CONFIG.claudeProjects);
const codex = await scanCodexLogs(CONFIG.codexSessions);
const ai = mergeAiActivity(claude, codex);

const prev = readJson(OUT, { days: {} });

/* 合并：历史存档（prev）打底，本次扫描覆盖能看到的日期。
   gh 维度由 fetch-github.mjs 维护，这里保留旧值。 */
const days = { ...prev.days };
const allKeys = new Set([
  ...Object.keys(git.days),
  ...Object.keys(notes.days),
  ...Object.keys(ai.days),
]);
for (const k of allKeys) {
  days[k] = {
    git: git.days[k] || 0,
    notes: notes.days[k] || 0,
    ai: ai.days[k]?.total || 0,
    ai_split: {
      claude: ai.days[k]?.claude || 0,
      codex: ai.days[k]?.codex || 0,
    },
    gh: prev.days[k]?.gh || 0,
  };
}
// 本次扫描范围内未出现但存档里有的日期：保留（日志被清理后历史不丢）

const totalOf = (rec) => (rec ? (rec.git || 0) + (rec.notes || 0) + (rec.ai || 0) + (rec.gh || 0) : 0);

const out = {
  generated_at: new Date().toISOString(),
  days,
  weeks: buildWeeks(days, CONFIG.heatmapWeeks, totalOf),
  coding: {
    commits: git.total,
    streak: currentStreak(days, totalOf),
    repos: repos.length,
  },
  sources: {
    git: { repos: repos.length, commits: git.total, repoList: repos.map((r) => path.basename(r)) },
    notes: { total: notes.total, icloudPlaceholders: notes.icloudPlaceholders },
    ai: {
      files: ai.files,
      daysCovered: Object.keys(ai.days).length,
      claude: { files: ai.claudeFiles, daysCovered: Object.keys(claude.days).length },
      codex: { files: ai.codexFiles, daysCovered: Object.keys(codex.days).length },
    },
    gh: prev.sources?.gh || { note: '由 GitHub Actions fetch-github.mjs 填充' },
  },
};

writeJson(OUT, out);
console.log(
  `[activity] repos=${repos.length} commits=${git.total} notes=${notes.total}` +
    ` aiDays=${Object.keys(ai.days).length}（Claude ${Object.keys(claude.days).length} / Codex ${Object.keys(codex.days).length}）` +
    ` streak=${out.coding.streak} → ${OUT}`
);
if (notes.icloudPlaceholders) {
  console.warn(`[activity] ⚠ ${notes.icloudPlaceholders} 个 iCloud 未下载占位文件（仅影响计数精度）`);
}

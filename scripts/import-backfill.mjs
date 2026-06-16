// 一次性：把回溯抽样（data/frontier-backfill-sample.json）合并进 data/frontier.json
// slug 对齐、URL 去重、字段补全为 frontier entry 格式；people/topics/domains 从 config 重生成。
// 回溯条目标 backfill:true（无长摘要，summaryZh 用 verdict 兜底，excerpt 空）。
import crypto from 'node:crypto';
import path from 'node:path';
import { CONFIG } from './config.mjs';
import { readJson, writeJson } from './lib/util.mjs';

const F = CONFIG.frontier;
const OUT = path.join(CONFIG.dataDir, 'frontier.json');
const SAMPLE = path.join(CONFIG.dataDir, 'frontier-backfill-sample.json');
const today = '2026-06-16';
const SLUG_MAP = { 'andrej-karpathy': 'karpathy' }; // 抽样 slug → config slug

function canonicalUrl(raw) {
  try {
    const u = new URL(raw);
    u.hash = '';
    for (const k of [...u.searchParams.keys()]) if (/^(utm_|ref$|source$|si$)/.test(k)) u.searchParams.delete(k);
    let s = u.toString();
    return s.endsWith('/') ? s.slice(0, -1) : s;
  } catch { return raw; }
}
const idOf = (url) => crypto.createHash('sha1').update(canonicalUrl(url)).digest('hex').slice(0, 16);

const sample = readJson(SAMPLE);
const ft = readJson(OUT) ?? { entries: [] };
const orgSlugs = new Set(F.topics.map((t) => t.slug));

const seen = new Set(ft.entries.map((e) => e.id));
const newEntries = [];
let dup = 0;
for (const s of sample.samples) {
  const slug = SLUG_MAP[s.slug] ?? s.slug;
  const isOrg = s.type === 'org' || orgSlugs.has(slug);
  for (const e of s.entries) {
    const id = idOf(e.url);
    if (seen.has(id)) { dup++; continue; }
    seen.add(id);
    newEntries.push({
      id, date: e.date,
      person: isOrg ? null : slug,
      topicSource: isOrg ? slug : null,
      sourceName: e.sourceName,
      sourceType: 'web', // 回溯来源：web 研究
      contentType: e.contentType,
      titleZh: e.titleZh,
      titleOriginal: e.titleZh,
      verdict: e.verdict,
      summaryZh: e.verdict, // 回溯无长摘要，用一句话判断兜底
      tags: [],
      url: e.url,
      excerpt: '',
      apparent: e.apparent,
      absolute: e.absolute,
      importance: e.absolute,
      gravity: !!e.gravity,
      periodic: !!e.periodic,
      singularity: !!e.singularity,
      rationale: '',
      insufficientContext: false,
      addedAt: today,
      backfill: true, // 标记：回溯条目（区别于日常抓取）
    });
  }
}

const merged = [...newEntries, ...ft.entries].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
const slim = (arr) => arr.map(({ slug, name, domain, title, bio, constellation }) => ({ slug, name, domain, title, bio, constellation }));

writeJson(OUT, {
  generated_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
  rollingDays: F.rollingDays,
  domains: F.domains,
  people: slim(F.people),
  topics: slim(F.topics),
  stats: {
    totalEntries: merged.length,
    totalAllTime: (ft.stats?.totalAllTime ?? ft.entries.length) + newEntries.length,
    lastRun: ft.stats?.lastRun ?? null,
    backfillImported: { at: today, added: newEntries.length, deduped: dup },
  },
  entries: merged,
});
console.log(`[import] 新增 ${newEntries.length} 条（去重跳过 ${dup}），现存 ${merged.length} 条`);
console.log(`[import] people ${F.people.length} / topics ${F.topics.length}（含 constellation 源级星类）`);

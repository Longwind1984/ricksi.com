// Obsidian 04AI 同步：真实双链图谱 + 可发布笔记导出
// - 主题域 = 04AI 下的一级子文件夹（动态发现，非写死）
// - 边 = 笔记间 [[双链]]（按 Obsidian 规则以文件名解析）
// - 产出：data/graph.json（仅含可发布笔记）、content/kb/**（站内笔记页源）、
//         data/kb-manifest.json（全量清单，Gate B 隐私评审用）
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { CONFIG } from './config.mjs';
import { writeJson, walk, dayKey } from './lib/util.mjs';

const AI_ROOT = path.join(CONFIG.vault, CONFIG.vaultAiDir);
const GRAPH_OUT = path.join(CONFIG.dataDir, 'graph.json');
const MANIFEST_OUT = path.join(CONFIG.dataDir, 'kb-manifest.json');

/* "0401AI 基础知识库" → 展示名 "AI 基础知识库"、序号 0401 */
function clusterDisplay(folder) {
  const m = folder.match(/^(\d+)\s*(.+)$/);
  return m ? { order: m[1], name: m[2].trim() } : { order: '9999', name: folder };
}

/* 文件名 → URL 路径段（保留中文，去掉对 URL/文件系统有害的字符） */
function slugify(s) {
  return s
    .trim()
    .replace(/[\/\\#?%&<>:"|*\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/* ---------- 1. 扫描 04AI 全部笔记 ---------- */
if (!fs.existsSync(AI_ROOT)) {
  console.error(`[vault] ✗ 找不到 ${AI_ROOT}`);
  process.exit(1);
}

const notes = new Map(); // basename(无扩展名) -> note
let icloudSkipped = 0;

for (const f of walk(AI_ROOT, { exclude: ['.obsidian', '.trash'] })) {
  const base = path.basename(f);
  if (base.endsWith('.icloud')) {
    icloudSkipped++;
    continue;
  }
  if (!base.endsWith('.md')) continue;
  const rel = path.relative(AI_ROOT, f);
  const clusterFolder = rel.includes(path.sep) ? rel.split(path.sep)[0] : '(根目录)';
  const name = base.slice(0, -3);

  let raw;
  try {
    raw = fs.readFileSync(f, 'utf8');
  } catch {
    continue;
  }
  let fm, body;
  try {
    const parsed = matter(raw);
    fm = parsed.data || {};
    body = parsed.content;
  } catch {
    fm = {};
    body = raw;
  }
  const st = fs.statSync(f);
  notes.set(name, {
    name,
    file: f,
    rel,
    clusterFolder,
    fm,
    body,
    created: fm.created || fm.date || (st.birthtime?.getTime() > 0 ? st.birthtime : st.mtime),
    updated: st.mtime,
    publish: fm.publish !== false && !CONFIG.excludeClusters.includes(clusterFolder),
    links: [],
  });
}

/* ---------- 2. 解析双链 ---------- */
const WIKILINK = /\[\[([^\]|#\n]+)(#[^\]|\n]*)?(\|[^\]\n]*)?\]\]/g;
for (const note of notes.values()) {
  const found = new Set();
  for (const m of note.body.matchAll(WIKILINK)) {
    const target = m[1].trim().replace(/\.md$/, '').split('/').pop();
    if (target && target !== note.name && notes.has(target)) found.add(target);
  }
  note.links = [...found];
}

/* ---------- 3. 主题域（动态发现） ---------- */
const clusterFolders = [...new Set([...notes.values()].map((n) => n.clusterFolder))].sort();
const clusters = clusterFolders.map((folder, i) => {
  const disp = clusterDisplay(folder);
  const all = [...notes.values()].filter((n) => n.clusterFolder === folder);
  return {
    id: i,
    folder,
    name: disp.name,
    order: disp.order,
    count: all.filter((n) => n.publish).length,
    countAll: all.length,
  };
});
const clusterIdx = new Map(clusterFolders.map((f, i) => [f, i]));

/* ---------- 4. 图谱（仅可发布笔记；边两端都可发布才保留） ---------- */
const pub = [...notes.values()].filter((n) => n.publish);
const nodeIdx = new Map(pub.map((n, i) => [n.name, i]));
const edges = [];
const degree = new Array(pub.length).fill(0);
for (const n of pub) {
  const a = nodeIdx.get(n.name);
  for (const t of n.links) {
    const b = nodeIdx.get(t);
    if (b === undefined) continue;
    if (a < b) edges.push([a, b]);
  }
}
for (const [a, b] of edges) {
  degree[a]++;
  degree[b]++;
}

const clusterSlugOf = (n) => slugify(clusterDisplay(n.clusterFolder).name);
const graph = {
  generated_at: new Date().toISOString(),
  nodes: pub.map((n, i) => ({
    id: i,
    title: n.name,
    slug: `${clusterSlugOf(n)}/${slugify(n.name)}`,
    cluster: clusterIdx.get(n.clusterFolder),
    deg: degree[i],
    created: dayKey(new Date(n.created)),
  })),
  edges,
  clusters: clusters.filter((c) => c.count > 0).map(({ id, name, count }) => ({ id, name, count })),
  stats: {
    notes: pub.length,
    links: edges.length,
    domains: clusters.filter((c) => c.count > 0).length,
    vaultNotesAll: null, // collect-activity 填的是全库口径，这里只管 04AI
    aiNotesAll: notes.size,
  },
};
writeJson(GRAPH_OUT, graph);

/* ---------- 5. 导出可发布笔记 → content/kb ---------- */
fs.rmSync(CONFIG.kbContentDir, { recursive: true, force: true });
fs.mkdirSync(CONFIG.kbContentDir, { recursive: true });
fs.writeFileSync(path.join(CONFIG.kbContentDir, '.gitkeep'), '');

for (const n of pub) {
  const nodeSlug = `${clusterSlugOf(n)}/${slugify(n.name)}`;
  // 正文里的 wikilink：目标已发布 → 站内链接；未发布/库外 → 保留纯文本
  const body = n.body
    .replace(/!\[\[([^\]]+)\]\]/g, (_, p) => `> 📎 附件：${p}（站内未发布）`)
    .replace(WIKILINK, (_, target, _anchor, alias) => {
      const t = target.trim().replace(/\.md$/, '').split('/').pop();
      const display = alias ? alias.slice(1).trim() : target.trim();
      const tn = notes.get(t);
      if (tn?.publish) {
        return `[${display}](/kb/${clusterSlugOf(tn)}/${slugify(tn.name)}/)`;
      }
      return display;
    });

  const fmOut = {
    title: n.name,
    cluster: clusterDisplay(n.clusterFolder).name,
    created: dayKey(new Date(n.created)),
    updated: dayKey(new Date(n.updated)),
  };
  const outFile = path.join(CONFIG.kbContentDir, ...nodeSlug.split('/')) + '.md';
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, matter.stringify(body, fmOut));
}

/* ---------- 6. 全量清单（Gate B 评审） ---------- */
writeJson(MANIFEST_OUT, {
  generated_at: new Date().toISOString(),
  excludeClusters: CONFIG.excludeClusters,
  notes: [...notes.values()]
    .sort((a, b) => a.rel.localeCompare(b.rel, 'zh'))
    .map((n) => ({ path: n.rel, publish: n.publish, links: n.links.length })),
});

console.log(
  `[vault] 04AI 共 ${notes.size} 篇；发布 ${pub.length} 篇 / ${graph.stats.domains} 域 / ${edges.length} 条双链` +
    `；排除 ${notes.size - pub.length} 篇 → ${GRAPH_OUT}`
);
if (icloudSkipped) console.warn(`[vault] ⚠ ${icloudSkipped} 个 iCloud 未下载文件被跳过（打开 Obsidian 下载后重跑）`);

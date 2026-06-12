// Obsidian 04AI 同步：真实双链图谱 + 可发布笔记导出（含发布消毒管线）
// - 主题域 = 04AI 下的一级子文件夹（动态发现，非写死）；
//   04T 专题库下钻一层：F1~F6 切面各自成域，三级「xx系统化专题」记为 facet
// - 边 = 笔记间 [[双链]]（按 Obsidian 规则以文件名解析）
// - 消毒（只改发布版，不动库原文件）：剥离工作残桩小节、抹除日记类私人链接、
//   屏蔽词替换、「待补充」占位行清除、敏感标题默认不发布
// - 产出：data/graph.json（仅含可发布笔记）、content/kb/**（站内笔记页源）、
//         data/kb-manifest.json（全量清单 + 消毒报告，隐私评审用）
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { CONFIG } from './config.mjs';
import { writeJson, walk, dayKey } from './lib/util.mjs';

const AI_ROOT = path.join(CONFIG.vault, CONFIG.vaultAiDir);
const GRAPH_OUT = path.join(CONFIG.dataDir, 'graph.json');
const MANIFEST_OUT = path.join(CONFIG.dataDir, 'kb-manifest.json');
const SAN = CONFIG.sanitize;

/* "0401AI 基础知识库" → 展示名 "AI 基础知识库"、序号 0401
   "04T 专题库/F6 人文社科透镜" → 展示名 "专题 · 人文社科透镜"、序号 04T6 */
function clusterDisplay(folder) {
  if (folder.includes('/')) {
    const [, facetPart] = folder.split('/');
    const fm = facetPart.match(/^F(\d+)\s*(.+)$/);
    if (fm) return { order: `04T${fm[1]}`, name: `专题 · ${fm[2].trim()}` };
    return { order: '04T9', name: `专题 · ${facetPart}` };
  }
  const m = folder.match(/^(\d+\w*)\s*(.+)$/);
  return m ? { order: m[1], name: m[2].trim() } : { order: '9999', name: folder };
}

/* 文件名 → URL 路径段（保留中文，去掉标点与 URL 危险字符，拉丁统一小写） */
function slugify(s) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\/\\#?%&<>:"'|*·，。、！？；：（）《》【】\[\]()‘’“”\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/* ---------- 消毒管线 ---------- */
function stripSection(body, title) {
  // 剥离含关键词的标题（允许「§9 衍生对话存档 + 修订日志」类前后缀）到下一个同级或更高级标题
  const re = new RegExp(`^(#{1,6})[^#\\n]*?${title}[^\\n]*$`, 'm');
  let out = body;
  let count = 0;
  let m;
  while ((m = out.match(re))) {
    const level = m[1].length;
    const start = m.index;
    const after = start + m[0].length;
    const rest = out.slice(after);
    const next = rest.search(new RegExp(`^#{1,${level}}[ \\t]`, 'm'));
    const end = next === -1 ? out.length : after + next;
    out = out.slice(0, start) + out.slice(end);
    count++;
  }
  return { out, count };
}

function sanitizeBody(body) {
  const report = { strippedSections: 0, blockWords: [], placeholders: 0 };
  let out = body;
  for (const title of SAN.stripSections) {
    const r = stripSection(out, title);
    out = r.out;
    report.strippedSections += r.count;
  }
  for (const w of SAN.blockWords) {
    if (out.includes(w)) {
      report.blockWords.push(w);
      out = out.replaceAll(w, '〔□〕');
    }
  }
  // 伪标题残桩（**衍生对话存档** 这类加粗独立行）
  for (const title of SAN.stripSections) {
    out = out.replace(new RegExp(`^[\\s>*-]*\\*\\*[^\\n]*${title}[^\\n]*\\*\\*[\\s]*$`, 'gm'), () => {
      report.strippedSections++;
      return '';
    });
  }
  // 「待补充」占位行：整行只有「（待补充：……）」一类占位时清除
  out = out.replace(/^[\s>*-]*[（(]?待补充[^）)\n]*[）)]?[\s。.…！!]*$/gm, (line) => {
    if (!/待补充/.test(line)) return line;
    report.placeholders++;
    return '';
  });
  // Obsidian ==高亮== 在站点 markdown 不渲染，转为普通文本
  out = out.replace(/==([^=\n]+)==/g, '$1');
  // 连续空行收敛
  out = out.replace(/\n{4,}/g, '\n\n\n');
  return { out, report };
}

/* ---------- 1. 扫描 04AI 全部笔记 ---------- */
if (!fs.existsSync(AI_ROOT)) {
  console.error(`[vault] ✗ 找不到 ${AI_ROOT}`);
  process.exit(1);
}

const notes = new Map(); // basename(无扩展名) -> note
let icloudSkipped = 0;
const sanitizeTotals = { strippedSections: 0, blockWordNotes: [], placeholders: 0 };

for (const f of walk(AI_ROOT, { exclude: ['.obsidian', '.trash'] })) {
  const base = path.basename(f);
  if (base.endsWith('.icloud')) {
    icloudSkipped++;
    continue;
  }
  if (!base.endsWith('.md')) continue;
  const rel = path.relative(AI_ROOT, f);
  const parts = rel.split(path.sep);
  let clusterFolder = parts.length > 1 ? parts[0] : '(根目录)';
  let facet = null;
  if (CONFIG.facetedClusters.includes(clusterFolder) && parts.length > 2) {
    clusterFolder = `${parts[0]}/${parts[1]}`;
    if (parts.length > 3) {
      facet = parts[2].replace(/^\d+\s*/, '').replace(/系统化专题$/, '').trim();
    }
  }
  const name = base.slice(0, -3);

  let raw;
  try {
    // 个别 iCloud 同步文件含 NUL 字节，会让 YAML 解析崩溃——先清掉
    raw = fs.readFileSync(f, 'utf8').replace(/\u0000+/g, '');
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
    // front-matter 解析失败时手工剥掉它，避免后续 stringify 再次触雷
    body = raw.replace(/^---\n[\s\S]*?\n---\n?/, '');
  }

  /* 消毒在链接解析之前：被剥离小节里的双链不进图谱 */
  const sanitized = sanitizeBody(body);
  body = sanitized.out;
  sanitizeTotals.strippedSections += sanitized.report.strippedSections;
  sanitizeTotals.placeholders += sanitized.report.placeholders;
  if (sanitized.report.blockWords.length) {
    sanitizeTotals.blockWordNotes.push({ note: name, words: sanitized.report.blockWords });
  }

  /* 发布判定：front-matter 显式 > 敏感标题 > 排除域。
     04T 专题库例外：其 PKM 管线给绝大多数笔记预置了 publish:false（质量门控），
     用户决策（2026-06-12）为全量发布、覆盖该门控——风险知情自担。 */
  const sensitiveHit = SAN.sensitiveTitles.some((re) => re.test(name));
  const forcePublish = CONFIG.facetedClusters.some(
    (fc) => clusterFolder === fc || clusterFolder.startsWith(`${fc}/`)
  );
  let publish;
  let unpublishReason = null;
  if (fm.publish === false && !forcePublish) {
    publish = false;
    unpublishReason = 'front-matter';
  } else if (CONFIG.excludeClusters.includes(clusterFolder)) {
    publish = false;
    unpublishReason = 'excludeCluster';
  } else if (sensitiveHit && fm.publish !== true) {
    publish = false;
    unpublishReason = 'sensitiveTitle';
  } else {
    publish = true;
  }

  const st = fs.statSync(f);
  notes.set(name, {
    name,
    file: f,
    rel,
    clusterFolder,
    facet,
    fm,
    body,
    created: fm.created || fm.date || (st.birthtime?.getTime() > 0 ? st.birthtime : st.mtime),
    updated: st.mtime,
    publish,
    unpublishReason,
    /* 精选层：front-matter featured / 各专题总览自动入选 */
    featured: fm.featured === true || /总览$/.test(name),
    /* 来源三档：front-matter provenance 优先；04T 专题默认 AI 整理，其余默认共创 */
    provenance: fm.provenance || (clusterFolder.startsWith('04T') ? 'ai' : 'co'),
    sanitizeReport: sanitized.report,
    links: [],
  });
}

/* ---------- 2. 解析双链（顺带收集死链报告；日记类库外链接不进报告） ---------- */
const WIKILINK = /\[\[([^\]|#\n]+)(#[^\]|\n]*)?(\|[^\]\n]*)?\]\]/g;
const deadLinks = new Map(); // target -> [来源笔记]
let diaryLinksRedacted = 0;
for (const note of notes.values()) {
  const found = new Set();
  for (const m of note.body.matchAll(WIKILINK)) {
    const target = m[1].trim().replace(/\.md$/, '').split('/').pop();
    if (!target || target === note.name) continue;
    if (notes.has(target)) found.add(target);
    else if (!SAN.diaryLinkPattern.test(target)) {
      if (!deadLinks.has(target)) deadLinks.set(target, []);
      deadLinks.get(target).push(note.name);
    }
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

/* slug 预分配（含冲突消解：标点差异挤压后可能撞车，追加 -2/-3） */
const takenSlugs = new Set();
for (const n of pub) {
  let s = `${slugify(clusterDisplay(n.clusterFolder).name)}/${slugify(n.name)}`;
  let i = 2;
  while (takenSlugs.has(s)) s = s.replace(/(-\d+)?$/, `-${i++}`);
  takenSlugs.add(s);
  n.slugPath = s;
}

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

const graph = {
  generated_at: new Date().toISOString(),
  nodes: pub.map((n, i) => ({
    id: i,
    title: n.name,
    slug: n.slugPath,
    cluster: clusterIdx.get(n.clusterFolder),
    deg: degree[i],
    created: dayKey(new Date(n.created)),
    ...(n.facet ? { facet: n.facet } : {}),
    ...(n.featured ? { hub: 1 } : {}),
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
  const nodeSlug = n.slugPath;
  // 正文里的 wikilink：目标已发布 → 站内链接；日记类私人记录 → 抹除；其余 → 保留纯文本
  let body = n.body
    .replace(/!\[\[([^\]]+)\]\]/g, (_, p) => `> 📎 附件：${p}（站内未发布）`)
    .replace(WIKILINK, (_, target, _anchor, alias) => {
      const t = target.trim().replace(/\.md$/, '').split('/').pop();
      const display = alias ? alias.slice(1).trim() : target.trim();
      const tn = notes.get(t);
      if (tn?.publish && tn.slugPath) {
        return `[${display}](/kb/${tn.slugPath}/)`;
      }
      if (SAN.diaryLinkPattern.test(t)) {
        diaryLinksRedacted++;
        return '〔私人记录〕';
      }
      return display;
    });
  // 整行只剩〔私人记录〕的列表项直接删行
  body = body.replace(/^[\s>*-]*〔私人记录〕[\s,，;；。.]*$/gm, '').replace(/\n{4,}/g, '\n\n\n');

  const fmOut = {
    title: n.name,
    cluster: clusterDisplay(n.clusterFolder).name,
    created: dayKey(new Date(n.created)),
    updated: dayKey(new Date(n.updated)),
    provenance: n.provenance,
    ...(n.facet ? { facet: n.facet } : {}),
    ...(n.featured ? { featured: true } : {}),
  };
  const outFile = path.join(CONFIG.kbContentDir, ...nodeSlug.split('/')) + '.md';
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  let fileOut;
  try {
    // 注意：matter.stringify 会把字符串参数再 parse 一遍——body 以 --- 开头时可能抛 YAML 异常
    fileOut = matter.stringify(body, fmOut);
  } catch {
    const yaml = Object.entries(fmOut)
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join('\n');
    fileOut = `---\n${yaml}\n---\n\n${body}`;
  }
  fs.writeFileSync(outFile, fileOut);
}

/* ---------- 6. 全量清单（隐私评审）+ 消毒报告 ---------- */
writeJson(MANIFEST_OUT, {
  generated_at: new Date().toISOString(),
  excludeClusters: CONFIG.excludeClusters,
  sanitize: {
    strippedSections: sanitizeTotals.strippedSections,
    placeholdersRemoved: sanitizeTotals.placeholders,
    diaryLinksRedacted,
    blockWordNotes: sanitizeTotals.blockWordNotes,
  },
  notes: [...notes.values()]
    .sort((a, b) => a.rel.localeCompare(b.rel, 'zh'))
    .map((n) => ({
      path: n.rel,
      publish: n.publish,
      ...(n.unpublishReason ? { reason: n.unpublishReason } : {}),
      links: n.links.length,
    })),
});

console.log(
  `[vault] 04AI 共 ${notes.size} 篇；发布 ${pub.length} 篇 / ${graph.stats.domains} 域 / ${edges.length} 条双链` +
    `；排除 ${notes.size - pub.length} 篇 → ${GRAPH_OUT}`
);
console.log(
  `[vault] 消毒：剥离工作残桩小节 ${sanitizeTotals.strippedSections} 处 · 清除占位行 ${sanitizeTotals.placeholders} 行 · ` +
    `抹除私人记录链接 ${diaryLinksRedacted} 处 · 屏蔽词命中 ${sanitizeTotals.blockWordNotes.length} 篇`
);
if (sanitizeTotals.blockWordNotes.length) {
  sanitizeTotals.blockWordNotes.slice(0, 8).forEach(({ note, words }) => {
    console.warn(`    屏蔽词〔${words.join('、')}〕 ← ${note}`);
  });
}
const sensitiveOut = [...notes.values()].filter((n) => n.unpublishReason === 'sensitiveTitle');
if (sensitiveOut.length) {
  console.warn(`[vault] ⚠ ${sensitiveOut.length} 篇因敏感标题默认不发布（front-matter publish:true 可解禁）：`);
  sensitiveOut.forEach((n) => console.warn(`    ${n.rel}`));
}
if (icloudSkipped) console.warn(`[vault] ⚠ ${icloudSkipped} 个 iCloud 未下载文件被跳过（打开 Obsidian 下载后重跑）`);
if (deadLinks.size) {
  console.warn(`[vault] ⚠ ${deadLinks.size} 个死链（指向 04AI 内不存在的笔记，前 10 个）：`);
  [...deadLinks.entries()].slice(0, 10).forEach(([t, srcs]) => {
    console.warn(`    [[${t}]] ← ${srcs.slice(0, 3).join('、')}${srcs.length > 3 ? ` 等 ${srcs.length} 篇` : ''}`);
  });
}

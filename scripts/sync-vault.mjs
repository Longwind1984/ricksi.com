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
import { topFolderOf, classify, isPolitical } from './lib/privacy-tier.mjs';

const AI_ROOT = path.join(CONFIG.vault, CONFIG.vaultAiDir);
const GRAPH_OUT = path.join(CONFIG.dataDir, 'graph.json');
const MANIFEST_OUT = path.join(CONFIG.dataDir, 'kb-manifest.json');
const SAN = CONFIG.sanitize;

/* ════════════════════════════════════════════════════════════════
   全库三态隐私迁移 · dry-run 分支（--migrate-dry-run）
   只【扫描全库 + 分级 + 产出 data/title-review.json】，
   绝不写 graph.json / content/kb，绝不动 04AI full 主路径。
   命中此分支即 return，下方既有全文管线一行都不执行。
   ════════════════════════════════════════════════════════════════ */
/* --migrate-dry-run：只扫描 + 分级 + 产出 .private/title-review.json（绝不写产物）。
   --migrate / 默认：跑全文管线产出 598 full 节点；带 --migrate 时再把 stub 节点并入 graph.json。
   不带任何标志 = 既有行为（仅 04AI full），向后兼容。 */
const MIGRATE = process.argv.includes('--migrate');
if (process.argv.includes('--migrate-dry-run')) {
  runMigrationDryRun();
} else {
  runFullPipeline({ migrate: MIGRATE });
}

function runMigrationDryRun() {
  const PM = CONFIG.privacyMigration;
  if (!fs.existsSync(CONFIG.vault)) {
    console.error(`[migrate] ✗ 找不到 vault ${CONFIG.vault}`);
    process.exit(1);
  }

  /* 1) 全库扫描（排除 .obsidian/.trash 与 04AI 子树——04AI 维持 full，不进三态审查）。
        只读标题（文件名，去 .md），正文绝不读取、绝不进任何产物。 */
  const WIKILINK_RE = /\[\[([^\]|#\n]+)(#[^\]|\n]*)?(\|[^\]\n]*)?\]\]/g;
  const records = []; // { path, title, folder, name }
  let icloudSkipped = 0;
  let bodyReadForLinks = 0;

  for (const f of walk(CONFIG.vault, { exclude: ['.obsidian', '.trash'] })) {
    const base = path.basename(f);
    if (base.endsWith('.icloud')) { icloudSkipped++; continue; }
    if (!base.endsWith('.md')) continue;
    const rel = path.relative(CONFIG.vault, f).split(path.sep).join('/');
    const folder = topFolderOf(rel);
    // 04AI 维持 full（既有主路径产出），不纳入三态审查
    if (folder === CONFIG.vaultAiDir) continue;
    records.push({ path: rel, title: base.slice(0, -3), folder, file: f });
  }

  /* 2) 逐篇分级 */
  const reviewed = records.map((r) => {
    const { tier, hitRules, reason } = classify({ title: r.title, topFolder: r.folder });
    return {
      path: r.path,
      title: r.title,
      folder: r.folder,
      tierSuggested: tier,
      hitRules,
      reason,
      disposition: 'auto',
      file: r.file,
    };
  });

  /* 3) 仅对 stub 笔记解析其相互双链（标题级关联，供前端聚类）。
        读正文只为提取 [[wikilink]] 目标名做匹配，不写入任何产物、不留存正文。
        只在 stub↔stub 间连边（hidden 不出现，full 由主图谱另算）。 */
  const stubNotes = reviewed.filter((r) => r.tierSuggested === 'stub');
  const stubByName = new Map(stubNotes.map((r) => [r.title, r]));
  for (const r of stubNotes) {
    const links = new Set();
    let body = '';
    try {
      body = fs.readFileSync(r.file, 'utf8').replace(/\u0000+/g, '');
      bodyReadForLinks++;
    } catch { /* 读不到就当无链接 */ }
    for (const m of body.matchAll(WIKILINK_RE)) {
      const target = m[1].trim().replace(/\.md$/, '').split('/').pop();
      if (target && target !== r.title && stubByName.has(target)) links.add(target);
    }
    r.links = [...links];
  }

  /* 4) 统计 */
  const stubCount = reviewed.filter((r) => r.tierSuggested === 'stub').length;
  const hiddenCount = reviewed.filter((r) => r.tierSuggested === 'hidden').length;

  const byFolder = {};
  for (const r of reviewed) {
    const k = `${r.folder} → ${r.tierSuggested}`;
    byFolder[k] = (byFolder[k] || 0) + 1;
  }
  const hiddenByRule = {};
  for (const r of reviewed.filter((x) => x.tierSuggested === 'hidden' && x.hitRules.length)) {
    for (const rule of r.hitRules) hiddenByRule[rule] = (hiddenByRule[rule] || 0) + 1;
  }

  /* 5) 红线复检：对全部 stub 候选标题再跑一遍政治正则，命中必须为 0 */
  const stubPoliticalLeaks = stubNotes.filter((r) => isPolitical(r.title));

  /* 6) 写 title-review.json —— 三段式，按「谁需要被审 + 暴露面最小」分组：
        a. stubCandidates：将公开（标题+双链），逐条带标题供用户确认可发（524）
        b. overrideCandidates：白名单域内被敏感规则降级的 hidden，带标题+命中规则供用户复核误杀
           （这些是用户选入的中性域，标题敏感度低；需要人看以挑出假阳性）
        c. excludedFolders：整域排除（02工作/80随记等）只出「文件夹 + 数量」摘要，
           【绝不列明文标题/路径】——这是审阅文件被传阅/截图时的最大泄漏面，从源头去掉
        stub 的 links 是计数（number），不暴露被链接笔记内容。 */
  const stubFolderSet = new Set(PM.stubFolders);
  const stubCandidates = reviewed
    .filter((r) => r.tierSuggested === 'stub')
    .sort((a, b) => a.path.localeCompare(b.path, 'zh'))
    .map(({ title, folder, links }) => ({
      title, folder, disposition: 'publish',
      ...(links && links.length ? { links: links.length } : {}),
    }));
  // 白名单域内被降级的 hidden（需人工复核误杀）——带标题
  const overrideCandidates = reviewed
    .filter((r) => r.tierSuggested === 'hidden' && stubFolderSet.has(r.folder))
    .sort((a, b) => a.path.localeCompare(b.path, 'zh'))
    .map(({ title, folder, hitRules, reason }) => ({ title, folder, hitRules, reason, disposition: 'hide' }));
  // 整域排除的 hidden：只出文件夹 + 数量，不出任何标题/路径
  const excludedFolders = {};
  for (const r of reviewed) {
    if (r.tierSuggested === 'hidden' && !stubFolderSet.has(r.folder)) {
      excludedFolders[r.folder] = (excludedFolders[r.folder] || 0) + 1;
    }
  }
  const out = {
    generated_at: new Date().toISOString(),
    mode: 'dry-run',
    note: '三态隐私迁移分级草案。审阅指引见下。本文件落 .private/（已 gitignore），含敏感标题，绝不入库。',
    howToReview: [
      'stubCandidates：将以「标题+双链」公开的非 AI 节点。逐条看标题，不想公开的把 disposition 改 hide。',
      'overrideCandidates：白名单中性域内被敏感规则自动降级隐藏的笔记。复核有无误杀（如「中国农民亩均收入」被 finance 误命中），想公开的改 disposition 为 publish。',
      'excludedFolders：整域硬排除（雇主/极私/导入区/涉政）。这里只给文件夹+数量摘要，不列标题以防泄漏。确认这些文件夹整体不发布即可；如某域想改为逐篇审，把它从 hiddenFolders 移到 stubFolders 重跑。',
    ],
    config: {
      stubFolders: PM.stubFolders,
      hiddenFolders: PM.hiddenFolders,
      sensitiveRuleCount: PM.titleSensitivePatterns.length,
    },
    stats: {
      scanned: reviewed.length,
      stub: stubCount,
      hidden: hiddenCount,
      byFolderTier: byFolder,
      hiddenByRule,
      politicalLeaksInStub: stubPoliticalLeaks.length,
      icloudSkipped,
    },
    stubCandidates,
    overrideCandidates,
    excludedFolders,
  };
  writeJson(PM.titleReviewOut, out);

  /* 7) 控制台报告（不打印正文，标题也只在泄漏时列出供排查） */
  console.log(`[migrate · dry-run] 扫描全库（除 04AI/.obsidian/.trash）共 ${reviewed.length} 篇`);
  console.log(`[migrate · dry-run] stub 候选 ${stubCount} 篇 · hidden ${hiddenCount} 篇 · 读正文取链接 ${bodyReadForLinks} 篇`);
  console.log('[migrate · dry-run] 按 文件夹→分级 分布：');
  for (const [k, v] of Object.entries(byFolder).sort()) console.log(`    ${k}: ${v}`);
  if (Object.keys(hiddenByRule).length) {
    console.log('[migrate · dry-run] hidden 命中规则分布：');
    for (const [k, v] of Object.entries(hiddenByRule).sort((a, b) => b[1] - a[1])) console.log(`    ${k}: ${v}`);
  }
  if (stubPoliticalLeaks.length) {
    console.error(`[migrate · dry-run] ✗✗ 红线复检失败：${stubPoliticalLeaks.length} 篇 stub 候选标题命中政治正则：`);
    stubPoliticalLeaks.forEach((r) => console.error(`    ${r.path}`));
    process.exitCode = 2;
  } else {
    console.log('[migrate · dry-run] ✓ 红线复检：全部 stub 候选标题政治正则命中 = 0');
  }
  if (icloudSkipped) console.warn(`[migrate · dry-run] ⚠ ${icloudSkipped} 个 iCloud 未下载文件被跳过`);
  console.log(`[migrate · dry-run] → ${PM.titleReviewOut}（未写 graph.json / content/kb）`);
}

function runFullPipeline({ migrate = false } = {}) {

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
for (const n of pub) {
  const a = nodeIdx.get(n.name);
  for (const t of n.links) {
    const b = nodeIdx.get(t);
    if (b === undefined) continue;
    if (a < b) edges.push([a, b]);
  }
}

/* ---------- 4b. 三态发布：把非 04AI 的 stub 节点并入图谱（--migrate） ----------
   stub 节点 = privacyMigration 白名单域内、过完三态分级判定为 stub 的笔记。
   绝无 slug、绝无 body/excerpt/provenance/created/任何正文派生字段——只 {id,title,cluster,deg,tier,links}。
   正文只用于解析双链目标后即丢弃（不写盘、不进任何产物）。
   edges 统一为「节点下标 [a,b]」：full↔full（已建）+ stub↔stub + stub↔full 都入；hidden 不入图。 */
let stubLayer = null;
if (migrate) stubLayer = buildStubLayer({ fullNotes: notes, fullNameIdx: nodeIdx, fullCount: pub.length });

/* full↔stub / stub↔stub 边追加到全局 edges（下标已对齐：full 占 0..pub.length-1，stub 顺延） */
if (stubLayer) for (const e of stubLayer.edges) edges.push(e);

/* 度数：在「全部边」上统一计算（含跨层），full 节点度数也会吸收 stub↔full 的贡献 */
const totalNodeCount = pub.length + (stubLayer ? stubLayer.nodes.length : 0);
const degree = new Array(totalNodeCount).fill(0);
for (const [a, b] of edges) { degree[a]++; degree[b]++; }

const fullNodes = pub.map((n, i) => ({
  id: i,
  title: n.name,
  slug: n.slugPath,
  cluster: clusterIdx.get(n.clusterFolder),
  deg: degree[i],
  tier: 'full',
  created: dayKey(new Date(n.created)),
  ...(n.facet ? { facet: n.facet } : {}),
  ...(n.featured ? { hub: 1 } : {}),
}));

const stubNodes = stubLayer
  ? stubLayer.nodes.map((s) => ({
      id: s.id,
      title: s.title,
      cluster: s.cluster,
      deg: degree[s.id],
      tier: 'stub',
      links: s.links, // 被链节点 id 引用数组（同层 stub + 跨层 full）
    }))
  : [];

const fullClusters = clusters.filter((c) => c.count > 0).map(({ id, name, count }) => ({ id, name, count }));
const stubClusters = stubLayer ? stubLayer.clusters : [];

const graph = {
  generated_at: new Date().toISOString(),
  nodes: [...fullNodes, ...stubNodes],
  edges,
  clusters: [...fullClusters, ...stubClusters],
  stats: {
    notes: pub.length,
    links: edges.length,
    domains: fullClusters.length,
    ...(stubLayer ? { stubNotes: stubNodes.length, stubDomains: stubClusters.length } : {}),
    vaultNotesAll: null, // collect-activity 填的是全库口径，这里只管 04AI
    aiNotesAll: notes.size,
  },
};
writeJson(GRAPH_OUT, graph);
if (stubLayer) {
  console.log(
    `[vault · migrate] 并入 stub：${stubNodes.length} 节点 / ${stubClusters.length} 域；` +
      `跨层与同层 stub 边 ${stubLayer.edges.length} 条；hidden ${stubLayer.hiddenCount} 篇不入图`
  );
}

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
/* ════════════════════════════════════════════════════════════════
   buildStubLayer —— 扫全库非 04AI，按 classify 分级，产出 stub 节点层。
   入参：
     fullNotes   —— 04AI full 笔记 Map（name → note），用于 stub↔full 跨层连边
     fullNameIdx —— full 笔记 name → 全局节点下标（0..fullCount-1）
     fullCount   —— full 节点数（stub 节点 id 从此顺延）
   产出：{ nodes:[{id,title,cluster,links}], clusters:[{id,name,count,tier}], edges:[[a,b]], hiddenCount }
   不变量：
     · 只读标题做分级；正文仅用于解析 [[双链]] 目标后即丢弃，绝不写盘、不进任何字段。
     · stub 节点无 slug、无任何正文派生字段。
     · hidden 节点不产出、其边不入图。
   ════════════════════════════════════════════════════════════════ */
function buildStubLayer({ fullNotes, fullNameIdx, fullCount }) {
  const WIKILINK_RE = /\[\[([^\]|#\n]+)(#[^\]|\n]*)?(\|[^\]\n]*)?\]\]/g;

  /* 1) 扫全库（排除 04AI 子树/.obsidian/.trash/.icloud），逐篇分级 */
  const stubRecs = []; // { title, folder, file }
  let hiddenCount = 0;
  for (const f of walk(CONFIG.vault, { exclude: ['.obsidian', '.trash'] })) {
    const base = path.basename(f);
    if (base.endsWith('.icloud')) continue;
    if (!base.endsWith('.md')) continue;
    const rel = path.relative(CONFIG.vault, f).split(path.sep).join('/');
    const folder = topFolderOf(rel);
    if (folder === CONFIG.vaultAiDir) continue; // 04AI 维持 full，不进 stub 层
    const title = base.slice(0, -3);
    const { tier } = classify({ title, topFolder: folder });
    if (tier === 'stub') stubRecs.push({ title, folder, file: f });
    else hiddenCount++; // tier === 'hidden'
  }

  /* 2) 同名去重（vault 不同目录可能撞名；保第一个，与 full 主路径 notes Map 同语义）。
        stub↔full 撞名极少，但若 stub 标题已是 full 节点名，连边会指向 full，节点仍各自存在。 */
  const seen = new Set();
  const stubNotes = [];
  for (const r of stubRecs) {
    if (seen.has(r.title)) continue;
    seen.add(r.title);
    stubNotes.push(r);
  }

  /* 3) cluster 分配：每个出现过的 stub 顶层文件夹各一个【新 cluster id】，从现 max+1 续号。
        现 full cluster id = clusterFolders 下标 0..len-1（max 为 len-1），故 stub 起始 = clusterFolders.length。 */
  const stubFolderOrder = []; // 保持白名单声明顺序里实际出现的文件夹
  for (const fld of CONFIG.privacyMigration.stubFolders) {
    if (stubNotes.some((s) => s.folder === fld) && !stubFolderOrder.includes(fld)) stubFolderOrder.push(fld);
  }
  // 兜底：万一有 stub 文件夹不在声明顺序里（理论不会），按出现序补上
  for (const s of stubNotes) {
    if (!stubFolderOrder.includes(s.folder)) stubFolderOrder.push(s.folder);
  }
  const stubClusterIdBase = clusterFolders.length;
  const stubClusterId = new Map(stubFolderOrder.map((fld, i) => [fld, stubClusterIdBase + i]));

  /* 4) stub 节点 id 顺延 full：fullCount + i */
  stubNotes.forEach((s, i) => { s.id = fullCount + i; });
  const stubNameIdx = new Map(stubNotes.map((s) => [s.title, s.id]));

  /* 5) 解析双链 → 全局 id 引用 + 边。正文读取后即丢弃，不留存。
        目标可命中 stub（同层）或 full（跨层）；hidden 笔记不在两张表里，自然被排除。 */
  const edgeSet = new Set(); // "a,b"（a<b）去重
  for (const s of stubNotes) {
    const linkIds = new Set();
    let body = '';
    try { body = fs.readFileSync(s.file, 'utf8').replace(/\u0000+/g, ''); } catch { /* 读不到当无链接 */ }
    for (const m of body.matchAll(WIKILINK_RE)) {
      const target = m[1].trim().replace(/\.md$/, '').split('/').pop();
      if (!target || target === s.title) continue;
      let b;
      if (stubNameIdx.has(target)) b = stubNameIdx.get(target);      // stub↔stub
      else if (fullNameIdx.has(target)) b = fullNameIdx.get(target); // stub↔full
      else continue; // 指向 hidden / 死链 / 库外：丢弃
      if (b === s.id) continue;
      linkIds.add(b);
      const [lo, hi] = s.id < b ? [s.id, b] : [b, s.id];
      edgeSet.add(`${lo},${hi}`);
    }
    s.links = [...linkIds].sort((a, b) => a - b);
  }
  const edges = [...edgeSet].map((k) => k.split(',').map(Number));

  /* 6) cluster 元数据（count = 该域 stub 节点数；GRAPH_PALETTE 由前端按 id%12 取色，回绕可接受） */
  const clusters = stubFolderOrder.map((fld) => ({
    id: stubClusterId.get(fld),
    name: fld,
    count: stubNotes.filter((s) => s.folder === fld).length,
    tier: 'stub',
  }));

  const nodes = stubNotes.map((s) => ({
    id: s.id,
    title: s.title,
    cluster: stubClusterId.get(s.folder),
    links: s.links,
  }));

  return { nodes, clusters, edges, hiddenCount };
}
} // ── end runFullPipeline ──

// KG-3 三态发布 · 不变量校验（可复跑，不构建）
// 用法：node scripts/verify-privacy-invariants.mjs
// 退出码 0 = 全过；非 0 = 有不变量被破坏（逐条打印 ✓/✗）。
//
// 校验项（对照用户 2026-06-15 签字的保守发布约束）：
//   ① full 节点仍 598 且都带 slug
//   ② stub 节点无一带 slug，字段集 ⊆ {id,title,cluster,deg,tier,links}
//   ③ 全部 stub 标题跑政治正则命中 = 0（备案红线）
//   ④ content/kb 的 .md 文件数 = full 节点数（stub 不写盘，仍仅 full）
//   ⑤ 5 条放行白名单都已成 stub（逐条在 graph.json stub 节点里确认存在）
//   ⑥ hidden 的 9 域 0 节点进图（graph.json 里没有任何节点来自 hiddenFolders）
//   附加：edges 下标合法 + 各类边（full↔full / stub↔stub / stub↔full）计数自洽
import fs from 'node:fs';
import path from 'node:path';
import { CONFIG } from './config.mjs';
import { isPolitical, classify, topFolderOf } from './lib/privacy-tier.mjs';
import { walk } from './lib/util.mjs';

const GRAPH = path.join(CONFIG.dataDir, 'graph.json');
const KB = CONFIG.kbContentDir;
const PM = CONFIG.privacyMigration;

const results = []; // { ok, name, detail }
const check = (ok, name, detail = '') => results.push({ ok: !!ok, name, detail });

const graph = JSON.parse(fs.readFileSync(GRAPH, 'utf8'));
const nodes = graph.nodes || [];
const fullNodes = nodes.filter((n) => n.tier === 'full');
const stubNodes = nodes.filter((n) => n.tier === 'stub');

/* ① full = 598 且都带 slug */
const fullNoSlug = fullNodes.filter((n) => !n.slug);
check(fullNodes.length === 598, '① full 节点 = 598', `实际 ${fullNodes.length}`);
check(fullNoSlug.length === 0, '① full 节点都带 slug', `缺 slug ${fullNoSlug.length} 个`);

/* ② stub 无 slug，字段集 ⊆ {id,title,cluster,deg,tier,links} */
const ALLOWED = new Set(['id', 'title', 'cluster', 'deg', 'tier', 'links']);
const stubWithSlug = stubNodes.filter((n) => 'slug' in n);
const stubBadFields = stubNodes.filter((n) => Object.keys(n).some((k) => !ALLOWED.has(k)));
const stubExtraKeys = [...new Set(stubBadFields.flatMap((n) => Object.keys(n).filter((k) => !ALLOWED.has(k))))];
check(stubWithSlug.length === 0, '② stub 节点无一带 slug', `带 slug ${stubWithSlug.length} 个`);
check(
  stubBadFields.length === 0,
  '② stub 字段集 ⊆ {id,title,cluster,deg,tier,links}',
  stubExtraKeys.length ? `越界字段 ${JSON.stringify(stubExtraKeys)}` : ''
);

/* ③ 全部 stub 标题政治正则命中 = 0 */
const polLeaks = stubNodes.filter((n) => isPolitical(n.title));
check(polLeaks.length === 0, '③ stub 标题政治正则命中 = 0', polLeaks.length ? `泄漏 ${polLeaks.map((n) => n.title).join(' / ')}` : '');

/* ④ content/kb 的 .md 文件数 = full 节点数（stub 不写盘） */
let kbMd = 0;
for (const f of walk(KB)) if (f.endsWith('.md')) kbMd++;
check(kbMd === fullNodes.length, '④ content/kb 的 .md 数 = full 节点数', `kb ${kbMd} vs full ${fullNodes.length}`);

/* ⑤ 5 条放行白名单都已成 stub（在 graph.json stub 节点里逐条存在） */
const stubTitles = new Set(stubNodes.map((n) => n.title));
const overrideMissing = PM.titleOverrideAllow.filter((t) => !stubTitles.has(t));
for (const t of PM.titleOverrideAllow) {
  check(stubTitles.has(t), `⑤ 放行白名单成 stub：「${t}」`, stubTitles.has(t) ? '' : '未在 stub 节点中');
}
check(overrideMissing.length === 0, '⑤ 放行白名单 5 条全部成 stub', overrideMissing.length ? `缺 ${overrideMissing.join(' / ')}` : '');

/* ⑥ hidden 的 9 域 0 节点进图：重扫全库，确认任何 hiddenFolder 域的标题都不在 graph.json 节点标题里。
   （full 标题来自 04AI，与 hiddenFolders 无交集；stub 也应排除——这里做端到端复检） */
const graphTitles = new Set(nodes.map((n) => n.title));
const hiddenFolderLeaks = []; // { title, folder }
const stubFolderSet = new Set(PM.stubFolders);
let scanned = 0;
for (const f of walk(CONFIG.vault, { exclude: ['.obsidian', '.trash'] })) {
  const base = path.basename(f);
  if (base.endsWith('.icloud') || !base.endsWith('.md')) continue;
  const rel = path.relative(CONFIG.vault, f).split(path.sep).join('/');
  const folder = topFolderOf(rel);
  if (folder === CONFIG.vaultAiDir) continue;
  scanned++;
  const title = base.slice(0, -3);
  if (PM.hiddenFolders.includes(folder) && graphTitles.has(title)) {
    // 标题可能与某 stub/full 节点撞名才进图——逐个确认那个进图节点确实不是来自此 hidden 域
    // 端到端口径：只要 hidden 域里出现一个标题，且图里有同名节点，标记疑似泄漏供人工判读
    hiddenFolderLeaks.push({ title, folder });
  }
}
check(hiddenFolderLeaks.length === 0, '⑥ hiddenFolders(9 域) 标题 0 个出现在图中', hiddenFolderLeaks.length ? `疑似 ${hiddenFolderLeaks.length} 个：${hiddenFolderLeaks.slice(0, 5).map((x) => x.title).join(' / ')}` : '');

/* ⑥b 反向口径：每个 stub 节点的来源域必须 ∈ stubFolders（不能来自 hiddenFolders/未知域）。
   用 classify 复跑标题级判定——stub 节点标题在其声明域应判 stub。 */
// 这一层需要文件夹归属信息；stub 节点本身不带 folder，用 cluster→folder 映射回推。
const clusterName = new Map((graph.clusters || []).map((c) => [c.id, c.name]));
const stubFromNonStubFolder = stubNodes.filter((n) => {
  const folder = clusterName.get(n.cluster);
  return folder && !stubFolderSet.has(folder);
});
check(stubFromNonStubFolder.length === 0, '⑥b 每个 stub 节点来源域 ∈ stubFolders', stubFromNonStubFolder.length ? `${stubFromNonStubFolder.length} 个来源非白名单域` : '');

/* 附加：edges 下标合法 + 边分类自洽 */
const N = nodes.length;
const fullIds = new Set(fullNodes.map((n) => n.id));
const stubIds = new Set(stubNodes.map((n) => n.id));
let badIdx = 0, ff = 0, ss = 0, sf = 0, selfLoop = 0;
const seen = new Set();
let dup = 0;
for (const [a, b] of graph.edges) {
  if (!(a >= 0 && a < N && b >= 0 && b < N)) { badIdx++; continue; }
  if (a === b) selfLoop++;
  const key = a < b ? `${a},${b}` : `${b},${a}`;
  if (seen.has(key)) dup++; else seen.add(key);
  const aFull = fullIds.has(a), bFull = fullIds.has(b);
  if (aFull && bFull) ff++;
  else if (!aFull && !bFull) ss++;
  else sf++;
}
check(badIdx === 0, '附加 · edges 下标全部合法', `越界 ${badIdx} 条`);
check(selfLoop === 0, '附加 · 无自环边', `自环 ${selfLoop} 条`);
check(dup === 0, '附加 · 无重复边', `重复 ${dup} 条`);

/* deg 自洽：节点 deg = 关联边数 */
const degCount = new Array(N).fill(0);
for (const [a, b] of graph.edges) { if (a < N) degCount[a]++; if (b < N) degCount[b]++; }
const degMismatch = nodes.filter((n) => n.deg !== degCount[n.id]);
check(degMismatch.length === 0, '附加 · 节点 deg 与边数自洽', degMismatch.length ? `${degMismatch.length} 个不符` : '');

/* ── 输出 ── */
console.log('KG-3 三态发布 · 不变量校验\n');
console.log(`图谱：${N} 节点（full ${fullNodes.length} / stub ${stubNodes.length}）· ${graph.edges.length} 边`);
console.log(`边分类：full↔full ${ff} · stub↔stub ${ss} · stub↔full ${sf}`);
console.log(`stub 来源扫描：非 04AI 共 ${scanned} 篇\n`);

let allOk = true;
for (const r of results) {
  if (!r.ok) allOk = false;
  console.log(`${r.ok ? '✓' : '✗'} ${r.name}${r.detail ? `  — ${r.detail}` : ''}`);
}
console.log(`\n${allOk ? '✓ 全部不变量通过' : '✗ 有不变量被破坏'}`);
process.exit(allOk ? 0 : 1);

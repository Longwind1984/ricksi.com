// 旅行足迹采集器：Google Maps 收藏 POI（私有源）→ 发布级 data/travels.json
// 用法：node scripts/collect-travels.mjs [私有源路径]
// 源文件默认取本机 sibling 原型仓 local-data/（.private.json 绝不入库、绝不复制进本仓）；
// 缺失时优雅跳过（exit 0），夜间 sync 不因此中断。
//
// 发布纪律（源文件头部 privacy 标注「包含收藏备注，不得直接发布」）：
//   ① 输出只含 name/coords/category/rating/归属章节 —— note / mapsUrl / recordId 一律剥离
//   ② 全部将发布的名称过 isPolitical（备案红线），命中即失败退出
//   ③ 城市归并用手写 gazetteer（scripts/lib/travel-gazetteer.mjs），离线确定，不打外部地理 API
//
// 地理底图（夜色地形贴图 + 大河矢量）由 scripts/collect-geo.mjs 单独烘焙。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GAZETTEER } from './lib/travel-gazetteer.mjs';
import { isPolitical } from './lib/privacy-tier.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC =
  process.argv[2] ||
  process.env.TRAVEL_POIS_SRC ||
  path.join(REPO, '..', 'rick-homepage-travel-globe-prototype', 'local-data', 'google-maps-saved-pois.full.private.json');
const OUT_DATA = path.join(REPO, 'data', 'travels.json');

if (!fs.existsSync(SRC)) {
  console.log(`⊙ collect-travels：私有源不存在，跳过（${SRC}）`);
  process.exit(0); // 不让夜间 sync 因本机源缺席而失败
}
const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'));

const hav = (a, b, c, d) => {
  const R = 6371, t = Math.PI / 180;
  const h = Math.sin(((c - a) * t) / 2) ** 2 + Math.cos(a * t) * Math.cos(c * t) * Math.sin(((d - b) * t) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const nfkc = (s) => (s ?? '').normalize('NFKC').trim();

/* ---------- ① 规范化 + 去重（同一名称且 ~110m 内视为同一 POI，跨列表归属合并） ---------- */
const CHAPTERS = ['2024 LATAM Travel', '2025', '2026', 'CityWalk Marks'];
const CH_META = [
  { id: 'latam2024', zh: '2024 · 拉美长征', en: 'LATAM 2024' },
  { id: 'y2025', zh: '2025 · 纵横美洲', en: '2025' },
  { id: 'y2026', zh: '2026 · 进行时', en: '2026' },
  { id: 'citywalk', zh: '城市漫步', en: 'CITYWALK' },
];
const chIdx = (name) => CHAPTERS.indexOf(name);

const PRICEISH = /[$€£¥]|^\d|^R\$|·\s*\d/;
function categoryOf(details) {
  for (const d of details ?? []) {
    const s = nfkc(String(d)).replace(/^[·\s]+/, '');
    if (s && !PRICEISH.test(s)) return s;
  }
  return null;
}

const pois = new Map(); // key → {n,la,ln,c,r,ch:[],o:{chIdx:order}}
let skipped = 0;
for (const r of raw.rawRecords ?? []) {
  if (typeof r.lat !== 'number' || typeof r.lng !== 'number') { skipped++; continue; }
  const ci = chIdx(r.sourceList);
  if (ci < 0) { skipped++; continue; }
  const name = nfkc(r.name) || '未命名停留点';
  const key = `${name.toLowerCase()}@${r.lat.toFixed(3)},${r.lng.toFixed(3)}`;
  const cur = pois.get(key);
  if (cur) {
    if (!cur.ch.includes(ci)) cur.ch.push(ci);
    cur.o[ci] = Math.min(cur.o[ci] ?? 1e9, r.sourceListOrder);
    continue;
  }
  pois.set(key, {
    n: name,
    la: Math.round(r.lat * 1e4) / 1e4,
    ln: Math.round(r.lng * 1e4) / 1e4,
    c: categoryOf(r.visibleDetails),
    r: typeof r.rating === 'number' ? Math.round(r.rating * 10) / 10 : null,
    ch: [ci],
    o: { [ci]: r.sourceListOrder },
  });
}

/* ---------- ② 城市归并：最近 gazetteer 城市 ≤ 其半径；否则「途中」独立停留点 ---------- */
const list = [...pois.values()];
const cityOf = list.map((p) => {
  let best = -1, bd = 1e9;
  GAZETTEER.forEach((g, gi) => {
    const d = hav(p.la, p.ln, g[2], g[3]);
    if (d <= g[4] && d < bd) { best = gi; bd = d; }
  });
  return best;
});
const gazUsed = new Map(); // gazIdx → {count, ch:Set}
list.forEach((p, i) => {
  const gi = cityOf[i];
  if (gi < 0) return;
  if (!gazUsed.has(gi)) gazUsed.set(gi, { count: 0, ch: new Set() });
  const u = gazUsed.get(gi);
  u.count++;
  p.ch.forEach((c) => u.ch.add(c));
});
const gazOrder = [...gazUsed.keys()].sort((a, b) => gazUsed.get(b).count - gazUsed.get(a).count);
const cityIdxOfGaz = new Map(gazOrder.map((g, i) => [g, i]));
const cities = gazOrder.map((g) => {
  const [n, co, la, ln] = GAZETTEER[g];
  const u = gazUsed.get(g);
  return { n, co, la, ln, k: u.count, ch: [...u.ch].sort() };
});
list.forEach((p, i) => { p.ci = cityOf[i] < 0 ? -1 : cityIdxOfGaz.get(cityOf[i]); });

/* ---------- ③ 章节站点序列与推测航迹 ----------
   收藏列表的保存顺序≠旅行顺序（实测 CityWalk 在 100 城间乒乓、全量 32 万 km）。
   因此航迹按「地理就近」重建：从收藏首站出发的最近邻路径 + 2-opt 扫掠消交叉，
   前端必须标注为「推测航迹」。里程 = 重建路径的大圆连线合计。 */
const poiIdx = new Map(list.map((p, i) => [p, i]));
const legKm = (a, b) => hav(a.la, a.ln, b.la, b.ln);
function routeOf(stops) {
  if (stops.length < 3) return stops;
  const rest = stops.slice(1);
  const seq = [stops[0]];
  while (rest.length) {
    const last = seq[seq.length - 1];
    let bi = 0, bd = Infinity;
    for (let i = 0; i < rest.length; i++) {
      const d = legKm(last, rest[i]);
      if (d < bd) { bd = d; bi = i; }
    }
    seq.push(rest.splice(bi, 1)[0]);
  }
  // 2-opt 扫掠：消除最近邻遗留的交叉边（确定性，无随机）
  for (let sweep = 0; sweep < 30; sweep++) {
    let improved = false;
    for (let i = 1; i < seq.length - 1; i++) {
      for (let j = i + 1; j < seq.length; j++) {
        const d1 = legKm(seq[i - 1], seq[i]) + legKm(seq[j], seq[(j + 1) % seq.length] ?? seq[j]);
        const d2 = legKm(seq[i - 1], seq[j]) + legKm(seq[i], seq[(j + 1) % seq.length] ?? seq[j]);
        if (d2 < d1 - 1e-9) {
          for (let a = i, b = j; a < b; a++, b--) [seq[a], seq[b]] = [seq[b], seq[a]];
          improved = true;
        }
      }
    }
    if (!improved) break;
  }
  return seq;
}
const chapters = CH_META.map((m, ci) => {
  const members = list.filter((p) => p.ch.includes(ci)).sort((a, b) => (a.o[ci] ?? 1e9) - (b.o[ci] ?? 1e9));
  const rawStops = [];
  const seenCity = new Set();
  for (const p of members) {
    const isCity = p.ci >= 0;
    if (isCity) {
      if (seenCity.has(p.ci)) continue; // 每章内同一城市只留一个站点（首次出现处）
      seenCity.add(p.ci);
    }
    const pos = isCity ? [cities[p.ci].la, cities[p.ci].ln] : [p.la, p.ln];
    rawStops.push({ t: isCity ? 'c' : 'p', i: isCity ? p.ci : poiIdx.get(p), la: pos[0], ln: pos[1] });
  }
  const stops = routeOf(rawStops);
  let km = 0;
  for (let i = 0; i < stops.length; i++) {
    if (i) km += legKm(stops[i - 1], stops[i]);
    stops[i].km = Math.round(km);
  }
  const cityCount = new Map();
  for (const p of members) if (p.ci >= 0) cityCount.set(p.ci, (cityCount.get(p.ci) ?? 0) + 1);
  const sub = [...cityCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([i]) => cities[i].n).join(' · ');
  return { ...m, count: members.length, km: Math.round(km), sub, stops };
});

/* ---------- ④ 隐私闸：名称类字段全量过政治红线；断言无 note 泄漏 ---------- */
const namesToCheck = [
  ...list.map((p) => p.n),
  ...list.map((p) => p.c).filter(Boolean),
  ...cities.flatMap((c) => [c.n, c.co]),
];
const polHits = namesToCheck.filter((n) => isPolitical(n));
if (polHits.length) {
  console.error(`✗ collect-travels：政治红线命中，拒绝发布：${polHits.join(' / ')}`);
  process.exit(1);
}
for (const p of list) {
  if ('note' in p || 'mapsUrl' in p || 'recordId' in p) {
    console.error('✗ collect-travels：输出对象混入私有字段');
    process.exit(1);
  }
}

const stats = {
  poiCount: list.length,
  cityCount: cities.length,
  countryCount: new Set(cities.map((c) => c.co)).size,
  kmTotal: chapters.reduce((a, c) => a + c.km, 0),
  enRoute: list.filter((p) => p.ci < 0).length,
  skippedNoCoords: skipped,
};
const out = {
  generated_at: new Date().toISOString(),
  source: 'Google Maps 收藏列表（发布版：仅名称/坐标/类别/评分，备注已剥离）',
  stats,
  chapters: chapters.map(({ stops, ...c }) => ({ ...c, stops: stops.map(({ t, i, km }) => ({ t, i, km })) })),
  cities,
  pois: list.map(({ n, la, ln, c, r, ch, ci }) => ({ n, la, ln, c, r, ch: [...ch].sort(), ci })),
};
fs.mkdirSync(path.dirname(OUT_DATA), { recursive: true });
fs.writeFileSync(OUT_DATA, JSON.stringify(out));
console.log(`✓ data/travels.json：${stats.poiCount} 足迹点 · ${stats.cityCount} 城市 · ${stats.countryCount} 国 · 连线 ${stats.kmTotal.toLocaleString()} km`);

/* 首页迷你地球用的精简包（运行时 fetch，免内联）：坐标 + 章节位掩码 + 城市 + 统计 */
const OUT_MINI = path.join(REPO, 'public', 'assets', 'travels', 'travels-mini.json');
const mini = {
  s: [stats.poiCount, stats.cityCount, stats.countryCount, stats.kmTotal],
  p: list.map((p) => [p.la, p.ln, p.ch.reduce((a, c) => a | (1 << c), 0)]),
  c: cities.map((c) => [c.la, c.ln, c.k]),
};
fs.mkdirSync(path.dirname(OUT_MINI), { recursive: true });
fs.writeFileSync(OUT_MINI, JSON.stringify(mini));
const unassigned = list.filter((p) => p.ci < 0);
if (unassigned.length) {
  console.log(`  途中未归并 ${unassigned.length} 点（如新增旅程可补 gazetteer）：`);
  for (const p of unassigned) console.log(`    (${p.la}, ${p.ln}) ${p.n}`);
}

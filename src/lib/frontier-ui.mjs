// 前沿追踪 UI 共享工具（构建期）：领域配色 + 头像兜底「星座字母牌」
// 字母牌是确定性生成（slug 哈希做种子）：同一人物每次构建产出完全一致的 SVG，
// 风格与 Liquid Glass 深空体系同源——新增人物即使头像未生成也不破版、不违和。

/* 领域强调色（设计系统 v2 图谱色环非邻接四档 h240/180/90/300，与 GRAPH_PALETTE 同源） */
export const DOMAIN_ACCENT = {
  lab: '#71C1F7',
  engineering: '#59CEBA',
  research: '#D3B460',
  writing: '#C2A7F4',
};

/* slug → 稳定 uint32 种子 */
function hashOf(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed) {
  let t = seed;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/* 名字 → 缩写（拉丁取首字母两枚；中文取前两字） */
export function initialsOf(name) {
  if (/^[一-鿿]/.test(name)) return name.slice(0, 2);
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

/* 确定性星座字母牌 SVG（120×120 viewBox，外层控制实际尺寸） */
export function portraitFallbackSvg(person) {
  const accent = DOMAIN_ACCENT[person.domain] ?? '#7FB3F0';
  const rand = rng(hashOf(person.slug));
  // 5-7 颗星 + 相邻连线，构成每人独有的小星座
  const n = 5 + Math.floor(rand() * 3);
  const stars = [];
  for (let i = 0; i < n; i++) {
    stars.push({
      x: 14 + rand() * 92,
      y: 14 + rand() * 92,
      r: 0.8 + rand() * 1.6,
    });
  }
  const lines = stars
    .slice(1)
    .map((s, i) => `<line x1="${stars[i].x.toFixed(1)}" y1="${stars[i].y.toFixed(1)}" x2="${s.x.toFixed(1)}" y2="${s.y.toFixed(1)}" stroke="${accent}" stroke-opacity="0.28" stroke-width="0.7"/>`)
    .join('');
  const dots = stars
    .map((s) => `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${s.r.toFixed(1)}" fill="${accent}" fill-opacity="${(0.35 + rand() * 0.45).toFixed(2)}"/>`)
    .join('');
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${person.name}">
<defs><linearGradient id="g-${person.slug}" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#101A2E"/><stop offset="1" stop-color="#0A1222"/></linearGradient></defs>
<rect width="120" height="120" fill="url(#g-${person.slug})"/>${lines}${dots}
<text x="60" y="66" text-anchor="middle" dominant-baseline="middle" font-family="ui-monospace,Menlo,monospace" font-size="34" letter-spacing="2" fill="rgba(255,255,255,0.88)">${initialsOf(person.name)}</text>
<line x1="42" y1="84" x2="78" y2="84" stroke="#F4C761" stroke-width="1.2" stroke-opacity="0.85"/>
</svg>`;
}

/* ── 星图评级（详见 docs/star-rating.md，规约 v1）─────────────────────
   采集端只存三维分（apparent 声量 / absolute 分量 / gravity·periodic·singularity 布尔），
   星类是这些维度的确定性函数——规则单点在此，改规则不必重抓数据。
   核心：视亮度(声量)与绝对亮度(分量)解耦——深空不亮却重，流星很亮却空，黑洞不亮却主宰。
   注意：北极星已迁出事件星类、归入信源量级 CONSTELLATION（见下）。 */
export const STAR_CLASS = {
  singularity: { zh: '奇点', en: 'Singularity', sym: '✺', rank: 6, color: '#FFF2CC', gist: '技术演进史的分水岭——重定义时代的少数大事件' },
  supernova: { zh: '超新星', en: 'Supernova',   sym: '✦', rank: 5, color: '#F4C761', gist: '高分量 + 出圈：重新定义领域、且刷屏' },
  deepfield: { zh: '深空',   en: 'Deep Field',  sym: '◈', rank: 4, color: '#71C1F7', gist: '高分量却几乎无声——被低估的宝藏' },
  blackhole: { zh: '黑洞',   en: 'Black Hole',  sym: '◉', rank: 4, color: '#C2A7F4', gist: '本体看不见，由对周边的影响反推其重量' },
  nova:      { zh: '新星',   en: 'Nova',        sym: '✶', rank: 3, color: '#59CEBA', gist: '热度很大但不改写范式的爆发' },
  comet:     { zh: '彗星',   en: 'Comet',       sym: '☄', rank: 3, color: '#9DD3F0', gist: '周期性回归、带叙事拖尾的话题潮' },
  meteor:    { zh: '流星',   en: 'Meteor',      sym: '✸', rank: 2, color: '#F0A07A', gist: '声量扎眼、分量近零——炒作型热点' },
  glimmer:   { zh: '微光',   en: 'Faint Glow',  sym: '◦', rank: 2, color: '#8FA3C4', gist: '有一点料、但局部且无声' },
  stardust:  { zh: '星尘',   en: 'Cosmic Dust', sym: '·', rank: 1, color: '#5A6B85', gist: '背景噪声——通稿、水文' },
};

/* 信源量级（人物/机构的定性，标在 config people[].constellation / topics[].constellation）。
   北极星 = 猎户座之上的最高级，据以定向的定义者（重要的人/实验室），人工挑选少数进入。
   注意：这是「信源」track，与事件级 STAR_CLASS（含奇点）是两条独立坐标。 */
export const CONSTELLATION = {
  polaris:       { zh: '北极星', en: 'Polaris',       sym: '✧', color: '#F4C761', gist: '据以定向的定义者——重要的人与实验室，最高源级' },
  constellation: { zh: '猎户座', en: 'Constellation', sym: '✷', color: '#8FB8F0', gist: '地标级、人人辨认的长期源' },
  star:          { zh: '星辰',   en: 'Star',          sym: '✦', color: '#6FC2AE', gist: '可靠产出原创的常规源' },
  planet:        { zh: '行星',   en: 'Planet',        sym: '◐', color: '#8693A8', gist: '反射他人之光的转述/聚合源' },
};
/* 信源量级排序权重（北极星 > 猎户座 > 星辰 > 行星），档案区/时间轴行序用 */
export const CONSTELLATION_RANK = { polaris: 4, constellation: 3, star: 2, planet: 1 };

const _abs = (d) => d.absolute ?? d.importance ?? 3;
const _app = (d) => d.apparent ?? _abs(d); // 旧数据无声量，退化为 = 分量（hype_gap 0）

/* 条目级星类映射（family=EVENT；忠于规约 R1/R6-R8，补齐 absolute≥4 高声量盲区，全网格覆盖）。
   奇点 = 事件级最高，标记技术演进史分水岭，由 singularity 布尔显式置位（极罕见）。 */
export function starOf(d = {}) {
  const abs = _abs(d), app = _app(d);
  if (d.singularity) return 'singularity';
  if (d.gravity) return 'blackhole';
  if (d.periodic && abs <= 3) return 'comet';
  if (abs >= 4) return app >= 4 ? 'supernova' : 'deepfield';
  if (abs === 3) return app >= 4 ? 'nova' : 'glimmer';
  if (abs === 2) return app >= 3 ? 'meteor' : 'glimmer';
  return app >= 3 ? 'meteor' : 'stardust'; // abs === 1
}

/* 炒作落差 = 声量 − 分量。负值大 = 被低估（深空招牌）；正值大 = 声量盖过分量。 */
export function hypeGap(d = {}) {
  return _app(d) - _abs(d);
}
export function hypeLabel(d = {}) {
  const g = hypeGap(d);
  if (g <= -2) return '被低估';
  if (g >= 2) return '声量 > 分量';
  return null;
}
/* 时间轴节点大小 / 组内排序的分量权重（分量主导，法则 1） */
export function starRank(d = {}) {
  return STAR_CLASS[starOf(d)]?.rank ?? 2;
}

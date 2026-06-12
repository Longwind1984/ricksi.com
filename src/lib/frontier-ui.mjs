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

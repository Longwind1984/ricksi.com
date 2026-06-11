// 设计稿样例数据生成器 —— 真实 data/*.json 缺失时的回退，输出与设计稿逐位一致。
// 同时被构建端（index.astro frontmatter）与客户端（图谱回退渲染）引用。

export function rng(seed) {
  let t = seed;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/* 22 周 × 7 天热力图等级（seed 5），返回 [周][天] 的 0-3 等级 */
export function sampleHeatmap(weeks = 22) {
  const rand = rng(5);
  const out = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const recency = w / weeks;
      const v = rand() * (0.35 + recency * 0.9);
      col.push(v < 0.28 ? 0 : v < 0.5 ? 1 : v < 0.75 ? 2 : 3);
    }
    out.push(col);
  }
  return out;
}

/* Obsidian 风格样例图谱（seed 11），与设计稿同构 */
export const SAMPLE_CLUSTERS = ['Agent 与工具调用', 'RAG 与检索', '模型原理', '产品方法', 'Infra 与工程'];
export const GRAPH_PALETTE = ['#7FB3F0', '#6FD3C0', '#F0B070', '#B79DEF', '#EAE6DC', '#8FE08F', '#F09DB5', '#9DD3F0', '#D8C97F', '#C4A6E8', '#A8B8C8'];

export function sampleGraph(width = 880, height = 470, seed = 11) {
  const rand = rng(seed);
  const defs = [
    { name: 'Agent', cx: 0.26, cy: 0.30, n: 11, labels: ['MCP', '工具调用'] },
    { name: 'RAG / 检索', cx: 0.73, cy: 0.24, n: 10, labels: ['Embedding', '重排序'] },
    { name: '模型原理', cx: 0.50, cy: 0.60, n: 13, labels: ['Attention', 'RLHF'] },
    { name: '产品方法', cx: 0.17, cy: 0.74, n: 9, labels: ['评测集', 'PRD'] },
    { name: 'Infra / 工程', cx: 0.82, cy: 0.72, n: 9, labels: ['KV Cache', '推理成本'] },
  ];
  const nodes = [], edges = [];
  defs.forEach((c, ci) => {
    const hub = { x: c.cx * width, y: c.cy * height, r: 10, cluster: ci, label: c.name, hub: true };
    const hubIdx = nodes.length;
    nodes.push(hub);
    for (let i = 0; i < c.n; i++) {
      const ang = rand() * Math.PI * 2;
      const dist = 34 + rand() * 92;
      const node = {
        x: hub.x + Math.cos(ang) * dist,
        y: hub.y + Math.sin(ang) * dist * 0.82,
        r: 2.2 + rand() * 3.4,
        cluster: ci,
        label: i < c.labels.length ? c.labels[i] : null,
      };
      const idx = nodes.length;
      nodes.push(node);
      edges.push([hubIdx, idx, 0.5]);
      if (rand() < 0.38 && i > 0) edges.push([idx, idx - 1, 0.3]);
    }
  });
  const hubIdxs = nodes.map((n, i) => (n.hub ? i : -1)).filter((i) => i >= 0);
  [[0, 1], [0, 2], [1, 2], [2, 3], [2, 4], [1, 4], [0, 3]].forEach(([a, b]) => {
    edges.push([hubIdxs[a], hubIdxs[b], 0.7]);
  });
  return { nodes, edges };
}

/* 样例用量 / 统计（设计稿值） */
export const SAMPLE_USAGE = {
  sample: true,
  today: 1247832,
  week: '8.7M',
  cumulative: '142M',
  models: [['Opus', 38], ['Sonnet', 54], ['Haiku', 8]],
  days7: [
    { d: '周三', v: 0.9 }, { d: '周四', v: 1.4 }, { d: '周五', v: 2.2 },
    { d: '周六', v: 0.7 }, { d: '周日', v: 1.1 }, { d: '周一', v: 1.8 }, { d: '今天', v: 1.25 },
  ],
};

export const SAMPLE_CODING = { sample: true, commits: 486, streak: 37, repos: 9 };

/* 近 14 日趋势样例（M tokens） */
export const SAMPLE_DAYS14 = [
  0.6, 1.1, 0.9, 1.6, 0.7, 1.3, 2.0, 0.9, 1.4, 2.2, 0.7, 1.1, 1.8, 1.25,
].map((v, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (13 - i));
  return { label: i === 13 ? '今天' : `${d.getMonth() + 1}/${d.getDate()}`, v };
});

export const SAMPLE_KB_STATS = [['1,247', '篇笔记'], ['3,892', '条双链'], ['5', '个主题域']];

export const SAMPLE_POSTS = [
  { date: '2026.05', title: '从 Codex 源码看 Slash 命令的交互设计', tag: '源码拆解', href: '#' },
  { date: '2026.04', title: 'AI PM 的第一性原理：上下文管理', tag: '产品方法', href: '#' },
  { date: '2026.03', title: 'RAG 已死？知识库产品的三条路线', tag: '技术判断', href: '#' },
  { date: '2026.02', title: '用 Claude Code 重建我的个人工作流', tag: '工作流', href: '#' },
];

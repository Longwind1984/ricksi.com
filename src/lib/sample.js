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
/* 设计系统 v2 · 图谱 12 色等明度色环 oklch(0.78 0.11 h)，h 每 30° 一档（hex 预换算供 SVG/three.js）。
   数组序按「相邻 cluster 非邻接取档」展开：240/180/90/300/30 起，后续保持 ≥90° 跳距，任意两色并置和谐 */
export const GRAPH_PALETTE = ['#71C1F7', '#59CEBA', '#D3B460', '#C2A7F4', '#F69C8D', '#AEC26F', '#DF9ED9', '#51CADE', '#EBA66D', '#9CB4FE', '#82CB92', '#F199B4'];

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
  cumulative: '142.0M',
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

/* 阅读样例（微信读书 cookie 未配置时的回退；cover null → 渐变占位封面） */
export const SAMPLE_READING = {
  sample: true,
  stats: { total: 36, finished: 21, reading: 3, notes: 412 },
  current: {
    id: 's1',
    title: '思考，快与慢',
    author: '丹尼尔·卡尼曼',
    cover: null,
    progress: 62,
    notes: 38,
    finished: false,
  },
  shelf: [
    { id: 's1', title: '思考，快与慢', author: '丹尼尔·卡尼曼', cover: null, progress: 62, finished: false },
    { id: 's2', title: '创新者的窘境', author: '克莱顿·克里斯坦森', cover: null, progress: 100, finished: true },
    { id: 's3', title: '人月神话', author: '弗雷德里克·布鲁克斯', cover: null, progress: 100, finished: true },
    { id: 's4', title: '设计中的设计', author: '原研哉', cover: null, progress: 34, finished: false },
    { id: 's5', title: '失控', author: '凯文·凯利', cover: null, progress: 100, finished: true },
    { id: 's6', title: '禅与摩托车维修艺术', author: '罗伯特·波西格', cover: null, progress: 18, finished: false },
  ],
};

export const SAMPLE_POSTS = [
  { date: '2026.05', title: '从 Codex 源码看 Slash 命令的交互设计', tag: '源码拆解', href: '#' },
  { date: '2026.04', title: 'AI PM 的第一性原理：上下文管理', tag: '产品方法', href: '#' },
  { date: '2026.03', title: 'RAG 已死？知识库产品的三条路线', tag: '技术判断', href: '#' },
  { date: '2026.02', title: '用 Claude Code 重建我的个人工作流', tag: '工作流', href: '#' },
];

/* 前沿追踪样例（data/frontier.json 缺失时的回退；与采集产物逐字段同构） */
export const SAMPLE_FRONTIER = {
  sample: true,
  generated_at: null,
  domains: { lab: '前沿实验室', engineering: '工程与教育', research: '研究与评测', writing: '综述与观察' },
  people: [
    { slug: 'karpathy', name: 'Andrej Karpathy', domain: 'engineering', title: 'Eureka Labs 创始人，前 Tesla AI / OpenAI', bio: '把复杂 AI 知识压缩成人类可学习接口的教学型思想者。' },
    { slug: 'dario-amodei', name: 'Dario Amodei', domain: 'lab', title: 'Anthropic CEO', bio: '把模型能力、安全叙事和政策表态放在同一张桌子上的公司型思想者。' },
    { slug: 'lilian-weng', name: 'Lilian Weng', domain: 'writing', title: 'Thinking Machines 联创', bio: '长文综述的标杆。' },
    { slug: 'francois-chollet', name: 'François Chollet', domain: 'research', title: 'Keras 作者，ARC-AGI 设计者', bio: '通过重新定义「什么才算智能」来校准 AGI 讨论的概念边界。' },
  ],
  topics: [{ slug: 'deepmind', name: 'DeepMind Blog', domain: 'lab' }],
  stats: { totalEntries: 5, totalAllTime: 5, lastRun: { at: null, fetched: 0, processed: 0, added: 0, llmFailed: 0, rateLimited: false, skippedSources: [] } },
  entries: [
    { id: 'sf1', date: '2026-06-11', person: 'karpathy', topicSource: null, sourceName: 'X @karpathy', sourceType: 'x', contentType: 'statement', titleZh: 'Karpathy：上下文窗口是新的程序内存', titleOriginal: 'Context windows are the new program memory', verdict: '把 LLM 应用架构类比操作系统，是理解 agent 工程的关键心智模型。', summaryZh: '样例摘要：Karpathy 在一条长推中把上下文窗口类比为程序内存，提出 agent 框架的本质是新的操作系统调度问题。', tags: ['上下文工程', 'Agent'], url: '#', excerpt: 'Context windows are the new program memory…', importance: 4, insufficientContext: false },
    { id: 'sf2', date: '2026-06-11', person: 'dario-amodei', topicSource: null, sourceName: 'darioamodei.com', sourceType: 'rss', contentType: 'authored', titleZh: 'Dario 新文：AI 指数时代的政策窗口', titleOriginal: 'Policy on the AI Exponential', verdict: '前沿实验室 CEO 直接给出政策时间表判断，罕见且具体。', summaryZh: '样例摘要：Dario 论证 AI 能力的指数曲线已超出政策机构的响应速度，提出三项可立即执行的制度准备。', tags: ['AI 政策', '安全'], url: '#', excerpt: 'Sample excerpt…', importance: 5, insufficientContext: false },
    { id: 'sf3', date: '2026-06-10', person: 'lilian-weng', topicSource: null, sourceName: 'lilianweng.github.io', sourceType: 'rss', contentType: 'authored', titleZh: 'Lil\'Log 新篇：Agent 记忆机制综述', titleOriginal: 'Agent Memory', verdict: '又一篇可以直接当 reading list 用的领域地图。', summaryZh: '样例摘要：从工作记忆到情景记忆的工程实现，系统梳理 agent 记忆的设计空间与权衡。', tags: ['记忆', 'Agent', '综述'], url: '#', excerpt: 'Sample excerpt…', importance: 4, insufficientContext: false },
    { id: 'sf4', date: '2026-06-10', person: 'francois-chollet', topicSource: null, sourceName: 'X @fchollet', sourceType: 'x', contentType: 'statement', titleZh: 'Chollet：基准分数不等于智能', titleOriginal: 'Benchmark scores are not intelligence', verdict: '对当前评测军备竞赛的持续校准，ARC 路线的一贯立场。', summaryZh: '样例摘要：Chollet 重申流体智能与技能习得效率的区分，批评把基准分数当作智能本身的行业惯性。', tags: ['评测', 'AGI'], url: '#', excerpt: 'Sample excerpt…', importance: 3, insufficientContext: false },
    { id: 'sf5', date: '2026-06-09', person: null, topicSource: 'deepmind', sourceName: 'deepmind.google', sourceType: 'rss', contentType: 'action', titleZh: 'DeepMind 开源文本扩散模型', titleOriginal: 'DiffusionGemma', verdict: '文本扩散路线首次进入可用开源序列，值得跟踪后续生态。', summaryZh: '样例摘要：DeepMind 发布 DiffusionGemma，推理速度较自回归同级模型显著提升。', tags: ['扩散模型', '开源'], url: '#', excerpt: 'Sample excerpt…', importance: 4, insufficientContext: false },
  ],
};

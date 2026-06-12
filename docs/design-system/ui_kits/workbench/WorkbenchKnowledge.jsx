import React from 'react';
import { GlassSection } from '../../components/glass/GlassSection.jsx';
import { SectionHeader } from '../../components/content/SectionHeader.jsx';
import { SearchInput } from '../../components/core/SearchInput.jsx';

/* Sample knowledge graph — port of the site's seeded generator (src/lib/sample.js, seed 11).
   Cluster colors: OKLCH 等明度 12 色环,非邻接取 5 档 (h = 240/180/90/300/30). */
const PALETTE = ['oklch(0.78 0.11 240)', 'oklch(0.78 0.11 180)', 'oklch(0.78 0.11 90)', 'oklch(0.78 0.11 300)', 'oklch(0.78 0.11 30)'];

function rng(seed) {
  let t = seed;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleGraph(width = 880, height = 470, seed = 11) {
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
  return { nodes, edges, clusters: defs.map((d, i) => ({ name: d.name, count: d.n + 1, color: PALETTE[i] })) };
}

const G = sampleGraph();

function GraphSVG({ focus }) {
  const dim = (c) => focus != null && focus !== c;
  return (
    <svg viewBox="0 0 880 470" role="img" aria-label="知识库样例图谱">
      {G.edges.map(([a, b, w], i) => {
        const na = G.nodes[a], nb = G.nodes[b];
        const off = dim(na.cluster) && dim(nb.cluster);
        return (
          <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
            stroke="rgba(255,255,255,0.16)" strokeWidth={w} opacity={off ? 0.25 : 1} />
        );
      })}
      {G.nodes.map((n, i) => (
        <g key={i} opacity={dim(n.cluster) ? 0.22 : 1} style={{ transition: 'opacity .25s' }}>
          <circle cx={n.x} cy={n.y} r={n.r} fill={PALETTE[n.cluster]} opacity={n.hub ? 0.95 : 0.8} />
          {n.hub ? <circle cx={n.x} cy={n.y} r={n.r + 5} fill="none" stroke={PALETTE[n.cluster]} strokeOpacity="0.3" /> : null}
          {n.label ? (
            <text x={n.x} y={n.y - n.r - 7} textAnchor="middle"
              fill={n.hub ? 'rgba(240,245,252,0.9)' : 'rgba(240,245,252,0.55)'}
              fontSize={n.hub ? 13 : 10.5} fontFamily="var(--font-mono)">{n.label}</text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

export function WorkbenchKnowledge() {
  const [focus, setFocus] = React.useState(null);
  const [q, setQ] = React.useState('');
  const stats = [['1,247', '篇笔记'], ['3,892', '条双链'], ['5', '个主题域']];
  return (
    <GlassSection id="knowledge" data-screen-label="03 知识库图谱">
      <SectionHeader no="03" title="知识库图谱" en="KNOWLEDGE GRAPH" desc="与 Claude 共建的系统化知识工程——方法公开、来源标注" />
      <div className="kg-grid">
        <div className="kg-paper">
          <GraphSVG focus={focus} />
        </div>
        <div className="kg-side">
          <div className="kg-stats">
            {stats.map(([v, k]) => (
              <div className="kg-stat" key={k}><span className="kg-stat-v">{v}</span><span className="kg-stat-k">{k}</span></div>
            ))}
          </div>
          <SearchInput placeholder="搜索 1,247 篇笔记…" value={q} onChange={(e) => setQ(e.target.value)} hint={q ? '样例' : undefined} style={{ marginBottom: 18 }} />
          <div className="kg-legend">
            {G.clusters.map((c, i) => (
              <button
                key={c.name}
                className={'kg-leg-item' + (focus === i ? ' active' : '')}
                onMouseEnter={() => setFocus(i)}
                onMouseLeave={() => setFocus(null)}
                onClick={() => setFocus(focus === i ? null : i)}
              >
                <span className="kg-dot" style={{ background: c.color }}></span>
                {c.name}
                <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{c.count}</span>
              </button>
            ))}
          </div>
          <p className="kg-note">悬停主题域可高亮对应节点。样例数据——完整 Obsidian 库较大，部署版按需接入。</p>
        </div>
      </div>
    </GlassSection>
  );
}

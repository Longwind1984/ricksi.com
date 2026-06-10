// 首页行为：占位链接 / 滚动浮现 / 实时 token 跳动 / 知识图谱渲染
// 数据从 #site-data JSON 读取（构建时注入；real 字段缺失即回退样例）
import { sampleGraph, GRAPH_PALETTE, SAMPLE_CLUSTERS } from '../lib/sample.js';

const siteData = (() => {
  try {
    return JSON.parse(document.getElementById('site-data').textContent);
  } catch {
    return {};
  }
})();

/* ---------- 占位链接 ---------- */
document.querySelectorAll('a.noop').forEach((a) => {
  a.addEventListener('click', (e) => e.preventDefault());
});

/* ---------- 滚动浮现（带 IO 失效兜底） ---------- */
if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
  document.querySelectorAll('.reveal').forEach((el) => {
    let revealed = false;
    const show = () => {
      if (revealed) return;
      revealed = true;
      el.classList.add('reveal-in');
      el.classList.remove('reveal-pending');
    };
    el.classList.add('reveal-pending');
    let ob = null;
    try {
      ob = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) { show(); ob.disconnect(); }
      }, { threshold: 0.08 });
      ob.observe(el);
    } catch {
      show();
    }
    setTimeout(show, 900);
  });
}

/* ---------- 实时 Token 数字（锚定最近快照继续跳动） ---------- */
const liveEl = document.getElementById('live-tokens');
if (liveEl) {
  let n = siteData.tokenBase || 1247832;
  setInterval(() => {
    n += Math.floor(Math.random() * 240) + 40;
    liveEl.textContent = n.toLocaleString();
  }, 1600);
}

/* ---------- 知识图谱 ----------
   真实 graph.json 存在 → 由 graph-view.js 接管（力导向交互版，任务 5）
   缺失 → 设计稿同款程序生成样例图 */
const kgPaper = document.getElementById('kg-paper');
if (kgPaper && !siteData.graph) {
  renderSampleGraph(kgPaper);
}

function renderSampleGraph(host) {
  const W = 880, H = 470;
  const { nodes, edges } = sampleGraph(W, H, 11);
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.style.display = 'block';

  let hov = undefined;
  const lineEls = [], circleEls = [], textEls = [];

  edges.forEach(([ai, bi, w]) => {
    const a = nodes[ai], b = nodes[bi];
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
    line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
    line.setAttribute('stroke', '#8FA8CC');
    line.setAttribute('stroke-width', w);
    line.style.transition = 'opacity .25s';
    svg.appendChild(line);
    lineEls.push({ el: line, a, b });
  });
  nodes.forEach((n) => {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', n.x); c.setAttribute('cy', n.y);
    c.setAttribute('fill', GRAPH_PALETTE[n.cluster % GRAPH_PALETTE.length]);
    c.style.transition = 'opacity .25s';
    c.style.cursor = 'default';
    c.addEventListener('mouseenter', () => setHov(n.cluster));
    c.addEventListener('mouseleave', () => setHov(null));
    svg.appendChild(c);
    circleEls.push({ el: c, n });
  });
  nodes.forEach((n) => {
    if (!n.label) return;
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', n.x); t.setAttribute('y', n.y - n.r - 7);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('font-size', n.hub ? 13 : 10.5);
    t.setAttribute('font-weight', n.hub ? 700 : 400);
    t.setAttribute('fill', n.hub ? '#FFFFFF' : '#A9BAD6');
    t.style.transition = 'opacity .25s';
    t.style.fontFamily = "'PingFang SC', 'Noto Sans SC', sans-serif";
    t.textContent = n.label;
    svg.appendChild(t);
    textEls.push({ el: t, n });
  });
  host.appendChild(svg);

  const legend = document.getElementById('kg-legend');
  const legEls = [];
  if (legend) {
    SAMPLE_CLUSTERS.forEach((name, i) => {
      const item = document.createElement('div');
      item.className = 'kg-leg-item';
      const dot = document.createElement('span');
      dot.className = 'kg-dot';
      dot.style.background = GRAPH_PALETTE[i];
      item.appendChild(dot);
      item.appendChild(document.createTextNode(name));
      item.addEventListener('mouseenter', () => setHov(i));
      item.addEventListener('mouseleave', () => setHov(null));
      legend.appendChild(item);
      legEls.push(item);
    });
  }

  function setHov(h) {
    if (h === hov) return;
    hov = h;
    lineEls.forEach((o) => {
      const dim = hov !== null && !(o.a.cluster === hov || o.b.cluster === hov);
      o.el.setAttribute('opacity', dim ? 0.08 : o.a.hub && o.b.hub ? 0.5 : 0.32);
    });
    circleEls.forEach(({ el, n }) => {
      const dim = hov !== null && n.cluster !== hov;
      el.setAttribute('r', n.hub ? n.r + (hov === n.cluster ? 2 : 0) : n.r);
      el.setAttribute('opacity', dim ? 0.12 : n.hub ? 1 : 0.78);
    });
    textEls.forEach(({ el, n }) => {
      el.setAttribute('opacity', hov !== null && n.cluster !== hov ? 0.15 : 1);
    });
    legEls.forEach((el, i) => el.classList.toggle('active', hov === i));
  }
  setHov(null);
}

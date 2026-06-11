// 首页行为：占位链接 / 滚动浮现 / 实时 token 跳动 / 知识图谱渲染
// 数据从 #site-data JSON 读取（构建时注入；real 字段缺失即回退样例）
import { sampleGraph, GRAPH_PALETTE, SAMPLE_CLUSTERS } from '../lib/sample.js';
import { renderGraph } from './graph-view.js';

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

/* ---------- 项目展开 ---------- */
const projExpand = document.getElementById('proj-expand');
if (projExpand) {
  projExpand.addEventListener('click', () => {
    const extra = document.getElementById('proj-extra');
    const open = extra.classList.toggle('open');
    projExpand.setAttribute('aria-expanded', String(open));
    projExpand.textContent = open ? '收起 ↑' : `展开全部 ${projExpand.dataset.total} 个项目 ↓`;
  });
}

/* ---------- 趋势图悬浮明细（点位 data-tip） ---------- */
const tcPts = document.querySelectorAll('.tc-pt[data-tip]');
if (tcPts.length) {
  const tcTip = document.createElement('div');
  tcTip.className = 'hm-tip';
  document.body.appendChild(tcTip);
  tcPts.forEach((pt) => {
    const show = () => {
      tcTip.textContent = pt.dataset.tip;
      const r = pt.getBoundingClientRect();
      const tw = tcTip.offsetWidth || 150;
      tcTip.style.left = Math.min(window.innerWidth - tw - 8, Math.max(8, r.left + r.width / 2 - tw / 2)) + 'px';
      tcTip.style.top = r.top - (tcTip.offsetHeight || 30) - 8 + window.scrollY + 'px';
      tcTip.classList.add('show');
    };
    pt.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(); });
    pt.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') show(); });
    pt.addEventListener('pointerleave', () => tcTip.classList.remove('show'));
  });
}

/* ---------- 热力图 v2：悬停明细 + 维度切换（仅真实数据） ---------- */
if (siteData.weeks) {
  const weeks = siteData.weeks;
  const heatmap = document.getElementById('heatmap');
  const cells = heatmap.querySelectorAll('.hm-cell[data-w]');

  // 共享悬浮提示
  const tip = document.createElement('div');
  tip.className = 'hm-tip';
  document.body.appendChild(tip);

  const DIM_LABEL = { git: '代码提交', notes: '新笔记', ai: 'AI 消息', gh: 'GitHub 贡献' };
  function tipText(cell) {
    const [y, m, d] = cell.d.split('-');
    const parts = [];
    const b = cell.b || {};
    for (const k of ['git', 'notes', 'ai', 'gh']) {
      if (b[k]) parts.push(`${b[k]} ${DIM_LABEL[k]}`);
    }
    return `${+m}月${+d}日 · ${parts.length ? parts.join(' + ') : '无活动'}`;
  }

  // pointer 事件：鼠标悬停与触屏点按同路径；定位实测 tip 尺寸（无魔法数）
  function showTip(el, cell) {
    tip.textContent = tipText(cell);
    const r = el.getBoundingClientRect();
    const tw = tip.offsetWidth || 160;
    const th = tip.offsetHeight || 30;
    tip.style.left = Math.min(window.innerWidth - tw - 8, Math.max(8, r.left + r.width / 2 - tw / 2)) + 'px';
    tip.style.top = r.top - th - 8 + window.scrollY + 'px';
    tip.classList.add('show');
  }
  cells.forEach((el) => {
    const cell = weeks[+el.dataset.w][+el.dataset.d];
    if (cell.future) return;
    el.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') showTip(el, cell);
    });
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') showTip(el, cell);
    });
    el.addEventListener('pointerleave', () => tip.classList.remove('show'));
  });
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.hm-cell')) tip.classList.remove('show');
  });

  // 维度切换：按所选维度重算等级（非零值分位数阈值）
  const dimButtons = document.querySelectorAll('.hm-dim');
  function valueOf(cell, dim) {
    if (!cell.b) return 0;
    if (dim === 'all') return (cell.b.git || 0) + (cell.b.notes || 0) + (cell.b.ai || 0) + (cell.b.gh || 0);
    return cell.b[dim] || 0;
  }
  function applyDim(dim) {
    const values = [];
    weeks.flat().forEach((c) => {
      if (!c.future) {
        const v = valueOf(c, dim);
        if (v > 0) values.push(v);
      }
    });
    values.sort((a, b) => a - b);
    const q = (p) => (values.length ? values[Math.min(values.length - 1, Math.floor(p * values.length))] : 1);
    const t1 = q(0.35), t2 = q(0.7), t3 = q(0.92);
    cells.forEach((el) => {
      const cell = weeks[+el.dataset.w][+el.dataset.d];
      const v = cell.future ? 0 : valueOf(cell, dim);
      const l = v === 0 ? 0 : v <= t1 ? 1 : v <= t2 ? 2 : 3;
      el.className = 'hm-cell l' + l + (cell.future ? ' future' : '');
    });
  }
  dimButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      dimButtons.forEach((b) => b.classList.toggle('active', b === btn));
      applyDim(btn.dataset.dim);
    });
  });
}

/* ---------- 知识图谱 ----------
   真实 graph.json → 力导向交互图（graph-view.js）+ 真实主题域图例 + 搜索
   缺失 → 设计稿同款程序生成样例图 */
const kgPaper = document.getElementById('kg-paper');
if (kgPaper && siteData.graph) {
  const graph = siteData.graph;
  const legend = document.getElementById('kg-legend');
  const legEls = [];

  const ctl = renderGraph(kgPaper, graph, {
    mode: 'full',
    onStateChange(state) {
      legEls.forEach((el, j) =>
        el.classList.toggle('active', state.type === 'cluster' && state.value === graph.clusters[j].id)
      );
    },
  });

  // 图例 = 真按钮：hover 预览高亮；click/Enter 锁定（触屏与键盘的等价路径）
  let lockedCluster = null;
  graph.clusters.forEach((c) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'kg-leg-item';
    item.setAttribute('aria-pressed', 'false');
    const dot = document.createElement('span');
    dot.className = 'kg-dot';
    dot.style.background = GRAPH_PALETTE[c.id % GRAPH_PALETTE.length];
    item.appendChild(dot);
    item.appendChild(document.createTextNode(`${c.name} · ${c.count}`));
    item.addEventListener('mouseenter', () => { if (lockedCluster === null) ctl.highlightCluster(c.id); });
    item.addEventListener('mouseleave', () => { if (lockedCluster === null) ctl.highlightCluster(null); });
    item.addEventListener('focus', () => { if (lockedCluster === null) ctl.highlightCluster(c.id); });
    item.addEventListener('blur', () => { if (lockedCluster === null) ctl.highlightCluster(null); });
    item.addEventListener('click', () => {
      lockedCluster = lockedCluster === c.id ? null : c.id;
      ctl.highlightCluster(lockedCluster);
      legEls.forEach((el, j) => {
        el.classList.toggle('locked', graph.clusters[j].id === lockedCluster);
        el.setAttribute('aria-pressed', String(graph.clusters[j].id === lockedCluster));
      });
    });
    legend.appendChild(item);
    legEls.push(item);
  });

  const input = document.getElementById('kg-search');
  const hint = document.getElementById('kg-search-hint');
  input?.addEventListener('input', () => {
    const n = ctl.search(input.value);
    if (hint) hint.textContent = input.value.trim() ? `${n} 篇匹配` : '';
  });
} else if (kgPaper) {
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

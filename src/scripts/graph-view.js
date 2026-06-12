// 知识图谱 v2：d3-force 力导向 + 缩放平移（含触屏）+ 邻域高亮 + 点击进笔记
// 超越 Obsidian Graph View 之处：节点可点击直达已发布笔记页、按主题域锚定布局、
// 搜索高亮、触屏两段式交互（先选中看卡片，再进入）。
// mode: 'full'（首页大图）| 'mini'（笔记页局部图，focus 指定中心笔记）
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCollide,
  forceX,
  forceY,
} from 'd3-force';
import { GRAPH_PALETTE } from '../lib/sample.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};

export function renderGraph(host, graph, opts = {}) {
  const mode = opts.mode || 'full';
  // viewBox 跟随容器实际宽高比（kg-grid 会把画布拉伸到与侧栏等高），模拟空间用满整卡
  const rect = host.getBoundingClientRect();
  const W = opts.width || (mode === 'mini' ? 640 : 880);
  const aspect =
    rect.width > 40 && rect.height > 40
      ? Math.min(1.4, Math.max(0.35, rect.height / rect.width))
      : mode === 'mini'
        ? 0.5
        : 470 / 880;
  const H = opts.height || Math.round(W * aspect);

  /* ---------- 数据准备 ---------- */
  let nodes = graph.nodes.map((n) => ({ ...n }));
  let edges = graph.edges;

  if (mode === 'mini' && opts.focusSlug) {
    // 局部图：焦点 + 1 跳邻居（不足 8 个则扩到 2 跳）
    const focus = nodes.find((n) => n.slug === opts.focusSlug);
    if (focus) {
      const keep = new Set([focus.id]);
      const grow = () => {
        for (const [a, b] of edges) {
          if (keep.has(a)) keep.add(b);
          else if (keep.has(b)) keep.add(a);
        }
      };
      grow();
      if (keep.size < 8) grow();
      nodes = nodes.filter((n) => keep.has(n.id));
      edges = edges.filter(([a, b]) => keep.has(a) && keep.has(b));
    }
  }

  const idx = new Map(nodes.map((n, i) => [n.id, i]));
  const links = edges
    .filter(([a, b]) => idx.has(a) && idx.has(b))
    .map(([a, b]) => ({ source: idx.get(a), target: idx.get(b) }));

  // 邻接表（高亮一跳邻域用）
  const adj = nodes.map(() => new Set());
  links.forEach((l, li) => {
    adj[l.source].add(l.target);
    adj[l.target].add(l.source);
  });

  const radius = (n) => Math.min(14, 2.6 + Math.sqrt(n.deg || 0) * 1.15);
  const color = (n) => GRAPH_PALETTE[n.cluster % GRAPH_PALETTE.length];
  const degSorted = [...nodes].sort((a, b) => (b.deg || 0) - (a.deg || 0));
  const labelThreshold = mode === 'mini' ? 0 : (degSorted[Math.min(11, degSorted.length - 1)]?.deg ?? 0);

  /* ---------- 主题域锚点（椭圆均匀分布，布局按域聚拢） ---------- */
  const clusterIds = [...new Set(nodes.map((n) => n.cluster))];
  const anchor = {};
  clusterIds.forEach((cid, i) => {
    const a = (i / clusterIds.length) * Math.PI * 2 - Math.PI / 2;
    anchor[cid] = { x: W / 2 + Math.cos(a) * W * 0.3, y: H / 2 + Math.sin(a) * H * 0.3 };
  });

  /* ---------- 力学模拟 ---------- */
  nodes.forEach((n) => {
    const a = anchor[n.cluster];
    n.x = a.x + (Math.random() - 0.5) * 60;
    n.y = a.y + (Math.random() - 0.5) * 60;
  });
  // 超级索引 hub（度 70-80）会把全图拉成一团：与 hub 相连的边减弱，
  // 让卫星留在主题域锚点附近、hub 悬浮居中 —— 接近 Obsidian 的观感
  const degOf = (n) => Math.max(1, n.deg || 1);
  const sim = forceSimulation(nodes)
    .force(
      'link',
      forceLink(links)
        .distance(mode === 'mini' ? 46 : 38)
        .strength((l) => 0.6 / Math.min(degOf(l.source), degOf(l.target)) ** 0.6)
    )
    .force('charge', forceManyBody().strength(mode === 'mini' ? -130 : -72))
    .force('collide', forceCollide((n) => radius(n) + 2.5))
    // 无双链的孤立节点会被斥力甩到边缘：给它们更强的主题域锚定
    .force('ax', forceX((n) => anchor[n.cluster].x).strength((n) => (degOf(n) === 1 && !n.deg ? 0.3 : 0.09)))
    .force('ay', forceY((n) => anchor[n.cluster].y).strength((n) => (degOf(n) === 1 && !n.deg ? 0.34 : 0.12)));

  /* ---------- SVG ---------- */
  host.innerHTML = '';
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', preserveAspectRatio: 'xMidYMid meet' });
  svg.style.display = 'block';
  svg.style.height = '100%';
  svg.style.touchAction = 'none';
  svg.style.cursor = 'grab';
  const layer = el('g');
  svg.appendChild(layer);
  host.appendChild(svg);

  const lineEls = links.map((l) => {
    const ln = el('line', { stroke: '#8FA8CC', 'stroke-width': 0.7, opacity: 0.3 });
    ln.style.transition = 'opacity .2s';
    layer.appendChild(ln);
    return ln;
  });
  const circleEls = nodes.map((n) => {
    const c = el('circle', { r: radius(n), fill: color(n), opacity: 0.85 });
    if (opts.focusSlug && n.slug === opts.focusSlug) {
      c.setAttribute('stroke', '#FFFFFF');
      c.setAttribute('stroke-width', 1.8);
      c.setAttribute('r', radius(n) + 1.5);
    }
    c.style.cursor = 'pointer';
    c.style.transition = 'opacity .2s';
    layer.appendChild(c);
    return c;
  });
  const textEls = nodes.map((n) => {
    const t = el('text', {
      'text-anchor': 'middle',
      'font-size': n.deg >= labelThreshold ? 11.5 : 10,
      'font-weight': n.deg >= labelThreshold ? 600 : 400,
      fill: '#D7E3F4',
      'paint-order': 'stroke',
      stroke: 'rgba(6,12,26,0.85)',
      'stroke-width': 3,
    });
    t.textContent = n.title;
    t.style.transition = 'opacity .2s';
    t.style.pointerEvents = 'none';
    t.style.fontFamily = "'PingFang SC', 'Noto Sans SC', sans-serif";
    layer.appendChild(t);
    return t;
  });

  function tick() {
    links.forEach((l, i) => {
      lineEls[i].setAttribute('x1', l.source.x);
      lineEls[i].setAttribute('y1', l.source.y);
      lineEls[i].setAttribute('x2', l.target.x);
      lineEls[i].setAttribute('y2', l.target.y);
    });
    nodes.forEach((n, i) => {
      circleEls[i].setAttribute('cx', n.x);
      circleEls[i].setAttribute('cy', n.y);
      textEls[i].setAttribute('x', n.x);
      textEls[i].setAttribute('y', n.y - radius(n) - 5);
    });
  }
  /* 自动取景：模拟冷却期间相机持续跟随布局；用户手动缩放/平移后不再打扰 */
  let userTouchedView = false;
  let followNode = null; // focusNode 后冷却期内相机锁定该节点（布局还在动时不漂移）
  // view 必须先于 fitToView 的首次同步调用声明（静态布局路径在构造期就取景，后置声明会踩 TDZ）
  let view = { x: 0, y: 0, k: 1 };
  const applyView = () => layer.setAttribute('transform', `translate(${view.x},${view.y}) scale(${view.k})`);
  function fitToView() {
    if (userTouchedView || !nodes.length) return;
    // 用 4%-96% 分位包围盒取景，离群孤点不至于把主体挤到角落
    const xs = nodes.map((n) => n.x).sort((a, b) => a - b);
    const ys = nodes.map((n) => n.y).sort((a, b) => a - b);
    const lo = Math.floor(nodes.length * 0.04), hi = Math.ceil(nodes.length * 0.96) - 1;
    const x0 = xs[lo], x1 = xs[hi], y0 = ys[lo], y1 = ys[hi];
    const pad = 40;
    const k = Math.min(2.6, Math.min(W / (x1 - x0 + pad * 2), H / (y1 - y0 + pad * 2)));
    view.k = k;
    view.x = W / 2 - ((x0 + x1) / 2) * k;
    view.y = H / 2 - ((y0 + y1) / 2) * k;
    applyView();
  }
  // Reduce Motion / 大图（>300 节点逐帧写 SVG 属性太贵）：跳过收敛动画，同步演算稳态直接呈现
  let readyResolve;
  const ready = new Promise((r) => (readyResolve = r));
  const staticLayout =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches || (mode === 'full' && nodes.length > 300);
  if (staticLayout) {
    sim.stop();
    sim.tick(220);
    tick();
    fitToView();
    readyResolve();
  } else {
    sim.on('tick', () => {
      tick();
      if (followNode !== null) {
        view.x = W / 2 - nodes[followNode].x * view.k;
        view.y = H / 2 - nodes[followNode].y * view.k;
        applyView();
      } else {
        fitToView();
      }
    });
    sim.on('end', () => {
      if (followNode === null) fitToView();
      readyResolve();
    });
  }

  /* ---------- 高亮状态机：hover 邻域 / 主题域 / 搜索 三类互斥 ---------- */
  let state = { type: null, value: null };
  function applyState() {
    const litNode = (i) => {
      if (state.type === 'node') return i === state.value || adj[state.value].has(i);
      if (state.type === 'cluster') return nodes[i].cluster === state.value;
      if (state.type === 'search') return state.value.has(i);
      return true;
    };
    nodes.forEach((n, i) => {
      const lit = litNode(i);
      circleEls[i].setAttribute('opacity', lit ? (state.type ? 1 : 0.85) : 0.1);
      // 选中/悬停焦点节点描边（焦点笔记的固定描边在创建时设置，不覆盖）
      if (!(opts.focusSlug && n.slug === opts.focusSlug)) {
        if (state.type === 'node' && i === state.value) {
          circleEls[i].setAttribute('stroke', 'rgba(255,255,255,0.85)');
          circleEls[i].setAttribute('stroke-width', '1.4');
        } else {
          circleEls[i].removeAttribute('stroke');
          circleEls[i].removeAttribute('stroke-width');
        }
      }
      const showLabel =
        (state.type === 'node' && lit) ||
        (state.type === 'search' && lit && state.value.size <= 25) ||
        (n.deg >= labelThreshold && (state.type === null || lit)) ||
        mode === 'mini';
      textEls[i].setAttribute('opacity', showLabel ? 1 : 0);
    });
    links.forEach((l, i) => {
      const lit =
        state.type === 'node'
          ? l.source.index === state.value || l.target.index === state.value
          : litNode(l.source.index) && litNode(l.target.index);
      lineEls[i].setAttribute('opacity', lit ? (state.type ? 0.65 : 0.3) : 0.04);
      lineEls[i].setAttribute('stroke-width', state.type === 'node' && lit ? 1.2 : 0.7);
    });
    opts.onStateChange?.(state);
  }
  applyState();

  /* ---------- 缩放 / 平移 / 节点拖拽 / 点击（含触屏两段式） ---------- */
  const toLocal = (evt) => {
    const r = svg.getBoundingClientRect();
    const sx = ((evt.clientX - r.left) / r.width) * W;
    const sy = ((evt.clientY - r.top) / r.height) * H;
    return { x: (sx - view.x) / view.k, y: (sy - view.y) / view.k, sx, sy };
  };

  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    userTouchedView = true;
    const { sx, sy } = toLocal(e);
    const k2 = Math.min(6, Math.max(0.4, view.k * Math.exp(-e.deltaY * 0.0022)));
    view.x = sx - ((sx - view.x) / view.k) * k2;
    view.y = sy - ((sy - view.y) / view.k) * k2;
    view.k = k2;
    applyView();
  }, { passive: false });

  const pointers = new Map();
  let dragNode = null, panStart = null, pinchStart = null, moved = false;

  svg.addEventListener('pointerdown', (e) => {
    svg.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = false;
    if (pointers.size === 2) {
      const [p1, p2] = [...pointers.values()];
      pinchStart = { d: Math.hypot(p1.x - p2.x, p1.y - p2.y), k: view.k };
      userTouchedView = true;
      followNode = null;
      dragNode = null; panStart = null;
      return;
    }
    const ci = circleEls.indexOf(e.target);
    if (ci >= 0) {
      dragNode = nodes[ci];
      userTouchedView = true;
      followNode = null; // 拖拽节点时相机不再自动跟随
      sim.alphaTarget(0.25).restart();
    } else {
      panStart = { px: e.clientX, py: e.clientY, vx: view.x, vy: view.y };
      userTouchedView = true;
      followNode = null;
      svg.style.cursor = 'grabbing';
    }
  });
  svg.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (Math.abs(e.movementX) + Math.abs(e.movementY) > 1) moved = true;
    if (pointers.size === 2 && pinchStart) {
      const [p1, p2] = [...pointers.values()];
      const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      view.k = Math.min(6, Math.max(0.4, pinchStart.k * (d / pinchStart.d)));
      applyView();
      return;
    }
    if (dragNode) {
      const { x, y } = toLocal(e);
      dragNode.fx = x;
      dragNode.fy = y;
    } else if (panStart) {
      const r = svg.getBoundingClientRect();
      view.x = panStart.vx + ((e.clientX - panStart.px) / r.width) * W;
      view.y = panStart.vy + ((e.clientY - panStart.py) / r.height) * H;
      applyView();
    }
  });
  svg.addEventListener('pointerup', (e) => {
    pointers.delete(e.pointerId);
    pinchStart = null;
    svg.style.cursor = 'grab';
    if (dragNode) {
      const n = dragNode;
      dragNode = null;
      sim.alphaTarget(0);
      n.fx = null;
      n.fy = null;
      if (!moved) handleTap(n, e);
    } else if (panStart) {
      panStart = null;
    }
  });
  svg.addEventListener('pointercancel', (e) => {
    pointers.delete(e.pointerId);
    dragNode = null; panStart = null; pinchStart = null;
    sim.alphaTarget(0);
  });

  /* 桌面：hover 高亮邻域；点击进入笔记。触屏：第一次 tap 选中出卡片，再点卡片按钮进入 */
  circleEls.forEach((c, i) => {
    c.addEventListener('mouseenter', () => {
      if (matchMedia('(hover: hover)').matches) {
        state = { type: 'node', value: i };
        applyState();
      }
    });
    c.addEventListener('mouseleave', () => {
      if (state.type === 'node') {
        state = { type: null, value: null };
        applyState();
      }
    });
  });

  let card = null;
  function dismissCard() {
    card?.remove();
    card = null;
  }
  function handleTap(n, evt) {
    // explore 模式：任何指针类型都交给页面的信息面板（不弹内置卡）
    if (opts.onSelect) {
      state = { type: 'node', value: nodes.indexOf(n) };
      applyState();
      opts.onSelect(n);
      return;
    }
    const isTouch = evt.pointerType === 'touch';
    if (!isTouch) {
      navigate(n);
      return;
    }
    state = { type: 'node', value: nodes.indexOf(n) };
    applyState();
    dismissCard();
    card = document.createElement('div');
    card.className = 'kg-node-card';
    card.innerHTML = `<div class="kg-node-card-t"></div><div class="kg-node-card-m mono"></div>`;
    card.querySelector('.kg-node-card-t').textContent = n.title;
    card.querySelector('.kg-node-card-m').textContent = `${n.deg} 条双链`;
    const btn = document.createElement('button');
    btn.className = 'kg-node-card-btn';
    btn.textContent = '打开笔记 →';
    btn.addEventListener('click', () => navigate(n));
    card.appendChild(btn);
    host.style.position = 'relative';
    host.appendChild(card);
  }
  svg.addEventListener('pointerdown', (e) => {
    if (circleEls.indexOf(e.target) < 0) {
      dismissCard();
      if (state.type === 'node') { state = { type: null, value: null }; applyState(); }
    }
  });

  function navigate(n) {
    if (opts.onSelect) opts.onSelect(n); // explore 模式：选中出信息面板，由页面决定跳转
    else if (opts.onNavigate) opts.onNavigate(n);
    else if (n.slug) window.location.href = `/kb/${n.slug}/`;
  }

  /* 居中缩放（按钮控制用；与滚轮同一坐标数学，锚点取画布中心） */
  function zoomBy(factor) {
    userTouchedView = true;
    const cx = W / 2, cy = H / 2;
    const k2 = Math.min(6, Math.max(0.4, view.k * factor));
    view.x = cx - ((cx - view.x) / view.k) * k2;
    view.y = cy - ((cy - view.y) / view.k) * k2;
    view.k = k2;
    layer.style.transition = 'transform .3s ease';
    applyView();
    setTimeout(() => (layer.style.transition = ''), 320);
  }

  /* ---------- 对外控制器（图例 hover / 搜索 / 全屏页控件） ---------- */
  return {
    ready,
    highlightCluster(cid) {
      state = cid === null ? { type: null, value: null } : { type: 'cluster', value: cid };
      applyState();
    },
    search(term) {
      const t = term.trim().toLowerCase();
      if (!t) {
        state = { type: null, value: null };
        applyState();
        return 0;
      }
      const hits = new Set();
      nodes.forEach((n, i) => {
        if (n.title.toLowerCase().includes(t)) hits.add(i);
      });
      state = { type: 'search', value: hits };
      applyState();
      return hits.size;
    },
    zoomIn() { zoomBy(1.45); },
    zoomOut() { zoomBy(1 / 1.45); },
    fit() {
      userTouchedView = false;
      followNode = null;
      layer.style.transition = 'transform .35s ease';
      fitToView();
      setTimeout(() => (layer.style.transition = ''), 380);
    },
    reset() {
      dismissCard();
      state = { type: null, value: null };
      applyState();
      this.fit();
    },
    /* 聚焦某篇笔记：高亮其邻域并把视野移过去 */
    focusNode(slug) {
      const i = nodes.findIndex((n) => n.slug === slug);
      if (i < 0) return null;
      state = { type: 'node', value: i };
      applyState();
      userTouchedView = true;
      followNode = i;
      const k = Math.max(view.k, 1.5);
      view.k = k;
      view.x = W / 2 - nodes[i].x * k;
      view.y = H / 2 - nodes[i].y * k;
      layer.style.transition = 'transform .45s ease';
      applyView();
      setTimeout(() => (layer.style.transition = ''), 480);
      return nodes[i];
    },
    nodeBySlug(slug) {
      return nodes.find((n) => n.slug === slug) || null;
    },
    destroy() {
      sim.stop();
      dismissCard();
    },
  };
}

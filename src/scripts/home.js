// 首页行为：占位链接 / 滚动浮现 / 实时 token 跳动 / 知识图谱渲染
// 数据从 #site-data JSON 读取（构建时注入；real 字段缺失即回退样例）
// 图谱卡：滚动进视口后懒加载 3D 预览（three 异步 chunk，不进首发包）；
// WebGL 不可用 / reduced-motion / 加载失败 → 回退 2D
import { sampleGraph, GRAPH_PALETTE, SAMPLE_CLUSTERS } from '../lib/sample.js';
import { renderGraph } from './graph-view.js';
import { webglOK } from './graph-mode.js';

let homeAbort = null;
let homeGraphCtl = null;
let homeMountTarget = null;
function initHome(sig) {
  if (!document.getElementById('site-data')) return; // 仅首页
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

/* ---------- 工作台展开/收起（模态浮层）----------
   Glance 卡 → 全宽数据看板：切类动画 + 焦点管理 + ESC + 点 scrim/锚点关闭 + inert 背景 */
const wbExpand = document.getElementById('wb-expand');
const wbBoard = document.getElementById('wb-board');
const wbScrim = document.getElementById('wb-scrim');
if (wbExpand && wbBoard && wbScrim) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const closeBtn = document.getElementById('wb-close');
  const bgEls = [document.getElementById('top'), document.getElementById('site-head'), document.querySelector('.site-foot')].filter(Boolean);
  let lastFocus = null;
  let closeTimer = null;

  const open = () => {
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    lastFocus = document.activeElement;
    wbBoard.hidden = false;
    wbScrim.hidden = false;
    document.documentElement.classList.add('wb-open');
    bgEls.forEach((el) => el.setAttribute('inert', ''));
    wbExpand.setAttribute('aria-expanded', 'true');
    wbBoard.setAttribute('aria-hidden', 'false');
    const reveal = () => { wbBoard.classList.add('open'); wbScrim.classList.add('open'); };
    if (reduce) reveal();
    else requestAnimationFrame(() => requestAnimationFrame(reveal));
    (closeBtn || wbBoard).focus({ preventScroll: true });
  };

  const close = () => {
    if (!wbBoard.classList.contains('open') && wbBoard.hidden) return;
    wbBoard.classList.remove('open');
    wbScrim.classList.remove('open');
    wbExpand.setAttribute('aria-expanded', 'false');
    wbBoard.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('wb-open');
    bgEls.forEach((el) => el.removeAttribute('inert'));
    const finish = () => { wbBoard.hidden = true; wbScrim.hidden = true; };
    if (reduce) finish();
    else closeTimer = setTimeout(finish, 420);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  };

  wbExpand.addEventListener('click', open, { signal: sig });
  closeBtn?.addEventListener('click', close, { signal: sig });
  wbScrim.addEventListener('click', close, { signal: sig });
  // 看板内站内锚点（产出联动 stat tile）→ 先收起再跳转
  wbBoard.addEventListener('click', (e) => {
    if (e.target.closest('a[href^="#"]')) close();
  }, { signal: sig });
  // ESC 关闭 + 焦点圈闭（Tab 在看板内循环）
  document.addEventListener('keydown', (e) => {
    if (!wbBoard.classList.contains('open')) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const els = [...wbBoard.querySelectorAll('a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null);
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }, { signal: sig });
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
  }, { signal: sig });

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
    /* 雪夜→日出 5 档（与 scripts/lib/util.mjs buildWeeks 同口径）：v ≥ q(0.98) 进金顶档 */
    const t1 = q(0.35), t2 = q(0.7), t4 = q(0.98);
    cells.forEach((el) => {
      const cell = weeks[+el.dataset.w][+el.dataset.d];
      const v = cell.future ? 0 : valueOf(cell, dim);
      const l = v === 0 ? 0 : v <= t1 ? 1 : v <= t2 ? 2 : v < t4 ? 3 : 4;
      el.className = 'hm-cell l' + l + (cell.future ? ' future' : '');
    });
  }
  dimButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      dimButtons.forEach((b) => {
        const on = b === btn;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });
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

  // 图例/搜索通过 homeGraphCtl 间接调用：2D 与 3D 控制器 API 同形，挂载时机不同
  const onStateChange = (state) => {
    legEls.forEach((el, j) =>
      el.classList.toggle('active', state.type === 'cluster' && state.value === graph.clusters[j].id)
    );
  };
  const mount2d = () => {
    homeGraphCtl = renderGraph(kgPaper, graph, { mode: 'full', onStateChange });
  };

  const use3d = webglOK() && window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
  if (use3d) {
    kgPaper.classList.add('kg-3d');
    const hintEl = document.createElement('div');
    hintEl.className = 'kg-3d-hint';
    // 加载动效 B：星点成形（与 /graph、全屏图谱同源）
    hintEl.innerHTML =
      '<svg class="gx-constell" viewBox="0 0 132 92" aria-hidden="true">' +
      '<circle class="gxs" cx="16" cy="20" r="1"></circle><circle class="gxs s2" cx="48" cy="12" r="1.2"></circle><circle class="gxs s3" cx="92" cy="22" r="1"></circle><circle class="gxs" cx="118" cy="16" r="1.3"></circle><circle class="gxs s2" cx="28" cy="58" r="1"></circle><circle class="gxs s3" cx="108" cy="68" r="1.2"></circle><circle class="gxs" cx="14" cy="80" r="1"></circle>' +
      '<line class="gxl" x1="46" y1="44" x2="78" y2="36"></line><line class="gxl l2" x1="78" y1="36" x2="100" y2="60"></line><line class="gxl l3" x1="46" y1="44" x2="40" y2="74"></line><line class="gxl l4" x1="100" y1="60" x2="74" y2="76"></line>' +
      '<circle class="gxs big" cx="46" cy="44" r="2.4"></circle><circle class="gxs gold" cx="78" cy="36" r="2.6"></circle><circle class="gxs big" cx="100" cy="60" r="2.2"></circle><circle class="gxs big" cx="40" cy="74" r="2"></circle><circle class="gxs big" cx="74" cy="76" r="2.2"></circle>' +
      '</svg><span class="mono">点亮知识星系…</span>';
    kgPaper.appendChild(hintEl);
    let mounted = false;
    async function mount3d() {
      if (mounted) return;
      mounted = true;
      try {
        // 首页预览用 galaxy 聚合渲染器（与 /graph 同源，深空+辉光，迷你自转氛围）
        const { renderGraph3D } = await import('./graph-view-galaxy.js');
        if (sig.aborted) return;
        hintEl.remove();
        homeGraphCtl = renderGraph3D(kgPaper, graph, {
          mini: true,
          onStateChange,
          onSelect: (n) => {
            if (n?.slug) window.location.href = `/graph?focus=${encodeURIComponent(n.slug)}`;
          },
        });
      } catch (e) {
        console.error('[home] 3D 预览加载失败，回退 2D：', e);
        hintEl.remove();
        kgPaper.classList.remove('kg-3d');
        mount2d();
      }
    }
    // 懒加载触发：滚动 + 初始位置检查（不依赖 IntersectionObserver——部分环境不投递回调）
    const nearView = () => {
      const r = kgPaper.getBoundingClientRect();
      return r.top < innerHeight + 360 && r.bottom > -360;
    };
    const tryMount = () => {
      if (!mounted && nearView()) mount3d();
    };
    window.addEventListener('scroll', tryMount, { passive: true, signal: sig });
    window.addEventListener('resize', tryMount, { passive: true, signal: sig });
    requestAnimationFrame(tryMount);
  } else {
    mount2d();
  }

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
    item.addEventListener('mouseenter', () => { if (lockedCluster === null) homeGraphCtl?.highlightCluster(c.id); });
    item.addEventListener('mouseleave', () => { if (lockedCluster === null) homeGraphCtl?.highlightCluster(null); });
    item.addEventListener('focus', () => { if (lockedCluster === null) homeGraphCtl?.highlightCluster(c.id); });
    item.addEventListener('blur', () => { if (lockedCluster === null) homeGraphCtl?.highlightCluster(null); });
    item.addEventListener('click', () => {
      lockedCluster = lockedCluster === c.id ? null : c.id;
      homeGraphCtl?.highlightCluster(lockedCluster);
      legEls.forEach((el, j) => {
        el.classList.toggle('locked', graph.clusters[j].id === lockedCluster);
        el.setAttribute('aria-pressed', String(graph.clusters[j].id === lockedCluster));
      });
    });
    legend.appendChild(item);
    legEls.push(item);
  });

  // 卡片高度已硬限制（glass.css），图例区 flex 滚动自适应：全部主题域常显，
  // 容纳不下即在图例内滚动，不再撑高卡片（撤销原折叠展开——长度问题的根因）

  const input = document.getElementById('kg-search');
  const hint = document.getElementById('kg-search-hint');
  input?.addEventListener('input', () => {
    const n = homeGraphCtl?.search(input.value) ?? 0;
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
    t.style.fontFamily = "'MiSans Latin', 'MiSans', 'MiSans L3', 'PingFang SC', sans-serif";
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

}

function mountHome() {
  const target = document.getElementById('site-data');
  if (target && target === homeMountTarget) return;
  homeMountTarget = target;
  homeAbort?.abort();
  homeGraphCtl?.destroy?.();
  homeGraphCtl = null;
  if (!target) {
    homeAbort = null;
    return;
  }
  homeAbort = new AbortController();
  initHome(homeAbort.signal);
}

document.addEventListener('astro:page-load', mountHome);
/* 首次直达时，图谱依赖可能让该模块晚于 astro:page-load 才完成求值；
   事件已错过则补挂一次，避免整页交互与知识库预览保持空白。 */
setTimeout(() => {
  if (!homeAbort && document.getElementById('site-data')) mountHome();
}, 0);

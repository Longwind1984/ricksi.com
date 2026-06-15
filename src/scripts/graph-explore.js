// /graph 全屏探索页：2D/3D 双引擎编排者
// - 模式裁决见 graph-mode.js；3D 引擎（含 three）只在这里动态 import，按需加载
// - 控制条（搜索/主题域过滤）、缩放控件、节点信息面板对两种控制器零分叉（API 同形）
// - 深链 ?focus= / ?cluster= 等 ctl.ready（首轮布局收敛）后应用
import { renderGraph } from './graph-view.js';
import { resolveMode, saveMode, webglOK } from './graph-mode.js';
import { GRAPH_PALETTE } from '../lib/sample.js';
import { scopedGraph } from '../lib/graph-scope.mjs';

let gxCtl = null;
let gxToken = 0; // 异步竞态守卫：动态 import 期间用户导航走 → 弃实例

document.addEventListener('astro:page-load', () => {
  gxCtl?.destroy?.();
  gxCtl = null;
  gxToken++;
  const dataEl = document.getElementById('gx-data');
  const stage = document.getElementById('graph-stage');
  if (!dataEl || !stage) return;
  // 全量图（598 full + 529 stub）。作用域：'ai'=仅 AI 知识库(full)，默认；'all'=全部个人知识库。
  const { graph: fullGraph } = JSON.parse(dataEl.textContent);
  let scope = 'ai';
  let graph = scopedGraph(fullGraph, scope);

  const panel = document.getElementById('gx-panel');
  const pCluster = document.getElementById('gx-p-cluster');
  const pTitle = document.getElementById('gx-p-title');
  const pMeta = document.getElementById('gx-p-meta');
  const pOpen = document.getElementById('gx-p-open');
  const pFocus = document.getElementById('gx-p-focus');
  const loading = document.getElementById('gx-loading');
  const modeBtn = document.getElementById('gx-mode');
  const search = document.getElementById('gx-search');
  const stamp = document.getElementById('gx-stamp');
  const tuneBtn = document.getElementById('gx-tune');
  const paramsPanel = document.getElementById('gx-params');
  let current = null;
  let ctl = null;
  let mode = resolveMode();

  /* ---------- 力学参数面板（仅 3D 控制器有 setParams） ----------
     滑杆用整数刻度（百分比/正数斥力），换算成引擎参数 */
  const PKEY = 'kg-graph-params';
  const toEngine = (k, v) => (k === 'charge' ? -v : k === 'linkDistance' ? v : v / 100);
  const toUi = (k, v) => (k === 'charge' ? -v : k === 'linkDistance' ? v : Math.round(v * 100));
  const loadSavedParams = () => {
    try {
      return JSON.parse(localStorage.getItem(PKEY)) || null;
    } catch {
      return null;
    }
  };
  function syncSliders(engineParams) {
    paramsPanel?.querySelectorAll('input[type="range"]').forEach((inp) => {
      const k = inp.dataset.key;
      if (engineParams[k] === undefined) return;
      inp.value = toUi(k, engineParams[k]);
      const v = document.getElementById(`gpv-${k}`);
      if (v) v.textContent = inp.value;
    });
  }
  function initParams() {
    if (!tuneBtn || !paramsPanel) return;
    const is3d = mode === '3d' && !!ctl?.setParams;
    tuneBtn.hidden = !is3d;
    if (!is3d) {
      paramsPanel.hidden = true;
      tuneBtn?.setAttribute('aria-pressed', 'false');
      return;
    }
    const saved = loadSavedParams();
    if (saved) ctl.setParams(saved);
    syncSliders(ctl.getParams());
  }

  // 用全量 clusters（含 5 个 stub 文件夹域），两种作用域下面板着色/命名都正确
  const clusterName = (id) => fullGraph.clusters.find((c) => c.id === id)?.name ?? '';

  function showPanel(n) {
    current = n;
    pCluster.textContent = clusterName(n.cluster) + (n.facet ? ` · ${n.facet}` : '');
    pCluster.style.color = GRAPH_PALETTE[n.cluster % GRAPH_PALETTE.length];
    pTitle.textContent = n.title;
    if (n.slug) {
      // full 节点：有页面，可打开正文
      pMeta.textContent = `${n.deg} 条双链 · 创建于 ${n.created}`;
      pOpen.href = `/kb/${n.slug}/`;
      pOpen.hidden = false;
      pFocus.hidden = false;
      history.replaceState(null, '', `?focus=${encodeURIComponent(n.slug)}`);
    } else {
      // stub 节点（个人知识库）：仅标题 + 双链拓扑，正文未公开、无站内页面
      pMeta.textContent = `${n.deg} 条双链 · 正文未公开`;
      pOpen.hidden = true;
      pFocus.hidden = true;
      history.replaceState(null, '', location.pathname);
    }
    panel.hidden = false;
  }

  async function boot(nextMode, { applyDeepLink = false } = {}) {
    const token = ++gxToken;
    gxCtl?.destroy?.();
    gxCtl = ctl = null;
    stage.replaceChildren();
    mode = nextMode;
    updateModeBtn();
    if (nextMode === '3d') {
      loading.hidden = false;
      try {
        const { renderGraph3D } = await import('./graph-view-galaxy.js');
        if (token !== gxToken) return; // 加载期间已导航/切换
        ctl = renderGraph3D(stage, graph, { onSelect: showPanel });
      } catch (e) {
        console.error('[graph] 3D 引擎加载失败，回退 2D：', e);
        mode = '2d';
        updateModeBtn();
        ctl = renderGraph(stage, graph, { mode: 'full', width: 1200, onSelect: showPanel });
      } finally {
        loading.hidden = true;
      }
    } else {
      ctl = renderGraph(stage, graph, { mode: 'full', width: 1200, onSelect: showPanel });
    }
    if (token !== gxToken) {
      ctl?.destroy?.();
      return;
    }
    gxCtl = ctl;
    initParams();
    if (stamp) {
      stamp.textContent =
        mode === '3d'
          ? `${graph.stats.notes} 篇笔记 · ${graph.stats.links} 条双链 · 拖拽旋转 / 滚轮与双指缩放 / 点击节点看详情`
          : `${graph.stats.notes} 篇笔记 · ${graph.stats.links} 条双链 · 拖拽平移 / 滚轮缩放 / 点击节点看详情`;
    }
    if (applyDeepLink) {
      await (ctl.ready ?? Promise.resolve());
      if (token !== gxToken) return;
      const params = new URLSearchParams(location.search);
      if (params.has('focus')) {
        const n = ctl.focusNode(decodeURIComponent(params.get('focus')));
        if (n) showPanel(n);
      } else if (params.has('cluster')) {
        const cid = Number(params.get('cluster'));
        ctl.highlightCluster(cid);
        document.querySelector(`.gx-cluster[data-cluster="${cid}"]`)?.classList.add('active');
      }
    }
  }

  function updateModeBtn() {
    if (!modeBtn) return;
    modeBtn.textContent = mode === '3d' ? '2D' : '3D';
    modeBtn.setAttribute('aria-pressed', String(mode === '3d'));
    modeBtn.setAttribute('aria-label', mode === '3d' ? '切换到 2D 视图' : '切换到 3D 视图');
  }

  if (modeBtn) {
    if (!webglOK()) modeBtn.hidden = true;
    modeBtn.addEventListener('click', () => {
      const next = mode === '3d' ? '2d' : '3d';
      saveMode(next);
      panel.hidden = true;
      boot(next);
    });
  }

  if (tuneBtn && paramsPanel) {
    tuneBtn.addEventListener('click', () => {
      const open = paramsPanel.hidden;
      paramsPanel.hidden = !open;
      tuneBtn.setAttribute('aria-pressed', String(open));
    });
    document.getElementById('gx-params-close')?.addEventListener('click', () => {
      paramsPanel.hidden = true;
      tuneBtn.setAttribute('aria-pressed', 'false');
    });
    document.getElementById('gx-params-reset')?.addEventListener('click', () => {
      if (!ctl?.setParams) return;
      ctl.setParams(null);
      localStorage.removeItem(PKEY);
      syncSliders(ctl.getParams());
    });
    paramsPanel.querySelectorAll('input[type="range"]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const k = inp.dataset.key;
        const v = document.getElementById(`gpv-${k}`);
        if (v) v.textContent = inp.value;
        if (!ctl?.setParams) return;
        ctl.setParams({ [k]: toEngine(k, +inp.value) });
        try {
          localStorage.setItem(PKEY, JSON.stringify(ctl.getParams()));
        } catch {
          /* 隐私模式下静默 */
        }
      });
    });
  }

  document.getElementById('gx-p-close').addEventListener('click', () => {
    panel.hidden = true;
    current = null;
    history.replaceState(null, '', location.pathname);
  });
  pFocus.addEventListener('click', () => {
    if (current) ctl?.focusNode(current.slug);
  });

  /* 缩放控件 */
  document.getElementById('gx-zoom-in').addEventListener('click', () => ctl?.zoomIn());
  document.getElementById('gx-zoom-out').addEventListener('click', () => ctl?.zoomOut());
  document.getElementById('gx-fit').addEventListener('click', () => ctl?.fit());
  document.getElementById('gx-reset').addEventListener('click', () => {
    panel.hidden = true;
    document.querySelectorAll('.gx-cluster.active').forEach((b) => b.classList.remove('active'));
    if (search) search.value = '';
    history.replaceState(null, '', location.pathname);
    ctl?.reset();
  });

  /* 搜索 */
  search.addEventListener('input', () => {
    document.querySelectorAll('.gx-cluster.active').forEach((b) => b.classList.remove('active'));
    ctl?.search(search.value);
  });

  /* 作用域切换：仅 AI 知识库 / 全部个人知识库。切换 = 重算子图 + 重启渲染器 +
     显隐 stub 主题域 chip（个人库文件夹域）。stub 节点无论选什么都无正文/无页面（数据层保证）。 */
  function applyScopeUI() {
    document.querySelectorAll('.gx-scope').forEach((b) =>
      b.classList.toggle('active', b.dataset.scope === scope)
    );
    // stub 文件夹域的主题 chip 仅在「全部」时可见
    document.querySelectorAll('.gx-cluster[data-tier="stub"]').forEach((b) => {
      b.hidden = scope !== 'all';
    });
    if (search) search.placeholder = `搜索 ${graph.stats.notes} 篇笔记…`;
  }
  applyScopeUI();
  document.querySelectorAll('.gx-scope').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.scope;
      if (next === scope) return;
      scope = next;
      graph = scopedGraph(fullGraph, scope);
      applyScopeUI();
      // 清理高亮/搜索/面板，按当前模式重启
      panel.hidden = true;
      if (search) search.value = '';
      document.querySelectorAll('.gx-cluster.active').forEach((b) => b.classList.remove('active'));
      history.replaceState(null, '', location.pathname);
      boot(mode);
    });
  });

  /* 主题域 chips（单选切换） */
  document.querySelectorAll('.gx-cluster').forEach((btn) => {
    btn.addEventListener('click', () => {
      const on = btn.classList.contains('active');
      document.querySelectorAll('.gx-cluster.active').forEach((b) => b.classList.remove('active'));
      search.value = '';
      if (on) {
        ctl?.highlightCluster(null);
        history.replaceState(null, '', location.pathname);
      } else {
        btn.classList.add('active');
        ctl?.highlightCluster(Number(btn.dataset.cluster));
        history.replaceState(null, '', `?cluster=${btn.dataset.cluster}`);
      }
    });
  });

  boot(mode, { applyDeepLink: true });
});

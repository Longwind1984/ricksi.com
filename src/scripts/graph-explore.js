// /graph 全屏探索页：2D/3D 双引擎编排者
// - 模式裁决见 graph-mode.js；3D 引擎（含 three）只在这里动态 import，按需加载
// - 控制条（搜索/主题域过滤）、缩放控件、节点信息面板对两种控制器零分叉（API 同形）
// - 深链 ?focus= / ?cluster= 等 ctl.ready（首轮布局收敛）后应用
import { renderGraph } from './graph-view.js';
import { resolveMode, saveMode, webglOK } from './graph-mode.js';
import { GRAPH_PALETTE } from '../lib/sample.js';

let gxCtl = null;
let gxToken = 0; // 异步竞态守卫：动态 import 期间用户导航走 → 弃实例

document.addEventListener('astro:page-load', () => {
  gxCtl?.destroy?.();
  gxCtl = null;
  gxToken++;
  const dataEl = document.getElementById('gx-data');
  const stage = document.getElementById('graph-stage');
  if (!dataEl || !stage) return;
  const { graph } = JSON.parse(dataEl.textContent);

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
  let current = null;
  let ctl = null;
  let mode = resolveMode();

  const clusterName = (id) => graph.clusters.find((c) => c.id === id)?.name ?? '';

  function showPanel(n) {
    current = n;
    pCluster.textContent = clusterName(n.cluster) + (n.facet ? ` · ${n.facet}` : '');
    pCluster.style.color = GRAPH_PALETTE[n.cluster % GRAPH_PALETTE.length];
    pTitle.textContent = n.title;
    pMeta.textContent = `${n.deg} 条双链 · 创建于 ${n.created}`;
    pOpen.href = `/kb/${n.slug}/`;
    panel.hidden = false;
    history.replaceState(null, '', `?focus=${encodeURIComponent(n.slug)}`);
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
        const { renderGraph3D } = await import('./graph-view3d.js');
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

// /graph 全屏探索页：控制条（搜索/主题域过滤）+ 缩放控件 + 节点信息面板 + URL 深链
import { renderGraph } from './graph-view.js';
import { GRAPH_PALETTE } from '../lib/sample.js';

const dataEl = document.getElementById('gx-data');
const stage = document.getElementById('graph-stage');
if (dataEl && stage) {
  const { graph } = JSON.parse(dataEl.textContent);

  const panel = document.getElementById('gx-panel');
  const pCluster = document.getElementById('gx-p-cluster');
  const pTitle = document.getElementById('gx-p-title');
  const pMeta = document.getElementById('gx-p-meta');
  const pOpen = document.getElementById('gx-p-open');
  const pFocus = document.getElementById('gx-p-focus');
  let current = null;

  const clusterName = (id) => graph.clusters.find((c) => c.id === id)?.name ?? '';

  function showPanel(n) {
    current = n;
    pCluster.textContent = clusterName(n.cluster);
    pCluster.style.color = GRAPH_PALETTE[n.cluster % GRAPH_PALETTE.length];
    pTitle.textContent = n.title;
    pMeta.textContent = `${n.deg} 条双链 · 创建于 ${n.created}`;
    pOpen.href = `/kb/${n.slug}/`;
    panel.hidden = false;
    history.replaceState(null, '', `?focus=${encodeURIComponent(n.slug)}`);
  }

  const ctl = renderGraph(stage, graph, {
    mode: 'full',
    width: 1200,
    onSelect: showPanel,
  });

  document.getElementById('gx-p-close').addEventListener('click', () => {
    panel.hidden = true;
    current = null;
    history.replaceState(null, '', location.pathname);
  });
  pFocus.addEventListener('click', () => {
    if (current) ctl.focusNode(current.slug);
  });

  /* 缩放控件 */
  document.getElementById('gx-zoom-in').addEventListener('click', () => ctl.zoomIn());
  document.getElementById('gx-zoom-out').addEventListener('click', () => ctl.zoomOut());
  document.getElementById('gx-fit').addEventListener('click', () => ctl.fit());
  document.getElementById('gx-reset').addEventListener('click', () => {
    panel.hidden = true;
    document.querySelectorAll('.gx-cluster.active').forEach((b) => b.classList.remove('active'));
    const s = document.getElementById('gx-search');
    if (s) s.value = '';
    history.replaceState(null, '', location.pathname);
    ctl.reset();
  });

  /* 搜索 */
  const search = document.getElementById('gx-search');
  search.addEventListener('input', () => {
    document.querySelectorAll('.gx-cluster.active').forEach((b) => b.classList.remove('active'));
    ctl.search(search.value);
  });

  /* 主题域 chips（单选切换） */
  document.querySelectorAll('.gx-cluster').forEach((btn) => {
    btn.addEventListener('click', () => {
      const on = btn.classList.contains('active');
      document.querySelectorAll('.gx-cluster.active').forEach((b) => b.classList.remove('active'));
      search.value = '';
      if (on) {
        ctl.highlightCluster(null);
        history.replaceState(null, '', location.pathname);
      } else {
        btn.classList.add('active');
        ctl.highlightCluster(Number(btn.dataset.cluster));
        history.replaceState(null, '', `?cluster=${btn.dataset.cluster}`);
      }
    });
  });

  /* URL 深链：?focus=slug / ?cluster=id（等首帧布局后应用） */
  const params = new URLSearchParams(location.search);
  setTimeout(() => {
    if (params.has('focus')) {
      const n = ctl.focusNode(decodeURIComponent(params.get('focus')));
      if (n) showPanel(n);
    } else if (params.has('cluster')) {
      const cid = Number(params.get('cluster'));
      ctl.highlightCluster(cid);
      document.querySelector(`.gx-cluster[data-cluster="${cid}"]`)?.classList.add('active');
    }
  }, 900);
}

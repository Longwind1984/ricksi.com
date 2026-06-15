// galaxy 聚合渲染器的「同形 wrapper」——签名与 API 与 graph-view3d.js 的 renderGraph3D 完全一致，
// 供 /graph 与主页预览窗（正式接入由主控随后串行做）零分叉替换 3d-force-graph 引擎。
//
// 控制器契约（逐方法对齐 graph-view3d.js）：
//   ready: Promise · highlightCluster(cid|null) · search(term):number · zoomIn/zoomOut/fit/reset
//   focusNode(slug):node|null · nodeBySlug(slug):node|null · getParams()/setParams(p|null) · destroy()
//
// 三件相对 spike(mount.js) 的升级：
//   1) CSS2D 标签层 + LOD（renderer.labels + labelLOD.js）；labelDensity → maxLabels
//   2) 单例化 WebGLRenderer：模块级持有一个 AggregateRenderer，destroy 软销毁（保留 GL context），
//      下次 renderGalaxy3D 走 setData 换数据而非 new —— View Transitions 下反复进出不撞 context 上限
//   3) onSelect/onStateChange 回吐【站点原始节点】（带 deg/facet/created），与 2D/3d-force-graph 同形
//
// 参数面板 6 key（charge/linkDistance/linkStrength/anchor/nodeScale/labelDensity）桥接：
//   charge/linkDistance/linkStrength → LayoutParams 同名；anchor → centerPull；
//   nodeScale → renderer.setNodeScale；labelDensity → LabelLOD.setDensity（调 maxLabels）。
//   getParams 回吐这 6 key（与 GRAPH_PARAM_DEFAULTS 同刻度）。

import { AggregateRenderer } from './galaxy/renderer.js';
import { WorkerForceLayout } from './galaxy/workerForceLayout.js';
import { CameraDirector } from './galaxy/cameraDirector.js';
import { clusterColorFn } from './galaxy/palette.js';
import { buildGraphFromSiteJson } from './galaxy/buildGraph.js';
import { seedPosition, seedRadius } from './galaxy/seed.js';
import { LabelLOD } from './galaxy/labelLOD.js';
import { Vector3 } from 'three';

/** 面板默认值（对齐 graph-view3d.js GRAPH_PARAM_DEFAULTS，同刻度） */
export const GRAPH_PARAM_DEFAULTS = {
  charge: -42,
  linkDistance: 34,
  linkStrength: 1,
  anchor: 0.13,
  nodeScale: 1,
  labelDensity: 1,
};

function toLayoutParams(p) {
  return {
    charge: p.charge,
    linkDistance: p.linkDistance,
    linkStrength: p.linkStrength,
    centerPull: p.anchor, // anchor → centerPull（向心引力语义一致）
    flatten: 0, // 自然球体（不压银河盘）
    velocityDecay: 0.34, // 对齐 graph-view3d d3VelocityDecay
  };
}

// ---- 单例 WebGLRenderer（跨 2D/3D 切换 / 反复 destroy+rebuild 复用一个 GL context） ----
let SINGLETON = null; // { renderer }
function acquireRenderer(host, radius) {
  if (SINGLETON) {
    // 复用：把画布 + 标签容器移进新 host（replaceChildren 可能已把它们从旧 host 摘掉）
    host.appendChild(SINGLETON.renderer.renderer.domElement);
    host.appendChild(SINGLETON.renderer.labels.root);
    SINGLETON.renderer.container = host;
    SINGLETON.renderer.reinitStarfield(radius);
    return SINGLETON.renderer;
  }
  const renderer = new AggregateRenderer(host, radius);
  SINGLETON = { renderer };
  if (typeof window !== 'undefined') window.__galaxySingleton = SINGLETON;
  return renderer;
}

export function renderGraph3D(host, graph, opts = {}) {
  const isMobile = matchMedia('(pointer: coarse)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMini = !!opts.mini;

  // ---- 数据（galaxy 渲染索引空间）+ 站点原始节点映射（回吐用） ----
  const data = buildGraphFromSiteJson(graph);
  const n = data.nodes.length;
  const siteByIndex = graph.nodes; // data.nodes[i].origId === graph.nodes[i].id（buildGraph 保序）
  const siteBySlug = new Map(graph.nodes.map((sn) => [sn.slug, sn]));
  const indexBySlug = new Map(data.nodes.map((dn, i) => [dn.slug, i]));
  const params = { ...GRAPH_PARAM_DEFAULTS };

  // 邻接 + 每节点链接索引（高亮/聚焦用）
  const adj = data.nodes.map(() => new Set());
  const linksByNode = data.nodes.map(() => []);
  data.links.forEach((l, i) => {
    adj[l.source].add(l.target);
    adj[l.target].add(l.source);
    linksByNode[l.source].push(i);
    linksByNode[l.target].push(i);
  });

  // 种子坐标（确定性球面散布）
  const radius = seedRadius(n);
  const positions = new Float32Array(n * 3);
  data.nodes.forEach((node, i) => {
    const [x, y, z] = seedPosition(String(node.origId ?? i), radius);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  });

  // ---- 渲染器（单例复用）----
  const renderer = acquireRenderer(host, radius);
  renderer.selLinkIdx = []; // 清掉上一实例残留的选中链接索引（否则 setData 会按旧下标重建高亮）
  renderer.focusActive = false;
  renderer.setColorFn(clusterColorFn);
  renderer.setData(data, positions);
  renderer.setNodeScale(isMini ? 0.7 : params.nodeScale); // mini 远景：节点点精灵收小，避免近距单点过大
  const W0 = host.clientWidth || 800;
  const H0 = host.clientHeight || 600;
  renderer.resize(W0, H0);
  // 降级：移动端关 bloom（合成预算）；reduced-motion 也关（辉光是高眩光视效）；mini 远景弱化辉光
  if (isMobile || reduced) {
    renderer.applyTier(
      { bloomAllowed: false, pixelRatioCap: isMobile ? 1.5 : 2, starScale: isMobile ? 0.6 : 1 },
      renderer.bloomPass.strength,
    );
  } else if (isMini) {
    renderer.bloomPass.strength = 0.38; // mini 远景：辉光收敛，单点光晕不过曝
  }

  // ---- 布局（Worker）----
  const layout = new WorkerForceLayout();
  layout.init(data, positions, toLayoutParams(params), 1);

  // ---- 高亮状态（语义对齐 graph-view3d：node / cluster / search 三态）----
  let state = { type: null, value: null };
  function emitState() {
    // 回吐站点原始 state（cluster/search 直接透传；node 透传选中下标）——
    // onStateChange 现仅用于内部；保持与 graph-view3d 形状（{type,value}）一致。
    opts.onStateChange?.(state);
  }

  // ---- 镜头 ----
  let selected = -1;
  const camera = new CameraDirector(
    renderer.camera,
    renderer.renderer.domElement,
    {
      onFlyToSelected: () => {
        if (selected >= 0) flyToIndex(selected);
      },
      onResetView: () => camera.resetView(radius),
    },
    isMini
      ? { enableZoom: false, enablePan: false, enableKeys: false, cruiseEnabled: !reduced, enabled: !isMobile, touchAction: 'pan-y' }
      : {},
  );
  camera.setInitialFraming(isMini ? radius * 1.5 : radius); // mini：镜头拉远成远景星系（framingPosition 内部再 ×2.2）

  // ---- 标签 LOD ----
  const baseMax = isMini ? 8 : isMobile ? 28 : 60; // mini 远景：标签更少更干净
  const lod = new LabelLOD(
    renderer,
    data,
    adj,
    () => ({ w: host.clientWidth, h: host.clientHeight }),
    () => state,
    { baseMax, radius, mini: isMini },
  );
  lod.setDensity(params.labelDensity);

  // ---- RAF 循环（出视口 / 标签页隐藏不暂停由调用方管；这里只管渲染）----
  let raf = 0;
  let running = false;
  let last = performance.now();
  let lodAccum = 0;
  function frame(now) {
    if (!running) return;
    const deltaS = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (layout.step()) renderer.updatePositions();
    camera.update(now, deltaS);
    renderer.render(deltaS);
    // 标签：选择集每 ~120ms 重算（投影+网格去重，较贵）；可见标签每帧重投影（轻，防相机移动滞后）
    lodAccum += deltaS;
    if (lodAccum >= 0.12) {
      lodAccum = 0;
      lod.update();
    } else {
      lod.reposition();
    }
    raf = requestAnimationFrame(frame);
  }
  function startLoop() {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stopLoop() {
    running = false;
    cancelAnimationFrame(raf);
  }
  startLoop();

  // ---- ready：等首轮布局沉降（深链飞行需稳定坐标）----
  let readyResolve;
  const ready = new Promise((r) => (readyResolve = r));
  const settleWatch = setInterval(() => {
    if (layout.isSettled()) {
      clearInterval(settleWatch);
      renderer.updatePositions();
      camera.resetView(radius);
      if (!reduced && !isMini) renderer.playReveal();
      lod.update();
      setTimeout(() => readyResolve?.(), reduced ? 30 : 400);
    }
  }, 120);

  // ---- 高亮/聚焦 ----
  function applyFocusByIndex(i) {
    selected = i;
    renderer.setFocus(i, adj[i]);
    renderer.setSelectedLinks(linksByNode[i]);
    state = { type: 'node', value: i };
    lod.update();
    emitState();
  }
  function clearFocus() {
    selected = -1;
    renderer.setFocus(-1, null);
    renderer.setSelectedLinks([]);
    state = { type: null, value: null };
    lod.update();
    emitState();
  }
  function flyToIndex(i) {
    const pos = renderer.nodePosition(i, new Vector3());
    camera.flyTo(pos, renderer.nodeRadius(i));
  }
  const tmpV = new Vector3();
  function zoomBy(f) {
    const cam = renderer.camera;
    const t = camera.target;
    const v = tmpV.copy(cam.position).sub(t).multiplyScalar(f);
    cam.position.copy(t).add(v);
  }

  // ---- 点击拾取（屏幕最近邻）：区分真实点击与拖拽松手 ----
  // 拖拽（旋转/平移）后浏览器会补发一个 click；pointerdown→click 位移超阈值则判为拖拽，不拾取/不导航。
  // 修主页图谱卡「转一下松手就误进 /graph」。
  let downX = 0;
  let downY = 0;
  function onPointerDown(e) {
    downX = e.clientX;
    downY = e.clientY;
  }
  function onClick(e) {
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return; // 拖拽松手，非点击
    const rect = host.getBoundingClientRect();
    const idx = renderer.pickNearest(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height, 18);
    if (idx >= 0) {
      applyFocusByIndex(idx);
      opts.onSelect?.(siteByIndex[idx]); // 回吐站点原始节点（带 deg/facet/created）
    } else {
      clearFocus();
    }
  }
  if (!isMini || !isMobile) {
    renderer.renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.renderer.domElement.addEventListener('click', onClick);
  }

  // ---- resize ----
  const ro = new ResizeObserver(() => {
    renderer.resize(host.clientWidth, host.clientHeight);
    lod.update();
  });
  ro.observe(host);

  // ---- 控制器（与 graph-view3d.js 同形）----
  return {
    ready,
    highlightCluster(cid) {
      if (cid === null || cid === undefined) {
        clearFocus();
        return;
      }
      const set = new Set();
      data.nodes.forEach((node, i) => {
        if (node.cluster === cid) set.add(i);
      });
      selected = -1;
      renderer.setFocus(-1, set.size ? set : null);
      renderer.setSelectedLinks([]);
      state = { type: 'cluster', value: cid };
      lod.update();
      emitState();
    },
    search(term) {
      const t = (term || '').trim().toLowerCase();
      if (!t) {
        clearFocus();
        return 0;
      }
      const hits = new Set();
      data.nodes.forEach((node, i) => {
        if ((node.title || '').toLowerCase().includes(t)) hits.add(i);
      });
      selected = -1;
      renderer.setFocus(-1, hits.size ? hits : null);
      renderer.setSelectedLinks([]);
      state = { type: 'search', value: hits };
      lod.update();
      emitState();
      return hits.size;
    },
    zoomIn() {
      zoomBy(0.68);
    },
    zoomOut() {
      zoomBy(1.47);
    },
    fit() {
      camera.resetView(radius);
    },
    reset() {
      clearFocus();
      camera.resetView(radius);
    },
    focusNode(slug) {
      const i = indexBySlug.get(slug);
      if (i === undefined) return null;
      applyFocusByIndex(i);
      flyToIndex(i);
      const site = siteBySlug.get(slug) || null;
      if (site) opts.onSelect?.(site);
      return site; // 站点原始节点（带 deg/facet/created）
    },
    nodeBySlug: (slug) => siteBySlug.get(slug) || null,
    getParams: () => ({ ...params }),
    setParams(p) {
      const prev = { ...params };
      Object.assign(params, p || GRAPH_PARAM_DEFAULTS);
      const physChanged = ['charge', 'linkDistance', 'linkStrength', 'anchor'].some((k) => params[k] !== prev[k]);
      if (physChanged) layout.updateParams(toLayoutParams(params));
      if (params.nodeScale !== prev.nodeScale) renderer.setNodeScale(params.nodeScale);
      if (params.labelDensity !== prev.labelDensity) {
        lod.setDensity(params.labelDensity);
        lod.update();
      }
    },
    destroy() {
      // 软销毁：暂停 RAF + 释放 per-graph 几何/材质 + 解绑监听 + 关 worker/镜头，
      // 【保留】单例 WebGLRenderer / GL context / composer / 标签容器 —— 下次走 setData 复用。
      stopLoop();
      clearInterval(settleWatch);
      ro.disconnect();
      renderer.renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.renderer.domElement.removeEventListener('click', onClick);
      camera.dispose();
      layout.dispose();
      renderer.dispose({ keepRenderer: true });
    },
  };
}

// 显式命名导出，方便正式接入时 `import { renderGalaxy3D } from './graph-view-galaxy.js'`
export { renderGraph3D as renderGalaxy3D };

/** 仅页面真卸载/测试用：彻底丢上下文释放单例（生产 View Transitions 下勿调）。 */
export function destroyGalaxySingleton() {
  if (!SINGLETON) return;
  SINGLETON.renderer.dispose({ keepRenderer: false });
  SINGLETON = null;
  if (typeof window !== 'undefined') window.__galaxySingleton = null;
}

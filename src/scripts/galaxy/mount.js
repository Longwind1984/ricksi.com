// SPIKE 编排胶水：把已移植的渲染器 / Worker 布局 / 镜头导演拼成一个 RAF 循环，
// 并暴露与本站 graph-view3d.js 同形的控制器 API。
// galaxy 原版的这层胶水在 GalaxyView/GraphController（重 Obsidian 耦合，按要求不照搬），
// 此文件是它在本站语境下的精简重写——只覆盖 spike 与正式接入需要的契约方法。
//
// 控制器契约（对齐 graph-view3d.js）：
//   ready: Promise · highlightCluster(cid|null) · search(term):number · zoomIn/zoomOut/fit/reset
//   focusNode(slug):node|null · nodeBySlug(slug):node|null · getParams()/setParams(p|null) · destroy()
//
// 参数桥接：本站面板的 6 个 key（charge/linkDistance/linkStrength/anchor/nodeScale/labelDensity）
// → galaxy LayoutParams（charge/linkDistance/linkStrength/centerPull/flatten/velocityDecay）+ 渲染器 setNodeScale。
//   · anchor → centerPull（向心引力语义一致）
//   · labelDensity 本 spike 无标签层，记录为待办（正式接入时接 CSS2D LOD，见集成计划）
//   · nodeScale → renderer.setNodeScale

import { AggregateRenderer } from './renderer.js';
import { WorkerForceLayout } from './workerForceLayout.js';
import { CameraDirector } from './cameraDirector.js';
import { clusterColorFn } from './palette.js';
import { buildGraphFromSiteJson } from './buildGraph.js';
import { seedPosition, seedRadius } from './seed.js';

/** 本站面板默认值（对齐 graph-view3d.js GRAPH_PARAM_DEFAULTS） */
export const GALAXY_PARAM_DEFAULTS = {
  charge: -42,
  linkDistance: 34,
  linkStrength: 1,
  anchor: 0.13,
  nodeScale: 1,
  labelDensity: 1,
};

/** 面板 6 参 → galaxy LayoutParams */
function toLayoutParams(p) {
  return {
    charge: p.charge,
    linkDistance: p.linkDistance,
    linkStrength: p.linkStrength,
    centerPull: p.anchor,
    flatten: 0, // 银河盘压扁；spike 用 0（自然球体）。正式接入可挂面板
    velocityDecay: 0.34, // 对齐 graph-view3d d3VelocityDecay
  };
}

export function mountGalaxy(host, graph, opts = {}) {
  const reduced = opts.reduced ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = opts.mobile ?? matchMedia('(pointer: coarse)').matches;
  const embed = !!opts.embed; // 落地页嵌入模式：关滚轮缩放/键盘、可暂停、移动端降级
  const data = buildGraphFromSiteJson(graph);
  const n = data.nodes.length;
  const params = { ...GALAXY_PARAM_DEFAULTS, ...(opts.params || {}) };

  // 邻接表（高亮/聚焦/搜索用，索引空间 = data.nodes 下标）
  const adj = data.nodes.map(() => new Set());
  for (const l of data.links) {
    adj[l.source].add(l.target);
    adj[l.target].add(l.source);
  }
  // 每节点的链接索引（选中高亮层用）
  const linksByNode = data.nodes.map(() => []);
  data.links.forEach((l, i) => {
    linksByNode[l.source].push(i);
    linksByNode[l.target].push(i);
  });
  const bySlug = new Map(data.nodes.map((node) => [node.slug, node]));

  // 种子坐标：galaxy 确定性球面散布（按 origId 复现）
  const radius = seedRadius(n);
  const positions = new Float32Array(n * 3);
  data.nodes.forEach((node, i) => {
    const [x, y, z] = seedPosition(String(node.origId ?? i), radius);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  });

  // 渲染器
  const renderer = new AggregateRenderer(host, radius);
  renderer.setColorFn(clusterColorFn);
  renderer.setData(data, positions);
  renderer.setNodeScale(params.nodeScale);
  if (host.clientWidth && host.clientHeight) renderer.resize(host.clientWidth, host.clientHeight);
  // 移动端降级：关 bloom（shader 热核保住约 80% 观感）、pixelRatio≤1.5、星空减密
  if (mobile) renderer.applyTier({ bloomAllowed: false, pixelRatioCap: 1.5, starScale: 0.6 }, renderer.bloomPass.strength);

  // 布局（Worker）
  const layout = new WorkerForceLayout();
  layout.init(data, positions, toLayoutParams(params), 1);

  // 镜头
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
    embed
      ? { enableZoom: false, enablePan: false, enableKeys: false, cruiseEnabled: !reduced, enabled: !mobile, touchAction: 'pan-y' }
      : {},
  );
  camera.setInitialFraming(radius);

  if (typeof window !== 'undefined') window.__galaxy = { renderer, layout, camera, data };

  // ---- RAF 循环（可暂停：出视口 / 标签页隐藏时停，省电省 GPU） ----
  let raf = 0;
  let last = performance.now();
  let running = false;
  function frame(now) {
    if (!running) return;
    const deltaS = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (layout.step()) renderer.updatePositions(); // 布局热：刷坐标
    camera.update(now, deltaS);
    renderer.render(deltaS);
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
  const savedBloom = renderer.bloomPass.strength; // 辉光开关记忆值

  // ---- ready：等首轮布局沉降 ----
  let readyResolve;
  const ready = new Promise((r) => (readyResolve = r));
  const settleWatch = setInterval(() => {
    if (layout.isSettled()) {
      clearInterval(settleWatch);
      renderer.updatePositions();
      camera.resetView(radius);
      if (!reduced) renderer.playReveal();
      setTimeout(() => readyResolve?.(), reduced ? 30 : 400);
    }
  }, 120);

  // ---- 高亮/聚焦 ----
  function clearFocus() {
    selected = -1;
    renderer.setFocus(-1, null);
    renderer.setSelectedLinks([]);
  }
  function focusIndex(i) {
    selected = i;
    renderer.setFocus(i, adj[i]);
    renderer.setSelectedLinks(linksByNode[i]);
  }
  function flyToIndex(i) {
    const pos = renderer.nodePosition(i, new (renderer.camera.position.constructor)());
    camera.flyTo(pos, renderer.nodeRadius(i));
  }

  // ---- resize ----
  const ro = new ResizeObserver(() => renderer.resize(host.clientWidth, host.clientHeight));
  ro.observe(host);

  // 点击拾取（屏幕最近邻）
  function onClick(e) {
    const rect = host.getBoundingClientRect();
    const idx = renderer.pickNearest(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height, 18);
    if (idx >= 0) {
      focusIndex(idx);
      opts.onSelect?.(data.nodes[idx]);
    } else {
      clearFocus();
    }
  }
  renderer.renderer.domElement.addEventListener('click', onClick);

  // ---- 控制器（与 graph-view3d.js 同形）----
  function zoomBy(f) {
    const cam = renderer.camera;
    const t = camera.target;
    const v = cam.position.clone().sub(t).multiplyScalar(f);
    cam.position.copy(t.clone().add(v));
  }

  return {
    ready,
    highlightCluster(cid) {
      if (cid === null || cid === undefined) {
        clearFocus();
        return;
      }
      // cluster 高亮：把同 cluster 节点作为「邻居集」喂 setFocus（非邻居淡出）
      const set = new Set();
      data.nodes.forEach((node, i) => {
        if (node.cluster === cid) set.add(i);
      });
      selected = -1;
      renderer.setFocus(-1, set);
      renderer.setSelectedLinks([]);
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
    pause() {
      stopLoop();
    },
    resume() {
      startLoop();
    },
    setBloom(on) {
      renderer.setBloomStrength(on ? savedBloom : 0);
    },
    getBloom: () => renderer.getBloomStrength() > 0,
    focusNode(slug) {
      const node = bySlug.get(slug);
      if (!node) return null;
      focusIndex(node.id);
      flyToIndex(node.id);
      opts.onSelect?.(node);
      return node;
    },
    nodeBySlug: (slug) => bySlug.get(slug) || null,
    getParams: () => ({ ...params }),
    setParams(p) {
      const prev = { ...params };
      Object.assign(params, p || GALAXY_PARAM_DEFAULTS);
      const physChanged = ['charge', 'linkDistance', 'linkStrength', 'anchor'].some((k) => params[k] !== prev[k]);
      if (physChanged) layout.updateParams(toLayoutParams(params));
      if (params.nodeScale !== prev.nodeScale) renderer.setNodeScale(params.nodeScale);
      // labelDensity: 本 spike 无标签层（正式接入接 CSS2D LOD）
    },
    destroy() {
      stopLoop();
      clearInterval(settleWatch);
      ro.disconnect();
      renderer.renderer.domElement.removeEventListener('click', onClick);
      camera.dispose();
      layout.dispose();
      renderer.dispose();
      host.replaceChildren();
    },
  };
}

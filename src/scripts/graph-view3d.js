// 知识图谱 3D 渲染器（NASA Eyes 视觉语言：纯黑深空 + 星点 + 辉光 + 距离雾 + 相机飞行）
// ⚠ 本文件是唯一允许 import three 的地方，且只能被 graph-explore.js 动态 import——
//   静态 import 会把 ~1MB 的 three 打进首发 chunk。
// 控制器与 2D 版（graph-view.js）同形：highlightCluster / search / zoomIn / zoomOut /
// fit / reset / focusNode / nodeBySlug / destroy / onSelect 回调 + ready Promise。
import ForceGraph3D from '3d-force-graph';
import SpriteText from 'three-spritetext';
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { forceX, forceY, forceZ } from 'd3-force-3d';
import { GRAPH_PALETTE } from '../lib/sample.js';

const BG = '#000005'; // NASA Eyes：纯黑深空（带极微蓝避免色带）
const CYAN = '#02bfe7'; // NASA 标志青：选中/高亮专用色
const LINK_DIM = 'rgba(143,168,204,0.16)';
const LINK_BASE = 'rgba(143,168,204,0.36)';
const LINK_LIT = 'rgba(2,191,231,0.85)';

/* 可调力学参数（/graph 参数面板的默认值；linkStrength/nodeScale/labelDensity 是倍率） */
export const GRAPH_PARAM_DEFAULTS = {
  charge: -42, // 节点间斥力
  linkDistance: 34, // 双链目标距离
  linkStrength: 1, // 双链拉力倍率（基准 0.6/min(deg)^0.6 的 hub 减弱不变）
  anchor: 0.13, // 主题域向心引力
  nodeScale: 1, // 节点大小倍率
  labelDensity: 1, // 标签数量倍率
};

/* opts.mini：主页预览模式——自转氛围、禁缩放/平移（不劫持页面滚轮）、少标签、点节点交给 onSelect */
export function renderGraph3D(host, graph, opts = {}) {
  const isMobile = matchMedia('(pointer: coarse)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMini = !!opts.mini;
  const FLY_MS = reduced ? 0 : 1000;
  const params = { ...GRAPH_PARAM_DEFAULTS };

  /* ---------- 数据 ---------- */
  const nodes = graph.nodes.map((n) => ({ ...n }));
  const links = graph.edges.map(([a, b]) => ({ source: a, target: b }));
  const bySlug = new Map(nodes.map((n) => [n.slug, n]));
  const adj = nodes.map(() => new Set());
  for (const [a, b] of graph.edges) {
    adj[a].add(b);
    adj[b].add(a);
  }
  const color = (n) => GRAPH_PALETTE[n.cluster % GRAPH_PALETTE.length];
  const radius = (n) => Math.min(14, 2.6 + Math.sqrt(n.deg || 0) * 1.15) * 0.6;
  const degOf = (n) => Math.max(1, n.deg || 1);

  /* ---------- cluster 锚点：Fibonacci 球面（2D 椭圆锚点的 3D 对应物） ---------- */
  const clusterIds = [...new Set(nodes.map((n) => n.cluster))];
  const R = Math.max(220, Math.min(340, nodes.length * 0.5));
  const anchor = {};
  const GA = Math.PI * (1 + Math.sqrt(5));
  clusterIds.forEach((cid, i) => {
    const t = (i + 0.5) / clusterIds.length;
    const phi = Math.acos(1 - 2 * t);
    anchor[cid] = {
      x: R * Math.sin(phi) * Math.cos(GA * i),
      y: R * Math.sin(phi) * Math.sin(GA * i),
      z: R * Math.cos(phi),
    };
  });
  // 布局种子：撒在所属锚点附近，避免开场爆炸并加速收敛
  nodes.forEach((n) => {
    const a = anchor[n.cluster];
    n.x = a.x + (Math.random() - 0.5) * 90;
    n.y = a.y + (Math.random() - 0.5) * 90;
    n.z = a.z + (Math.random() - 0.5) * 90;
  });

  /* ---------- 实例 ---------- */
  const Graph = new ForceGraph3D(host, {
    controlType: 'orbit',
    rendererConfig: { antialias: !isMobile, powerPreference: 'high-performance', alpha: false },
  })
    .backgroundColor(BG)
    .showNavInfo(false)
    .nodeLabel(() => '') // 关掉内置 tooltip，标签走自管 LOD sprite
    .nodeThreeObject(nodeObj)
    .linkColor(linkColorFn)
    .linkOpacity(1)
    .linkWidth(0)
    .enableNodeDrag(!isMobile && !isMini)
    .warmupTicks(reduced ? 260 : 80)
    .cooldownTicks(reduced ? 0 : 220)
    .d3AlphaDecay(0.028)
    .d3VelocityDecay(0.34)
    .onNodeClick((n) => {
      setState('node', n.id);
      opts.onSelect?.(n);
    })
    .onNodeHover((n) => {
      if (!matchMedia('(hover: hover)').matches) return;
      if (n) setState('node', n.id);
      else if (state.type === 'node') setState(null);
      host.style.cursor = n ? 'pointer' : 'grab';
    })
    .onBackgroundClick(() => setState(null))
    .graphData({ nodes, links });

  const renderer = Graph.renderer();
  renderer.setPixelRatio(Math.min(isMobile ? 1.5 : 2, devicePixelRatio || 1));
  // 显式按宿主尺寸初始化（默认取窗口大小；ResizeObserver 的初始回调不可依赖）
  if (host.clientWidth && host.clientHeight) {
    Graph.width(host.clientWidth).height(host.clientHeight);
  }
  if (typeof window !== 'undefined') window.__g3d = Graph; // 调试钩子（仅内存引用，不影响生产）
  Graph.controls().enableDamping = true;
  Graph.controls().dampingFactor = 0.06;
  Graph.controls().minDistance = 30;
  Graph.controls().maxDistance = 1050; // 始终留在星壳（r≥1200）内侧
  if (isMini) {
    // 氛围自转的预览窗：滚轮/平移留给页面，触屏完全不拦（pan-y 保证页面可滚）
    const c = Graph.controls();
    c.autoRotate = !reduced;
    c.autoRotateSpeed = 0.55;
    c.enableZoom = false;
    c.enablePan = false;
    if (isMobile) c.enabled = false;
    renderer.domElement.style.touchAction = 'pan-y';
    host.style.cursor = 'grab';
  }
  // 初始机位：不等收敛先给一个 NASA 式斜上视角（内置 zoomToFit 会把离群点和星壳都框进去，弃用）
  Graph.cameraPosition({ x: R * 0.9, y: R * 0.55, z: R * 2.2 }, { x: 0, y: 0, z: 0 }, 0);

  /* 自实现取景：4%-96% 分位包围盒（离群孤点不至于把主体推到天边），FOV 反推距离 */
  function fitCamera(ms) {
    const pts = nodes.filter((n) => n.x !== undefined);
    if (!pts.length) return;
    const q = (arr, p) => arr[Math.max(0, Math.min(arr.length - 1, Math.floor(arr.length * p)))];
    const xs = pts.map((n) => n.x).sort((a, b) => a - b);
    const ys = pts.map((n) => n.y).sort((a, b) => a - b);
    const zs = pts.map((n) => n.z).sort((a, b) => a - b);
    const c = {
      x: (q(xs, 0.04) + q(xs, 0.96)) / 2,
      y: (q(ys, 0.04) + q(ys, 0.96)) / 2,
      z: (q(zs, 0.04) + q(zs, 0.96)) / 2,
    };
    const ext = Math.max(q(xs, 0.96) - q(xs, 0.04), q(ys, 0.96) - q(ys, 0.04), q(zs, 0.96) - q(zs, 0.04));
    const cam = Graph.camera();
    const dist = Math.min(1000, ((ext / 2) * 1.5) / Math.tan(((cam.fov / 2) * Math.PI) / 180) + 60);
    // 保持当前观察方向，只调整距离与目标
    const dir = cam.position.clone().sub(Graph.controls().target).normalize();
    if (!dir.lengthSq()) dir.set(0.35, 0.25, 1).normalize();
    const p = dir.multiplyScalar(dist);
    Graph.cameraPosition({ x: c.x + p.x, y: c.y + p.y, z: c.z + p.z }, c, ms);
  }

  /* ---------- 力参数（语义对齐 2D 版：hub 边减弱、孤点强锚定；全部读 params 支持运行时调节） ----------
     注意：d3-force 的 strength 访问器在 .strength() 调用时缓存逐节点值，
     所以 setParams 后必须重新 set 一遍同一个访问器才会生效。 */
  const ax = (n) => anchor[n.cluster].x;
  const ay = (n) => anchor[n.cluster].y;
  const az = (n) => anchor[n.cluster].z;
  const anchorStrength = (n) => ((n.deg || 0) === 0 ? Math.min(0.6, params.anchor * 2.5) : params.anchor);
  Graph.d3Force('x', forceX(ax));
  Graph.d3Force('y', forceY(ay));
  Graph.d3Force('z', forceZ(az));
  function applyPhysics() {
    Graph.d3Force('charge').strength(params.charge).distanceMax(300);
    Graph.d3Force('link')
      .distance(params.linkDistance)
      .strength((l) => (params.linkStrength * 0.6) / Math.min(degOf(l.source), degOf(l.target)) ** 0.6);
    Graph.d3Force('x').strength(anchorStrength);
    Graph.d3Force('y').strength(anchorStrength);
    Graph.d3Force('z').strength(anchorStrength);
  }
  applyPhysics();

  /* ---------- NASA Eyes 视觉层 ---------- */
  const scene = Graph.scene();
  scene.fog = new THREE.FogExp2(new THREE.Color(BG), 0.00052);
  const starfield = makeStarfield();
  scene.add(starfield);
  let bloom = null;
  if (!isMobile) {
    bloom = new UnrealBloomPass(
      new THREE.Vector2(host.clientWidth || 800, host.clientHeight || 600),
      isMini ? 0.55 : 0.72, // strength（过高会把聚类色洗成白心；预览窗更轻）
      0.42, // radius
      0.18 // threshold：节点 emissive 发光、星点微光
    );
    Graph.postProcessingComposer().addPass(bloom);
  }

  function makeStarfield() {
    const N = isMini ? 500 : isMobile ? 800 : 1500;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      // 球壳分布 r ∈ [1200, 2600]，远离图主体
      const r = 1200 + Math.random() * 1400;
      const phi = Math.acos(2 * Math.random() - 1);
      const th = Math.random() * Math.PI * 2;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(th);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x9fb6d8,
      size: 1.5,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      fog: false,
    });
    return new THREE.Points(geo, mat);
  }

  /* ---------- 节点：共享几何球体（emissive 喂 bloom）+ 懒挂标签 sprite ---------- */
  const sphereGeo = new THREE.SphereGeometry(1, isMobile ? 10 : 14, isMobile ? 7 : 10);
  function nodeObj(n) {
    const mat = new THREE.MeshLambertMaterial({
      color: color(n),
      emissive: color(n),
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.95,
    });
    const mesh = new THREE.Mesh(sphereGeo, mat);
    mesh.scale.setScalar(radius(n) * params.nodeScale);
    const g = new THREE.Group();
    g.add(mesh);
    n.__mat = mat;
    n.__mesh = mesh;
    n.__group = g;
    return g;
  }
  function ensureSprite(n) {
    if (n.__sprite) return n.__sprite;
    const s = new SpriteText(n.title, 4.2, '#D7E3F4');
    s.fontFace = "'PingFang SC','Hiragino Sans GB','Noto Sans SC',sans-serif";
    s.fontWeight = '500';
    s.strokeWidth = 1.6;
    s.strokeColor = 'rgba(0,0,5,0.92)';
    s.material.depthWrite = false;
    s.material.fog = false;
    s.position.y = radius(n) * params.nodeScale + 5;
    s.visible = false;
    n.__group.add(s);
    n.__sprite = s;
    return s;
  }
  function applyNodeScale() {
    for (const n of nodes) {
      if (n.__mesh) n.__mesh.scale.setScalar(radius(n) * params.nodeScale);
      if (n.__sprite) n.__sprite.position.y = radius(n) * params.nodeScale + 5;
    }
  }

  /* ---------- 高亮状态机：node / cluster / search 三态（语义复刻 2D applyState） ---------- */
  let state = { type: null, value: null };
  const litNode = (n) => {
    if (state.type === 'node') return n.id === state.value || adj[state.value].has(n.id);
    if (state.type === 'cluster') return n.cluster === state.value;
    if (state.type === 'search') return state.value.has(n.id);
    return true;
  };
  function linkColorFn(l) {
    const sid = typeof l.source === 'object' ? l.source.id : l.source;
    const tid = typeof l.target === 'object' ? l.target.id : l.target;
    if (state.type === 'node') {
      return sid === state.value || tid === state.value ? LINK_LIT : LINK_DIM;
    }
    if (state.type) {
      const ns = nodes[sid], nt = nodes[tid];
      return litNode(ns) && litNode(nt) ? LINK_LIT : LINK_DIM;
    }
    return LINK_BASE;
  }
  function applyState() {
    for (const n of nodes) {
      if (!n.__mat) continue;
      const lit = litNode(n);
      n.__mat.opacity = lit ? 1 : 0.08;
      n.__mat.emissiveIntensity = lit ? (state.type ? 0.9 : 0.55) : 0.05;
      // 选中节点：NASA 青色描边感（emissive 切到青色）
      if (state.type === 'node' && n.id === state.value) {
        n.__mat.emissive.set(CYAN);
        n.__mat.emissiveIntensity = 1.1;
      } else {
        n.__mat.emissive.set(color(n));
      }
    }
    Graph.linkColor(linkColorFn); // 重设访问器触发 link 重着色
    updateLabels();
    opts.onStateChange?.(state);
  }
  function setState(type, value) {
    state = type === null ? { type: null, value: null } : { type, value };
    applyState();
  }

  /* ---------- 标签 LOD：hub 常显 ∪ 高亮集 ∪ 近距渐显；屏幕网格防堆叠 ---------- */
  const hubs = new Set(
    [...nodes]
      .sort((a, b) => (b.deg || 0) - (a.deg || 0))
      .slice(0, 24)
      .map((n) => n.id)
  );
  for (const cid of clusterIds) {
    const top = nodes.filter((n) => n.cluster === cid).sort((a, b) => (b.deg || 0) - (a.deg || 0))[0];
    if (top) hubs.add(top.id);
  }
  const baseMaxLabels = isMini ? 12 : isMobile ? 28 : 60;
  let maxLabels = baseMaxLabels;
  const GRID_X = 10, GRID_Y = 7;
  const proj = new THREE.Vector3();
  function updateLabels() {
    const cam = Graph.camera();
    if (!cam) return;
    const camPos = cam.position;
    // 优先级：选中 3 > 邻域/搜索命中 2 > hub 1 > 近距 0（mini 不开近距档，预览窗保持干净）
    const cand = [];
    for (const n of nodes) {
      if (n.x === undefined) continue;
      const d = Math.hypot(n.x - camPos.x, n.y - camPos.y, n.z - camPos.z);
      let pr = -1;
      if (state.type === 'node' && n.id === state.value) pr = 3;
      else if (state.type === 'node' && adj[state.value].has(n.id)) pr = 2;
      else if (state.type === 'search' && state.value.has(n.id) && state.value.size <= 25) pr = 2;
      else if (state.type === 'cluster' && n.cluster === state.value && hubs.has(n.id)) pr = 2;
      else if (state.type === null && hubs.has(n.id)) pr = 1;
      else if (!isMini && state.type === null && d < R * 1.1) pr = 0;
      if (pr >= 0) cand.push({ n, d, pr });
    }
    cand.sort((a, b) => b.pr - a.pr || a.d - b.d);
    const grid = new Set();
    const show = new Set();
    for (const { n, d } of cand) {
      if (show.size >= maxLabels) break;
      proj.set(n.x, n.y, n.z).project(cam);
      if (proj.z > 1) continue; // 相机背后
      const gx = Math.floor(((proj.x + 1) / 2) * GRID_X);
      const gy = Math.floor(((proj.y + 1) / 2) * GRID_Y);
      const cell = gx + gy * GRID_X;
      if (grid.has(cell)) continue;
      grid.add(cell);
      show.add(n.id);
      const s = ensureSprite(n);
      s.visible = true;
      // 距离渐隐：近处全显，超过 2.2R 淡出
      s.material.opacity = Math.max(0.25, Math.min(1, 2.2 - d / (R * 1.05)));
    }
    for (const n of nodes) {
      if (n.__sprite && !show.has(n.id)) n.__sprite.visible = false;
    }
  }
  const lodTimer = setInterval(updateLabels, 180);

  /* ---------- ready：深链必须等首轮收敛（否则相机飞向还在乱跑的坐标） ---------- */
  let readyResolve;
  const ready = new Promise((r) => (readyResolve = r));
  let engineStopped = false;
  Graph.onEngineStop(() => {
    if (!engineStopped) {
      engineStopped = true;
      fitCamera(reduced ? 0 : 650);
      setTimeout(() => readyResolve?.(), reduced ? 30 : 700);
    }
  });

  /* ---------- 相机控制 ---------- */
  function zoomBy(f) {
    const cam = Graph.camera();
    const t = Graph.controls().target;
    const v = cam.position.clone().sub(t).multiplyScalar(f);
    const p = t.clone().add(v);
    Graph.cameraPosition({ x: p.x, y: p.y, z: p.z }, t, reduced ? 0 : 280);
  }
  function focusNode(slug) {
    const n = bySlug.get(slug);
    if (!n || n.x === undefined) return n || null;
    setState('node', n.id);
    const len = Math.hypot(n.x, n.y, n.z) || 1;
    const k = 1 + 95 / len;
    Graph.cameraPosition({ x: n.x * k, y: n.y * k, z: n.z * k }, { x: n.x, y: n.y, z: n.z }, FLY_MS);
    return n;
  }

  /* ---------- resize ---------- */
  const ro = new ResizeObserver(() => {
    Graph.width(host.clientWidth).height(host.clientHeight);
    bloom?.setSize(host.clientWidth, host.clientHeight);
  });
  ro.observe(host);

  /* ---------- 控制器（与 2D 同形） ---------- */
  return {
    ready,
    highlightCluster(cid) {
      setState(cid === null ? null : 'cluster', cid);
    },
    search(term) {
      const t = term.trim().toLowerCase();
      if (!t) {
        setState(null);
        return 0;
      }
      const hits = new Set();
      for (const n of nodes) if (n.title.toLowerCase().includes(t)) hits.add(n.id);
      setState('search', hits);
      return hits.size;
    },
    zoomIn() {
      zoomBy(0.68);
    },
    zoomOut() {
      zoomBy(1.47);
    },
    fit() {
      fitCamera(reduced ? 0 : 600);
    },
    reset() {
      setState(null);
      fitCamera(reduced ? 0 : 700);
    },
    focusNode,
    nodeBySlug: (slug) => bySlug.get(slug) || null,
    getParams: () => ({ ...params }),
    /* 运行时调参：物理项重设力并 reheat，视觉项直接改材质/精灵；传 null 重置为默认 */
    setParams(p) {
      const prev = { ...params };
      Object.assign(params, p || GRAPH_PARAM_DEFAULTS);
      const physicsChanged = ['charge', 'linkDistance', 'linkStrength', 'anchor'].some(
        (k) => params[k] !== prev[k]
      );
      if (physicsChanged) {
        applyPhysics();
        Graph.d3ReheatSimulation();
      }
      if (params.nodeScale !== prev.nodeScale) applyNodeScale();
      maxLabels = Math.round(baseMaxLabels * params.labelDensity);
      updateLabels();
    },
    destroy() {
      // View Transitions 下页面永不卸载：不显式丢 GL context，反复进出会撞浏览器 8-16 个上限
      clearInterval(lodTimer);
      ro.disconnect();
      Graph.pauseAnimation();
      scene.traverse((o) => {
        o.geometry?.dispose?.();
        const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        ms.forEach((m) => {
          m.map?.dispose?.();
          m.dispose?.();
        });
      });
      sphereGeo.dispose();
      starfield.geometry.dispose();
      starfield.material.dispose();
      Graph.controls().dispose?.();
      Graph._destructor?.();
      renderer.dispose();
      renderer.forceContextLoss();
      host.replaceChildren();
    },
  };
}

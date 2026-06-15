// 标签 LOD 驱动：移植自 graph-view3d.js 的 updateLabels（hub 常显 ∪ 高亮集 ∪ 近距渐显，
// 10×7 屏幕网格去重，上限桌面60/移动28/mini12，距离渐隐）。聚合渲染器没有 per-node 场景图对象，
// 故这里用 renderer.projectNode(i,w,h) 拿屏幕坐标，再调 renderer.labels 直接定位 DOM。
//
// 与 graph-view3d 的对应：
//   · hubs：度数 top24 ∪ 每 cluster 度数第一（构造期算一次，传入）
//   · 优先级：选中 3 > 邻域/搜索命中(≤25) 2 > cluster 高亮内 hub 2 > hub 1 > 近距(非 mini) 0
//   · 网格去重：屏幕投影落同格只留优先级最高/最近的
//   · 距离渐隐：opacity = clamp(2.2 - d/(R·1.05), 0.3, 1)
//   · maxLabels：基准×labelDensity（mini 12 / mobile 28 / desktop 60）
//
// state 形状（mount/wrapper 共用）：{ type: null|'node'|'cluster'|'search', value }
//   node → value=选中下标；cluster → value=clusterId；search → value=Set<下标>

const GRID_X = 10;
const GRID_Y = 7;

export class LabelLOD {
  /**
   * @param {import('./renderer.js').AggregateRenderer} renderer
   * @param {{nodes:any[]}} data 渲染索引空间（下标=渲染下标）
   * @param {Set<number>[]} adj 邻接表（渲染下标）
   * @param {() => {w:number,h:number}} getSize 宿主逻辑尺寸
   * @param {() => any} getState 当前高亮状态
   * @param {{ baseMax:number, radius:number, mini:boolean }} opts
   */
  constructor(renderer, data, adj, getSize, getState, opts) {
    this.renderer = renderer;
    this.data = data;
    this.adj = adj;
    this.getSize = getSize;
    this.getState = getState;
    this.radius = opts.radius;
    this.mini = !!opts.mini;
    this.baseMax = opts.baseMax;
    this.maxLabels = opts.baseMax;
    /** @type {Set<number>} 当前可见标签的节点下标（reposition 每帧重投影用） */
    this.shown = new Set();
    // hubs：度数 top24 ∪ 每 cluster 度数第一
    const byDeg = [...data.nodes.keys()].sort(
      (a, b) => (data.nodes[b].degree || 0) - (data.nodes[a].degree || 0),
    );
    this.hubs = new Set(byDeg.slice(0, 24));
    const bestPerCluster = new Map();
    data.nodes.forEach((n, i) => {
      const cur = bestPerCluster.get(n.cluster);
      if (cur === undefined || (n.degree || 0) > (data.nodes[cur].degree || 0)) {
        bestPerCluster.set(n.cluster, i);
      }
    });
    for (const i of bestPerCluster.values()) this.hubs.add(i);
  }

  setDensity(labelDensity) {
    this.maxLabels = Math.max(1, Math.round(this.baseMax * labelDensity));
  }

  /** 每帧（或节流）调用：算可见集 + 定位 + 渐隐 */
  update() {
    const labels = this.renderer.labels;
    if (!labels) return;
    const { w, h } = this.getSize();
    if (w < 2 || h < 2) return;
    const state = this.getState();
    const cam = this.renderer.camera;
    const camPos = cam.position;
    const nodes = this.data.nodes;
    const R = this.radius;

    // 候选 + 优先级 + 相机距离（语义对齐 graph-view3d updateLabels）
    const cand = [];
    for (let i = 0; i < nodes.length; i++) {
      const x = this.renderer.positions[i * 3] ?? 0;
      const y = this.renderer.positions[i * 3 + 1] ?? 0;
      const z = this.renderer.positions[i * 3 + 2] ?? 0;
      const d = Math.hypot(x - camPos.x, y - camPos.y, z - camPos.z);
      let pr = -1;
      if (state.type === 'node' && i === state.value) pr = 3;
      else if (state.type === 'node' && this.adj[state.value]?.has(i)) pr = 2;
      else if (state.type === 'search' && state.value?.has?.(i) && state.value.size <= 25) pr = 2;
      else if (state.type === 'cluster' && nodes[i].cluster === state.value && this.hubs.has(i)) pr = 2;
      else if (state.type === null && this.hubs.has(i)) pr = 1;
      else if (!this.mini && state.type === null && d < R * 1.1) pr = 0;
      if (pr >= 0) cand.push({ i, d, pr });
    }
    cand.sort((a, b) => b.pr - a.pr || a.d - b.d);

    const grid = new Set();
    const shown = new Set();
    for (const { i, d } of cand) {
      if (shown.size >= this.maxLabels) break;
      const p = this.renderer.projectNode(i, w, h);
      if (p.behind) continue;
      const gx = Math.floor((p.x / w) * GRID_X);
      const gy = Math.floor((p.y / h) * GRID_Y);
      const cell = gx + gy * GRID_X;
      if (grid.has(cell)) continue;
      grid.add(cell);
      shown.add(i);
      const el = labels.ensure(i, nodes[i].title || nodes[i].name || '');
      const opacity = Math.max(0.3, Math.min(1, 2.2 - d / (R * 1.05)));
      const sel = state.type === 'node' && i === state.value;
      labels.show(el, p.x, p.y, opacity, sel);
    }
    // 隐藏未入选的
    for (const [i, el] of labels.els) {
      if (!shown.has(i)) labels.hide(el);
    }
    this.shown = shown;
  }

  /** 每帧轻量重投影：只更新当前可见标签的屏幕位置（≤maxLabels 个 transform 写入），
   *  避免相机移动时标签滞后 update() 的节流间隔；不重算选择集。 */
  reposition() {
    const labels = this.renderer.labels;
    if (!labels || this.shown.size === 0) return;
    const { w, h } = this.getSize();
    if (w < 2 || h < 2) return;
    const camPos = this.renderer.camera.position;
    const R = this.radius;
    for (const i of this.shown) {
      const el = labels.els.get(i);
      if (!el) continue;
      const p = this.renderer.projectNode(i, w, h);
      if (p.behind) {
        labels.hide(el);
        continue;
      }
      const x = this.renderer.positions[i * 3] ?? 0;
      const y = this.renderer.positions[i * 3 + 1] ?? 0;
      const z = this.renderer.positions[i * 3 + 2] ?? 0;
      const d = Math.hypot(x - camPos.x, y - camPos.y, z - camPos.z);
      const opacity = Math.max(0.3, Math.min(1, 2.2 - d / (R * 1.05)));
      labels.setScreen(el, p.x, p.y);
      el.style.opacity = String(opacity);
    }
  }
}

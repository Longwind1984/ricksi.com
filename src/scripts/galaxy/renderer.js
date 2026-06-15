import {
  ACESFilmicToneMapping,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  LineBasicMaterial,
  LineSegments,
  NoToneMapping,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { BLOOM_DEFAULTS, NODE_BASE_RADIUS, NODE_MAX_RADIUS, STARFIELD_ROTATION_RAD_PER_S } from './constants.js';
import { NODE_FRAGMENT_SHADER, NODE_VERTEX_SHADER } from './shaders.js';
import { linkColor, fallbackColorFn } from './palette.js';
import { buildStarfield, disposeStarfield } from './starfield.js';
import { DEEP_SPACE } from './presets.js';
import { LabelLayer } from './labelLayer.js';

// 移植自 galaxy-view src/render/AggregateRenderer.ts（672 行，聚合渲染心脏）——剥 TS 类型，
// 去掉 QualityTier/VisualTokens/NodeColorFn/GraphData 等 type import，改 JSDoc + 本地 JS 模块。
// 着色默认走 ./palette.js 的 clusterColorFn（按 GRAPH_PALETTE，对齐设计系统 v2 钴蓝之夜）。
// 全场景 <10 draw call：节点 1×Points、链接 1×LineSegments、星空 3×Points、选中高亮 1×LineSegments。

const FOCUS_DIM = 0.12;
const FOCUS_FADE_S = 0.28;

export class AggregateRenderer {
  constructor(container, graphRadiusEstimate) {
    this.scene = new Scene();

    this.nodePoints = null;
    this.nodeMaterial = null;
    this.nodeGeometry = null;
    this.linkSegments = null;
    this.linkGeometry = null;
    this.linkMaterial = null;
    this.selSegments = null;
    this.selGeometry = null;
    this.selMaterial = null;
    this.selLinkIdx = [];
    this.twinkleFreq = 0.5;
    this.motes = null;
    this.reveal = null;
    this.revealBuf = new Float32Array(0);

    this.data = { nodes: [], links: [] };
    this.positions = new Float32Array(0);
    this.sizes = new Float32Array(0);
    this.dimCurrent = new Float32Array(0);
    this.dimTarget = new Float32Array(0);
    this.dimAnimating = false;

    this.colorFn = fallbackColorFn;
    this.tokens = DEEP_SPACE;
    this.tierBloomAllowed = true;
    this.lastW = 2;
    this.lastH = 2;
    this.baseLinkOpacity = 0.16;
    this.focusActive = false;

    this.projVec = new Vector3();
    this.pixelScale = 1;
    this.nodeScale = 1;
    this.sizeMode = 'degree';

    this.graphRadiusEstimate = graphRadiusEstimate;
    this.container = container;
    this.renderer = new WebGLRenderer({ antialias: false, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.info.autoReset = false;
    // 画布定位（绝对填充）→ CSS2D 标签层可叠加同坐标系
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.inset = '0';
    container.appendChild(this.renderer.domElement);

    // 标签叠加层（CSS2DRenderer DOM；不进 bloom）。LOD 由 mount 驱动。
    this.labels = new LabelLayer(container);

    this.scene.background = new Color(this.tokens.background);
    this.camera = new PerspectiveCamera(60, 1, 0.5, 50_000);

    const sf = buildStarfield(graphRadiusEstimate * 6.5);
    this.starfield = sf.group;
    this.twinkler = sf.twinkler;
    this.scene.add(this.starfield);

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.bloomPass = new UnrealBloomPass(
      new Vector2(2, 2),
      BLOOM_DEFAULTS.strength,
      BLOOM_DEFAULTS.radius,
      BLOOM_DEFAULTS.threshold,
    );
    this.outputPass = new OutputPass();
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.outputPass);
  }

  // ---------- 数据与颜色 ----------

  setColorFn(fn) {
    this.colorFn = fn;
  }

  setData(data, positions) {
    this.data = data;
    this.positions = positions;
    this.disposeGraphObjects();

    const n = data.nodes.length;
    const m = data.links.length;

    // —— 节点 ——
    const nodePos = new Float32Array(n * 3);
    nodePos.set(positions.subarray(0, n * 3));
    const ghost = new Float32Array(n);
    this.sizes = new Float32Array(n);
    this.dimCurrent = new Float32Array(n).fill(1);
    this.dimTarget = new Float32Array(n).fill(1);
    for (let i = 0; i < n; i++) {
      const node = data.nodes[i];
      if (!node) continue;
      ghost[i] = node.unresolved ? 1 : 0;
      this.sizes[i] = this.computeSize(node);
    }
    this.nodeGeometry = new BufferGeometry();
    this.nodeGeometry.setAttribute('position', new BufferAttribute(nodePos, 3));
    this.nodeGeometry.setAttribute('color', new BufferAttribute(new Float32Array(n * 3), 3));
    this.nodeGeometry.setAttribute('aSize', new BufferAttribute(this.sizes, 1));
    this.nodeGeometry.setAttribute('aGhost', new BufferAttribute(ghost, 1));
    this.nodeGeometry.setAttribute('aDim', new BufferAttribute(this.dimCurrent, 1));
    this.nodeMaterial = new ShaderMaterial({
      vertexShader: NODE_VERTEX_SHADER,
      fragmentShader: NODE_FRAGMENT_SHADER,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uPixelScale: { value: this.pixelScale },
        uSizeMul: { value: this.nodeScale },
        uLightMode: { value: this.tokens.lightMode ? 1 : 0 },
        uMaxPoint: { value: 110 * this.renderer.getPixelRatio() },
      },
    });
    this.nodePoints = new Points(this.nodeGeometry, this.nodeMaterial);
    this.nodePoints.renderOrder = 1; // 节点永远盖住链接网
    this.nodePoints.frustumCulled = false;
    this.scene.add(this.nodePoints);

    // —— 链接 ——
    this.linkGeometry = new BufferGeometry();
    this.linkGeometry.setAttribute('position', new BufferAttribute(new Float32Array(m * 2 * 3), 3));
    this.linkGeometry.setAttribute('color', new BufferAttribute(new Float32Array(m * 2 * 3), 3));
    this.linkMaterial = new LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: this.effectiveLinkOpacity(),
      depthWrite: false,
    });
    this.linkSegments = new LineSegments(this.linkGeometry, this.linkMaterial);
    this.linkSegments.renderOrder = 0;
    this.linkSegments.frustumCulled = false;
    this.scene.add(this.linkSegments);

    this.recolor();
    this.updatePositions();
    this.setSelectedLinks(this.selLinkIdx); // 数据重建后恢复高亮层
  }

  computeSize(node) {
    switch (this.sizeMode) {
      case 'fileSize':
        return Math.min(
          Math.max(NODE_BASE_RADIUS * (0.7 + 1.1 * Math.cbrt(node.fileSize / 4096)), 1.6),
          NODE_MAX_RADIUS,
        );
      case 'uniform':
        return NODE_BASE_RADIUS * 1.3;
      default:
        return Math.min(NODE_BASE_RADIUS * (1 + 0.5 * Math.sqrt(node.degree)), NODE_MAX_RADIUS);
    }
  }

  setSizeMode(mode) {
    this.sizeMode = mode;
    if (!this.nodeGeometry) return;
    for (let i = 0; i < this.data.nodes.length; i++) {
      const node = this.data.nodes[i];
      if (node) this.sizes[i] = this.computeSize(node);
    }
    this.nodeGeometry.getAttribute('aSize').needsUpdate = true;
  }

  /** 创世动画：节点从中心按半径波次绽放到沉降坐标。 */
  playReveal(durMs = 2600) {
    const n = this.data.nodes.length;
    if (n === 0) return;
    let maxR = 1;
    for (let i = 0; i < n; i++) {
      const r = Math.hypot(
        this.positions[i * 3] ?? 0,
        this.positions[i * 3 + 1] ?? 0,
        this.positions[i * 3 + 2] ?? 0,
      );
      if (r > maxR) maxR = r;
    }
    if (this.revealBuf.length < n * 3) this.revealBuf = new Float32Array(n * 3);
    this.reveal = { t0: performance.now(), durMs, maxR };
  }

  stepReveal(now) {
    if (!this.reveal || !this.nodeGeometry || !this.linkGeometry) return;
    const { t0, durMs, maxR } = this.reveal;
    const p = (now - t0) / durMs;
    if (p >= 1) {
      this.reveal = null;
      this.updatePositions();
      if (this.linkMaterial) this.linkMaterial.opacity = this.effectiveLinkOpacity();
      return;
    }
    const n = this.data.nodes.length;
    const buf = this.revealBuf;
    const pos = this.positions;
    for (let i = 0; i < n; i++) {
      const x = pos[i * 3] ?? 0;
      const y = pos[i * 3 + 1] ?? 0;
      const z = pos[i * 3 + 2] ?? 0;
      const delay = (Math.hypot(x, y, z) / maxR) * 0.55; // 内圈先亮，波次向外
      const local = Math.min(Math.max((p - delay) / 0.45, 0), 1);
      const k = 1 - Math.pow(1 - local, 3); // easeOutCubic
      buf[i * 3] = x * k;
      buf[i * 3 + 1] = y * k;
      buf[i * 3 + 2] = z * k;
    }
    const nodeAttr = this.nodeGeometry.getAttribute('position');
    nodeAttr.array.set(buf.subarray(0, n * 3));
    nodeAttr.needsUpdate = true;
    const linkAttr = this.linkGeometry.getAttribute('position');
    const arr = linkAttr.array;
    const links = this.data.links;
    for (let li = 0; li < links.length; li++) {
      const l = links[li];
      if (!l) continue;
      const sI = l.source * 3;
      const tI = l.target * 3;
      const o = li * 6;
      arr[o] = buf[sI] ?? 0;
      arr[o + 1] = buf[sI + 1] ?? 0;
      arr[o + 2] = buf[sI + 2] ?? 0;
      arr[o + 3] = buf[tI] ?? 0;
      arr[o + 4] = buf[tI + 1] ?? 0;
      arr[o + 5] = buf[tI + 2] ?? 0;
    }
    linkAttr.needsUpdate = true;
    if (this.linkMaterial) this.linkMaterial.opacity = this.effectiveLinkOpacity() * Math.min(p * 1.6, 1);
  }

  get revealing() {
    return this.reveal !== null;
  }

  /** 配色/视觉方向变化时重算颜色（不动坐标） */
  recolor() {
    if (!this.nodeGeometry || !this.linkGeometry) return;
    const n = this.data.nodes.length;
    const nodeColAttr = this.nodeGeometry.getAttribute('color');
    const nodeCol = nodeColAttr.array;
    const resolved = new Array(n);
    const hsl = { h: 0, s: 0, l: 0 };
    for (let i = 0; i < n; i++) {
      const node = this.data.nodes[i];
      if (!node) continue;
      let c = this.colorFn(node).clone();
      if (this.tokens.nodeLightness !== null) {
        c.getHSL(hsl);
        c = c.setHSL(hsl.h, hsl.s * 0.95, this.tokens.nodeLightness);
      }
      resolved[i] = c;
      nodeCol[i * 3] = c.r;
      nodeCol[i * 3 + 1] = c.g;
      nodeCol[i * 3 + 2] = c.b;
    }
    nodeColAttr.needsUpdate = true;

    const linkColAttr = this.linkGeometry.getAttribute('color');
    const linkCol = linkColAttr.array;
    const ink = this.tokens.linkInk ? new Color(this.tokens.linkInk) : null;
    const fallback = new Color('#7a87a8');
    for (let li = 0; li < this.data.links.length; li++) {
      const l = this.data.links[li];
      if (!l) continue;
      const c = ink ?? linkColor(resolved[l.source] ?? fallback, resolved[l.target] ?? fallback);
      for (const v of [0, 1]) {
        linkCol[(li * 2 + v) * 3] = c.r;
        linkCol[(li * 2 + v) * 3 + 1] = c.g;
        linkCol[(li * 2 + v) * 3 + 2] = c.b;
      }
    }
    linkColAttr.needsUpdate = true;
  }

  /** 布局热时每帧调用：节点直拷，链接按索引 gather */
  updatePositions() {
    if (!this.nodeGeometry || !this.linkGeometry) return;
    const n = this.data.nodes.length;
    const nodeAttr = this.nodeGeometry.getAttribute('position');
    nodeAttr.array.set(this.positions.subarray(0, n * 3));
    nodeAttr.needsUpdate = true;

    const linkAttr = this.linkGeometry.getAttribute('position');
    const arr = linkAttr.array;
    const pos = this.positions;
    const links = this.data.links;
    for (let li = 0; li < links.length; li++) {
      const l = links[li];
      if (!l) continue;
      const s = l.source * 3;
      const t = l.target * 3;
      const o = li * 6;
      arr[o] = pos[s] ?? 0;
      arr[o + 1] = pos[s + 1] ?? 0;
      arr[o + 2] = pos[s + 2] ?? 0;
      arr[o + 3] = pos[t] ?? 0;
      arr[o + 4] = pos[t + 1] ?? 0;
      arr[o + 5] = pos[t + 2] ?? 0;
    }
    linkAttr.needsUpdate = true;
    this.updateSelPositions();
  }

  // ---------- 聚焦与选中高亮 ----------

  /** 聚焦模式：非邻居淡出（280ms 缓动） */
  setFocus(selected, neighbors) {
    const n = this.data.nodes.length;
    this.focusActive = neighbors !== null;
    for (let i = 0; i < n; i++) {
      this.dimTarget[i] = !neighbors || neighbors.has(i) || i === selected ? 1 : FOCUS_DIM;
    }
    this.dimAnimating = true;
    if (this.linkMaterial) this.linkMaterial.opacity = this.effectiveLinkOpacity();
  }

  /** 选中节点自身的链接 → 独立高亮层（全饱和、盖在最上） */
  setSelectedLinks(linkIndices) {
    this.selLinkIdx = linkIndices;
    if (this.selSegments) {
      this.scene.remove(this.selSegments);
      this.selGeometry?.dispose();
      this.selMaterial?.dispose();
      this.selSegments = null;
      this.selGeometry = null;
      this.selMaterial = null;
    }
    if (linkIndices.length === 0) return;
    const m = linkIndices.length;
    const pos = new Float32Array(m * 6);
    const col = new Float32Array(m * 6);
    const hsl = { h: 0, s: 0, l: 0 };
    for (let k = 0; k < m; k++) {
      const l = this.data.links[linkIndices[k] ?? -1];
      if (!l) continue;
      const sNode = this.data.nodes[l.source];
      const c = sNode ? this.colorFn(sNode).clone() : new Color('#9aa4b2');
      c.getHSL(hsl);
      c.setHSL(hsl.h, Math.min(hsl.s * 1.2, 1), this.tokens.lightMode ? 0.42 : 0.62);
      for (const v of [0, 1]) {
        col[k * 6 + v * 3] = c.r;
        col[k * 6 + v * 3 + 1] = c.g;
        col[k * 6 + v * 3 + 2] = c.b;
      }
    }
    this.selGeometry = new BufferGeometry();
    this.selGeometry.setAttribute('position', new BufferAttribute(pos, 3));
    this.selGeometry.setAttribute('color', new BufferAttribute(col, 3));
    this.selMaterial = new LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    this.selSegments = new LineSegments(this.selGeometry, this.selMaterial);
    this.selSegments.renderOrder = 2;
    this.selSegments.frustumCulled = false;
    this.scene.add(this.selSegments);
    this.updateSelPositions();
  }

  updateSelPositions() {
    if (!this.selGeometry || this.selLinkIdx.length === 0) return;
    const attr = this.selGeometry.getAttribute('position');
    const arr = attr.array;
    const pos = this.positions;
    for (let k = 0; k < this.selLinkIdx.length; k++) {
      const l = this.data.links[this.selLinkIdx[k] ?? -1];
      if (!l) continue;
      const s = l.source * 3;
      const t = l.target * 3;
      arr[k * 6] = pos[s] ?? 0;
      arr[k * 6 + 1] = pos[s + 1] ?? 0;
      arr[k * 6 + 2] = pos[s + 2] ?? 0;
      arr[k * 6 + 3] = pos[t] ?? 0;
      arr[k * 6 + 4] = pos[t + 1] ?? 0;
      arr[k * 6 + 5] = pos[t + 2] ?? 0;
    }
    attr.needsUpdate = true;
  }

  effectiveLinkOpacity() {
    const base = this.baseLinkOpacity * this.tokens.linkOpacityScale;
    return this.focusActive ? base * 0.25 : base;
  }

  // ---------- 视觉方向 ----------

  applyTokens(tokens, bloomStrengthFromSettings) {
    this.tokens = tokens;
    this.scene.background = new Color(tokens.background);
    this.starfield.visible = tokens.starfield;
    this.renderer.toneMapping = tokens.lightMode ? NoToneMapping : ACESFilmicToneMapping;
    if (this.nodeMaterial) {
      this.nodeMaterial.uniforms.uLightMode.value = tokens.lightMode ? 1 : 0;
    }
    this.bloomPass.enabled = tokens.bloomEnabled && this.tierBloomAllowed && bloomStrengthFromSettings > 0.001;
    if (tokens.motes && !this.motes) this.buildMotes();
    if (this.motes) this.motes.visible = tokens.motes;
    if (this.linkMaterial) this.linkMaterial.opacity = this.effectiveLinkOpacity();
    this.recolor();
    this.setSelectedLinks(this.selLinkIdx);
  }

  get currentTokens() {
    return this.tokens;
  }

  /** 晨昼模式的尘埃微粒：600 点、近大远小、缓慢漂移 */
  buildMotes() {
    const count = 600;
    const pos = new Float32Array(count * 3);
    const R = this.graphRadiusEstimate * 2.2;
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() * 2 - 1) * R;
      pos[i * 3 + 1] = (Math.random() * 2 - 1) * R;
      pos[i * 3 + 2] = (Math.random() * 2 - 1) * R;
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(pos, 3));
    const mat = new PointsMaterial({
      color: new Color('#d8d4cb'),
      size: 1.6,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    this.motes = new Points(geo, mat);
    this.motes.renderOrder = -1;
    this.scene.add(this.motes);
  }

  // ---------- 渲染循环 ----------

  render(deltaS) {
    this.starfield.rotation.y += STARFIELD_ROTATION_RAD_PER_S * deltaS;
    if (this.starfield.visible) this.twinkler.update(deltaS, this.twinkleFreq);
    if (this.motes?.visible) this.motes.rotation.y -= STARFIELD_ROTATION_RAD_PER_S * 2 * deltaS;
    if (this.dimAnimating) this.stepDim(deltaS);
    if (this.reveal) this.stepReveal(performance.now());
    this.renderer.info.reset();
    this.composer.render();
  }

  stepDim(deltaS) {
    const k = Math.min(deltaS / FOCUS_FADE_S, 1);
    let active = false;
    for (let i = 0; i < this.dimCurrent.length; i++) {
      const cur = this.dimCurrent[i] ?? 1;
      const tgt = this.dimTarget[i] ?? 1;
      const next = cur + (tgt - cur) * k;
      this.dimCurrent[i] = Math.abs(next - tgt) < 0.005 ? tgt : next;
      if (this.dimCurrent[i] !== tgt) active = true;
    }
    this.dimAnimating = active;
    if (this.nodeGeometry) {
      this.nodeGeometry.getAttribute('aDim').needsUpdate = true;
    }
  }

  get drawCalls() {
    return this.renderer.info.render.calls;
  }

  // ---------- 参数 ----------

  setBloomParams(p) {
    this.bloomPass.strength = p.strength;
    this.bloomPass.radius = p.radius;
    this.bloomPass.threshold = p.threshold;
    this.bloomPass.enabled = this.tokens.bloomEnabled && this.tierBloomAllowed && p.strength > 0.001;
  }

  getBloomStrength() {
    return this.bloomPass.enabled ? this.bloomPass.strength : 0;
  }

  setBloomStrength(v) {
    this.bloomPass.strength = v;
    this.bloomPass.enabled = this.tokens.bloomEnabled && this.tierBloomAllowed && v > 0.001;
  }

  /** 质量档位：pixelRatio / bloom 门控 / 星空密度，全部免重建即时生效。
   *  tier = { bloomAllowed, pixelRatioCap, starScale }（见 quality/tiers 形状）。 */
  applyTier(tier, bloomStrengthFromSettings) {
    this.tierBloomAllowed = tier.bloomAllowed;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, tier.pixelRatioCap));
    this.bloomPass.enabled = this.tokens.bloomEnabled && this.tierBloomAllowed && bloomStrengthFromSettings > 0.001;
    // 星空按档位密度重建（一次性，毫秒级）
    const visible = this.starfield.visible;
    const rotation = this.starfield.rotation.y;
    disposeStarfield(this.starfield);
    this.scene.remove(this.starfield);
    const sf = buildStarfield(this.graphRadiusEstimate * 6.5, tier.starScale);
    this.starfield = sf.group;
    this.twinkler = sf.twinkler;
    this.starfield.visible = visible;
    this.starfield.rotation.y = rotation;
    this.scene.add(this.starfield);
    this.resize(this.lastW, this.lastH); // pixelRatio 变化 → 重算 uPixelScale/uMaxPoint 与缓冲尺寸
    const u = this.nodeMaterial?.uniforms.uMaxPoint;
    if (u) u.value = 110 * this.renderer.getPixelRatio();
  }

  /** 单例复用：若新数据集的半径估计变化，重建星空到新尺度（同 applyTier 的星空逻辑）。 */
  reinitStarfield(radius) {
    if (radius === this.graphRadiusEstimate) return;
    this.graphRadiusEstimate = radius;
    const visible = this.starfield.visible;
    const rotation = this.starfield.rotation.y;
    disposeStarfield(this.starfield);
    this.scene.remove(this.starfield);
    const sf = buildStarfield(radius * 6.5);
    this.starfield = sf.group;
    this.twinkler = sf.twinkler;
    this.starfield.visible = visible;
    this.starfield.rotation.y = rotation;
    this.scene.add(this.starfield);
  }

  setLinkOpacity(v) {
    this.baseLinkOpacity = v;
    if (this.linkMaterial) this.linkMaterial.opacity = this.effectiveLinkOpacity();
  }

  setNodeScale(v) {
    this.nodeScale = v;
    const u = this.nodeMaterial?.uniforms.uSizeMul;
    if (u) u.value = v;
  }

  resize(w, h) {
    if (w < 2 || h < 2) return;
    this.lastW = w;
    this.lastH = h;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloomPass.resolution.set(w, h);
    this.labels?.setSize(w, h);
    const physH = h * this.renderer.getPixelRatio();
    this.pixelScale = physH / (2 * Math.tan(((this.camera.fov / 2) * Math.PI) / 180));
    const u = this.nodeMaterial?.uniforms.uPixelScale;
    if (u) u.value = this.pixelScale;
  }

  // ---------- 拾取与投影 ----------

  /** 投影到屏幕逻辑像素；z>1 = 在镜头后 */
  projectNode(i, w, h) {
    this.projVec.set(this.positions[i * 3] ?? 0, this.positions[i * 3 + 1] ?? 0, this.positions[i * 3 + 2] ?? 0);
    this.projVec.project(this.camera);
    return {
      x: ((this.projVec.x + 1) / 2) * w,
      y: ((1 - this.projVec.y) / 2) * h,
      behind: this.projVec.z > 1,
    };
  }

  /** 屏幕空间最近邻拾取（O(n) 仅在点击/节流 hover 时跑） */
  pickNearest(px, py, w, h, maxPx) {
    let best = -1;
    let bestDist = maxPx;
    for (let i = 0; i < this.data.nodes.length; i++) {
      const p = this.projectNode(i, w, h);
      if (p.behind) continue;
      const d = Math.hypot(p.x - px, p.y - py);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  }

  nodeRadius(i) {
    return this.sizes[i] ?? NODE_BASE_RADIUS;
  }

  nodePosition(i, out) {
    return out.set(this.positions[i * 3] ?? 0, this.positions[i * 3 + 1] ?? 0, this.positions[i * 3 + 2] ?? 0);
  }

  nodeColorHex(i) {
    const node = this.data.nodes[i];
    return node ? `#${this.colorFn(node).getHexString()}` : '#9aa4b2';
  }

  cameraDistanceTo(i) {
    this.projVec.set(this.positions[i * 3] ?? 0, this.positions[i * 3 + 1] ?? 0, this.positions[i * 3 + 2] ?? 0);
    return this.camera.position.distanceTo(this.projVec);
  }

  // ---------- 销毁合同 ----------

  disposeGraphObjects() {
    if (this.nodePoints) this.scene.remove(this.nodePoints);
    if (this.linkSegments) this.scene.remove(this.linkSegments);
    if (this.selSegments) {
      this.scene.remove(this.selSegments);
      this.selGeometry?.dispose();
      this.selMaterial?.dispose();
      this.selSegments = null;
      this.selGeometry = null;
      this.selMaterial = null;
    }
    this.nodeGeometry?.dispose();
    this.nodeMaterial?.dispose();
    this.linkGeometry?.dispose();
    this.linkMaterial?.dispose();
    this.nodePoints = null;
    this.linkSegments = null;
    this.nodeGeometry = null;
    this.linkGeometry = null;
    this.nodeMaterial = null;
    this.linkMaterial = null;
  }

  /**
   * 销毁合同（两档）：
   *  - 默认（keepRenderer=true，软销毁）：暂停后释放图几何/材质 + 星空 + motes，但【保留】
   *    WebGLRenderer / composer / 后处理 pass / camera / scene / 标签层容器 —— 不 forceContextLoss。
   *    理由对齐 graph-view3d.js：View Transitions 下页面永不卸载，反复 new+丢 context 会撞浏览器
   *    8–16 个 WebGL context 上限。配合 wrapper 的单例 + setData 换数据，全程只 1 个 context。
   *  - keepRenderer=false（硬销毁，仅页面真卸载/单元测试用）：额外释放 composer/pass + renderer + 丢上下文。
   */
  dispose({ keepRenderer = true } = {}) {
    this.disposeGraphObjects();
    this.labels?.hideAll();
    if (keepRenderer) {
      // 软销毁：星空 / motes / composer / context 全留——它们与数据集无关，下次 setData 直接复用。
      // （只释放 per-graph 的几何/材质，已由 disposeGraphObjects 完成。）
      return;
    }

    disposeStarfield(this.starfield);
    this.scene.remove(this.starfield);
    if (this.motes) {
      this.motes.geometry.dispose();
      this.motes.material.dispose();
      this.scene.remove(this.motes);
      this.motes = null;
    }
    this.labels?.dispose();
    this.labels = null;
    this.bloomPass.dispose();
    this.outputPass.dispose();
    this.renderPass.dispose();
    this.composer.dispose();
    this.renderer.dispose();
    try {
      this.renderer.forceContextLoss();
    } catch {
      // 上下文可能已丢失
    }
    this.renderer.domElement.remove();
  }
}

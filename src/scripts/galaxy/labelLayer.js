import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

// 标签叠加层：CSS2DRenderer DOM 标签（不进 bloom 后处理 → 文字零炫光、系统字体清晰）。
// 移植自本站 graph-view3d.js 的标签做法（.gx-label / .gx-label.sel 复用 glass.css），
// 但聚合渲染器没有 per-node THREE.Object3D，故标签锚到一个挂在 scene 上的 CSS2DObject，
// 每帧由 mount 的 LOD 逻辑算屏幕坐标后直接定位 DOM（绕开 CSS2DObject 的 matrixWorld 投影，
// 因为聚合渲染的节点坐标只在 Float32Array 里，没有场景图节点可挂）。
//
// 用法：renderer 持有一个实例；render() 里不需要调用 css2d.render()——本层自管 DOM 定位，
// 比走 CSS2DRenderer.render(scene,camera) 更省（无需为每个标签建场景图对象 + 每帧遍历 scene）。
// 只需 resize 时同步尺寸。LOD 选择、可见性、渐隐由 mount 驱动（它持有 adj/hubs/state）。

export class LabelLayer {
  constructor(container) {
    // 用 CSS2DRenderer 仅为复用其 DOM 容器约定（绝对定位、pointer-events:none、尺寸跟随）。
    // 实际不调用它的 render()——标签定位走 setLabelScreen() 手动写 transform，避免建场景图对象。
    this.css2d = new CSS2DRenderer();
    this.css2d.domElement.style.position = 'absolute';
    this.css2d.domElement.style.top = '0';
    this.css2d.domElement.style.left = '0';
    this.css2d.domElement.style.pointerEvents = 'none';
    this.css2d.domElement.style.overflow = 'hidden';
    container.appendChild(this.css2d.domElement);
    this.root = this.css2d.domElement;
    /** @type {Map<number, HTMLDivElement>} 节点下标 → 标签 DOM（懒建、复用） */
    this.els = new Map();
  }

  ensure(i, text) {
    let el = this.els.get(i);
    if (el) return el;
    el = document.createElement('div');
    el.className = 'gx-label';
    el.style.position = 'absolute';
    el.style.willChange = 'transform, opacity';
    el.textContent = text;
    el.style.display = 'none';
    this.root.appendChild(el);
    this.els.set(i, el);
    return el;
  }

  /** 写屏幕坐标（逻辑像素，左上原点）。
   *  内联 transform 会整体覆盖 CSS 的 transform，故把「水平居中 -50% + 文字上抬 -100%（.gx-label 原意）
   *  + 再上移 8px 离开节点」全部并入这一条，避免丢失 CSS 的 translateY(-100%)。 */
  setScreen(el, x, y) {
    el.style.transform = `translate(-50%, calc(-100% - 8px)) translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  show(el, x, y, opacity, sel) {
    this.setScreen(el, x, y);
    el.style.opacity = String(opacity);
    el.style.display = '';
    el.classList.toggle('sel', !!sel);
  }

  hide(el) {
    if (el.style.display !== 'none') el.style.display = 'none';
  }

  hideAll() {
    for (const el of this.els.values()) this.hide(el);
  }

  setSize(w, h) {
    this.css2d.setSize(w, h);
    this.root.style.width = `${w}px`;
    this.root.style.height = `${h}px`;
  }

  dispose() {
    for (const el of this.els.values()) el.remove();
    this.els.clear();
    this.root.remove();
  }
}

import { MOUSE, Spherical, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CRUISE, FLY_TO } from './constants.js';

// 移植自 galaxy-view src/interactions/CameraDirector.ts —— 剥 TS 类型，零 Obsidian 依赖。
// 注释里「不抢 Obsidian 全局快捷键」在本站等价为「画布聚焦时才吃 WASD/F/R」。

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * @typedef {Object} CameraHooks
 * @property {() => void} onFlyToSelected  F 键：飞向当前选中（无选中则忽略）
 * @property {() => void} onResetView      R 键：回总览
 */

const FLY_KEYS = new Set(['w', 'a', 's', 'd', 'q', 'e']);

/**
 * 镜头导演：轨道基底 + FPS 飞行 + 编排（点击/搜索飞行 tween、闲置巡航、F/R）。
 * 按键只在画布聚焦时生效（tabindex）。
 */
export class CameraDirector {
  constructor(camera, dom, hooks, opts = {}) {
    this.camera = camera;
    this.dom = dom;
    this.hooks = hooks;

    this.cruiseEnabled = opts.cruiseEnabled !== false;
    this.cruiseSpeed = 1;

    this.tween = null;
    this.lastInputAt = 0;
    this.cruiseAnchor = null;
    this.cruiseT = 0;
    this.cruiseDir = 1;
    this.pendingDensityDir = null;
    this.pressed = new Set();
    this.shiftHeld = false;
    this.tmpOffset = new Vector3();
    this.tmpSph = new Spherical();
    this.tmpDir = new Vector3();
    this.tmpRight = new Vector3();
    this.disposeFns = [];

    this.controls = new OrbitControls(camera, dom);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    if (opts.enableZoom === false) this.controls.enableZoom = false; // 嵌入页：滚轮留给页面滚动，不劫持
    if (opts.enablePan === false) this.controls.enablePan = false;
    if (opts.enabled === false) this.controls.enabled = false; // 移动端：不接管触屏手势（页面照常滚）
    if (opts.touchAction) dom.style.touchAction = opts.touchAction;
    this.lastInputAt = performance.now();

    dom.tabIndex = 0; // 画布可聚焦 → 键盘飞行不影响页面其他快捷键
    this.bindPointer();
    if (opts.enableKeys !== false) this.bindKeys(); // 嵌入页关掉 WASD/F/R，避免吃键盘
  }

  get target() {
    return this.controls.target;
  }

  markInput() {
    this.lastInputAt = performance.now();
    this.cruiseAnchor = null;
    this.tween = null; // 任何输入打断飞行（停在当前位置，不跳变）
  }

  bindPointer() {
    const onDown = (e) => {
      this.dom.focus();
      // Google Earth 式平移：⌘/Shift/Ctrl + 左键拖；右键拖原生就是平移
      this.controls.mouseButtons.LEFT = e.metaKey || e.shiftKey || e.ctrlKey ? MOUSE.PAN : MOUSE.ROTATE;
      this.markInput();
    };
    const onInput = () => this.markInput();
    this.dom.addEventListener('pointerdown', onDown, { capture: true });
    this.dom.addEventListener('wheel', onInput, { passive: true });
    this.dom.addEventListener('touchstart', onInput, { passive: true });
    this.disposeFns.push(() => {
      this.dom.removeEventListener('pointerdown', onDown, { capture: true });
      this.dom.removeEventListener('wheel', onInput);
      this.dom.removeEventListener('touchstart', onInput);
    });
  }

  bindKeys() {
    const onKeyDown = (e) => {
      const k = e.key.toLowerCase();
      this.shiftHeld = e.shiftKey;
      if (FLY_KEYS.has(k)) {
        this.pressed.add(k);
        this.markInput();
        e.preventDefault();
        e.stopPropagation();
      } else if (k === 'f') {
        this.hooks.onFlyToSelected();
        e.preventDefault();
      } else if (k === 'r') {
        this.hooks.onResetView();
        e.preventDefault();
      }
    };
    const onKeyUp = (e) => {
      this.shiftHeld = e.shiftKey;
      this.pressed.delete(e.key.toLowerCase());
    };
    const onBlur = () => this.pressed.clear();
    this.dom.addEventListener('keydown', onKeyDown);
    this.dom.addEventListener('keyup', onKeyUp);
    this.dom.addEventListener('blur', onBlur);
    this.disposeFns.push(() => {
      this.dom.removeEventListener('keydown', onKeyDown);
      this.dom.removeEventListener('keyup', onKeyUp);
      this.dom.removeEventListener('blur', onBlur);
    });
  }

  /** WASD/QE：相机与轨道目标同步平移，飞完仍可正常环绕 */
  applyFly(deltaS) {
    if (this.pressed.size === 0) return false;
    const dist = this.camera.position.distanceTo(this.controls.target);
    const speed = Math.min(Math.max(dist * 0.8, 10), 600) * (this.shiftHeld ? 3 : 1);
    const fwd = this.camera.getWorldDirection(this.tmpDir);
    this.tmpRight.crossVectors(fwd, this.camera.up).normalize();
    const move = new Vector3();
    if (this.pressed.has('w')) move.add(fwd);
    if (this.pressed.has('s')) move.sub(fwd);
    if (this.pressed.has('d')) move.add(this.tmpRight);
    if (this.pressed.has('a')) move.sub(this.tmpRight);
    if (this.pressed.has('e')) move.y += 1;
    if (this.pressed.has('q')) move.y -= 1;
    if (move.lengthSq() < 1e-8) return false;
    move.normalize().multiplyScalar(speed * deltaS);
    this.camera.position.add(move);
    this.controls.target.add(move);
    this.lastInputAt = performance.now();
    return true;
  }

  /** 初始机位：质心外 2.2×半径、仰角 +18° */
  setInitialFraming(graphRadius) {
    this.camera.position.copy(this.framingPosition(graphRadius));
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  framingPosition(graphRadius) {
    const d = graphRadius * 2.2;
    const elev = (18 * Math.PI) / 180;
    return new Vector3(d * Math.cos(elev), d * Math.sin(elev), d * 0.35);
  }

  /** R/回中心：平滑回总览 */
  resetView(graphRadius, onDone) {
    this.startTween(this.framingPosition(graphRadius), new Vector3(0, 0, 0), 1200, onDone);
  }

  /** 飞达节点后立即开始环绕，且旋转方向优先扫过邻居密集的一侧 */
  beginFocusOrbit(densityDir) {
    this.pendingDensityDir = densityDir;
    this.cruiseAnchor = null;
    this.lastInputAt = performance.now() - CRUISE.resumeDelayMs - 1;
  }

  flyTo(nodePos, nodeRadius, onDone) {
    const dist = Math.min(Math.max(nodeRadius * FLY_TO.distancePerRadius, FLY_TO.minDistance), FLY_TO.maxDistance);
    // 保持当前视角方向但偏转 15° 方位角——到达时不正对节点，邻域可见
    const dir = this.camera.position.clone().sub(nodePos);
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
    this.tmpSph.setFromVector3(dir);
    this.tmpSph.theta += FLY_TO.azimuthOffsetRad;
    this.tmpSph.radius = dist;
    const toPos = nodePos.clone().add(new Vector3().setFromSpherical(this.tmpSph));
    const travel = this.camera.position.distanceTo(toPos);
    const durMs = Math.min(Math.max(FLY_TO.minMs + FLY_TO.msPerWorldUnit * travel, FLY_TO.minMs), FLY_TO.maxMs);
    this.startTween(toPos, nodePos.clone(), durMs, onDone);
  }

  startTween(toPos, toTarget, durMs, onDone) {
    this.tween = {
      t0: performance.now(),
      durMs,
      fromPos: this.camera.position.clone(),
      toPos,
      fromTarget: this.controls.target.clone(),
      toTarget,
    };
    if (onDone) this.tween.onDone = onDone;
  }

  /** 每帧驱动；返回当前是否处于巡航中（HUD 显示用） */
  update(now, deltaS) {
    if (this.tween) {
      const tw = this.tween;
      const t = Math.min((now - tw.t0) / tw.durMs, 1);
      const k = easeInOutCubic(t);
      this.camera.position.lerpVectors(tw.fromPos, tw.toPos, k);
      this.controls.target.lerpVectors(tw.fromTarget, tw.toTarget, k);
      this.controls.update();
      if (t >= 1) {
        this.tween = null;
        tw.onDone?.();
        this.lastInputAt = now; // 到达后等满闲置时长再起巡航
      }
      return false;
    }

    const flying = this.applyFly(deltaS);

    const idleMs = now - this.lastInputAt;
    if (!flying && this.cruiseEnabled && idleMs > CRUISE.resumeDelayMs) {
      // 0→满速渐起，无顿挫
      const ramp = Math.min((idleMs - CRUISE.resumeDelayMs) / CRUISE.rampUpMs, 1);
      if (!this.cruiseAnchor) {
        this.cruiseAnchor = new Spherical().setFromVector3(
          this.tmpOffset.copy(this.camera.position).sub(this.controls.target),
        );
        this.cruiseT = 0;
        this.cruiseDir = 1;
        if (this.pendingDensityDir && this.pendingDensityDir.lengthSq() > 1e-6) {
          const densityTheta = new Spherical().setFromVector3(this.pendingDensityDir).theta;
          let delta = densityTheta - this.cruiseAnchor.theta;
          while (delta > Math.PI) delta -= 2 * Math.PI;
          while (delta < -Math.PI) delta += 2 * Math.PI;
          this.cruiseDir = delta >= 0 ? 1 : -1;
        }
        this.pendingDensityDir = null;
      }
      this.cruiseT += deltaS * ramp;
      const t = this.cruiseT;
      const a = this.cruiseAnchor;
      const elev = ((CRUISE.elevationDeg * Math.PI) / 180) * Math.sin((2 * Math.PI * t) / CRUISE.elevationPeriodS);
      const breath = 1 + CRUISE.radiusBreath * Math.sin((2 * Math.PI * t) / CRUISE.radiusPeriodS);
      this.tmpSph.radius = a.radius * breath;
      this.tmpSph.theta = a.theta + this.cruiseDir * CRUISE.angularSpeed * this.cruiseSpeed * t;
      this.tmpSph.phi = Math.min(Math.max(a.phi + elev, 0.05), Math.PI - 0.05);
      this.camera.position.setFromSpherical(this.tmpSph).add(this.controls.target);
      this.camera.lookAt(this.controls.target);
      return true;
    }

    this.controls.update();
    return false;
  }

  dispose() {
    this.tween = null;
    this.pressed.clear();
    for (const fn of this.disposeFns) fn();
    this.disposeFns = [];
    this.controls.dispose();
  }
}

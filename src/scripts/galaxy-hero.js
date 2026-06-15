// Galaxy View 落地页 · 程序化星云 hero（观感复刻演示，非真实笔记数据）
// ⚠ 本文件是本页唯一允许 import three 的地方，且只能被 galaxy-page.js 动态 import——
//   静态 import 会把 ~1MB 的 three 打进落地页首发 chunk。
//
// 设计意图：用产品本身的「聚合渲染」手法复刻观感——
//   全部节点 = 1 次 THREE.Points（自定义发光球 shader）；全部链接 = 1 次 LineSegments；
//   星空 3 档；UnrealBloom 后处理。整帧 draw call 个位数。
//   这是为「星云观感」程序化生成的演示场景，不含任何真实笔记数据。
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/* 6 组配色主题（按黑底呈现效果挑选；对应产品里的 colorThemes）。
   bg 用近黑非纯黑——bloom 衰减需要一点底色。 */
export const THEMES = [
  { name: '钴蓝之夜', en: 'COBALT NIGHT', bg: '#000308', link: '#5a6fb0', bloom: 0.95,
    palette: ['#7e9bff', '#9fb6e6', '#c9d6f2', '#f0cf7a', '#02bfe7'] },
  { name: '哈勃深空', en: 'HUBBLE', bg: '#000305', link: '#4a5d7a', bloom: 1.0,
    palette: ['#7fd4ff', '#ffb37a', '#c79bff', '#fff0c2', '#9be0d2'] },
  { name: '极光', en: 'AURORA', bg: '#00060c', link: '#2f6f6a', bloom: 1.0,
    palette: ['#3ef0a8', '#7ad8ff', '#b9ffe0', '#6f8cf0', '#d6fff0'] },
  { name: '落日胶片', en: 'SUNSET FILM', bg: '#0a0306', link: '#6e3a4a', bloom: 1.05,
    palette: ['#ff7e6b', '#ffb85c', '#ff5ca8', '#ffd98a', '#ffe9cf'] },
  { name: '赛博都市', en: 'CYBERPUNK', bg: '#03000a', link: '#4a2f6b', bloom: 1.12,
    palette: ['#00e6ff', '#ff2bd6', '#7c5cff', '#d6faff', '#ffd166'] },
  { name: '黑客帝国', en: 'MATRIX', bg: '#000400', link: '#1f5a36', bloom: 0.9,
    palette: ['#39ff8a', '#9dffc4', '#1fae5a', '#caffd9', '#5effa0'] },
];

/* 确定性随机：同一种子永远生成同一座星系 */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function initGalaxyHero(host, opts = {}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const mobile = coarse || (host.clientWidth || innerWidth) < 640;

  const W = () => host.clientWidth || 800;
  const H = () => host.clientHeight || 480;

  const N = mobile ? 560 : 1500;        // 节点数（移动端降级，镜像产品 mobile 档）
  const R = 132;                         // 盘半径
  const ARMS = 3;
  const rng = mulberry32(20260615);
  let themeIdx = opts.theme ?? 0;
  let theme = THEMES[themeIdx];
  let bloomOn = true;                    // 默认开辉光——星云观感的关键（关掉会发扁）

  /* ---------- renderer ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: false, powerPreference: 'high-performance' });
  const PR = Math.min(mobile ? 1.5 : 2, devicePixelRatio || 1);
  renderer.setPixelRatio(PR);
  renderer.setSize(W(), H());
  renderer.toneMapping = THREE.NoToneMapping;
  host.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.touchAction = 'pan-y'; // 触屏纵向滚动永远放行

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(56, W() / H(), 1, 6000);
  camera.position.set(6, 78, 252);

  /* ---------- 节点：1 次 THREE.Points + 发光球 shader ---------- */
  const positions = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  const sizes = new Float32Array(N);
  const colorIdx = new Uint8Array(N);   // 记下取了 palette 哪一档，换主题时重着色
  const bright = new Uint8Array(N);     // 是否核心/枢纽亮星（混白）
  const node = [];                      // {x,y,z,arm,r} 供连线

  const WHITE = new THREE.Color('#ffffff');
  const tmp = new THREE.Color();
  function paintNode(i) {
    const slot = colorIdx[i];
    tmp.set(theme.palette[slot % theme.palette.length]);
    if (bright[i]) tmp.lerp(WHITE, 0.55);
    colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
  }

  for (let i = 0; i < N; i++) {
    const arm = i % ARMS;
    const r = R * Math.sqrt(rng());
    const swirl = r * 0.024;
    const spread = (rng() - 0.5) * (0.55 + (1 - r / R) * 0.8);
    const angle = arm * ((Math.PI * 2) / ARMS) + swirl + spread;
    const rr = r + (rng() - 0.5) * 16;
    const thick = 18 * Math.exp(-r / 46) + 3;        // 中心厚、外缘薄（扁平盘）
    const x = Math.cos(angle) * rr;
    const z = Math.sin(angle) * rr;
    const y = (rng() + rng() - 1) * thick;            // 伪高斯，压在盘面附近
    positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;
    node.push({ x, y, z, arm, r });

    const isCore = r < 34;
    const isHub = rng() < 0.03;
    bright[i] = isCore || isHub ? 1 : 0;
    colorIdx[i] = isCore ? 3 + (rng() < 0.5 ? 0 : 1) : Math.floor(rng() * 3);
    sizes[i] = isHub ? 5 + rng() * 5 : isCore ? 2.2 + rng() * 2.4 : 1.3 + rng() * 1.8;
    paintNode(i);
  }

  const nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  nodeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  nodeGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const nodeMat = new THREE.ShaderMaterial({
    uniforms: {
      uPR: { value: PR },
      uMaxPoint: { value: 110 * PR },   // 填充率钳制（穿行星团掉帧的修复）
    },
    vertexShader: /* glsl */`
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      uniform float uPR;
      uniform float uMaxPoint;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float ps = size * uPR * (340.0 / -mv.z);
        gl_PointSize = min(ps, uMaxPoint);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vColor;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        if (d > 0.5) discard;
        float glow = pow(smoothstep(0.5, 0.0, d), 2.4);   // 径向衰减发光
        float hot = smoothstep(0.16, 0.0, d);             // 白热核心
        vec3 c = mix(vColor, vec3(1.0), hot * 0.7);
        gl_FragColor = vec4(c, glow);
      }`,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });
  const nodePoints = new THREE.Points(nodeGeo, nodeMat);
  nodePoints.frustumCulled = false;
  scene.add(nodePoints);

  /* ---------- 链接：1 次 LineSegments（沿旋臂串联 + 少量近核交叉） ---------- */
  const byArm = [];
  for (let a = 0; a < ARMS; a++) byArm.push([]);
  node.forEach((n, i) => byArm[n.arm].push(i));
  byArm.forEach((arr) => arr.sort((a, b) => node[a].r - node[b].r));
  const linkPairs = [];
  for (const arr of byArm) for (let k = 0; k < arr.length - 1; k++) linkPairs.push([arr[k], arr[k + 1]]);
  const coreIdx = node.map((n, i) => i).filter((i) => node[i].r < 70);
  for (let k = 0; k < Math.min(90, coreIdx.length); k++) {
    const a = coreIdx[Math.floor(rng() * coreIdx.length)];
    const b = coreIdx[Math.floor(rng() * coreIdx.length)];
    if (a !== b) linkPairs.push([a, b]);
  }
  const lpos = new Float32Array(linkPairs.length * 6);
  linkPairs.forEach(([a, b], k) => {
    lpos[k * 6] = node[a].x; lpos[k * 6 + 1] = node[a].y; lpos[k * 6 + 2] = node[a].z;
    lpos[k * 6 + 3] = node[b].x; lpos[k * 6 + 4] = node[b].y; lpos[k * 6 + 5] = node[b].z;
  });
  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute('position', new THREE.BufferAttribute(lpos, 3));
  const linkMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(theme.link),
    transparent: true,
    opacity: 0.13,                 // 低透明 + NormalBlending：链接退到节点之后，读成星云不是网
    depthWrite: false,
    depthTest: false,
    blending: THREE.NormalBlending,
  });
  const links = new THREE.LineSegments(linkGeo, linkMat);
  links.frustumCulled = false;
  scene.add(links);

  /* ---------- 星空：3 档 THREE.Points（近档眨眼） ---------- */
  function makeStars(count, size, opacity, rMin, rMax, twinkle) {
    const p = new Float32Array(count * 3);
    const ph = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const rad = rMin + rng() * (rMax - rMin);
      const phi = Math.acos(2 * rng() - 1);
      const th = rng() * Math.PI * 2;
      p[i * 3] = rad * Math.sin(phi) * Math.cos(th);
      p[i * 3 + 1] = rad * Math.sin(phi) * Math.sin(th);
      p[i * 3 + 2] = rad * Math.cos(phi);
      ph[i] = rng() * Math.PI * 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('phase', new THREE.BufferAttribute(ph, 1));
    let m;
    if (twinkle) {
      m = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uPR: { value: PR }, uSize: { value: size }, uOpacity: { value: opacity } },
        vertexShader: `attribute float phase; varying float vp; uniform float uPR; uniform float uSize;
          void main(){ vp=phase; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=uSize*uPR; gl_Position=projectionMatrix*mv; }`,
        fragmentShader: `varying float vp; uniform float uTime; uniform float uOpacity;
          void main(){ vec2 uv=gl_PointCoord-0.5; float d=length(uv); if(d>0.5) discard;
            float a=smoothstep(0.5,0.0,d); float tw=0.55+0.45*sin(uTime*1.7+vp);
            gl_FragColor=vec4(vec3(0.86,0.90,1.0), a*uOpacity*tw); }`,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
    } else {
      m = new THREE.PointsMaterial({
        color: 0xaebfe0, size, sizeAttenuation: false, transparent: true, opacity, depthWrite: false,
      });
    }
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    return pts;
  }
  const starFar = makeStars(mobile ? 700 : 1500, 1.0, 0.5, 900, 2400, false);
  const starMid = makeStars(mobile ? 260 : 560, 1.6, 0.7, 600, 1600, false);
  const starNear = makeStars(mobile ? 44 : 100, 2.4, 0.95, 360, 900, true); // 眨眼档
  scene.add(starFar, starMid, starNear);

  /* ---------- controls ---------- */
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enableZoom = false;     // 不劫持滚轮——页面照常滚动
  controls.enablePan = false;
  controls.minPolarAngle = 0.5;
  controls.maxPolarAngle = Math.PI - 0.5;
  controls.autoRotate = !reduced;  // 闲置巡航感
  controls.autoRotateSpeed = 0.42;
  if (mobile) controls.enabled = false; // 移动端只自转、不接管手势（保证页面可滚）
  host.style.cursor = mobile ? 'default' : 'grab';

  /* ---------- 后处理 ---------- */
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(PR);
  composer.setSize(W(), H());
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(W(), H()), theme.bloom, 0.5, 0.16);
  bloomPass.enabled = bloomOn;
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  renderer.setClearColor(new THREE.Color(theme.bg), 1);

  /* ---------- 渲染循环（整页固定背景：滚出首屏冻结 + 隐藏/浮层暂停） ---------- */
  let raf = 0, running = false, t0 = performance.now(), t0Pause = 0;
  let frozen = false;     // 滚出首屏 → 冻结（留静止帧，省 backdrop-filter over 动画成本）
  let extPaused = false;  // 浮层打开 → 外部暂停（错峰，避免双 bloom）
  function renderOnce() {
    composer.render();
  }
  function frame() {
    if (!running) return;
    const t = (performance.now() - t0) / 1000;
    starNear.material.uniforms.uTime.value = t;
    controls.update();
    composer.render();
    raf = requestAnimationFrame(frame);
  }
  function startRAF() {
    if (running) return;
    running = true; t0 = performance.now() - t0Pause; raf = requestAnimationFrame(frame);
  }
  function stopRAF() {
    if (!running) return;
    running = false; cancelAnimationFrame(raf); t0Pause = performance.now() - t0;
  }
  function evaluate() {
    const shouldRun = !reduced && !frozen && !extPaused && !document.hidden;
    if (shouldRun) startRAF(); else { stopRAF(); renderOnce(); }
  }
  // reduced-motion 下不跑循环，但允许拖拽后按需重绘
  if (reduced) controls.addEventListener('change', renderOnce);

  // 滚出首屏即冻结（阈值 ~0.85 屏）；滚回首屏恢复
  const onScroll = () => { const f = scrollY > innerHeight * 0.85; if (f !== frozen) { frozen = f; evaluate(); } };
  addEventListener('scroll', onScroll, { passive: true });
  const onVis = () => evaluate();
  document.addEventListener('visibilitychange', onVis);
  // 拖拽时不靠自转，松手恢复（手动接管手感更好）
  if (!mobile && !reduced) {
    controls.addEventListener('start', () => { controls.autoRotate = false; host.style.cursor = 'grabbing'; });
    controls.addEventListener('end', () => { controls.autoRotate = true; host.style.cursor = 'grab'; });
  }
  renderOnce();   // 首帧先出图
  evaluate();     // 按当前滚动位置决定跑/停

  /* ---------- resize ---------- */
  const ro = new ResizeObserver(() => {
    const w = W(), h = H();
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h); composer.setSize(w, h); bloomPass.setSize(w, h);
    if (!running) renderOnce();
  });
  ro.observe(host);

  /* ---------- 对外控制 ---------- */
  function applyTheme() {
    theme = THEMES[themeIdx];
    for (let i = 0; i < N; i++) paintNode(i);
    nodeGeo.attributes.color.needsUpdate = true;
    linkMat.color.set(theme.link);
    bloomPass.strength = theme.bloom;
    renderer.setClearColor(new THREE.Color(theme.bg), 1);
    if (!running) renderOnce();
  }

  return {
    THEMES,
    getTheme: () => THEMES[themeIdx],
    cycleTheme() { themeIdx = (themeIdx + 1) % THEMES.length; applyTheme(); return THEMES[themeIdx]; },
    setBloom(on) { bloomOn = !!on; bloomPass.enabled = bloomOn; if (!running) renderOnce(); return bloomOn; },
    getBloom: () => bloomOn,
    pause() { extPaused = true; evaluate(); },     // 浮层打开时停背景
    resume() { extPaused = false; evaluate(); },   // 浮层关闭时恢复
    destroy() {
      stopRAF();
      removeEventListener('scroll', onScroll);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      controls.dispose();
      nodeGeo.dispose(); nodeMat.dispose();
      linkGeo.dispose(); linkMat.dispose();
      [starFar, starMid, starNear].forEach((s) => { s.geometry.dispose(); s.material.dispose(); });
      composer.dispose?.();
      renderer.dispose();
      renderer.forceContextLoss?.();
      host.replaceChildren();
    },
  };
}

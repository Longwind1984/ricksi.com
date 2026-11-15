// 3D 夜航地球引擎：/travels 全屏装置的主渲染器（three.js 只在本文件出现，异步 chunk 按需加载）
// 观感：钴蓝深夜 + 真实地形贴图（NASA 夜色重调）+ 大河辉光 + 金色足迹（bloom 辉光）+ 章节航线 + 放映模式（相机逐段跟飞）。
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { R_EARTH, dirOf, arcPoints, chapterLegs, stopPos } from './travel-data.js';

const GOLD = new THREE.Color(1.0, 0.84, 0.5);
const OVERVIEW = { la: -6, ln: -68, dist: 2.9 };

export function createGlobe3D(mount, opts) {
  const { relief, normal = null, rivers = [], coast = [], borders = [], lakes = [], data, onSelectPoi = null, onSelectStory = null, stories = [], countries = [], reducedMotion = false } = opts;
  const R = R_EARTH;
  const isMobile = mount.clientWidth < 720;

  /* ---------- 渲染器 / 场景 ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.6 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x02040e, 1);
  mount.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 120);
  const camDir = dirOf(OVERVIEW.la, OVERVIEW.ln);
  camera.position.set(camDir[0] * R * OVERVIEW.dist, camDir[1] * R * OVERVIEW.dist, camDir[2] * R * OVERVIEW.dist);
  camera.lookAt(0, 0, 0);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.55; // 近景细调：默认 1.0 在贴面尺度太窜
  controls.zoomSpeed = 0.9;
  controls.minDistance = R * 1.22; // 贴到贴面上空看 L2 核心细节（GIBS 双贴片渐显接管清晰度，法线 4K + 矢量近距渐强兜底）
  controls.maxDistance = R * 7;
  controls.enablePan = false;
  /* 不做 360 自转：背面无标记点，转过去是空窗期。待机由 ambient 环境轨迹放映接管（见 tick） */

  /* ---------- 星空背景 ---------- */
  const starGeo = new THREE.BufferGeometry();
  {
    const n = 1500;
    const pos = new Float32Array(n * 3);
    const ph = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const v = dirOf(Math.random() * 180 - 90, Math.random() * 360 - 180, R * (10 + Math.random() * 16));
      pos.set(v, i * 3);
      ph[i] = Math.random() * Math.PI * 2;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    starGeo.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
  }
  const starMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() } },
    vertexShader: `
      attribute float aPhase; uniform float uTime; uniform float uPR; varying float vA;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vA = 0.35 + 0.65 * abs(sin(uTime * 0.5 + aPhase));
        gl_PointSize = (1.0 + fract(aPhase) * 1.6) * uPR;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vA;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float a = smoothstep(0.5, 0.1, length(c)) * vA;
        gl_FragColor = vec4(0.75, 0.82, 1.0, a * 0.8);
      }`,
  });
  scene.add(new THREE.Points(starGeo, starMat));

  /* ---------- 地球：海洋球 + 大气辉光 + 真实地形贴图球 + 大河辉光 + 经纬网 ---------- */
  const earth = new THREE.Group();
  scene.add(earth);
  earth.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.995, 64, 48), new THREE.MeshBasicMaterial({ color: 0x08122e })));
  {
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.16, 64, 48),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexShader: `
          varying vec3 vN;
          void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
          varying vec3 vN;
          void main(){
            float i = pow(max(0.0, 0.62 - dot(vN, vec3(0.0, 0.0, -1.0))), 4.0);
            gl_FragColor = vec4(0.3, 0.5, 1.0, 1.0) * i * 0.6;
          }`,
      })
    );
    earth.add(atmo);
  }
  {
    /* 真实地形（NASA 无云真彩色 4K 重夜化，等距圆柱）。
       手性：three SphereGeometry 顶点 = [−cos(phi)·sinθ, cosθ, sin(phi)·sinθ]，phi=(ln+180)°，
       展开即 [cos la·cos ln, sin la, −cos la·sin ln] —— 与本站 dirOf 逐分一致，无需任何旋转。
       Phong + 高程派生法线贴图：山脊褶皱随视角有真实明暗起伏，而不是一张平的画 */
    const tex = new THREE.Texture(relief);
    tex.needsUpdate = true;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const mat = new THREE.MeshPhongMaterial({ map: tex, shininess: 0, specular: new THREE.Color(0, 0, 0) });
    if (normal) {
      const nt = new THREE.Texture(normal);
      nt.needsUpdate = true;
      mat.normalMap = nt;
      mat.normalScale = new THREE.Vector2(0.9, 0.9);
    }
    const globe = new THREE.Mesh(new THREE.SphereGeometry(R * 0.999, 96, 64), mat);
    earth.add(globe);
    /* 月光：固定在太平洋上空斜照（世界坐标，不随相机）；环境光保底夜色可读。
       强度按朗伯 1/π 衰减反推：向阳坡 ≈1.2×贴图、背光面 ≈0.5×贴图——
       有明暗起伏，但球转到「夜面」地形仍可读（真实 GPU 比 swiftshader 亮，按真机截图标定） */
    const moon = new THREE.DirectionalLight(0xcfdcff, 3.5);
    moon.position.set(-R * 2.4, R * 1.3, R * 2.2);
    scene.add(moon);
    scene.add(new THREE.AmbientLight(0x53669a, 4.2));
  }
  /* ---------- GIBS 高清区域贴片（真·惰性分层细节） ----------
     底图全局只有 ~11px/°，贴面即糊——这是清晰度天花板。系统性解法：
     美洲区域离线烘焙两张高密度贴图（GIBS BlueMarble_NextGeneration，公有领域，EPSG:4326 与底图原生对齐；
     L1 全美洲桌面 ≈39px/°/移动 ≈19px/°，L2 中美洲核心 ≈137px/°），运行时做成同球面扇区网格浮于底图之上。
     相机逼近阈值才请求网络图（首载零增重；无资产/404 整层静默降级为底图），
     距离窗内 smoothstep 渐显，拉远滞回后 dispose 纹理防显存堆积。法线复用全局 4K 图（offset/repeat 裁子域）。
     手性与底图同一约定（phi=(ln+180)°、theta=(90−la)°，见底图块注释），贴片与矢量层/标记逐分对齐。 */
  const patches = [];
  {
    const D2R = Math.PI / 180;
    const defs = [
      { name: 'am', url: `/assets/travels/earth-night-am-${isMobile ? '2k' : '4k'}.jpg`,
        bbox: [-126, -58, -28, 46], lift: 0.0006, loadAt: 2.6, fullAt: 2.2, dropAt: 3.0 },
      ...(isMobile ? [] : [{ name: 'core', url: '/assets/travels/earth-night-core-4k.jpg',
        bbox: [-95, 0, -65, 25], lift: 0.0012, loadAt: 1.9, fullAt: 1.6, dropAt: 2.2 }]),
    ];
    const texLoader = new THREE.TextureLoader();
    for (const def of defs) {
      const [ln0, la0, ln1, la1] = def.bbox;
      const geo = new THREE.SphereGeometry(R * (1 + def.lift), 96, 48,
        (ln0 + 180) * D2R, (ln1 - ln0) * D2R, (90 - la1) * D2R, (la1 - la0) * D2R);
      const mat = new THREE.MeshPhongMaterial({ transparent: true, opacity: 0, shininess: 0, specular: new THREE.Color(0, 0, 0) });
      if (normal) {
        const nt = new THREE.Texture(normal);
        nt.needsUpdate = true;
        nt.offset.set((ln0 + 180) / 360, (la0 + 90) / 180);
        nt.repeat.set((ln1 - ln0) / 360, (la1 - la0) / 180);
        mat.normalMap = nt;
        mat.normalScale = new THREE.Vector2(0.9, 0.9);
      }
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      earth.add(mesh);
      patches.push({ ...def, mesh, mat, state: 'off' }); // off → loading → ready / missing
    }
  }
  function tickPatches(camD, dt) {
    for (const p of patches) {
      const d = camD / R;
      if (p.state === 'off' && d < p.loadAt) {
        p.state = 'loading';
        new THREE.TextureLoader().loadAsync(p.url).then((tex) => {
          if (!alive) { tex.dispose(); return; }
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
          p.mat.map = tex;
          p.mat.needsUpdate = true;
          p.state = 'ready';
        }).catch(() => { p.state = 'missing'; }); // 资产缺失：静默降级，底图兜底
      }
      if (p.state !== 'ready') continue;
      if (d > p.dropAt) { // 滞回卸载：与加载阈值留出缓冲带，防临界抖动
        p.mat.map?.dispose();
        p.mat.map = null;
        p.mat.needsUpdate = true;
        p.mat.opacity = 0;
        p.mesh.visible = false;
        p.state = 'off';
        continue;
      }
      const win = Math.max(0, Math.min(1, (p.loadAt - d) / (p.loadAt - p.fullAt)));
      const target = win * win * (3 - 2 * win);
      p.mat.opacity += (target - p.mat.opacity) * Math.min(1, dt * 6);
      p.mesh.visible = p.mat.opacity > 0.01;
    }
  }
  /* 折线集 → 球面 LineSegments（跨 180° 经线的段丢弃防横贯球面） */
  function linesGeo(lines, r) {
    const pts = [];
    for (const line of lines) {
      for (let i = 0; i + 3 < line.length; i += 2) {
        if (Math.abs(line[i] - line[i + 2]) > 10) continue;
        pts.push(...dirOf(line[i + 1], line[i], r), ...dirOf(line[i + 3], line[i + 2], r));
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    return g;
  }
  /* 矢量图层材质句柄：近距渐强（贴图像素密度到顶后，地理细节由矢量接管） */
  const vecMats = { rivers: null, coast: null, borders: null, lakes: null };
  {
    /* 大河辉光（Natural Earth 10m scalerank≤7） */
    vecMats.rivers = new THREE.LineBasicMaterial({ color: 0x6f97df, transparent: true, opacity: 0.26, blending: THREE.AdditiveBlending, depthWrite: false });
    earth.add(new THREE.LineSegments(linesGeo(rivers.map((rv) => rv.p), R * 1.004), vecMats.rivers));
  }
  {
    /* 海岸线锐化（10m）+ 湖泊轮廓并入 */
    const coastAll = coast.concat(lakes.map((lk) => lk.o));
    vecMats.coast = new THREE.LineBasicMaterial({ color: 0x5f7fc0, transparent: true, opacity: 0.22, depthWrite: false });
    earth.add(new THREE.LineSegments(linesGeo(coastAll, R * 1.0025), vecMats.coast));
  }
  {
    /* 国界微线（10m，极淡——信息层而非政治强调；总览 0.20 勉强可读，贴面随矢量渐强上浮） */
    vecMats.borders = new THREE.LineBasicMaterial({ color: 0x54709f, transparent: true, opacity: 0.2, depthWrite: false });
    earth.add(new THREE.LineSegments(linesGeo(borders, R * 1.003), vecMats.borders));
  }
  {
    /* 湖泊面（烘焙期 earcut 预三角化；普通 alpha 混合沉在纹理之上、海岸线之下） */
    const pos = [];
    for (const lk of lakes) {
      const v = [];
      for (let i = 0; i + 1 < lk.o.length; i += 2) v.push(dirOf(lk.o[i + 1], lk.o[i], R * 1.0022));
      for (let i = 0; i + 2 < lk.t.length; i += 3) {
        pos.push(...v[lk.t[i]], ...v[lk.t[i + 1]], ...v[lk.t[i + 2]]);
      }
    }
    if (pos.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
      vecMats.lakes = new THREE.MeshBasicMaterial({ color: 0x16305e, transparent: true, opacity: 0.55, depthWrite: false });
      earth.add(new THREE.Mesh(g, vecMats.lakes));
    }
  }
  {
    /* 经纬网（20° 间隔，极淡） */
    const pts = [];
    const push = (a, b) => pts.push(...dirOf(a[0], a[1], R * 1.001), ...dirOf(b[0], b[1], R * 1.001));
    for (let ln = -180; ln < 180; ln += 20)
      for (let la = -80; la < 80; la += 4) push([la, ln], [la + 4, ln]);
    for (let la = -60; la <= 60; la += 20)
      for (let ln = -180; ln < 180; ln += 4) push([la, ln], [la, ln + 4]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    earth.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x3d5c96, transparent: true, opacity: 0.13 })));
  }

  /* ---------- 足迹点（金光，章节位掩码调光） ---------- */
  const pois = data.pois;
  const poiGeo = new THREE.BufferGeometry();
  {
    const n = pois.length;
    const pos = new Float32Array(n * 3);
    const ph = new Float32Array(n);
    const mask = new Float32Array(n);
    const sz = new Float32Array(n);
    const crowd = new Float32Array(n);
    // 同城拥挤度：0.25°（约 28 km）内的邻居数——密集城区衰减单点亮度/尺寸，
    // 防止加色混合把整片区域叠成过曝白斑（城市应是一团暖光，不是一张白饼）
    for (let i = 0; i < n; i++) {
      let c = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const dla = pois[i].la - pois[j].la, dln = pois[i].ln - pois[j].ln;
        if (dla * dla + dln * dln < 0.0625) c++;
      }
      crowd[i] = c;
    }
    for (let i = 0; i < n; i++) {
      const v = dirOf(pois[i].la, pois[i].ln, R * 1.012);
      pos.set(v, i * 3);
      ph[i] = Math.random() * Math.PI * 2;
      mask[i] = pois[i].ch.reduce((a, c) => a | (1 << c), 0);
      sz[i] = 3.8 + (pois[i].r ? Math.max(0, pois[i].r - 4) * 1.3 : 0) + Math.random() * 0.9;
    }
    poiGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    poiGeo.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
    poiGeo.setAttribute('aMask', new THREE.BufferAttribute(mask, 1));
    poiGeo.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
    poiGeo.setAttribute('aCrowd', new THREE.BufferAttribute(crowd, 1));
  }
  const poiMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPR: { value: renderer.getPixelRatio() },
      uChPrev: { value: -1 },
      uChCur: { value: -1 },
      uChMix: { value: 1 },
    },
    vertexShader: `
      attribute float aPhase; attribute float aMask; attribute float aSize; attribute float aCrowd;
      uniform float uTime; uniform float uPR; uniform float uChPrev; uniform float uChCur; uniform float uChMix;
      varying float vA;
      float inCh(float ch){
        if (ch < -0.5) return 1.0;
        return step(0.5, mod(floor(aMask / exp2(ch)), 2.0));
      }
      void main(){
        float w = mix(inCh(uChPrev), inCh(uChCur), uChMix);
        float tw = 0.72 + 0.28 * sin(uTime * 1.5 + aPhase);
        float att = pow(1.0 + aCrowd, -0.85); // 强衰减：密集城区总分亮度 ≈1.5×单点（暖光团而非白饼）
        vA = mix(0.08, 1.0, w) * tw * att;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        /* 近距压缩：尺寸走 0.55 次幂（线性透视贴面会炸成白团），亮度随 √persp 回落 */
        float persp = clamp(pow(${(R * 3.2).toFixed(2)} / -mv.z, 0.55), 0.6, 2.4);
        vA /= sqrt(persp);
        gl_PointSize = aSize * uPR * persp * (0.8 + 0.5 * w) * mix(1.0, att, 0.45);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vA;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        float core = smoothstep(0.16, 0.05, d);
        float halo = smoothstep(0.5, 0.08, d) * 0.42;
        gl_FragColor = vec4(1.0, 0.85, 0.52, (core + halo) * vA);
      }`,
  });
  const poiPoints = new THREE.Points(poiGeo, poiMat);
  earth.add(poiPoints);

  /* ---------- 游记故事标记（金色菱形 = 有照片与长文的地点；不参与章节调光） ---------- */
  let storyPoints = null, storyMat = null;
  if (stories.length) {
    const g = new THREE.BufferGeometry();
    const n = stories.length;
    const pos = new Float32Array(n * 3);
    const ph = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const v = dirOf(stories[i].la, stories[i].ln, R * 1.013);
      pos.set(v, i * 3);
      ph[i] = Math.random() * Math.PI * 2;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
    storyMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() } },
      vertexShader: `
        attribute float aPhase;
        uniform float uTime; uniform float uPR;
        varying float vA;
        void main(){
          vA = 0.72 + 0.28 * sin(uTime * 1.4 + aPhase);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          /* 与足迹点同口径的近距压缩（尺寸 0.55 次幂 + 亮度 √ 回落） */
          float persp = clamp(pow(${(R * 3.2).toFixed(2)} / -mv.z, 0.55), 0.6, 2.4);
          vA /= sqrt(persp);
          gl_PointSize = 8.5 * uPR * persp;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying float vA;
        void main(){
          vec2 c = abs(gl_PointCoord - 0.5);
          float dd = c.x + c.y; // L1 范数 = 菱形
          float body = smoothstep(0.30, 0.24, dd);
          float ring = smoothstep(0.48, 0.40, dd) - body;
          vec3 col = vec3(1.0, 0.92, 0.72) * body + vec3(1.0, 0.82, 0.45) * ring * 0.9;
          gl_FragColor = vec4(col, (body + ring * 0.75) * vA);
        }`,
    });
    storyPoints = new THREE.Points(g, storyMat);
    earth.add(storyPoints);
  }

  /* 游记时间线细弧：同篇相邻故事点相连——游记层自身的旅程结构（极淡，不参与章节调光） */
  if (stories.length > 1) {
    const pts = [];
    for (let i = 1; i < stories.length; i++) {
      const a = stories[i - 1], b = stories[i];
      if (a.post !== b.post) continue;
      const arc = arcPoints([a.la, a.ln], [b.la, b.ln], R, 28);
      for (let k = 0; k < arc.length - 1; k++) pts.push(arc[k].x, arc[k].y, arc[k].z, arc[k + 1].x, arc[k + 1].y, arc[k + 1].z);
    }
    if (pts.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
      earth.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xe8c87e, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })));
    }
  }

  /* ---------- 城市光晕（k≥2，替代 v5 细环） + 放映脉冲环 ----------
     细环是 UI 几何件，与真实地理画面气质不符、信息含量低。夜航的真实语感是「城市灯光」：
     每城一颗暖色径向渐隐光斑，尺寸 ∝ √k（范围与亮度即信息），加色叠加进地形；
     uNear 近距渐隐——贴面后让位给离散足迹点，远观才聚合成光团。 */
  let emberMat = null;
  {
    const citiesK = data.cities.map((c, i) => ({ c, i })).filter(({ c }) => c.k >= 2);
    if (citiesK.length) {
      const n = citiesK.length;
      const pos = new Float32Array(n * 3), sz = new Float32Array(n), ph = new Float32Array(n);
      citiesK.forEach(({ c }, i) => {
        pos.set(dirOf(c.la, c.ln, R * 1.011), i * 3);
        sz[i] = 15 + 6.5 * Math.sqrt(c.k);
        ph[i] = Math.random() * Math.PI * 2;
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
      g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
      emberMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() }, uNear: { value: 0 } },
        vertexShader: `
          attribute float aSize; attribute float aPhase;
          uniform float uTime; uniform float uPR; uniform float uNear;
          varying float vA;
          void main(){
            vA = (0.85 + 0.15 * sin(uTime * 0.9 + aPhase)) * (1.0 - uNear * 0.85);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            /* 与足迹点同口径的近距压缩（0.55 次幂），贴面不炸团 */
            float persp = clamp(pow(${(R * 3.2).toFixed(2)} / -mv.z, 0.55), 0.6, 2.4);
            gl_PointSize = aSize * uPR * persp;
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `
          varying float vA;
          void main(){
            float d = length(gl_PointCoord - 0.5) * 2.0;
            float glow = smoothstep(1.0, 0.0, d);
            glow *= glow; // 径向平方衰减：外缘软进地形
            float core = smoothstep(0.32, 0.0, d);
            vec3 col = vec3(1.0, 0.72, 0.38) * glow * 0.55 + vec3(1.0, 0.86, 0.58) * core * core * 0.45;
            gl_FragColor = vec4(col, (glow * 0.15 + core * 0.10) * vA);
          }`,
      });
      earth.add(new THREE.Points(g, emberMat));
    }
  }
  const pulseRing = new THREE.LineLoop(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(31 * 3), 3)),
    new THREE.LineBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  earth.add(pulseRing);
  function ringAt(worldDir, radius) {
    const up = Math.abs(worldDir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const t1 = worldDir.clone().cross(up).normalize();
    const t2 = worldDir.clone().cross(t1).normalize();
    const attr = pulseRing.geometry.getAttribute('position');
    for (let i = 0; i <= 30; i++) {
      const a = (i / 30) * Math.PI * 2;
      const p = worldDir.clone().multiplyScalar(R * 1.014).addScaledVector(t1, Math.cos(a) * radius).addScaledVector(t2, Math.sin(a) * radius);
      attr.setXYZ(i, p.x, p.y, p.z);
    }
    attr.needsUpdate = true;
  }

  /* ---------- 锚定系统（漂浮卡的球面锚点：高亮环 + 每帧屏幕投影回调） ---------- */
  const anchorRing = new THREE.LineLoop(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(31 * 3), 3)),
    new THREE.LineBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  earth.add(anchorRing);
  let anchor = null; // {la, ln, v:Vector3}
  let anchorCb = null;
  function ringOn(ring, worldDir, radius) {
    const up = Math.abs(worldDir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const t1 = worldDir.clone().cross(up).normalize();
    const t2 = worldDir.clone().cross(t1).normalize();
    const attr = ring.geometry.getAttribute('position');
    for (let i = 0; i <= 30; i++) {
      const a = (i / 30) * Math.PI * 2;
      const p = worldDir.clone().multiplyScalar(R * 1.015).addScaledVector(t1, Math.cos(a) * radius).addScaledVector(t2, Math.sin(a) * radius);
      attr.setXYZ(i, p.x, p.y, p.z);
    }
    attr.needsUpdate = true;
  }
  /* 经纬 → 屏幕坐标（perspective 投影；背面或出画返回 {facing} 供卡片判定） */
  function projectPoint(la, ln) {
    const v = new THREE.Vector3(...dirOf(la, ln, R * 1.02));
    const facing = v.clone().normalize().dot(camera.position.clone().normalize());
    const p = v.clone().project(camera);
    const w = mount.clientWidth, h = mount.clientHeight;
    return { x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h, facing, inFrame: Math.abs(p.x) < 1 && Math.abs(p.y) < 1 };
  }
  /* 展示位飞行：相机偏向锚点方向的右上（lat+7, ln+9），使锚点落在画面左下黄金位，右上留给漂浮卡 */
  function flyToPresent(la, ln, dur = 1.6) {
    const d = dirOf(la + 7, ln + 9, R * 2.35);
    flyTo(new THREE.Vector3(...d), new THREE.Vector3(0, 0, 0), dur);
  }

  /* ---------- 章节航线（LineSegments + 里程揭示 shader） ---------- */
  const chArcData = data.chapters.map((_, ci) => {
    const legs = chapterLegs(data, ci);
    const pos = [];
    const kms = [];
    const path = []; // 脉冲采样点 {x,y,z,km}
    for (const leg of legs) {
      const pts = arcPoints(leg.a, leg.b, R, 44);
      const km0 = leg.cumKm - leg.km;
      for (let i = 0; i < pts.length - 1; i++) {
        pos.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
        kms.push(km0 + pts[i].t * leg.km, km0 + pts[i + 1].t * leg.km);
      }
      for (const p of pts) path.push({ x: p.x, y: p.y, z: p.z, km: km0 + p.t * leg.km });
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    g.setAttribute('aKm', new THREE.BufferAttribute(new Float32Array(kms), 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uKm: { value: 0 }, uAlpha: { value: 0 } },
      vertexShader: `
        attribute float aKm; varying float vKm;
        void main(){ vKm = aKm; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform float uKm; uniform float uAlpha; varying float vKm;
        void main(){
          float rev = clamp((uKm - vKm) / 60.0, 0.0, 1.0);
          float head = smoothstep(300.0, 0.0, uKm - vKm) * 0.55;
          vec3 col = vec3(1.0, 0.83, 0.48) * (1.0 + head * 2.2); // 航迹头 HDR：越过 bloom 阈值
          gl_FragColor = vec4(col, (0.42 + head) * rev * uAlpha);
        }`,
    });
    const line = new THREE.LineSegments(g, mat);
    earth.add(line);
    return { legs, mat, line, path, total: legs.length ? legs[legs.length - 1].cumKm : 0, alphaTarget: 0 };
  });

  /* 脉冲光点（旅行者） */
  const pulseTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,240,200,1)');
    grad.addColorStop(0.3, 'rgba(255,215,130,0.9)');
    grad.addColorStop(1, 'rgba(255,200,90,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  /* HDR 金色：乘 >1 的颜色让它越过 bloom 阈值（选择性 bloom 的主角） */
  const pulse = new THREE.Sprite(new THREE.SpriteMaterial({ map: pulseTex, color: new THREE.Color(2.4, 1.9, 1.15), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  pulse.scale.setScalar(R * 0.055);
  earth.add(pulse);

  /* ---------- 地名标签（HTML overlay）：核心城市（近距分层） + 国家名（远观分层） ---------- */
  const labelBox = document.createElement('div');
  labelBox.className = 'tv-labels';
  mount.appendChild(labelBox);
  const labelLimit = isMobile ? 12 : 32;
  const labelCities = data.cities.map((c, i) => ({ c, i, v: new THREE.Vector3(...dirOf(c.la, c.ln, R * 1.02)) }))
    .sort((a, b) => b.c.k - a.c.k)
    .slice(0, labelLimit);
  const labelEls = labelCities.map(({ c, i }) => {
    const el = document.createElement('div');
    el.className = 'tv-label';
    el.dataset.city = String(i);
    el.innerHTML = `<span class="tv-label-n">${c.n}</span><span class="tv-label-k mono">${c.k}</span>`;
    labelBox.appendChild(el);
    return el;
  });
  /* 国家名：手工锚点的地图式标注（travel-countries.json）。远观可读、贴面淡出——与城市标签相反的分层 */
  const labelCountries = countries.map((co) => ({ co, v: new THREE.Vector3(...dirOf(co.la, co.ln, R * 1.015)) }));
  const labelCountryEls = labelCountries.map(({ co }) => {
    const el = document.createElement('div');
    el.className = 'tv-label tv-label-country';
    el.innerHTML = `<span class="tv-label-cn-zh">${co.zh}</span><span class="tv-label-cn-en">${co.en}</span>`;
    labelBox.appendChild(el);
    return el;
  });

  /* ---------- 后处理（选择性 bloom：高阈值，只有 HDR 的脉冲/航迹头/最亮足迹核溢出） ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.55, 0.82);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function resize() {
    const w = mount.clientWidth, h = mount.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(mount);

  /* ---------- 相机飞行（tween） ---------- */
  const flights = [];
  function flyTo(pos, target, dur = 1.4) {
    flights.length = 0;
    flights.push({
      p0: camera.position.clone(), t0: controls.target.clone(),
      p1: pos.clone(), t1: target.clone(),
      start: performance.now(), dur: dur * 1000,
    });
  }
  function overview(dur = 1.6) {
    const d = dirOf(OVERVIEW.la, OVERVIEW.ln, R * OVERVIEW.dist);
    flyTo(new THREE.Vector3(...d), new THREE.Vector3(0, 0, 0), dur);
  }

  /* ---------- 放映 ---------- */
  let replay = null; // {ci, legs, durs, legIdx, legT, kmNow, cbs, cancel}
  function curPosAtKm(arc, km) {
    const path = arc.path;
    if (!path.length) return new THREE.Vector3(0, R, 0);
    let lo = 0, hi = path.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (path[mid].km < km) lo = mid + 1;
      else hi = mid;
    }
    const i = Math.max(1, lo);
    const a = path[i - 1], b = path[i];
    const t = b.km > a.km ? (km - a.km) / (b.km - a.km) : 0;
    return new THREE.Vector3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
  }

  /* ---------- 拾取 ---------- */
  const raycaster = new THREE.Raycaster();
  raycaster.params.Points = { threshold: R * 0.022 };
  const ndc = new THREE.Vector2();
  let downAt = null;
  let idleStamp = performance.now();
  function pickAt(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hs = storyPoints ? raycaster.intersectObject(storyPoints) : [];
    const hp = raycaster.intersectObject(poiPoints);
    const s0 = hs[0], p0 = hp[0];
    if (s0 && (!p0 || (s0.distanceToRay ?? 0) <= (p0.distanceToRay ?? 0))) return { k: 's', i: s0.index };
    if (p0) return { k: 'p', i: p0.index };
    return null;
  }
  function onDown(e) { downAt = { x: e.clientX, y: e.clientY }; idleStamp = performance.now(); hideTip(); }
  function onWheel() { idleStamp = performance.now(); } // 滚轮缩放同样算交互：重置待机计时
  function onUp(e) {
    idleStamp = performance.now();
    if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return;
    const hit = pickAt(e);
    if (hit?.k === 'p') onSelectPoi?.(hit.i);
    else if (hit?.k === 's') onSelectStory?.(hit.i);
  }
  /* ---------- 悬停名片（近景小颗粒先读后点；触屏无悬停不参与，放映/拖拽中隐藏） ---------- */
  const tip = document.createElement('div');
  tip.className = 'tv-tip';
  mount.appendChild(tip);
  function hideTip() { tip.classList.remove('show'); }
  let hoverTimer = 0;
  function onMove(e) {
    const now = performance.now();
    if (now - hoverTimer < 90) return;
    hoverTimer = now;
    if (replay || downAt || e.pointerType === 'touch') { hideTip(); return; }
    const hit = pickAt(e);
    renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
    if (hit) {
      tip.textContent = hit.k === 's' ? stories[hit.i].n : data.pois[hit.i].n;
      const r = renderer.domElement.getBoundingClientRect();
      tip.style.transform = `translate(${e.clientX - r.left + 14}px, ${e.clientY - r.top - 12}px)`;
      tip.classList.add('show');
    } else hideTip();
  }
  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointerup', onUp);
  renderer.domElement.addEventListener('pointermove', onMove);
  renderer.domElement.addEventListener('pointerleave', hideTip);
  renderer.domElement.addEventListener('wheel', onWheel, { passive: true });

  /* ---------- 主循环 ---------- */
  let alive = true;
  let raf = 0;
  let last = performance.now();
  const tmpV = new THREE.Vector3();
  /* 待机环境放映（ambient）：无交互 12s 且无锚卡/放映/飞行时进入——四章航线静默依章绘出，
     相机在 OVERVIEW 方向小幅漂移（永不转到背面）；一动即停，航线恢复章节原状 */
  const ambient = { on: false, allowed: !reducedMotion, ci: 0, km: 0, holdUntil: 0 };
  function tick(now) {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    const t = now / 1000;

    starMat.uniforms.uTime.value = t;
    poiMat.uniforms.uTime.value = t;
    if (storyMat) storyMat.uniforms.uTime.value = t;
    if (emberMat) emberMat.uniforms.uTime.value = t;
    if (poiMat.uniforms.uChMix.value < 1) poiMat.uniforms.uChMix.value = Math.min(1, poiMat.uniforms.uChMix.value + dt * 1.6);
    for (const a of chArcData) {
      if (a.mat.uniforms.uAlpha.value < a.alphaTarget) a.mat.uniforms.uAlpha.value = Math.min(a.alphaTarget, a.mat.uniforms.uAlpha.value + dt * 1.4);
      else if (a.mat.uniforms.uAlpha.value > a.alphaTarget) a.mat.uniforms.uAlpha.value = Math.max(a.alphaTarget, a.mat.uniforms.uAlpha.value - dt * 1.4);
    }

    /* 相机 tween */
    if (flights.length) {
      const f = flights[0];
      const k = Math.min(1, (now - f.start) / f.dur);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camera.position.lerpVectors(f.p0, f.p1, e);
      controls.target.lerpVectors(f.t0, f.t1, e);
      if (k >= 1) flights.shift();
    }

    /* 放映推进 */
    if (replay) {
      const st = replay;
      const arc = chArcData[st.ci];
      const leg = st.legs[st.legIdx];
      if (!leg) {
        endReplay(true);
      } else {
        st.legT += dt / st.durs[st.legIdx];
        if (st.legT >= 1) {
          st.cbs.onLeg?.(st.legIdx, leg.cumKm, st.legs.length);
          st.legIdx++;
          st.legT = 0;
        }
        const cur = st.legs[st.legIdx];
        if (cur) {
          st.kmNow = cur.cumKm - cur.km * (1 - Math.min(1, st.legT));
          arc.mat.uniforms.uKm.value = st.kmNow;
          const p = curPosAtKm(arc, st.kmNow);
          pulse.position.copy(p);
          pulse.material.opacity = Math.min(1, pulse.material.opacity + dt * 3);
          ringAt(p.clone().normalize(), R * (0.028 + 0.01 * Math.sin(t * 4)));
          pulseRing.material.opacity = 0.55;
          /* 相机跟飞：尾随后掠的低空视角——机位坠在航迹后方，视线投向旅行前方 */
          const lift = Math.min(0.55, 0.22 + (cur.km / 6000) * 0.5); // 长航段略升高，短航段贴海
          const pN = p.clone().normalize();
          const pAhead = curPosAtKm(arc, Math.min(arc.total, st.kmNow + Math.max(60, cur.km * 0.18)));
          const tan3 = pAhead.clone().sub(p);
          if (tan3.lengthSq() > 1e-8) st.lastTan = tan3.normalize();
          const dir3 = st.lastTan ?? pN.clone();
          const ideal = pN.clone().multiplyScalar(R * (1.42 + lift)).addScaledVector(dir3, -R * (0.9 + lift * 0.6));
          const lookPt = p.clone().addScaledVector(dir3, R * 0.3).multiplyScalar(0.92);
          controls.target.lerp(lookPt, Math.min(1, dt * 2.2));
          camera.position.lerp(ideal, Math.min(1, dt * 1.35));
          /* 防穿球：章节间长距离转移时钳制最低轨道高度 */
          const minAlt = R * 1.28;
          const cl = camera.position.length();
          if (cl < minAlt) camera.position.multiplyScalar(minAlt / cl);
          camera.lookAt(controls.target);
          st.cbs.onTick?.(st.kmNow);
        }
      }
    } else if (!ambient.on) {
      pulse.material.opacity = Math.max(0, pulse.material.opacity - dt * 3);
      pulseRing.material.opacity = Math.max(0, pulseRing.material.opacity - dt * 3);
    }

    /* 待机环境放映：进入（无交互 12s、无锚卡/放映/飞行）与退出（一动即停，航线恢复章节原状） */
    const idleMs = now - idleStamp;
    if (!ambient.on && ambient.allowed && !replay && !flights.length && !anchor && idleMs > 12000) {
      ambient.on = true;
      ambient.ci = 0; ambient.km = 0; ambient.holdUntil = 0;
      for (const a of chArcData) { a.mat.uniforms.uKm.value = 0; a.alphaTarget = 1; }
    }
    if (ambient.on && (replay || flights.length || anchor || !ambient.allowed || idleMs < 1000)) {
      ambient.on = false;
      const curCh = poiMat.uniforms.uChCur.value; // -1 = 全部；按原章节状态复原（不触发飞行）
      chArcData.forEach((a, ci) => {
        a.alphaTarget = curCh < 0 ? 0 : ci === curCh ? 1 : 0;
        a.mat.uniforms.uKm.value = ci === curCh ? a.total : 0;
      });
      pulse.material.opacity = 0;
    }
    /* 放映中：四章航线静默依章绘出（每章约 15s，整循环约 70s）+ 微光 traveler + 相机绕 OVERVIEW 微漂 */
    if (ambient.on) {
      const arc = chArcData[ambient.ci];
      if (arc) {
        if (!(ambient.holdUntil && now < ambient.holdUntil)) {
          ambient.holdUntil = 0;
          ambient.km += (arc.total / 15) * dt;
          if (ambient.km >= arc.total) {
            ambient.km = 0;
            if (ambient.ci + 1 < chArcData.length) { ambient.ci++; ambient.holdUntil = now + 1400; }
            else { ambient.ci = 0; ambient.holdUntil = now + 1200; for (const a of chArcData) a.mat.uniforms.uKm.value = 0; }
          }
          arc.mat.uniforms.uKm.value = Math.min(ambient.km, arc.total);
          pulse.position.copy(curPosAtKm(arc, Math.min(ambient.km, arc.total)));
          pulse.material.opacity = Math.min(0.4, pulse.material.opacity + dt * 1.5);
        }
      }
      /* 微漂：±3° 纬 / ±6° 经 / 轻微推拉——画面呼吸但不转向背面 */
      const wob = t * Math.PI * 2;
      const dd = dirOf(OVERVIEW.la + 3 * Math.sin(wob / 40), OVERVIEW.ln + 6 * Math.sin(wob / 57 + 1.3), R * (OVERVIEW.dist + 0.12 * Math.sin(wob / 33)));
      camera.position.lerp(tmpV.set(dd[0], dd[1], dd[2]), Math.min(1, dt * 0.5));
    }

    /* 锚点环脉动 + 屏幕投影回调（漂浮卡牵引线随地球旋转跟踪） */
    if (anchor) {
      ringOn(anchorRing, anchor.v, R * (0.03 + 0.006 * Math.sin(t * 2.4)));
      anchorRing.material.opacity = Math.min(0.5, anchorRing.material.opacity + dt * 2);
      anchorCb?.(projectPoint(anchor.la, anchor.ln));
    } else if (anchorRing.material.opacity > 0) {
      anchorRing.material.opacity = Math.max(0, anchorRing.material.opacity - dt * 3);
    }

    controls.update();
    if (replay) camera.lookAt(controls.target);

    /* 标签投影（大城市远距可见，小城市近距才露；屏幕碰撞避让，大者赢） */
    const w = mount.clientWidth, h = mount.clientHeight;
    const camN = camera.position.clone().normalize();
    const camDist = camera.position.length();
    /* 拖拽转速随距离连续衰减：总览保持 0.55 手感，贴面（minDistance）降到 0.16——
       否则近距同样像素拖拽扫过的地表弧长被放大，手感过敏 */
    controls.rotateSpeed = 0.16 + 0.39 * Math.min(1, Math.max(0, (camDist / R - 1.22) / 1.7));
    /* 近距矢量渐强：贴面时河流/海岸/国界/湖面不透明度上浮（总览保持原值） */
    {
      const near = Math.max(0, Math.min(1, (3.2 - camDist / R) / 1.8));
      if (vecMats.rivers) vecMats.rivers.opacity = 0.26 + near * 0.14;
      if (vecMats.coast) vecMats.coast.opacity = 0.22 + near * 0.12;
      if (vecMats.borders) vecMats.borders.opacity = 0.2 + near * 0.08;
      if (vecMats.lakes) vecMats.lakes.opacity = 0.55 + near * 0.1;
      if (emberMat) emberMat.uniforms.uNear.value = near; // 城市光晕近距渐隐，让位给离散足迹点
    }
    tickPatches(camDist, dt); /* GIBS 贴片：距离阈情载/渐显/滞回卸载 */
    const placed = [];
    for (let i = 0; i < labelCities.length; i++) {
      const el = labelEls[i];
      const v = labelCities[i].v;
      const k = labelCities[i].c.k;
      if (k < 5 && camDist > R * 3.4) { el.style.display = 'none'; continue; }
      const facing = v.clone().normalize().dot(camN);
      tmpV.copy(v).project(camera);
      const on = facing > 0.22 && Math.abs(tmpV.x) < 0.98 && Math.abs(tmpV.y) < 0.95;
      if (!on) { el.style.display = 'none'; continue; }
      const sx = ((tmpV.x + 1) / 2) * w, sy = ((1 - tmpV.y) / 2) * h;
      if (placed.some(([px, py]) => Math.abs(px - sx) < 74 && Math.abs(py - sy) < 22)) { el.style.display = 'none'; continue; }
      placed.push([sx, sy]);
      el.style.display = '';
      el.style.transform = `translate(-50%, -130%) translate(${sx}px, ${sy}px)`;
      el.style.zIndex = String(1000 - Math.round(tmpV.z * 100));
    }
    /* 国家名：远观分层——贴面（<R×2.0）全隐、R×2.45 外全显；与城市标签仅在像素级直撞时避让（同名首都不误杀），国家间保持间距 */
    {
      const cFar = Math.max(0, Math.min(1, (camDist / R - 2.0) / 0.45));
      const placedC = [];
      for (let i = 0; i < labelCountries.length; i++) {
        const el = labelCountryEls[i];
        if (cFar <= 0.02) { el.style.display = 'none'; continue; }
        const v = labelCountries[i].v;
        const facing = v.clone().normalize().dot(camN);
        tmpV.copy(v).project(camera);
        const on = facing > 0.3 && Math.abs(tmpV.x) < 0.98 && Math.abs(tmpV.y) < 0.95;
        if (!on) { el.style.display = 'none'; continue; }
        const sx = ((tmpV.x + 1) / 2) * w, sy = ((1 - tmpV.y) / 2) * h;
        if (placed.some(([px, py]) => Math.abs(px - sx) < 18 && Math.abs(py - sy) < 10)) { el.style.display = 'none'; continue; }
        /* 国家间避让：间距随缩放收缩（总览 90px 防大字堆叠，中距 26px 让中美洲小国都能落位） */
        const cR = Math.max(26, Math.min(90, (camDist / R - 2.0) * 90));
        if (placedC.some(([px, py]) => Math.abs(px - sx) < cR && Math.abs(py - sy) < cR / 3)) { el.style.display = 'none'; continue; }
        placedC.push([sx, sy]);
        el.style.display = '';
        el.style.opacity = (0.45 * cFar).toFixed(3);
        el.style.transform = `translate(-50%, -50%) translate(${sx}px, ${sy}px)`;
        el.style.zIndex = String(999 - Math.round(tmpV.z * 100));
      }
    }

    composer.render();
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  function endReplay(done) {
    const st = replay;
    replay = null;
    controls.enabled = true;
    idleStamp = performance.now();
    if (done && st) {
      overview(1.8);
      st.cbs.onDone?.();
    }
  }

  const api = {
    setChapter(i) {
      poiMat.uniforms.uChPrev.value = poiMat.uniforms.uChCur.value;
      poiMat.uniforms.uChCur.value = i == null ? -1 : i;
      poiMat.uniforms.uChMix.value = 0;
      chArcData.forEach((a, ci) => {
        a.alphaTarget = i == null ? 0 : ci === i ? 1 : 0;
        if (ci === i) a.mat.uniforms.uKm.value = a.total; // 非放映时全量显示
      });
      if (i != null) {
        const st = data.chapters[i].stops;
        if (st.length) {
          const mid = st[Math.floor(st.length / 2)];
          const [la, ln] = stopPos(data, mid);
          const d = dirOf(la, ln, R * 3.0);
          flyTo(new THREE.Vector3(...d), new THREE.Vector3(0, 0, 0), 1.5);
        }
      }
      idleStamp = performance.now();
    },
    replay(ci, cbs = {}) {
      const arc = chArcData[ci];
      if (!arc || !arc.legs.length) { cbs.onDone?.(); return () => {}; }
      api.setChapter(ci);
      arc.mat.uniforms.uKm.value = 0;
      controls.enabled = false;
      controls.autoRotate = false;
      replay = {
        ci,
        legs: arc.legs,
        durs: arc.legs.map((l) => Math.min(2.2, Math.max(0.5, l.km / 1100))),
        legIdx: 0,
        legT: 0,
        kmNow: 0,
        cbs,
      };
      return () => endReplay(false);
    },
    stopReplay() { endReplay(false); overview(1.4); },
    isReplaying() { return !!replay; },
    highlightCity(i) {
      const c = data.cities[i];
      if (!c) return;
      const el = labelEls[labelCities.findIndex((x) => x.i === i)];
      labelEls.forEach((e) => e.classList.remove('cur'));
      if (el) el.classList.add('cur');
    },
    overview,
    /* 漂浮卡锚定：[la,ln] 设锚（cb 每帧收 {x,y,facing,inFrame} 投影），null 清锚；设锚期间待机放映不进入 */
    setAnchor(laLn, cb = null) {
      anchor = laLn ? { la: laLn[0], ln: laLn[1], v: new THREE.Vector3(...dirOf(laLn[0], laLn[1])) } : null;
      anchorCb = anchor ? cb : null;
      idleStamp = performance.now();
    },
    setAmbientAllowed(v) { ambient.allowed = v && !reducedMotion; },
    flyToPresent,
    projectPoint,
    /* QA 探针：相机距离/飞行中/ambient 状态（只读） */
    debugCam() { return { d: camera.position.length() / R, flights: flights.length, ambient: ambient.on, replay: !!replay, anchor: !!anchor, rotSpd: +controls.rotateSpeed.toFixed(3), patches: patches.map((p) => `${p.name}:${p.state}:${p.mat.opacity.toFixed(2)}`) }; },
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerleave', hideTip);
      renderer.domElement.removeEventListener('wheel', onWheel);
      tip.remove();
      labelBox.remove();
      scene.traverse((o) => {
        o.geometry?.dispose?.();
        for (const m of [o.material].flat()) {
          if (!m) continue;
          m.map?.dispose?.();
          m.dispose?.();
        }
      });
      composer.dispose?.();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
  return api;
}

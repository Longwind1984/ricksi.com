// 旅行足迹 · 前后端共享的数据与几何工具（纯函数，无 three 依赖）
// 单位球约定：v = [cos la·cos ln, sin la, −cos la·sin ln]（右手系，E×N=U）—— 双引擎与烘焙管线统一口径
// 注意：若把第三分量写成 +cos la·sin ln，得到的是左手系镜像地球（3D 视图会左右翻转）
export const R_EARTH = 1.6;

export function dirOf(la, ln, r = 1) {
  const t = Math.PI / 180;
  const c = Math.cos(la * t);
  return [c * Math.cos(ln * t) * r, Math.sin(la * t) * r, -c * Math.sin(ln * t) * r];
}

export function haversine(a, b) {
  const R = 6371, t = Math.PI / 180;
  const h =
    Math.sin(((b[0] - a[0]) * t) / 2) ** 2 +
    Math.cos(a[0] * t) * Math.cos(b[0] * t) * Math.sin(((b[1] - a[1]) * t) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const fmtKm = (n) => Math.round(n).toLocaleString('en-US');

/* 夜色地形贴图（等距圆柱）：3D 作纹理，2D 作重投影采样源。'4k'=全屏装置，'1k'=首页 mini/弱机 */
const imgCache = {};
function loadImage(url) {
  if (imgCache[url]) return imgCache[url];
  imgCache[url] = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
  return imgCache[url];
}
export const loadRelief = (size = '4k') => loadImage(`/assets/travels/earth-night-${size}.jpg`);
export const loadNormal = (size = '4k') => loadImage(`/assets/travels/earth-normal-${size}.jpg`);

/* 矢量图层：坐标均为量化整数（×100），loader 统一还原为度。
   rivers {r:scalerank, p:[ln,la…]}；coast/borders [ln,la…]×n；lakes {o:轮廓, t:earcut 索引} */
const vecCache = {};
async function loadVec(name, decode) {
  if (vecCache[name]) return vecCache[name];
  const res = await fetch(`/assets/travels/${name}.json`);
  const j = await res.json();
  const d100 = (arr) => arr.map((v) => v / 100);
  vecCache[name] = decode(j, d100);
  return vecCache[name];
}
export const loadRivers = () => loadVec('rivers', (j, d) => j.rivers.map((rv) => ({ r: rv.r, p: d(rv.p) })));
export const loadCoast = () => loadVec('coast', (j, d) => j.lines.map(d));
export const loadBorders = () => loadVec('borders', (j, d) => j.lines.map(d));
export const loadLakes = () => loadVec('lakes', (j, d) => j.polys.map((p) => ({ o: d(p.o), t: p.t })));

/* 球面线性插值（单位向量） */
export function slerp(a, b, t) {
  let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  dot = Math.min(1, Math.max(-1, dot));
  const th = Math.acos(dot);
  if (th < 1e-6) return [...a];
  const s = Math.sin(th);
  const k0 = Math.sin((1 - t) * th) / s;
  const k1 = Math.sin(t * th) / s;
  return [a[0] * k0 + b[0] * k1, a[1] * k0 + b[1] * k1, a[2] * k0 + b[2] * k1];
}

/* 大圆弧线采样：中点按角距抬升（近程贴地，远程高抛），返回 [{x,y,z,t}]（t=0..1 沿本弧） */
export function arcPoints(aLaLn, bLaLn, radius = R_EARTH, seg = 48) {
  const a = dirOf(aLaLn[0], aLaLn[1]);
  const b = dirOf(bLaLn[0], bLaLn[1]);
  const ang = Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
  const lift = Math.min(0.28, 0.02 + ang * 0.16); // 弧度越大弧越高
  const pts = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const p = slerp(a, b, t);
    const r = radius * (1.012 + lift * Math.sin(Math.PI * t));
    pts.push({ x: p[0] * r, y: p[1] * r, z: p[2] * r, t });
  }
  return pts;
}

/* 站点坐标（stops 输出只带 {t,i,km}，坐标按引用回查） */
export function stopPos(data, s) {
  return s.t === 'c' ? [data.cities[s.i].la, data.cities[s.i].ln] : [data.pois[s.i].la, data.pois[s.i].ln];
}

/* 章节航段序列：stops 相邻成段，附里程与站点名（UI 日志用） */
export function chapterLegs(data, ci) {
  const ch = data.chapters[ci];
  if (!ch) return [];
  const nameOf = (s) => (s.t === 'c' ? data.cities[s.i].n : data.pois[s.i].n);
  const posOf = (s) => stopPos(data, s);
  const legs = [];
  for (let i = 1; i < ch.stops.length; i++) {
    const a = ch.stops[i - 1];
    const b = ch.stops[i];
    legs.push({
      a: posOf(a),
      b: posOf(b),
      km: b.km - a.km,
      cumKm: b.km,
      aName: nameOf(a),
      bName: nameOf(b),
      bStop: b,
    });
  }
  return legs;
}

/* 视图基（2D 引擎用）：以 (laC,lnC) 为画面中心的 lookAt 正交基
   右手系约定下：r = up × f（物理相机右方）；u = f × r 保持北向上、r×u 指向观察者（不镜像） */
export function viewBasis(laC, lnC) {
  const f = dirOf(laC, lnC); // 指向画面中心
  const up = Math.abs(f[1]) > 0.98 ? [1, 0, 0] : [0, 1, 0];
  const r = norm(cross(up, f));
  const u = cross(f, r);
  return { r, u, f };
}
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function norm(a) {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}

/* 投影：单位球点 → 屏幕坐标（正交）；背面返回 null */
export function projectOrtho(p, basis, cx, cy, s) {
  const zf = p[0] * basis.f[0] + p[1] * basis.f[1] + p[2] * basis.f[2];
  if (zf <= 0.02) return null;
  return [cx + (p[0] * basis.r[0] + p[1] * basis.r[1] + p[2] * basis.r[2]) * s, cy - (p[0] * basis.u[0] + p[1] * basis.u[1] + p[2] * basis.u[2]) * s, zf];
}

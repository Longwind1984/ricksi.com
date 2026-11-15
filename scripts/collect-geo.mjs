#!/usr/bin/env node
// 真实地理底图烘焙 v4：/travels 装置的「真彩色重夜化」贴图 + 法线贴图 + 10m 矢量图层
// 数据源（公共领域 / NASA 公有素材镜像，可再分发）：
//   · Blue Marble 无云真彩色 4096×2048（turban/webgl-earth 镜像 2_no_clouds_4k.jpg）
//   · 高程 4096×2048（同仓 elev_bump_4k.jpg）→ Sobel 派生法线贴图
//   · Natural Earth 10m：rivers+lake centerlines / lakes / coastline / admin-0 boundary lines
//   · NASA GIBS WMTS BlueMarble_NextGeneration 500m（EPSG:4326 瓦片，按美洲 bbox 抓取，v7 高分辨率贴片）
// 产物（public/assets/travels/）：
//   earth-night-4k.jpg  真彩色重夜化底图 4096×2048（3D 纹理 + 2D 重投影采样源，轻锐化）
//   earth-night-1k.jpg  同调色 1024×512（首页 mini / 弱机）
//   earth-normal-4k.jpg 法线贴图 4096×2048（桌面 3D Phong normalMap，全源分辨率）
//   earth-normal-2k.jpg 法线贴图 2048×1024（移动端 3D）
//   earth-night-am-4k.jpg / am-2k.jpg   GIBS L1 美洲贴片（-126..-28° × -58..46°，约 39px/° / 19px/°）
//   earth-night-core-4k.jpg             GIBS L2 中美洲-哥伦比亚核心贴片（-95..-65° × 0..25°，约 136px/°）
//   rivers.json         10m 河流 scalerank≤7（抽稀 0.02°、量化 0.005°）
//   lakes.json          10m 湖泊（earcut 预三角化 {o:轮廓, t:索引}）
//   coast.json          10m 海岸线折线
//   borders.json        10m 国界折线
// 缓存：scripts/.cache/geo/（原始下载不重复拉取；不入库）
import { mkdir, readFile, writeFile, access, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import earcut from 'earcut';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, 'scripts/.cache/geo');
const OUT = join(ROOT, 'public/assets/travels');

const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';
const SRC = {
  truecolor: {
    url: 'https://raw.githubusercontent.com/turban/webgl-earth/master/images/2_no_clouds_4k.jpg',
    file: join(CACHE, 'blue-marble-no-clouds-4k.jpg'),
  },
  elev: {
    url: 'https://raw.githubusercontent.com/turban/webgl-earth/master/images/elev_bump_4k.jpg',
    file: join(CACHE, 'elev-bump-4k.jpg'),
  },
  rivers: { url: `${NE}/ne_10m_rivers_lake_centerlines.geojson`, file: join(CACHE, 'ne_10m_rivers.geojson') },
  lakes: { url: `${NE}/ne_10m_lakes.geojson`, file: join(CACHE, 'ne_10m_lakes.geojson') },
  coast: { url: `${NE}/ne_10m_coastline.geojson`, file: join(CACHE, 'ne_10m_coastline.geojson') },
  borders: { url: `${NE}/ne_10m_admin_0_boundary_lines_land.geojson`, file: join(CACHE, 'ne_10m_borders.geojson') },
};

async function fetchCached({ url, file }) {
  try {
    await access(file);
    return await readFile(file);
  } catch { /* 未缓存 */ }
  console.log('下载', url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, buf);
  return buf;
}

/* ---------- 夜化调色（保色相） ---------- */
/* 高纬调光：南极冰原/格陵兰在源图里是纯白，夜色装置里太抢戏——按纬度压暗 */
function latDim(lat) {
  if (lat < -60) return 0.3;
  if (lat < -50) return 0.3 + ((lat + 60) / 10) * 0.7;
  if (lat > 78) return 0.55;
  if (lat > 66) return 1 - ((lat - 66) / 12) * 0.45;
  return 1;
}
// 单像素夜化：亮度保色相压暗 → 阴影向钴蓝偏移 → 轻降饱和
function nightGrade(r, g, b, dim) {
  const L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  /* 乘性压暗：高光 0.72、阴影 0.30 —— 云层/雪原仍亮，夜色沉下去 */
  const gain = 0.3 + 0.42 * L;
  r *= gain;
  g *= gain;
  b *= gain;
  /* 阴影蓝移：越暗越向钴蓝夜色靠（t² 只在深影起效），保留地形/沙漠/森林色相 */
  const t = 1 - L;
  const sh = 0.42 * t * t;
  const NR = 16, NG = 32, NB = 84;
  r += (NR - r) * sh;
  g += (NG - g) * sh;
  b += (NB - b) * sh;
  /* 轻降饱和 0.88：夜晚没那么多彩 */
  const L2 = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  r = L2 + (r - L2) * 0.88;
  g = L2 + (g - L2) * 0.88;
  b = L2 + (b - L2) * 0.88;
  /* 海洋地板亮度保底（纯黑会吞掉海岸线图层） */
  const L3 = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (L3 < 9) {
    const k = 9 / Math.max(1, L3);
    r *= k;
    g *= k;
    b *= k;
  }
  return [Math.min(255, r * dim) | 0, Math.min(255, g * dim) | 0, Math.min(255, b * dim) | 0];
}

async function gradeAt(buf, w, h, outFile) {
  const { data, info } = await sharp(buf).resize(w, h).raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    const row = (i / w) | 0;
    const lat = 90 - ((row + 0.5) / h) * 180;
    const [r, g, b] = nightGrade(data[i * 3], data[i * 3 + 1], data[i * 3 + 2], latDim(lat));
    out[i * 3] = r;
    out[i * 3 + 1] = g;
    out[i * 3 + 2] = b;
  }
  await mkdir(OUT, { recursive: true });
  /* 轻锐化抵消 JPEG 涂抹与近景放大的发虚（近景清晰度主要靠 4K 法线 + 矢量层） */
  await sharp(out, { raw: { width: w, height: h, channels: 3 } }).sharpen({ sigma: 0.9, m1: 0.5, m2: 0.2 }).jpeg({ quality: 85, mozjpeg: true }).toFile(outFile);
}

async function bakeTextures() {
  const buf = await fetchCached(SRC.truecolor);
  await gradeAt(buf, 4096, 2048, join(OUT, 'earth-night-4k.jpg'));
  console.log('earth-night-4k.jpg 烘焙完成');
  await gradeAt(buf, 1024, 512, join(OUT, 'earth-night-1k.jpg'));
  console.log('earth-night-1k.jpg 烘焙完成');
  await rm(join(OUT, 'earth-night.jpg'), { force: true }); // v3 单色版退役
}

/* ---------- 法线贴图（高程 → Sobel 法线）：4K 全分辨率（桌面 3D）+ 2K（移动端） ---------- */
async function bakeNormal() {
  const buf = await fetchCached(SRC.elev);
  for (const [W, H, name] of [[4096, 2048, 'earth-normal-4k.jpg'], [2048, 1024, 'earth-normal-2k.jpg']]) {
    const S = 2.2; // 梯度强度
    const { data } = await sharp(buf).resize(W, H).grayscale().raw().toBuffer({ resolveWithObject: true });
    const out = Buffer.alloc(W * H * 3);
    const at = (x, y) => data[((y + H) % H) * W + ((x + W) % W)]; // 经向无缝 wrap
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dx = (at(x + 1, y) - at(x - 1, y)) * (S / 255);
        const dy = (at(x, y + 1) - at(x, y - 1)) * (S / 255);
        const inv = 1 / Math.hypot(dx, dy, 1);
        const i = (y * W + x) * 3;
        out[i] = (-dx * inv * 0.5 + 0.5) * 255;
        out[i + 1] = (dy * inv * 0.5 + 0.5) * 255; // three 切线空间 +Y（green-up）
        out[i + 2] = (inv * 0.5 + 0.5) * 255;
      }
    }
    await mkdir(OUT, { recursive: true });
    await sharp(out, { raw: { width: W, height: H, channels: 3 } }).jpeg({ quality: 85, mozjpeg: true }).toFile(join(OUT, name));
    console.log(`${name} 烘焙完成`);
  }
}

/* ---------- 矢量通用：抽稀 + 量化整数（×100，引擎端 /100 还原度数） + 碎线过滤 ---------- */
function decimate(line, minStep) {
  const pts = [];
  let last = null;
  for (const [ln, la] of line) {
    if (last && Math.hypot(ln - last[0], la - last[1]) < minStep) continue;
    last = [ln, la];
    pts.push([Math.round(ln * 100), Math.round(la * 100)]);
  }
  const end = [Math.round(line[line.length - 1][0] * 100), Math.round(line[line.length - 1][1] * 100)];
  if (pts.length && (pts[pts.length - 1][0] !== end[0] || pts[pts.length - 1][1] !== end[1])) pts.push(end);
  return pts;
}
/* 碎线过滤：跨度 <minSpan° 的线/面丢掉——小岛/细碎片吃掉大半体积，视觉上不可见 */
const span = (flat) => {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let i = 0; i + 1 < flat.length; i += 2) {
    if (flat[i] < x0) x0 = flat[i];
    if (flat[i] > x1) x1 = flat[i];
    if (flat[i + 1] < y0) y0 = flat[i + 1];
    if (flat[i + 1] > y1) y1 = flat[i + 1];
  }
  return Math.max(x1 - x0, y1 - y0) / 100;
};
const linesOf = (f) => (f.geometry.type === 'MultiLineString' ? f.geometry.coordinates : [f.geometry.coordinates]);

async function bakeRivers() {
  const gj = JSON.parse((await fetchCached(SRC.rivers)).toString('utf8'));
  const rivers = [];
  for (const f of gj.features) {
    const rank = f.properties?.scalerank ?? 99;
    if (rank > 7) continue;
    for (const line of linesOf(f)) {
      const pts = decimate(line, 0.05);
      if (pts.length >= 2 && span(pts.flat()) >= 0.4) rivers.push({ r: rank, p: pts.flat() });
    }
  }
  rivers.sort((a, b) => a.r - b.r);
  const payload = JSON.stringify({ n: rivers.length, rivers });
  await writeFile(join(OUT, 'rivers.json'), payload);
  console.log(`rivers.json：${rivers.length} 条，${(payload.length / 1024) | 0} KB`);
}

async function bakeLines(key, outFile, label, minStep, minSpan) {
  const gj = JSON.parse((await fetchCached(SRC[key])).toString('utf8'));
  const lines = [];
  for (const f of gj.features) {
    for (const line of linesOf(f)) {
      const pts = decimate(line, minStep);
      if (pts.length >= 2 && span(pts.flat()) >= minSpan) lines.push(pts.flat());
    }
  }
  const payload = JSON.stringify({ n: lines.length, lines });
  await writeFile(join(OUT, outFile), payload);
  console.log(`${outFile}：${lines.length} 条${label}，${(payload.length / 1024) | 0} KB`);
}

async function bakeLakes() {
  const gj = JSON.parse((await fetchCached(SRC.lakes)).toString('utf8'));
  const polys = [];
  let skipped = 0;
  for (const f of gj.features) {
    const rank = f.properties?.scalerank ?? 99;
    if (rank > 5) continue;
    const groups = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
    for (const rings of groups) {
      // rings[0] 外环 + 其余为洞；跨 180° 的湖（罕见）跳过防三角化错乱
      const lns = rings[0].map((p) => p[0]);
      if (Math.max(...lns) - Math.min(...lns) > 90) { skipped++; continue; }
      const flat = [];
      const holeIdx = [];
      for (let ri = 0; ri < rings.length; ri++) {
        const ring = decimate(rings[ri], 0.035);
        if (ring.length < 3) break;
        if (ri > 0) holeIdx.push(flat.length / 2);
        for (const [ln, la] of ring) flat.push(ln, la);
      }
      if (flat.length < 6 || span(flat) < 0.15) continue;
      try {
        const t = earcut(flat, holeIdx.length ? holeIdx : undefined);
        if (t.length >= 3) polys.push({ o: flat, t });
      } catch {
        skipped++; // 自相交等异常：降级为仅轮廓（t 缺省）
        polys.push({ o: flat, t: [] });
      }
    }
  }
  const payload = JSON.stringify({ n: polys.length, polys });
  await writeFile(join(OUT, 'lakes.json'), payload);
  console.log(`lakes.json：${polys.length} 个湖泊面（跳过 ${skipped}），${(payload.length / 1024) | 0} KB`);
}

await bakeTextures();
await bakeNormal();
await bakeRivers();
await bakeLines('coast', 'coast.json', '海岸线', 0.08, 0.5);
await bakeLines('borders', 'borders.json', '国界线', 0.045, 0.25);
await bakeLakes();

/* ---------- GIBS 高分辨率区域贴片（v7）：NASA BlueMarble_NextGeneration 500m WMTS ----------
   EPSG:4326 瓦片按 bbox 抓取 → 拼接 → 夜化 → 区域贴图；运行时按相机距离惰性加载/渐显/卸载。
   整体失败（限流/断网/服务变更）只警告不中断——缺贴片资产时站点保持现状（优雅降级）。 */
const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best';
const GIBS_CACHE = join(CACHE, 'gibs');
const GIBS_UA = { 'user-agent': 'rick-homepage-collect-geo/1.0 (personal static site bake; NASA GIBS)' };
/* 500m TileMatrixSet 实测（GetCapabilities）：z0..z8 各级 matrix 宽度非 2 幂 */
const GIBS_MAT_W = [2, 3, 5, 10, 20, 40, 80, 160, 320];
const gibsSpan = (z) => 360 / GIBS_MAT_W[z]; // 单片经度跨度（°），正方 512px

async function gibsTile(z, row, col) {
  const file = join(GIBS_CACHE, `z${z}`, `r${row}`, `${col}.jpg`);
  try {
    await access(file);
    return await readFile(file);
  } catch { /* 未缓存 */ }
  const url = `${GIBS}/BlueMarble_NextGeneration/default/default/500m/${z}/${row}/${col}.jpg`;
  let lastErr = null;
  for (let att = 0; att < 4; att++) {
    try {
      const res = await fetch(url, { headers: GIBS_UA });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        await mkdir(dirname(file), { recursive: true });
        await writeFile(file, buf);
        return buf;
      }
      lastErr = new Error(`HTTP ${res.status}`);
      if (res.status === 400) break; // 参数错误，重试无用
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 700 * (att + 1)));
  }
  throw new Error(`GIBS 瓦片失败 z${z}/${row}/${col}：${lastErr?.message}`);
}

/* 小并发池（GIBS 礼貌并发 4） */
async function pool(items, n, fn) {
  let k = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (k < items.length) await fn(items[k++]);
    })
  );
}

/* 一个 bbox → 瓦片拼接 → 夜化 → 多档输出。bbox = [lng0, lng1, lat0, lat1]（西→东，南→北） */
async function bakeGibsPatch({ z, bbox, sizes }) {
  const [lng0, lng1, lat0, lat1] = bbox;
  const span = gibsSpan(z);
  const colMin = Math.floor((lng0 + 180) / span), colMax = Math.floor((lng1 + 180) / span);
  const rowMin = Math.floor((90 - lat1) / span), rowMax = Math.floor((90 - lat0) / span);
  const tasks = [];
  for (let r = rowMin; r <= rowMax; r++) for (let c = colMin; c <= colMax; c++) tasks.push([r, c]);
  console.log(`GIBS z${z} 抓取 ${tasks.length} 片（${colMax - colMin + 1}×${rowMax - rowMin + 1}，${(512 / span).toFixed(0)}px/° 源）`);
  await pool(tasks, 4, async ([r, c]) => gibsTile(z, r, c));

  /* 拼接（左上原点 = (lng = -180+colMin·span, lat = 90-rowMin·span)） */
  const mw = (colMax - colMin + 1) * 512, mh = (rowMax - rowMin + 1) * 512;
  const mosaic = Buffer.alloc(mw * mh * 3);
  for (const [r, c] of tasks) {
    const raw = await sharp(await gibsTile(z, r, c)).raw().toBuffer();
    for (let y = 0; y < 512; y++) raw.copy(mosaic, (((r - rowMin) * 512 + y) * mw + (c - colMin) * 512) * 3, y * 512 * 3, (y + 1) * 512 * 3);
  }
  const pxPerDeg = 512 / span;
  const oLng = -180 + colMin * span, oLat = 90 - rowMin * span;
  const cx = Math.max(0, Math.round((lng0 - oLng) * pxPerDeg)), cy = Math.max(0, Math.round((oLat - lat1) * pxPerDeg));
  const cw = Math.min(mw - cx, Math.round((lng1 - lng0) * pxPerDeg)), ch = Math.min(mh - cy, Math.round((lat1 - lat0) * pxPerDeg));

  for (const [outW, name] of sizes) {
    const outH = Math.round((outW * (lat1 - lat0)) / (lng1 - lng0));
    const { data } = await sharp(mosaic, { raw: { width: mw, height: mh, channels: 3 } })
      .extract({ left: cx, top: cy, width: cw, height: ch })
      .resize(outW, outH)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const out = Buffer.alloc(outW * outH * 3);
    for (let i = 0; i < outW * outH; i++) {
      const lat = lat1 - (((i / outW) | 0) + 0.5) * ((lat1 - lat0) / outH);
      const [r, g, b] = nightGrade(data[i * 3], data[i * 3 + 1], data[i * 3 + 2], latDim(lat));
      out[i * 3] = r;
      out[i * 3 + 1] = g;
      out[i * 3 + 2] = b;
    }
    await mkdir(OUT, { recursive: true });
    await sharp(out, { raw: { width: outW, height: outH, channels: 3 } })
      .sharpen({ sigma: 0.9, m1: 0.5, m2: 0.2 })
      .jpeg({ quality: 85, mozjpeg: true })
      .toFile(join(OUT, name));
    console.log(`${name} 烘焙完成：${outW}×${outH}（≈${(outW / (lng1 - lng0)).toFixed(0)}px/°）`);
  }
}

try {
  /* L1 美洲贴片：覆盖全部美洲 POI（含乌斯怀亚），z5（9°/片，56.9px/° 源） */
  await bakeGibsPatch({
    z: 5,
    bbox: [-126, -28, -58, 46],
    sizes: [
      [3840, 'earth-night-am-4k.jpg'], // 桌面 ≈39px/°（3.4× 全局密度）
      [1920, 'earth-night-am-2k.jpg'], // 移动 ≈19px/°
    ],
  });
  /* L2 中美洲-哥伦比亚核心贴片（故事密集区），z7（2.25°/片，227.6px/° 源） */
  await bakeGibsPatch({
    z: 7,
    bbox: [-95, -65, 0, 25],
    sizes: [[4096, 'earth-night-core-4k.jpg']], // 桌面 ≈136px/°（≈12× 全局密度）
  });
} catch (e) {
  console.warn(`⚠ GIBS 贴片烘焙跳过（${e.message}）——无贴片资产，站点保持现状`);
}

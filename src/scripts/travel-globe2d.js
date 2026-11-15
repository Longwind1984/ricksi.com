// 2D 画布地球引擎：首页迷你地球 + /travels 全屏回退（WebGL 不可用 / reduced-motion）共用
// 正交投影 + 视基平移旋转；无 three 依赖。真实地形（NASA 夜色贴图实时重投影）+ 大河描线 + 金色足迹。
import { dirOf, arcPoints, chapterLegs, viewBasis, projectOrtho, stopPos } from './travel-data.js';

const GOLD = '240, 207, 122';
const COBALT = '110, 145, 215';
const INK = '232, 240, 255';

function glowSprite(rgb, size = 48) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `rgba(${rgb},1)`);
  grad.addColorStop(0.25, `rgba(${rgb},0.85)`);
  grad.addColorStop(0.6, `rgba(${rgb},0.18)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

export function createGlobe2D(canvas, opts) {
  const { relief, rivers = [], coast = [], borders = [], lakes = [], data = null, mini = false, reducedMotion = false, onSelectPoi = null, stories = [], onSelectStory = null } = opts;
  const ctx = canvas.getContext('2d');
  const goldGlow = glowSprite(GOLD);

  /* 地形采样源：夜色贴图 → 1024×512 RGBA 平面数组（等距圆柱投影） */
  const SW = 1024, SH = 512;
  const srcPix = (() => {
    const c = document.createElement('canvas');
    c.width = SW;
    c.height = SH;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(relief, 0, 0, SW, SH);
    return g.getImageData(0, 0, SW, SH).data;
  })();
  /* 圆盘重投影缓冲（半分辨率）；视图指纹未变不重算 */
  const discCanvas = document.createElement('canvas');
  const discCtx = discCanvas.getContext('2d');
  let discBuf = null, discImg = null, discSize = 0, lastKey = '';
  /* 矢量图层单位向量预算（折线跨 180° 经线的跳点标记为 NaN，投影时断笔）。
     海岸层并入湖泊轮廓；mini 不算新图层（下方描线块整组 !mini 跳过） */
  const toVecs = (p) => {
    const out = new Float32Array((p.length / 2) * 3);
    for (let i = 0, o = 0; i + 1 < p.length; i += 2, o += 3) {
      if (o > 0 && Math.abs(p[i] - p[i - 2]) > 10) {
        out[o] = NaN; // 断笔标记
        continue;
      }
      const v = dirOf(p[i + 1], p[i]);
      out[o] = v[0];
      out[o + 1] = v[1];
      out[o + 2] = v[2];
    }
    return out;
  };
  const riverVecs = rivers.map((rv) => toVecs(rv.p));
  const coastVecs = mini ? [] : coast.concat(lakes.map((lk) => lk.o)).map(toVecs);
  const borderVecs = mini ? [] : borders.map(toVecs);
  const lakeVecs = mini ? [] : lakes.map((lk) => toVecs(lk.o));

  /* 视图状态：中心经纬 + 缩放（mini 固定，full 支持拖拽） */
  const view = { la: -6, ln: -78, tLa: -6, tLn: -78 };
  let W = 0, H = 0, dpr = 1, scale = 1;
  let chapter = null; // 当前章节（null = 全部）
  let arcsAlpha = 0; // 章节航线显隐过渡
  let replayState = null; // {chIdx, legs, legIdx, legT, arcs}
  let raf = 0, last = 0, alive = true;
  let idleAt = performance.now();
  let pointer = null; // 拖拽状态
  let hoverPoi = -1;

  /* 预计算：POI / 城市单位向量；章节弧（单位球采样）；同城拥挤度（密集区衰减，防叠成白斑） */
  const poiPts = (data?.pois ?? []).map((p) => ({ p, v: dirOf(p.la, p.ln), ph: Math.random() * Math.PI * 2, crowd: 0 }));
  for (let i = 0; i < poiPts.length; i++) {
    let c = 0;
    for (let j = 0; j < poiPts.length; j++) {
      if (i === j) continue;
      const dla = poiPts[i].p.la - poiPts[j].p.la, dln = poiPts[i].p.ln - poiPts[j].p.ln;
      if (dla * dla + dln * dln < 0.0625) c++;
    }
    poiPts[i].crowd = c;
  }
  const cityPts = (data?.cities ?? []).map((c, i) => ({ c, i, v: dirOf(c.la, c.ln) }));
  const storyPts = stories.map((s, i) => ({ s, i, v: dirOf(s.la, s.ln), ph: Math.random() * Math.PI * 2 }));
  const chArcs = (data?.chapters ?? []).map((_, ci) =>
    chapterLegs(data, ci).map((leg) => ({ leg, pts: arcPoints(leg.a, leg.b, 1, 40) }))
  );

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = Math.min(W, H) * (mini ? 0.44 : 0.46);
  }

  /* ---------- 渲染一帧 ---------- */
  let paused = false;
  function frame(now) {
    if (!alive) return;
    if (paused) { raf = requestAnimationFrame(frame); return; }
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    const t = now / 1000;
    tickReplay(dt);

    /* 视图缓动 + 空闲自转 */
    if (replayState) {
      const st = replayState;
      const leg = st.legs[st.legIdx];
      if (leg) {
        /* 跟飞：贴着脉冲活点（而非航段中点），atan2(-z,x) 为右手系经度约定 */
        const pts = st.arcs[st.legIdx].pts;
        const i = Math.min(pts.length - 1, Math.floor(pts.length * st.legT));
        const c = pts[i];
        const len = Math.hypot(c.x, c.y, c.z) || 1;
        view.tLa = (Math.asin(c.y / len) * 180) / Math.PI;
        view.tLn = (Math.atan2(-c.z, c.x) * 180) / Math.PI;
      }
    } else if (!pointer && !reducedMotion && now - idleAt > 5000) {
      view.tLn += dt * (mini ? 2.2 : 1.4);
    }
    view.la += (view.tLa - view.la) * Math.min(1, dt * 3.2);
    view.ln += (view.tLn - view.ln) * Math.min(1, dt * 3.2);
    const basis = viewBasis(view.la, view.ln);
    const cx = W / 2, cy = H / 2;
    arcsAlpha += ((chapter != null ? 1 : 0) - arcsAlpha) * Math.min(1, dt * 4);

    ctx.clearRect(0, 0, W, H);

    /* 海洋盘 */
    const og = ctx.createRadialGradient(cx, cy, scale * 0.2, cx, cy, scale);
    og.addColorStop(0, '#0C1A3E');
    og.addColorStop(0.82, '#08122C');
    og.addColorStop(1, '#060D22');
    ctx.fillStyle = og;
    ctx.beginPath();
    ctx.arc(cx, cy, scale, 0, Math.PI * 2);
    ctx.fill();
    /* 边缘光晕 */
    ctx.strokeStyle = 'rgba(90, 130, 220, 0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, scale + 0.5, 0, Math.PI * 2);
    ctx.stroke();

    /* 真实地形：夜色贴图 → 当前视角正交重投影（半分辨率缓冲 + 边缘暗角） */
    {
      const size = Math.max(96, Math.min(448, Math.round(scale)));
      if (size !== discSize) {
        discSize = size;
        discCanvas.width = discCanvas.height = size;
        discImg = discCtx.createImageData(size, size);
        discBuf = new Uint32Array(discImg.data.buffer);
        lastKey = '';
      }
      const key = `${size}|${view.la.toFixed(2)}|${view.ln.toFixed(2)}`;
      if (key !== lastKey) {
        lastKey = key;
        const { r, u, f } = basis;
        const h = size / 2;
        for (let j = 0; j < size; j++) {
          const ny = (h - j - 0.5) / h;
          for (let i = 0; i < size; i++) {
            const nx = (i + 0.5 - h) / h;
            const rr = nx * nx + ny * ny;
            if (rr > 1) {
              discBuf[j * size + i] = 0;
              continue;
            }
            const zf = Math.sqrt(1 - rr);
            const px = r[0] * nx + u[0] * ny + f[0] * zf;
            const py = r[1] * nx + u[1] * ny + f[1] * zf;
            const pz = r[2] * nx + u[2] * ny + f[2] * zf;
            const la = Math.asin(Math.max(-1, Math.min(1, py)));
            const ln = Math.atan2(-pz, px);
            let sx = (((ln * 180) / Math.PI + 180) / 360) * SW | 0;
            let sy = ((90 - (la * 180) / Math.PI) / 180) * SH | 0;
            if (sx >= SW) sx = SW - 1;
            if (sy >= SH) sy = SH - 1;
            if (sy < 0) sy = 0;
            const o = (sy * SW + sx) * 4;
            /* 球面明暗：临边昏暗（limb darkening），中心微提亮 */
            const sh = 0.42 + 0.62 * zf;
            const R8 = Math.min(255, srcPix[o] * sh) | 0;
            const G8 = Math.min(255, srcPix[o + 1] * sh) | 0;
            const B8 = Math.min(255, srcPix[o + 2] * sh) | 0;
            discBuf[j * size + i] = (255 << 24) | (B8 << 16) | (G8 << 8) | R8;
          }
        }
        discCtx.putImageData(discImg, 0, 0);
      }
      ctx.drawImage(discCanvas, cx - scale, cy - scale, scale * 2, scale * 2);
    }

    /* 地理矢量层（mini 整组不画；NaN 断笔跨 180° 经线）。
       10m 数据点距常小于屏上 0.75px，描线跳过亚像素段（视觉无损，省大半 path 调用） */
    if (!mini) {
      const strokeVecs = (vecs) => {
        ctx.beginPath();
        for (const arr of vecs) {
          let started = false, lx = 0, ly = 0;
          for (let o = 0; o + 2 < arr.length; o += 3) {
            if (arr[o] !== arr[o]) { started = false; continue; }
            const s = projectOrtho([arr[o], arr[o + 1], arr[o + 2]], basis, cx, cy, scale);
            if (!s) { started = false; continue; }
            if (!started) { ctx.moveTo(s[0], s[1]); started = true; }
            else if (Math.abs(s[0] - lx) + Math.abs(s[1] - ly) > 0.75) ctx.lineTo(s[0], s[1]);
            else continue;
            lx = s[0];
            ly = s[1];
          }
        }
        ctx.stroke();
      };
      /* 湖泊填面：全部顶点可见才填（避免跨临边涂抹）；湖岸描线已并入 coastVecs */
      if (lakeVecs.length) {
        ctx.fillStyle = 'rgba(24, 52, 100, 0.42)';
        for (const arr of lakeVecs) {
          ctx.beginPath();
          let ok = true, lx = 0, ly = 0, n = 0;
          for (let o = 0; o + 2 < arr.length; o += 3) {
            if (arr[o] !== arr[o]) { ok = false; break; }
            const s = projectOrtho([arr[o], arr[o + 1], arr[o + 2]], basis, cx, cy, scale);
            if (!s) { ok = false; break; }
            if (n > 0 && Math.abs(s[0] - lx) + Math.abs(s[1] - ly) <= 0.75) continue;
            if (n === 0) ctx.moveTo(s[0], s[1]);
            else ctx.lineTo(s[0], s[1]);
            lx = s[0];
            ly = s[1];
            n++;
          }
          if (ok && n > 2) {
            ctx.closePath();
            ctx.fill();
          }
        }
      }
      if (coastVecs.length) {
        ctx.strokeStyle = 'rgba(110, 145, 215, 0.3)';
        ctx.lineWidth = 1;
        strokeVecs(coastVecs);
      }
      if (riverVecs.length) {
        ctx.strokeStyle = 'rgba(130, 165, 228, 0.42)';
        ctx.lineWidth = 1;
        strokeVecs(riverVecs);
      }
      if (borderVecs.length) {
        ctx.strokeStyle = 'rgba(110, 145, 215, 0.18)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        strokeVecs(borderVecs);
        ctx.setLineDash([]);
      }
    }

    /* 章节航线（当前章节 / 放映进度） */
    if (data && chapter != null && arcsAlpha > 0.02) {
      ctx.lineCap = 'round';
      const legs = chArcs[chapter];
      for (let li = 0; li < legs.length; li++) {
        const { pts } = legs[li];
        let upto = 1;
        if (replayState) {
          if (li < replayState.legIdx) upto = 1;
          else if (li === replayState.legIdx) upto = replayState.legT;
          else upto = 0;
        }
        if (upto <= 0) continue;
        ctx.strokeStyle = `rgba(${GOLD}, ${0.6 * arcsAlpha})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        let started = false;
        const n = Math.max(2, Math.floor(pts.length * upto));
        for (let i = 0; i < n; i++) {
          const s = projectOrtho([pts[i].x, pts[i].y, pts[i].z], basis, cx, cy, scale);
          if (!s) { started = false; continue; }
          if (!started) { ctx.moveTo(s[0], s[1]); started = true; }
          else ctx.lineTo(s[0], s[1]);
        }
        ctx.stroke();
      }
    }

    /* 城市光晕 + 标签（full 模式；标签带简易屏幕碰撞，密集区让位给高 k 城市）。
       与 3D 同形态：暖色径向渐隐光斑（替代细环），尺寸 ∝ √k */
    if (data) {
      const showK = chapter == null ? 3 : 1;
      const cur = replayState?.legs[replayState.legIdx];
      const placed = [];
      const sorted = [...cityPts].sort((a, b) => b.c.k - a.c.k);
      for (const cp of sorted) {
        if (cp.c.k < showK) continue;
        if (chapter != null && !cp.c.ch.includes(chapter)) continue;
        const s = projectOrtho(cp.v, basis, cx, cy, scale);
        if (!s) continue;
        const r = 2.4 + Math.sqrt(cp.c.k) * 1.15; // 标签锚位沿用细环尺度
        const gr = r * 3.1;
        const grad = ctx.createRadialGradient(s[0], s[1], 0, s[0], s[1], gr);
        grad.addColorStop(0, `rgba(255, 196, 116, ${cp.c.k >= 6 ? 0.34 : 0.2})`);
        grad.addColorStop(0.45, `rgba(255, 178, 92, ${cp.c.k >= 6 ? 0.13 : 0.08})`);
        grad.addColorStop(1, 'rgba(255, 178, 92, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(s[0], s[1], gr, 0, Math.PI * 2);
        ctx.fill();
        if (!mini && cp.c.k >= 4) {
          const lx = s[0] + r + 4, ly = s[1] + 3.5;
          const w = cp.c.n.length * 6.6 + 8;
          let hit = false;
          for (const b of placed) {
            if (lx < b.x + b.w && lx + w > b.x && Math.abs(ly - b.y) < 12) { hit = true; break; }
          }
          if (hit) continue;
          placed.push({ x: lx, y: ly, w });
          ctx.font = '10.5px "Geist Mono", ui-monospace, monospace';
          ctx.fillStyle = cur && (cur.bStop.t === 'c' && cur.bStop.i === cp.i) ? `rgba(${GOLD}, 1)` : `rgba(${INK}, 0.72)`;
          ctx.fillText(cp.c.n, lx, ly);
        }
      }
    }

    /* 足迹点（金光闪烁） */
    for (const pp of poiPts) {
      const s = projectOrtho(pp.v, basis, cx, cy, scale);
      if (!s) continue;
      const inCh = chapter == null || pp.p.ch.includes(chapter);
      const att = Math.pow(1 + pp.crowd, -0.85); // 与 3D 同口径：密集城区总分亮度封顶，防白饼
      const tw = 0.72 + 0.28 * Math.sin(t * 1.6 + pp.ph);
      const a = (inCh ? 0.95 : 0.12) * tw * att;
      const sz = (mini ? 7 : 9) * (pp.p.r ? 0.9 + (pp.p.r - 4) * 0.25 : 1) * (1 - 0.35 * (1 - att));
      ctx.globalAlpha = a;
      ctx.drawImage(goldGlow, s[0] - sz / 2, s[1] - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;

    /* 游记故事标记（金色菱形 = 有照片与长文的地点；mini 不画） */
    if (!mini && storyPts.length) {
      for (const sp of storyPts) {
        const s = projectOrtho(sp.v, basis, cx, cy, scale);
        if (!s) continue;
        const tw = 0.75 + 0.25 * Math.sin(t * 1.4 + sp.ph);
        const r = 4.6 * tw + 1.2;
        ctx.save();
        ctx.translate(s[0], s[1]);
        ctx.rotate(Math.PI / 4);
        ctx.globalAlpha = 0.55 * tw;
        ctx.strokeStyle = `rgba(${GOLD}, 0.9)`;
        ctx.lineWidth = 1;
        ctx.strokeRect(-r * 1.3, -r * 1.3, r * 2.6, r * 2.6);
        ctx.globalAlpha = 0.95 * tw;
        ctx.fillStyle = 'rgba(255, 233, 186, 0.95)';
        ctx.fillRect(-r / 2, -r / 2, r, r);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    /* 放映脉冲（旅行者光点 + 短尾迹） */
    if (replayState) {
      const st = replayState;
      const leg = st.arcs[st.legIdx];
      if (leg) {
        const i = Math.min(leg.pts.length - 1, Math.floor(leg.pts.length * st.legT));
        for (let k = 0; k <= 6; k++) {
          const p = leg.pts[Math.max(0, i - k * 2)];
          const s = projectOrtho([p.x, p.y, p.z], basis, cx, cy, scale);
          if (!s) continue;
          ctx.globalAlpha = (1 - k / 7) * 0.9;
          const sz = 26 - k * 3;
          ctx.drawImage(goldGlow, s[0] - sz / 2, s[1] - sz / 2, sz, sz);
        }
        ctx.globalAlpha = 1;
      }
    }

    raf = requestAnimationFrame(frame);
  }

  /* ---------- 放映推进（每帧开头调用） ---------- */
  function tickReplay(dt) {
    const st = replayState;
    if (!st) return;
    const leg = st.legs[st.legIdx];
    if (!leg) return finishReplay();
    st.legT += dt / st.durs[st.legIdx];
    if (st.legT >= 1) {
      st.cbs.onLeg?.(st.legIdx, leg.cumKm, st.legs.length);
      st.legIdx++;
      st.legT = 0;
      if (st.legIdx >= st.legs.length) return finishReplay();
    }
    const cur = st.legs[st.legIdx];
    st.cbs.onTick?.(cur.cumKm - cur.km * (1 - st.legT));
  }
  function finishReplay() {
    const st = replayState;
    replayState = null;
    idleAt = performance.now();
    st?.cbs.onDone?.();
  }

  /* ---------- 交互 ---------- */
  function onDown(e) {
    pointer = { x: e.clientX, y: e.clientY, moved: 0 };
    idleAt = performance.now();
    canvas.setPointerCapture?.(e.pointerId);
  }
  function onMove(e) {
    if (pointer) {
      const dx = e.clientX - pointer.x, dy = e.clientY - pointer.y;
      pointer.moved += Math.abs(dx) + Math.abs(dy);
      view.tLn -= dx * 0.25;
      view.tLa = Math.max(-72, Math.min(72, view.tLa + dy * 0.25));
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      idleAt = performance.now();
    } else if ((onSelectPoi || onSelectStory) && !mini) {
      hoverPoi = hitTarget(e);
      canvas.style.cursor = hoverPoi ? 'pointer' : 'grab';
    }
  }
  function onUp(e) {
    if (pointer && pointer.moved < 6) {
      const hit = hitTarget(e);
      if (hit?.k === 'p') onSelectPoi?.(hit.i);
      else if (hit?.k === 's') onSelectStory?.(hit.i);
    }
    pointer = null;
    idleAt = performance.now();
  }
  function hitTarget(e) {
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const basis = viewBasis(view.la, view.ln);
    let best = null, sd = 16;
    if (storyPts.length && !mini) {
      for (let i = 0; i < storyPts.length; i++) {
        const s = projectOrtho(storyPts[i].v, basis, W / 2, H / 2, scale);
        if (!s) continue;
        const d = Math.hypot(s[0] - mx, s[1] - my);
        if (d < sd) { sd = d; best = { k: 's', i }; }
      }
    }
    let bd = Math.min(14, sd * 0.75); // 菱形是刻意的目标：POI 必须显著更近才胜出
    for (let i = 0; i < poiPts.length; i++) {
      const s = projectOrtho(poiPts[i].v, basis, W / 2, H / 2, scale);
      if (!s) continue;
      const d = Math.hypot(s[0] - mx, s[1] - my);
      if (d < bd) { bd = d; best = { k: 'p', i }; }
    }
    return best;
  }

  resize();
  window.addEventListener('resize', resize);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.style.cursor = 'grab';
  raf = requestAnimationFrame(frame);

  return {
    setChapter(i) {
      chapter = i;
      replayState = null;
      if (i != null && data?.chapters[i]?.stops.length) {
        const st = data.chapters[i].stops;
        const mid = st[Math.floor(st.length / 2)];
        const [la, ln] = stopPos(data, mid);
        view.tLa = la;
        view.tLn = ln;
      }
      idleAt = performance.now();
    },
    getChapter() { return chapter; },
    replay(chIdx, cbs = {}) {
      if (!data) return () => {};
      const legs = chapterLegs(data, chIdx);
      if (!legs.length) { cbs.onDone?.(); return () => {}; }
      chapter = chIdx;
      replayState = {
        legs,
        arcs: chArcs[chIdx],
        legIdx: 0,
        legT: 0,
        durs: legs.map((l) => Math.min(2.4, Math.max(0.55, l.km / 900))),
        cbs,
      };
      return () => { replayState = null; idleAt = performance.now(); };
    },
    stopReplay() { replayState = null; idleAt = performance.now(); },
    isReplaying() { return !!replayState; },
    setPaused(b) {
      if (!b && paused) last = performance.now();
      paused = !!b;
    },
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
    },
  };
}

// 博物志落地页交互：滚动揭示 + count-up + 4 个交互。
// ① 三联动 dashboard（事件总线 · 真数据 curate 子集）② 真实地形流散图（手写 geoConicEqualArea）
// ③ 多 Agent 拓扑 ④ 反幻觉状态机 + 叙事打架。零新依赖；数据 fetch 失败回退静态截图。

let abort = null;
const NS = 'http://www.w3.org/2000/svg';
const RAD = Math.PI / 180;
const svgEl = (name, attrs = {}) => {
  const e = document.createElementNS(NS, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
};
const txt = (el, s) => { el.textContent = s; return el; };

/* ============ 通用：滚动揭示 + count-up ============ */
function initCommon(sig, reduced) {
  const reveals = document.querySelectorAll('.mc-reveal');
  if (reveals.length) {
    const show = (el) => el.classList.add('mc-in');
    if (reduced) reveals.forEach(show);
    else {
      try {
        const io = new IntersectionObserver((es) => {
          es.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
        }, { threshold: 0.1 });
        reveals.forEach((el) => io.observe(el));
        sig.addEventListener('abort', () => io.disconnect());
      } catch { reveals.forEach(show); }
      setTimeout(() => reveals.forEach(show), 1800);
    }
  }
  const nums = document.querySelectorAll('.mc-num[data-count]');
  const run = (el) => {
    const target = parseFloat(el.dataset.count);
    if (Number.isNaN(target)) return;
    if (reduced) { el.textContent = String(target); return; }
    const dur = 1100, t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (nums.length) {
    try {
      const io = new IntersectionObserver((es) => {
        es.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
      }, { threshold: 0.6 });
      nums.forEach((el) => io.observe(el));
      sig.addEventListener('abort', () => io.disconnect());
    } catch { nums.forEach(run); }
  }
}

/* ============ Hero 翻牌 ============ */
function initFlips(sig) {
  document.querySelectorAll('.mc-flip').forEach((b) => {
    b.addEventListener('click', () => b.classList.toggle('is-flipped'), { signal: sig });
  });
}

/* ============ 几何 / 投影工具（手写 geoConicEqualArea） ============ */
function eachCoord(geom, cb) {
  if (!geom) return;
  const t = geom.type, c = geom.coordinates;
  if (t === 'Point') cb(c);
  else if (t === 'LineString' || t === 'MultiPoint') c.forEach(cb);
  else if (t === 'Polygon' || t === 'MultiLineString') c.forEach((r) => r.forEach(cb));
  else if (t === 'MultiPolygon') c.forEach((p) => p.forEach((r) => r.forEach(cb)));
}
function makeProjection(featureColls, w, h, pad) {
  const f1 = 25 * RAD, f2 = 47 * RAD, l0 = 105 * RAD;
  const n = (Math.sin(f1) + Math.sin(f2)) / 2;
  const C = Math.cos(f1) ** 2 + 2 * n * Math.sin(f1);
  const rho0 = Math.sqrt(C) / n;
  const raw = (lon, lat) => {
    const th = n * (lon * RAD - l0);
    const rho = Math.sqrt(Math.max(0, C - 2 * n * Math.sin(lat * RAD))) / n;
    return [rho * Math.sin(th), rho0 - rho * Math.cos(th)];
  };
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  featureColls.forEach((fc) => (fc.features || []).forEach((ft) => eachCoord(ft.geometry, ([lon, lat]) => {
    const [x, y] = raw(lon, lat);
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  })));
  const aw = w - 2 * pad, ah = h - 2 * pad;
  const s = Math.min(aw / (x1 - x0 || 1), ah / (y1 - y0 || 1));
  const ox = pad + (aw - (x1 - x0) * s) / 2;
  const oy = pad + (ah - (y1 - y0) * s) / 2;
  const project = ([lon, lat]) => {
    const [x, y] = raw(lon, lat);
    return [ox + (x - x0) * s, oy + (y1 - y) * s]; // 翻 y，北在上
  };
  return project;
}
function ringToPath(ring, project) {
  return ring.map((c, i) => `${i ? 'L' : 'M'}${project(c).map((v) => v.toFixed(1)).join(' ')}`).join(' ') + 'Z';
}
function geomToPaths(geom, project) {
  const out = [];
  if (geom.type === 'Polygon') out.push(geom.coordinates.map((r) => ringToPath(r, project)).join(' '));
  else if (geom.type === 'MultiPolygon') geom.coordinates.forEach((p) => out.push(p.map((r) => ringToPath(r, project)).join(' ')));
  else if (geom.type === 'LineString') out.push(geom.coordinates.map((c, i) => `${i ? 'L' : 'M'}${project(c).map((v) => v.toFixed(1)).join(' ')}`).join(' '));
  else if (geom.type === 'MultiLineString') geom.coordinates.forEach((l) => out.push(l.map((c, i) => `${i ? 'L' : 'M'}${project(c).map((v) => v.toFixed(1)).join(' ')}`).join(' ')));
  return out;
}

/* ============ 数据加载 ============ */
const GEO = '/assets/museum/geo/';
async function loadData() {
  const files = {
    artifacts: '/assets/museum/artifacts.curated.json',
    terrain: GEO + 'china-terrain.geojson', physio: GEO + 'physio-features.geojson',
    rivers: GEO + 'rivers-major.geojson', exc: GEO + 'excavation-sites.geojson',
    museums: GEO + 'museums.geojson',
    shang: GEO + 'ancient-states-shang.geojson', xizhou: GEO + 'ancient-states-xizhou.geojson',
    chunqiu: GEO + 'ancient-states-chunqiu.geojson', zhanguo: GEO + 'ancient-states-zhanguo.geojson',
  };
  const out = {};
  await Promise.all(Object.entries(files).map(async ([k, u]) => {
    const r = await fetch(u);
    if (!r.ok) throw new Error('fetch ' + u + ' → ' + r.status);
    out[k] = await r.json();
  }));
  return out;
}

const ERA_ORDER = ['商', '西周', '春秋', '战国', '秦', '汉'];
const ERA_COLOR = { 商: '#8a9a6a', 西周: '#c06a4a', 春秋: '#6a86b8', 战国: '#b08050', 秦: '#9aa0ad', 汉: '#cBa463' };
const ERA_STATE = { 商: 'shang', 西周: 'xizhou', 春秋: 'chunqiu', 战国: 'zhanguo' };

/* ============ ① 三联动 dashboard ============ */
function initDashboard(data, sig, reduced) {
  const root = document.getElementById('mc-dash');
  const live = document.getElementById('mc-dash-live');
  const fallback = document.getElementById('mc-dash-fallback');
  if (!root || !live) return;
  const arts = (data.artifacts && data.artifacts.artifacts) || [];
  if (!arts.length) return;

  const pillarEl = document.getElementById('mc-dash-pillar');
  const mapEl = document.getElementById('mc-dash-map');
  const cardsEl = document.getElementById('mc-dash-cards');
  const bus = new EventTarget();
  const state = { era: null, artifactId: null };

  // —— 时代柱
  const counts = {};
  ERA_ORDER.forEach((e) => (counts[e] = 0));
  arts.forEach((a) => { if (a.era in counts) counts[a.era]++; });
  const maxCt = Math.max(1, ...Object.values(counts));
  const pillarRows = {};
  ERA_ORDER.forEach((era) => {
    const row = document.createElement('div');
    row.className = 'mc-pillar-row';
    row.tabIndex = 0; row.setAttribute('role', 'button');
    row.setAttribute('aria-label', `${era}，${counts[era]} 件，点击联动`);
    const bar = document.createElement('span');
    bar.className = 'mc-pillar-bar';
    bar.style.width = `${12 + (counts[era] / maxCt) * 88}%`;
    bar.style.background = ERA_COLOR[era];
    row.append(
      Object.assign(document.createElement('span'), { className: 'mc-pillar-era', textContent: era }),
      bar,
      Object.assign(document.createElement('span'), { className: 'mc-pillar-ct', textContent: counts[era] }),
    );
    const pick = () => bus.dispatchEvent(new CustomEvent('era', { detail: { era, source: 'pillar' } }));
    row.addEventListener('click', pick, { signal: sig });
    row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } }, { signal: sig });
    pillarRows[era] = row;
    pillarEl.appendChild(row);
  });

  // —— 迷你古国地图
  const stateColls = ['shang', 'xizhou', 'chunqiu', 'zhanguo'].map((k) => data[k]).filter(Boolean);
  const artCoords = { type: 'FeatureCollection', features: arts.filter((a) => a.coord).map((a) => ({ geometry: { type: 'Point', coordinates: a.coord } })) };
  const proj = makeProjection([...stateColls, artCoords], 300, 340, 16);
  const statePolys = [];
  Object.entries(ERA_STATE).forEach(([era, key]) => {
    const fc = data[key]; if (!fc) return;
    fc.features.forEach((ft) => {
      geomToPaths(ft.geometry, proj).forEach((d) => {
        const p = svgEl('path', { class: 'mc-mini-state', d, 'data-era': era });
        statePolys.push(p); mapEl.appendChild(p);
      });
    });
  });
  const miniDots = {};
  arts.forEach((a) => {
    if (!a.coord) return;
    const [cx, cy] = proj(a.coord);
    const dot = svgEl('circle', { class: `mc-mini-dot ${a.diaspora ? 'dia' : 'dom'}`, cx, cy, r: 4.5, tabindex: '0', role: 'button', 'aria-label': `${a.name_zh}，点击` });
    const pick = () => bus.dispatchEvent(new CustomEvent('artifact', { detail: { id: a.id, source: 'map' } }));
    dot.addEventListener('click', pick, { signal: sig });
    dot.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } }, { signal: sig });
    miniDots[a.id] = dot; mapEl.appendChild(dot);
  });

  // —— 文物卡
  const cards = {};
  arts.forEach((a) => {
    const card = document.createElement('div');
    card.className = 'mc-art'; card.tabIndex = 0; card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `${a.name_zh}，${a.dynasty}，${a.museum}`);
    let sil;
    if (a.silhouette) { sil = document.createElement('img'); sil.className = 'mc-art-sil'; sil.src = `/assets/museum/silhouettes/${a.silhouette}.svg`; sil.alt = ''; sil.loading = 'lazy'; }
    else { sil = document.createElement('span'); sil.className = 'mc-art-sil-ph'; }
    const body = document.createElement('div'); body.className = 'mc-art-b';
    body.append(Object.assign(document.createElement('div'), { className: 'mc-art-name', textContent: a.name_zh }));
    body.append(Object.assign(document.createElement('div'), { className: 'mc-art-meta', textContent: `${a.dynasty} · ${a.museum}` }));
    if (a.diaspora) body.append(Object.assign(document.createElement('span'), { className: 'mc-art-dia', textContent: `流散 · ${a.museum_country}` }));
    card.append(sil, body);
    const pick = () => bus.dispatchEvent(new CustomEvent('artifact', { detail: { id: a.id, source: 'card' } }));
    card.addEventListener('click', pick, { signal: sig });
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } }, { signal: sig });
    cards[a.id] = card; cardsEl.appendChild(card);
  });
  const artById = Object.fromEntries(arts.map((a) => [a.id, a]));

  // —— 渲染高亮（单向：事件改 state → render）
  function render() {
    const { era, artifactId } = state;
    ERA_ORDER.forEach((e) => pillarRows[e].classList.toggle('is-on', e === era));
    statePolys.forEach((p) => p.classList.toggle('is-on', era && p.dataset.era === era));
    arts.forEach((a) => {
      const dim = era && a.era !== era;
      miniDots[a.id]?.classList.toggle('dim', !!dim);
      cards[a.id].classList.toggle('dim', !!dim);
      cards[a.id].classList.toggle('is-on', a.id === artifactId);
      if (a.id === artifactId) miniDots[a.id]?.setAttribute('r', '7');
      else miniDots[a.id]?.setAttribute('r', '4.5');
    });
  }
  bus.addEventListener('era', (e) => {
    state.era = state.era === e.detail.era ? null : e.detail.era;
    if (state.artifactId && artById[state.artifactId]?.era !== state.era) state.artifactId = null;
    render();
  });
  bus.addEventListener('artifact', (e) => {
    const a = artById[e.detail.id];
    state.artifactId = state.artifactId === e.detail.id ? null : e.detail.id;
    state.era = state.artifactId ? a.era : state.era;
    render();
  });

  live.hidden = false;
  if (fallback) fallback.style.display = 'none';
  root.classList.add('is-live');
  render();
}

/* ============ ② 真实地形流散图 ============ */
function initMap(data, sig, reduced) {
  const root = document.getElementById('mc-map');
  const svg = document.getElementById('mc-map-svg');
  const panel = document.getElementById('mc-map-panel');
  const fallback = document.getElementById('mc-map-fallback');
  if (!root || !svg) return;
  const W = 760, H = 520, MAPW = 540;

  const stateColls = ['shang', 'xizhou', 'chunqiu', 'zhanguo'].map((k) => data[k]).filter(Boolean);
  const proj = makeProjection([data.terrain, data.physio, data.rivers, data.exc, ...stateColls], MAPW, H, 24);

  // defs：箭头 marker
  const defs = svgEl('defs');
  const arc = svgEl('marker', { id: 'mc-arc-head', viewBox: '0 0 10 10', refX: '8', refY: '5', markerWidth: '6', markerHeight: '6', orient: 'auto-start-reverse' });
  const ah = svgEl('path', { d: 'M0 0 L10 5 L0 10 z' }); ah.setAttribute('fill', 'var(--gold)');
  arc.appendChild(ah); defs.appendChild(arc); svg.appendChild(defs);

  // 缩放组（China map），海外标签在组外
  const zoom = svgEl('g', { class: 'mc-map-zoom' });
  svg.appendChild(zoom);
  const layer = (cls) => { const g = svgEl('g', { class: cls }); zoom.appendChild(g); return g; };
  const gTerr = layer('l-terr'), gState = layer('l-state'), gRiver = layer('l-river'), gMtn = layer('l-mtn'),
    gArc = layer('l-arc'), gExc = layer('l-exc'), gMus = layer('l-mus');
  const gOverseas = svgEl('g', { class: 'l-overseas' }); svg.appendChild(gOverseas);

  // 底图
  (data.terrain.features || []).forEach((ft) => geomToPaths(ft.geometry, proj).forEach((d) => gTerr.appendChild(svgEl('path', { class: 'mc-terr', d }))));
  stateColls.forEach((fc) => fc.features.forEach((ft) => geomToPaths(ft.geometry, proj).forEach((d) => gState.appendChild(svgEl('path', { class: 'mc-state-poly', d })))));
  (data.rivers.features || []).forEach((ft) => geomToPaths(ft.geometry, proj).forEach((d) => gRiver.appendChild(svgEl('path', { class: 'mc-river', d }))));
  (data.physio.features || []).forEach((ft) => geomToPaths(ft.geometry, proj).forEach((d) => gMtn.appendChild(svgEl('path', { class: 'mc-mtn', d }))));

  const setPanel = (title, sub, body) => {
    panel.innerHTML = `<div class="mc-panel-title">${title}</div>${sub ? `<div class="mc-panel-role">${sub}</div>` : ''}${body ? `<p class="mc-panel-body">${body}</p>` : ''}`;
  };
  const HINT = '<div class="mono mc-panel-tag">点一个点，看它是什么</div>';

  const mkPt = (g, cls, x, y, r, label, sub, body) => {
    const dot = svgEl('circle', { class: cls, cx: x, cy: y, r, tabindex: '0', role: 'button', 'aria-label': label });
    const show = () => setPanel(label, sub, body);
    dot.addEventListener('pointerenter', show, { signal: sig });
    dot.addEventListener('click', show, { signal: sig });
    dot.addEventListener('focus', show, { signal: sig });
    dot.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(); } else if (e.key === 'Escape') panel.innerHTML = HINT; }, { signal: sig });
    g.appendChild(dot); return dot;
  };

  // 出土点
  (data.exc.features || []).forEach((ft) => {
    const [x, y] = proj(ft.geometry.coordinates); const p = ft.properties;
    mkPt(gExc, 'mc-mpt exc', x, y, 4, p.name, `${p.dynasty || ''} · 出土地`, p.brief || '');
  });
  // 国内 / 海外馆分流
  let coreLon = 0, coreLat = 0, nExc = 0;
  (data.exc.features || []).forEach((ft) => { coreLon += ft.geometry.coordinates[0]; coreLat += ft.geometry.coordinates[1]; nExc++; });
  const core = proj([coreLon / nExc, coreLat / nExc]);
  const overseas = [];
  (data.museums.features || []).forEach((ft) => {
    const p = ft.properties; const isCN = (p.country || '中国') === '中国';
    if (isCN) {
      const [x, y] = proj(ft.geometry.coordinates);
      const r = 3.5 + Math.min(6, Math.sqrt((p.bronze_count_approx || 50) / 60));
      mkPt(gMus, 'mc-mpt mus-dom', x, y, r, p.name, `${p.city || ''} · 国内馆`, `青铜藏约 ${p.bronze_count_approx || '—'} 件 · tier ${p.tier || '—'}`);
    } else overseas.push(p);
  });
  // 海外馆：右侧列 + 流散弧（示意）
  overseas.sort((a, b) => (b.bronze_count_approx || 0) - (a.bronze_count_approx || 0));
  const colX = MAPW + 36, top = 40, gap = Math.min(46, (H - 80) / Math.max(1, overseas.length));
  overseas.forEach((p, i) => {
    const y = top + i * gap;
    const arcPath = svgEl('path', { class: 'mc-arc', d: `M${core[0]} ${core[1]} Q ${(core[0] + colX) / 2} ${y - 60} ${colX - 6} ${y}`, 'marker-end': 'url(#mc-arc-head)' });
    gArc.appendChild(arcPath);
    const dot = mkPt(gOverseas, 'mc-mpt mus-dia', colX, y, 5, p.name, `${p.city || ''} ${p.country} · 海外`, `青铜藏约 ${p.bronze_count_approx || '—'} 件 · tier ${p.tier || '—'}`);
    const lbl = svgEl('text', { class: 'mc-mpt-lbl', x: colX + 11, y: y + 3.5 });
    txt(lbl, `${p.name}·${p.bronze_count_approx || '—'}`);
    gOverseas.appendChild(lbl);
    p._dot = dot; p._lbl = lbl; p._arc = arcPath;
  });

  // 视图切换
  const setView = (view) => {
    root.dataset.view = view;
    root.querySelectorAll('.mc-map-tab').forEach((t) => {
      const on = t.dataset.view === view;
      t.classList.toggle('is-on', on); t.setAttribute('aria-selected', String(on));
    });
    gExc.querySelectorAll('.mc-mpt').forEach((d) => d.classList.toggle('hidden', view === 'domestic'));
    gMus.querySelectorAll('.mc-mpt').forEach((d) => d.classList.toggle('hidden', view === 'excavation'));
    const dia = view === 'diaspora';
    gArc.style.display = dia ? '' : 'none';
    gOverseas.style.display = dia ? '' : 'none';
  };
  root.querySelectorAll('.mc-map-tab').forEach((t) => t.addEventListener('click', () => setView(t.dataset.view), { signal: sig }));
  setView('excavation');
  panel.innerHTML = HINT;

  // 缩放 / 平移（仅精确指针，移动端锁定）
  const coarse = matchMedia('(pointer: coarse)').matches;
  if (!coarse) {
    let k = 1, tx = 0, ty = 0;
    const apply = () => { zoom.setAttribute('transform', `translate(${tx} ${ty}) scale(${k})`); };
    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width * W, my = (e.clientY - rect.top) / rect.height * H;
      const nk = Math.min(4, Math.max(1, k * (e.deltaY < 0 ? 1.12 : 0.89)));
      tx = mx - (mx - tx) * (nk / k); ty = my - (my - ty) * (nk / k); k = nk;
      if (k === 1) { tx = 0; ty = 0; }
      apply();
    }, { signal: sig, passive: false });
    let drag = null;
    svg.addEventListener('pointerdown', (e) => { if (k > 1) { drag = { x: e.clientX, y: e.clientY, tx, ty }; svg.setPointerCapture(e.pointerId); } }, { signal: sig });
    svg.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const rect = svg.getBoundingClientRect();
      tx = drag.tx + (e.clientX - drag.x) / rect.width * W;
      ty = drag.ty + (e.clientY - drag.y) / rect.height * H;
      apply();
    }, { signal: sig });
    svg.addEventListener('pointerup', () => { drag = null; }, { signal: sig });
    svg.addEventListener('pointercancel', () => { drag = null; }, { signal: sig });
  }

  root.classList.add('is-live');
  if (fallback) fallback.style.display = 'none';
}

/* ============ ③ 多 Agent 拓扑 ============ */
const TOPO = {
  standing: {
    nodes: [
      { id: 'orc', label: 'Orchestrator', kind: 'orchestrator', x: 280, y: 200, role: '总调度 + 架构师', bullets: ['把任务拆给有边界的角色', '可自主跑零成本只读测试', '严重审计问题能推翻整轮'] },
      { id: 'crit', label: 'PM-Critic', kind: 'audit', x: 120, y: 100, role: '首席批评者 · 有 block 权', bullets: ['不是我本人，是我聘的外部评审', '双镜头：招聘经理 + 投资人', '只出 APPROVE / BLOCK / REDIRECT，不和稀泥'] },
      { id: 'cur', label: 'Strategy-Curator', kind: 'audit', x: 440, y: 100, role: '策略策展人 · 一票否决', bullets: ['反复问：这件事推进什么？多强？', '每个任务要签：推进哪个 KPI / 强度 / ≤30 字理由', '否决模糊，不否决方向'] },
      { id: 'bld', label: 'Builder', kind: 'exec', x: 120, y: 300, role: '执行者', bullets: ['只从已签的清单取活', '不评自己产出、不顺手扩 scope', '双签前不合主分支'] },
      { id: 'uv', label: 'User-Voice', kind: 'heavy', x: 440, y: 300, role: '多实例用户代言', bullets: ['不是单一 persona，对冲过拟合', '每次评审用 ≥2 个不同实例', '只递红旗，不直接否决'] },
      { id: 'res', label: 'Researcher', kind: 'heavy', x: 280, y: 350, role: '只供信息', bullets: ['每条断言带来源', '可免费搜 / 读公开文献', '付费 / 联系馆方 = T3，先升级'] },
    ],
    edges: [['orc', 'crit'], ['orc', 'cur'], ['orc', 'uv'], ['orc', 'res'], ['bld', 'crit', 'sign'], ['bld', 'cur', 'sign']],
  },
  night: {
    nodes: [
      { id: 'orc', label: 'Orchestrator', kind: 'orchestrator', x: 280, y: 205, role: '总调度 (Opus) 兼架构师', bullets: ['成本感知路由：Opus 判断重、Sonnet 执行', '授权零成本只读测试自跑'] },
      { id: 'po', label: 'Product Owner', kind: 'heavy', x: 280, y: 70, role: 'Opus · 产品判断', bullets: ['守住 PRD 与北极星', '把模糊需求拍成可执行规格'] },
      { id: 'dr', label: 'Domain Researcher ★', kind: 'heavy', x: 110, y: 120, role: 'Opus · 产品创新内核', bullets: ['维度—形态映射在这里诞生', '每条断言带来源'] },
      { id: 'vd', label: 'Visualization Designer ★', kind: 'heavy', x: 450, y: 120, role: 'Opus · 产品创新内核', bullets: ['7+1 维度的产品形态', '游戏化是一等公民'] },
      { id: 'ai', label: 'AI Engineer', kind: 'exec', x: 95, y: 250, role: 'CLIP / pHash / stub', bullets: ['沙箱挡 HF，pivot 到 pHash 基线', '拒绝假数字，发布生产形态 stub'] },
      { id: 'de', label: 'Data Engineer ×5', kind: 'exec', x: 180, y: 355, role: 'Sonnet · 并行', bullets: ['277 件 ×11 字段，5 段朝代分片', '撞 token 上限少了 23 件，如实记'] },
      { id: 'bld', label: 'Builder ×3 → Converger', kind: 'exec', x: 390, y: 355, role: 'Sonnet · worktree 并行', bullets: ['3 个人格分化 Builder 坍缩成 1 个 Converger', '融合考据排版 + 情感 + 工程'] },
      { id: 'aud', label: '审计编队 ×7', kind: 'audit', x: 470, y: 250, role: '6 人格 + Runtime + Comparative', bullets: ['写完 report 同时产出 next-iteration-brief', 'Runtime Auditor 真点击 / 查 network，对其他审计 binding', '审计小队审计了审计小队'] },
    ],
    edges: [['orc', 'po'], ['po', 'dr'], ['po', 'vd'], ['orc', 'ai'], ['orc', 'de'], ['orc', 'bld'], ['bld', 'aud', 'esc'], ['vd', 'aud', 'esc']],
  },
};
function initTopology(sig) {
  const root = document.getElementById('mc-topo');
  const svg = document.getElementById('mc-topo-svg');
  const panel = document.getElementById('mc-topo-panel');
  if (!root || !svg) return;
  const HINT = '<div class="mono mc-panel-tag">点一个 agent，看它的边界与职责</div>';

  function render(key) {
    const t = TOPO[key];
    svg.innerHTML = '';
    const pos = Object.fromEntries(t.nodes.map((n) => [n.id, n]));
    const gE = svgEl('g'); svg.appendChild(gE);
    t.edges.forEach(([a, b, type]) => {
      const A = pos[a], B = pos[b];
      gE.appendChild(svgEl('line', { class: `mc-edge ${type || ''}`, x1: A.x, y1: A.y, x2: B.x, y2: B.y }));
    });
    const gN = svgEl('g'); svg.appendChild(gN);
    t.nodes.forEach((n) => {
      const g = svgEl('g', { class: `mc-node kind-${n.kind}`, tabindex: '0', role: 'button', 'aria-label': `${n.label}，${n.role}` });
      g.appendChild(svgEl('circle', { class: 'mc-node-dot', cx: n.x, cy: n.y, r: 10 }));
      const lbl = svgEl('text', { class: 'mc-node-lbl', x: n.x, y: n.y + (n.y > 200 ? 26 : -16), 'text-anchor': 'middle' });
      txt(lbl, n.label); g.appendChild(lbl);
      const show = () => {
        gN.querySelectorAll('.mc-node').forEach((o) => o.classList.toggle('is-active', o === g));
        root.classList.add('has-active');
        panel.innerHTML = `<div class="mc-panel-title">${n.label}</div><div class="mc-panel-role">${n.role}</div><ul class="mc-panel-body">${n.bullets.map((x) => `<li>${x}</li>`).join('')}</ul>`;
      };
      g.addEventListener('click', show, { signal: sig });
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(); }
        else if (e.key === 'Escape') { gN.querySelectorAll('.mc-node').forEach((o) => o.classList.remove('is-active')); root.classList.remove('has-active'); panel.innerHTML = HINT; }
      }, { signal: sig });
      gN.appendChild(g);
    });
  }
  root.querySelectorAll('.mc-topo-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      root.querySelectorAll('.mc-topo-tab').forEach((t) => { const on = t === tab; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', String(on)); });
      root.classList.remove('has-active'); panel.innerHTML = HINT;
      render(tab.dataset.topo);
    }, { signal: sig });
  });
  panel.innerHTML = HINT;
  render('standing');
}

/* ============ ④ 反幻觉状态机 ============ */
const FSM_GATES = ['url', '时间戳', '指纹', 'license', '置信档'];
const FSM_CHUNKS = [
  { pass: [1, 1, 1, 1, 1], verdict: '<b>通过</b>：五字段齐全，CC0 可放心引用、可向量化。例：Met 42704（accession 57.176，culture「Southern Xiangtangshan」）。', cls: 'pass' },
  { pass: [1, 1, 1, 0, -1], verdict: '<b>封顶 low</b>：license=unknown，按硬门只摘录馆方原始字段、不二次演绎、不向量化。例：V&A O129249（佛头，著录写「probably Xiangtangshan」）。', cls: 'fail' },
  { pass: [1, 1, 0, -1, -1], verdict: '<b>记 failed</b>：抓回的是 Akamai 边缘墙的 challenge 页、0 字正文——如实写「该 CC-BY 全文未到手，原因 Akamai 拦截」，不拿报错页凑达标，不旁证补足。', cls: 'fail' },
];
function initFsm(sig, reduced) {
  const root = document.getElementById('mc-fsm');
  const svg = document.getElementById('mc-fsm-svg');
  const verdict = document.getElementById('mc-fsm-verdict');
  if (!root || !svg) return;

  const defs = svgEl('defs');
  const m = svgEl('marker', { id: 'mc-fsm-arrow', viewBox: '0 0 10 10', refX: '8', refY: '5', markerWidth: '6', markerHeight: '6', orient: 'auto' });
  const mp = svgEl('path', { d: 'M0 0 L10 5 L0 10 z' }); mp.setAttribute('fill', 'rgba(190,210,255,0.4)');
  m.appendChild(mp); defs.appendChild(m); svg.appendChild(defs);

  const BW = 118, BH = 56, GAP = 32, Y = 44;
  const boxes = [];
  FSM_GATES.forEach((g, i) => {
    const x = 8 + i * (BW + GAP);
    if (i) svg.appendChild(svgEl('line', { class: 'mc-gate-arr', x1: x - GAP + 2, y1: Y + BH / 2, x2: x - 2, y2: Y + BH / 2 }));
    const rect = svgEl('rect', { class: 'mc-gate-box', x, y: Y, width: BW, height: BH, rx: 10 });
    const lbl = svgEl('text', { class: 'mc-gate-lbl', x: x + BW / 2, y: Y + BH / 2 - 2 }); txt(lbl, g);
    const mark = svgEl('text', { class: 'mc-gate-mark', x: x + BW / 2, y: Y + BH / 2 + 16 });
    mark.style.opacity = '0';
    svg.append(rect, lbl, mark);
    boxes.push({ rect, mark });
  });

  function run(idx) {
    const chunk = FSM_CHUNKS[idx];
    boxes.forEach((b) => { b.rect.classList.remove('pass', 'fail'); b.mark.style.opacity = '0'; b.mark.textContent = ''; });
    verdict.className = 'mc-fsm-verdict';
    const step = (i) => {
      if (i >= boxes.length) { verdict.classList.add(chunk.cls); verdict.innerHTML = chunk.verdict; return; }
      const v = chunk.pass[i], b = boxes[i];
      if (v === 1) { b.rect.classList.add('pass'); b.mark.textContent = '✓'; b.mark.setAttribute('fill', 'var(--mc-jade-ink)'); b.mark.style.opacity = '1'; }
      else if (v === 0) { b.rect.classList.add('fail'); b.mark.textContent = '✗'; b.mark.setAttribute('fill', 'var(--mc-coral-ink)'); b.mark.style.opacity = '1'; }
      else { b.mark.textContent = '—'; b.mark.setAttribute('fill', 'rgba(190,210,255,0.4)'); b.mark.style.opacity = '1'; }
      if (reduced) step(i + 1); else setTimeout(() => step(i + 1), 240);
    };
    step(0);
  }
  root.querySelectorAll('.mc-chunk').forEach((c) => c.addEventListener('click', () => {
    root.querySelectorAll('.mc-chunk').forEach((o) => { const on = o === c; o.classList.toggle('is-on', on); o.setAttribute('aria-selected', String(on)); });
    run(parseInt(c.dataset.chunk, 10));
  }, { signal: sig }));
  run(0);
}

/* ============ ④b 叙事打架翻转 ============ */
function initNarrative(sig) {
  document.querySelectorAll('.mc-nc-case').forEach((c) => {
    const btn = c.querySelector('.mc-nc-btn');
    const v = c.querySelector('.mc-nc-verdict');
    if (!btn || !v) return;
    btn.addEventListener('click', () => {
      v.hidden = false;
      btn.classList.add('is-done');
      btn.textContent = 'AI 拒绝编造 → 它把张力摊给你看 ✓';
      btn.disabled = true;
    }, { signal: sig });
  });
}

/* ============ 启动 ============ */
async function initPage(sig) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  initCommon(sig, reduced);
  initFlips(sig);
  initTopology(sig);
  initFsm(sig, reduced);
  initNarrative(sig);
  // 数据驱动的两个交互：fetch 失败则保留静态截图
  try {
    const data = await loadData();
    if (sig.aborted) return;
    initDashboard(data, sig, reduced);
    initMap(data, sig, reduced);
  } catch (err) {
    console.warn('[museum-collect] 数据加载失败，保留静态截图降级：', err);
  }
}

document.addEventListener('astro:page-load', () => {
  abort?.abort();
  abort = new AbortController();
  initPage(abort.signal);
});

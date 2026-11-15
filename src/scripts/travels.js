// /travels 全屏装置编排器：章节切换、全航程放映、游记巡映、漂浮卡（地理锚定拍立得）、航段日志
// 默认 3D；2D 画布引擎仅在无 WebGL / 减弱动效时静默回退（无手动切换）。
import { loadRelief, loadNormal, loadRivers, loadCoast, loadBorders, loadLakes, chapterLegs, fmtKm } from './travel-data.js';
import { webglOK } from './graph-mode.js';
import { createFloatCard } from './travel-float-card.js';

/* 模块级清理句柄：View Transitions 下模块只执行一次，跨导航复访时先销毁旧引擎（防 WebGL 泄漏） */
let activeCleanup = null;
document.addEventListener('astro:before-swap', () => {
  activeCleanup?.();
  activeCleanup = null;
});

function resolveMode() {
  if (!webglOK()) return '2d';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return '2d';
  return '3d';
}

document.addEventListener('astro:page-load', () => {
  activeCleanup?.();
  activeCleanup = null;
  const dataEl = document.getElementById('tv-data');
  const stage = document.getElementById('tv-stage');
  if (!dataEl || !stage) return;
  const { travels: data, stories = [], storyPosts = {}, countries = [] } = JSON.parse(dataEl.textContent);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const loading = document.getElementById('tv-loading');
  const tourBtn = document.getElementById('tv-tour');
  const playBtn = document.getElementById('tv-play');
  const stopBtn = document.getElementById('tv-stop');
  const chips = [...document.querySelectorAll('.tv-chip')];
  const hudLine = document.getElementById('tv-hud-line');
  const odo = document.getElementById('tv-odo');
  const odoBox = document.getElementById('tv-odo-box');
  const logBox = document.getElementById('tv-log');
  const toast = document.getElementById('tv-toast');
  const segs = [...document.querySelectorAll('.tv-prog-seg')];
  const card = document.getElementById('tv-card');

  let engine = null;
  let mode = null;
  let chapter = null; // null = 全部
  let replayCancel = null;
  let replaying = false;
  let token = 0;
  /* 漂浮卡与锚定状态 */
  let fc = null; // createFloatCard 实例（首启引擎后惰性创建，防 boot 清 stage 误删 tether）
  let anchorLaLn = null; // 当前锚点经纬（引擎重启后重挂用）
  let pendingFly = false; // 引擎就绪前的飞行意图（默认随机开卡常先于引擎）
  let openStoryIdx = null; // 打开中的故事序号（键盘 ←/→ 导航用）
  let openPoiIdx = null;

  /* ---------- 引擎装配 ---------- */
  async function boot(wantMode) {
    const my = ++token;
    engine?.destroy?.();
    engine = null;
    stage.innerHTML = '';
    loading.hidden = false;
    const [relief, normal, rivers, coast, borders, lakes] = await Promise.all([
      loadRelief('4k'),
      loadNormal(stage.clientWidth >= 1000 ? '4k' : '2k'),
      loadRivers(),
      loadCoast(),
      loadBorders(),
      loadLakes(),
    ]);
    let ctl;
    if (wantMode === '3d') {
      const { createGlobe3D } = await import('./travel-globe3d.js');
      if (my !== token) return;
      ctl = createGlobe3D(stage, { relief, normal, rivers, coast, borders, lakes, data, stories, countries, reducedMotion, onSelectPoi: openCard, onSelectStory: openStory });
    } else {
      const canvas = document.createElement('canvas');
      canvas.className = 'tv-canvas2d';
      stage.appendChild(canvas);
      const { createGlobe2D } = await import('./travel-globe2d.js');
      if (my !== token) return;
      ctl = createGlobe2D(canvas, { relief, rivers, coast, borders, lakes, data, stories, mini: false, reducedMotion, onSelectPoi: openCard, onSelectStory: openStory });
    }
    engine = ctl;
    mode = wantMode;
    loading.hidden = true;
    window.__tv = { engine: ctl }; // QA/调试句柄（只读探针用）
    if (!fc) fc = createFloatCard(stage, card);
    if (chapter != null) ctl.setChapter(chapter);
    /* 引擎就绪后补挂：深链/随机开卡先于引擎时，重挂锚点、补开漂浮卡、补飞行 */
    if (anchorLaLn) {
      if (engine.setAnchor) engine.setAnchor(anchorLaLn, (pr) => fc.setAnchor(pr));
      if (!fc.isOpen()) {
        const pr = engine.projectPoint?.(anchorLaLn[0], anchorLaLn[1]) ?? { x: stage.clientWidth * 0.4, y: stage.clientHeight * 0.55, facing: 1, inFrame: true };
        fc.openAt(pr);
        if (openStoryIdx != null) judgeBodyMore(); // 深链首开时 has-more 误判（卡片 hidden），补开后再判
      }
      if (pendingFly) { engine.flyToPresent?.(anchorLaLn[0], anchorLaLn[1]); pendingFly = false; }
    }
  }

  /* ---------- 章节切换 ---------- */
  function hudText(i) {
    const s = data.stats;
    return i == null
      ? `${s.poiCount} 足迹点 · ${s.cityCount} 城市 · ${s.countryCount} 国 · 推测航迹 ${fmtKm(s.kmTotal)} km`
      : `${data.chapters[i].zh} · ${data.chapters[i].count} 足迹 · ${fmtKm(data.chapters[i].km)} km · ${data.chapters[i].sub}`;
  }
  function setChapter(i) {
    chapter = i;
    chips.forEach((c) => c.classList.toggle('active', (c.dataset.ch === '' ? null : +c.dataset.ch) === i));
    hudLine.textContent = hudText(i);
    engine?.setChapter(i);
    segs.forEach((sg, k) => {
      sg.firstElementChild.style.width = i == null || k === i ? sg.firstElementChild.style.width : '0%';
      sg.classList.toggle('dim', i != null && k !== i);
    });
  }

  /* ---------- 放映（全航程：四章联播） ---------- */
  function chapterToast(i) {
    const ch = data.chapters[i];
    toast.innerHTML = `<span class="mono tv-toast-no">0${i + 1}</span><span class="tv-toast-zh">${ch.zh}</span><span class="mono tv-toast-en">${ch.en} · ${ch.count} 足迹 · ${fmtKm(ch.km)} km</span>`;
    toast.classList.add('show');
    return new Promise((r) => setTimeout(() => { toast.classList.remove('show'); r(); }, 1500));
  }
  function logLeg(text) {
    const el = document.createElement('div');
    el.className = 'tv-log-item mono';
    el.textContent = text;
    logBox.prepend(el);
    while (logBox.children.length > 5) logBox.lastElementChild.remove();
  }
  async function playAll() {
    if (replaying || !engine) return;
    if (touring) stopTour();
    replaying = true;
    playBtn.hidden = true;
    stopBtn.hidden = false;
    odoBox.classList.add('live');
    odo.textContent = '0';
    logBox.innerHTML = '';
    let base = 0;
    for (let ci = 0; ci < data.chapters.length; ci++) {
      if (!replaying) break;
      setChapter(ci);
      await chapterToast(ci);
      if (!replaying) break;
      const legs = chapterLegs(data, ci);
      const total = data.chapters[ci].km || 1;
      await new Promise((resolve) => {
        replayCancel = engine.replay(ci, {
          onTick: (km) => {
            odo.textContent = fmtKm(base + km);
            segs[ci].firstElementChild.style.width = `${Math.min(100, (km / total) * 100)}%`;
          },
          onLeg: (li) => {
            const leg = legs[li];
            if (leg) logLeg(`${String(li + 1).padStart(2, '0')} · ${leg.aName} → ${leg.bName} · ${fmtKm(leg.km)} km`);
            if (leg?.bStop?.t === 'c') engine.highlightCity?.(leg.bStop.i);
          },
          onDone: resolve,
        });
        if (!replaying) { replayCancel?.(); resolve(); }
      });
      base += data.chapters[ci].km;
      if (!replaying) break;
    }
    stopReplay(false);
  }
  function stopReplay(backToOverview = true) {
    replaying = false;
    replayCancel?.();
    replayCancel = null;
    engine?.stopReplay?.();
    playBtn.hidden = false;
    stopBtn.hidden = true;
    odoBox.classList.remove('live');
    odo.textContent = fmtKm(data.stats.kmTotal);
    if (backToOverview) setChapter(null);
  }

  /* ---------- POI 卡片 / 游记故事卡片（漂浮卡：地理锚定拍立得） ---------- */
  /* 有下文渐隐判定：须在卡片可见布局后量（hidden 时 clientHeight=0 会误判） */
  function judgeBodyMore() {
    requestAnimationFrame(() => {
      const b = document.getElementById('tv-card-body');
      b.classList.toggle('has-more', !card.hidden && b.scrollHeight > b.clientHeight + 8);
    });
  }
  function anchorOpen(la, ln, { fly = false } = {}) {
    anchorLaLn = [la, ln];
    if (fly) { if (engine?.flyToPresent) engine.flyToPresent(la, ln); else pendingFly = true; }
    if (engine?.setAnchor) engine.setAnchor(anchorLaLn, (pr) => fc.setAnchor(pr));
    if (!fc?.isOpen()) {
      const pr = engine?.projectPoint?.(la, ln) ?? { x: stage.clientWidth * 0.4, y: stage.clientHeight * 0.55, facing: 1, inFrame: true };
      fc?.openAt(pr);
    }
  }
  function openCard(i) {
    const p = data.pois[i];
    if (!p) return;
    openPoiIdx = i; openStoryIdx = null;
    card.classList.remove('is-story');
    const city = p.ci >= 0 ? data.cities[p.ci] : null;
    document.getElementById('tv-card-kicker').textContent = city ? `${city.co} · ${city.n}` : '途中 · 未归并停留点';
    document.getElementById('tv-card-title').textContent = p.n;
    const meta = [];
    if (p.c) meta.push(`<span class="tag mono">${p.c}</span>`);
    if (p.r) meta.push(`<span class="mono tv-card-r">★ ${p.r.toFixed(1)}</span>`);
    document.getElementById('tv-card-meta').innerHTML = meta.join('');
    document.getElementById('tv-card-chs').innerHTML = p.ch.map((c) => `<span class="mono tv-card-ch">${data.chapters[c].en}</span>`).join('');
    document.getElementById('tv-card-map').href = `https://www.google.com/maps/search/?api=1&query=${p.la},${p.ln}`;
    anchorOpen(p.la, p.ln);
    syncUrl({ k: 'p', i });
  }
  function openStory(i, { fly = false } = {}) {
    const st = stories[i];
    if (!st) return;
    openStoryIdx = i; openPoiIdx = null;
    card.classList.add('is-story');
    const img = document.getElementById('tv-card-photo');
    img.src = st.img;
    img.alt = st.alt;
    img.width = st.w;
    img.height = st.h;
    const post = storyPosts[st.post];
    document.getElementById('tv-card-kicker').textContent = `${st.co}${post ? ` · ${post.s ?? post.t}` : ''}`;
    document.getElementById('tv-card-title').textContent = st.n;
    document.getElementById('tv-card-excerpt').textContent = `「${st.x}」`;
    /* 片段全文：卡内滚动读完当前片段（滚动复位；有下文则底部渐隐提示——开卡布局后再判定；
       深链首开先于引擎时卡片仍 hidden（clientHeight=0），由 boot 补挂路径补判） */
    const body = document.getElementById('tv-card-body');
    body.innerHTML = (st.b ?? []).map((p) => `<p>${p}</p>`).join('');
    body.scrollTop = 0;
    judgeBodyMore();
    /* 导航行：本篇内 k/n + 下一篇目标篇名 */
    const frags = fragsOf(st.post);
    document.getElementById('tv-frag-pos').textContent = `${frags.indexOf(i) + 1} / ${frags.length}`;
    document.getElementById('tv-post-next-name').textContent = storyPosts[postAfter(st.post)]?.s ?? '';
    document.getElementById('tv-card-post').href = `/blog/${st.post}/`;
    anchorOpen(st.la, st.ln, { fly });
    syncUrl({ k: 's', i });
  }
  /* 篇序（时间序，与巡映同口径）；本篇内片段下标序列 */
  const postOrder = Object.keys(storyPosts).sort((a, b) => ((storyPosts[a].d ?? '') < (storyPosts[b].d ?? '') ? -1 : 1));
  const fragsOf = (slug) => stories.map((s, i) => (s.post === slug ? i : -1)).filter((i) => i >= 0);
  const postAfter = (slug, dir = 1) => postOrder[(postOrder.indexOf(slug) + dir + postOrder.length) % postOrder.length];
  /* 本篇内上/下一段（循环）——按钮与 ←/→ 同走这一条管线 */
  function stepStory(dir) {
    if (openStoryIdx == null) return;
    const frags = fragsOf(stories[openStoryIdx].post);
    openStory(frags[(frags.indexOf(openStoryIdx) + dir + frags.length) % frags.length], { fly: true });
  }
  /* 跨篇「下一篇」：跳到相邻篇的第一个片段（循环）——按钮与 PgUp/PgDn 同走这一条管线 */
  function stepPost(dir) {
    if (openStoryIdx == null) return;
    const first = stories.findIndex((s) => s.post === postAfter(stories[openStoryIdx].post, dir));
    if (first >= 0) openStory(first, { fly: true });
  }
  function closeCard() {
    openStoryIdx = null; openPoiIdx = null; anchorLaLn = null;
    engine?.setAnchor?.(null);
    fc?.close();
    syncUrl(null);
  }

  /* ---------- 游记巡映：按文章时间序逐站飞行，漂浮卡联播（停止/ESC 中断） ---------- */
  const tourOrder = stories.map((_, i) => i).sort((a, b) => {
    const da = storyPosts[stories[a].post]?.d ?? '';
    const db = storyPosts[stories[b].post]?.d ?? '';
    return da === db ? a - b : da < db ? -1 : 1;
  });
  let touring = false, tourK = 0, tourTimer = 0;
  function startTour() {
    if (touring || replaying || !tourOrder.length) return;
    touring = true; tourK = 0;
    playBtn.hidden = true; tourBtn.hidden = true; stopBtn.hidden = false;
    document.getElementById('tv-card-nav').hidden = true; // 巡映中隐藏手动导航，避免双控制器
    const step = () => {
      if (!touring) return;
      const k = tourK % tourOrder.length;
      const idx = tourOrder[k];
      hudLine.textContent = `巡映游记 ${k + 1}/${tourOrder.length} · ${stories[idx].n}`;
      openStory(idx, { fly: true });
      tourK++;
      tourTimer = setTimeout(step, 6800);
    };
    step();
  }
  function stopTour() {
    if (!touring) return;
    touring = false;
    clearTimeout(tourTimer);
    playBtn.hidden = false; tourBtn.hidden = false; stopBtn.hidden = true;
    document.getElementById('tv-card-nav').hidden = false;
    hudLine.textContent = hudText(chapter);
  }

  /* ---------- 深链（?ch=1..4 / ?poi=i / ?story=i；replaceState 不刷历史） ---------- */
  function syncUrl(openRef) {
    const q = new URLSearchParams();
    if (chapter != null) q.set('ch', String(chapter + 1));
    if (openRef?.k === 'p') q.set('poi', String(openRef.i));
    if (openRef?.k === 's') q.set('story', String(openRef.i));
    const qs = q.toString();
    history.replaceState(null, '', `${location.pathname}${qs ? '?' + qs : ''}`);
  }

  /* ---------- 事件 ---------- */
  const removers = [];
  const on = (el, ev, fn, opts) => {
    el.addEventListener(ev, fn, opts);
    removers.push(() => el.removeEventListener(ev, fn, opts));
  };
  chips.forEach((c) =>
    on(c, 'click', () => {
      if (replaying) stopReplay();
      if (touring) stopTour();
      setChapter(c.dataset.ch === '' ? null : +c.dataset.ch);
      syncUrl(null);
    })
  );
  on(playBtn, 'click', playAll);
  on(tourBtn, 'click', startTour);
  on(stopBtn, 'click', () => { if (touring) stopTour(); if (replaying) stopReplay(); });
  on(document.getElementById('tv-card-close'), 'click', closeCard);
  on(document.getElementById('tv-frag-prev'), 'click', () => stepStory(-1));
  /* 正文滚到底部时摘掉渐隐 mask（有下文的提示只对未读完状态成立） */
  document.getElementById('tv-card-body').addEventListener('scroll', (e) => {
    const b = e.currentTarget;
    b.classList.toggle('has-more', b.scrollTop + b.clientHeight < b.scrollHeight - 8);
  });
  on(document.getElementById('tv-frag-next'), 'click', () => stepStory(1));
  on(document.getElementById('tv-post-next'), 'click', () => stepPost(1));
  on(document, 'keydown', (e) => {
    if (e.key === 'Escape') {
      if (touring) { stopTour(); closeCard(); }
      else if (!card.hidden) closeCard();
      else if (replaying) stopReplay();
    } else if (openStoryIdx != null && !card.hidden) {
      /* 故事卡打开时：←/→ 本篇内翻段（与导航按钮同管线）、PgUp/PgDn 跨篇、↑/↓ 滚动正文 */
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') stepStory(e.key === 'ArrowRight' ? 1 : -1);
      else if (e.key === 'PageDown' || e.key === 'PageUp') { e.preventDefault(); stepPost(e.key === 'PageDown' ? 1 : -1); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const body = document.getElementById('tv-card-body');
        if (body.scrollHeight > body.clientHeight) { e.preventDefault(); body.scrollTop += e.key === 'ArrowDown' ? 96 : -96; }
      }
    }
  });

  /* ---------- 初始状态：深链优先；否则默认展开一张随机游记照片（避开上次那张） ---------- */
  const q = new URLSearchParams(location.search);
  const chP = parseInt(q.get('ch') ?? '', 10);
  if (Number.isFinite(chP) && chP >= 1 && chP <= data.chapters.length) setChapter(chP - 1);
  else setChapter(null);
  const storyP = parseInt(q.get('story') ?? '', 10);
  const poiP = parseInt(q.get('poi') ?? '', 10);
  if (Number.isFinite(storyP) && stories[storyP]) openStory(storyP);
  else if (Number.isFinite(poiP) && data.pois[poiP]) openCard(poiP);
  else if (stories.length) {
    let idx;
    try {
      const last = +(localStorage.getItem('tv-last-story') ?? -1);
      do { idx = Math.floor(Math.random() * stories.length); } while (stories.length > 1 && idx === last);
      localStorage.setItem('tv-last-story', String(idx));
    } catch { idx = Math.floor(Math.random() * stories.length); }
    setTimeout(() => openStory(idx, { fly: true }), 450);
  }

  odo.textContent = fmtKm(data.stats.kmTotal);
  boot(resolveMode());

  activeCleanup = () => {
    replayCancel?.();
    clearTimeout(tourTimer);
    fc?.destroy?.();
    fc = null;
    engine?.destroy?.();
    engine = null;
    removers.forEach((r) => r());
  };
});

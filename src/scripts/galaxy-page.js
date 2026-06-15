// Galaxy View 落地页交互 v2：
//   背景 = 程序化星云（galaxy-hero.js，整页固定 + 滚出首屏冻结）
//   主 CTA = 全屏浮层跑真实知识库 3D（graph-view-galaxy.js renderGraph3D + 真实 graph.json）
// three 只在这两个异步 chunk 里，不进首发。
import { webglOK } from './graph-mode.js';

let abort = null;
let bgCtl = null;     // 背景星云控制器
let modalCtl = null;  // 浮层真渲染器控制器

function initGalaxyPage(sig) {
  const bg = document.getElementById('gv-bg');
  if (!bg) return; // 仅落地页

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasWebgl = webglOK();

  /* ---------- 滚动揭示 ---------- */
  const reveals = document.querySelectorAll('.gv-reveal');
  if (reveals.length) {
    const show = (el) => el.classList.add('gv-in');
    if (reduced) {
      reveals.forEach(show);
    } else {
      try {
        const io = new IntersectionObserver((es) => {
          es.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
        }, { threshold: 0.12 });
        reveals.forEach((el) => io.observe(el));
        sig.addEventListener('abort', () => io.disconnect());
      } catch { reveals.forEach(show); }
      setTimeout(() => reveals.forEach(show), 1400);
    }
  }

  /* ---------- 数字 count-up ---------- */
  const nums = document.querySelectorAll('.gv-num[data-count]');
  const fmt = (v, dec, sep) => {
    if (sep) return Number(v.toFixed(dec)).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    return dec ? v.toFixed(dec) : String(Math.round(v));
  };
  function runCount(el) {
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    const sep = el.dataset.sep === '1';
    if (reduced) { el.textContent = fmt(target, dec, sep); return; }
    const dur = 1100, t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = fmt(target * (1 - Math.pow(1 - p, 3)), dec, sep);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  if (nums.length) {
    try {
      const io = new IntersectionObserver((es) => {
        es.forEach((e) => { if (e.isIntersecting) { runCount(e.target); io.unobserve(e.target); } });
      }, { threshold: 0.6 });
      nums.forEach((el) => io.observe(el));
      sig.addEventListener('abort', () => io.disconnect());
    } catch { nums.forEach(runCount); }
  }

  /* ---------- 背景星云（整页固定）：懒挂 + 控制按钮 ---------- */
  if (hasWebgl) {
    (async () => {
      try {
        const { initGalaxyHero } = await import('./galaxy-hero.js');
        if (sig.aborted) return;
        bgCtl = initGalaxyHero(bg, {});
        wireBgControls();
      } catch (e) {
        console.error('[galaxy] 背景星云加载失败（保留深空底）：', e);
      }
    })();
  }
  function wireBgControls() {
    const bloomBtn = document.getElementById('gv-bloom');
    const themeBtn = document.getElementById('gv-theme');
    if (bloomBtn && bgCtl) {
      const sync = () => { bloomBtn.querySelector('.gv-ctl-v').textContent = bgCtl.getBloom() ? '开' : '关'; bloomBtn.setAttribute('aria-pressed', String(bgCtl.getBloom())); };
      sync();
      bloomBtn.addEventListener('click', () => { bgCtl.setBloom(!bgCtl.getBloom()); sync(); }, { signal: sig });
    }
    if (themeBtn && bgCtl) {
      const label = () => { themeBtn.querySelector('.gv-ctl-v').textContent = bgCtl.getTheme().name; };
      label();
      themeBtn.addEventListener('click', () => { bgCtl.cycleTheme(); label(); }, { signal: sig });
    }
  }

  /* ---------- 全屏 3D 浮层：真实知识库 ---------- */
  const modal = document.getElementById('gv-modal');
  const stage = document.getElementById('gv-modal-stage');
  const loading = document.getElementById('gv-modal-loading');
  const closeBtn = document.getElementById('gv-modal-close');
  const storyBtn = document.getElementById('gv-modal-story');
  const searchInput = document.getElementById('gv-modal-search');
  const openBtns = document.querySelectorAll('.gv-open');
  const bgEls = ['gv-bg', 'site-head', 'contact'].map((id) => document.getElementById(id))
    .concat([document.querySelector('.gv-main')]).filter(Boolean);

  let graph = null;
  try {
    const el = document.getElementById('gv-graph');
    graph = el ? JSON.parse(el.textContent).graph : null;
  } catch { graph = null; }

  let modalOpen = false;
  let closeTimer = null;
  let lastFocus = null;

  async function openModal() {
    // 无 WebGL / 无图数据 → 回退到站内全图页（自带 2D 兜底）
    if (!hasWebgl || !graph) { window.location.href = '/graph'; return; }
    if (modalOpen) return;
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    modalOpen = true;
    lastFocus = document.activeElement;
    modal.hidden = false;
    if (loading) { loading.hidden = false; loading.textContent = '点亮知识星系…'; }
    document.documentElement.classList.add('gv-modal-open'); // 滚动锁
    bgEls.forEach((el) => el.setAttribute('inert', ''));
    bgCtl?.pause?.();                                        // 停背景，错峰双 bloom
    if (reduced) modal.classList.add('open');
    else setTimeout(() => modal.classList.add('open'), 20); // setTimeout 而非 rAF：headless/后台不被节流
    closeBtn?.focus({ preventScroll: true });
    try {
      const { renderGraph3D } = await import('./graph-view-galaxy.js');
      if (!modalOpen || sig.aborted) return;
      modalCtl = renderGraph3D(stage, graph, { onSelect: () => {} });
      modalCtl.ready?.then(() => { if (modalOpen && loading) loading.hidden = true; });
      setTimeout(() => { if (loading) loading.hidden = true; }, 4000); // 兜底
    } catch (e) {
      console.error('[galaxy] 浮层 3D 加载失败：', e);
      if (loading) loading.textContent = '加载失败';
    }
  }

  function closeModal() {
    if (!modalOpen) return;
    modalOpen = false;
    modal.classList.remove('open');
    bgEls.forEach((el) => el.removeAttribute('inert'));
    document.documentElement.classList.remove('gv-modal-open');
    const finish = () => {
      modal.hidden = true;
      modalCtl?.destroy?.(); modalCtl = null;
      bgCtl?.resume?.();
    };
    if (reduced) finish();
    else closeTimer = setTimeout(finish, 420);
    lastFocus?.focus?.({ preventScroll: true });
  }

  openBtns.forEach((b) => b.addEventListener('click', openModal, { signal: sig }));
  closeBtn?.addEventListener('click', closeModal, { signal: sig });
  storyBtn?.addEventListener('click', () => {
    closeModal();
    const story = document.getElementById('story');
    requestAnimationFrame(() => story?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }));
  }, { signal: sig });
  searchInput?.addEventListener('input', () => { modalCtl?.search?.(searchInput.value); }, { signal: sig });

  // ESC 关 + 焦点圈闭
  document.addEventListener('keydown', (e) => {
    if (!modalOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
    if (e.key !== 'Tab') return;
    const els = [...modal.querySelectorAll('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])')]
      .filter((el) => el.offsetParent !== null);
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }, { signal: sig });
}

document.addEventListener('astro:page-load', () => {
  abort?.abort();
  modalCtl?.destroy?.();
  bgCtl?.destroy?.();
  modalCtl = null; bgCtl = null;
  document.documentElement.classList.remove('gv-modal-open');
  abort = new AbortController();
  initGalaxyPage(abort.signal);
});

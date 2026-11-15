// Liquid Glass 交互层（Phase 2）：指针追光镜面高光 + 按压光晕
// - 追光：鼠标在玻璃面上移动时，镜面高光跟随指针（写 --mx/--my，Phase 1 的 ::after 消费）；
//   仅鼠标 + 允许动效时启用，触屏/reduced-motion 静默（保留 Phase 1 静止高光）。
// - 光晕：玻璃胶囊按下时一圈光从指尖散开（HIG：flex and energize with light）。
// 站内全局加载（Glass.astro）；astro:page-load 重建 + AbortController 清理，与 nav.js 同构。

function initGlassMotion(sig) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return; // reduced-motion：不追光、不光晕；静止高光由 CSS 兜底

  // —— 指针追光：高光跟随鼠标，离开归位 ——
  document.querySelectorAll('.sec, .hero-wb.glass, .hero-index.glass').forEach((el) => {
    let raf = 0, mx = 30, my = -6;
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return; // 只跟鼠标
      const r = el.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width) * 100;
      my = ((e.clientY - r.top) / r.height) * 100;
      if (!raf) raf = requestAnimationFrame(() => {
        el.style.setProperty('--mx', mx.toFixed(1) + '%');
        el.style.setProperty('--my', my.toFixed(1) + '%');
        raf = 0;
      });
    }, { signal: sig });
    el.addEventListener('pointerleave', () => {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      el.style.removeProperty('--mx');
      el.style.removeProperty('--my'); // 归位到 CSS 默认（左上一抹）
    }, { signal: sig });
  });

  // —— 按压光晕：委托到 document，覆盖动态加入的胶囊 ——
  document.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.btn-accent, .wb-expand');
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const bloom = document.createElement('span');
    bloom.className = 'lg-bloom';
    const d = Math.max(r.width, r.height) * 1.8;
    bloom.style.width = bloom.style.height = d + 'px';
    bloom.style.left = (e.clientX - r.left) + 'px';
    bloom.style.top = (e.clientY - r.top) + 'px';
    btn.appendChild(bloom);
    setTimeout(() => bloom.remove(), 620);
  }, { signal: sig });
}

let gmAbort = null;
document.addEventListener('astro:page-load', () => {
  gmAbort?.abort();
  gmAbort = new AbortController();
  initGlassMotion(gmAbort.signal);
});

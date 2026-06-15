// 简历下载轻量人机校验：纯前端「滑动验证」，零后端零月费。
// 点击任意 [data-resume] 链接 → 弹玻璃 modal → 拖动滑块到底 → 触发 PDF 下载。
// 渐进增强：无 JS 时链接保留原 href，可直接下载，不完全挡死（见 Glass.astro）。
// View Transitions 生命周期：每次 astro:page-load 用 AbortController 重绑，避免重复监听。

let ac = null;

function init() {
  ac?.abort();
  const links = document.querySelectorAll('[data-resume]');
  const modal = document.getElementById('resume-modal');
  if (!links.length || !modal) return;

  ac = new AbortController();
  const sig = ac.signal;
  const on = (el, ev, fn, opts) => el.addEventListener(ev, fn, { signal: sig, ...opts });

  const slider = document.getElementById('resume-slider');
  const handle = document.getElementById('resume-handle');
  const fill = document.getElementById('resume-fill');
  const text = document.getElementById('resume-text');
  const closeBtn = document.getElementById('resume-close');
  const html = document.documentElement;

  let pdfUrl = '/assets/rick-si-resume.pdf';
  let verified = false;
  let dragging = false;
  let maxX = 0;
  let rectLeft = 0;
  let hw = 0;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const setX = (x) => {
    handle.style.transform = `translateX(${x}px)`;
    fill.style.width = `${x + hw}px`;
  };

  function reset() {
    verified = false;
    dragging = false;
    hw = handle.offsetWidth || 40;
    setX(0);
    slider.classList.remove('done');
    text.textContent = '向右拖动滑块完成验证';
  }
  function open(url) {
    pdfUrl = url || pdfUrl;
    modal.hidden = false;
    html.classList.add('resume-open');
    reset();
  }
  function close() {
    modal.hidden = true;
    html.classList.remove('resume-open');
  }
  function triggerDownload() {
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.target = '_blank';
    a.rel = 'noreferrer';
    a.setAttribute('download', '');
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  function succeed() {
    if (verified) return;
    verified = true;
    dragging = false;
    setX(maxX);
    slider.classList.add('done');
    text.textContent = '验证通过，开始下载…';
    setTimeout(() => {
      triggerDownload();
      close();
    }, 550);
  }

  function onDown(e) {
    if (verified) return;
    const rect = slider.getBoundingClientRect();
    hw = handle.offsetWidth || 40;
    rectLeft = rect.left;
    maxX = Math.max(0, rect.width - hw - 6);
    dragging = true;
    handle.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }
  function onMove(e) {
    if (!dragging) return;
    const x = clamp(e.clientX - rectLeft - hw / 2, 0, maxX);
    setX(x);
    if (x >= maxX - 2) succeed();
  }
  function onUp() {
    if (!dragging || verified) return;
    dragging = false;
    reset(); // 没拖到底：滑块归位重来
  }

  links.forEach((l) =>
    on(l, 'click', (e) => {
      e.preventDefault();
      open(l.getAttribute('href'));
    }),
  );
  on(handle, 'pointerdown', onDown);
  on(handle, 'pointermove', onMove);
  on(handle, 'pointerup', onUp);
  on(handle, 'pointercancel', onUp);
  on(closeBtn, 'click', close);
  on(modal, 'click', (e) => {
    if (e.target === modal) close();
  });
  on(document, 'keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) close();
  });
}

document.addEventListener('astro:page-load', init);

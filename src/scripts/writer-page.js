// Writer Pipeline 落地页交互：滚动揭示 + 数字 count-up + AI 味 X 光扫描器。
// 无重型依赖；复用 galaxy-page.js 的 reveal / count-up 口径，新增扫描器三态。

let abort = null;

function initWriterPage(sig) {
  const scanner = document.getElementById('wp-scanner');
  if (!scanner) return; // 仅落地页

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 滚动揭示 ---------- */
  const reveals = document.querySelectorAll('.wp-reveal');
  if (reveals.length) {
    const show = (el) => el.classList.add('wp-in');
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
      setTimeout(() => reveals.forEach(show), 1600); // IO 失效兜底
    }
  }

  /* ---------- 数字 count-up ---------- */
  const nums = document.querySelectorAll('.wp-num[data-count]');
  const fmt = (v, dec) => (dec ? v.toFixed(dec) : String(Math.round(v)));
  function runCount(el) {
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    if (reduced) { el.textContent = fmt(target, dec); return; }
    const dur = 1100, t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = fmt(target * (1 - Math.pow(1 - p, 3)), dec);
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

  /* ---------- AI 味 X 光扫描器 ---------- */
  const doc = document.getElementById('wp-doc');
  const note = document.getElementById('wp-note');
  const xrayBtn = document.getElementById('wp-xray');
  const cleanBtn = document.getElementById('wp-clean');
  const spans = doc ? [...doc.querySelectorAll('.wp-s')] : [];

  const setNote = (text, empty) => {
    if (!note) return;
    note.textContent = text;
    note.setAttribute('data-empty', empty ? 'true' : 'false');
  };

  if (xrayBtn && doc) {
    xrayBtn.addEventListener('click', () => {
      const on = doc.classList.toggle('wp-xray');
      xrayBtn.setAttribute('aria-pressed', String(on));
      if (on) {
        setNote('点高亮的句子，看 critic 怎么判它。', true);
      } else {
        spans.forEach((s) => s.classList.remove('active'));
        setNote('点高亮的句子，看 critic 怎么判它。', true);
      }
    }, { signal: sig });
  }

  if (cleanBtn && doc) {
    cleanBtn.addEventListener('click', () => {
      const on = doc.classList.toggle('wp-clean');
      cleanBtn.setAttribute('aria-pressed', String(on));
      if (on) setNote('净化到 v5：被判 C 的「电锯补刀」按 critic 建议删掉，承重句一字未动。', false);
    }, { signal: sig });
  }

  // 点句看判语（仅 X 光开启时可点）
  spans.forEach((s) => {
    s.addEventListener('click', () => {
      if (!doc.classList.contains('wp-xray')) return;
      spans.forEach((o) => o.classList.toggle('active', o === s));
      setNote(s.dataset.note || '', false);
    }, { signal: sig });
  });
}

document.addEventListener('astro:page-load', () => {
  abort?.abort();
  abort = new AbortController();
  initWriterPage(abort.signal);
});

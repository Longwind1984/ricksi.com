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

  /* ---------- Pipeline 三阶扫描器 ---------- */
  const docAi = document.getElementById('wp-doc-ai');
  const docVoice = document.getElementById('wp-doc-voice');
  const note = document.getElementById('wp-note');
  const nextBtn = document.getElementById('wp-next');
  const steps = [...document.querySelectorAll('.wp-step')];
  const spans = [...document.querySelectorAll('#wp-scanner .wp-s')];

  if (scanner && docAi && docVoice && note) {
    const verdicts = {
      1: '<b>critic 第一轮 · 扫 AI 味</b>：这稿不蠢——流畅、有结构、像有观点。但 AI 味最难治的正是这种体面：<span class="t-ai">该下判断处打太极（「没有标准答案」）、用抽象名词代替具体场景、结尾升华成一句关于「民主」的漂亮废话</span>。critic 打回 writer 一句：你的判断到底是什么？点高亮看每一处。',
      2: '<b>writer 注入 voice memo + few-shot 改写</b> → critic 第二轮：三个 hard floor 干净了。再逮到更隐蔽的金句口癖——<span class="t-c">「电锯是用来锯国家的」是为俏皮补的甩尾（C）</span>；<span class="t-a">「西装／军装」「不画问号」从场景长出来（A，留）</span>。点高亮看判语。',
      3: '<b>配额收口</b>：一篇只够 1–2 记真甩尾。<span class="t-c">砍掉电锯补刀</span>，<span class="t-a">承重句一字未动</span>。AI 初稿进去，我宁愿发的版本出来——这就是 pipeline 跑完的样子。',
    };
    const nextLabel = { 1: '改写去 AI 味 →', 2: '配额收口 →', 3: '↺ 再跑一遍' };

    const setStage = (n) => {
      scanner.dataset.stage = String(n);
      steps.forEach((st) => {
        const k = Number(st.dataset.step);
        st.classList.toggle('is-on', k === n);
        st.classList.toggle('is-done', k < n);
        st.setAttribute('aria-selected', String(k === n));
      });
      // 阶段 1 显示 AI 初稿；阶段 2/3 显示真实草稿；阶段 3 收起被砍片段
      docAi.classList.toggle('wp-on', n === 1);
      docVoice.classList.toggle('wp-on', n >= 2);
      docVoice.classList.toggle('wp-clean', n === 3);
      spans.forEach((s) => s.classList.remove('active'));
      note.innerHTML = verdicts[n];
      if (nextBtn) nextBtn.textContent = nextLabel[n];
    };

    steps.forEach((st) =>
      st.addEventListener('click', () => setStage(Number(st.dataset.step)), { signal: sig }),
    );
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const cur = Number(scanner.dataset.stage) || 1;
        setStage(cur >= 3 ? 1 : cur + 1);
      }, { signal: sig });
    }
    spans.forEach((s) =>
      s.addEventListener('click', () => {
        spans.forEach((o) => o.classList.toggle('active', o === s));
        note.textContent = s.dataset.note || '';
      }, { signal: sig }),
    );

    setStage(1);
  }
}

document.addEventListener('astro:page-load', () => {
  abort?.abort();
  abort = new AbortController();
  initWriterPage(abort.signal);
});

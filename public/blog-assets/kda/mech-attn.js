/* ==========================================================================
   Kimi K3 · KDA 机制动画演示（注意力机制组）—— 零依赖 vanilla JS + inline SVG
   挂载点：<div class="kda-demo" data-demo="lookback|state|micro">
   防 ClientRouter 重复初始化：window.__kdaMechAttnBound + dataset.kdaAttnInit
   注：demos.js 会先行把 kdaInit 标记到所有 .kda-demo 上（含本组挂载点），
   故本组使用独立标记 kdaAttnInit，保证与 demos.js 任意加载顺序互不干扰。
   ========================================================================== */
(() => {
  'use strict';

  /* ---------------- 工具 ---------------- */

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const REDUCED = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TOKENS = ['我', '把', '整个', '代码仓', '塞给', '模型', '让', '它', '回答'];
  const N = TOKENS.length;

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else el.setAttribute(k, v);
      }
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null) continue;
      el.append(kid);
    }
    return el;
  }

  function s(tag, attrs, ...kids) {
    const el = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null) continue;
        el.setAttribute(k, v);
      }
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null) continue;
      el.append(kid);
    }
    return el;
  }

  /* 每个演示各自的定时器组：暂停/重置时统一清理 */
  function makeClock() {
    const ids = new Set();
    return {
      later(fn, ms) {
        const id = setTimeout(() => { ids.delete(id); fn(); }, ms);
        ids.add(id);
        return id;
      },
      clear() { ids.forEach(clearTimeout); ids.clear(); },
    };
  }

  /* ---------------- 初始化骨架（照约定模式，flag 名 __kdaMechAttnBound） ---------------- */

  const builders = { lookback: buildLookback, state: buildState, micro: buildMicro };
  function initKdaMechAttn() {
    document.querySelectorAll('.kda-demo[data-demo]').forEach((el) => {
      if (el.dataset.kdaAttnInit === '1') return;
      const b = builders[el.dataset.demo]; if (!b) return;
      el.dataset.kdaAttnInit = '1'; el.textContent = ''; b(el);
    });
  }
  if (document.readyState !== 'loading') initKdaMechAttn();
  else document.addEventListener('DOMContentLoaded', initKdaMechAttn, { once: true });
  if (!window.__kdaMechAttnBound) {
    window.__kdaMechAttnBound = true;
    document.addEventListener('astro:page-load', initKdaMechAttn);
  }

  /* ==========================================================================
     演示 1 · data-demo="lookback" 全注意力回看动画
     每落一个新 token，向所有已存在 token（含自己）画连线，网越来越密，
     计数器按 n(n+1)/2 平方起飞，小柱图同步生长。
     ========================================================================== */

  function buildLookback(root) {
    const W = 720, H = 250, TOK_Y = 54;
    const X = (i) => 46 + (i * (W - 92)) / (N - 1);
    const countFor = (i) => { const n = i + 1; return (n * (n + 1)) / 2; };
    const DELAY = { slow: 950, fast: 380 };

    const frame = h('div', { class: 'kda-demo-frame' });

    /* 头部：标题 + 右上角 mono 计数器 + 小柱图 */
    const countNum = h('b', { text: '0' });
    const mini = s('svg', { class: 'kda-ma-mini', viewBox: '0 0 96 40', 'aria-hidden': 'true' });
    frame.append(h('div', { class: 'kda-ma-head' },
      h('span', { class: 'kda-ma-title', text: '全注意力 · 每个新词都回头看一眼全部历史' }),
      h('span', { class: 'kda-ma-count' }, '累计注意力计算 ', countNum, ' 次 ', mini)));

    /* token 舞台 */
    const stage = s('svg', {
      class: 'kda-ma-stage', viewBox: `0 0 ${W} ${H}`, role: 'img',
      'aria-label': '全注意力回看动画：每来一个新 token，就与所有已有 token 连线',
    });
    const gLinks = s('g');
    const gToks = s('g');
    stage.append(gLinks, gToks);
    frame.append(stage);

    /* 控件 */
    const btnPlay = h('button', { class: 'kda-btn', type: 'button', text: '播放' });
    const btnStep = h('button', { class: 'kda-btn', type: 'button', text: '逐步' });
    const btnReset = h('button', { class: 'kda-btn', type: 'button', text: '重置' });
    const btnSlow = h('button', { class: 'kda-btn is-active', type: 'button', text: '慢' });
    const btnFast = h('button', { class: 'kda-btn', type: 'button', text: '快' });
    const ctl = h('div', { class: 'kda-controls' });
    if (REDUCED) ctl.append(btnStep, btnReset);
    else ctl.append(btnPlay, btnStep, btnReset,
      h('span', { class: 'kda-ma-ctllabel', text: '速度' }), btnSlow, btnFast);
    frame.append(ctl);

    frame.append(h('div', { class: 'kda-note', text: '计算次数为两两配对象征计数（含看向自己的自注意力），示意。' }));
    root.append(frame);

    let idx = 0, playing = false, speed = 'slow';
    const clock = makeClock();

    function addToken(i) {
      const x = X(i);
      const g = s('g', { class: 'kda-ma-tok-g' });
      g.append(s('rect', { class: 'kda-ma-pill', x: x - 30, y: TOK_Y - 22, width: 60, height: 32, rx: 9 }));
      const t = s('text', { class: 'kda-ma-tok', x, y: TOK_Y + 1, 'text-anchor': 'middle' });
      t.textContent = TOKENS[i];
      g.append(t);
      gToks.append(g);
      /* 与所有历史 token 的连线（向下垂的弧线，越积越密） */
      for (let j = 0; j < i; j++) {
        const xj = X(j);
        const mid = (x + xj) / 2;
        const depth = 16 + (i - j) * 9;
        gLinks.append(s('path', {
          class: 'kda-ma-link',
          d: `M ${x} ${TOK_Y + 14} Q ${mid} ${TOK_Y + 14 + depth} ${xj} ${TOK_Y + 14}`,
        }));
      }
      /* 自注意力回环 */
      gLinks.append(s('path', {
        class: 'kda-ma-link kda-ma-self',
        d: `M ${x - 9} ${TOK_Y - 20} C ${x - 16} ${TOK_Y - 42} ${x + 16} ${TOK_Y - 42} ${x + 9} ${TOK_Y - 20}`,
      }));
    }

    function addBar(i) {
      const bw = 96 / N;
      const bh = Math.max(2, (countFor(i) / countFor(N - 1)) * 34);
      mini.append(s('rect', {
        class: 'kda-ma-bar',
        x: (i * bw + 1).toFixed(1), y: (40 - bh).toFixed(1),
        width: (bw - 2).toFixed(1), height: bh.toFixed(1),
      }));
    }

    function sync() {
      const done = idx >= N;
      btnPlay.textContent = playing ? '暂停' : '播放';
      btnPlay.disabled = done && !playing;
      btnStep.disabled = done;
      btnSlow.classList.toggle('is-active', speed === 'slow');
      btnFast.classList.toggle('is-active', speed === 'fast');
    }

    function step() {
      if (idx >= N || !root.isConnected) { playing = false; clock.clear(); sync(); return; }
      addToken(idx);
      addBar(idx);
      countNum.textContent = String(countFor(idx));
      idx += 1;
      if (idx >= N) playing = false;
      sync();
      if (playing) clock.later(step, DELAY[speed]);
    }

    function reset() {
      playing = false;
      clock.clear();
      idx = 0;
      gLinks.textContent = '';
      gToks.textContent = '';
      mini.textContent = '';
      countNum.textContent = '0';
      sync();
    }

    btnPlay.addEventListener('click', () => {
      playing = !playing;
      clock.clear();
      if (playing) step(); else sync();
    });
    btnStep.addEventListener('click', () => { playing = false; clock.clear(); step(); });
    btnReset.addEventListener('click', reset);
    btnSlow.addEventListener('click', () => { speed = 'slow'; sync(); });
    btnFast.addEventListener('click', () => { speed = 'fast'; sync(); });
    sync();
  }

  /* ==========================================================================
     演示 2 · data-demo="state" 线性注意力状态更新动画
     与演示 1 镜像：同样的 token 流，但没有回看连线；每 token 触发
     固定 4×4 状态矩阵 S 一次写入闪烁 + 一次读取脉冲；计数器恒速 +2，
     小柱图是平的。结尾给出 45 vs 18 的对比小结。
     ========================================================================== */

  function buildState(root) {
    const W = 720, H = 116, TOK_Y = 50;
    const X = (i) => 46 + (i * (W - 92)) / (N - 1);
    const DELAY = { slow: 1150, fast: 460 };

    const frame = h('div', { class: 'kda-demo-frame' });

    const countNum = h('b', { text: '0' });
    const mini = s('svg', { class: 'kda-ma-mini', viewBox: '0 0 96 40', 'aria-hidden': 'true' });
    frame.append(h('div', { class: 'kda-ma-head' },
      h('span', { class: 'kda-ma-title', text: '线性注意力 · 历史被压缩进固定大小的状态 S' }),
      h('span', { class: 'kda-ma-count' }, '累计操作 ', countNum, ' 次 ', mini)));

    /* token 舞台（无回看连线） */
    const stage = s('svg', {
      class: 'kda-ma-stage', viewBox: `0 0 ${W} ${H}`, role: 'img',
      'aria-label': '线性注意力状态更新动画：token 依次落下，右侧状态矩阵每 token 一次写入、一次读取',
    });
    const gToks = s('g');
    stage.append(gToks);

    /* 固定 4×4 状态矩阵 */
    const cells = [];
    const matrix = h('div', { class: 'kda-ma-matrix', role: 'img', 'aria-label': '4 乘 4 状态矩阵 S，固定大小' });
    for (let c = 0; c < 16; c++) {
      const cell = h('span', { class: 'kda-ma-cell' });
      cells.push(cell);
      matrix.append(cell);
    }
    const side = h('div', { class: 'kda-ma-side' },
      h('div', { class: 'kda-ma-matrixlabel', text: '状态 S · 4×4 · 固定大小' }),
      matrix);

    frame.append(h('div', { class: 'kda-ma-flex' },
      h('div', { class: 'kda-ma-grow' }, stage), side));

    /* 控件（同演示 1） */
    const btnPlay = h('button', { class: 'kda-btn', type: 'button', text: '播放' });
    const btnStep = h('button', { class: 'kda-btn', type: 'button', text: '逐步' });
    const btnReset = h('button', { class: 'kda-btn', type: 'button', text: '重置' });
    const btnSlow = h('button', { class: 'kda-btn is-active', type: 'button', text: '慢' });
    const btnFast = h('button', { class: 'kda-btn', type: 'button', text: '快' });
    const ctl = h('div', { class: 'kda-controls' });
    if (REDUCED) ctl.append(btnStep, btnReset);
    else ctl.append(btnPlay, btnStep, btnReset,
      h('span', { class: 'kda-ma-ctllabel', text: '速度' }), btnSlow, btnFast);
    frame.append(ctl);

    const note = h('div', { class: 'kda-note', text: '每 token 固定 1 次写入 + 1 次读取，开销与上下文长度无关，示意。' });
    frame.append(note);
    root.append(frame);

    let idx = 0, playing = false, speed = 'slow', summaryEl = null;
    const clock = makeClock();

    /* 每个 token 受影响的格子（伪随机但确定） */
    function seeds(i) {
      const out = [];
      [(i * 5 + 1) % 16, (i * 7 + 4) % 16, (i * 11 + 9) % 16].forEach((c) => {
        if (!out.includes(c)) out.push(c);
      });
      return out;
    }

    function addToken(i) {
      const x = X(i);
      const g = s('g', { class: 'kda-ma-tok-g' });
      g.append(s('rect', { class: 'kda-ma-pill', x: x - 30, y: TOK_Y - 22, width: 60, height: 32, rx: 9 }));
      const t = s('text', { class: 'kda-ma-tok', x, y: TOK_Y + 1, 'text-anchor': 'middle' });
      t.textContent = TOKENS[i];
      g.append(t);
      gToks.append(g);
    }

    function addBar() {
      /* 平的小柱图：每 token 开销恒定 */
      const bw = 96 / N;
      mini.append(s('rect', {
        class: 'kda-ma-bar',
        x: (idx * bw + 1 - bw).toFixed(1), y: '25',
        width: (bw - 2).toFixed(1), height: '15',
      }));
    }

    function showSummary() {
      if (summaryEl) return;
      summaryEl = h('div', {
        class: 'kda-ma-summary',
        text: '同样 9 个 token：全注意力 45 次配对 vs 线性 18 次操作，且不随上下文变长而变贵。',
      });
      frame.insertBefore(summaryEl, note);
    }

    function sync() {
      const done = idx >= N;
      btnPlay.textContent = playing ? '暂停' : '播放';
      btnPlay.disabled = done && !playing;
      btnStep.disabled = done;
      btnSlow.classList.toggle('is-active', speed === 'slow');
      btnFast.classList.toggle('is-active', speed === 'fast');
    }

    function step() {
      if (idx >= N || !root.isConnected) { playing = false; clock.clear(); sync(); return; }
      const i = idx;
      const d = DELAY[speed];
      addToken(i);
      idx += 1;
      /* 一次写入：受影响格子闪烁 accent-text */
      clock.later(() => {
        seeds(i).forEach((c) => cells[c].classList.add('is-flash'));
      }, d * 0.15);
      /* 一次读取：整矩阵脉冲，计数 +2 */
      clock.later(() => {
        cells.forEach((c) => c.classList.remove('is-flash'));
        matrix.classList.add('is-read');
        countNum.textContent = String(2 * (i + 1));
        addBar();
      }, d * 0.55);
      clock.later(() => {
        matrix.classList.remove('is-read');
        if (idx >= N) showSummary();
      }, d * 0.9);
      if (idx >= N) playing = false;
      sync();
      if (playing) clock.later(step, d);
    }

    function reset() {
      playing = false;
      clock.clear();
      idx = 0;
      gToks.textContent = '';
      mini.textContent = '';
      countNum.textContent = '0';
      cells.forEach((c) => c.classList.remove('is-flash'));
      matrix.classList.remove('is-read');
      if (summaryEl) { summaryEl.remove(); summaryEl = null; }
      sync();
    }

    btnPlay.addEventListener('click', () => {
      playing = !playing;
      clock.clear();
      if (playing) step(); else sync();
    });
    btnStep.addEventListener('click', () => { playing = false; clock.clear(); step(); });
    btnReset.addEventListener('click', reset);
    btnSlow.addEventListener('click', () => { speed = 'slow'; sync(); });
    btnFast.addEventListener('click', () => { speed = 'fast'; sync(); });
    sync();
  }

  /* ==========================================================================
     演示 3 · data-demo="micro" Delta 规则单步微观循环
     ① 试查询：高亮矩阵一行，Ŝk = 2.1
     ② 比误差：v = 2.3 淡入，误差徽章 +0.2 跳出
     ③ 按 β 写回：仅 k 方向相关的 2-3 格滚动 +0.2×β，其余变暗
     β 滑杆 0→1 默认 0.8，实时改变写入幅度；循环播放 + 单步执行。
     ========================================================================== */

  function buildMicro(root) {
    const BASE = [0.4, -1.1, 0.8, 0.2, 1.6, 0.3, -0.7, 0.9, -0.4, 1.2, 0.6, -0.2, 0.7, -0.9, 1.4, 0.5];
    const ROW_CELLS = [4, 5, 6, 7];   /* 试查询高亮的一行 */
    const TARGETS = [5, 6, 9];        /* k 方向相关、真正被写回的格子 */
    const PHASE_DUR = 1200, HOLD_DUR = 2200;
    const fmt = (v) => {
      let out = (v + 0).toFixed(2);
      if (out.endsWith('0')) out = out.slice(0, -1);
      return out;
    };

    const frame = h('div', { class: 'kda-demo-frame' });

    /* 顶部阶段标签 + 一句解说 */
    const chips = ['① 试查询', '② 比误差', '③ 按 β 写回']
      .map((t) => h('span', { class: 'kda-ma-chip', text: t }));
    const desc = h('p', {
      class: 'kda-ma-desc',
      text: REDUCED
        ? '点「单步执行」，逐阶段看一次 delta 规则更新。'
        : '点「循环播放」或「单步执行」，看一次 delta 规则更新。',
    });
    frame.append(h('div', { class: 'kda-ma-chips' }, chips), desc);

    /* 4×4 状态矩阵（格内小数字） */
    const cellNums = [];
    const cells = [];
    const matrix = h('div', { class: 'kda-ma-matrix', role: 'img', 'aria-label': '4 乘 4 状态矩阵，格内为示意数值' });
    BASE.forEach((v) => {
      const num = h('span', { text: fmt(v) });
      const cell = h('span', { class: 'kda-ma-cell' }, num);
      cellNums.push(num);
      cells.push(cell);
      matrix.append(cell);
    });
    const side = h('div', { class: 'kda-ma-side' },
      h('div', { class: 'kda-ma-matrixlabel', text: '状态 S · 4×4' }),
      matrix);

    /* 算式面板 */
    const eqS = h('div', { class: 'kda-ma-eq-line', text: 'Ŝk = 2.1' });
    const eqV = h('div', { class: 'kda-ma-eq-line is-faint', text: 'v = 2.3' });
    const badge = h('span', { class: 'kda-ma-badge kda-hidden', text: '误差 +0.2' });
    const eqD = h('div', { class: 'kda-ma-eq-line is-faint' });
    const eq = h('div', { class: 'kda-ma-eq' },
      eqS, h('div', { class: 'kda-ma-eq-row' }, eqV, badge), eqD);

    /* β 滑杆 */
    const betaVal = h('span', { class: 'kda-field-val', text: '0.80' });
    const slider = h('input', {
      class: 'kda-slider', type: 'range', min: '0', max: '1',
      step: '0.05', value: '0.8', 'aria-label': '写回比例 β',
    });
    const field = h('div', { class: 'kda-field' },
      h('div', { class: 'kda-field-head' }, h('span', { text: 'β（写回比例）' }), betaVal),
      slider);

    frame.append(h('div', { class: 'kda-ma-flex' }, side, h('div', { class: 'kda-ma-grow' }, eq, field)));

    /* 控件 */
    const btnPlay = h('button', { class: 'kda-btn', type: 'button', text: '循环播放' });
    const btnStep = h('button', { class: 'kda-btn', type: 'button', text: '单步执行' });
    const ctl = h('div', { class: 'kda-controls' });
    if (REDUCED) ctl.append(btnStep);
    else ctl.append(btnPlay, btnStep);
    frame.append(ctl);

    frame.append(h('div', { class: 'kda-note', text: '矩阵数值为教学示意。' }));
    root.append(frame);

    let beta = 0.8, phase = -1, playing = false;
    const cur = BASE.slice();
    const clock = makeClock();

    function clearMarks() {
      cells.forEach((c) => c.classList.remove('is-hl', 'is-hot', 'is-dim'));
    }

    /* 数字滚动写入（reduced-motion 时直接落定） */
    function setNum(i, to) {
      const from = cur[i];
      cancelAnimationFrame(cellNums[i]._raf || 0);
      if (REDUCED || Math.abs(to - from) < 1e-9) {
        cur[i] = to;
        cellNums[i].textContent = fmt(to);
        return;
      }
      const t0 = performance.now(), dur = 520;
      const fr = (t) => {
        const k = Math.min(1, (t - t0) / dur);
        const val = from + (to - from) * k;
        cur[i] = val;
        cellNums[i].textContent = fmt(val);
        if (k < 1) cellNums[i]._raf = requestAnimationFrame(fr);
      };
      cellNums[i]._raf = requestAnimationFrame(fr);
    }

    function resetCycle() {
      clearMarks();
      BASE.forEach((v, i) => setNum(i, v));
      eqV.classList.add('is-faint');
      eqD.classList.add('is-faint');
      badge.classList.add('kda-hidden');
      badge.classList.remove('is-pop');
    }

    function applyPhase(p) {
      phase = p;
      chips.forEach((ch, i) => ch.classList.toggle('is-active', i === p));
      if (p === 0) {
        /* ① 试查询：高亮一行，给出当前记忆的预测 */
        clearMarks();
        ROW_CELLS.forEach((c) => cells[c].classList.add('is-hl'));
        desc.textContent = '拿着 k 先查一遍现有记忆，看矩阵此刻给出的预测。';
        eqV.classList.add('is-faint');
        eqD.classList.add('is-faint');
        badge.classList.add('kda-hidden');
      } else if (p === 1) {
        /* ② 比误差：真实值淡入，误差徽章跳出 */
        clearMarks();
        desc.textContent = '真实值 v 到了，和记忆里的预测对一下，看差多少。';
        eqV.classList.remove('is-faint');
        badge.classList.remove('kda-hidden');
        badge.classList.remove('is-pop');
        void badge.offsetWidth; /* 重触发弹出动画 */
        badge.classList.add('is-pop');
      } else {
        /* ③ 按 β 写回：只动 k 方向相关的格子 */
        clearMarks();
        const d = 0.2 * beta;
        eqD.textContent = `Δ = 0.2 × ${beta.toFixed(2)} = ${d.toFixed(2)}`;
        eqD.classList.remove('is-faint');
        if (d <= 0) {
          desc.textContent = 'β = 0：什么都不学，矩阵一个 bit 都不动。';
          cells.forEach((c) => c.classList.add('is-dim'));
        } else {
          desc.textContent = beta >= 1
            ? 'β = 1：误差满幅覆写，旧值被完全替换。'
            : `只把误差 × β = ${d.toFixed(2)} 写回与 k 相关的格子，其余一个 bit 都不动。`;
          cells.forEach((c, i) => { if (!TARGETS.includes(i)) c.classList.add('is-dim'); });
          TARGETS.forEach((i) => {
            cells[i].classList.add('is-hot');
            setNum(i, BASE[i] + d);
          });
        }
      }
    }

    function advance() {
      if (!root.isConnected) { playing = false; clock.clear(); return; }
      if (phase < 2) applyPhase(phase + 1);
      else { resetCycle(); applyPhase(0); }
    }

    function syncPlay() {
      btnPlay.textContent = playing ? '暂停' : '循环播放';
    }

    function tick() {
      advance();
      syncPlay();
      if (playing) clock.later(tick, phase === 2 ? HOLD_DUR : PHASE_DUR);
    }

    btnPlay.addEventListener('click', () => {
      playing = !playing;
      clock.clear();
      if (playing) tick();
      syncPlay();
    });
    btnStep.addEventListener('click', () => {
      playing = false;
      clock.clear();
      advance();
      syncPlay();
    });
    slider.addEventListener('input', () => {
      beta = parseFloat(slider.value);
      betaVal.textContent = beta.toFixed(2);
      /* 第③步期间实时改变写入幅度 */
      if (phase === 2) applyPhase(2);
    });
  }
})();

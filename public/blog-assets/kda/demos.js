/* ==========================================================================
   Kimi K3 · KDA 交互演示 —— 零依赖 vanilla JS + inline SVG
   挂载点：<div class="kda-demo" data-demo="cost|delta|channels|bill">
   防 ClientRouter 重复初始化：dataset.kdaInit 标记 + window.__kdaDemosBound
   ========================================================================== */

/* ---------------- 工具（必须先于骨架初始化：骨架会同步调用 initKdaDemos） ---------------- */

const KDA_SVG_NS = 'http://www.w3.org/2000/svg';
const KDA_REDUCED = typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function kdaH(tag, attrs, ...kids) {
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

function kdaS(tag, attrs, ...kids) {
  const el = document.createElementNS(KDA_SVG_NS, tag);
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

/* ---------------- 初始化骨架（防 ClientRouter 重复初始化，逐字契约） ---------------- */

const builders = { cost: buildCost, delta: buildDelta, channels: buildChannels, bill: buildBill };
function initKdaDemos() {
  document.querySelectorAll('.kda-demo[data-demo]').forEach((el) => {
    if (el.dataset.kdaInit === '1') return;
    const fn = builders[el.dataset.demo];
    if (!fn) return; // 不认识的 data-demo（mech-attn/mech-arch 的挂载点）不标记、不清空，留给对应脚本
    el.dataset.kdaInit = '1';
    el.textContent = ''; fn(el);
  });
}
if (document.readyState !== 'loading') initKdaDemos();
if (!window.__kdaDemosBound) {
  window.__kdaDemosBound = true;
  document.addEventListener('astro:page-load', initKdaDemos);
}

/* ==========================================================================
   演示 1 · 成本曲线模拟器（data-demo="cost"）
   全注意力：每 token 解码成本随上下文线性上升；KDA：恒定状态，接近水平线。
   ========================================================================== */

function buildCost(root) {
  const stops = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];
  const labels = ['1K', '2K', '4K', '8K', '16K', '32K', '64K', '128K', '256K', '512K', '1M'];
  const W = 720, H = 300, ML = 46, MR = 16, MT = 34, MB = 30;
  const PW = W - ML - MR, PH = H - MT - MB;
  const Y_MAX = 700; // 1M 处全注意力 = 1024，冲出图表上沿（截断）
  const X = (i) => ML + (i * PW) / (stops.length - 1);
  const Y = (v) => MT + PH - (Math.min(v, Y_MAX) / Y_MAX) * PH;
  const kdaY = Y(1);

  const frame = kdaH('div', { class: 'kda-demo-frame' });

  const legend = kdaH('div', { class: 'kda-legend' },
    kdaH('span', { class: 'kda-legend-item' },
      kdaH('i', { class: 'kda-swatch kda-swatch-full' }),
      '全注意力：每 token 解码成本随上下文线性上升'),
    kdaH('span', { class: 'kda-legend-item' },
      kdaH('i', { class: 'kda-swatch kda-swatch-kda' }),
      'KDA：恒定状态，成本几乎不随上下文变化'));

  const svg = kdaS('svg', {
    class: 'kda-chart', viewBox: `0 0 ${W} ${H}`,
    role: 'img', 'aria-label': '全注意力与 KDA 的每 token 解码成本曲线对比',
  });

  // 绘图区裁剪（全注意力曲线冲出上沿时被截断）
  const defs = kdaS('defs');
  const clip = kdaS('clipPath', { id: 'kda-cost-clip' });
  clip.append(kdaS('rect', { x: ML, y: 0, width: PW, height: MT + PH }));
  defs.append(clip);
  svg.append(defs);

  // 网格与坐标轴
  [100, 300, 500, 700].forEach((v) => {
    svg.append(kdaS('line', { class: 'kda-grid', x1: ML, x2: ML + PW, y1: Y(v), y2: Y(v) }));
    const t = kdaS('text', { class: 'kda-grid-label', x: ML - 6, y: Y(v) + 3, 'text-anchor': 'end' });
    t.textContent = `${v}×`;
    svg.append(t);
  });
  svg.append(kdaS('line', { class: 'kda-ax', x1: ML, x2: ML, y1: MT, y2: MT + PH }));
  svg.append(kdaS('line', { class: 'kda-ax', x1: ML, x2: ML + PW, y1: MT + PH, y2: MT + PH }));

  // 全注意力曲线（1M 处越过绘图区，被裁剪）
  const fullPts = stops.map((v, i) => `${X(i)},${MT + PH - (v / Y_MAX) * PH}`);
  const gFull = kdaS('g', { 'clip-path': 'url(#kda-cost-clip)' });
  gFull.append(kdaS('polyline', { class: 'kda-line-full', points: fullPts.join(' ') }));
  svg.append(gFull);

  // KDA 恒定水平线
  svg.append(kdaS('line', { class: 'kda-line-kda', x1: X(0), x2: X(stops.length - 1), y1: kdaY, y2: kdaY }));

  // 垂直游标与两条曲线上的读数点
  const cursor = kdaS('line', { class: 'kda-cursor', x1: X(0), x2: X(0), y1: MT, y2: MT + PH });
  const dotFull = kdaS('circle', { class: 'kda-dot-full', r: 4, cx: X(0), cy: Y(1) });
  const dotKda = kdaS('circle', { class: 'kda-dot-kda', r: 4, cx: X(0), cy: kdaY });
  svg.append(cursor, dotFull, dotKda);

  // 「超出刻度」虚线提示（仅 1M 时显示）
  const clipG = kdaS('g', { class: 'kda-hidden' });
  clipG.append(kdaS('line', { class: 'kda-clip-line', x1: ML, x2: ML + PW, y1: MT, y2: MT }));
  const clipT = kdaS('text', { class: 'kda-clip-label', x: ML + PW - 4, y: MT + 12, 'text-anchor': 'end' });
  clipT.textContent = '全注意力曲线超出刻度 ↑';
  clipG.append(clipT);
  svg.append(clipG);

  // 6.3× 实测口径标注（仅 1M 时显示）
  const anno = kdaS('text', {
    class: 'kda-anno kda-hidden',
    x: X(stops.length - 1) - 6, y: kdaY - 12, 'text-anchor': 'end',
  });
  anno.textContent = '6.3× —— Kimi Linear 论文实测口径';
  svg.append(anno);

  // 控件
  const readout = kdaH('div', { class: 'kda-readout' });
  const slider = kdaH('input', {
    class: 'kda-slider', type: 'range',
    min: '0', max: String(stops.length - 1), step: '1', value: '0',
    'aria-label': '上下文长度',
  });
  const ticks = kdaH('div', { class: 'kda-ticks' }, labels.map((l) => kdaH('span', { text: l })));
  const note = kdaH('div', {
    class: 'kda-note',
    text: '口径：纵轴为相对量级示意，非实测值；6.3× 出自 Kimi Linear 论文（1M 上下文下 KDA 对全注意力的解码吞吐优势）。',
  });

  function update() {
    const i = Number(slider.value);
    const v = stops[i];
    cursor.setAttribute('x1', X(i));
    cursor.setAttribute('x2', X(i));
    dotKda.setAttribute('cx', X(i));
    dotKda.setAttribute('cy', kdaY);
    const off = v > Y_MAX;
    dotFull.setAttribute('cx', X(i));
    dotFull.setAttribute('cy', off ? MT : Y(v));
    dotFull.classList.toggle('kda-hidden', off);
    clipG.classList.toggle('kda-hidden', !off);
    anno.classList.toggle('kda-hidden', i !== stops.length - 1);
    readout.textContent = `上下文 ${labels[i]} · 全注意力相对成本 ≈ ${v}× · KDA ≈ 1×`;
  }
  slider.addEventListener('input', update);
  update();

  frame.append(legend, svg, readout, slider, ticks, note);
  root.append(frame);
}

/* ==========================================================================
   演示 2 · Delta 规则记忆白板（data-demo="delta"）
   朴素累加：旧值不清除，查询时答案混杂；
   Delta 规则：写入新值前旧值按 1−β 精确衰减，先擦再写。
   ========================================================================== */

function buildDelta(root) {
  const STEPS = [
    { k: '会议地点', v: '北京' },
    { k: '预算', v: '50万' },
    { k: '会议地点', v: '上海' },
    { k: '负责人', v: '小李' },
    { k: '预算', v: '80万' },
  ];
  const KEYS = [
    { name: '会议地点', cands: ['北京', '上海'] },
    { name: '预算', cands: ['50万', '80万'] },
    { name: '负责人', cands: ['小李', '小王'] },
  ];
  let mode = 'delta'; // 'naive' | 'delta'
  let beta = 0.8;
  let stepCount = 0;

  const frame = kdaH('div', { class: 'kda-demo-frame' });

  // 模式切换
  const btnNaive = kdaH('button', { class: 'kda-btn', type: 'button', text: '朴素累加' });
  const btnDelta = kdaH('button', { class: 'kda-btn', type: 'button', text: 'Delta 规则' });
  const modeRow = kdaH('div', { class: 'kda-controls' }, btnNaive, btnDelta);

  // β 滑杆
  const betaVal = kdaH('span', { class: 'kda-field-val' });
  const betaHead = kdaH('div', { class: 'kda-field-head' },
    kdaH('span', { text: 'β：写入强度（写入前旧值按 1−β 精确衰减）' }), betaVal);
  const betaSlider = kdaH('input', {
    class: 'kda-slider', type: 'range',
    min: '0', max: '100', step: '1', value: '80',
    'aria-label': 'β 写入强度',
  });
  const betaField = kdaH('div', { class: 'kda-field' }, betaHead, betaSlider);

  // 事实流步骤
  const chips = STEPS.map((s, i) => kdaH('span', { class: 'kda-step', text: `${i + 1} ${s.k} → ${s.v}` }));
  const stepsRow = kdaH('div', { class: 'kda-steps' }, chips);

  // 状态区：三行键 × 候选值强度条
  const barRefs = {};
  const board = kdaH('div', { class: 'kda-board' });
  KEYS.forEach((k) => {
    barRefs[k.name] = {};
    const rows = k.cands.map((c) => {
      const fill = kdaH('div', { class: 'kda-bar-fill' });
      const val = kdaH('span', { class: 'kda-cand-val', text: '0.00' });
      barRefs[k.name][c] = { fill, val };
      return kdaH('div', { class: 'kda-cand' },
        kdaH('span', { class: 'kda-cand-name', text: c }),
        kdaH('div', { class: 'kda-bar' }, fill),
        val);
    });
    board.append(kdaH('div', { class: 'kda-kv' },
      kdaH('span', { class: 'kda-kv-name', text: k.name }),
      kdaH('div', {}, rows)));
  });

  // 控制按钮
  const btnPrev = kdaH('button', { class: 'kda-btn', type: 'button', text: '上一步' });
  const btnNext = kdaH('button', { class: 'kda-btn', type: 'button', text: '下一步' });
  const btnReset = kdaH('button', { class: 'kda-btn', type: 'button', text: '重置' });
  const btnAsk = kdaH('button', { class: 'kda-btn', type: 'button', text: '问模型：会议地点在哪？' });
  const ctrlRow = kdaH('div', { class: 'kda-controls' }, btnPrev, btnNext, btnReset, btnAsk);

  const answer = kdaH('div', { class: 'kda-answer kda-hidden' });
  const note = kdaH('div', {
    class: 'kda-note',
    text: '口径：Delta 规则 W ← W·(I − βkkᵀ) + β·v·kᵀ 的逐键简化演示；强度条数值为教学示意，非 K3 内部真实状态。',
  });

  function computeState() {
    const st = {};
    KEYS.forEach((k) => { st[k.name] = {}; k.cands.forEach((c) => { st[k.name][c] = 0; }); });
    for (let i = 0; i < stepCount; i++) {
      const { k, v } = STEPS[i];
      if (mode === 'naive') {
        st[k][v] = Math.min(1, st[k][v] + 1);
      } else {
        KEYS.find((x) => x.name === k).cands.forEach((c) => { st[k][c] *= (1 - beta); });
        st[k][v] = Math.min(1, st[k][v] + beta);
      }
    }
    return st;
  }

  function render() {
    const st = computeState();
    KEYS.forEach((k) => k.cands.forEach((c) => {
      const s = st[k.name][c];
      const ref = barRefs[k.name][c];
      ref.fill.style.width = `${(s * 100).toFixed(1)}%`;
      ref.val.textContent = s.toFixed(2);
      ref.fill.classList.remove('is-new');
    }));
    // 高亮最近一次写入（先擦再写，肉眼可见）
    if (stepCount > 0) {
      const last = STEPS[stepCount - 1];
      barRefs[last.k][last.v].fill.classList.add('is-new');
    }
    chips.forEach((chip, i) => {
      chip.classList.toggle('is-done', i < stepCount);
      chip.classList.toggle('is-current', i === stepCount - 1);
    });
    btnPrev.disabled = stepCount === 0;
    btnNext.disabled = stepCount === STEPS.length;
    btnNaive.classList.toggle('is-active', mode === 'naive');
    btnDelta.classList.toggle('is-active', mode === 'delta');
    betaSlider.disabled = mode === 'naive';
    betaField.style.opacity = mode === 'naive' ? '0.42' : '1';
    betaVal.textContent = `β = ${beta.toFixed(2)}`;
    answer.classList.add('kda-hidden');
  }

  btnPrev.addEventListener('click', () => { if (stepCount > 0) { stepCount -= 1; render(); } });
  btnNext.addEventListener('click', () => { if (stepCount < STEPS.length) { stepCount += 1; render(); } });
  btnReset.addEventListener('click', () => { stepCount = 0; render(); });
  btnNaive.addEventListener('click', () => { mode = 'naive'; render(); });
  btnDelta.addEventListener('click', () => { mode = 'delta'; render(); });
  betaSlider.addEventListener('input', () => { beta = Number(betaSlider.value) / 100; render(); });

  // 查询：按当前状态给出可视化回答
  btnAsk.addEventListener('click', () => {
    const st = computeState();
    const bj = st['会议地点']['北京'];
    const sh = st['会议地点']['上海'];
    answer.innerHTML = '';
    answer.append(kdaH('div', { class: 'kda-answer-title', text: '模型回答' }));
    const mkBar = (name, s, faded) => kdaH('div', { class: 'kda-cand' },
      kdaH('span', { class: 'kda-cand-name', text: name }),
      kdaH('div', { class: 'kda-bar' },
        kdaH('div', { class: `kda-bar-fill${faded ? ' is-faded' : ''}`, style: `width:${(s * 100).toFixed(1)}%` })),
      kdaH('span', { class: 'kda-cand-val', text: s.toFixed(2) }));

    if (stepCount === 0 || Math.max(bj, sh) < 0.05) {
      answer.append(kdaH('div', {
        class: 'kda-answer-verdict is-mixed',
        text: '还没有写入任何相关记忆，模型只能回答「不知道」。（β = 0 时新值写不进去，也会出现这种情况）',
      }));
    } else if (Math.abs(bj - sh) < 0.3) {
      answer.append(mkBar('北京', bj, true), mkBar('上海', sh, true));
      answer.append(kdaH('div', {
        class: 'kda-answer-verdict is-mixed',
        text: '答案混杂：北京与上海的强度几乎相同，模型只能含糊其辞。',
      }));
    } else {
      const winner = bj > sh ? '北京' : '上海';
      const s = Math.max(bj, sh);
      answer.append(mkBar(winner, s, false));
      answer.append(kdaH('div', {
        class: 'kda-answer-verdict is-clean',
        text: `√ 答案干净：会议地点 = ${winner}（旧值已精确衰减）。`,
      }));
    }
    answer.classList.remove('kda-hidden');
  });

  frame.append(modeRow, betaField, stepsRow, board, ctrlRow, answer, note);
  root.append(frame);
  render();
}

/* ==========================================================================
   演示 3 · 逐通道门控调音台（data-demo="channels"）
   总闸（Gated DeltaNet）：一个推子控制全部 8 条通道，顾此失彼；
   逐通道（KDA）：每条独立推子，长期事实与噪声遗忘兼得。
   ========================================================================== */

function buildChannels(root) {
  const N = 8;
  const TOTAL_STEPS = 15;
  // 固定噪声日程（确定性，便于讲述同一个故事）
  const SCHEDULE = [
    { t: 'noise', ch: [2, 5] },
    { t: 'fact' },
    { t: 'noise', ch: [3, 7] },
    { t: 'noise', ch: [4] },
    { t: 'noise', ch: [2, 6] },
    { t: 'noise', ch: [5, 8] },
    { t: 'noise', ch: [3] },
    { t: 'noise', ch: [4, 7] },
    { t: 'noise', ch: [6] },
    { t: 'noise', ch: [2, 8] },
    { t: 'noise', ch: [5] },
    { t: 'noise', ch: [3, 6] },
    { t: 'silent' },
    { t: 'silent' },
    { t: 'silent' },
  ];
  const PER_DEFAULT = [4, 85, 90, 80, 88, 95, 85, 90]; // 0=慢 100=快；通道 1 最慢
  const rho = (v01) => 0.985 - 0.265 * v01; // 每步保持度

  let mode = 'master'; // 'master' | 'per'
  let masterV = 75; // 默认偏快：先展示「长期事实丢失」
  const perV = PER_DEFAULT.slice();
  let mem = new Array(N).fill(0);
  let step = 0;
  let factWritten = false;
  let timer = null;

  const frame = kdaH('div', { class: 'kda-demo-frame' });

  // 模式切换
  const btnMaster = kdaH('button', { class: 'kda-btn', type: 'button', text: '总闸（Gated DeltaNet）' });
  const btnPer = kdaH('button', { class: 'kda-btn', type: 'button', text: '逐通道（KDA）' });
  const modeRow = kdaH('div', { class: 'kda-controls' }, btnMaster, btnPer);

  // 总闸推子
  const masterSlider = kdaH('input', {
    class: 'kda-slider', type: 'range',
    min: '0', max: '100', step: '1', value: String(masterV),
    'aria-label': '统一保鲜期',
  });
  const masterRow = kdaH('div', { class: 'kda-master' },
    kdaH('span', { class: 'kda-ends', text: '慢' }), masterSlider, kdaH('span', { class: 'kda-ends', text: '快' }));

  // 8 条通道
  const chRefs = [];
  const boardEl = kdaH('div', { class: 'kda-board' });
  for (let i = 0; i < N; i += 1) {
    const fill = kdaH('div', { class: 'kda-bar-fill kda-noise-fill' });
    const fader = kdaH('input', {
      class: 'kda-slider kda-ch-fader', type: 'range',
      min: '0', max: '100', step: '1', value: String(perV[i]),
      'aria-label': `通道 ${i + 1} 保鲜期`,
    });
    const tag = kdaH('span', { class: 'kda-ch-tag kda-hidden', text: '长期事实丢失' });
    const name = kdaH('span', { class: 'kda-ch-name', text: `通道 ${i + 1}` }, tag);
    fader.addEventListener('input', () => { perV[i] = Number(fader.value); });
    const row = kdaH('div', { class: 'kda-ch' }, name, kdaH('div', { class: 'kda-bar' }, fill), fader);
    boardEl.append(row);
    chRefs.push({ fill, fader, tag, name, row });
  }
  const factChip = kdaH('span', { class: 'kda-fact-chip kda-hidden', text: '北极星' });
  chRefs[0].name.append(factChip);

  // 播放控制（prefers-reduced-motion 时降级为手动步进）
  const btnPlay = kdaH('button', { class: 'kda-btn', type: 'button' });
  const btnReset = kdaH('button', { class: 'kda-btn', type: 'button', text: '重置' });
  const ctrlRow = kdaH('div', { class: 'kda-controls' }, btnPlay, btnReset);

  const narr = kdaH('div', { class: 'kda-narr', text: '准备就绪：点击播放，观察 15 步 token 流（第 2 步写入长期事实，最后 3 步为静默期）。' });
  const status = kdaH('div', { class: 'kda-status' });
  const note = kdaH('div', {
    class: 'kda-note',
    text: '口径：通道数与保持度数值为教学简化，非 K3 实际配置；机制参考 Kimi Linear（KDA 逐通道标量门控）与 Gated DeltaNet（统一门控）。',
  });

  function rhoOf(i) {
    return mode === 'master' ? rho(masterV / 100) : rho(perV[i] / 100);
  }

  function countNoise(pred) {
    let n = 0;
    for (let i = 1; i < N; i += 1) if (pred(mem[i])) n += 1;
    return n;
  }

  function maxNoise() {
    let m = 0;
    for (let i = 1; i < N; i += 1) m = Math.max(m, mem[i]);
    return m;
  }

  function applyStep(idx) {
    for (let i = 0; i < N; i += 1) mem[i] *= rhoOf(i);
    const s = SCHEDULE[idx];
    if (s.t === 'fact') {
      mem[0] = 1;
      factWritten = true;
      return '长期事实写入：项目代号 = 北极星 → 通道 1';
    }
    if (s.t === 'noise') {
      s.ch.forEach((c) => { mem[c - 1] = 0.85; });
      return `闲聊噪声 → 通道 ${s.ch.join('、')}`;
    }
    return '静默期：没有新输入，各通道按自身保鲜期衰减';
  }

  function renderBoard() {
    for (let i = 0; i < N; i += 1) {
      chRefs[i].fill.style.width = `${(mem[i] * 100).toFixed(1)}%`;
      const factAlive = i === 0 && factWritten && mem[0] > 0.12;
      chRefs[i].fill.classList.toggle('kda-fact-fill', factAlive);
      chRefs[i].fill.classList.toggle('kda-noise-fill', !factAlive);
      chRefs[i].tag.classList.toggle('kda-hidden', !(i === 0 && factWritten && mem[0] <= 0.12));
      chRefs[i].fader.classList.toggle('kda-hidden', mode === 'master');
    }
    masterRow.classList.toggle('kda-hidden', mode === 'per');
    factChip.classList.toggle('kda-hidden', !(factWritten && mem[0] > 0.12));
    btnMaster.classList.toggle('is-active', mode === 'master');
    btnPer.classList.toggle('is-active', mode === 'per');

    status.innerHTML = '';
    if (factWritten && mem[0] <= 0.12) {
      status.append(kdaH('span', { class: 'warn', text: '状态：长期事实丢失 —— 衰减太快，事实和噪声一起被遗忘。' }));
    } else if (factWritten && mode === 'master' && countNoise((m) => m > 0.6) >= 5) {
      status.append(kdaH('span', { class: 'warn', text: '状态：噪声堆积 —— 衰减太慢，噪声通道全被占满。' }));
    } else if (factWritten && mode === 'per' && step === TOTAL_STEPS && mem[0] > 0.5 && maxNoise() < 0.45) {
      status.append(kdaH('span', { class: 'win', text: '状态：兼得 —— 北极星一直在，噪声随聊随忘。' }));
    } else if (factWritten) {
      status.append(kdaH('span', { text: '状态：进行中 —— 继续观察各通道的保持度变化。' }));
    }
  }

  function doStep() {
    if (step >= TOTAL_STEPS) return false;
    const text = applyStep(step);
    step += 1;
    narr.textContent = `第 ${step}/${TOTAL_STEPS} 步 · ${text}`;
    renderBoard();
    return step < TOTAL_STEPS;
  }

  function stopTimer() {
    if (timer) { clearInterval(timer); timer = null; }
    if (KDA_REDUCED) btnPlay.textContent = '步进 token';
    else btnPlay.textContent = step >= TOTAL_STEPS ? '重新播放' : '播放 token 流';
  }

  function resetAll() {
    mem = new Array(N).fill(0);
    step = 0;
    factWritten = false;
    stopTimer();
    narr.textContent = '准备就绪：点击播放，观察 15 步 token 流（第 2 步写入长期事实，最后 3 步为静默期）。';
    renderBoard();
  }

  btnPlay.addEventListener('click', () => {
    if (KDA_REDUCED) {
      if (step >= TOTAL_STEPS) resetAll();
      doStep();
      return;
    }
    if (timer) { stopTimer(); return; }
    if (step >= TOTAL_STEPS) resetAll();
    doStep();
    timer = setInterval(() => { if (!doStep()) stopTimer(); }, 650);
    btnPlay.textContent = '暂停';
  });
  btnReset.addEventListener('click', resetAll);
  masterSlider.addEventListener('input', () => { masterV = Number(masterSlider.value); });
  btnMaster.addEventListener('click', () => { if (mode !== 'master') { mode = 'master'; resetAll(); } });
  btnPer.addEventListener('click', () => { if (mode !== 'per') { mode = 'per'; resetAll(); } });

  btnPlay.textContent = KDA_REDUCED ? '步进 token' : '播放 token 流';

  frame.append(modeRow, masterRow, boardEl, ctrlRow, narr, status, note);
  root.append(frame);
  renderBoard();
}

/* ==========================================================================
   演示 4 · Agent 账单计算器（data-demo="bill"）
   官方刊例：输入命中 2 元 / 未命中 20 元 / 输出 100 元（每百万 token）。
   ========================================================================== */

function buildBill(root) {
  const IN_STOPS = [1, 2, 5, 10, 20, 50, 100]; // 万 token
  const IN_LABELS = ['1万', '2万', '5万', '10万', '20万', '50万', '100万'];
  const OUT_STOPS = [0.1, 0.2, 0.5, 1, 2, 5, 13.1]; // 万 token
  const OUT_LABELS = ['1千', '2千', '5千', '1万', '2万', '5万', '13.1万'];
  const PRICE_HIT = 2, PRICE_MISS = 20, PRICE_OUT = 100; // 元 / 百万 token

  const frame = kdaH('div', { class: 'kda-demo-frame' });

  function makeField(labelText, max, defVal, ariaLabel) {
    const val = kdaH('span', { class: 'kda-field-val' });
    const head = kdaH('div', { class: 'kda-field-head' }, kdaH('span', { text: labelText }), val);
    const slider = kdaH('input', {
      class: 'kda-slider', type: 'range',
      min: '0', max: String(max), step: '1', value: String(defVal),
      'aria-label': ariaLabel,
    });
    return { val, slider, el: kdaH('div', { class: 'kda-field' }, head, slider) };
  }

  const fIn = makeField('输入 token 量（每次会话累计）', IN_STOPS.length - 1, 3, '输入 token 量');
  fIn.el.append(kdaH('div', { class: 'kda-ticks' }, IN_LABELS.map((l) => kdaH('span', { text: l }))));

  const fHit = makeField('缓存命中率', 100, 90, '缓存命中率');

  const fOut = makeField('输出 token（K3 默认 max_completion_tokens 上限 131,072）', OUT_STOPS.length - 1, 3, '输出 token 量');
  fOut.el.append(kdaH('div', { class: 'kda-ticks' }, OUT_LABELS.map((l) => kdaH('span', { text: l }))));

  const bigLabel = kdaH('div', { class: 'kda-big-label', text: '本次会话成本' });
  const big = kdaH('div', { class: 'kda-big', text: '¥0.00' });
  const subLine = kdaH('div', { class: 'kda-sub-line' });

  const fillA = kdaH('div', { class: 'kda-bar-fill' });
  const valA = kdaH('span', { class: 'kda-cmp-val' });
  const fillB = kdaH('div', { class: 'kda-bar-fill' });
  const valB = kdaH('span', { class: 'kda-cmp-val' });
  const cmp = kdaH('div', { class: 'kda-cmp' },
    kdaH('div', { class: 'kda-cmp-row kda-cmp-actual' },
      kdaH('span', { class: 'kda-cmp-name', text: '实际' }),
      kdaH('div', { class: 'kda-bar' }, fillA), valA),
    kdaH('div', { class: 'kda-cmp-row kda-cmp-nocache' },
      kdaH('span', { class: 'kda-cmp-name', text: '无缓存' }),
      kdaH('div', { class: 'kda-bar' }, fillB), valB));

  const note = kdaH('div', {
    class: 'kda-note',
    text: '口径：价格为 Kimi K3 官方刊例（2026-07-17）—— 输入命中 2 元 / 未命中 20 元 / 输出 100 元（每百万 token）；缓存命中依赖 Mooncake 架构，官方称编程负载命中率 >90%。',
  });

  const fmt = (v) => `¥${v.toFixed(2)}`;

  function update() {
    const inTok = IN_STOPS[Number(fIn.slider.value)] * 1e4;
    const hit = Number(fHit.slider.value) / 100;
    const outTok = OUT_STOPS[Number(fOut.slider.value)] * 1e4;
    const cost = (inTok * (hit * PRICE_HIT + (1 - hit) * PRICE_MISS)) / 1e6
      + (outTok * PRICE_OUT) / 1e6;
    const noCache = (inTok * PRICE_MISS) / 1e6 + (outTok * PRICE_OUT) / 1e6;
    const save = noCache > 0 ? (1 - cost / noCache) * 100 : 0;

    fIn.val.textContent = IN_LABELS[Number(fIn.slider.value)];
    fHit.val.textContent = `${Math.round(hit * 100)}%`;
    fOut.val.textContent = OUT_LABELS[Number(fOut.slider.value)];
    big.textContent = fmt(cost);
    subLine.innerHTML = '';
    subLine.append(
      document.createTextNode(`假如没有缓存：${fmt(noCache)} · `),
      kdaH('span', { class: 'kda-save', text: `节省 ${save.toFixed(1)}%` }));
    const max = Math.max(cost, noCache, 1e-9);
    fillA.style.width = `${((cost / max) * 100).toFixed(1)}%`;
    fillB.style.width = `${((noCache / max) * 100).toFixed(1)}%`;
    valA.textContent = fmt(cost);
    valB.textContent = fmt(noCache);
  }
  [fIn, fHit, fOut].forEach((f) => f.slider.addEventListener('input', update));

  frame.append(
    fIn.el, fHit.el, fOut.el,
    kdaH('div', { class: 'kda-bill-result' }, bigLabel, big, subLine),
    cmp, note);
  root.append(frame);
  update();
}

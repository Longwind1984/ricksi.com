/* ==========================================================================
   Kimi K3 · KDA 机制/架构演示（第二批）—— 零依赖 vanilla JS + inline SVG
   挂载点：<div class="kda-demo" data-demo="gatemx|stack|prefix">
   防 ClientRouter 重复初始化：dataset.kdaInit 标记 + window.__kdaMechArchBound
   本文件独立成文件，与 demos.js 无共享变量，全部符号 mx/Mx 前缀。
   ========================================================================== */

/* ---------------- 工具（必须先于骨架初始化：骨架会同步调用 initKdaMechArch） ---------------- */

const KDA_MX_SVG_NS = 'http://www.w3.org/2000/svg';
const KDA_MX_REDUCED = typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function kdaMxH(tag, attrs, ...kids) {
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

function kdaMxS(tag, attrs, ...kids) {
  const el = document.createElementNS(KDA_MX_SVG_NS, tag);
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

const builders = { gatemx: buildGatemx, stack: buildStack, prefix: buildPrefix };
function initKdaMechArch() {
  document.querySelectorAll('.kda-demo[data-demo]').forEach((el) => {
    if (el.dataset.kdaArchInit === '1') return;
    const b = builders[el.dataset.demo]; if (!b) return;
    el.dataset.kdaArchInit = '1'; el.textContent = ''; b(el);
  });
}
if (document.readyState !== 'loading') initKdaMechArch();
if (!window.__kdaMechArchBound) { window.__kdaMechArchBound = true; document.addEventListener('astro:page-load', initKdaMechArch); }

/* ==========================================================================
   演示 1 · 门控粒度矩阵热图（data-demo="gatemx"）
   8×8 = 一个头的记忆状态 S；第 2 行已写入长期事实。
   头级单闸：全矩阵同一个衰减率，顾此失彼；
   逐通道门控：每行独立衰减率，该留的留、该忘的忘。
   ========================================================================== */

function buildGatemx(root) {
  const N = 8, FACT = 1, STEPS = 10;
  const RHO_MIN = 0.62, RHO_MAX = 0.95; // 单闸：快忘 → 慢忘
  const RHO_FACT = 0.995, RHO_OTHER = 0.55; // 逐通道：事实行慢、其余行快
  const VB_W = 720, VB_H = 480, MX = 56, MY = 40, CS = 44, GAP = 5;
  const MW = N * CS + (N - 1) * GAP; // 387
  const BAR_X = 512, BAR_W = 96, TXT_X = 616;
  const NOISE_TEXTS = [
    '噪声 token 冲刷：闲聊、格式符、临时变量',
    '噪声 token 冲刷：寒暄、语气词、重复确认',
    '噪声 token 冲刷：中间推理的草稿痕迹',
    '噪声 token 冲刷：工具返回的冗长日志',
  ];
  const FACT_VALS = [0.95, 0.9, 0.85, 0.92, 0.88, 0.94, 0.86, 0.9];

  let mode = 'single'; // 'single' | 'per'
  let sliderV = 80;
  let mem = [];
  let step = 0;
  let timer = null;
  let noiseBag = [];
  let lcgState = 987654321;

  const frame = kdaMxH('div', { class: 'kda-demo-frame' });

  const legend = kdaMxH('div', { class: 'kda-legend' },
    kdaMxH('span', { class: 'kda-legend-item' },
      kdaMxH('i', { class: 'kda-swatch kda-swatch-fact' }), '关键事实行'),
    kdaMxH('span', { class: 'kda-legend-item' },
      kdaMxH('i', { class: 'kda-swatch kda-swatch-noise' }), '噪声'),
    kdaMxH('span', { class: 'kda-legend-item' }, '格子亮度 = 记忆强度'));

  const svg = kdaMxS('svg', {
    class: 'kda-mx-svg', viewBox: `0 0 ${VB_W} ${VB_H}`,
    role: 'img', 'aria-label': '门控粒度矩阵：同一个记忆矩阵，单一旋钮与逐行旋钮的冲刷对比',
  });

  const cells = [];
  for (let r = 0; r < N; r += 1) {
    for (let c = 0; c < N; c += 1) {
      const rect = kdaMxS('rect', {
        class: `kda-mx-cell${r === FACT ? ' is-fact' : ''}`,
        x: MX + c * (CS + GAP), y: MY + r * (CS + GAP),
        width: CS, height: CS, rx: 7,
        opacity: '0.08',
      });
      svg.append(rect);
      cells.push(rect);
    }
  }

  const factBorder = kdaMxS('rect', {
    class: 'kda-mx-factborder',
    x: MX - 5, y: MY + FACT * (CS + GAP) - 5,
    width: MW + 10, height: CS + 10, rx: 10,
  });
  svg.append(factBorder);

  const factChip = kdaMxS('text', {
    class: 'kda-mx-lbl kda-gold-text', x: MX + MW + 8,
    y: MY + FACT * (CS + GAP) + CS / 2 + 3,
  });
  factChip.textContent = '关键事实';
  svg.append(factChip);

  const rhoBars = [], rhoLabels = [];
  for (let r = 0; r < N; r += 1) {
    const yMid = MY + r * (CS + GAP) + CS / 2;
    const lblRow = kdaMxS('text', {
      class: 'kda-mx-lbl', x: MX - 10, y: yMid + 3, 'text-anchor': 'end',
    });
    lblRow.textContent = `行 ${r + 1}`;
    svg.append(lblRow);
    svg.append(kdaMxS('rect', {
      class: 'kda-mx-rho-track', x: BAR_X, y: yMid - 3, width: BAR_W, height: 6, rx: 3,
    }));
    const bar = kdaMxS('rect', {
      class: 'kda-mx-rho-bar', x: BAR_X, y: yMid - 3, width: 0, height: 6, rx: 3,
    });
    svg.append(bar);
    rhoBars.push(bar);
    const lbl = kdaMxS('text', { class: 'kda-mx-lbl', x: TXT_X, y: yMid + 3 });
    svg.append(lbl);
    rhoLabels.push(lbl);
  }

  const barTitle = kdaMxS('text', { class: 'kda-mx-lbl', x: BAR_X, y: MY - 12 });
  barTitle.textContent = '每步保持率';
  svg.append(barTitle);

  const capSingle = kdaMxS('text', {
    class: 'kda-mx-lbl kda-mx-lbl-big', x: MX, y: VB_H - 20,
  });
  const capPer = kdaMxS('text', {
    class: 'kda-mx-lbl kda-mx-lbl-big kda-hidden', x: MX, y: VB_H - 20,
  });
  capPer.textContent = '逐通道门控：第 2 行 0.99 慢忘，其余行 0.55 快忘';
  svg.append(capSingle, capPer);

  const btnSingle = kdaMxH('button', { class: 'kda-btn', type: 'button', text: '头级单闸（Gated DeltaNet）' });
  const btnPer = kdaMxH('button', { class: 'kda-btn', type: 'button', text: '逐通道门控（KDA）' });
  const modeRow = kdaMxH('div', { class: 'kda-controls' }, btnSingle, btnPer);

  const sliderVal = kdaMxH('span', { class: 'kda-field-val' });
  const sliderHead = kdaMxH('div', { class: 'kda-field-head' },
    kdaMxH('span', { text: '统一衰减速度（整个头只有一个旋钮）' }), sliderVal);
  const slider = kdaMxH('input', {
    class: 'kda-slider', type: 'range',
    min: '0', max: '100', step: '1', value: String(sliderV),
    'aria-label': '统一衰减速度',
  });
  const ticks = kdaMxH('div', { class: 'kda-ticks' },
    kdaMxH('span', { text: '快忘' }), kdaMxH('span', { text: '慢忘' }));
  const sliderField = kdaMxH('div', { class: 'kda-field' }, sliderHead, slider, ticks);

  const btnPlay = kdaMxH('button', { class: 'kda-btn', type: 'button' });
  const btnReset = kdaMxH('button', { class: 'kda-btn', type: 'button', text: '重置' });
  const ctrlRow = kdaMxH('div', { class: 'kda-controls' }, btnPlay, btnReset);

  const narr = kdaMxH('div', { class: 'kda-narr' });
  const status = kdaMxH('div', { class: 'kda-status' });
  const note = kdaMxH('div', {
    class: 'kda-note',
    text: '口径：矩阵规模、保持率与噪声强度均为机制示意，非 K3 实际数值；机制对应 Gated DeltaNet（每头单一遗忘门）与 KDA（β 为逐通道向量）。',
  });

  function lcg() {
    lcgState = (lcgState * 1103515245 + 12345) % 2147483648;
    return lcgState / 2147483648;
  }

  function rhoOf(r) {
    if (mode === 'single') return RHO_MIN + (RHO_MAX - RHO_MIN) * (sliderV / 100);
    return r === FACT ? RHO_FACT : RHO_OTHER;
  }

  function refillBag() {
    noiseBag = [];
    for (let i = 0; i < N * N; i += 1) {
      if (Math.floor(i / N) !== FACT) noiseBag.push(i);
    }
    for (let i = noiseBag.length - 1; i > 0; i -= 1) {
      const j = Math.floor(lcg() * (i + 1));
      const t = noiseBag[i]; noiseBag[i] = noiseBag[j]; noiseBag[j] = t;
    }
  }

  function drawNoise() {
    if (noiseBag.length < 4) refillBag();
    return noiseBag.splice(0, 4);
  }

  function factAvg() {
    let s = 0;
    for (let c = 0; c < N; c += 1) s += mem[FACT][c];
    return s / N;
  }

  function noiseRatio() {
    let hi = 0, tot = 0;
    for (let r = 0; r < N; r += 1) {
      if (r === FACT) continue;
      for (let c = 0; c < N; c += 1) { tot += 1; if (mem[r][c] > 0.5) hi += 1; }
    }
    return hi / tot;
  }

  function render() {
    for (let r = 0; r < N; r += 1) {
      for (let c = 0; c < N; c += 1) {
        cells[r * N + c].setAttribute('opacity', (0.08 + 0.92 * mem[r][c]).toFixed(3));
      }
    }
    const fa = factAvg();
    factBorder.classList.toggle('is-alive', fa > 0.15);
    factBorder.classList.toggle('is-fading', fa <= 0.15);
    factChip.setAttribute('opacity', fa > 0.15 ? '1' : '0.35');
    btnSingle.classList.toggle('is-active', mode === 'single');
    btnPer.classList.toggle('is-active', mode === 'per');
    sliderField.classList.toggle('kda-hidden', mode === 'per');
    capSingle.classList.toggle('kda-hidden', mode !== 'single');
    capPer.classList.toggle('kda-hidden', mode !== 'per');
    for (let r = 0; r < N; r += 1) {
      const rho = rhoOf(r);
      const t = (rho - RHO_OTHER) / (RHO_FACT - RHO_OTHER); // 0..1
      rhoBars[r].setAttribute('width', (BAR_W * Math.max(0, Math.min(1, t))).toFixed(1));
      rhoBars[r].classList.toggle('is-fact', r === FACT);
      rhoLabels[r].textContent = mode === 'single'
        ? `ρ ${rho.toFixed(2)}`
        : `ρ ${rho.toFixed(2)}${r === FACT ? ' 慢' : ''}`;
    }
    if (mode === 'single') {
      const rho = rhoOf(0);
      capSingle.textContent = `单闸：全矩阵 64 格共用同一个保持率 ρ = ${rho.toFixed(2)}`;
      sliderVal.textContent = `ρ = ${rho.toFixed(2)}`;
    }
    status.innerHTML = '';
    if (step >= STEPS) {
      if (fa < 0.15) {
        status.append(kdaMxH('span', {
          class: 'warn',
          text: `结局：事实丢失 —— 统一衰减太快（ρ = ${rhoOf(0).toFixed(2)}），关键事实和噪声一起被冲掉。`,
        }));
      } else if (mode === 'single' && noiseRatio() > 0.35) {
        status.append(kdaMxH('span', {
          class: 'warn',
          text: `结局：噪声占满 —— 统一衰减太慢（ρ = ${rhoOf(0).toFixed(2)}），矩阵被噪声塞满，信噪比崩塌。`,
        }));
      } else if (mode === 'per') {
        status.append(kdaMxH('span', {
          class: 'win',
          text: '结局：该留的留，该忘的忘 —— 关键事实行几乎无损，噪声行全部归零。',
        }));
      } else {
        status.append(kdaMxH('span', {
          text: `中间态：ρ = ${rhoOf(0).toFixed(2)} 时事实与噪声同生同灭，拖滑杆试试两个极端。`,
        }));
      }
    }
  }

  function narrText() {
    return `第 ${step}/${STEPS} 步 · ${NOISE_TEXTS[(step - 1) % NOISE_TEXTS.length]}`;
  }

  function doStep() {
    if (step >= STEPS) return false;
    for (let r = 0; r < N; r += 1) {
      const rho = rhoOf(r);
      for (let c = 0; c < N; c += 1) mem[r][c] *= rho;
    }
    drawNoise().forEach((idx) => {
      const r = Math.floor(idx / N), c = idx % N;
      mem[r][c] = Math.min(1, mem[r][c] + 0.75 + lcg() * 0.2);
    });
    step += 1;
    narr.textContent = narrText();
    render();
    return step < STEPS;
  }

  function stopTimer() {
    if (timer) { clearInterval(timer); timer = null; }
    btnPlay.textContent = KDA_MX_REDUCED ? '手动步进' : '冲刷 10 步';
  }

  function resetAll() {
    stopTimer();
    mem = Array.from({ length: N }, (_, r) => (
      r === FACT ? FACT_VALS.slice() : new Array(N).fill(0.02)
    ));
    step = 0;
    noiseBag = [];
    lcgState = 987654321;
    narr.textContent = '记忆矩阵：一个头的状态 S（8×8），第 2 行刚写入一条长期事实。点「冲刷」，让 10 步噪声 token 流过。';
    render();
  }

  btnPlay.addEventListener('click', () => {
    if (KDA_MX_REDUCED) {
      if (step >= STEPS) resetAll();
      doStep();
      return;
    }
    if (timer) { stopTimer(); return; }
    if (step >= STEPS) resetAll();
    doStep();
    timer = setInterval(() => { if (!doStep()) stopTimer(); }, 500);
    btnPlay.textContent = '暂停';
  });
  btnReset.addEventListener('click', resetAll);
  slider.addEventListener('input', () => { sliderV = Number(slider.value); render(); });
  btnSingle.addEventListener('click', () => { if (mode !== 'single') { mode = 'single'; resetAll(); } });
  btnPer.addEventListener('click', () => { if (mode !== 'per') { mode = 'per'; resetAll(); } });

  frame.append(legend, svg, modeRow, sliderField, ctrlRow, narr, status, note);
  root.append(frame);
  resetAll();
}

/* ==========================================================================
   演示 2 · 3:1 混合架构层叠探索（data-demo="stack"）
   12 层 = (KDA,KDA,KDA,MLA) × 3；KDA 每层成本 +1，MLA 每层成本 +8。
   混合 33 vs 12 层全 MLA 96（≈ 1/3）。
   ========================================================================== */

function buildStack(root) {
  const TYPES = ['kda', 'kda', 'kda', 'mla', 'kda', 'kda', 'kda', 'mla', 'kda', 'kda', 'kda', 'mla'];
  const COST = { kda: 1, mla: 8 };
  const TOTAL_HYB = 33, TOTAL_MLA = 96;
  const VB_W = 240, VB_H = 496, LX = 34, LW = 172, LH = 30, LG = 8, TOP = 10;
  const DESCS = {
    kda: '以恒定成本消化长上下文：逐通道门控的记忆状态，边读边忘，成本不随上下文变长而上涨。在 3:1 的配比里，它是便宜的主力。',
    mla: '全注意力，保住逐字精确回忆。每层都要回看全部历史，是配比里最贵的成分——只用 1/4 的层数，托住精确性。',
  };
  const layerY = (i) => TOP + (11 - i) * (LH + LG);
  const layerMid = (i) => layerY(i) + LH / 2;

  let cost = 0;
  let kCost = 0, mCost = 0;
  let idx = 0;
  let playing = false;
  let cancelled = false;
  let sel = -1;
  const timers = [];

  const frame = kdaMxH('div', { class: 'kda-demo-frame' });

  const legend = kdaMxH('div', { class: 'kda-legend' },
    kdaMxH('span', { class: 'kda-legend-item' },
      kdaMxH('i', { class: 'kda-swatch kda-swatch-kda' }), 'KDA 层 ×9 · 每个 token 成本 +1'),
    kdaMxH('span', { class: 'kda-legend-item' },
      kdaMxH('i', { class: 'kda-swatch kda-swatch-mla' }), 'MLA 全注意力层 ×3 · 成本 +8'));

  const svg = kdaMxS('svg', {
    class: 'kda-stack-svg', viewBox: `0 0 ${VB_W} ${VB_H}`,
    role: 'img', 'aria-label': '3 比 1 混合架构：9 层 KDA 与 3 层 MLA 的层叠与逐层成本',
  });

  const groups = [];
  TYPES.forEach((t, i) => {
    const g = kdaMxS('g', {
      class: `kda-stack-layer${t === 'mla' ? ' is-mla' : ''}`,
      tabindex: '0', role: 'button',
      'aria-label': `第 ${i + 1} 层 ${t === 'mla' ? 'MLA 全注意力' : 'KDA'}`,
    });
    g.append(kdaMxS('rect', { x: LX, y: layerY(i), width: LW, height: LH, rx: 8 }));
    const txt = kdaMxS('text', {
      x: LX + LW / 2, y: layerMid(i) + 3.5, 'text-anchor': 'middle',
    });
    txt.textContent = `L${i + 1} · ${t === 'mla' ? 'MLA 全注意力' : 'KDA'}`;
    g.append(txt);
    svg.append(g);
    groups.push(g);
  });

  const entry = kdaMxS('text', {
    class: 'kda-stack-lbl', x: LX + LW / 2, y: VB_H - 10, 'text-anchor': 'middle',
  });
  entry.textContent = '↑ token 入口';
  svg.append(entry);

  const dot = kdaMxS('circle', {
    class: 'kda-stack-dot', r: 6, cx: LX + LW / 2, cy: VB_H - 30, opacity: '0',
  });
  svg.append(dot);

  const valK = kdaMxH('span', { class: 'kda-stack-cval', text: '0' });
  const valM = kdaMxH('span', { class: 'kda-stack-cval', text: '0' });
  const valT = kdaMxH('span', { class: 'kda-stack-cval is-total', text: '0' });
  const costPanel = kdaMxH('div', {},
    kdaMxH('div', { class: 'kda-px-title', text: '逐层成本累计（相对值）' }),
    kdaMxH('div', { class: 'kda-stack-costrows' },
      kdaMxH('span', { class: 'kda-stack-cname', text: 'KDA 层 ×9' }), valK,
      kdaMxH('span', { class: 'kda-stack-cname', text: 'MLA 层 ×3' }), valM,
      kdaMxH('span', { class: 'kda-stack-cname is-total', text: '合计' }), valT));

  const card = kdaMxH('div', { class: 'kda-stack-card' },
    kdaMxH('div', { class: 'kda-stack-card-hint', text: '点击左侧任意层，查看它在 3:1 配比里的角色。' }));

  const fillA = kdaMxH('div', { class: 'kda-bar-fill' });
  const fillB = kdaMxH('div', { class: 'kda-bar-fill' });
  const cmp = kdaMxH('div', { class: 'kda-cmp kda-hidden' },
    kdaMxH('div', { class: 'kda-px-title', text: '跑完一个 token 的总账' }),
    kdaMxH('div', { class: 'kda-cmp-row kda-cmp-actual' },
      kdaMxH('span', { class: 'kda-cmp-name', text: '3:1 混合' }),
      kdaMxH('div', { class: 'kda-bar' }, fillA),
      kdaMxH('span', { class: 'kda-cmp-val', text: '33' })),
    kdaMxH('div', { class: 'kda-cmp-row kda-cmp-nocache' },
      kdaMxH('span', { class: 'kda-cmp-name', text: '12 层全 MLA' }),
      kdaMxH('div', { class: 'kda-bar' }, fillB),
      kdaMxH('span', { class: 'kda-cmp-val', text: '96' })),
    kdaMxH('div', { class: 'kda-sub-line' },
      kdaMxH('span', { class: 'kda-save', text: '≈ 1/3 的成本 —— 贵的层只占 1/4，总成本大头被削掉。' })));

  const rightCol = kdaMxH('div', {}, costPanel, card, cmp);
  const grid = kdaMxH('div', { class: 'kda-stack-grid' }, svg, rightCol);

  const btnPlay = kdaMxH('button', { class: 'kda-btn', type: 'button' });
  const btnReset = kdaMxH('button', { class: 'kda-btn', type: 'button', text: '重置' });
  const ctrlRow = kdaMxH('div', { class: 'kda-controls' }, btnPlay, btnReset);

  const narr = kdaMxH('div', { class: 'kda-narr' });
  const note = kdaMxH('div', {
    class: 'kda-note',
    text: '口径：成本为相对量级示意；3:1（每 3 层 KDA 配 1 层全注意力 MLA）配比率来自 Kimi Linear 官方开源仓。',
  });

  function later(fn, ms) {
    const id = setTimeout(() => {
      const p = timers.indexOf(id);
      if (p >= 0) timers.splice(p, 1);
      fn();
    }, KDA_MX_REDUCED ? 0 : ms);
    timers.push(id);
  }

  function selectLayer(i) {
    sel = i;
    groups.forEach((g, j) => g.classList.toggle('is-sel', j === sel));
    const t = TYPES[i];
    card.innerHTML = '';
    card.append(
      kdaMxH('div', { class: 'kda-stack-card-title' },
        `L${i + 1} · ${t === 'mla' ? 'MLA 全注意力层' : 'KDA 层'}`,
        kdaMxH('span', { class: `kda-stack-badge is-${t}`, text: t === 'mla' ? 'MLA' : 'KDA' }),
        kdaMxH('span', { class: 'kda-stack-badge', text: `成本 +${COST[t]} / token` })),
      kdaMxH('div', { class: 'kda-stack-card-body', text: DESCS[t] }));
  }

  groups.forEach((g, i) => {
    g.addEventListener('click', () => selectLayer(i));
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectLayer(i); }
    });
  });

  function setCost(k, m) {
    valK.textContent = String(k);
    valM.textContent = String(m);
    valT.textContent = String(k + m);
  }

  function narrReady() {
    narr.textContent = '点击「跑一个 token」：小点从 L1 流到 L12，KDA 层快速掠过（+1），MLA 层明显停顿（+8）。';
  }

  function updatePlayBtn() {
    if (KDA_MX_REDUCED) btnPlay.textContent = '推进一层';
    else btnPlay.textContent = playing ? '暂停' : (idx >= 12 ? '再跑一次' : '跑一个 token');
  }

  function finish() {
    playing = false;
    cmp.classList.remove('kda-hidden');
    fillA.style.width = `${((TOTAL_HYB / TOTAL_MLA) * 100).toFixed(1)}%`;
    fillB.style.width = '100%';
    narr.textContent = '跑完：3:1 混合总成本 33；如果 12 层全用 MLA 要 96 —— 约为三分之一。';
    updatePlayBtn();
  }

  function doLayer(done) {
    if (idx >= 12) { finish(); if (done) done(); return; }
    const i = idx;
    const t = TYPES[i];
    const move = KDA_MX_REDUCED ? 0 : (t === 'mla' ? 650 : 170);
    const pause = KDA_MX_REDUCED ? 0 : (t === 'mla' ? 750 : 90);
    dot.setAttribute('opacity', '1');
    dot.style.transition = `cy ${move}ms var(--kda-ease, ease)`;
    dot.setAttribute('cy', layerMid(i));
    groups[i].classList.add('is-active');
    cost += COST[t];
    if (t === 'kda') kCost += COST.kda; else mCost += COST.mla;
    setCost(kCost, mCost);
    later(() => {
      groups[i].classList.remove('is-active');
      narr.textContent = `L${i + 1} · ${t === 'mla' ? 'MLA 全注意力' : 'KDA'} +${COST[t]} → 累计 ${cost}`;
      later(() => {
        idx += 1;
        doLayer(done);
      }, move);
    }, pause);
  }

  function stopAll() {
    while (timers.length) clearTimeout(timers.pop());
    playing = false;
    groups.forEach((g) => g.classList.remove('is-active'));
    updatePlayBtn();
  }

  function resetAll() {
    cancelled = true;
    stopAll();
    cancelled = false;
    idx = 0;
    cost = 0;
    kCost = 0;
    mCost = 0;
    setCost(0, 0);
    dot.setAttribute('opacity', '0');
    dot.setAttribute('cy', VB_H - 30);
    cmp.classList.add('kda-hidden');
    narrReady();
    updatePlayBtn();
  }

  btnPlay.addEventListener('click', () => {
    if (KDA_MX_REDUCED) {
      if (idx >= 12) resetAll();
      doLayer();
      return;
    }
    if (playing) { stopAll(); return; }
    if (idx >= 12) resetAll();
    playing = true;
    updatePlayBtn();
    doLayer(() => { if (!cancelled) finish(); });
  });
  btnReset.addEventListener('click', resetAll);

  frame.append(legend, grid, ctrlRow, narr, note);
  root.append(frame);
  resetAll();
}

/* ==========================================================================
   演示 3 · 前缀缓存对比（data-demo="prefix"）
   左：全注意力 KV cache 磁带 —— 前缀逐格可复用；
   右：KDA 状态矩阵 —— 被不断改写、无法按前缀切出，需要专门的 prefill cache。
   ========================================================================== */

function buildPrefix(root) {
  const PREFIX_N = 8, TOTAL_N = 11, FIRST_WRITE = 9;
  const MAT_INIT = [0.30, 0.44, 0.26, 0.52, 0.38, 0.60, 0.32, 0.46, 0.54, 0.28, 0.62, 0.36, 0.42, 0.56, 0.24, 0.48];

  let phase = 0;
  const timers = [];

  const frame = kdaMxH('div', { class: 'kda-demo-frame' });

  /* ---- 左栏：KV cache 磁带 ---- */
  const tapeCells = [];
  const svgL = kdaMxS('svg', {
    class: 'kda-tape-svg', viewBox: '0 0 352 108',
    role: 'img', 'aria-label': '全注意力 KV cache 磁带：相同前缀的格子直接复用',
  });
  const titleL = kdaMxS('text', { class: 'kda-tape-lbl kda-mx-lbl-big', x: 10, y: 14 });
  titleL.textContent = 'KV cache · 每个 token 一对 KV，逐格可复用';
  svgL.append(titleL);
  for (let i = 0; i < TOTAL_N; i += 1) {
    const r = kdaMxS('rect', {
      class: 'kda-tape-cell',
      x: 10 + i * 30, y: 28, width: 24, height: 34, rx: 5,
    });
    svgL.append(r);
    tapeCells.push(r);
  }
  const lblA = kdaMxS('text', { class: 'kda-tape-lbl', x: 10, y: 78 });
  lblA.textContent = '前 8 格 = 相同前缀（系统提示 + 历史）';
  const lblB = kdaMxS('text', { class: 'kda-tape-lbl', x: 250, y: 78 });
  lblB.textContent = '新 token';
  const anno = kdaMxS('text', {
    class: 'kda-tape-anno', x: 10, y: 96,
  });
  anno.textContent = '前 8 格直接复用，不计费；只有新尾巴算钱';
  svgL.append(lblA, lblB, anno);
  const statusL = kdaMxH('div', { class: 'kda-status' });
  const colL = kdaMxH('div', {},
    kdaMxH('div', { class: 'kda-px-title', text: '全注意力 · KV cache' }),
    svgL, statusL);

  /* ---- 右栏：KDA 状态矩阵 ---- */
  const matCells = [];
  const svgR = kdaMxS('svg', {
    class: 'kda-tape-svg', viewBox: '0 0 220 196',
    role: 'img', 'aria-label': 'KDA 状态矩阵：被不断改写，无法按前缀切出，需要 prefill cache',
  });
  const badgeG = kdaMxS('g', { class: 'kda-tape-badge' },
    kdaMxS('rect', { x: 28, y: 10, width: 168, height: 20, rx: 10 }),
    (() => {
      const t = kdaMxS('text', { x: 112, y: 23.5, 'text-anchor': 'middle' });
      t.textContent = '✓ prefill cache 命中';
      return t;
    })());
  svgR.append(badgeG);
  const matGroup = kdaMxS('g', { class: 'kda-tape-group' });
  for (let i = 0; i < 16; i += 1) {
    const r = Math.floor(i / 4), c = i % 4;
    matGroup.append(kdaMxS('rect', {
      class: 'kda-tape-cell',
      x: 26 + c * 44, y: 40 + r * 30, width: 38, height: 24, rx: 5,
      opacity: MAT_INIT[i].toFixed(2),
    }));
    matCells.push(matGroup.lastChild);
  }
  svgR.append(matGroup);
  const capM = kdaMxS('text', { class: 'kda-tape-lbl', x: 26, y: 34 });
  capM.textContent = '状态矩阵 S（4×4）· 每来一个 token 都被改写';
  svgR.append(capM);

  const overlayG = kdaMxS('g', { class: 'kda-tape-overlay' },
    kdaMxS('rect', { x: 20, y: 36, width: 184, height: 128, rx: 10 }),
    (() => {
      const t = kdaMxS('text', { x: 112, y: 92, 'text-anchor': 'middle', style: 'font-size:26px' });
      t.textContent = '？';
      return t;
    })(),
    (() => {
      const t = kdaMxS('text', { x: 112, y: 116, 'text-anchor': 'middle', style: 'font-size:9.5px' });
      t.textContent = '已被改写 · 无法按前缀切出';
      return t;
    })());
  svgR.append(overlayG);

  const solG = kdaMxS('g', { class: 'kda-tape-sol' },
    (() => {
      const t = kdaMxS('text', { class: 'kda-tape-sol-title', x: 10, y: 152 });
      t.textContent = 'prefill cache：为状态矩阵专门设计的复用层';
      return t;
    })(),
    (() => {
      const t = kdaMxS('text', { class: 'kda-tape-sol-body', x: 10, y: 166 });
      t.textContent = '把「读完前缀那一刻」的矩阵存成快照，';
      return t;
    })(),
    (() => {
      const t = kdaMxS('text', { class: 'kda-tape-sol-body', x: 10, y: 179 });
      t.textContent = '相同前缀再来时整份取出 —— 已贡献 vLLM 社区';
      return t;
    })());
  svgR.append(solG);

  const statusR = kdaMxH('div', { class: 'kda-status' });
  const colR = kdaMxH('div', {},
    kdaMxH('div', { class: 'kda-px-title', text: 'KDA · 状态矩阵' }),
    svgR, statusR);

  const grid = kdaMxH('div', { class: 'kda-mx-grid' }, colL, colR);

  const btn1 = kdaMxH('button', { class: 'kda-btn', type: 'button', text: '发送请求' });
  const btn2 = kdaMxH('button', { class: 'kda-btn', type: 'button', text: '再发一次相同开头的请求' });
  btn2.disabled = true;
  const btnReset = kdaMxH('button', { class: 'kda-btn', type: 'button', text: '重置' });
  const ctrlRow = kdaMxH('div', { class: 'kda-controls' }, btn1, btn2, btnReset);

  const narr = kdaMxH('div', {
    class: 'kda-narr',
    text: '全注意力的缓存是一 tape KV 对，前缀逐格可复用；KDA 的记忆是一块不断改写的矩阵——点「发送请求」看看差别。',
  });
  const note = kdaMxH('div', {
    class: 'kda-note',
    text: '口径：机制示意，格数与改写次数为教学简化；「KDA with prefill cache」为官方披露，实现已贡献 vLLM 社区。',
  });

  function later(fn, ms) {
    const id = setTimeout(() => {
      const p = timers.indexOf(id);
      if (p >= 0) timers.splice(p, 1);
      fn();
    }, KDA_MX_REDUCED ? 0 : ms);
    timers.push(id);
  }

  function clearTimers() {
    while (timers.length) clearTimeout(timers.pop());
  }

  function pulseMatrix() {
    // 每个格子随机时刻被点亮再落下：状态被反复改写
    matCells.forEach((cell, i) => {
      const times = 2 + (i % 3);
      for (let k = 0; k < times; k += 1) {
        later(() => { cell.setAttribute('opacity', '0.92'); }, (i * 43 + k * 200) % 900);
        later(() => { cell.setAttribute('opacity', MAT_INIT[i].toFixed(2)); }, ((i * 43 + k * 200) % 900) + 160);
      }
    });
  }

  btn1.addEventListener('click', () => {
    if (phase !== 0) return;
    phase = 1;
    btn1.disabled = true;
    narr.textContent = '第 1 次请求：左栏逐格写入 KV，右栏矩阵被反复改写。';
    for (let i = 0; i < FIRST_WRITE; i += 1) {
      later(() => { tapeCells[i].classList.add('is-written'); }, i * 110);
    }
    pulseMatrix();
    later(() => {
      statusL.innerHTML = '';
      statusL.append(kdaMxH('span', { text: '状态：写入 9 个 token 的 KV —— 全额计费。' }));
      statusR.innerHTML = '';
      statusR.append(kdaMxH('span', { text: '状态：矩阵整体被改写 —— 没有「前缀切片」这回事。' }));
      btn2.disabled = false;
    }, FIRST_WRITE * 110 + 250);
  });

  btn2.addEventListener('click', () => {
    if (phase !== 1) return;
    phase = 2;
    btn2.disabled = true;
    narr.textContent = '第 2 次请求（相同开头）：左栏前缀瞬间复用，右栏先暴露问题，再看解法。';
    // 左：前缀 8 格瞬间转为「复用」
    later(() => {
      for (let i = 0; i < PREFIX_N; i += 1) tapeCells[i].classList.add('is-cached');
      anno.classList.add('is-on');
    }, 0);
    for (let i = FIRST_WRITE; i < TOTAL_N; i += 1) {
      later(() => { tapeCells[i].classList.add('is-written'); }, 500 + (i - FIRST_WRITE) * 160);
    }
    later(() => {
      statusL.innerHTML = '';
      statusL.append(kdaMxH('span', {
        class: 'win',
        text: '状态：11 格中 8 格直接复用不计费 —— 只算 3 个新 token。',
      }));
    }, 500 + (TOTAL_N - FIRST_WRITE) * 160 + 200);
    // 右：先出问题（矩阵无法按前缀切出）
    later(() => {
      matGroup.classList.add('is-dim');
      overlayG.classList.add('is-on');
      statusR.innerHTML = '';
      statusR.append(kdaMxH('span', {
        class: 'warn',
        text: '状态：矩阵已被改写 —— 没有「前 N 格」可切，前缀复用要重新设计。',
      }));
    }, 500);
    // 随后解法淡入
    later(() => {
      overlayG.classList.remove('is-on');
      matGroup.classList.remove('is-dim');
      badgeG.classList.add('is-on');
      solG.classList.add('is-on');
      statusR.innerHTML = '';
      statusR.append(kdaMxH('span', {
        class: 'win',
        text: '状态：prefill cache 把前缀末尾的矩阵状态存成快照 —— 相同前缀整份复用。',
      }));
      narr.textContent = '左边：磁带按格复用是天然的；右边：矩阵复用是工程换来的 —— 2 元档价格由此而来。';
    }, 1900);
  });

  btnReset.addEventListener('click', () => {
    clearTimers();
    phase = 0;
    tapeCells.forEach((c) => c.classList.remove('is-written', 'is-cached'));
    anno.classList.remove('is-on');
    matCells.forEach((c, i) => c.setAttribute('opacity', MAT_INIT[i].toFixed(2)));
    matGroup.classList.remove('is-dim');
    overlayG.classList.remove('is-on');
    badgeG.classList.remove('is-on');
    solG.classList.remove('is-on');
    statusL.innerHTML = '';
    statusL.append(kdaMxH('span', { text: '状态：KV 磁带等待写入。' }));
    statusR.innerHTML = '';
    statusR.append(kdaMxH('span', { text: '状态：矩阵等待写入。' }));
    btn1.disabled = false;
    btn2.disabled = true;
    narr.textContent = '全注意力的缓存是一 tape KV 对，前缀逐格可复用；KDA 的记忆是一块不断改写的矩阵——点「发送请求」看看差别。';
  });

  frame.append(grid, ctrlRow, narr, note);
  root.append(frame);
  statusL.append(kdaMxH('span', { text: '状态：KV 磁带等待写入。' }));
  statusR.append(kdaMxH('span', { text: '状态：矩阵等待写入。' }));
}

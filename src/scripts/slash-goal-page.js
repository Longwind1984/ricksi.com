// Slash Goal 落地页交互：滚动揭示 + 数字 count-up + 三个签名交互。
// 交互1 谁来验收（两裁判演示）· 交互2 验证范式四象限（测量改变地图）· 交互3 提示词→程序层光谱。
// 无重型依赖；复用 writer-page.js 的 reveal / count-up 口径。配色语义：灰=程序层 / 青=提示词层 / 珊瑚=假·无法复刻。

let abort = null;
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (name, attrs = {}) => {
  const e = document.createElementNS(NS, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
};

/* ============ 通用：滚动揭示 + count-up ============ */
function initCommon(sig, reduced) {
  const reveals = document.querySelectorAll('.sg-reveal');
  if (reveals.length) {
    const show = (el) => el.classList.add('sg-in');
    if (reduced) reveals.forEach(show);
    else {
      try {
        const io = new IntersectionObserver((es) => {
          es.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
        }, { threshold: 0.12 });
        reveals.forEach((el) => io.observe(el));
        sig.addEventListener('abort', () => io.disconnect());
      } catch { reveals.forEach(show); }
      setTimeout(() => reveals.forEach(show), 1600);
    }
  }

  const nums = document.querySelectorAll('.sg-num[data-count]');
  const fmt = (v, dec) => (dec ? v.toFixed(dec) : String(Math.round(v)));
  const runCount = (el) => {
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
  };
  if (nums.length) {
    try {
      const io = new IntersectionObserver((es) => {
        es.forEach((e) => { if (e.isIntersecting) { runCount(e.target); io.unobserve(e.target); } });
      }, { threshold: 0.6 });
      nums.forEach((el) => io.observe(el));
      sig.addEventListener('abort', () => io.disconnect());
    } catch { nums.forEach(runCount); }
  }
}

/* ============ 交互 1：谁来验收「做完了」 ============ */
function initHeroJudge(sig, reduced) {
  const root = document.getElementById('sg-judge');
  if (!root) return;
  const verdict = document.getElementById('sg-verdict');
  const btnA = document.getElementById('sg-btn-agent');
  const btnB = document.getElementById('sg-btn-auditor');
  const reset = document.getElementById('sg-reset');
  const scan = document.getElementById('sg-scanline');
  const line24 = document.getElementById('sg-line-24');
  const narrative = document.getElementById('sg-narrative');

  const HINT = '<div class="sg-verdict-hint mono">选一个裁判，看它怎么判 →</div>';
  const agentHTML = `
    <div class="sg-vbadge agent" id="sg-vbadge">GOAL COMPLETE</div>
    <p class="sg-vbody">它带着同一段对话上下文做判定，信了 NOTES / PR #123 的叙事，没真去打开 <code>src/db.js</code>。叙事说做完了，它就盖章——可第 24 行还是 <code>MemoryStore</code>，代码根本没改。</p>
    <p class="sg-vtag">这一章是<strong>假完成</strong>。绿勾盖在了现实之前。</p>`;
  const auditorHTML = `
    <div class="sg-vbadge auditor">✗ INCOMPLETE</div>
    <p class="sg-vbody">干净上下文、只读，直接读真实文件树。它忽略叙事，扫到 <code>src/db.js:24</code>。</p>
    <div class="sg-gap">
      <p class="sg-gap-from">module.exports = { store: new MemoryStore() }</p>
      <p class="sg-gap-to"><span class="mono sg-gap-tag">fix</span>module.exports = { store: new FileStore() }</p>
      <p class="sg-gap-note">FileStore 类已正确——只差这一行导出没换。goal 不关单。</p>
    </div>`;

  let busy = false;
  const clearMarks = () => {
    line24?.classList.remove('sg-line-hot');
    narrative?.classList.remove('sg-read');
    btnA.classList.remove('is-chosen');
    btnB.classList.remove('is-chosen');
  };
  const flipAgentBadge = () => {
    const b = document.getElementById('sg-vbadge');
    if (b) { b.classList.add('is-false'); b.textContent = '✗ FALSE COMPLETION'; }
  };
  const judge = (kind) => {
    if (busy) return;
    clearMarks();
    (kind === 'agent' ? btnA : btnB).classList.add('is-chosen');
    if (kind === 'agent') narrative?.classList.add('sg-read');
    else line24?.classList.add('sg-line-hot');

    const finish = () => {
      root.dataset.verdict = kind;
      verdict.innerHTML = kind === 'agent' ? agentHTML : auditorHTML;
      reset.hidden = false;
      busy = false;
      if (kind === 'agent') reduced ? flipAgentBadge() : setTimeout(flipAgentBadge, 400);
    };

    if (reduced || !scan) { finish(); return; }
    busy = true;
    root.dataset.verdict = 'judging';
    scan.classList.remove('run'); void scan.offsetWidth; scan.classList.add('run');
    setTimeout(finish, 1050);
  };

  btnA.addEventListener('click', () => judge('agent'), { signal: sig });
  btnB.addEventListener('click', () => judge('auditor'), { signal: sig });
  reset.addEventListener('click', () => {
    clearMarks(); root.dataset.verdict = 'idle'; verdict.innerHTML = HINT; reset.hidden = true;
  }, { signal: sig });
}

/* ============ 交互 2：验证范式四象限 ============ */
function initQuadrant(sig, reduced) {
  const root = document.getElementById('sg-quad');
  if (!root) return;
  const svg = document.getElementById('sg-quad-svg');
  const panel = document.getElementById('sg-quad-panel');
  const toggle = document.getElementById('sg-eval-toggle');
  if (!svg || !panel || !toggle) return;

  const box = { x0: 90, x1: 510, y0: 60, y1: 420 };
  const px = (x) => box.x0 + x * (box.x1 - box.x0);
  const py = (y) => box.y1 - y * (box.y1 - box.y0);

  const PTS = [
    { id: 'codex', label: 'Codex 内联自审', x: 0.17, y: 0.16, tone: 'coral',
      risk: '同会话自评 · 既当运动员又当裁判',
      why: '判定在同一条对话里完成，进程与证据都共享——最容易自我确认，锚定风险最高。' },
    { id: 'diy', label: 'DIY 独立 auditor', x: 0.19, y: 0.86, tone: 'teal',
      risk: '隔离最强 · 语义判断仍靠模型',
      why: '干净上下文、只读文件树，进程与证据双隔离；判定仍是模型语义理解。这是本项目的生态位。' },
    { id: 'plain', label: '裸 session', x: 0.83, y: 0.17, tone: 'gray',
      risk: '有程序化检查 · 但全在一条会话',
      why: '能跑 lint/test，但证据和判定共享同一上下文，叙事可污染。最弱基线。' },
    { id: 'cc', label: 'CC 原生 checker', x: 0.84, y: 0.82, yPost: 0.42, tone: 'gray', moved: true,
      risk: '看似隔离 · 实为证据共享',
      riskPost: '证据 = transcript ⇒ 可被对话叙事影响',
      why: '流程上是独立子进程，设计直觉以为它很隔离。',
      whyPost: '实测：13 个判语里 9 个以「The transcript shows…」开头——证据源是 transcript，进程隔离但证据共享。隔离度因此下掉一截。（对闭源系统的行为推断，非源码事实。）' },
  ];

  const HINT = '<div class="sg-panel-tag mono">点一个系统，看它为什么落在这</div>';
  const fillPanel = (p, post) => {
    const why = post && p.whyPost ? p.whyPost : p.why;
    const risk = post && p.riskPost ? p.riskPost : p.risk;
    panel.innerHTML =
      `<div class="sg-panel-title" style="color:var(--sg-${p.tone}-ink,#fff)">${p.label}</div>` +
      `<div class="sg-panel-risk mono">${risk}</div>` +
      `<p class="sg-panel-why">${why}</p>`;
  };

  // —— 静态底图：象限淡色块 + 坐标轴 + 标签
  const wash = [
    { x: box.x0, y: box.y0, c: 'var(--sg-teal-soft)' },        // 左上 隔离×语义
    { x: (box.x0 + box.x1) / 2, y: box.y0, c: 'var(--sg-gray-soft)' }, // 右上 隔离×程序（理想）
  ];
  wash.forEach((w) => svg.appendChild(svgEl('rect', {
    x: w.x, y: w.y, width: (box.x1 - box.x0) / 2, height: (box.y1 - box.y0) / 2,
    fill: w.c, rx: 6,
  })));
  const axis = (x1, y1, x2, y2) => svgEl('line', { x1, y1, x2, y2, stroke: 'var(--line)', 'stroke-width': 1 });
  svg.appendChild(axis((box.x0 + box.x1) / 2, box.y0 - 14, (box.x0 + box.x1) / 2, box.y1 + 14));
  svg.appendChild(axis(box.x0 - 14, (box.y0 + box.y1) / 2, box.x1 + 14, (box.y0 + box.y1) / 2));
  const lbl = (x, y, t, anchor = 'middle', cls = 'sg-axis-lbl') => {
    const e = svgEl('text', { x, y, 'text-anchor': anchor, class: cls });
    e.textContent = t; svg.appendChild(e); return e;
  };
  lbl(box.x0 - 4, box.y1 + 34, '语义理解', 'start');
  lbl(box.x1 + 4, box.y1 + 34, '程序化检查', 'end');
  lbl((box.x0 + box.x1) / 2, box.y0 - 24, '审计者隔离');
  lbl((box.x0 + box.x1) / 2, box.y1 + 50, '共享上下文');
  const q = (x, y, t) => lbl(x, y, t, 'middle', 'sg-quad-cap');
  q(px(0.27), py(0.94), '隔离 × 语义');
  q(px(0.74), py(0.94), '隔离 × 程序（理想）');
  q(px(0.27), py(0.06), '共享 × 语义（最弱）');
  q(px(0.74), py(0.06), '共享 × 程序');

  // —— cc 移动组：ghost 旧位 + 箭头 + 注解（evald 时显形）
  const moveG = svgEl('g', { class: 'sg-quad-move' });
  moveG.appendChild(svgEl('circle', { class: 'sg-pt-ghost', cx: px(0.84), cy: py(0.82), r: 8 }));
  moveG.appendChild(svgEl('line', {
    class: 'sg-pt-arrow', x1: px(0.84), y1: py(0.82) + 12, x2: px(0.84), y2: py(0.42) - 12,
    'marker-end': 'url(#sg-arrow)',
  }));
  const anno = svgEl('text', { class: 'sg-quad-anno', x: px(0.84) - 12, y: py(0.62), 'text-anchor': 'end' });
  anno.textContent = '测的是它，地图才变';
  moveG.appendChild(anno);
  svg.appendChild(moveG);

  // —— 数据点
  const ptsG = svgEl('g', { id: 'sg-quad-pts' });
  svg.appendChild(ptsG);
  PTS.forEach((p) => {
    const g = svgEl('g', {
      class: `sg-pt tone-${p.tone}`, 'data-id': p.id, tabindex: '0', role: 'button',
      'aria-label': `${p.label}，点击看落位理由`,
    });
    g.appendChild(svgEl('circle', { class: 'sg-pt-halo', cx: px(p.x), cy: py(p.y), r: 16 }));
    g.appendChild(svgEl('circle', { class: 'sg-pt-dot', cx: px(p.x), cy: py(p.y), r: 8 }));
    const tx = svgEl('text', {
      class: 'sg-pt-lbl', x: px(p.x), y: py(p.y) + (p.y > 0.5 ? -16 : 24), 'text-anchor': 'middle',
    });
    tx.textContent = p.label;
    g.appendChild(tx);
    ptsG.appendChild(g);

    const activate = () => {
      ptsG.querySelectorAll('.sg-pt').forEach((o) => o.classList.toggle('is-active', o === g));
      root.classList.add('has-active');
      fillPanel(p, root.dataset.evald === 'true' && p.id === 'cc');
    };
    g.addEventListener('click', activate, { signal: sig });
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
      else if (e.key === 'Escape') {
        ptsG.querySelectorAll('.sg-pt').forEach((o) => o.classList.remove('is-active'));
        root.classList.remove('has-active'); panel.innerHTML = HINT;
      }
    }, { signal: sig });
  });

  // —— toggle：cc 沿隔离轴下落
  const ccG = ptsG.querySelector('.sg-pt[data-id="cc"]');
  const dy = py(0.42) - py(0.82);
  if (reduced && ccG) ccG.style.transition = 'none';
  const setEval = (on) => {
    root.dataset.evald = String(on);
    toggle.setAttribute('aria-pressed', String(on));
    if (ccG) ccG.style.transform = on ? `translateY(${dy}px)` : 'translateY(0)';
    const cc = PTS.find((x) => x.id === 'cc');
    if (ccG && ccG.classList.contains('is-active')) fillPanel(cc, on);
  };
  toggle.addEventListener('click', () => setEval(toggle.getAttribute('aria-pressed') !== 'true'), { signal: sig });
  setEval(false);
}

/* ============ 交互 3：提示词层 → 程序层 光谱 ============ */
function initSpectrum(sig, reduced) {
  const root = document.getElementById('sg-spectrum');
  if (!root) return;
  const svg = document.getElementById('sg-spec-svg');
  const panel = document.getElementById('sg-spec-panel');
  if (!svg || !panel) return;

  const X0 = 48, X1 = 872, BY = 70, BH = 16;
  const cx = (x) => X0 + x * (X1 - X0);
  const CEIL = 0.78;

  const MARKS = [
    { id: 'v1', label: 'Trae v1', x: 0.05, kind: 'prompt',
      moved: ['全靠提示词 + 模型自觉'], cant: [] },
    { id: 'v2', label: 'Trae v2', x: 0.27, kind: 'prompt',
      moved: ['GOAL.md 固化目标', '全局规则复述（≈ compaction 重注入）', 'rounds 预算（≈ token/时间预算）'],
      cant: ['确定性 echo + 程序循环：模型仍可绕过'] },
    { id: 'l3', label: 'Trae L3〔设想〕', x: 0.45, kind: 'ghost',
      moved: ['status 字段 → 六态机雏形', 'goal_tick 可程序化扣预算'],
      cant: ['提案 · 未实现；且没 hooks 强制模型调用'] },
    { id: 'ccdiy', label: 'CC DIY auditor', x: 0.70, kind: 'program',
      moved: ['独立只读子进程', '读真实文件树而非叙事', 'enum 校验的判语'], cant: [] },
    { id: 'codex', label: 'Codex 原生', x: 0.93, kind: 'program',
      moved: ['SQLite 状态机', '六态机 CHECK 约束', 'token/时间预算', 'compaction 重注入', '确定性 echo + 程序循环'], cant: [] },
  ];

  const HINT = '<div class="sg-panel-tag mono">点一个迭代，看它把什么从「提示词」搬到了「程序」</div>';
  const fillPanel = (m) => {
    const moved = m.moved.map((t) => `<li>${t}</li>`).join('');
    const cant = m.cant.length
      ? `<div class="sg-spec-cant"><span class="mono">搬不动 / 无法复刻</span><ul>${m.cant.map((t) => `<li>${t}</li>`).join('')}</ul></div>` : '';
    panel.innerHTML =
      `<div class="sg-panel-title tone-${m.kind}">${m.label}</div>` +
      `<div class="sg-spec-moved"><span class="mono">搬到了程序层</span><ul>${moved}</ul></div>` + cant;
  };

  // 轨道
  svg.appendChild(svgEl('rect', { class: 'sg-spec-bar', x: X0, y: BY, width: X1 - X0, height: BH, rx: BH / 2, fill: 'url(#sg-spec-grad)' }));
  // 珊瑚「无法复刻」禁区
  svg.appendChild(svgEl('rect', { class: 'sg-spec-ceil', x: cx(CEIL), y: BY - 1, width: X1 - cx(CEIL), height: BH + 2, rx: BH / 2, fill: 'url(#sg-hatch)' }));
  const ceilLbl = svgEl('text', { class: 'sg-spec-ceil-lbl', x: (cx(CEIL) + X1) / 2, y: BY + BH + 24, 'text-anchor': 'middle' });
  ceilLbl.textContent = '提示词层无法复刻';
  svg.appendChild(ceilLbl);
  // 两端
  const endL = svgEl('text', { class: 'sg-spec-end', x: X0, y: BY - 16, 'text-anchor': 'start' });
  endL.textContent = '提示词层 · 模型自觉';
  const endR = svgEl('text', { class: 'sg-spec-end', x: X1, y: BY - 16, 'text-anchor': 'end' });
  endR.textContent = '程序层 · 代码强制';
  svg.appendChild(endL); svg.appendChild(endR);

  // marker（标签上下交错避让）
  const marksG = svgEl('g', { id: 'sg-spec-marks' });
  svg.appendChild(marksG);
  MARKS.forEach((m, i) => {
    const up = i % 2 === 0;
    const X = cx(m.x), dotY = BY + BH / 2;
    const labY = up ? BY - 34 : BY + BH + 40;
    const g = svgEl('g', {
      class: `sg-mark kind-${m.kind}`, 'data-id': m.id, tabindex: '0', role: 'button',
      'aria-label': `${m.label}，点击看它搬到程序层的部分`,
    });
    g.appendChild(svgEl('line', { class: 'sg-mark-stem', x1: X, y1: dotY, x2: X, y2: up ? labY + 8 : labY - 18 }));
    g.appendChild(svgEl('circle', { class: 'sg-mark-dot', cx: X, cy: dotY, r: 7 }));
    const tx = svgEl('text', { class: 'sg-mark-lbl', x: X, y: labY, 'text-anchor': 'middle' });
    tx.textContent = m.label;
    g.appendChild(tx);
    marksG.appendChild(g);

    const activate = () => {
      marksG.querySelectorAll('.sg-mark').forEach((o) => o.classList.toggle('is-active', o === g));
      root.classList.add('has-active');
      fillPanel(m);
    };
    g.addEventListener('click', activate, { signal: sig });
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
      else if (e.key === 'Escape') {
        marksG.querySelectorAll('.sg-mark').forEach((o) => o.classList.remove('is-active'));
        root.classList.remove('has-active'); panel.innerHTML = HINT;
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const all = [...marksG.querySelectorAll('.sg-mark')];
        const ni = (i + (e.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length;
        all[ni].focus();
      }
    }, { signal: sig });
  });

  // 入场爬升（reduced 直出）
  if (!reduced) {
    marksG.classList.add('to-place');
    requestAnimationFrame(() => requestAnimationFrame(() => marksG.classList.remove('to-place')));
  }
}

function initPage(sig) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  initCommon(sig, reduced);
  initHeroJudge(sig, reduced);
  initQuadrant(sig, reduced);
  initSpectrum(sig, reduced);
}

document.addEventListener('astro:page-load', () => {
  abort?.abort();
  abort = new AbortController();
  initPage(abort.signal);
});

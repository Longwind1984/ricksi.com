// 悬浮导航 + 液态透镜胶囊（弹簧物理 / 鼠标跟随 / scrollspy）
// 首页：<nav data-scrollspy="projects,workbench,knowledge,blog"> 滚动跟随
// 子页：<nav data-active="kb"> 固定高亮当前栏目，胶囊仍有悬停跟随

// 折射透镜只在 Chromium 系启用（backdrop-filter: url() 仅 Chromium 实际渲染；
// @supports 在 Safari/Firefox 误报，故用 UA 判定 + CSS 渐进增强，杜绝静默裸态）
if (/Chrome\//.test(navigator.userAgent)) {
  document.documentElement.classList.add('lg-refract');
}
// 桌面端 .sec 用预模糊图替代大面积 backdrop-filter（资产随构建产出，见 glass.css）
document.documentElement.classList.add('sec-prerendered');

function initNav(sig) {
  const head = document.getElementById('site-head');
  const nav = document.getElementById('nav');
  const pill = document.getElementById('nav-pill');
  if (!nav || !pill) return;

  const spyIds = (nav.dataset.scrollspy || '').split(',').filter(Boolean);
  const fixedActive = nav.dataset.active || null;
  const tabEls = {};
  nav.querySelectorAll('.nav-link[data-tab]').forEach((a) => { tabEls[a.dataset.tab] = a; });
  const tabIds = Object.keys(tabEls);

  let activeTab = fixedActive;
  let hoverTab = null;
  const phys = { x: 0, w: 0, vx: 0, vw: 0, tx: 0, tw: 0, visible: false, raf: 0 };
  sig.addEventListener('abort', () => { if (phys.raf) cancelAnimationFrame(phys.raf); });

  // 液态弹簧：胶囊朝目标滑动，速度映射为拉伸形变 + 折射强度
  function runPillSpring() {
    if (phys.raf) return;
    let last = performance.now();
    function step(now) {
      const dt = Math.min(0.032, (now - last) / 1000) || 0.016;
      last = now;
      const K = 330, D = 22; // 刚度/阻尼：轻微欠阻尼 → 回弹
      phys.vx += (K * (phys.tx - phys.x) - D * phys.vx) * dt;
      phys.x += phys.vx * dt;
      phys.vw += (K * (phys.tw - phys.w) - D * phys.vw) * dt;
      phys.w += phys.vw * dt;
      const stretch = Math.min(0.32, Math.abs(phys.vx) / 2400);
      pill.style.width = phys.w + 'px';
      pill.style.transform = `translateX(${phys.x}px) scale(${1 + stretch}, ${1 - stretch * 0.5})`;
      const disp = document.getElementById('lg-disp');
      if (disp) disp.setAttribute('scale', String(Math.round(26 + Math.min(58, Math.abs(phys.vx) * 0.05))));
      if (Math.abs(phys.tx - phys.x) < 0.4 && Math.abs(phys.vx) < 6 && Math.abs(phys.tw - phys.w) < 0.4 && Math.abs(phys.vw) < 6) {
        phys.x = phys.tx; phys.w = phys.tw; phys.vx = 0; phys.vw = 0; phys.raf = 0;
        pill.style.width = phys.w + 'px';
        pill.style.transform = `translateX(${phys.x}px)`;
        if (disp) disp.setAttribute('scale', '26');
        return;
      }
      phys.raf = requestAnimationFrame(step);
    }
    phys.raf = requestAnimationFrame(step);
  }

  // 胶囊目标：鼠标悬停优先，否则跟随激活 tab
  function updatePill() {
    const target = hoverTab || activeTab;
    const el = target ? tabEls[target] : null;
    if (el) {
      const r = el.getBoundingClientRect();
      const w = nav.getBoundingClientRect();
      if (r.width > 4) {
        const tx = r.left - w.left;
        const tw = r.width;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!phys.visible || reduced) {
          phys.x = tx; phys.w = tw; phys.vx = 0; phys.vw = 0; phys.tx = tx; phys.tw = tw; phys.visible = true;
          pill.style.width = tw + 'px';
          pill.style.transform = `translateX(${tx}px)`;
          pill.style.opacity = '1';
        } else {
          phys.tx = tx; phys.tw = tw;
          pill.style.opacity = '1';
          runPillSpring();
        }
        return;
      }
    }
    phys.visible = false;
    pill.style.opacity = '0';
  }

  function setActiveTab(id) {
    if (id === activeTab) return;
    activeTab = id;
    tabIds.forEach((t) => tabEls[t].classList.toggle('active', t === id));
    updatePill();
  }

  tabIds.forEach((id) => {
    tabEls[id].addEventListener('mouseenter', () => {
      if (hoverTab === id) return;
      hoverTab = id;
      updatePill();
    });
    // 按压「充能」：胶囊受压瞬间提亮（HIG: energize with light）
    tabEls[id].addEventListener('pointerdown', () => pill.classList.add('pressed'));
    tabEls[id].addEventListener('pointerup', () => pill.classList.remove('pressed'));
    tabEls[id].addEventListener('pointercancel', () => pill.classList.remove('pressed'));
    if (spyIds.length) tabEls[id].addEventListener('click', () => setActiveTab(id));
  });
  nav.addEventListener('mouseleave', () => {
    if (hoverTab === null) return;
    hoverTab = null;
    updatePill();
  });

  const brand = document.getElementById('brand');
  if (brand && spyIds.length) brand.addEventListener('click', () => setActiveTab(null));

  // 固定高亮（子页）：初始即上色
  if (fixedActive && tabEls[fixedActive]) tabEls[fixedActive].classList.add('active');

  // 布局/字体变化时重测
  const remeasure = () => updatePill();
  requestAnimationFrame(remeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  window.addEventListener('resize', remeasure, { signal: sig });

  // scrollspy（仅首页）
  if (spyIds.length) {
    const spy = () => {
      if (!window.innerHeight) return; // 首帧布局不可信
      let cur = null;
      spyIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 170) cur = id;
      });
      setActiveTab(cur);
    };
    spy();
    requestAnimationFrame(spy);
    setTimeout(spy, 350);
    window.addEventListener('scroll', spy, { passive: true, signal: sig });
    window.addEventListener('resize', spy, { signal: sig });
  }

  // 首屏透明 / 滚动后加深（仅带 hero 的页面）
  if (head && head.dataset.hero) {
    const calc = () => {
      const threshold = Math.max(240, (window.innerHeight || 0) * 0.62);
      head.classList.toggle('over-hero', window.scrollY < threshold);
    };
    calc();
    requestAnimationFrame(calc);
    window.addEventListener('scroll', calc, { passive: true, signal: sig });
    window.addEventListener('resize', calc, { signal: sig });
  }

  // 滚动形变（iOS 26 tab bar minimize）：下滚累计 >80px 收缩让位内容，上滚立即展开
  if (head) {
    let lastY = window.scrollY;
    let downAcc = 0;
    const morph = () => {
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      if (dy > 0) downAcc += dy;
      else if (dy < 0) downAcc = 0;
      const compact = downAcc > 80 && y > 320;
      head.classList.toggle('compact', compact);
      nav.classList.toggle('compact', compact);
      if (compact !== morph.was) {
        morph.was = compact;
        clearTimeout(morph.t);
        morph.t = setTimeout(updatePill, 480); // 等过渡结束后按新几何重测胶囊
      }
    };
    window.addEventListener('scroll', morph, { passive: true, signal: sig });
  }
}

/* View Transitions：每次导航后重建（astro:page-load 首次加载也会触发） */
let navAbort = null;
document.addEventListener('astro:page-load', () => {
  navAbort?.abort();
  navAbort = new AbortController();
  initNav(navAbort.signal);
});

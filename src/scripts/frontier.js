// 前沿追踪页交互：四维 AND 筛选（类型/领域/人物/标签）+ URL 参数同步 + 深链展开 + 按日折叠
// IA（2026-06-12）：最新一天展开、更早日组 <details> 折叠；筛选激活时全组强制展开（折叠会吞结果）
// 惯例：astro:page-load 内初始化，元素不存在即 return（View Transitions 兼容）

const GROUP_BATCH = 10; // 无筛选时首屏日组数，每点一次「显示更早」+20

function initFrontier() {
  const stream = document.getElementById('ft-stream');
  if (!stream) return;

  const filters = document.getElementById('ft-filters');
  const activeWrap = document.getElementById('ft-active');
  const activeChip = document.getElementById('ft-active-chip');
  const count = document.getElementById('ft-count');
  const more = document.getElementById('ft-more');
  const empty = document.getElementById('ft-empty');
  const rail = document.getElementById('ft-prail');
  const entries = [...stream.querySelectorAll('.ft-entry')];
  const groups = [...stream.querySelectorAll('.ft-day-group')];

  /* slug → 显示名（横滚条/档案卡里都有中文/原名，胶囊不再露 slug） */
  const nameOf = new Map();
  document.querySelectorAll('.ft-prail-item[data-ft-person]').forEach((b) => {
    nameOf.set(b.dataset.ftPerson, b.title?.split(' · ')[0] || b.textContent.trim());
  });
  document.querySelectorAll('.ft-pcard[data-ft-person]').forEach((c) => {
    nameOf.set(c.dataset.ftPerson, c.querySelector('.ft-pname')?.textContent ?? c.dataset.ftPerson);
  });
  document.querySelectorAll('.ft-topic-chip[data-ft-person]').forEach((b) => {
    nameOf.set(b.dataset.ftPerson, b.textContent.trim().replace(/\s*\d+$/, ''));
  });
  entries.forEach((el) => {
    const k = el.dataset.person;
    if (k && !nameOf.has(k)) nameOf.set(k, el.querySelector('.ft-person')?.textContent ?? k);
  });

  /* 状态：type/domain 来自筛选条 chip；person/tag 只能由点击产生 */
  const state = { type: '', domain: '', person: '', tag: '' };
  let shownGroups = GROUP_BATCH;

  const hasFilter = () => !!(state.type || state.domain || state.person || state.tag);

  function apply({ scroll = false } = {}) {
    const matches = entries.filter((el) => {
      if (state.type && el.dataset.type !== state.type) return false;
      if (state.domain && el.dataset.domain !== state.domain) return false;
      if (state.person && el.dataset.person !== state.person) return false;
      if (state.tag && !(el.dataset.tags || '').split('|').includes(state.tag)) return false;
      return true;
    });
    const set = new Set(matches);
    entries.forEach((el) => {
      el.style.display = set.has(el) ? '' : 'none';
    });

    /* 日组：空组隐藏；筛选时全部强制展开，无筛选时恢复折叠默认 + 组级分批 */
    let visibleGroupIdx = 0;
    groups.forEach((g) => {
      const any = [...g.querySelectorAll('.ft-entry')].some((el) => el.style.display !== 'none');
      let show = any;
      if (g.tagName === 'DETAILS') g.open = hasFilter() ? any : false;
      if (!hasFilter() && any) {
        show = visibleGroupIdx < shownGroups;
        visibleGroupIdx++;
      }
      g.style.display = show ? '' : 'none';
    });

    count.textContent = `${matches.length} 条`;
    more.hidden = hasFilter() || visibleGroupIdx <= shownGroups;
    empty.hidden = matches.length > 0;

    /* 人物/标签筛选胶囊（带 ✕） */
    if (state.person || state.tag) {
      const label = state.person ? (nameOf.get(state.person) ?? state.person) : `# ${state.tag}`;
      activeChip.textContent = `${label} ✕`;
      activeWrap.hidden = false;
    } else {
      activeWrap.hidden = true;
    }

    /* 横滚条选中态联动 */
    rail?.querySelectorAll('[data-ft-person]').forEach((b) => {
      b.classList.toggle('active', !!state.person && b.dataset.ftPerson === state.person);
    });

    /* URL 同步（replaceState 不污染历史栈；先例 /graph?focus） */
    const params = new URLSearchParams();
    for (const k of ['type', 'domain', 'person', 'tag']) if (state[k]) params.set(k, state[k]);
    const qs = params.toString();
    history.replaceState(null, '', location.pathname + (qs ? `?${qs}` : '') + location.hash);

    if (scroll) stream.closest('.sec')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* 筛选条：type/domain 单选 chip */
  filters?.addEventListener('click', (e) => {
    const btn = e.target.closest('.hm-dim[data-val]');
    if (!btn) return;
    const row = btn.closest('.ft-frow');
    if (!row) return;
    row.querySelectorAll('.hm-dim').forEach((b) => b.classList.toggle('active', b === btn));
    state[row.dataset.dim] = btn.dataset.val || '';
    apply();
  });

  /* 人物/标签点击（横滚条、流内人名、标签、人物卡、信息源 chip 统一委托；ft-disabled 不响应） */
  document.querySelector('.sub-main')?.addEventListener('click', (e) => {
    const personBtn = e.target.closest('[data-ft-person]');
    if (personBtn && !personBtn.classList.contains('ft-disabled')) {
      state.person = state.person === personBtn.dataset.ftPerson ? '' : personBtn.dataset.ftPerson;
      state.tag = '';
      apply({ scroll: !personBtn.closest('#ft-prail') });
      return;
    }
    const tagBtn = e.target.closest('[data-ft-tag]');
    if (tagBtn) {
      state.tag = state.tag === tagBtn.dataset.ftTag ? '' : tagBtn.dataset.ftTag;
      state.person = '';
      apply();
    }
  });

  /* 胶囊 ✕ 与空态清除 */
  activeChip?.addEventListener('click', () => {
    state.person = '';
    state.tag = '';
    apply();
  });
  document.getElementById('ft-clear')?.addEventListener('click', () => {
    state.type = '';
    state.domain = '';
    state.person = '';
    state.tag = '';
    filters?.querySelectorAll('.ft-frow').forEach((row) => {
      row.querySelectorAll('.hm-dim').forEach((b, i) => b.classList.toggle('active', i === 0));
    });
    apply();
  });

  more?.addEventListener('click', () => {
    shownGroups += 20;
    apply();
  });

  /* 初始化：URL 参数还原 + 深链展开 */
  const params = new URLSearchParams(location.search);
  // 视觉方向试穿：?view=cards 切卡片流（A/B 保留期，用户决策 2026-06-12）
  if (params.get('view') === 'cards') stream.classList.replace('rows', 'cards');
  for (const k of ['type', 'domain', 'person', 'tag']) {
    const v = params.get(k);
    if (v) state[k] = v;
  }
  filters?.querySelectorAll('.ft-frow').forEach((row) => {
    const want = state[row.dataset.dim] || '';
    row.querySelectorAll('.hm-dim').forEach((b) => b.classList.toggle('active', (b.dataset.val || '') === want));
  });
  apply();

  if (location.hash.startsWith('#e-')) {
    const target = document.getElementById(location.hash.slice(1));
    if (target) {
      target.closest('details.ft-day-fold')?.setAttribute('open', ''); // 先展开所在日组
      target.querySelector('details')?.setAttribute('open', '');
      requestAnimationFrame(() => {
        target.scrollIntoView({ block: 'center' });
        target.classList.add('ft-flash');
        setTimeout(() => target.classList.remove('ft-flash'), 1600);
      });
    }
  }
}

// 防御：View Transitions 下若本模块被重复执行，确保 document 级监听只挂一次
if (!window.__ftBound) {
  window.__ftBound = true;
  document.addEventListener('astro:page-load', initFrontier);
}

// ⌘K 命令面板 —— 致敬 Slash Goal：支持 /kb /blog /proj 前缀过滤
// 触发：⌘K / Ctrl+K / 「/」（非输入态）/ 导航搜索按钮；索引构建时生成（/search-index.json）
let indexCache = null;
let kAbort = null;

const TYPE_LABEL = { page: '页面', proj: '项目', post: '文章', note: '笔记' };
const PREFIX = { '/kb': 'note', '/blog': 'post', '/proj': 'proj', '/goal': 'proj' };

async function loadIndex() {
  if (!indexCache) {
    try {
      indexCache = (await (await fetch('/search-index.json')).json()).items;
    } catch {
      indexCache = [];
    }
  }
  return indexCache;
}

function score(q, title) {
  const t = title.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  const idx = t.indexOf(q);
  if (idx >= 0) return 60 - Math.min(40, idx);
  // 简易子序列匹配（间隔越小分越高）
  let i = 0, gaps = 0, last = -1;
  for (const ch of q) {
    const f = t.indexOf(ch, i);
    if (f < 0) return -1;
    if (last >= 0) gaps += f - last - 1;
    last = f;
    i = f + 1;
  }
  return Math.max(1, 30 - gaps);
}

function initCmdk(sig) {
  const overlay = document.getElementById('cmdk');
  if (!overlay) return;
  const input = document.getElementById('cmdk-input');
  const list = document.getElementById('cmdk-list');
  let items = [];
  let selected = 0;

  function open() {
    overlay.hidden = false;
    input.value = '';
    render([]);
    requestAnimationFrame(() => input.focus());
    loadIndex();
  }
  function close() {
    overlay.hidden = true;
  }
  function go(href) {
    close();
    const a = document.createElement('a');
    a.href = href;
    document.body.appendChild(a);
    a.click(); // 走 ClientRouter 软导航
    a.remove();
  }

  function render(results) {
    items = results;
    selected = 0;
    if (!results.length) {
      list.innerHTML = `<div class="cmdk-empty mono">
        <div>/kb 笔记标题 — 搜知识库</div>
        <div>/blog 关键词 — 搜文章</div>
        <div>/proj — 看项目 · 或直接输入任意关键词</div>
      </div>`;
      return;
    }
    list.innerHTML = '';
    results.forEach((it, i) => {
      const row = document.createElement('a');
      row.className = 'cmdk-item' + (i === 0 ? ' sel' : '');
      row.href = it.href;
      row.innerHTML = `<span class="cmdk-type mono"></span><span class="cmdk-title"></span><span class="cmdk-sub mono"></span>`;
      row.querySelector('.cmdk-type').textContent = TYPE_LABEL[it.t] || it.t;
      row.querySelector('.cmdk-title').textContent = it.title;
      row.querySelector('.cmdk-sub').textContent = it.sub || '';
      row.addEventListener('click', (e) => {
        e.preventDefault();
        go(it.href);
      });
      row.addEventListener('pointerenter', () => select(i));
      list.appendChild(row);
    });
  }
  function select(i) {
    selected = Math.max(0, Math.min(items.length - 1, i));
    [...list.children].forEach((el, j) => el.classList.toggle('sel', j === selected));
    list.children[selected]?.scrollIntoView({ block: 'nearest' });
  }

  async function query(raw) {
    const all = await loadIndex();
    let q = raw.trim().toLowerCase();
    let type = null;
    for (const [p, t] of Object.entries(PREFIX)) {
      if (q === p || q.startsWith(p + ' ')) {
        type = t;
        q = q.slice(p.length).trim();
        break;
      }
    }
    let pool = type ? all.filter((it) => it.t === type) : all;
    if (!q) {
      render(type ? pool.slice(0, 12) : []);
      return;
    }
    const scored = pool
      .map((it) => ({ it, s: score(q, it.title) + (it.sub ? Math.max(0, score(q, it.sub)) * 0.3 : 0) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 12);
    render(scored.map((x) => x.it));
  }

  input.addEventListener('input', () => query(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); select(selected + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); select(selected - 1); }
    else if (e.key === 'Enter' && items[selected]) { e.preventDefault(); go(items[selected].href); }
    else if (e.key === 'Escape') close();
  });
  overlay.addEventListener('pointerdown', (e) => {
    if (e.target === overlay) close();
  });

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      overlay.hidden ? open() : close();
    } else if (e.key === '/' && overlay.hidden && !/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '')) {
      e.preventDefault();
      open();
      input.value = '/';
      query('/');
    } else if (e.key === 'Escape' && !overlay.hidden) {
      close();
    }
  }, { signal: sig });

  document.querySelectorAll('.nav-search').forEach((btn) => btn.addEventListener('click', open));
}

document.addEventListener('astro:page-load', () => {
  kAbort?.abort();
  kAbort = new AbortController();
  initCmdk(kAbort.signal);
});

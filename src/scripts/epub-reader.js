// 简洁 ePub 阅读器（基于 epub.js）：分页阅读 + 划线 + 选区悬浮菜单 + 分享 + 进度/目录/字号。
// 视觉沿用 Liquid Glass 钴蓝之夜；正文在 iframe 内，主题/字体靠 hooks 注入。
// 无后端：划线与阅读位置存 localStorage（按书 slug）。
// View Transitions：astro:page-load 初始化，astro:before-swap 销毁，避免 iframe 泄漏。

const WENKAI_CSS = 'https://registry.npmmirror.com/lxgw-wenkai-webfont/1.7.0/files/lxgwwenkai-regular.css';
const HL_FILL = 'rgba(120,168,255,0.32)'; // 群青划线
const READER_BG = '#0a1022';

let _book = null;
let _rendition = null;
let _ac = null;

/* ---------- localStorage 安全封装（隐私模式/禁用时退化为内存） ---------- */
const mem = {};
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return mem[k] ?? null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { mem[k] = v; } };
const loadHls = (slug) => { try { return JSON.parse(lsGet(`epub-hl:${slug}`) || '[]'); } catch { return []; } };
const saveHls = (slug, list) => lsSet(`epub-hl:${slug}`, JSON.stringify(list));

function init() {
  const root = document.getElementById('reader-root');
  if (!root || root.dataset.booted) return;
  root.dataset.booted = '1';

  const epubUrl = root.dataset.epub;
  const slug = root.dataset.slug;
  const bookTitle = root.dataset.title || '';
  const author = root.dataset.author || '';
  _ac = new AbortController();
  const sig = _ac.signal;

  const $ = (id) => document.getElementById(id);
  const viewer = $('viewer');
  const menu = $('epub-menu');
  const tocPanel = $('epub-toc');
  const pctEl = $('epub-pct');
  const fillEl = $('epub-progress-fill');
  const toast = $('epub-toast');
  const shareTrigger = $('epub-share-trigger');

  import('epubjs')
    .then(({ default: ePub }) => {
      const book = ePub(epubUrl);
      _book = book;
      const rendition = book.renderTo(viewer, {
        width: '100%',
        height: '100%',
        flow: 'paginated',
        spread: 'none',
        allowScriptedContent: false,
      });
      _rendition = rendition;

      /* ---- 正文主题：钴蓝深色 + 霞鹜文楷 ---- */
      rendition.themes.register('cobalt', {
        html: { background: `${READER_BG} !important` },
        body: {
          background: `${READER_BG} !important`,
          color: 'rgba(238,242,250,0.92) !important',
          'font-family': "'LXGW WenKai','Songti SC','Noto Serif SC',serif !important",
          'line-height': '1.95 !important',
          'letter-spacing': '0.01em',
          padding: '0 2px !important',
          '-webkit-touch-callout': 'none',
        },
        p: { margin: '0 0 1.05em !important', 'text-align': 'justify' },
        'a, a:link, a:visited': { color: 'rgba(125,170,255,0.95) !important', 'text-decoration': 'none' },
        'h1, h2, h3, h4': {
          color: '#FFFFFF !important',
          'font-family': "'MiSans','PingFang SC',sans-serif !important",
          'line-height': '1.45 !important',
        },
        'strong, b': { color: '#F0C56A !important' },
        img: { 'max-width': '100% !important', height: 'auto !important', 'border-radius': '8px', filter: 'brightness(0.92)' },
        blockquote: {
          'border-left': '3px solid rgba(125,170,255,0.5) !important',
          'padding-left': '14px',
          color: 'rgba(238,242,250,0.82) !important',
          'font-style': 'normal',
        },
        hr: { border: 'none', 'border-top': '1px solid rgba(190,210,255,0.18) !important' },
        '::selection': { background: 'rgba(120,168,255,0.38)' },
      });
      rendition.themes.select('cobalt');

      let fs = parseInt(lsGet(`epub-fs:${slug}`) || '100', 10);
      rendition.themes.fontSize(`${fs}%`);

      // iframe 拿不到页面 <head>，注入文楷 CDN 样式
      rendition.hooks.content.register((contents) => {
        const d = contents.document;
        if (d.getElementById('wk-font')) return;
        const link = d.createElement('link');
        link.id = 'wk-font';
        link.rel = 'stylesheet';
        link.href = WENKAI_CSS;
        d.head.appendChild(link);
      });

      /* ---- 起始位置：深链 #cfi= > 上次位置 > 开头 ---- */
      const hashCfi = decodeURIComponent((location.hash.match(/cfi=([^&]+)/) || [])[1] || '');
      const savedCfi = lsGet(`epub-pos:${slug}`);
      const startAt = hashCfi || savedCfi || undefined;

      rendition
        .display(startAt)
        .then(() => {
          $('epub-loading')?.classList.add('done');
          // 恢复划线
          loadHls(slug).forEach((h) => drawHl(h.cfi));
          // 深链命中：闪一下定位
          if (hashCfi) flashCfi(hashCfi);
        })
        .catch((e) => {
          console.error('[epub] display failed', e);
          const l = $('epub-loading');
          if (l) l.innerHTML = `<div class="epub-load-err">渲染失败：${escapeHtml(String(e?.message || e))}</div>`;
        });

      // 进度定位点（首屏后空闲生成，O(书大小)）
      book.ready
        .then(() => book.locations.generate(1600))
        .then(() => updatePct())
        .catch(() => {});

      /* ---- 目录 ---- */
      book.loaded.navigation.then((nav) => {
        const toc = nav.toc || [];
        tocPanel.innerHTML =
          `<div class="epub-toc-head mono">目录 · ${toc.length} 章</div>` +
          toc
            .map((it) => `<button class="epub-toc-item" data-href="${it.href}">${escapeHtml(it.label.trim())}</button>`)
            .join('');
        tocPanel.querySelectorAll('.epub-toc-item').forEach((b) =>
          b.addEventListener('click', () => {
            rendition.display(b.dataset.href);
            tocPanel.hidden = true;
          }, { signal: sig })
        );
      });

      /* ---- 选区 → 悬浮菜单 ---- */
      let sel = { cfi: '', text: '' };
      rendition.on('selected', (cfiRange, contents) => {
        const range = contents.range(cfiRange);
        if (!range) return;
        const rects = range.getClientRects();
        const rect = rects[0] || range.getBoundingClientRect();
        const iframe = contents.document.defaultView.frameElement;
        const ib = iframe.getBoundingClientRect();
        const text = (contents.window.getSelection()?.toString() || '').trim();
        if (!text) return;
        sel = { cfi: cfiRange, text };
        const x = ib.left + rect.left + rect.width / 2;
        const y = ib.top + rect.top;
        showMenu(x, y);
      });

      function showMenu(x, y) {
        menu.hidden = false;
        const mw = menu.offsetWidth || 180;
        const mh = menu.offsetHeight || 44;
        let left = Math.max(10, Math.min(x - mw / 2, innerWidth - mw - 10));
        let top = y - mh - 12;
        if (top < 64) top = y + 22; // 顶到 chrome 就翻到选区下方
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
        menu.classList.add('show');
      }
      function hideMenu() {
        menu.classList.remove('show');
        menu.hidden = true;
      }

      menu.querySelectorAll('button[data-act]').forEach((b) =>
        b.addEventListener('click', () => {
          const act = b.dataset.act;
          if (act === 'highlight') addHighlight(sel.cfi, sel.text);
          else if (act === 'copy') copyQuote(sel.text);
          else if (act === 'share') shareQuote(sel.cfi, sel.text);
          hideMenu();
          try { _rendition.getContents().forEach((c) => c.window.getSelection()?.removeAllRanges()); } catch {}
        }, { signal: sig })
      );

      /* ---- 划线 ---- */
      function drawHl(cfi) {
        try {
          rendition.annotations.add('highlight', cfi, {}, undefined, 'epub-hl', {
            fill: HL_FILL,
            'fill-opacity': '1',
            'mix-blend-mode': 'multiply',
          });
        } catch {}
      }
      function addHighlight(cfi, text) {
        const list = loadHls(slug);
        if (list.some((h) => h.cfi === cfi)) return;
        list.push({ cfi, text: text.slice(0, 280), ts: Date.now() });
        saveHls(slug, list);
        drawHl(cfi);
        showToast('已划线');
      }

      function copyQuote(text) {
        const payload = `${text}\n\n——《${bookTitle}》${author ? ' · ' + author : ''}`;
        navigator.clipboard?.writeText(payload).then(() => showToast('已复制金句'), () => showToast('复制失败'));
      }

      /* ---- 分享：玻璃明信片金句卡（canvas→png blob）+ 复制回链(CFI 深链) ---- */
      async function shareQuote(cfi, text) {
        const url = `${location.origin}${location.pathname}#cfi=${encodeURIComponent(cfi)}`;
        showToast('生成分享卡…');
        let cardUrl = '';
        try {
          cardUrl = await makeQuoteCard(text, bookTitle, author, url);
        } catch {}
        // 复用 Glass.astro 的分享弹层：填好隐藏触发器的 dataset 再点击
        shareTrigger.dataset.share = cardUrl || '';
        shareTrigger.dataset.title = `《${bookTitle}》划线`;
        shareTrigger.dataset.url = url;
        shareTrigger.click();
      }

      /* ---- 翻页：按钮 / 键盘 / 触摸滑动 ---- */
      $('epub-prev').addEventListener('click', () => rendition.prev(), { signal: sig });
      $('epub-next').addEventListener('click', () => rendition.next(), { signal: sig });
      document.addEventListener('keydown', (e) => {
        if ($('cmdk') && !$('cmdk').hidden) return;
        if (e.key === 'ArrowLeft') rendition.prev();
        else if (e.key === 'ArrowRight' || e.key === ' ') { if (e.key === ' ') e.preventDefault(); rendition.next(); }
      }, { signal: sig });
      let tsx = 0, tsy = 0;
      viewer.addEventListener('touchstart', (e) => { tsx = e.changedTouches[0].clientX; tsy = e.changedTouches[0].clientY; }, { passive: true, signal: sig });
      viewer.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - tsx;
        const dy = e.changedTouches[0].clientY - tsy;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? rendition.next() : rendition.prev());
      }, { passive: true, signal: sig });

      /* ---- 目录/字号按钮 ---- */
      $('epub-toc-btn').addEventListener('click', () => { tocPanel.hidden = !tocPanel.hidden; }, { signal: sig });
      $('epub-font-dec').addEventListener('click', () => setFont(-10), { signal: sig });
      $('epub-font-inc').addEventListener('click', () => setFont(10), { signal: sig });
      function setFont(d) {
        fs = Math.max(80, Math.min(160, fs + d));
        rendition.themes.fontSize(`${fs}%`);
        lsSet(`epub-fs:${slug}`, String(fs));
      }

      /* ---- 进度 + 收尾 ---- */
      rendition.on('relocated', (loc) => {
        if (loc?.start?.cfi) lsSet(`epub-pos:${slug}`, loc.start.cfi);
        updatePct(loc);
        hideMenu();
      });
      rendition.on('rendered', () => hideMenu());
      function updatePct(loc) {
        let p = loc?.start?.percentage;
        if ((p === undefined || p === 0) && book.locations?.length()) {
          try { p = book.locations.percentageFromCfi(rendition.currentLocation()?.start?.cfi); } catch {}
        }
        if (p === undefined || isNaN(p)) return;
        const pct = Math.round(p * 100);
        if (pctEl) pctEl.textContent = `${pct}%`;
        if (fillEl) fillEl.style.transform = `scaleX(${Math.max(0, Math.min(1, p))})`;
      }

      function flashCfi(cfi) {
        try {
          rendition.annotations.add('highlight', cfi, {}, undefined, 'epub-hl-flash', { fill: 'rgba(240,197,106,0.45)', 'fill-opacity': '1' });
          setTimeout(() => { try { rendition.annotations.remove(cfi, 'highlight'); } catch {} }, 2600);
        } catch {}
      }

      // 点别处关菜单/目录
      document.addEventListener('pointerdown', (e) => {
        if (menu && !menu.hidden && !menu.contains(e.target)) hideMenu();
        if (tocPanel && !tocPanel.hidden && !tocPanel.contains(e.target) && e.target.id !== 'epub-toc-btn') tocPanel.hidden = true;
      }, { signal: sig });

      function showToast(msg) {
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toast._t);
        toast._t = setTimeout(() => toast.classList.remove('show'), 1600);
      }
    })
    .catch((err) => {
      console.error('[epub] init failed', err);
      const l = document.getElementById('epub-loading');
      if (l) l.innerHTML = `<div class="epub-load-err">阅读器加载失败：${escapeHtml(String(err?.message || err))}</div>`;
    });
}

/* ---------- 客户端绘制玻璃金句卡（720×1280 PNG） ---------- */
async function makeQuoteCard(text, title, author, url) {
  try { await document.fonts.ready; } catch {}
  const W = 720, H = 1280, dpr = 2;
  const cv = document.createElement('canvas');
  cv.width = W * dpr; cv.height = H * dpr;
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);

  // 背景：钴蓝渐变 + 顶部暖金光晕
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0E1630'); bg.addColorStop(1, '#070C1E');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.78, -40, 20, W * 0.78, -40, 360);
  glow.addColorStop(0, 'rgba(255,216,150,0.18)'); glow.addColorStop(1, 'rgba(255,216,150,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

  // 玻璃面板
  const px = 56, py = 150, pw = W - px * 2, ph = H - py - 150;
  roundRect(ctx, px, py, pw, ph, 28);
  const panel = ctx.createLinearGradient(0, py, 0, py + ph);
  panel.addColorStop(0, 'rgba(70,104,200,0.22)'); panel.addColorStop(1, 'rgba(24,40,98,0.30)');
  ctx.fillStyle = panel; ctx.fill();
  ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(190,210,255,0.22)'; ctx.stroke();

  const ix = px + 44;
  let y = py + 96;
  // kicker
  ctx.fillStyle = '#F4C761';
  ctx.font = '600 22px ui-monospace, Menlo, monospace';
  ctx.fillText('划 线 · QUOTE', ix, y);
  // 金色竖条 + 引文
  y += 40;
  const quoteTop = y;
  ctx.fillStyle = 'rgba(242,245,250,0.96)';
  ctx.font = "400 38px 'LXGW WenKai','Songti SC',serif";
  const maxW = pw - 88 - 26;
  const lines = wrapText(ctx, clip(text, 220), maxW);
  const lh = 60;
  lines.slice(0, 11).forEach((ln, i) => ctx.fillText(ln, ix + 26, y + 30 + i * lh));
  const quoteBottom = y + 30 + Math.min(lines.length, 11) * lh - lh + 16;
  // 引文左侧金条
  ctx.fillStyle = 'rgba(244,199,97,0.6)';
  ctx.fillRect(ix, quoteTop, 5, Math.max(40, quoteBottom - quoteTop));

  // 底部：书名 + 署名 + 品牌 + 链接
  const by = py + ph - 120;
  ctx.strokeStyle = 'rgba(190,210,255,0.16)'; ctx.beginPath(); ctx.moveTo(ix, by); ctx.lineTo(px + pw - 44, by); ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = "700 30px 'MiSans','PingFang SC',sans-serif";
  ctx.fillText(clip(`《${title}》`, 22), ix, by + 44);
  ctx.fillStyle = 'rgba(225,236,255,0.6)';
  ctx.font = '400 22px ui-monospace, Menlo, monospace';
  if (author) ctx.fillText(clip(author, 30), ix, by + 78);
  ctx.fillStyle = 'rgba(125,170,255,0.85)';
  ctx.font = '400 19px ui-monospace, Menlo, monospace';
  ctx.fillText('RICK SI · 阅读 · ricksi.com', ix, by + 104);

  return await new Promise((res, rej) =>
    cv.toBlob((b) => (b ? res(URL.createObjectURL(b)) : rej(new Error('toBlob 失败'))), 'image/png')
  );
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function wrapText(ctx, text, maxW) {
  const out = [];
  let line = '';
  for (const ch of text) {
    if (ch === '\n') { out.push(line); line = ''; continue; }
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line) { out.push(line); line = ch; }
    else line = test;
  }
  if (line) out.push(line);
  return out;
}
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function destroy() {
  try { _rendition?.destroy(); } catch {}
  try { _book?.destroy(); } catch {}
  try { _ac?.abort(); } catch {}
  _rendition = _book = _ac = null;
  const root = document.getElementById('reader-root');
  if (root) delete root.dataset.booted;
}

document.addEventListener('astro:page-load', () => {
  if (document.getElementById('reader-root')) init();
});
document.addEventListener('astro:before-swap', destroy);

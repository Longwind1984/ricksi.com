// 阅读页行为：进度条 / reader chrome 滚动显隐 / 分享卡片弹层
// 所有页面都加载本模块，靠 DOM 探测决定是否启用（View Transitions 生命周期标准模式）。
let abort = null;

function init(sig) {
  /* ---------- 阅读进度条（kb 与 blog 文章页都有 #read-progress） ---------- */
  const bar = document.getElementById('read-progress');
  if (bar) {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    };
    update();
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true, signal: sig });
  }

  /* ---------- reader chrome：下滚隐、上滚现（Medium 式，让位正文） ---------- */
  const chrome = document.getElementById('reader-chrome');
  if (chrome) {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let lastY = scrollY;
    let downAcc = 0;
    addEventListener('scroll', () => {
      const y = scrollY;
      const dy = y - lastY;
      lastY = y;
      downAcc = dy > 0 ? downAcc + dy : dy < 0 ? 0 : downAcc;
      const hide = downAcc > 90 && y > 200;
      if (reduced) chrome.style.opacity = hide ? '0' : '1';
      else chrome.classList.toggle('hide', hide);
    }, { passive: true, signal: sig });
  }

  /* ---------- 分享卡片弹层（多触发器：reader chrome 钮 + 页脚「分享名片」） ----------
     每个 [data-share-trigger] 自带 data-share（竖卡）/ data-og（横卡回退）/ data-title /
     data-url（缺省取当前页）。点击时按该触发器的数据填充弹层，因此同页可有多个入口。 */
  const modal = document.getElementById('share-modal');
  const triggers = document.querySelectorAll('[data-share-trigger]');
  if (modal && triggers.length) {
    const stage = document.getElementById('share-stage');
    const img = document.getElementById('share-card-img');
    const copyBtn = document.getElementById('share-copy');
    const dlLink = document.getElementById('share-download');
    const nativeBtn = document.getElementById('share-native');
    let cur = { card: '', ext: '.jpg', title: document.title, url: location.href };

    const open = (btn) => {
      const card = btn.dataset.share || btn.dataset.og || '';
      const ext = card.endsWith('.png') ? '.png' : '.jpg';
      const title = btn.dataset.title || document.title;
      const url = btn.dataset.url || location.origin + location.pathname;
      cur = { card, ext, title, url };
      // 加载动效 A：先亮玻璃骨架，img 解码完成后淡入替换（消除 pop-in）
      stage?.classList.add('is-loading');
      img.removeAttribute('src');
      img.src = card;
      const done = () => stage?.classList.remove('is-loading');
      if (img.decode) img.decode().then(done).catch(done);
      else { img.onload = done; img.onerror = done; }
      dlLink.href = card;
      dlLink.setAttribute('download', (title.split('·')[0] || 'card').trim() + ext);
      modal.hidden = false;
      copyBtn.textContent = '复制链接';
      copyBtn.focus();
    };
    const close = () => { modal.hidden = true; };

    triggers.forEach((btn) => btn.addEventListener('click', () => open(btn), { signal: sig }));
    document.getElementById('share-close').addEventListener('click', close, { signal: sig });
    modal.addEventListener('pointerdown', (e) => { if (e.target === modal) close(); }, { signal: sig });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) close(); }, { signal: sig });

    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(cur.url);
        copyBtn.textContent = '已复制 ✓';
        setTimeout(() => (copyBtn.textContent = '复制链接'), 1600);
      } catch {
        copyBtn.textContent = cur.url; // 剪贴板被拒时直接亮出链接
      }
    }, { signal: sig });

    if (navigator.share) {
      nativeBtn.hidden = false;
      nativeBtn.addEventListener('click', async () => {
        const payload = { title: cur.title, url: cur.url };
        try {
          // 能带图就带图（iOS/Android 分享面板出卡片）
          const blob = await fetch(cur.card).then((r) => (r.ok ? r.blob() : null));
          if (blob) {
            const file = new File([blob], 'card' + cur.ext, { type: blob.type || 'image/jpeg' });
            if (navigator.canShare?.({ files: [file] })) payload.files = [file];
          }
        } catch { /* 取不到图就纯链接分享 */ }
        try { await navigator.share(payload); } catch { /* 用户取消 */ }
      }, { signal: sig });
    }
  }
}

document.addEventListener('astro:page-load', () => {
  abort?.abort();
  abort = new AbortController();
  init(abort.signal);
});

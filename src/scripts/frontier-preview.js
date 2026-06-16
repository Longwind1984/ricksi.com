// 前沿动态悬浮预览浮层（桌面）：hover 带 data-ft-pop 的元素（时间轴节点 / 信息流条目 / 首页卡）
// → 从页面内 #ft-pop-data（JSON 岛）按 id 取该条数据，定位弹出 星类 + 人物 + 判断 + 摘要节选。
// 纯只读 peek：pointer-events:none，不含交互链接（原文走条目脚部或点击进落地页）。
// 触控设备（无 hover）不启用——那里主操作是点击就地展开。生命周期复刻站内 overlay（AbortController/astro:page-load）。
import { STAR_CLASS } from '../lib/frontier-ui.mjs';

let abort = null;

function init(sig) {
  const pop = document.getElementById('ft-preview');
  const dataEl = document.getElementById('ft-pop-data');
  if (!pop || !dataEl) return;
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return; // 仅桌面

  let data;
  try { data = JSON.parse(dataEl.textContent || '{}'); } catch { return; }

  const el = {
    star: pop.querySelector('.ft-pop-star'),
    owner: pop.querySelector('.ft-pop-owner'),
    meta: pop.querySelector('.ft-pop-meta'),
    title: pop.querySelector('.ft-pop-title'),
    verdict: pop.querySelector('.ft-pop-verdict'),
    summary: pop.querySelector('.ft-pop-summary'),
  };
  let timer = null, anchor = null;

  function fill(d) {
    const sc = STAR_CLASS[d.star] || {};
    el.star.textContent = [sc.sym, sc.zh].filter(Boolean).join(' ');
    el.star.style.setProperty('--sc', sc.color || '#cdd');
    el.owner.textContent = d.o || '';
    el.meta.textContent = [d.t, d.s, (d.d || '').slice(5)].filter(Boolean).join(' · ');
    el.title.textContent = d.ti || '';
    el.verdict.textContent = d.v || '';
    el.summary.textContent = d.su || '';
    el.summary.style.display = d.su ? '' : 'none';
  }
  function place(a) {
    const r = a.getBoundingClientRect();
    const pr = pop.getBoundingClientRect();
    const m = 12;
    let left = r.left + r.width / 2 - pr.width / 2;
    left = Math.max(m, Math.min(left, innerWidth - pr.width - m));
    let top = r.bottom + 10;
    if (top + pr.height > innerHeight - m) top = r.top - pr.height - 10; // 下方放不下→翻到上方
    top = Math.max(m, top);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }
  function show(a, id) {
    const d = data[id];
    if (!d) return;
    anchor = a;
    fill(d);
    place(a); // visibility:hidden 仍占布局，可量尺寸；不依赖 rAF（避免后台标签页节流时不显示）
    pop.classList.add('show');
  }
  function hide() {
    clearTimeout(timer); timer = null; anchor = null;
    pop.classList.remove('show');
  }

  document.addEventListener('pointerover', (e) => {
    const a = e.target.closest?.('[data-ft-pop]');
    if (!a || a === anchor) return;
    if (a.querySelector?.('details[open]')) return; // 已就地展开，不再弹
    clearTimeout(timer);
    timer = setTimeout(() => show(a, a.dataset.ftPop), 200);
  }, { signal: sig });

  document.addEventListener('pointerout', (e) => {
    const a = e.target.closest?.('[data-ft-pop]');
    if (!a) return;
    const to = e.relatedTarget;
    if (to && a.contains(to)) return; // 仍在同一锚点内移动
    if (a === anchor || timer) hide();
  }, { signal: sig });

  addEventListener('scroll', hide, { signal: sig, passive: true });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); }, { signal: sig });
}

document.addEventListener('astro:page-load', () => {
  abort?.abort();
  abort = new AbortController();
  init(abort.signal);
});

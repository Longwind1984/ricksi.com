// 首页 06 足迹 teaser：迷你地球（2D 引擎 mini 模式）懒加载 + 离屏暂停
// 数据：travels-mini.json（坐标+章节位掩码，无名称，轻量）+ earth-night-1k.jpg 地形贴图（共享缓存）
import { loadRelief } from './travel-data.js';

let cleanup = null;
document.addEventListener('astro:before-swap', () => {
  cleanup?.();
  cleanup = null;
});

document.addEventListener('astro:page-load', () => {
  cleanup?.();
  cleanup = null;
  const canvas = document.getElementById('tvh-globe');
  if (!canvas) return;

  let engine = null;
  let observer = null;
  let started = false;

  async function boot() {
    if (started) return;
    started = true;
    const [relief, mini] = await Promise.all([
      loadRelief('1k'),
      fetch('/assets/travels/travels-mini.json').then((r) => r.json()),
    ]);
    const data = {
      pois: mini.p.map(([la, ln, mask]) => ({ la, ln, r: null, ch: [0, 1, 2, 3].filter((c) => (mask >> c) & 1) })),
      cities: mini.c.map(([la, ln, k]) => ({ la, ln, k, ch: [] })),
      chapters: [],
    };
    const { createGlobe2D } = await import('./travel-globe2d.js');
    engine = createGlobe2D(canvas, {
      relief,
      data,
      mini: true,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      onSelectPoi: () => { window.location.href = '/travels/'; },
    });
    /* 点击进入全屏（拖拽不动，轻点跳转） */
    let down = null;
    const onDown = (e) => { down = { x: e.clientX, y: e.clientY }; };
    const onUp = (e) => {
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6) window.location.href = '/travels/';
      down = null;
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);
    cleanup = () => {
      engine?.destroy?.();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      observer?.disconnect();
    };
    /* 离屏暂停渲染（省电） */
    observer = new IntersectionObserver(
      (entries) => engine?.setPaused(!entries[0].isIntersecting),
      { rootMargin: '80px' }
    );
    observer.observe(canvas);
  }

  /* 接近视口才装载（免首屏多两份 fetch） */
  const io = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        io.disconnect();
        boot();
      }
    },
    { rootMargin: '400px' }
  );
  io.observe(canvas);
  const prevCleanup = cleanup;
  cleanup = () => {
    io.disconnect();
    prevCleanup?.();
  };
});

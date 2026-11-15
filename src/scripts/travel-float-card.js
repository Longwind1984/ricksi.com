// 漂浮卡（地理锚定拍立得）：卡片以临界平滑运动拴在球面锚点上——
// 常驻微浮、指针视差倾斜、可拖拽（松手匀速归位，无弹跳）；锚点转到背面则淡出，牵引线随地球旋转实时跟踪。
// 与引擎解耦：引擎每帧推锚点投影（setAnchor），本模块只管运动与牵引线。
export function createFloatCard(stage, cardEl) {
  const M = 14; // 视口边距
  const EASE = 0.16; // 归位趋近系数（临界平滑：单调逼近无过冲，每帧）

  /* 牵引线（tether）：SVG 细线连卡片边缘与球面锚点 */
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'tv-tether');
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  dot.setAttribute('r', '2.5');
  svg.append(line, dot);
  stage.appendChild(svg);

  let open = false;
  let closing = false;
  let raf = 0;
  let anchor = null; // {x,y,facing,inFrame} —— 引擎每帧推送
  let pos = { x: 0, y: 0 };
  let scale = 1, op = 0;
  let drag = null; // {dx,dy,px,py}
  let tilt = { x: 0, y: 0, cx: 0, cy: 0 }; // 目标 tilt / 当前 tilt（lerp）
  let onClosedCb = null;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const size = () => ({ w: cardEl.offsetWidth || 300, h: cardEl.offsetHeight || 200 });

  /* 顶部安全区：站点导航栏（#site-head）浮于全屏舞台之上，卡位永不允许钻进其下（每 500ms 重测，布局抖动可控） */
  let topM = M, topMStamp = -1e9;
  function topSafe(now) {
    if (now - topMStamp < 500) return topM;
    topMStamp = now;
    const head = document.getElementById('site-head');
    const hb = head ? head.getBoundingClientRect().bottom : 0;
    topM = Math.max(M, hb - stage.getBoundingClientRect().top + 12);
    return topM;
  }

  /* 首选卡位：锚点右上；溢出则翻左/翻下；最终钳进视口（上界让开导航栏） */
  function homeFor(ax, ay) {
    const { w, h } = size();
    const W = stage.clientWidth, H = stage.clientHeight;
    const tM = topSafe(performance.now());
    let x = ax + 72, y = ay - h - 34;
    if (x + w > W - M) x = ax - w - 72;
    if (y < tM) y = ay + 40;
    return { x: clamp(x, M, Math.max(M, W - w - M)), y: clamp(y, tM, Math.max(tM, H - h - M)) };
  }

  const away = () => !anchor || anchor.facing < 0.22; // 锚点在球背面/临边 → 卡片退隐

  function frame(now) {
    if (!open && !closing) { raf = 0; return; }
    raf = requestAnimationFrame(frame);
    const t = now / 1000;
    const { w, h } = size();

    /* 归位（拖拽时直接跟手）：临界平滑趋近——单调无过冲，无弹簧振荡 */
    if (drag) {
      pos.x = drag.px - drag.gx;
      pos.y = drag.py - drag.gy;
    } else if (anchor) {
      const hm = homeFor(anchor.x, anchor.y);
      pos.x += (hm.x - pos.x) * EASE;
      pos.y += (hm.y - pos.y) * EASE;
    }

    /* 开合缩放 / 透明度（退隐时压到 0.28） */
    const opT = closing ? 0 : away() ? 0.28 : 1;
    const scT = closing ? 0.06 : 1;
    op += (opT - op) * (closing ? 0.22 : 0.14);
    scale += (scT - scale) * (closing ? 0.24 : 0.12); // 显影趋近：单调无过冲
    if (closing) {
      pos.x += (anchor ? anchor.x - w / 2 - pos.x : 0) * 0.18;
      pos.y += (anchor ? anchor.y - h / 2 - pos.y : 0) * 0.18;
      if (scale < 0.09 || op < 0.02) {
        open = false; closing = false;
        cardEl.hidden = true;
        svg.classList.remove('show');
        const cb = onClosedCb; onClosedCb = null;
        cb?.();
        return;
      }
    }

    /* 常驻微浮 + 视差倾斜（拖拽/关闭时归零） */
    const idle = !drag && !closing ? 1 : 0;
    const bobX = Math.sin(t * 0.9 + 1) * 3 * idle;
    const bobY = Math.sin(t * 1.1) * 4 * idle;
    const rotZ = Math.sin(t * 0.7) * 0.6 * idle;
    tilt.cx += (tilt.x - tilt.cx) * 0.12;
    tilt.cy += (tilt.y - tilt.cy) * 0.12;

    cardEl.style.opacity = op.toFixed(3);
    cardEl.style.transform =
      `translate3d(${(pos.x + bobX).toFixed(1)}px, ${(pos.y + bobY).toFixed(1)}px, 0)` +
      ` scale(${scale.toFixed(3)}) rotate(${rotZ.toFixed(2)}deg)` +
      ` rotateX(${tilt.cy.toFixed(2)}deg) rotateY(${tilt.cx.toFixed(2)}deg)`;

    /* 牵引线：卡片边缘最近点 → 锚点（背面/关闭隐藏） */
    if (anchor && !away() && !closing && op > 0.5) {
      const ex = clamp(anchor.x, pos.x, pos.x + w), ey = clamp(anchor.y, pos.y, pos.y + h);
      line.setAttribute('x1', ex.toFixed(1)); line.setAttribute('y1', ey.toFixed(1));
      line.setAttribute('x2', anchor.x.toFixed(1)); line.setAttribute('y2', anchor.y.toFixed(1));
      dot.setAttribute('cx', anchor.x.toFixed(1)); dot.setAttribute('cy', anchor.y.toFixed(1));
      svg.classList.add('show');
    } else svg.classList.remove('show');
  }

  /* 拖拽：抓卡片空白处（链接/按钮/正文阅读区除外），松手原地匀速归位（无投掷） */
  function onDown(e) {
    if (!open || e.target.closest('a,button,.tv-card-body')) return;
    cardEl.setPointerCapture(e.pointerId);
    drag = { gx: e.clientX - pos.x, gy: e.clientY - pos.y, px: e.clientX, py: e.clientY };
    e.preventDefault();
  }
  function onMove(e) {
    if (!drag) return;
    drag.px = e.clientX; drag.py = e.clientY;
  }
  function onUp() {
    drag = null;
  }
  /* 视差倾斜：指针在卡上时给 ±3.5° 转动，照片内层反向微移 */
  function onTilt(e) {
    if (!open || drag) { tilt.x = 0; tilt.y = 0; return; }
    const r = cardEl.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    tilt.x = nx * 7; tilt.y = -ny * 7;
    const img = cardEl.querySelector('.tv-card-photo');
    if (img) img.style.translate = `${(-nx * 9).toFixed(1)}px ${(-ny * 9).toFixed(1)}px`;
  }
  function offTilt() {
    tilt.x = 0; tilt.y = 0;
    const img = cardEl.querySelector('.tv-card-photo');
    if (img) img.style.translate = '0 0';
  }
  cardEl.addEventListener('pointerdown', onDown);
  cardEl.addEventListener('pointermove', (e) => { onMove(e); onTilt(e); });
  cardEl.addEventListener('pointerup', onUp);
  cardEl.addEventListener('pointercancel', onUp);
  cardEl.addEventListener('pointerleave', offTilt);

  return {
    /* 展开：从锚点显影（scale 0.06→1）；调用前内容须已填好 */
    openAt(pr) {
      anchor = pr;
      cardEl.hidden = false; // 先显示再量尺寸（display:none 时 offsetWidth=0）
      const { w, h } = size();
      pos.x = pr.x - w / 2; pos.y = pr.y - h / 2;
      scale = 0.06; op = 0;
      open = true; closing = false; drag = null;
      if (!raf) raf = requestAnimationFrame(frame);
    },
    /* 引擎每帧锚点投影（{x,y,facing,inFrame}） */
    setAnchor(pr) { anchor = pr; },
    /* 吸回锚点后 hidden；完成后回调一次 */
    close(cb = null) {
      if (!open) { cb?.(); return; }
      onClosedCb = cb;
      closing = true; drag = null;
      offTilt();
      if (!raf) raf = requestAnimationFrame(frame);
    },
    isOpen: () => open,
    destroy() {
      cancelAnimationFrame(raf); raf = 0;
      svg.remove();
    },
  };
}

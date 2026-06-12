import React from 'react';

/* 悬浮液态胶囊导航 (.site-head) — brand left, liquid-lens pill tab bar right,
   search capsule + single tinted CTA. The sliding pill follows the active link
   with the house liquid easing (spring-driven on the real site). */
export function NavBar({
  brand = '司豪杰 Rick Si',
  items = [
    ['projects', '项目'],
    ['workbench', '工作台'],
    ['knowledge', '知识库'],
    ['blog', '写作'],
    ['reading', '阅读'],
  ],
  active: activeProp,
  onNavigate,
  cta = '下载简历',
  ctaHref = '#',
  fixed = true,
  overHero = false,
  showSearch = true,
  style,
}) {
  const [activeState, setActiveState] = React.useState(activeProp ?? items[0]?.[0]);
  const active = activeProp ?? activeState;
  const navRef = React.useRef(null);
  const [pill, setPill] = React.useState({ x: 0, w: 0, on: false });

  const measure = React.useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    const link = nav.querySelector(`[data-tab="${active}"]`);
    if (!link) { setPill((p) => ({ ...p, on: false })); return; }
    const nr = nav.getBoundingClientRect();
    const lr = link.getBoundingClientRect();
    setPill({ x: lr.left - nr.left, w: lr.width, on: true });
  }, [active]);

  React.useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const headStyle = fixed
    ? style
    : { position: 'relative', top: 'auto', left: 'auto', right: 'auto', ...style };

  return (
    <header className={'site-head' + (overHero ? ' over-hero' : '')} style={headStyle}>
      <div className="site-head-inner">
        <a href="#top" className="brand">{brand}</a>
        <nav className="nav" ref={navRef}>
          <span
            className="nav-pill"
            style={{
              opacity: pill.on ? 1 : 0,
              transform: `translateX(${pill.x}px)`,
              width: pill.w,
              transition: 'transform .45s var(--ease-liquid), width .45s var(--ease-liquid), opacity .35s ease',
            }}
          ></span>
          {items.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              data-tab={id}
              className={'nav-link' + (active === id ? ' active' : '')}
              onClick={(e) => {
                if (onNavigate) onNavigate(id, e);
                if (activeProp == null) setActiveState(id);
              }}
            >
              {label}
            </a>
          ))}
          {showSearch ? (
            <button className="nav-search mono" type="button" aria-label="搜索（⌘K 或 /）">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.5" y2="16.5"></line></svg>
              <span className="nav-search-k">⌘K</span>
            </button>
          ) : null}
          {cta ? <a href={ctaHref} className="btn-accent" target="_blank" rel="noreferrer">{cta}</a> : null}
        </nav>
      </div>
    </header>
  );
}

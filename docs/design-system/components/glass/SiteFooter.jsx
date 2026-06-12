import React from 'react';

/* 页脚 (.site-foot) — full-width glass band: headline + mono contact links left,
   big tinted CTA + colophon right. */
export function SiteFooter({
  title = '聊聊 AI 产品。',
  email = 'rick.si@outlook.com',
  github = 'github.com/Longwind1984',
  cta = '下载简历 PDF',
  ctaHref = '#',
  copyright = '© 2026 司豪杰 Rick Si · 本页本身就是作品',
  style,
}) {
  return (
    <footer className="site-foot" style={style}>
      <div className="container foot-inner">
        <div>
          <div className="foot-title">{title}</div>
          <div className="mono foot-links">
            <a href={`mailto:${email}`}>{email}</a>
            <span> · </span>
            <a href={`https://${github}`} target="_blank" rel="noreferrer">{github}</a>
          </div>
        </div>
        <div className="foot-right">
          {cta ? <a href={ctaHref} className="btn-accent big" target="_blank" rel="noreferrer">{cta}</a> : null}
          <div className="mono foot-copy">{copyright}</div>
        </div>
      </div>
    </footer>
  );
}

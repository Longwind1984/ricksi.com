import React from 'react';

/* 玻璃区块头 (.sec-head) — mono accent number, CJK title + mono EN echo, right-aligned desc. */
export function SectionHeader({ no = '01', title, en, desc, href, style }) {
  return (
    <div className="sec-head" style={style}>
      <span className="mono sec-no">{no}</span>
      <div className="sec-title-row">
        <h2 className="sec-title">{href ? <a href={href} className="sec-title-link">{title}</a> : title}</h2>
        {en ? <span className="mono sec-en">{en}</span> : null}
      </div>
      {desc ? <span className="sec-desc">{desc}</span> : null}
    </div>
  );
}

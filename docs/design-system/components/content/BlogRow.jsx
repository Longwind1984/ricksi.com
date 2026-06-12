import React from 'react';

/* 博客行 (.blog-row) — date · title · tag · arrow, baseline-aligned grid. */
export function BlogRow({ date, title, tag, href = '#', style }) {
  return (
    <a href={href} className="blog-row" style={style}>
      <span className="mono blog-date">{date}</span>
      <span className="blog-title">{title}</span>
      {tag ? <span className="tag mono">{tag}</span> : <span></span>}
      <span className="arrow">→</span>
    </a>
  );
}

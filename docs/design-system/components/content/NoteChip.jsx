import React from 'react';

/* 知识库笔记 chip (.kb-note-chip) — capsule note link with accent degree count. */
export function NoteChip({ title, deg, href = '#', featured = false, style }) {
  return (
    <a href={href} className={'kb-note-chip' + (featured ? ' kb-note-featured' : '')} style={style}>
      <span className="kb-note-title">{title}</span>
      {deg != null ? <span className="mono kb-note-deg">{deg}</span> : null}
    </a>
  );
}

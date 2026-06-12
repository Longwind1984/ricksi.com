import React from 'react';

/* 项目行 (.proj-row) — accent number, stroke icon + title + arrow, desc, tag row, cover.
   Whole row is the hover/press target. */
export function ProjectRow({ no = '01', title, desc, tags = [], icon, img, imgAlt = '', href, wip = false, style }) {
  const Row = href && !wip ? 'a' : 'div';
  return (
    <Row className={'proj-row' + (wip ? ' wip' : '')} href={href} target={href ? '_blank' : undefined} rel={href ? 'noreferrer' : undefined} style={style}>
      <span className="proj-no">{no}</span>
      <div>
        <div className="proj-title-row">
          {icon ? <span className="proj-icon" dangerouslySetInnerHTML={{ __html: icon }} /> : null}
          <h3 className="proj-title">{title}</h3>
          {wip ? <span className="tag mono wip-tag">仓库整理中</span> : <span className="arrow">→</span>}
        </div>
        {desc ? <p className="proj-desc">{desc}</p> : null}
        {tags.length ? (
          <div className="tag-row">
            {tags.map((t) => (
              <span key={t} className="tag mono">{t}</span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="ph">
        {img ? <img src={img} alt={imgAlt} loading="lazy" /> : <span className="ph-label">截图整理中</span>}
      </div>
    </Row>
  );
}

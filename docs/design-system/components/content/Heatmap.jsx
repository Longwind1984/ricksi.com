import React from 'react';

/* 多源活跃热力图 (.hm) — 22-week × 7-day grid · 「雪夜→日出」5 档，顶档是金。
   Port of the site's seeded sample generator (seed 5). */
function rng(seed) {
  let t = seed;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function sampleHeatmap(weeks = 22, seed = 5) {
  const rand = rng(seed);
  const out = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const recency = w / weeks;
      const v = rand() * (0.35 + recency * 0.9);
      col.push(v < 0.28 ? 0 : v < 0.48 ? 1 : v < 0.68 ? 2 : v < 0.88 ? 3 : 4);
    }
    out.push(col);
  }
  return out;
}

export function Heatmap({ weeks = 22, data, dims, activeDim, onDimChange, style }) {
  const cols = data ?? sampleHeatmap(weeks);
  const [dim, setDim] = React.useState(activeDim ?? (dims ? dims[0][0] : null));
  return (
    <div style={style}>
      <div className="hm">
        {cols.map((col, w) => (
          <div className="hm-col" key={w}>
            {col.map((l, d) => (
              <span key={d} className={`hm-cell l${l}`}></span>
            ))}
          </div>
        ))}
      </div>
      {dims ? (
        <div className="hm-dims mono">
          {dims.map(([key, label]) => (
            <button
              key={key}
              className={'hm-dim' + ((activeDim ?? dim) === key ? ' active' : '')}
              onClick={() => { setDim(key); if (onDimChange) onDimChange(key); }}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

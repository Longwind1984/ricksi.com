import React from 'react';

/* 统计数字 (.stat-k / .stat-v) — mono letterspaced label over big tabular display number. */
export function Stat({ label, value, unit, sub, size = 'default', style }) {
  return (
    <div style={style}>
      <div className="mono stat-k">{label}</div>
      {size === 'big' ? (
        <span className="wb-static-num">{value}</span>
      ) : (
        <div className={size === 'kg' ? 'kg-stat-v' : 'stat-v'}>
          {value}
          {unit ? <span className="stat-unit">{unit}</span> : null}
        </div>
      )}
      {sub ? <div className="mono wb-sub">{sub}</div> : null}
    </div>
  );
}

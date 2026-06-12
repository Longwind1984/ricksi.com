import React from 'react';

/* Capsule glass search input (知识图谱搜索 / ⌘K trigger style). */
export function SearchInput({ placeholder = '搜索…', hint, value, onChange, style, ...rest }) {
  return (
    <div className="kg-search-row" style={{ marginBottom: 0, ...style }}>
      <input
        className="kg-search mono"
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        {...rest}
      />
      {hint ? <span className="mono kg-search-hint">{hint}</span> : null}
    </div>
  );
}

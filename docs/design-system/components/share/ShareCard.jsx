import React from 'react';

/* 分享卡片 (.shc) — 方向一「玻璃明信片」:站点语言的直接延伸,
   把一块钴蓝玻璃连同雪山风景一起寄出去。
   竖版 360×640(导出 @2x = 720×1280),三种内容形态:
   - node:    知识库节点(kicker + 标题 + 摘录 + 来源徽章 + 主题域 chip)
   - article: 思考与写作(文楷引文 = 人的声音 + 字数/时长)
   - site:    整站名片(三格数据条)
   底部统一:URL + 钩子文案 + QR 位。qr 传图片地址,缺省渲染占位格。 */

function Qr({ src }) {
  return (
    <div className="shc-qr">
      {src ? <img src={src} alt="二维码" /> : <div className="shc-qr-ph"><i></i></div>}
    </div>
  );
}

export function ShareCard({
  variant = 'node',
  brand = 'RICK SI',
  module: mod,
  kicker,
  title,
  excerpt,
  quote,
  badges,
  chips,
  stats,
  url,
  hook,
  qr,
  photoPosition,
  credit = '云海之上 · 无人机自摄',
  style,
}) {
  const pos = photoPosition || (variant === 'site' ? 'center 34%' : variant === 'article' ? '58% 30%' : '30% 26%');
  return (
    <div className={'shc shc-' + variant} style={{ backgroundPosition: pos, ...style }}>
      <div className="shc-top">
        <span className="shc-brand mono">{brand}</span>
        {mod ? <span className="shc-mod mono">{mod}</span> : null}
      </div>
      <div className="shc-body">
        {kicker ? <div className="shc-kicker mono">{kicker}</div> : null}
        <h2 className="shc-title">{title}</h2>
        {quote ? <p className="shc-quote">{quote}</p> : null}
        {excerpt ? <p className="shc-excerpt">{excerpt}</p> : null}
        {badges || chips ? (
          <div className="shc-meta">
            {badges}
            {(chips || []).map((c, i) => (
              <span key={i} className="shc-chip mono">
                {c.color ? <span className="shc-dot" style={{ background: c.color }}></span> : null}
                {c.label || c}
              </span>
            ))}
          </div>
        ) : null}
        {stats && stats.length ? (
          <div className="shc-stats">
            {stats.map((s, i) => (
              <div key={i} className="shc-stat">
                <div className="v mono" style={s.gold ? { color: 'var(--gold)' } : null}>{s.value}</div>
                <div className="k mono">{s.label}</div>
              </div>
            ))}
          </div>
        ) : null}
        <div className="shc-foot">
          <div className="shc-url mono">
            <b>{url}</b>
            {hook}
          </div>
          <Qr src={qr} />
        </div>
      </div>
      <div className="shc-credit mono">{credit}</div>
    </div>
  );
}

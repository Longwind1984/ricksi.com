import React from 'react';

/* Capsule badges & chips — 人机光谱：色温 = 人↔机(暖→冷)；虚线 = 未验证。
   - tag: neutral tech-stack chip (项目标签)
   - sample: 金橙虚线「样例数据」— flags fallback/sample data
   - prov-human / prov-co / prov-ai: 来源三档(实测·金 / 共创·青 / AI·紫)
   - wip: dashed neutral 「仓库整理中」 */
export function Badge({ variant = 'tag', children, style, ...rest }) {
  if (variant === 'sample') {
    return <em className="sample-badge" style={{ ...style }} {...rest}>{children ?? '样例数据'}</em>;
  }
  if (variant === 'prov-ai' || variant === 'prov-co' || variant === 'prov-human') {
    const cls = variant === 'prov-ai' ? 'ai' : variant === 'prov-co' ? 'co' : 'human';
    return (
      <span className={'prov-badge ' + cls} style={style} {...rest}>
        {children}
      </span>
    );
  }
  if (variant === 'wip') {
    return <span className="tag mono wip-tag" style={style} {...rest}>{children ?? '仓库整理中'}</span>;
  }
  return <span className="tag mono" style={style} {...rest}>{children}</span>;
}

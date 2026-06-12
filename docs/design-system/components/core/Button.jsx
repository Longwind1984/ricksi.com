import React from 'react';

/* Liquid Glass buttons.
   - accent: the ONLY tinted control in the system (HIG: tint primary actions only).
     Translucent accent glass; press = scale down + brighten ("energize with light").
   - ghost: capsule glass button (展开全部 / 复制链接 style), mono label. */
export function Button({ variant = 'accent', size = 'default', href, target, children, style, ...rest }) {
  const isGhost = variant === 'ghost';
  const className = isGhost
    ? 'proj-expand mono'
    : 'btn-accent' + (size === 'big' ? ' big' : '');
  // btn-accent carries margin-left from its nav context; neutralize standalone.
  const mergedStyle = { marginLeft: 0, ...(isGhost ? { display: 'inline-flex', alignItems: 'center' } : {}), ...style };
  if (href) {
    return (
      <a href={href} target={target} rel={target === '_blank' ? 'noreferrer' : undefined} className={className} style={mergedStyle} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={className} style={mergedStyle} {...rest}>
      {children}
    </button>
  );
}

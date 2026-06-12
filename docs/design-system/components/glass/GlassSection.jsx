import React from 'react';

/* Glass surfaces:
   - section: the big content section glass (.sec) — main page building block
   - index: hero index card glass (lighter, .hero-index.glass)
   - card: dark inset card (.kg-paper style surface inside sections) */
export function GlassSection({ variant = 'section', id, children, style, ...rest }) {
  if (variant === 'index') {
    return (
      <aside className="hero-index glass" id={id} style={style} {...rest}>
        {children}
      </aside>
    );
  }
  if (variant === 'card') {
    return (
      <div className="kg-paper" id={id} style={style} {...rest}>
        {children}
      </div>
    );
  }
  return (
    <section className="sec" id={id} style={style} {...rest}>
      {children}
    </section>
  );
}

/* @ds-bundle: {"format":3,"namespace":"RickSiLiquidGlassDesignSystem_d0ba20","components":[{"name":"BlogRow","sourcePath":"components/content/BlogRow.jsx"},{"name":"Heatmap","sourcePath":"components/content/Heatmap.jsx"},{"name":"NoteChip","sourcePath":"components/content/NoteChip.jsx"},{"name":"ProjectRow","sourcePath":"components/content/ProjectRow.jsx"},{"name":"SectionHeader","sourcePath":"components/content/SectionHeader.jsx"},{"name":"Stat","sourcePath":"components/content/Stat.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"SearchInput","sourcePath":"components/core/SearchInput.jsx"},{"name":"GlassSection","sourcePath":"components/glass/GlassSection.jsx"},{"name":"NavBar","sourcePath":"components/glass/NavBar.jsx"},{"name":"SiteFooter","sourcePath":"components/glass/SiteFooter.jsx"},{"name":"ShareCard","sourcePath":"components/share/ShareCard.jsx"},{"name":"WorkbenchData","sourcePath":"ui_kits/workbench/WorkbenchData.jsx"},{"name":"WorkbenchHero","sourcePath":"ui_kits/workbench/WorkbenchHero.jsx"},{"name":"WorkbenchHome","sourcePath":"ui_kits/workbench/WorkbenchHome.jsx"},{"name":"WorkbenchKnowledge","sourcePath":"ui_kits/workbench/WorkbenchKnowledge.jsx"},{"name":"WORKBENCH_PROJECTS","sourcePath":"ui_kits/workbench/WorkbenchProjects.jsx"},{"name":"WorkbenchProjects","sourcePath":"ui_kits/workbench/WorkbenchProjects.jsx"},{"name":"WorkbenchWriting","sourcePath":"ui_kits/workbench/WorkbenchWriting.jsx"},{"name":"WorkbenchReading","sourcePath":"ui_kits/workbench/WorkbenchWriting.jsx"}],"sourceHashes":{"components/content/BlogRow.jsx":"946086086e4f","components/content/Heatmap.jsx":"5cfd2be468ff","components/content/NoteChip.jsx":"7316e4373a46","components/content/ProjectRow.jsx":"8e86ddbb6883","components/content/SectionHeader.jsx":"3f9c75bbeb9f","components/content/Stat.jsx":"e56d8e4224f9","components/core/Badge.jsx":"ff7526b904b9","components/core/Button.jsx":"f3809dadeaa4","components/core/SearchInput.jsx":"02f255d7e1bf","components/glass/GlassSection.jsx":"9c8f94b44d30","components/glass/NavBar.jsx":"538c294d2472","components/glass/SiteFooter.jsx":"c1f18a3a8bc8","components/share/ShareCard.jsx":"d6757d01c8e4","ui_kits/workbench/WorkbenchData.jsx":"ba7989ebe103","ui_kits/workbench/WorkbenchHero.jsx":"df7394868384","ui_kits/workbench/WorkbenchHome.jsx":"831be003aba4","ui_kits/workbench/WorkbenchKnowledge.jsx":"e6d600d99288","ui_kits/workbench/WorkbenchProjects.jsx":"ebf06021efa9","ui_kits/workbench/WorkbenchWriting.jsx":"388c64445781"},"inlinedExternals":[],"unexposedExports":[{"name":"sampleHeatmap","sourcePath":"components/content/Heatmap.jsx"}]} */

(() => {

const __ds_ns = (window.RickSiLiquidGlassDesignSystem_d0ba20 = window.RickSiLiquidGlassDesignSystem_d0ba20 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/content/BlogRow.jsx
try { (() => {
/* 博客行 (.blog-row) — date · title · tag · arrow, baseline-aligned grid. */
function BlogRow({
  date,
  title,
  tag,
  href = '#',
  style
}) {
  return /*#__PURE__*/React.createElement("a", {
    href: href,
    className: "blog-row",
    style: style
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono blog-date"
  }, date), /*#__PURE__*/React.createElement("span", {
    className: "blog-title"
  }, title), tag ? /*#__PURE__*/React.createElement("span", {
    className: "tag mono"
  }, tag) : /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", {
    className: "arrow"
  }, "\u2192"));
}
Object.assign(__ds_scope, { BlogRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/BlogRow.jsx", error: String((e && e.message) || e) }); }

// components/content/Heatmap.jsx
try { (() => {
/* 多源活跃热力图 (.hm) — 22-week × 7-day grid · 「雪夜→日出」5 档，顶档是金。
   Port of the site's seeded sample generator (seed 5). */
function rng(seed) {
  let t = seed;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ t >>> 15, 1 | t);
    r ^= r + Math.imul(r ^ r >>> 7, 61 | r);
    return ((r ^ r >>> 14) >>> 0) / 4294967296;
  };
}
function sampleHeatmap(weeks = 22, seed = 5) {
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
function Heatmap({
  weeks = 22,
  data,
  dims,
  activeDim,
  onDimChange,
  style
}) {
  const cols = data ?? sampleHeatmap(weeks);
  const [dim, setDim] = React.useState(activeDim ?? (dims ? dims[0][0] : null));
  return /*#__PURE__*/React.createElement("div", {
    style: style
  }, /*#__PURE__*/React.createElement("div", {
    className: "hm"
  }, cols.map((col, w) => /*#__PURE__*/React.createElement("div", {
    className: "hm-col",
    key: w
  }, col.map((l, d) => /*#__PURE__*/React.createElement("span", {
    key: d,
    className: `hm-cell l${l}`
  }))))), dims ? /*#__PURE__*/React.createElement("div", {
    className: "hm-dims mono"
  }, dims.map(([key, label]) => /*#__PURE__*/React.createElement("button", {
    key: key,
    className: 'hm-dim' + ((activeDim ?? dim) === key ? ' active' : ''),
    onClick: () => {
      setDim(key);
      if (onDimChange) onDimChange(key);
    }
  }, label))) : null);
}
Object.assign(__ds_scope, { sampleHeatmap, Heatmap });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/Heatmap.jsx", error: String((e && e.message) || e) }); }

// components/content/NoteChip.jsx
try { (() => {
/* 知识库笔记 chip (.kb-note-chip) — capsule note link with accent degree count. */
function NoteChip({
  title,
  deg,
  href = '#',
  featured = false,
  style
}) {
  return /*#__PURE__*/React.createElement("a", {
    href: href,
    className: 'kb-note-chip' + (featured ? ' kb-note-featured' : ''),
    style: style
  }, /*#__PURE__*/React.createElement("span", {
    className: "kb-note-title"
  }, title), deg != null ? /*#__PURE__*/React.createElement("span", {
    className: "mono kb-note-deg"
  }, deg) : null);
}
Object.assign(__ds_scope, { NoteChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/NoteChip.jsx", error: String((e && e.message) || e) }); }

// components/content/ProjectRow.jsx
try { (() => {
/* 项目行 (.proj-row) — accent number, stroke icon + title + arrow, desc, tag row, cover.
   Whole row is the hover/press target. */
function ProjectRow({
  no = '01',
  title,
  desc,
  tags = [],
  icon,
  img,
  imgAlt = '',
  href,
  wip = false,
  style
}) {
  const Row = href && !wip ? 'a' : 'div';
  return /*#__PURE__*/React.createElement(Row, {
    className: 'proj-row' + (wip ? ' wip' : ''),
    href: href,
    target: href ? '_blank' : undefined,
    rel: href ? 'noreferrer' : undefined,
    style: style
  }, /*#__PURE__*/React.createElement("span", {
    className: "proj-no"
  }, no), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "proj-title-row"
  }, icon ? /*#__PURE__*/React.createElement("span", {
    className: "proj-icon",
    dangerouslySetInnerHTML: {
      __html: icon
    }
  }) : null, /*#__PURE__*/React.createElement("h3", {
    className: "proj-title"
  }, title), wip ? /*#__PURE__*/React.createElement("span", {
    className: "tag mono wip-tag"
  }, "\u4ED3\u5E93\u6574\u7406\u4E2D") : /*#__PURE__*/React.createElement("span", {
    className: "arrow"
  }, "\u2192")), desc ? /*#__PURE__*/React.createElement("p", {
    className: "proj-desc"
  }, desc) : null, tags.length ? /*#__PURE__*/React.createElement("div", {
    className: "tag-row"
  }, tags.map(t => /*#__PURE__*/React.createElement("span", {
    key: t,
    className: "tag mono"
  }, t))) : null), /*#__PURE__*/React.createElement("div", {
    className: "ph"
  }, img ? /*#__PURE__*/React.createElement("img", {
    src: img,
    alt: imgAlt,
    loading: "lazy"
  }) : /*#__PURE__*/React.createElement("span", {
    className: "ph-label"
  }, "\u622A\u56FE\u6574\u7406\u4E2D")));
}
Object.assign(__ds_scope, { ProjectRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/ProjectRow.jsx", error: String((e && e.message) || e) }); }

// components/content/SectionHeader.jsx
try { (() => {
/* 玻璃区块头 (.sec-head) — mono accent number, CJK title + mono EN echo, right-aligned desc. */
function SectionHeader({
  no = '01',
  title,
  en,
  desc,
  href,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "sec-head",
    style: style
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono sec-no"
  }, no), /*#__PURE__*/React.createElement("div", {
    className: "sec-title-row"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "sec-title"
  }, href ? /*#__PURE__*/React.createElement("a", {
    href: href,
    className: "sec-title-link"
  }, title) : title), en ? /*#__PURE__*/React.createElement("span", {
    className: "mono sec-en"
  }, en) : null), desc ? /*#__PURE__*/React.createElement("span", {
    className: "sec-desc"
  }, desc) : null);
}
Object.assign(__ds_scope, { SectionHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/SectionHeader.jsx", error: String((e && e.message) || e) }); }

// components/content/Stat.jsx
try { (() => {
/* 统计数字 (.stat-k / .stat-v) — mono letterspaced label over big tabular display number. */
function Stat({
  label,
  value,
  unit,
  sub,
  size = 'default',
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: style
  }, /*#__PURE__*/React.createElement("div", {
    className: "mono stat-k"
  }, label), size === 'big' ? /*#__PURE__*/React.createElement("span", {
    className: "wb-static-num"
  }, value) : /*#__PURE__*/React.createElement("div", {
    className: size === 'kg' ? 'kg-stat-v' : 'stat-v'
  }, value, unit ? /*#__PURE__*/React.createElement("span", {
    className: "stat-unit"
  }, unit) : null), sub ? /*#__PURE__*/React.createElement("div", {
    className: "mono wb-sub"
  }, sub) : null);
}
Object.assign(__ds_scope, { Stat });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/Stat.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Capsule badges & chips — 人机光谱：色温 = 人↔机(暖→冷)；虚线 = 未验证。
   - tag: neutral tech-stack chip (项目标签)
   - sample: 金橙虚线「样例数据」— flags fallback/sample data
   - prov-human / prov-co / prov-ai: 来源三档(实测·金 / 共创·青 / AI·紫)
   - wip: dashed neutral 「仓库整理中」 */
function Badge({
  variant = 'tag',
  children,
  style,
  ...rest
}) {
  if (variant === 'sample') {
    return /*#__PURE__*/React.createElement("em", _extends({
      className: "sample-badge",
      style: {
        ...style
      }
    }, rest), children ?? '样例数据');
  }
  if (variant === 'prov-ai' || variant === 'prov-co' || variant === 'prov-human') {
    const cls = variant === 'prov-ai' ? 'ai' : variant === 'prov-co' ? 'co' : 'human';
    return /*#__PURE__*/React.createElement("span", _extends({
      className: 'prov-badge ' + cls,
      style: style
    }, rest), children);
  }
  if (variant === 'wip') {
    return /*#__PURE__*/React.createElement("span", _extends({
      className: "tag mono wip-tag",
      style: style
    }, rest), children ?? '仓库整理中');
  }
  return /*#__PURE__*/React.createElement("span", _extends({
    className: "tag mono",
    style: style
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Liquid Glass buttons.
   - accent: the ONLY tinted control in the system (HIG: tint primary actions only).
     Translucent accent glass; press = scale down + brighten ("energize with light").
   - ghost: capsule glass button (展开全部 / 复制链接 style), mono label. */
function Button({
  variant = 'accent',
  size = 'default',
  href,
  target,
  children,
  style,
  ...rest
}) {
  const isGhost = variant === 'ghost';
  const className = isGhost ? 'proj-expand mono' : 'btn-accent' + (size === 'big' ? ' big' : '');
  // btn-accent carries margin-left from its nav context; neutralize standalone.
  const mergedStyle = {
    marginLeft: 0,
    ...(isGhost ? {
      display: 'inline-flex',
      alignItems: 'center'
    } : {}),
    ...style
  };
  if (href) {
    return /*#__PURE__*/React.createElement("a", _extends({
      href: href,
      target: target,
      rel: target === '_blank' ? 'noreferrer' : undefined,
      className: className,
      style: mergedStyle
    }, rest), children);
  }
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    className: className,
    style: mergedStyle
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/SearchInput.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Capsule glass search input (知识图谱搜索 / ⌘K trigger style). */
function SearchInput({
  placeholder = '搜索…',
  hint,
  value,
  onChange,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "kg-search-row",
    style: {
      marginBottom: 0,
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    className: "kg-search mono",
    type: "search",
    placeholder: placeholder,
    value: value,
    onChange: onChange
  }, rest)), hint ? /*#__PURE__*/React.createElement("span", {
    className: "mono kg-search-hint"
  }, hint) : null);
}
Object.assign(__ds_scope, { SearchInput });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/SearchInput.jsx", error: String((e && e.message) || e) }); }

// components/glass/GlassSection.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Glass surfaces:
   - section: the big content section glass (.sec) — main page building block
   - index: hero index card glass (lighter, .hero-index.glass)
   - card: dark inset card (.kg-paper style surface inside sections) */
function GlassSection({
  variant = 'section',
  id,
  children,
  style,
  ...rest
}) {
  if (variant === 'index') {
    return /*#__PURE__*/React.createElement("aside", _extends({
      className: "hero-index glass",
      id: id,
      style: style
    }, rest), children);
  }
  if (variant === 'card') {
    return /*#__PURE__*/React.createElement("div", _extends({
      className: "kg-paper",
      id: id,
      style: style
    }, rest), children);
  }
  return /*#__PURE__*/React.createElement("section", _extends({
    className: "sec",
    id: id,
    style: style
  }, rest), children);
}
Object.assign(__ds_scope, { GlassSection });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/glass/GlassSection.jsx", error: String((e && e.message) || e) }); }

// components/glass/NavBar.jsx
try { (() => {
/* 悬浮液态胶囊导航 (.site-head) — brand left, liquid-lens pill tab bar right,
   search capsule + single tinted CTA. The sliding pill follows the active link
   with the house liquid easing (spring-driven on the real site). */
function NavBar({
  brand = '司豪杰 Rick Si',
  items = [['projects', '项目'], ['workbench', '工作台'], ['knowledge', '知识库'], ['blog', '写作'], ['reading', '阅读']],
  active: activeProp,
  onNavigate,
  cta = '下载简历',
  ctaHref = '#',
  fixed = true,
  overHero = false,
  showSearch = true,
  style
}) {
  const [activeState, setActiveState] = React.useState(activeProp ?? items[0]?.[0]);
  const active = activeProp ?? activeState;
  const navRef = React.useRef(null);
  const [pill, setPill] = React.useState({
    x: 0,
    w: 0,
    on: false
  });
  const measure = React.useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    const link = nav.querySelector(`[data-tab="${active}"]`);
    if (!link) {
      setPill(p => ({
        ...p,
        on: false
      }));
      return;
    }
    const nr = nav.getBoundingClientRect();
    const lr = link.getBoundingClientRect();
    setPill({
      x: lr.left - nr.left,
      w: lr.width,
      on: true
    });
  }, [active]);
  React.useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);
  const headStyle = fixed ? style : {
    position: 'relative',
    top: 'auto',
    left: 'auto',
    right: 'auto',
    ...style
  };
  return /*#__PURE__*/React.createElement("header", {
    className: 'site-head' + (overHero ? ' over-hero' : ''),
    style: headStyle
  }, /*#__PURE__*/React.createElement("div", {
    className: "site-head-inner"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#top",
    className: "brand"
  }, brand), /*#__PURE__*/React.createElement("nav", {
    className: "nav",
    ref: navRef
  }, /*#__PURE__*/React.createElement("span", {
    className: "nav-pill",
    style: {
      opacity: pill.on ? 1 : 0,
      transform: `translateX(${pill.x}px)`,
      width: pill.w,
      transition: 'transform .45s var(--ease-liquid), width .45s var(--ease-liquid), opacity .35s ease'
    }
  }), items.map(([id, label]) => /*#__PURE__*/React.createElement("a", {
    key: id,
    href: `#${id}`,
    "data-tab": id,
    className: 'nav-link' + (active === id ? ' active' : ''),
    onClick: e => {
      if (onNavigate) onNavigate(id, e);
      if (activeProp == null) setActiveState(id);
    }
  }, label)), showSearch ? /*#__PURE__*/React.createElement("button", {
    className: "nav-search mono",
    type: "button",
    "aria-label": "\u641C\u7D22\uFF08\u2318K \u6216 /\uFF09"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "13",
    height: "13",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.4",
    strokeLinecap: "round",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "7"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "21",
    y1: "21",
    x2: "16.5",
    y2: "16.5"
  })), /*#__PURE__*/React.createElement("span", {
    className: "nav-search-k"
  }, "\u2318K")) : null, cta ? /*#__PURE__*/React.createElement("a", {
    href: ctaHref,
    className: "btn-accent",
    target: "_blank",
    rel: "noreferrer"
  }, cta) : null)));
}
Object.assign(__ds_scope, { NavBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/glass/NavBar.jsx", error: String((e && e.message) || e) }); }

// components/glass/SiteFooter.jsx
try { (() => {
/* 页脚 (.site-foot) — full-width glass band: headline + mono contact links left,
   big tinted CTA + colophon right. */
function SiteFooter({
  title = '聊聊 AI 产品。',
  email = 'rick.si@outlook.com',
  github = 'github.com/Longwind1984',
  cta = '下载简历 PDF',
  ctaHref = '#',
  copyright = '© 2026 司豪杰 Rick Si · 本页本身就是作品',
  style
}) {
  return /*#__PURE__*/React.createElement("footer", {
    className: "site-foot",
    style: style
  }, /*#__PURE__*/React.createElement("div", {
    className: "container foot-inner"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "foot-title"
  }, title), /*#__PURE__*/React.createElement("div", {
    className: "mono foot-links"
  }, /*#__PURE__*/React.createElement("a", {
    href: `mailto:${email}`
  }, email), /*#__PURE__*/React.createElement("span", null, " \xB7 "), /*#__PURE__*/React.createElement("a", {
    href: `https://${github}`,
    target: "_blank",
    rel: "noreferrer"
  }, github))), /*#__PURE__*/React.createElement("div", {
    className: "foot-right"
  }, cta ? /*#__PURE__*/React.createElement("a", {
    href: ctaHref,
    className: "btn-accent big",
    target: "_blank",
    rel: "noreferrer"
  }, cta) : null, /*#__PURE__*/React.createElement("div", {
    className: "mono foot-copy"
  }, copyright))));
}
Object.assign(__ds_scope, { SiteFooter });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/glass/SiteFooter.jsx", error: String((e && e.message) || e) }); }

// components/share/ShareCard.jsx
try { (() => {
/* 分享卡片 (.shc) — 方向一「玻璃明信片」:站点语言的直接延伸,
   把一块钴蓝玻璃连同雪山风景一起寄出去。
   竖版 360×640(导出 @2x = 720×1280),三种内容形态:
   - node:    知识库节点(kicker + 标题 + 摘录 + 来源徽章 + 主题域 chip)
   - article: 思考与写作(文楷引文 = 人的声音 + 字数/时长)
   - site:    整站名片(三格数据条)
   底部统一:URL + 钩子文案 + QR 位。qr 传图片地址,缺省渲染占位格。 */

function Qr({
  src
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "shc-qr"
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: "\u4E8C\u7EF4\u7801"
  }) : /*#__PURE__*/React.createElement("div", {
    className: "shc-qr-ph"
  }, /*#__PURE__*/React.createElement("i", null)));
}
function ShareCard({
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
  style
}) {
  const pos = photoPosition || (variant === 'site' ? 'center 34%' : variant === 'article' ? '58% 30%' : '30% 26%');
  return /*#__PURE__*/React.createElement("div", {
    className: 'shc shc-' + variant,
    style: {
      backgroundPosition: pos,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "shc-top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "shc-brand mono"
  }, brand), mod ? /*#__PURE__*/React.createElement("span", {
    className: "shc-mod mono"
  }, mod) : null), /*#__PURE__*/React.createElement("div", {
    className: "shc-body"
  }, kicker ? /*#__PURE__*/React.createElement("div", {
    className: "shc-kicker mono"
  }, kicker) : null, /*#__PURE__*/React.createElement("h2", {
    className: "shc-title"
  }, title), quote ? /*#__PURE__*/React.createElement("p", {
    className: "shc-quote"
  }, quote) : null, excerpt ? /*#__PURE__*/React.createElement("p", {
    className: "shc-excerpt"
  }, excerpt) : null, badges || chips ? /*#__PURE__*/React.createElement("div", {
    className: "shc-meta"
  }, badges, (chips || []).map((c, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: "shc-chip mono"
  }, c.color ? /*#__PURE__*/React.createElement("span", {
    className: "shc-dot",
    style: {
      background: c.color
    }
  }) : null, c.label || c))) : null, stats && stats.length ? /*#__PURE__*/React.createElement("div", {
    className: "shc-stats"
  }, stats.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "shc-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v mono",
    style: s.gold ? {
      color: 'var(--gold)'
    } : null
  }, s.value), /*#__PURE__*/React.createElement("div", {
    className: "k mono"
  }, s.label)))) : null, /*#__PURE__*/React.createElement("div", {
    className: "shc-foot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shc-url mono"
  }, /*#__PURE__*/React.createElement("b", null, url), hook), /*#__PURE__*/React.createElement(Qr, {
    src: qr
  }))), /*#__PURE__*/React.createElement("div", {
    className: "shc-credit mono"
  }, credit));
}
Object.assign(__ds_scope, { ShareCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/share/ShareCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workbench/WorkbenchData.jsx
try { (() => {
/* Sample 14-day trend (design-comp values from src/lib/sample.js). */
const DAYS14 = [0.6, 1.1, 0.9, 1.6, 0.7, 1.3, 2.0, 0.9, 1.4, 2.2, 0.7, 1.1, 1.8, 1.25].map((v, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (13 - i));
  return {
    label: i === 13 ? '今天' : `${d.getMonth() + 1}/${d.getDate()}`,
    v
  };
});
function TrendBars({
  days
}) {
  const max = Math.max(...days.map(d => d.v));
  return /*#__PURE__*/React.createElement("div", {
    className: "tk-bars"
  }, days.map((d, i) => /*#__PURE__*/React.createElement("div", {
    className: "tk-day",
    key: i,
    title: `${d.label} · ${d.v}M tokens`
  }, /*#__PURE__*/React.createElement("span", {
    className: 'tk-bar' + (i === days.length - 1 ? ' today' : ''),
    style: {
      height: Math.max(5, Math.round(d.v / max * 100)) + '%'
    }
  }), i % 3 === 1 ? /*#__PURE__*/React.createElement("span", {
    className: "tk-label"
  }, d.label) : /*#__PURE__*/React.createElement("span", {
    className: "tk-label"
  }, "\xA0"))));
}
function WorkbenchData() {
  return /*#__PURE__*/React.createElement(__ds_scope.GlassSection, {
    id: "workbench",
    "data-screen-label": "02 \u5DE5\u4F5C\u53F0\u6570\u636E"
  }, /*#__PURE__*/React.createElement(__ds_scope.SectionHeader, {
    no: "02",
    title: "\u5DE5\u4F5C\u53F0\u6570\u636E",
    en: "WORKBENCH \xB7 DAILY",
    desc: "5 \u6708\u5E95\u4EE5\u6765\u9010\u65E5\u5B9E\u6D4B\uFF1B\u66F4\u65E9\u90E8\u5206\u6309\u516C\u5F00\u53E3\u5F84\u4F30\u7B97\u5E76\u6807\u660E"
  }), /*#__PURE__*/React.createElement("div", {
    className: "wb-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wb-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mono wb-label"
  }, "\u4ECA\u65E5 TOKEN \u7528\u91CF", /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    variant: "sample"
  })), /*#__PURE__*/React.createElement("span", {
    className: "wb-static-num"
  }, "1,247,832"), /*#__PURE__*/React.createElement("div", {
    className: "mono wb-sub",
    style: {
      color: 'var(--gold-dim)'
    }
  }, "\u5168\u53E3\u5F84\uFF08\u542B\u7F13\u5B58\u8BFB\u5199 41%\uFF09\xB7 \u5176\u4E2D\u6A21\u578B\u8F93\u51FA 89K"), /*#__PURE__*/React.createElement("div", {
    className: "wb-stat-row"
  }, /*#__PURE__*/React.createElement(__ds_scope.Stat, {
    label: "\u672C\u5468",
    value: "8.7M",
    unit: "tokens"
  }), /*#__PURE__*/React.createElement(__ds_scope.Stat, {
    label: "\u7D2F\u8BA1",
    value: "142M",
    unit: "tokens"
  })), /*#__PURE__*/React.createElement("div", {
    className: "wb-models"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono wb-model"
  }, "Opus ", /*#__PURE__*/React.createElement("b", null, "38%")), /*#__PURE__*/React.createElement("span", {
    className: "mono wb-model"
  }, "Sonnet ", /*#__PURE__*/React.createElement("b", null, "54%")), /*#__PURE__*/React.createElement("span", {
    className: "mono wb-model"
  }, "Haiku ", /*#__PURE__*/React.createElement("b", null, "8%"))), /*#__PURE__*/React.createElement("div", {
    className: "mono wb-stamp"
  }, "\u6570\u636E\u66F4\u65B0\u4E8E 2026-06-12 21:30 \xB7 \u53E3\u5F84 v2")), /*#__PURE__*/React.createElement("div", {
    className: "wb-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mono wb-label"
  }, "\u8FD1 14 \u65E5\u7528\u91CF\u8D8B\u52BF\uFF08M TOKENS\uFF09", /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    variant: "sample"
  })), /*#__PURE__*/React.createElement(TrendBars, {
    days: DAYS14
  })), /*#__PURE__*/React.createElement("div", {
    className: "wb-col no-border"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mono wb-label"
  }, "\u591A\u6E90\u6D3B\u8DC3 \xB7 \u8FD1 22 \u5468", /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    variant: "sample"
  })), /*#__PURE__*/React.createElement(__ds_scope.Heatmap, {
    dims: [['all', '全部'], ['git', '代码提交'], ['notes', '笔记'], ['ai', 'AI 会话'], ['gh', 'GitHub']]
  }), /*#__PURE__*/React.createElement("div", {
    className: "wb-stat-row"
  }, /*#__PURE__*/React.createElement(__ds_scope.Stat, {
    label: "\u63D0\u4EA4",
    value: "486",
    unit: "commits"
  }), /*#__PURE__*/React.createElement(__ds_scope.Stat, {
    label: "\u8FDE\u7EED",
    value: "37",
    unit: "\u5929"
  }), /*#__PURE__*/React.createElement(__ds_scope.Stat, {
    label: "\u4ED3\u5E93",
    value: "9",
    unit: "\u4E2A"
  })))));
}
Object.assign(__ds_scope, { WorkbenchData });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workbench/WorkbenchData.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workbench/WorkbenchHero.jsx
try { (() => {
/* Hero — full-bleed photo (site background) with title bottom-left, index glass card bottom-right. */
function WorkbenchHero({
  onNavigate
}) {
  const index = [['projects', '01', '项目', "What I've built · 5"], ['workbench', '02', '工作台数据', 'Tokens & activity'], ['knowledge', '03', '知识库图谱', "What I've learned"], ['blog', '04', '思考与写作', "What I've been thinking"], ['reading', '05', '阅读', "What I've been reading"]];
  return /*#__PURE__*/React.createElement("section", {
    className: "hero-photo",
    id: "top",
    "data-screen-label": "Hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "container hero-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hero-text"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mono kicker"
  }, "AI \u65F6\u4EE3\u7684\u601D\u8003\u4E0E\u8DB3\u8FF9"), /*#__PURE__*/React.createElement("h1", {
    className: "hero-title"
  }, "\u628A\u4EA7\u54C1\u5224\u65AD\uFF0C", /*#__PURE__*/React.createElement("br", null), "\u53D8\u6210\u80FD\u8DD1\u8D77\u6765\u7684\u4E1C\u897F\u3002"), /*#__PURE__*/React.createElement("p", {
    className: "hero-sub"
  }, "\u6211\u662F\u53F8\u8C6A\u6770 Rick Si\u2014\u20143 \u5E74\u6EF4\u6EF4\u51FA\u884C\u56FD\u9645\u5316\u5B89\u5168\u4E0E\u4F53\u9A8C\u6CBB\u7406\u4EA7\u54C1\u7ECF\u7406\uFF0C\u4E3B\u5BFC\u7684\u53F8\u673A\u5B89\u5168\u4EA7\u54C1\u8BA9\u5B89\u5168\u611F\u77E5\u6307\u6570\u63D0\u5347 19pp\u3001\u5386\u53F2\u9996\u6B21\u53CD\u8D85 Uber\u3002\u80CC\u5305\u62C9\u7F8E\u534A\u5E74\u540E\uFF0C\u8F6C\u578B AI \u4EA7\u54C1\u7ECF\u7406\uFF1A\u8BFB\u6E90\u7801\u3001\u5EFA\u5DE5\u5177\u3001\u5199\u601D\u8003\u3001\u517B\u77E5\u8BC6\u5E93\u2014\u2014\u8FD9\u4E2A\u5DE5\u4F5C\u53F0\u5C31\u662F\u8F6C\u578B\u7684\u8BC1\u636E\u3002")), /*#__PURE__*/React.createElement(__ds_scope.GlassSection, {
    variant: "index"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mono index-label"
  }, "INDEX \xB7 \u76EE\u5F55"), /*#__PURE__*/React.createElement("div", {
    className: "index-list"
  }, index.map(([id, no, t, s]) => /*#__PURE__*/React.createElement("a", {
    key: id,
    href: `#${id}`,
    className: "index-item",
    onClick: () => onNavigate && onNavigate(id)
  }, /*#__PURE__*/React.createElement("span", {
    className: "index-no"
  }, no), /*#__PURE__*/React.createElement("span", {
    className: "index-t"
  }, t), /*#__PURE__*/React.createElement("span", {
    className: "index-s"
  }, s)))))), /*#__PURE__*/React.createElement("div", {
    className: "mono hero-credit"
  }, "\u4E91\u6D77\u4E4B\u4E0A \xB7 \u65E0\u4EBA\u673A\u81EA\u6444"));
}
Object.assign(__ds_scope, { WorkbenchHero });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workbench/WorkbenchHero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workbench/WorkbenchKnowledge.jsx
try { (() => {
/* Sample knowledge graph — port of the site's seeded generator (src/lib/sample.js, seed 11).
   Cluster colors: OKLCH 等明度 12 色环,非邻接取 5 档 (h = 240/180/90/300/30). */
const PALETTE = ['oklch(0.78 0.11 240)', 'oklch(0.78 0.11 180)', 'oklch(0.78 0.11 90)', 'oklch(0.78 0.11 300)', 'oklch(0.78 0.11 30)'];
function rng(seed) {
  let t = seed;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ t >>> 15, 1 | t);
    r ^= r + Math.imul(r ^ r >>> 7, 61 | r);
    return ((r ^ r >>> 14) >>> 0) / 4294967296;
  };
}
function sampleGraph(width = 880, height = 470, seed = 11) {
  const rand = rng(seed);
  const defs = [{
    name: 'Agent',
    cx: 0.26,
    cy: 0.30,
    n: 11,
    labels: ['MCP', '工具调用']
  }, {
    name: 'RAG / 检索',
    cx: 0.73,
    cy: 0.24,
    n: 10,
    labels: ['Embedding', '重排序']
  }, {
    name: '模型原理',
    cx: 0.50,
    cy: 0.60,
    n: 13,
    labels: ['Attention', 'RLHF']
  }, {
    name: '产品方法',
    cx: 0.17,
    cy: 0.74,
    n: 9,
    labels: ['评测集', 'PRD']
  }, {
    name: 'Infra / 工程',
    cx: 0.82,
    cy: 0.72,
    n: 9,
    labels: ['KV Cache', '推理成本']
  }];
  const nodes = [],
    edges = [];
  defs.forEach((c, ci) => {
    const hub = {
      x: c.cx * width,
      y: c.cy * height,
      r: 10,
      cluster: ci,
      label: c.name,
      hub: true
    };
    const hubIdx = nodes.length;
    nodes.push(hub);
    for (let i = 0; i < c.n; i++) {
      const ang = rand() * Math.PI * 2;
      const dist = 34 + rand() * 92;
      const node = {
        x: hub.x + Math.cos(ang) * dist,
        y: hub.y + Math.sin(ang) * dist * 0.82,
        r: 2.2 + rand() * 3.4,
        cluster: ci,
        label: i < c.labels.length ? c.labels[i] : null
      };
      const idx = nodes.length;
      nodes.push(node);
      edges.push([hubIdx, idx, 0.5]);
      if (rand() < 0.38 && i > 0) edges.push([idx, idx - 1, 0.3]);
    }
  });
  const hubIdxs = nodes.map((n, i) => n.hub ? i : -1).filter(i => i >= 0);
  [[0, 1], [0, 2], [1, 2], [2, 3], [2, 4], [1, 4], [0, 3]].forEach(([a, b]) => {
    edges.push([hubIdxs[a], hubIdxs[b], 0.7]);
  });
  return {
    nodes,
    edges,
    clusters: defs.map((d, i) => ({
      name: d.name,
      count: d.n + 1,
      color: PALETTE[i]
    }))
  };
}
const G = sampleGraph();
function GraphSVG({
  focus
}) {
  const dim = c => focus != null && focus !== c;
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 880 470",
    role: "img",
    "aria-label": "\u77E5\u8BC6\u5E93\u6837\u4F8B\u56FE\u8C31"
  }, G.edges.map(([a, b, w], i) => {
    const na = G.nodes[a],
      nb = G.nodes[b];
    const off = dim(na.cluster) && dim(nb.cluster);
    return /*#__PURE__*/React.createElement("line", {
      key: i,
      x1: na.x,
      y1: na.y,
      x2: nb.x,
      y2: nb.y,
      stroke: "rgba(255,255,255,0.16)",
      strokeWidth: w,
      opacity: off ? 0.25 : 1
    });
  }), G.nodes.map((n, i) => /*#__PURE__*/React.createElement("g", {
    key: i,
    opacity: dim(n.cluster) ? 0.22 : 1,
    style: {
      transition: 'opacity .25s'
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: n.x,
    cy: n.y,
    r: n.r,
    fill: PALETTE[n.cluster],
    opacity: n.hub ? 0.95 : 0.8
  }), n.hub ? /*#__PURE__*/React.createElement("circle", {
    cx: n.x,
    cy: n.y,
    r: n.r + 5,
    fill: "none",
    stroke: PALETTE[n.cluster],
    strokeOpacity: "0.3"
  }) : null, n.label ? /*#__PURE__*/React.createElement("text", {
    x: n.x,
    y: n.y - n.r - 7,
    textAnchor: "middle",
    fill: n.hub ? 'rgba(240,245,252,0.9)' : 'rgba(240,245,252,0.55)',
    fontSize: n.hub ? 13 : 10.5,
    fontFamily: "var(--font-mono)"
  }, n.label) : null)));
}
function WorkbenchKnowledge() {
  const [focus, setFocus] = React.useState(null);
  const [q, setQ] = React.useState('');
  const stats = [['1,247', '篇笔记'], ['3,892', '条双链'], ['5', '个主题域']];
  return /*#__PURE__*/React.createElement(__ds_scope.GlassSection, {
    id: "knowledge",
    "data-screen-label": "03 \u77E5\u8BC6\u5E93\u56FE\u8C31"
  }, /*#__PURE__*/React.createElement(__ds_scope.SectionHeader, {
    no: "03",
    title: "\u77E5\u8BC6\u5E93\u56FE\u8C31",
    en: "KNOWLEDGE GRAPH",
    desc: "\u4E0E Claude \u5171\u5EFA\u7684\u7CFB\u7EDF\u5316\u77E5\u8BC6\u5DE5\u7A0B\u2014\u2014\u65B9\u6CD5\u516C\u5F00\u3001\u6765\u6E90\u6807\u6CE8"
  }), /*#__PURE__*/React.createElement("div", {
    className: "kg-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kg-paper"
  }, /*#__PURE__*/React.createElement(GraphSVG, {
    focus: focus
  })), /*#__PURE__*/React.createElement("div", {
    className: "kg-side"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kg-stats"
  }, stats.map(([v, k]) => /*#__PURE__*/React.createElement("div", {
    className: "kg-stat",
    key: k
  }, /*#__PURE__*/React.createElement("span", {
    className: "kg-stat-v"
  }, v), /*#__PURE__*/React.createElement("span", {
    className: "kg-stat-k"
  }, k)))), /*#__PURE__*/React.createElement(__ds_scope.SearchInput, {
    placeholder: "\u641C\u7D22 1,247 \u7BC7\u7B14\u8BB0\u2026",
    value: q,
    onChange: e => setQ(e.target.value),
    hint: q ? '样例' : undefined,
    style: {
      marginBottom: 18
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "kg-legend"
  }, G.clusters.map((c, i) => /*#__PURE__*/React.createElement("button", {
    key: c.name,
    className: 'kg-leg-item' + (focus === i ? ' active' : ''),
    onMouseEnter: () => setFocus(i),
    onMouseLeave: () => setFocus(null),
    onClick: () => setFocus(focus === i ? null : i)
  }, /*#__PURE__*/React.createElement("span", {
    className: "kg-dot",
    style: {
      background: c.color
    }
  }), c.name, /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      color: 'rgba(255,255,255,0.4)',
      fontSize: 12
    }
  }, c.count)))), /*#__PURE__*/React.createElement("p", {
    className: "kg-note"
  }, "\u60AC\u505C\u4E3B\u9898\u57DF\u53EF\u9AD8\u4EAE\u5BF9\u5E94\u8282\u70B9\u3002\u6837\u4F8B\u6570\u636E\u2014\u2014\u5B8C\u6574 Obsidian \u5E93\u8F83\u5927\uFF0C\u90E8\u7F72\u7248\u6309\u9700\u63A5\u5165\u3002"))));
}
Object.assign(__ds_scope, { WorkbenchKnowledge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workbench/WorkbenchKnowledge.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workbench/WorkbenchProjects.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const I = paths => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

/* Real project inventory from src/data/projects.ts — copy, don't invent. */
const WORKBENCH_PROJECTS = [{
  title: 'MuseumCollect 智能体协作案例',
  desc: '我做产品负责人，给 8 个有边界的 agent 立规则、跑 5 个 sprint。两轮冷审计专拷问「虚假完成」：抓出 28 个详情页静默回退同一件文物的假绿灯，也抓出商业文档里 9 个无出处数字——修复不是删稿，而是建假设登记册，24 个关键数字逐个标上实测 / 外部出处 / 假设。产出：三联动 demo、11 份审计、万字复盘。',
  tags: ['多智能体', '对抗审计', 'Case Study'],
  icon: I('<circle cx="5" cy="6" r="2.2"/><circle cx="19" cy="6" r="2.2"/><circle cx="5" cy="18" r="2.2"/><circle cx="19" cy="18" r="2.2"/><circle cx="12" cy="12" r="2.6"/><path d="M6.8 7.4 9.9 10.2M17.2 7.4 14.1 10.2M6.8 16.6 9.9 13.8M17.2 16.6 14.1 13.8"/>'),
  img: '../../assets/proj-museumcollect.jpg',
  href: 'https://github.com/Longwind1984/prac03_MuseumCollect',
  featured: true
}, {
  title: '博物馆互动导览',
  desc: '讲解与引路结合的导览 demo。定位上做减法：不做覆盖型百科，只答「它为什么在这里」。仓库含可本地运行的演示与说明，在线版部署中。',
  tags: ['互动叙事', 'Demo'],
  icon: I('<path d="M3 9.5 12 4l9 5.5"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8"/><path d="M3 20h18"/>'),
  img: '../../assets/proj-museum.svg',
  href: 'https://github.com/Longwind1984/prac_Museum',
  featured: true
}, {
  title: 'Slash Goal 复刻',
  desc: '在 Claude Code 原生 /Goal 发布前，逆向 Codex 开源实现，用 CC Hooks 复刻其目标编排。核心机制是完成不能自我宣告：独立冷上下文 auditor 从 spec 重推需求、对照真实文件树才能关单（防 reward-hacking）。对抗评审抓出 2 个 Critical 风险（含一个沙箱实证的 jq 注入），全部留档在案。',
  tags: ['Hooks 编排', '对抗评测'],
  icon: I('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m8 9 3 3-3 3"/><path d="M13 15h4"/>'),
  img: '../../assets/proj-slash-goal.svg',
  wip: true,
  featured: true
}, {
  title: '行程规划套件',
  desc: '把「调研 → 编排 → 优化」拆成覆盖旅行全生命周期的 10-skill 插件，接入高德等 MCP，缺能力时显式降级标「需查询」。中途滑向 over-design 被我拉回：两个 section 直接砍掉，输出收敛为「事件表做骨架、迷你导览做肉」的双层结构。8 轮冷对抗评审反转了 5 个设计决策。',
  tags: ['需求收敛', 'Skill 插件'],
  icon: I('<circle cx="6" cy="19" r="2.4"/><circle cx="18" cy="5" r="2.4"/><path d="M8.2 17.5c3.2-1.2 2.4-4.2 0.4-5.4-2.2-1.3-2.6-4 0.8-5M15.6 6.5c-2 0.8-2.6 2.8-1 4.4 1.8 1.8 1.2 4.2-1.4 5.2"/>'),
  img: '../../assets/proj-trips.svg',
  wip: true
}, {
  title: 'WeatherLens 天气透镜',
  desc: '一次带退出标准的技术验证：MapLibre GL + Open-Meteo 天气瓦片端到端跑通，123 个变量、93 个时间步的实况预报图层。交付物是 API 验证报告与技术决策文档——验证型工作的产出是结论，不是功能堆叠。',
  tags: ['技术验证', '地图可视化'],
  icon: I('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.8-3.8"/><path d="M8 11.5c0.8-2.6 5.2-2.6 6 0"/><path d="M8.5 9a8 8 0 0 1 5 0"/>'),
  img: '../../assets/proj-weatherlens.svg',
  wip: true
}];
function WorkbenchProjects() {
  const [open, setOpen] = React.useState(false);
  const featured = WORKBENCH_PROJECTS.filter(p => p.featured);
  const more = WORKBENCH_PROJECTS.filter(p => !p.featured);
  const num = i => String(i + 1).padStart(2, '0');
  return /*#__PURE__*/React.createElement(__ds_scope.GlassSection, {
    id: "projects",
    "data-screen-label": "01 \u9879\u76EE"
  }, /*#__PURE__*/React.createElement(__ds_scope.SectionHeader, {
    no: "01",
    title: "\u9879\u76EE",
    en: `PROJECTS · ${WORKBENCH_PROJECTS.length}`,
    desc: "\u6BCF\u4E2A\u9879\u76EE\u90FD\u4EA4\u4EE3\uFF1A\u6211\u7684\u89D2\u8272\u3001\u5173\u952E\u51B3\u7B56\u4E0E\u7ED3\u679C"
  }), featured.map((p, i) => /*#__PURE__*/React.createElement(__ds_scope.ProjectRow, _extends({
    key: p.title,
    no: num(i)
  }, p))), /*#__PURE__*/React.createElement("div", {
    className: 'proj-extra' + (open ? ' open' : '')
  }, /*#__PURE__*/React.createElement("div", {
    className: "proj-extra-inner"
  }, more.map((p, i) => /*#__PURE__*/React.createElement(__ds_scope.ProjectRow, _extends({
    key: p.title,
    no: num(i + featured.length)
  }, p))))), /*#__PURE__*/React.createElement("div", {
    className: "proj-expand-row"
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "ghost",
    "aria-expanded": open,
    onClick: () => setOpen(!open)
  }, open ? '收起 ↑' : `展开全部 ${WORKBENCH_PROJECTS.length} 个项目 ↓`)));
}
Object.assign(__ds_scope, { WORKBENCH_PROJECTS, WorkbenchProjects });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workbench/WorkbenchProjects.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workbench/WorkbenchWriting.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const POSTS = [{
  date: '2026.05',
  title: '从 Codex 源码看 Slash 命令的交互设计',
  tag: '源码拆解'
}, {
  date: '2026.04',
  title: 'AI PM 的第一性原理：上下文管理',
  tag: '产品方法'
}, {
  date: '2026.03',
  title: 'RAG 已死？知识库产品的三条路线',
  tag: '技术判断'
}];
function WorkbenchWriting() {
  return /*#__PURE__*/React.createElement(__ds_scope.GlassSection, {
    id: "blog",
    "data-screen-label": "04 \u601D\u8003\u4E0E\u5199\u4F5C"
  }, /*#__PURE__*/React.createElement(__ds_scope.SectionHeader, {
    no: "04",
    title: "\u601D\u8003\u4E0E\u5199\u4F5C",
    en: "WRITING",
    desc: "\u505A\u7684\u65F6\u5019\u60F3\u6E05\u695A\uFF0C\u5199\u4E0B\u6765\u624D\u7B97\u6570",
    href: "#blog"
  }), /*#__PURE__*/React.createElement("div", null, POSTS.map(p => /*#__PURE__*/React.createElement(__ds_scope.BlogRow, _extends({
    key: p.title
  }, p)))), /*#__PURE__*/React.createElement("div", {
    className: "proj-expand-row"
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "ghost"
  }, "\u67E5\u770B\u5168\u90E8 4 \u7BC7 \u2192")));
}

/* Sample shelf (src/lib/sample.js) — gradient placeholder covers, never fake real book covers. */
const RD_GRADS = ['linear-gradient(160deg,#27416B,#0F1D38)', 'linear-gradient(160deg,#2E5C50,#10241F)', 'linear-gradient(160deg,#6B4A27,#2A1B0E)', 'linear-gradient(160deg,#54306B,#1E1030)', 'linear-gradient(160deg,#6B2738,#280E15)', 'linear-gradient(160deg,#2A5A6B,#0E2228)'];
const SHELF = [{
  title: '思考，快与慢',
  author: '丹尼尔·卡尼曼',
  progress: 62,
  finished: false
}, {
  title: '创新者的窘境',
  author: '克莱顿·克里斯坦森',
  progress: 100,
  finished: true
}, {
  title: '人月神话',
  author: '弗雷德里克·布鲁克斯',
  progress: 100,
  finished: true
}, {
  title: '设计中的设计',
  author: '原研哉',
  progress: 34,
  finished: false
}, {
  title: '失控',
  author: '凯文·凯利',
  progress: 100,
  finished: true
}, {
  title: '禅与摩托车维修艺术',
  author: '罗伯特·波西格',
  progress: 18,
  finished: false
}];
function WorkbenchReading() {
  const current = SHELF[0];
  return /*#__PURE__*/React.createElement(__ds_scope.GlassSection, {
    id: "reading",
    "data-screen-label": "05 \u9605\u8BFB"
  }, /*#__PURE__*/React.createElement(__ds_scope.SectionHeader, {
    no: "05",
    title: "\u9605\u8BFB",
    en: "READING \xB7 WEREAD",
    desc: "\u771F\u5B9E\u4E66\u67B6\u4E0E AI \u5171\u521B\u5206\u533A\u5C55\u793A\uFF0C\u7EDF\u8BA1\u6765\u81EA\u5FAE\u4FE1\u8BFB\u4E66\u5B98\u65B9\u63A5\u53E3"
  }), /*#__PURE__*/React.createElement("div", {
    className: "rd-stats"
  }, /*#__PURE__*/React.createElement(__ds_scope.Stat, {
    label: "\u85CF\u4E66",
    value: "36",
    unit: "\u672C"
  }), /*#__PURE__*/React.createElement(__ds_scope.Stat, {
    label: "\u8BFB\u5B8C",
    value: "21",
    unit: "\u672C"
  }), /*#__PURE__*/React.createElement(__ds_scope.Stat, {
    label: "\u5728\u8BFB",
    value: "3",
    unit: "\u672C"
  }), /*#__PURE__*/React.createElement(__ds_scope.Stat, {
    label: "\u5212\u7EBF\u4E0E\u60F3\u6CD5",
    value: "412",
    unit: "\u6761"
  })), /*#__PURE__*/React.createElement("div", {
    className: "rd-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rd-current"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mono wb-label"
  }, "\u6700\u8FD1\u5728\u8BFB"), /*#__PURE__*/React.createElement("div", {
    className: "rd-current-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rd-cover rd-cover-lg rd-cover-ph",
    style: {
      background: RD_GRADS[0]
    }
  }, /*#__PURE__*/React.createElement("span", null, current.title.slice(0, 1))), /*#__PURE__*/React.createElement("div", {
    className: "rd-current-info"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rd-book-title"
  }, current.title), /*#__PURE__*/React.createElement("div", {
    className: "rd-book-author mono"
  }, current.author), /*#__PURE__*/React.createElement("div", {
    className: "rd-progress"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rd-progress-bar"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: current.progress + '%'
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "mono rd-progress-num"
  }, current.progress, "%")), /*#__PURE__*/React.createElement("div", {
    className: "mono rd-book-notes"
  }, "38 \u6761\u5212\u7EBF\u4E0E\u60F3\u6CD5")))), /*#__PURE__*/React.createElement("div", {
    className: "rd-shelf-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mono wb-label"
  }, "\u4E66\u67B6 \xB7 \u6309\u6700\u8FD1\u9605\u8BFB\u6392\u5E8F"), /*#__PURE__*/React.createElement("div", {
    className: "rd-shelf"
  }, SHELF.map((b, i) => /*#__PURE__*/React.createElement("div", {
    className: "rd-book",
    key: b.title,
    title: `《${b.title}》 · ${b.author}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "rd-cover rd-cover-ph",
    style: {
      background: RD_GRADS[i % RD_GRADS.length]
    }
  }, /*#__PURE__*/React.createElement("span", null, b.title.slice(0, 1))), !b.finished && b.progress > 0 ? /*#__PURE__*/React.createElement("div", {
    className: "rd-mini-bar"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: b.progress + '%'
    }
  })) : null, /*#__PURE__*/React.createElement("div", {
    className: "rd-book-name"
  }, b.title)))), /*#__PURE__*/React.createElement("div", {
    className: "mono wb-stamp"
  }, "\u6837\u4F8B\u4E66\u67B6\u2014\u2014\u63A5\u5165\u5FAE\u4FE1\u8BFB\u4E66\u540E\u5C55\u793A\u771F\u5B9E\u5728\u8BFB\u4E0E\u5212\u7EBF"))));
}
Object.assign(__ds_scope, { WorkbenchWriting, WorkbenchReading });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workbench/WorkbenchWriting.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workbench/WorkbenchHome.jsx
try { (() => {
/* ricksi.com homepage recreation — Liquid Glass over the fixed snow-mountain photo.
   Scrollspy drives the nav's liquid pill; sections are the real five. */
function WorkbenchHome() {
  const [active, setActive] = React.useState('projects');
  const [overHero, setOverHero] = React.useState(true);
  React.useEffect(() => {
    const ids = ['projects', 'workbench', 'knowledge', 'blog', 'reading'];
    const onScroll = () => {
      setOverHero(window.scrollY < window.innerHeight * 0.55);
      let cur = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.4) cur = id;
      }
      setActive(cur);
    };
    window.addEventListener('scroll', onScroll, {
      passive: true
    });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "page"
  }, /*#__PURE__*/React.createElement(__ds_scope.NavBar, {
    active: active,
    overHero: overHero,
    ctaHref: "https://ricksi.com/assets/rick-si-resume.pdf"
  }), /*#__PURE__*/React.createElement("main", null, /*#__PURE__*/React.createElement(__ds_scope.WorkbenchHero, null), /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement(__ds_scope.WorkbenchProjects, null), /*#__PURE__*/React.createElement(__ds_scope.WorkbenchData, null), /*#__PURE__*/React.createElement(__ds_scope.WorkbenchKnowledge, null), /*#__PURE__*/React.createElement(__ds_scope.WorkbenchWriting, null), /*#__PURE__*/React.createElement(__ds_scope.WorkbenchReading, null))), /*#__PURE__*/React.createElement(__ds_scope.SiteFooter, {
    ctaHref: "https://ricksi.com/assets/rick-si-resume.pdf"
  }));
}
Object.assign(__ds_scope, { WorkbenchHome });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workbench/WorkbenchHome.jsx", error: String((e && e.message) || e) }); }

__ds_ns.BlogRow = __ds_scope.BlogRow;

__ds_ns.Heatmap = __ds_scope.Heatmap;

__ds_ns.NoteChip = __ds_scope.NoteChip;

__ds_ns.ProjectRow = __ds_scope.ProjectRow;

__ds_ns.SectionHeader = __ds_scope.SectionHeader;

__ds_ns.Stat = __ds_scope.Stat;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.SearchInput = __ds_scope.SearchInput;

__ds_ns.GlassSection = __ds_scope.GlassSection;

__ds_ns.NavBar = __ds_scope.NavBar;

__ds_ns.SiteFooter = __ds_scope.SiteFooter;

__ds_ns.ShareCard = __ds_scope.ShareCard;

__ds_ns.WorkbenchData = __ds_scope.WorkbenchData;

__ds_ns.WorkbenchHero = __ds_scope.WorkbenchHero;

__ds_ns.WorkbenchHome = __ds_scope.WorkbenchHome;

__ds_ns.WorkbenchKnowledge = __ds_scope.WorkbenchKnowledge;

__ds_ns.WORKBENCH_PROJECTS = __ds_scope.WORKBENCH_PROJECTS;

__ds_ns.WorkbenchProjects = __ds_scope.WorkbenchProjects;

__ds_ns.WorkbenchWriting = __ds_scope.WorkbenchWriting;

__ds_ns.WorkbenchReading = __ds_scope.WorkbenchReading;

})();

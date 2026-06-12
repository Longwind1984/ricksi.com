# Rick Si · Liquid Glass 设计系统

Design system for **ricksi.com — "Rick 工作台 · 活数据个人主页"**, the personal proof-of-work site of 司豪杰 Rick Si, a Didi-international-PM-turned-AI-product-manager. The site's thesis is its own tagline: **「本页本身就是作品」** (this page is itself the work) — a live-data workbench showing real projects, real Claude token usage, a real Obsidian knowledge graph, writing, and reading, all rendered in an Apple-HIG-inspired **Liquid Glass** visual system over a single full-bleed snow-mountain photograph.

## Sources

- GitHub repo: **https://github.com/Longwind1984/ricksi.com** (Astro site; design system lives in `src/styles/glass.css`, layout in `src/layouts/Glass.astro`, homepage in `src/pages/index.astro`, project copy in `src/data/projects.ts`, sample data in `src/lib/sample.js`). Explore the repo further to design even closer to the product — `legacy/index.html` is the original design comp, and `docs/interviewer-critique.md` documents the copy discipline.
- Key source files are archived in this project under [`/reference`](reference/) (`.txt` suffixes keep them out of the compiler).

## What this site is

One product, one surface: a **desktop-first single-page workbench** (Chinese, `lang="zh-CN"`) with five numbered sections — 01 项目 (projects) / 02 工作台数据 (live token & activity data) / 03 知识库图谱 (knowledge graph) / 04 思考与写作 (writing) / 05 阅读 (reading) — plus reader-chrome subpages for blog/notes and a full-screen 3D graph page. The audience is recruiters and AI-product peers; every section is evidence for the career transition.

---

## CONTENT FUNDAMENTALS

- **Language & voice**: Simplified Chinese with embedded English tech terms (agent, sprint, token, MCP, RAG). First person 我; direct, confident, zero marketing fluff. Headlines are short declarative claims: 「把产品判断，变成能跑起来的东西。」 Footer invitation is casual: 「聊聊 AI 产品。」
- **Bilingual echo pattern**: CJK title + faint mono English echo everywhere — `工作台数据` + `WORKBENCH · DAILY`, `INDEX · 目录`. The mono EN layer is structural decoration, always letterspaced, often with `·` separators.
- **Evidence discipline (the brand's core value)**: every number has a source; copy states 角色/关键决策/结果 (role / key decision / result). 「数字必须有仓库或文档出处」. When real data is missing, it is **never faked** — it falls back to seeded sample values flagged with an amber 「样例数据」 badge, and unfinished repos get a dashed 「仓库整理中」 tag instead of a dead link. Data blocks carry mono stamps: 「数据更新于 2026-06-12 21:30 · 口径 v2」.
- **Self-critical storytelling**: copy openly narrates mistakes and reversals (「中途滑向 over-design 被我拉回」, 「对抗评审反转了 5 个设计决策」). Honesty IS the persuasion.
- **Punctuation**: CJK corner brackets 「」 for quoted terms, `·` as universal separator, full-width punctuation in Chinese text. Arrows as UI glyphs: `→` rows, `↗` external, `↓`/`↑` expand, `✕` close.
- **No emoji. Anywhere.**
- **Dates**: `2026.05` for lists, `2026-06-12 21:30` for data stamps. Numbers use tabular numerals and compact units (8.7M, 142M, 19pp).

## VISUAL FOUNDATIONS

- **The backdrop**: one photo carries the whole site — a drone shot of snow mountains above a sea of clouds (`assets/hero-2200.jpg`), `position: fixed`, `center 32% / cover`, darkened by a 10%→32%→62% gradient (v2: much lighter than the original 78%) plus a radial sun-glow at top-right that keeps the photo's dramatic center alive. Photography is credited (「云海之上 · 无人机自摄」). Everything else is glass floating over it. No other background images, no patterns, no illustrations.
- **Color · v2「钴蓝之夜」**: deep cobalt base `#070D20`; cool-white ink ladder (`#FFF` headings & big numbers → `#F2F5FA` body → 65% sub → 45% faint); blue-white hairlines at 16%. **Two colors, two jobs, both lifted from the photo**: 群青 ultramarine `oklch(0.58 0.20 263)` (shadowed snow) is the only ACTION tint — CTA, links, numbers, focus, progress; 太阳金 sun gold `oklch(0.85 0.13 86)` (the sun) is the light of DATA — small-text emphasis only (kicker, live markers, heatmap top tier, featured) — **never buttons, never big numbers** (big numbers stay pure white). Semantic badges follow the 人机光谱 system: 色温 = 人↔机 (实测·金 → 共创·青 → AI 整理·紫), and dashed border = unverified (样例数据, 仓库整理中). Graph clusters use an OKLCH equal-lightness 12-hue wheel `oklch(0.78 0.11 h)`, one stop per 30°. Heatmap is the 雪夜→日出 ramp: 5 levels from deep ultramarine to a glowing gold top tier.
- **Glass system** (see `styles/glass.css`) — v2 formula is cobalt-tinted, not gray: the photo 「透」过来 rather than being dimmed.
  - `.sec` content sections — cobalt gradient glass `rgba(56,88,180,.30)→rgba(22,38,96,.34)`, `blur(22px) saturate(185%)`, radius 28px;
  - `.site-head` nav — a floating capsule `rgba(26,42,92,.32)`, `blur(24px) saturate(190%)`, compacts on scroll-down;
  - `.nav-pill` — the liquid lens: a brighter glass capsule that springs between tabs (true SVG-displacement refraction on Chromium via `#lg-lens`);
  - `.glassy`/hero card — lighter white-gradient glass with a **directional rim light** (inset top + left highlights; light source is top-left, site-wide);
  - dark inset cards `--surface-card` (no blur) hold charts, covers, code.
  - Borders/hairlines are blue-white (`rgba(190,210,255,…)`), 3 steps ×1.5: hairline .12 → edge .22 → rim .30; shadows are cobalt-black.
  - Degradation ladder is mandatory: reduced-transparency → solid `rgba(13,22,48,0.96)`; no-backdrop-filter → same solids; plus a prerendered-blur performance path.
- **Radii**: HIG concentric — nested radius = parent − padding. 28 section / 26 hero / 20 panels / 16 cards / 12 small / capsules always 999px.
- **Type · v2 组合壹**: **MiSans** carries all CJK+latin UI text (display 60→32→23→19px at -0.02em, body 15.5px/1.95, `text-wrap: pretty`); **Geist Mono** is the signature secondary voice — kickers (0.18em), labels (0.12em latin / 0.06em when CJK mixed), data, tags, stamps (JetBrains Mono self-hosted as fallback); **霞鹜文楷** appears only in reading contexts (quotes, book excerpts) as 「人的声音」 against the machine voice.
- **Motion**: one house easing — `cubic-bezier(.3, 1.4, .4, 1)` ("liquid", slight overshoot). Hover = background wash white 7–13% or brightness↑ (**glass never darkens**); press = scale 0.93–0.99 + brighten ("energize with light"); expand/collapse = 0.65s grid-rows liquid transition; scroll-reveal = 18px rise + fade; `prefers-reduced-motion` kills all of it. View Transitions connect pages (nav pill morphs across).
- **Layout**: 1240px container, 48px gutters, sections stack with 28px gaps; nav floats at top 14px; whole-row hit targets; 44px minimum touch targets; mobile gets a bottom Dock (see repo).
- **Shadows**: big soft drops in navy-black (`0 20px 60px rgba(2,8,20,.35)` sections, deeper for modals) + the inset rim-light pair. No hard shadows, no colored shadows except the accent button glow.

## ICONOGRAPHY

- **House style**: inline SVG, 24 viewBox, **1.8px stroke, round cap/join, fill none**, rendered at 18px inside 30px glass squares (`.proj-icon`). The set is hand-drawn per project (multi-agent net, museum, terminal, route, lens) — see `guidelines/brand-icons.html` for the copied set; match this style (Lucide at `stroke-width="1.8"` is the closest CDN substitute if you need more icons — flag any such substitution).
- UI glyphs are **typographic characters**, not icons: `→ ↗ ↓ ✕ ⌘K`. Search and share are the only chrome SVGs (2.4 stroke at 13–15px).
- **No icon font, no emoji, no PNG icons.** Logo is an "R" monogram (`assets/favicon.svg`) + text wordmark 司豪杰 Rick Si.

## Fonts · 组合壹(MiSans + Geist Mono + 霞鹜文楷)

| 字体 | 角色 | 来源 | 状态 |
| --- | --- | --- | --- |
| MiSans Latin VF | 拉丁/数字,全字重 | `assets/fonts/MiSansLatinVF.ttf` | ✅ 自托管 |
| MiSans(CJK) | 汉字主力,4 字重 | CDN 按需子集(jsdelivr) | ✅ 在线 |
| MiSans L3 | 离线 CJK 兜底(60,340 字形,Regular) | `assets/fonts/MiSansL3-Regular.otf` | ✅ 自托管 |
| Geist Mono 400–700 | 数据/标签/落款 | `assets/fonts/GeistMono-*.woff2` | ✅ 自托管 |
| 霞鹜文楷 | 仅书摘/划线/引文(`--font-reading`) | CDN(体积大不自托管) | ✅ 在线 |
| JetBrains Mono 400/700 | mono 回退 | `assets/fonts/jetbrains-mono-*.woff2` | ✅ 自托管 |

- **SF Pro 退役** — 不在任何栈里;`-apple-system` 仅作字体加载失败的系统回退。
- 授权:MiSans 免费商用(需标注使用);Geist Mono / 霞鹜文楷 / JetBrains Mono 均 OFL。Geist 的 OFL 全文在 `assets/fonts/OFL-Geist.txt`。

---

## Index

| Path | What |
| --- | --- |
| `styles.css` | Global CSS entry (imports everything below) |
| `tokens/` | `colors.css` · `typography.css` · `radius-motion.css` · `fonts.css` |
| `styles/glass.css` | The full ported Liquid Glass stylesheet (all component classes, degradation tiers, original Chinese comments) |
| `components/core/` | `Button` `Badge` `SearchInput` |
| `components/glass/` | `NavBar` `GlassSection` `SiteFooter` |
| `components/content/` | `SectionHeader` `Stat` `ProjectRow` `BlogRow` `Heatmap` `NoteChip` |
| `components/share/` | `ShareCard` — 玻璃明信片分享卡 360×640（node / article / site 三形态，底部 URL+钩子+QR 统一落款） |
| `ui_kits/workbench/` | Interactive homepage recreation (`index.html` + section JSX) |
| `guidelines/` | 18 specimen cards (Colors / Type / Spacing / Brand groups in the Design System tab) |
| `explorations/` | Working canvases (design-language upgrade, font exploration, share-card directions) — not part of the consumable system |
| `assets/` | hero photos, project covers, favicon/monogram, wechat QR, fonts |
| `reference/` | archived source files from the repo (read-only) |
| `SKILL.md` | Agent-skill entry point |

**Using components**: link `styles.css`, load `_ds_bundle.js`, then `const { Button, NavBar, … } = window.RickSiLiquidGlassDesignSystem_d0ba20`. Pages must wrap content in `<div class="page">` (it scopes `--accent` etc.) — the photo + darkening come free from `body::before/::after` in `styles/glass.css`.

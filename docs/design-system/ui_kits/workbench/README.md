# UI Kit · Workbench (ricksi.com homepage)

A high-fidelity interactive recreation of the ricksi.com homepage ("Rick 工作台 · 活数据个人主页"), built from the real source (`src/pages/index.astro`, `src/styles/glass.css`, `src/data/projects.ts`, `src/lib/sample.js` — archived under `/reference`).

- `index.html` — mounts the full page. Scroll to see the nav pill scrollspy + over-hero transparency; hover/press rows; expand all projects; hover graph legend to focus a cluster; switch heatmap dimensions.
- `WorkbenchHome.jsx` — page shell: NavBar (scrollspy), sections, footer.
- `WorkbenchHero.jsx` — photo hero + glass index card.
- `WorkbenchProjects.jsx` — the real 5-project inventory (copy from `projects.ts`, verbatim) with liquid expand/collapse.
- `WorkbenchData.jsx` — token usage stats, 14-day trend bars, multi-source heatmap. All sample-data values are the design-comp values and are flagged with the 样例数据 badge, per brand rule.
- `WorkbenchKnowledge.jsx` — seeded sample knowledge graph (SVG port of `sample.js`), cluster legend with hover/lock focus.
- `WorkbenchWriting.jsx` — writing rows + reading shelf with gradient placeholder covers.

Not recreated (out of scope, exists on the real site): ⌘K command palette, 3D graph page, blog/kb reader pages, mobile bottom dock, share-card modal.

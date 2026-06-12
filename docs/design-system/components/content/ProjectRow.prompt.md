Project row — the portfolio workhorse: accent mono number, 18px stroke icon in a small glass square, bold title with a slide-right arrow, a description that always states role / key decision / result with sourced numbers, 2–3 mono tags, and a 150px-tall cover card.

```jsx
<ProjectRow
  no="01"
  title="MuseumCollect 智能体协作案例"
  desc="我做产品负责人，给 8 个有边界的 agent 立规则、跑 5 个 sprint。…"
  tags={['多智能体', '对抗审计', 'Case Study']}
  icon={'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">…</svg>'}
  img="assets/proj-museumcollect.jpg"
  href="https://github.com/Longwind1984/prac03_MuseumCollect"
/>
```

`wip` renders the dashed 「仓库整理中」 tag instead of a link — never fake a link.

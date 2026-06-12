Multi-source activity heatmap — 11px rounded cells in 22 weekly columns, five levels on the 雪夜→日出 ramp (deep ultramarine night → bright blue → gold sunrise; the gold top tier marks the most active days). Optional mono capsule chips switch the data dimension. Without `data` it renders the site's seeded sample.

```jsx
<Heatmap dims={[['all', '全部'], ['git', '代码提交'], ['notes', '笔记'], ['ai', 'AI 会话'], ['gh', 'GitHub']]} />
```

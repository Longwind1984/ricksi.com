Glass surface shells. `section` is the 28px-radius blurred navy glass block that every homepage section sits in; `index` is the lighter hero card; `card` is the darker inset surface used inside sections (graph paper, book cards).

```jsx
<GlassSection id="projects">
  <SectionHeader no="01" title="项目" en="PROJECTS · 5" desc="每个项目都交代：我的角色、关键决策与结果" />
  …rows…
</GlassSection>
```

Sections stack with 28px vertical gaps inside a 1240px container. Never nest `section` in `section`; nest `card` inside `section` instead.

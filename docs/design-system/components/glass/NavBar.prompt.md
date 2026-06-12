The floating capsule navigation — brand wordmark left; right side is a liquid-glass tab bar whose translucent "lens" pill slides to the active link with the house spring easing, then a ⌘K search capsule and the site's single tinted CTA (下载简历).

```jsx
<NavBar fixed={false} active={section} onNavigate={(id) => setSection(id)} ctaHref="/assets/rick-si-resume.pdf" />
```

Notes: `overHero` makes the capsule more transparent (used on the photo hero, first screen only). On the real site the pill is spring-physics driven and the whole bar compacts on scroll-down; this recreation slides the pill with `--ease-liquid`.

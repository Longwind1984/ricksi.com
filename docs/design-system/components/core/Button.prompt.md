Capsule buttons for the Liquid Glass system — `accent` is the only tinted control on the whole site (use once per view for the primary action), `ghost` is the neutral glass capsule for secondary actions.

```jsx
<Button href="/assets/rick-si-resume.pdf" target="_blank">下载简历</Button>
<Button variant="accent" size="big">下载简历 PDF</Button>
<Button variant="ghost" onClick={toggle}>展开全部 5 个项目 ↓</Button>
```

Notes: press state scales to 0.95 and brightens (glass "energizes with light", never darkens). Ghost labels are JetBrains Mono with letter-spacing. Don't put two accent buttons side by side.

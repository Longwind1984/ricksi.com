Direction-one 玻璃明信片 share card — the brand's diplomat in other people's chat windows. A 360×640 vertical card (render @2x for export): snow-mountain photo with the v2 lightened scrim + sun glow, a cobalt glass panel docked at the bottom, gold kicker, and a unified footer of URL + hook line + QR slot. Photography credit is mandatory.

```jsx
<ShareCard
  variant="node"
  brand="RICK SI · 知识库"
  module="KNOWLEDGE · NODE"
  kicker="节点 · 已沉淀 47 天"
  title={<>多智能体编排:<br />从玩具到工具的分界线</>}
  excerpt="真正的分界不在模型能力,而在「失败可被审计」。"
  badges={<Badge variant="prov-ai">AI 整理</Badge>}
  chips={[{ label: '智能体系统', color: 'var(--graph-9)' }]}
  url="ricksi.com/k/agent-orchestration"
  hook="扫码进入图谱 · 看它的 12 个邻居"
/>
```

`variant="article"` swaps the excerpt for a 文楷 `quote` (人的声音, gold left rule); `variant="site"` adds a three-up `stats` strip (`gold: true` for the live cell — small text only, never big numbers). Honesty rules carry over: provenance badges from the 人机光谱, dashed = unverified.

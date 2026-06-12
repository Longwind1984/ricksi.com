# WORKLOG（append-only，倒金字塔：结论在前、清单沉底）

## 2026-06-12 · v3：信任修复 + 3D 图谱 + 六点迭代

### 做了什么（给非开发者的版本）

这一轮的起点是两份输入：你的六点反馈，和一份以「招聘官要不要给面试机会」为标准的批判性审查（原文存 `docs/interviewer-critique.md`）。审查结论很扎心——「工程在线、叙事失血」。所以本轮把**信任修复放在一切炫技之前**：

1. **死链清零**：简历按钮接上了真实 PDF（v0.8 中间版，注意它本身有个复制粘贴损坏待你修）；三个没有公开仓库的项目改为诚实的「仓库整理中」状态，不再假装可点。
2. **叙事重建**：Hero 加上了身份锚点（3 年滴滴国际化治理 PM、安全感知 +19pp 历史首超 Uber、背包拉美半年）；五个项目文案全部重写为「角色→决策→取舍→结果」，所有数字都有仓库或文档出处；最强的 MuseumCollect 提到第一位。
3. **知识库全量入站 + 消毒**：Obsidian 04T 专题库 475 篇并入，站点知识库从 141 篇涨到 594 篇 / 14 个主题域；发布管线自动剥离 AI 协作残桩（79 处）、清除占位行、抹除私人日记链接（54 处）、屏蔽词处理；每篇笔记标注来源档位（共创 / AI 整理），并新增置顶方法论博文《这个库是怎么来的》主动定义这套工作方式。
4. **3D 知识图谱**：/graph 升级为 NASA Eyes 风格的 3D 深空图（594 节点发光聚类、星点、距离雾、点击飞行），右下角可切 2D；WebGL 不可用或系统开了「减少动态」自动回退 2D；three.js 只在这一页按需加载，不拖累主页。
5. **阅读区重构**：新增「AI 共创阅读 · 方法论展示」分区（4 话题 8 本自制 ePub，字排封面 + 话题直链知识图谱），与真实书架物理隔离、不混统计；真实书架隐藏 0% 进度的书；最近在读浮出 3 条真实划线（**待你预览定夺，见未尽事项**）。
6. **Token 口径 v2**：废止把 2023-2025 年 git 活动当 AI 用量的旧估算（旧值留档不删），改为三段分列——Code 实测（17 天）+ 5 月起用期估算（12 天）+ claude.ai 网页参数粗估（99M）；今日大数旁边明示「输出 token / 缓存读占比」；完整方法见 `docs/token-estimation.md`。
7. **阅读页体验**：笔记/文章页收起完整导航，换成左上 R 角标 + 右上分享/搜索，滚读自动隐藏；分享按钮真的能用了——弹出本页 OG 卡，可复制链接/下载/系统分享。
8. **杂项**：两篇新博文初稿（MuseumCollect 五个决策 / 行程 skill 砍半复盘，全部取材真实审计与文档）；手机号下线换微信二维码；项目封面中间宽度裁切 bug、展开区直角高亮 bug、平板断点空洞修复；5 项目配独立小图标；主页 OG 卡 + apple-touch-icon。

### 关键决策与被否决的备选

- **04T 全量发布 vs 尊重 PKM 质量门控**：你的管线给 473/475 篇标了 publish:false（含引用未核实的笔记）。我提出「图谱全量 + 页面尊重门控」的折中，你拍板覆盖门控全量发布——风险知情自担，README 已记录。
- **批判报告建议「3D 推迟、策展 50 篇」**：与你的明确需求冲突，折中为 3D 保留但 timebox、排在信任修复之后；知识库全量发布但叠加消毒 + 精选层 + 方法论自白。
- **token 重估算不静默改写历史**：v1 的 2.0B 留档于 `method.v1_cumulative`，页面标口径 v2——保住「仓库只增不减」的信任主张。
- **被否决**：troika-three-text 标签（需自建 CJK 子集管线，three-spritetext 用系统字体零成本）；3d-force-graph 内置 zoomToFit（会把离群点和星壳框进去，自写分位包围盒取景）。

### 当前状态：能跑什么、怎么跑

- `npm run dev` → localhost:4321 全功能预览；`npm run build` → 603 页 / 83 秒（含 ~600 张 OG 卡）。
- `npm run sync` → 五路采集（activity/usage/vault/weread）→ commit → push → EdgeOne 重建。
- 验收已过：/graph 进出 20 次无 WebGL 泄漏；2D/3D 切换持久化；?focus= 深链相机飞行；消毒 grep 全零；全站 `href="#"` 死链为 0。

### 未尽事项与已知问题

1. **简历 PDF 自身有伤**：v0.8 的「AI 项目经历」第二条重复三遍带黄色高亮——面试官看到之前必须修，修完覆盖 `public/assets/rick-si-resume.pdf`。
2. **划线引用题材敏感**：自动抓到的《论美国的民主》3 条划线全是「多数压制个人」主题，ICP 备案站点上展示有风险——推送前需要你定：换书/手选安全引用/整组撤下。
3. **F6 人文社科 475 篇全量发布**：消毒管线已过一遍，但题材层面的最终把关是你的（`data/kb-manifest.json` 全量清单）。
4. 两篇新博文是初稿，按你的口吻写的第一人称——发布前过目。
5. 移动端 3D 触控（单指旋转/双指缩放）逻辑齐备但只在桌面浏览器模拟过，真机过一遍更稳。
6. 网页端 token 粗估参数（日均 15 次对话 × 22K 等）是可调假设，觉得量级不对改 `collect-usage.mjs` 顶部 `EST` 即可。

### 文件级变更清单（自动罗列，可跳读）

- 新增：`src/scripts/graph-view3d.js`（3D 渲染器）、`src/scripts/graph-mode.js`、`src/scripts/reader.js`、`src/pages/og/home.png.ts`、`docs/token-estimation.md`、`docs/interviewer-critique.md`、`content/posts/how-the-knowledge-base-is-built.md`、`content/posts/museumcollect-five-decisions.md`、`content/posts/why-i-cut-trip-skill-in-half.md`、`public/assets/rick-si-resume.pdf`、`public/assets/wechat-qr.jpg`、`public/apple-touch-icon.png`、`WORKLOG.md`
- 重写：`scripts/sync-vault.mjs`（04T 下钻 + 消毒管线）、`scripts/collect-usage.mjs`（口径 v2）、`src/scripts/graph-explore.js`（双引擎编排）、`src/data/projects.ts`（文案 + 图标 + 排序）、`src/components/ProjRow.astro`
- 修改：`scripts/config.mjs`（sanitize/facetedClusters/wereadAiTopics）、`scripts/collect-weread.mjs`（白名单/划线/书架策展）、`src/layouts/Glass.astro`（reader chrome/分享弹层/简历链接/微信二维码/品牌名）、`src/pages/index.astro`（hero/口径 v2 展示/AI 共创阅读区/降采样图谱/样例徽章）、`src/pages/graph.astro`、`src/pages/kb/index.astro`（精选层）、`src/pages/kb/[...slug].astro`（reader/徽章/进度条）、`src/pages/blog/[...slug].astro`、`src/scripts/graph-view.js`（TDZ 修复 + ready + 大图静态布局）、`src/lib/sample.js`（18 色板）、`src/styles/glass.css`（reader/分享/AI 书/图标/断点/圆角修复等）、`content/posts/how-this-page-was-built.md`（去草稿声明/硬编码数字）、`README.md`、4 张项目 SVG（补 width/height）
- 数据：`data/graph.json`（594 节点）、`data/usage.json`（v2）、`data/reading.json`（aiTopics/highlights/策展书架）、`data/kb-manifest.json`（消毒报告）、`content/kb/**` 全量重生成

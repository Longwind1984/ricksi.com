# WORKLOG（append-only，倒金字塔：结论在前、清单沉底）

## 2026-06-16 · 前沿追踪 v8：首页/落地页预览升级 + 信源量级筛选 + 全量回溯(+40 实体) + 修线上回归

### 体验影响（着重 · 先看）
- **修了一个线上回归**：`/frontier` 声量筛选此前是坏的——`collect-frontier` 重写 frontier.json 时漏带 `constellation`，昨晚定时 sync 把它抹掉并 push 上线了。已修源头（people/topics 落盘保留 constellation）+ 回填存量；本次随版修正线上。
- **首页前沿卡**：迷你时间轴默认 14→90 天、4 个方向全展示（只聚合到方向、更密）；头像条 36→46px、只露有动态的人、移动横滚。
- **落地页**：默认 30→90 天窗口；节点 hover 去掉浏览器原生黄气泡（title→aria-label），只留自定义浮层。
- **信源量级筛选改「及以上」**：点「猎户座」=猎户座及以上（北极星+猎户座累积高亮），同时收窄事件流/时间轴/#people 档案；人物卡加带色「信源质量」标签。
- **名单从 23 扩到 65 实体**（+20 人 +22 机构），回溯入站 277 条（共 398 条）——经多 agent 网研，**用户未逐条 review，按我的评判上线**（HITL 清单存档 data/frontier-backfill-review-v8.md 备查）。

### 做了什么
按批准的 v8 计划分三阶段。A（首页/落地页/筛选/人物卡，UI）已 dev+build 验证。B（全量回溯）：42-agent Workflow 网研近 3 月（1.72M tokens）→ 组装入 config（我校准 域/源级，纠正 agent 滥用 engineering/polaris）→ import-backfill 合并。C（邮件订阅）按用户要求**搁置**，进度+前置交接写入 docs/frontier-email-subscription.md。

### 关键决策与被否决
- **北极星迁源级后曾被定时 sync 抹掉**：根因是 collect-frontier 落盘 slim 漏字段；修 slim 而非每次回填。
- **回溯名单由我重建 + 校准**：用户无时间 review，授权按我判断上线；agent 研判的 域/源级偏激进（中国实验室→engineering、滥发 polaris），我按既有口径收敛。
- **新实体头像暂不生成**：42 个先用字母牌兜底（设计内的 fallback），避免上线前给可能调整的实体批量跑 API；列为未尽。
- 工作偏好入库（项目+全局 CLAUDE.md）：分阶段计划默认顺序连续执行、不逐阶段请示。

### 当前状态：能跑什么
- `cd rick-homepage && npm run dev` → `/frontier`：90 天窗口、声量「及以上」筛选连动三处、人物卡信源标签；首页迷你轴 90 天 4 方向 + 头像放大。dev 实测通过、无控制台报错。
- A+B 已合并提交并 push main（见文件清单/commit）；EdgeOne+Vercel 重建部署。

### 未尽事项与已知问题
- **回溯内容未经用户 HITL**：AI 网研产物，可能含幻觉/源级错配；清单在 data/frontier-backfill-review-v8.md，建议事后抽检纠正。stepfun 空回溯。部分条目日期早于 90 天窗（真实大事件，信息流显示、时间轴不绘）。
- **42 新实体仍是字母牌**，头像待后续批量生成（含机构 logo i2i + 去白边）。
- **分享卡静态构建随条目数增长**（398 张）；生产 Vercel 按需出图不受影响，EdgeOne 静态构建变慢。
- **Phase C 邮件订阅未做**，交接见 docs/frontier-email-subscription.md（含用户 3 个前置：Resend/Upstash/端点平台）。

### 文件级变更清单
- `src/components/FrontierTimeline.astro`：defSpan 90（mini+full）；mini 全方向；节点 title→aria-label。
- `src/pages/index.astro`：首页头像条只露活跃人 + 46px。
- `src/scripts/frontier.js`：声量精确匹配→rank 阈值「及以上」+ 累积高亮 + #people 档案纳入筛选。
- `src/components/FrontierPersonCard.astro` + `src/lib/frontier-ui.mjs`（CONSTELLATION 加 color）+ `glass.css`：人物卡信源标签 pill + 头像条尺寸/移动适配。
- `scripts/config.mjs`：+20 人 +22 机构（域/源级/title/bio）。
- `scripts/collect-frontier.mjs`：落盘 people/topics 保留 constellation（修回归）。
- `data/frontier.json`：回填 constellation + import-backfill 合并 272 条（398 总）。
- `data/frontier-backfill-sample.json` 重写为 v8 42 实体；`data/frontier-backfill-review-v8.md` HITL 清单。
- `.gitignore`：+ scripts/.resend-key、scripts/.upstash（Phase C 预备）。
- `docs/frontier-email-subscription.md`：**新建**，Phase C 交接。

## 2026-06-16 · 30书架接入书架管线 + 阅读模块「可读/其余」双框 + 新增 Trae SOLO + 全量手动同步

### 体验影响（着重 · 先看这个）

- **阅读模块改成两个框**：①「可在线阅读 · 我写的书」——把能点开通读全文的 3 本自制 ePub（Harness Engineering / 解剖 Codex / Trae SOLO）单独做成主推横排卡（封面 + 副题 + 作者 + 「开始阅读」按钮直达阅读器 + 「导言与划线」次链）；②「更多共创书」——其余 8 本（仅划线、无 epub）按话题收进**默认折叠**的 details 框，点开才展开。首页 teaser 同样拆：可在线读的 3 本主推（直达 `/read/`），其余折叠。目的：让 recruiter 一眼看到「这几本是我写的、当场能读」，而不是混在一堆只有划线的书里。
- **书架新增 Trae SOLO**（第 3 本可在线读的自制书）：字节 agentic IDE 的战略拆解，归入「Harness 工程」话题，封面/详情/阅读器/导言全到位。

### 做了什么

- **接入 30书架为 ePub 源真相**：`~/Documents/30书架` 写进 config，每次 `npm run sync` 的合书步自动按各书 `sourceFile` 从那里拉最新 epub 到站点、缺封面时从 epub 内封面图提取并压到 500×800。以后新增一本只需「epub 丢进 30书架 + local-books.json 登记一条」，跑 sync 即上架。
- **跑了一遍全量手动同步**（`npm run sync -- --no-push`）：活动热力图、Token 用量、知识库图谱+笔记、微信读书划线/书架、本地书架（含 Trae SOLO）、前沿追踪（新增 9 条、现存 125 条，1 源 yann-lecun 瞬时 400 次日自补）全部刷新。
- **项目记忆更新**：30书架 路径 + sync 各步更新范围 + 「前沿头像不在 sync 提交范围、是另一步」这条线上没生效的根因。

### 关键决策 / 被否决备选

- **封面：缺失才提取，不覆盖既有**。实测既有封面是 epub 内大图（2000×3200）压到 500×800 的精修缩图（md5 与原图不同），所以脚本只在目标封面缺失时才从 epub 提取，避免每次 sync 把精修缩图打回原图、产生无谓 diff。**epub 文件则永远以 30书架为准**（源 mtime 新即覆盖），因为正文内容要能随源更新。
- **Trae SOLO 归入「Harness 工程」话题**而非新开话题：3 本可读书正好同属「agent 工程/产品拆解」，同框即「我写的书」一组，与双框 UI 自然对齐。
- **双框 = 原生 `<details>` 零 JS**：复用站内既有折叠范式（页脚二维码/日组），无新增脚本。

### 当前状态（能跑什么）

- 本地纯静态 `npm run build` EXIT 0（644 页，~463s）：`/reading/` 出 3 张可读卡 + 1 个折叠「更多共创书」；`/reading/CB_local_trae-solo/` 详情 + `/read/` 阅读器 + epub(2MB)/封面(106KB) 均入 dist；首页 teaser 双区就位。dev（4321）DOM 校验：可读框 3 卡、折叠框 8 本、无 console error。
- 数据已全量刷新但**未提交未推送**（本轮代码改动要和数据一起 push）。

### 未尽事项 / 已知问题

- **整轮尚未 push**（运行时出图 + A1/A2/A3 + 30书架/双框 全在工作树未提交）；push 到 main = 双平台线上重建，需用户确认后统一提交。
- **A2 工作台卡缩小下移仅为草稿**：预览视口受限没法真机眼校，需用户在真桌面确认是否挡主视觉。
- **B1 封面 / B2 头像线上未生效**：文件都在 repo，根因是构建慢导致部署滞后（已由运行时出图解决）+ 同名静态资源 CDN 缓存；要等本轮 push + 一次 Vercel 部署后看是否刷新，仍旧则加 `?v=hash` 破缓存。
- **Vercel 运行时出图真机未验**：需一次 preview 部署确认 linux resvg + 冷启动。

### 文件级变更清单

- 书架管线：`scripts/config.mjs`（+`bookshelfDir`=30书架）、`scripts/merge-local-books.mjs`（+书架同步：拉 epub / unzip 解析 OPF 提封面 / sharp 压 500×800；话题级元数据每次刷新）
- 书目数据：`data/local-books.json`（3 本加 `sourceFile`、新增 Trae SOLO、blurb 改「三本」）、`data/book-extras.json`（+Trae SOLO 导言）
- 阅读 UI：`src/pages/reading/index.astro`（可读/其余双框）、`src/pages/index.astro`（teaser 双区）、`src/styles/glass.css`（`.rd-readable*` / `.rd-more*` / `.rd-teaser-*`）
- 同步产物（手动 sync）：`data/{activity,usage,graph,kb-manifest,reading,frontier,frontier-seen}.json`、`data/frontier/`(归档)、`public/assets/books/epub/trae-solo.epub` + `epub-covers/trae-solo.png`
- 文档：`WORKLOG.md`（本条）

## 2026-06-16 · 出图改运行时（Vercel 构建 18min→分钟级）+ 首页项目重排/阅读前置

### 体验影响（着重）

- **构建提速（核心）**：把 KB/blog/frontier 的 share+OG 社交图（~1,316 张）从构建期预渲染改为 **Vercel 运行时 Serverless 按需出图 + CDN 缓存**。实测 `VERCEL=1 npm run build` 从 ~560s（9–18min）降到 **~8s**；Vercel 部署应随之进入分钟级。**EdgeOne/本地零改动**：未设 `VERCEL` 时仍纯静态全量预渲染（双平台兼容）。
- **首页项目重排**：博物志移到第 4 位（Slash Goal / Writer Pipeline / Galaxy View 依次提到 1–3），第 5 位起（博物馆互动导览 / 行程 / WeatherLens）默认收进「展开全部」。
- **阅读前置于写作**：首页 04=阅读、05=写作（含 hero 目录条 + 全站导航同步）；写作卡加「持续迭代中 · 草稿」标注（内容尚少）。

### 关键决策 / 踩坑

- 运行时开关用 **`astro:route:setup` 钩子**程序化设 `route.prerender=false`（仅 `og|share/{kb,blog,frontier}`）。踩坑：`export const prerender = <import 进来的值 / 自定义 import.meta.env + define>` **都不被 Astro 静态分析认**（仍全量预渲染）；钩子才可靠。
- 双平台冲突：runtime 出图需 `@astrojs/vercel`（v8，Astro5 兼容）adapter，会改构建产物 → EdgeOne 静态会崩。解法：adapter + 钩子均按 `process.env.VERCEL` 条件化；EdgeOne 仍静态。
- 函数依赖打包：satori 字体 / hero 底图 / `data/{graph,frontier}.json` 经 `vercel({ includeFiles })` 打进函数；端点仍 `path.resolve(cwd)` 读（Vercel 函数 cwd=项目根）。出图响应加 `Cache-Control`（s-maxage + SWR）让边缘缓存。
- 端点 GET 改为 props（预渲染）∥ 按 params 运行时查实体双模，兼容两条构建路径。

### 验证

- `VERCEL=1 npm run build` → EXIT 0、~8s、产出 `_render.func`；函数内含 `@resvg/resvg-js` 原生二进制 + 6 字体 + graph/frontier.json + hero 底图（核对通过）；static 仅剩 home/site 两张图，1,316 张批量图不再预渲染。首页 + 4 个项目落地页正常生成。
- **未跑**：本地纯静态（无 VERCEL）全量 build（~18min，逻辑未变跳过）；Vercel 真机函数调用（需一次 preview 部署确认 linux resvg + 冷启动）。

### 文件级变更清单

- 改部署：`astro.config.mjs`（条件 adapter+includeFiles + `astro:route:setup` 运行时出图钩子）、`package.json`/`lock`（+`@astrojs/vercel@8`）
- 出图端点（5）：`src/pages/{og/kb,og/blog,share/kb,share/blog,share/frontier}/[...].ts`（去 `export const prerender` 文件级开关、GET 加 params 运行时查实体、`imgHeaders` 缓存头）；新增 `src/lib/og-runtime.mjs`（imgHeaders）
- 首页：`src/data/projects.ts`（重排 + 第 5 起收起）、`src/pages/index.astro`（阅读↔写作换序 + 写作草稿标注 + 目录条）、`src/layouts/Glass.astro`（导航换序）
- 文档：`WORKLOG.md`（本条）

## 2026-06-16 · 首页第 1 卡升级为「博物志」+ 方法论主导的可交互落地页

### 体验影响（着重 · 先看这个）

- **没有新增第二张卡**：首页第 1 张「MuseumCollect 智能体协作案例」原地升级成「博物志 · 把 AI 的约束当设计原则」，`href` 从外链 GitHub 改成站内 `/projects/museum-collect/`，仍在第 1 位。原因：那张卡指向的就是同一个仓库（方法论缩写版），新增第二张同仓库卡会变成凑数。与用户确认后选「升级」而非「新增到 3/4 位」。
- **新落地页四个可交互模块，两个用真数据**：①三联动 dashboard（时代柱↔古国地图↔文物卡，组件内 `EventTarget` 事件总线 + source 字段防环，西周点亮 3 件/暗 9 件实测联动正确）用源仓库 277 件里 curate 的 12 件真实文物（挂「样例数据」徽章）；②真实地形流散图用真 geojson（手写 `geoConicEqualArea` 投影，30 出土点 / 24 馆含 9 海外，海外视图画流散弧并标「示意路径」）；③多 Agent 拓扑（常驻 6 / 夜跑 8 切换 + 点节点出 constitution）；④反幻觉状态机（喂 3 种 chunk 走五字段硬门）+ 叙事打架（白石佛/红山玉三方矛盾，点「让 AI 编一个真相」演示硬门拒绝）。
- **诚实节提级为卖点**：一个讲反幻觉/反假完成的页面，把诚实当卖点而非免责声明——05 双标自审（直接引「这种诚实是选择性表演」并认「双标成立」）、09「它不是什么」（MVP 未发布 / CLIP 未端到端 / KPI 全是假设 / 跨页总线是 workaround）与正文同框。所有假设数字带「假设」、curate 子集带「样例数据」徽章。
- **降级与可达**：两个数据交互 fetch 失败回退到源仓库真实截图（已本地化）；全部交互过 `prefers-reduced-motion`、键盘可达（tabindex/role/Enter/Esc/方向键）；移动端 390px 实测零横向溢出、翻牌堆叠、底部 Dock 正常。

### 做了什么

读完源仓库（`longwind1984/prac03_museumcollect@claude/museum-photo-sharing-8qJiz`）58KB 交接文档 + 核实仓库真实数据，把「博物志」这个 AI 原生文博收藏产品做成方法论主导的全景案例落地页。主轴：AI PM 的关键不是用 AI 写代码，是把 AI 的三个约束（角色有边界 / 上下文冷启动 / 文件系统即状态）当成产品与协作的设计原则。结构：Hero 翻牌（三约束→三原则）+ 命题 + 11 节（反讽底座 / Agent 拓扑 / 审计驱动 BUG-001 / 反幻觉管道 / 诚实 DNA / 可跑 demo / 流散地图 / 克制产品 / 诚实约束 / 量化 / 收束）。方法论三节（02/03/04）给足篇幅，产品与 demo 作「方法论指向的实物证据」。沿用 slash-goal 的零依赖手写 SVG + Liquid Glass token 范式，全程 Rick 第一人称、避免 AI 腔。真实数据（geojson/文物/截图/剪影）构建期一次性 curl 本地化到 `public/assets/museum/`，运行期零外网依赖。

### 关键决策与被否决的备选

- **升级 #1 卡 vs 新增卡**（与用户确认）：选升级，避免首页出现两张同仓库卡。否决「新增到 3/4 位」——同仓库两卡读起来像凑作品集。
- **路由 `/projects/museum-collect/`**（英文 slug，对齐 slash-goal/writer-pipeline/galaxy-view），否决拼音 `bowuzhi`。
- **地图投影手写 `geoConicEqualArea`**：否决引入 `d3-geo`（会拖进 d3-array、团队没维护过其 tree-shaking）。手写约 40 行纯函数，与全站零-d3 的手写 SVG 交互一致、可单测、不增体积。
- **数据运行期 fetch（public） vs frontmatter 内联**：选 fetch + 截图降级，HTML 保持精简（41KB），与 public 资产性质一致；no-JS/fetch 失败回退真实截图。
- **诚实节当卖点**（与用户确认）：05/09 提级为正式章节，整页可信度重心压在自我批判上。

### 当前状态：能跑什么、怎么跑

- `cd rick-homepage && npm run dev` → 访问 `/projects/museum-collect/`；首页 `/` 第 1 位卡片点击站内跳转（非新标签）。
- 已验证：`npm run build` **exit 0**（museum-collect/index.html 41KB 正确产出、首页 dist 含站内链接）；dev 下四个交互全部工作（DOM 实测：翻牌、拓扑常驻↔夜跑切换 + 点节点出面板、状态机切三档、dashboard 三向联动 dim 计数正确、地图三视图 + 海外 9 馆 + 流散弧、叙事翻转）；首页卡确认升级为「博物志」/ 站内链 / 旧 GitHub 链已移除 / 排第 1；控制台无本页报错（`[museum-collect]` 零条）；移动端 390px 无横向溢出。
- 截图存档：hero（桌面 + 移动堆叠）、三联动 dashboard（已发用户）。

### 未尽事项与已知问题

- **build 输出有一条预先存在的报错**：`Cannot find module dist/pages/share/site.jpg.astro.mjs`（站点 OG 分享图路由，与本次改动无关；上一条相关 WORKLOG 已记 OG 分享图未做）。本次构建是在 dev server 运行时跑的，疑为 dev+build 并发读写 dist 的竞态；exit code 仍为 0，museum-collect 与首页均正确产出。建议单独 `npm run build`（停 dev）复核该路由。
- **地图/拓扑/状态机的实时截图未留存**：验证期间用户正在预览窗口浏览其它页（阅读/首页），程序化截图与用户导航竞态、且预览器对程序化滚动支持不稳（slash-goal 那条 WORKLOG 已记同款限制）。这三个交互已用 `preview_eval` 在本页逐项功能确证（返回值正确），dashboard 实图已截到。
- 落地页未做专属 OG 分享图（沿用站点默认）。
- 文物图 `image_urls` 未本地化（dashboard 用剪影 SVG，未铺实景照）；如需实景照需后续把 CC0 图也拉到本地。

### 文件级变更清单

- `src/data/projects.ts`：第 1 个对象由「MuseumCollect 智能体协作案例」改写为「博物志 · 把 AI 的约束当设计原则」（title/desc/tags/img/alt/href 更新，icon 沿用多智能体网格图标，href 改站内）。
- `src/pages/projects/museum-collect.astro`：新建落地页（Hero + 11 节 markup + `is:global` 作用域样式）。
- `src/scripts/museum-collect-page.js`：新建交互脚本（initCommon/initFlips/initTopology/initFsm/initNarrative/initDashboard/initMap + 手写 geoConicEqualArea 投影 + 事件总线 + 数据 fetch 降级）。
- `public/assets/proj-museum-collect.jpg`：新封面（源仓库 dashboard 真实截图缩放至 960×540）。
- `public/assets/museum/`：新增真实数据资产——`artifacts.curated.json`（12 件 curate）、`narrative-conflict.json`（叙事打架两案）、`geo/`（9 个 geojson）、`shots/`（10 张 demo 截图）、`silhouettes/`（12 文物剪影）。

## 2026-06-16 · 前沿追踪 v7：奇点评级 + 三维筛选 + 悬浮预览 + 分享卡 + 去白边 + 机构头像

### 体验影响（着重 · 先看这个）

- **信息流默认动作反转**：以前点条目标题=跳走原文、摘要藏在次级「展开」里；现在**点标题/判断=就地展开摘要阅读**，「原文 ↗」和「分享 ↗」降为脚部次级操作。这是本轮最大的可感知交互变化。
- **悬浮预览浮层**（桌面）：时间轴星点 / 信息流条目 / 首页卡，鼠标悬浮即呼出预览（星类+人物+判断+摘要节选）。触控设备不弹（无 hover），主操作仍是点击展开。
- **时间轴筛选**（发版前按用户反馈二改定稿）：删「方向」「类型」两条 chip 行；**方向改为点时间轴纵轴领域名**——点「研究与评测」即丝滑聚焦该领域（其余领域组 max-height/opacity 过渡折叠、领域名标「聚焦中·再点退出」），再点退出；筛选条只留 **声量**（信源量级 北极星·猎户座·星辰·行星）+ **量级**（事件星类 奇点·超新星…，选中用该星类自身颜色着色）。三者 + 人物 + 窗口正交，**同时连动时间轴与下方信息流**。
- **评级体系两处变动**：① 新增最高事件星类「**奇点**」（技术演进史分水岭，时间轴节点最亮+脉冲，目前数据里 0 条，靠手动/未来标注）；② 「北极星」**从事件星类移出**、并入「信源量级」（即原「北斗」改名为北极星，描述重要的人/实验室），时间轴上其行名描金、头像描金边。
- **每条事件可分享**：复用站内分享卡管线，新增 frontier 玻璃明信片（kicker 用星类色 + 一句话判断 + 人物徽章 + 二维码）。
- **头像**：李飞飞白边已去除并系统化（生成与修复都过去白边）；OpenAI/Anthropic/DeepMind/DeepSeek/ByteDance/arXiv 六家机构新增风格化 logo 头像，显示在时间轴行。

### 做了什么

按用户「先审计、再纳入输入做整体优化」的要求，先派 3 个 Explore agent 审计现状（评级/时间轴/交互/分享/头像），再做 6 块改动并逐块在 dev 实测验证。评级口径按用户口头确认重定：奇点封顶事件级、删「基点」、北极星归信源级（北斗改名）。机构 logo 走 AI i2i（用户在「真 logo 风格化」与「程序化字母牌」之间选了前者）；找不到照片的研究者（chris-olah/subbarao/josh）保留字母牌，不做无似真度的随机脸。

### 关键决策与被否决的备选

- **北极星属于哪条 track（与用户确认）**：北极星=信源量级最高级（重命名自「北斗」，成员不变），不进事件星类；「基点」不做。否决「奇点/基点/北极星三档并存」（语义重叠、无判据）。
- **悬浮浮层做成纯只读 peek（pointer-events:none）**：不放交互链接，避免 hover-into 维持逻辑的脆弱；可见性用 `.show` 类的 `visibility/opacity` 驱动，**不靠 rAF**（后台标签页节流时 rAF 不触发会导致浮层不显）。
- **机构 logo 来源**：clearbit 已失效、wiki summary 不给公司 logo（非自由版权）→ 改用 simpleicons 单色描白 SVG（OpenAI 用 Commons SVG）。单色 glyph 做 i2i 输入效果意外地好。Anthropic 被渲成通用「AI」字样，记为可接受/可换源。
- **无照片不强生**：人无照片源退字母牌（诚实），否决纯文本生成随机脸。
- **奇点/北极星 视觉强化保持克制**：只给这两档加光环/描金 + 极缓脉冲（尊重 `prefers-reduced-motion`），不满屏发光。

### 当前状态：能跑什么、怎么跑

- `cd rick-homepage && npm run dev` → `/frontier`：筛选四维（含声量/量级）实测连动时间轴+信息流、URL 往返、清除复位；条目点击就地展开、脚部原文/分享；桌面悬浮浮层定位填充正确、移出/Esc 关闭；分享按钮 → `#share-modal` 出 frontier 卡。
- 已验证：**`npm run build` 通过（exit 0，642 页，118 张 frontier 分享卡，约 16 分钟）**；分享卡端点 `curl /share/frontier/<id>.jpg` 返回 720×1280 JPEG（已肉眼核对：kicker 星类色、人物徽章、二维码）；6 张机构 logo 头像 dev 下时间轴行已显示；李飞飞去白边后满版无框。
- 头像修旧：`npm run frontier:portraits -- --repair`（本地 sharp，不调 API）。

### 未尽事项与已知问题

- ~~机构头像需重新 build~~ 已解决：发版前重跑全量 build（642 页 exit 0，6/6 机构头像进 dist），已随大版本 push 到 main（`f86967c`，fcbadec..f86967c ff）触发部署。发版时还修了一处合并副作用：projects.ts 重复 Slash Goal 卡（工作树版 + main 版叠加）已去重。
- **奇点目前 0 条**：分水岭事件多在 3 个月回溯窗口外，功能在位但需手动标注（`data/frontier.json` 置 `singularity:true`）或等未来事件。
- **数据质量待你 HITL**：分享卡测试时撞到一条疑似杜撰的回溯条目（「美国政府强制暂停 Anthropic Claude 5 Fable 境外访问」挂在 Nathan Lambert 名下、评超新星）——渲染没问题，但内容可疑，建议复核回溯数据。
- Anthropic 机构头像偏通用「AI」字样；arc-prize/metr/epoch-ai 三家无 logo 源、时间轴行暂只显名字。
- build 末尾有一条 `ENOENT manifest_Xh4Njuod.mjs` 警告，非致命（exit 0、真实 manifest `manifest_BgcoOS5G.mjs` 在、dist 完整），疑似 Astro 构建后清理的陈旧引用。
- 全量回溯剩 ~43 实体仍待你定（本轮未动）。

### 文件级变更清单

- `src/lib/frontier-ui.mjs`：STAR_CLASS 加 `singularity`(奇点,rank6) 删 `polaris`；`starOf` 链首加 singularity、删 canon；CONSTELLATION `beidou`→`polaris`（北斗→北极星）+ RANK 同步；注释订正。
- `scripts/collect-frontier.mjs` / `scripts/migrate-frontier-rating.mjs` / `scripts/import-backfill.mjs`：评级字段 `canon`→`singularity`（schema/prompt/落盘/日志）。
- `scripts/config.mjs`：people/topics `constellation` `beidou`→`polaris`；portrait 加 `logoPrompt`、stylePrompt 强化无白边；6 机构源加 `logo` 直链。
- `data/frontier.json`：people/topics 快照 `constellation` `beidou`→`polaris`（9 处，字面替换不动其它）。
- `src/components/FrontierEntry.astro`：点击模型反转（标题/判断入 `<summary>` 做主展开）+ 脚部 原文/分享 次级 + `data-ft-pop` + `data-constellation`；回溯条目走扁平态。
- `src/components/FrontierTimeline.astro`：lane 带 `con`、行加 `data-domain/-con/-person`、节点加 `data-star/-ft-pop`。
- `src/components/FrontierPersonCard.astro`：`isBeidou`→`isPolaris`。
- `src/pages/frontier.astro`：ownerMap 带 constellation、entries 加 constellation；筛选条重做（方向/声量/量级/类型 带标签，仅列出现项）；发悬浮预览 JSON 岛。
- `src/pages/index.astro`：首页 hero/行加 `data-ft-pop` + 发首页预览 JSON 岛。
- `src/scripts/frontier.js`：state 加 `con/star`、`apply` 增两维 + 统一 `syncTimeline`（窗口×筛选共同驱动节点/行/组）；URL/清除纳入新维。
- `src/scripts/frontier-preview.js`：**新建**，悬浮预览浮层（桌面 hover、AbortController 生命周期）。
- `src/layouts/Glass.astro`：全局挂 `#ft-preview` + import 预览脚本。
- `src/lib/share-card.mjs`：加 `frontier` variant（PHOTO_POS/PANEL_H）+ `kickerColor` 参数。
- `src/pages/share/frontier/[...id].jpg.ts`：**新建**，每条事件分享卡端点。
- `src/styles/glass.css`：筛选标签/星类色 chip、`.ft-sum/.ft-foot/.ft-expand-hint`、`.ft-pop*` 浮层、奇点节点光环+脉冲、北极星行描金、`:focus-visible`、`.ft-pcon.polaris`。
- `scripts/generate-frontier-portraits.mjs`：去白边 `trimWhiteBorder` + `--repair` 模式；机构 logo i2i 路径（`logoImage`/`logoPromptOf`/todo 分人机）；人无照片不强生。
- `docs/star-rating.md` / `docs/image-generation.md`：评级与头像管线文档同步。
- `public/assets/frontier/`：`fei-fei-li.webp` 去白边重写；新增 6 张机构 logo 头像。

## 2026-06-16 · 新增项目「Slash Goal · 谁来认定「干完了」」+ 二级可交互落地页

### 体验影响（着重 · 先看这个）

- **首页新增一个项目卡，置于第 2 位**（紧跟 MuseumCollect、在 Writer Pipeline 之前）。原占位条目「Slash Goal 复刻」（无链接、显示「仓库整理中」）被删除替换，避免重复。
- **项目卡配图重绘**：原 `proj-slash-goal.svg` 是命令面板 mock，与项目主题（完成判定）不符；改为「会话内自评 → ✓ 假完成（珊瑚）vs 独立 auditor → ✗ 定位到行（青）」的对照图，呼应落地页主轴。
- **新落地页高度可交互**：三个签名交互——hero「谁来验收」（两裁判演示，agent 绿勾闪→翻珊瑚假完成 / auditor 定位到第 24 行）、验证范式四象限（toggle「实测后的修正」让原生 checker 沿隔离轴下落，「测的是它，地图才变」）、提示词层→程序层光谱（含 ghost L3、珊瑚「无法复刻」禁区）。全部带 `prefers-reduced-motion` 直出兜底 + 键盘可达。

### 做了什么

把两份交接文档（Trae SOLO 上复刻 Codex `/goal` + Claude Code 上复刻为 `/mygoal`）合成一个项目、一条叙事，做成对外作品集页。主轴：自驱动 agent 真正难的是「何时停、谁认定干完了」；坐标轴是「提示词层模拟 ↔ 程序层保证」。Claude Code 为主轴（约 1:2.5），Trae 作受限平台铺垫。八个 section：逆向 Codex → 光谱 → Trae 三级跳 → 独立审计基石 → 自审审计器 → 对照评测 → 验证范式地图 → 状态。全程 Rick 第一人称、问题/取舍/验证作主句，诚实 caveat 与正文同框（26/26 不等于验证器更强、Trae 未上真机、原生 checker 是行为推断、N=1）。

### 关键决策与被否决的备选

- **叙事主轴（与用户确认）**：Claude Code 为主轴，Trae 压成 1 个 section + 可展开「战争故事」。否决「两平台平分」——会把未上真机的那半抬到与已验证那半同等地位，不诚实。
- **hero 交互选「谁来验收」演示**：否决把四象限/光谱直接放 hero——它们是分类法，更适合作后段的 payoff；hero 应先把问题演出来。
- **诚实底线**：卡片 desc 只写「探针级 5/5」，刻意不把端到端「26/26」抬进卡片（worker 没被施压，分不出验证器）。
- **配图重绘 vs 复用**：原 SVG 语义不符，重绘；保持 640×300 与文件名不变以兼容 ProjRow。
- **动态 SVG 用 `<style is:global>`**：Astro scoped 样式不命中 JS 动态创建的 SVG 节点，全部 `.sg-` 前缀隔离后用 global。

### 当前状态：能跑什么、怎么跑

- `cd rick-homepage && npm run dev` → 访问 `/projects/slash-goal/`；首页 `/` 第 2 位卡片点击跳转。
- 已验证：`npm run build` 通过（exit 0）；dev 下三个交互全部工作（DOM 实测：hero 两条路径、四象限 toggle 下落 + 点击侧栏、光谱点击）；首页卡片确认编号 02 / 标题 / `→` 活链接 / 新 SVG 加载 640×300 / 无旧占位重复；控制台无报错；移动端 375 宽无横向溢出。
- 截图存档：hero、光谱+Trae 矩阵、keystone 流程、对照评测计分板、验证范式四象限（已发给用户）。

### 未尽事项与已知问题

- 落地页未做 OG 分享图（沿用站点默认）；如需可后补 satori 卡。
- 预览器不支持程序化滚动（writer-pipeline 同样 scrollY=0），本次截图用临时负 margin 顶到目标 section（已复原，未改源码）。
- 时间线在 §08 用保守措辞（逆向研究与原生 /goal 上线前后有重叠，以仓库提交日期为准），未给精确前后顺序——交接文档明确标注此处不可编造。

### 文件级变更清单

- `src/data/projects.ts`：删除旧占位「Slash Goal 复刻」，新增「Slash Goal · 谁来认定「干完了」」为第 2 个 featured 条目。
- `src/pages/projects/slash-goal.astro`：新建落地页（markup + `is:global` 作用域样式）。
- `src/scripts/slash-goal-page.js`：新建交互脚本（复用 reveal/count-up 生命周期 + initHeroJudge/initQuadrant/initSpectrum）。
- `public/assets/proj-slash-goal.svg`：重绘卡片配图（会话内自评 vs 独立审计对照）。


## 2026-06-16 · 自制 ePub 在线阅读器 + 两本新书上传 + 10 本导言/8 张定制封面（multi-agent）

阅读模块的「自制 ePub」分区过去只有元数据 + 划线归档，读不了书、落地页缺导言、封面是扁平模板。这一轮把三个缺口一起补上：能在站内读、有导言、封面是为每本书定制的信息图。

### 做了什么（写给非开发者）

1. **站内 ePub 阅读器**：基于成熟开源引擎 epub.js（不自己造轮子），套一层钴蓝玻璃皮。能翻页、出目录、调字号、显进度；正文是深色护眼底 + 霞鹜文楷。**选中文字会弹出悬浮小菜单：划线 / 复制 / 分享**。划线会留在本地（换设备不同步），分享会即时生成一张「玻璃明信片」金句卡，可下载、复制带定位锚点的回链、或调系统分享。书页地址形如 `/reading/<书>/read/`。
2. **两本新书上传**：把 Documents 书架里的 `Harness Engineering`、`解剖 Codex` 收进项目，封面用它们 epub 内自带的精装封面，落地页加了「开始阅读」入口，点进去就是上面的阅读器。
3. **10 本导言**（multi-agent）：调用 18 个智能体的工作流，给自制书架全部 10 本各写一段 120–350 字导言，挂在各自落地页。两本新书的导言读了 epub 全文（标 high 置信）；评测/提示词等 4 本有真实划线作底（medium）；其余 4 本只凭标题副题在主题层概述（low，已标注，不杜撰）。
4. **8 张定制封面**（同一工作流）：把 8 本旧书的「扁平模板封面」全部重绘为**为各书主题定制的信息图 SVG**，仿两本新书封面的 house 语言（顶部 mono 元信息条 + 大标题 + accent 副题 + 专属示意图 + 底部 credit），每本一个专属配色与一张独有图示（四层耦合带 / 衰减条 / 左右解剖对照 / Goodhart 分叉曲线 / 雷达 / 模块电路 / 刻度尺 / 信号阶梯）。

### 关键决策与被否决的备选

- **阅读引擎选 epub.js 而非 foliate-js / react-reader**：epub.js 的 `selected` 事件 + `annotations.add` + CFI 持久化正好命中「划线→悬浮菜单→分享」，单依赖、vanilla（与现有 three.js 同样的 ESM island 用法）；foliate-js 要自己写标注层，react-reader 会拖入项目没有的 React。BSD-2 许可，可放心用。
- **iframe 内字体用 npmmirror CDN 而非自托管**：计划本想自托管霞鹜文楷 woff2，但全 CJK woff2 体积大；页面本就用同一 CDN 加载文楷，于是 iframe 内注入同一条 CDN 样式，零新增重资产、与站点一致。**取舍**：iframe 内多一个 CDN 依赖，断网/被墙时回退宋体。
- **分享两形态都做**：玻璃明信片金句卡（canvas 客户端绘制，复用现有 share-modal 弹层）+ 轻量「复制金句 + CFI 深链回链 + 原生分享」。短金句卡片偏空（留白多），属已知小瑕疵。
- **自制书登记走独立 source-of-truth 而非塞进采集产物**：两本新书不在微信书架、走不了 weread API，故新建 `data/local-books.json` + `data/book-extras.json`（authored，sync 永不覆写），由新步骤 `merge-local-books.mjs` 在采集后确定性合入 `reading.json`——不改 `generated_at`，单独重跑零 diff（幂等）。导言/副题/封面覆盖同走这条路，survive sync。
- **被否决**：把导言/epub 路径直接写进 `reading.json`（会被每次 `collect-weread` 重写清空）。

### 当前状态：能跑什么、怎么跑

- `npm run dev` → 已实测：`/reading/CB_local_harness-engineering/read/` 正常渲染（钴蓝主题 + 文楷 + 章节插图），目录 10 章、进度条、A−/A+；模拟真实选区 → 悬浮菜单弹出 → 划线落 localStorage 并可视、分享生成金句卡并弹出弹层（截图为证）。落地页导言块 + 副题 + 开始阅读按钮、书架 10 张新封面均正常。
- `npm run build` → **640 页 / 398 秒，exit 0**；`dist` 内两本书的 `read/index.html` + 落地页 + 8 张 SVG + 两个 epub(3MB) + 封面 PNG 均就位，epub-reader 岛已打包。
- 加书：复制 `<slug>.epub` 进 `public/assets/books/epub/`、封面进 `epub-covers/`、在 `data/local-books.json` 追加一条（id 用 `CB_local_<slug>`）、跑 `node scripts/merge-local-books.mjs`。补传旧书 epub：丢文件 + 在 `book-extras.json` 对应 `byTitle` 加 `"epub"`，落地页自动出「开始阅读」。

### 未尽事项与已知问题（缺陷优先）

1. **EdgeOne 需确认 `.epub` 的 MIME/缓存**：dev 下 `/assets/books/epub/*.epub` 返回 `application/epub+zip` 正常；EdgeOne 线上需验证按 `application/epub+zip` inline 返回（并建议 `Cache-Control: immutable`）。这是部署面板配置，非代码，**上线前你需在 EdgeOne 确认一次**。
2. **3MB epub 客户端整包加载**：首屏前需下载+解压整本，慢网下加载条会停留几秒（已有玻璃骨架兜底）。
3. **划线只在本机**：localStorage 存储，不跨设备同步；若日后重生某本 epub，旧 CFI 可能错位（已做内容兜底，失配标 legacy 而非乱定位——此兜底逻辑写了但未触发验证）。
4. **8 本旧封面 + 4 本 low 置信导言是 AI 产出**：题材与视觉的最终把关是你的。封面 contact-sheet 已发你预览；不满意的某张可单独重绘。4 本 low 置信导言（记忆四种耦合 / 一个词的解剖 / 分数之外 / 自主的尺度 / 信号的阶梯）只在主题层概述，补传 epub 后可精修升级。
5. **短金句分享卡留白偏多**：卡片为长引文设计，选很短的句子时下半部偏空。
6. CFI 深链回链（`#cfi=`）与位置恢复走同一 `display(cfi)` 路径（位置恢复已实测生效），深链单独未逐一验证。

### 文件级变更清单（可跳读）

- 新增：`src/pages/reading/[book]/read.astro`（阅读器路由）、`src/scripts/epub-reader.js`（阅读器岛：渲染/选区悬浮菜单/划线/localStorage/主题注入/canvas 金句卡/CFI 深链/VT 收尾）、`scripts/merge-local-books.mjs`（本地书 + 导言/副题/封面合入）、`data/local-books.json`、`data/book-extras.json`、`public/assets/books/epub/{harness-engineering,codex-anatomy}.epub`、`public/assets/books/epub-covers/{harness-engineering,codex-anatomy}.png`
- 重绘：`public/assets/books/ai/*.svg` ×8（定制信息图封面，删除旧 `memory-coupling.png`）
- 修改：`scripts/sync.mjs`（插入 4.5 步合并）、`scripts/config.mjs`（`wereadAiCovers` 改 svg + 注释）、`src/pages/reading/[book].astro`（副题 + 导言块 + 开始阅读按钮）、`src/lib/reading-ui.mjs`（`TOPIC_GRADS.harness`）、`src/styles/glass.css`（`.epub-*` 阅读器样式 + `.bk-intro*/.bk-subtitle/.bk-read-btn`）、`package.json`（+epubjs）
- 数据：`data/reading.json`（新增 harness 话题组 2 本 + 10 本导言/副题 + memory-coupling 封面改 svg）

## 2026-06-16 · 首页七项体验迭代（v5）+ 死代码/可达性审计 + 合并上线

### 体验影响（着重 · 先看这个）

- **导航不再「竖排」**：宽屏→窄屏 700–1000px 区间，三字中文 tab 会逐字竖排（丑）。改为 `.nav-link` 永不换行 + 顶栏→底部 Dock 的切换断点从 700px 抬到 860px——桌面横排放不下时直接切移动端 Dock，杜绝竖排。
- **首屏数据看板更紧凑**：「展开数据看板」从满卡宽收成内容宽胶囊（≈145px），「更新于…」并到同一行右侧，不再独占一行。
- **知识库图谱卡远景化 + 修误触**：首页迷你图谱镜头拉远（×1.5）、节点缩 0.7、辉光降 0.38，呈远景星系而非放大的大团；**拖拽旋转松手不再误触进入 /graph**（onClick 加 6px 位移判定区分点击/拖拽，/graph 同享此修复）。
- **窄屏统计横排**：单列布局下「598 篇 · 1073 双链 · 14 域」改横排一行，去逐行分隔与大留白。
- **二级页都有显式返回**：/graph 加「← 返回」(→/#knowledge)；知识库/写作/阅读列表页加「← 返回首页」(→各栏目锚点)；详情页本就有面包屑——不再只能靠浏览器返回。
- **下载简历前加轻量人机校验**：两处入口接管，弹玻璃「滑动验证」modal，拖到底再下载；纯前端零后端，无 JS 时链接仍可直接下载（不挡死）。
- **项目卡星系缩略图**换成自绘深空星系 SVG（替原静态简图）。

### 做了什么（除上述体验项）

1. **死代码/依赖清理**：删无人引用的 `graph-view3d.js`（18.5KB），卸 `3d-force-graph` + `three-spritetext`（实测全站 0 import）。
2. **可达性/SEO/性能审计批量**：全站补自指 `canonical` + `og:url`；分享卡关闭钮 32→40px；ProjRow 图补 `width/height` 防 CLS；`scroll-behavior` 包进 `prefers-reduced-motion:no-preference`；微信码 summary 补 focus-visible；图谱 bloom 在 reduced-motion 下也关。
3. **三路并行静态审计**（响应式 / 交互可达 / 诚实与死码）发现上述项；推测性的平板断点跳变实测后未见真坏，没盲目堆规则。

### 关键决策

- **第 3 点「星系预览太简约」判为「项目区 Galaxy View 卡缩略图」**（非知识库图谱卡，那是第 4 点），你拍板。只换 `projects.ts` 的 img 指向新建 `proj-galaxy-view-deep.svg`，不碰另一会话的 `proj-galaxy-view.svg` 与落地页。
- **简历校验用纯前端滑动验证**（三选一里你选零成本纯前端）——简历是求职门面，招聘方摩擦越低越好，边缘函数防爬虫成本不值。
- **合并范围：整条 kg-upgrade → main 立即上线**（你拍板 B），含另一会话当时在改状态；合并前以全量 build 绿为闸。
- **共享工作树并发**：对共享文件（Glass.astro/glass.css/projects.ts 等）做最小化外科手术式 Edit、编辑前重读，不覆盖另一会话的行。

### 当前状态：验证

- 已合并：本轮 7 项 + 审计包全部在 merge 提交 `1ac2714`（= origin/main，已部署），逐文件核验通过。
- 另一会话工作完好未回退（frontier v5/v6、writer-pipeline、galaxy-view、galaxy/* 都在；共享文件同时带两边改动）。
- 合并整树 `npm run build` → **638 页 / 479s / exit 0**。
- 实机（preview MCP）：导航 900/834px 不竖排、干净切 Dock；glance 按钮收窄 + 时间同行；窄屏统计横排；简历滑动验证 modal 走通（拖到底→下载）；/graph 返回钮在位。
- **未实机确认**：④「远景星系」运行时视觉——dev 服务器 Vite 依赖缓存被中途 `npm uninstall` 搞脏致 three 动态 import 卡 loading；生产 build 干净缓存 exit 0，线上照常渲染；未重启共享 dev 服务器（怕打断另一会话）。

### 未尽事项 / 已知问题

1. **简历 PDF 仍是 v0.8 损坏版**：⑥ 校验闸做好了但闸后下载的还是「AI 项目经历」复制粘贴损坏的 PDF——需你同名覆盖 `public/assets/rick-si-resume.pdf`。
2. **Part B 暂缓两项**（P2）：blog/kb 的 Article JSON-LD、skip-to-content 跳转链接。
3. 另一会话仍在活跃开发（EPUB 阅读器 `epub-reader.js` + 书封 SVG 等在制品），其分支可能还会再提交。

### 文件级变更清单（自动罗列，可跳读）

- 新增：`src/scripts/resume-gate.js`、`public/assets/proj-galaxy-view-deep.svg`
- 删除：`src/scripts/graph-view3d.js`
- 修改：`src/styles/glass.css`（导航 nowrap+860 Dock / kg-stats 横排 / wb-glance-foot / sub-back+gx-back / resume modal / a11y）、`src/layouts/Glass.astro`（canonical+og:url / data-resume×2 / resume modal / import）、`src/scripts/graph-view-galaxy.js`（mini 拉远+节点+bloom / 拖拽判定 / reduced-motion bloom）、`src/components/WorkbenchGlance.astro`、`src/data/projects.ts`（galaxy 卡 img）、`src/components/ProjRow.astro`（width/height）、`src/pages/graph.astro`（gx-back）、`src/pages/{kb,blog,reading}/index.astro`（sub-back）、`src/scripts/graph-mode.js`（注释）、`package.json`/`package-lock.json`（卸 2 依赖）

## 2026-06-16 · 新增「Writer Pipeline 写作系统」项目 + 高交互二级落地页

### 体验影响（着重 · 先看这个）

- **首页「项目」区第 2 位新增 Writer Pipeline**（MuseumCollect 之后、Galaxy View 之前），编号自动顺延为 02。它和 Galaxy View 一样有自己的二级落地页 `/projects/writer-pipeline/`——**点击进落地页，不跳 GitHub**（仓库 Private，代码库刻意杜绝死链）。
- **落地页核心是「pipeline 跑一遍」三阶交互**（按 Rick 反馈重做，替掉原来的单轮 X 光扫描——原版只 3 处高亮、只改 1 处，体现不出 pipeline 怎么工作）：同一段哥伦比亚大选题材，① **AI 初稿**（同主题演示构造的「体面的空洞」——流畅、有结构、像有观点，却用对称句式／抽象大词／伪共情／认识论投降「没有标准答案」打太极，7 处紫色高亮的难察觉 AI 味；二改后刻意不写成小学生作文式的弱靶子，否则体现不出 pipeline 的提升）→ ② **去 AI 味**（writer 注入 voice memo 改写到真实草稿 §8，critic 第二轮逮金句口癖：绿 A 承重句留／红 C 电锯补刀砍）→ ③ **配额收口**（红 C 片段当场坍缩，落到真实 v5）。点高亮看 critic 判语，可逐阶跳或「↺ 再跑一遍」循环。把 writer↔critic 逐轮工作过程做成可玩演示。原始 AI 初稿构造不算造假——pipeline 的输入本就是 AI 生成的稿。
- **正文是第一人称案例长文**，覆盖：砸掉自己设计的 13 组件系统（PM 自审 severity 4/5，13→3 拆除可视化）→ examples≫rules（砍 5 维 voice DNA）→ **AI 味到底是什么（新增 §03）** → AI 味可扫描清单 + 金句 earned/cosplay 配额 → v4→v5 四处纯减法 diff → 跨模型 A/B 实测推翻自己写进 plan 的推荐 → 决策时间线 → 验证窗口与「刻意不做」清单。
- **新增 §03「AI 味到底是什么」（竞品 + 本质，按 Rick 要求加，已做轮 web 调研）**：本质——AI 味不是词汇问题是概率问题（LLM 挑最可能的下一个词＝回归均值；检测器把它量化成 perplexity + burstiness；RLHF 偏爱「清楚周到」把安全演成深刻），所有 tell 是「一个病根的七种表症：模型在求稳、不在下判断」。竞品三派卡：检测器对抗派（Undetectable AI/QuillBot，✗ 军备竞赛+北极星错）／禁用词清单派（GPT-ism 黑名单，✗ 打地鼠）／例子+品味派（few-shot/Sudowrite，✓ 我在这派，但多了一层扫「体面的空洞」的 critic + 「我宁愿发」的验收线）。收尾点题：我和检测器只在诊断一致、裁判分道（低 burstiness=AI 我认，所以 writer 强约束长短句交替；但裁判是「会不会贴公众号」不是检测分）。来源：GPTZero/Originality perplexity+burstiness、Altman 承认 em-dash 调高、「delve」过度表征研究。
- 全部文案按 Rick voice memo + critic AI 味清单写并自扫：无导览腔、无升华结尾、无大词、无 hedging，金句控在配额内。
- 全部为**草案**，待你视觉终审。

### 关键决策

- **仓库出口：不放 GitHub（你拍板）**——仓库 Private 且含未发表写作与自审。落地页本身即交付物，CTA 用「回到全部项目」+ 一句「暂不公开」。被否决：设为 public（对外发布，未授权）／放死链。
- **文章引文：用真实节选（你拍板）**——承重句、被砍的电锯句、四处减法 diff 全来自仓库实测产物（critic-v4.md / draft-v4 / draft-v5）。被否决：全脱敏示意（说服力弱）。
- **复刻不重造**：骨架抄 `galaxy-view.astro`，reveal/count-up 抄 `galaxy-page.js`；自己写的只有扫描器三态交互 + 13→3 拆除动画。

### 当前状态：验证

- `npm run dev`（`.claude/launch.json` 已配 rick-homepage）→ 开 `/projects/writer-pipeline/`。
- 已实测（preview MCP）：`npm run build` 通过 exit 0，页面已 emitted 到 `dist/projects/writer-pipeline/index.html`（42KB）；首页第 2 位、内链 `/projects/writer-pipeline/` 正确、封面/icon 正常；扫描器三项交互（X 光高亮 / 净化收起 / 点句看判语）均 eval 验证工作；控制台无报错；移动端 375px 无横向溢出。

### 未尽事项 / 已知问题

- **视觉未经你终审**：hero / 排版 / 扫描器配色按草案做，待过目定稿。
- build 末尾有一条 `ENOENT ... FrontierTimeline_*.mjs`——引用的是首页/前沿组件，与本次新增页**无关**，build 仍 exit 0、全部页面 emitted；疑似 Astro/Vite chunk 清理既有竞态，留观。
- count-up 数字在 headless 后台标签会因 rAF 节流冻在中途值，前台真实浏览器跑到终值正常（与 galaxy-view 同款模式）。
- 扫描器「净化」收起改用 inline-block + max-width 裁剪（原先 font-size:0/opacity:0 被全局规则盖掉）；移动端修了 `sec-title-row` 不换行导致的 5px 溢出。
- 封面 `proj-writer-pipeline.svg` 是程序化意象图（手稿 + 扫描线 + A/B/C），非真实截图。

### 文件级变更清单

- 新增 `src/pages/projects/writer-pipeline.astro`（落地页主体 + `wp-` scoped 样式）
- 新增 `src/scripts/writer-page.js`（reveal + count-up + 扫描器三态交互）
- 新增 `public/assets/proj-writer-pipeline.svg`（首页项目封面缩略图）
- 改 `src/data/projects.ts`：index 1 插入 Writer Pipeline 条目（featured，内链）
- 新增 `.claude/launch.json`（preview dev server 配置，rick-homepage:4399）

## 2026-06-16 · Galaxy View 落地页 v2：整页星系背景 + 体验优先 + 已上架

### 体验影响（着重 · 先看这个）

- **整页星系背景 + Liquid Glass**：落地页背景从全站雪山主视觉换成「程序化星云画布（固定整页）+ 玻璃内容浮其上」。给 `Glass.astro` 加 `space` prop → `body.gv-space` 深空兜底（无 WebGL 也不露雪山）。
- **漏斗反转**：首屏主 CTA 从「在 GitHub 上看」改成「**飞进我的知识库 →**」——开一个**全屏浮层跑真实知识库的 3D**（复用 `graph-view-galaxy.js` 真渲染器 + 真实 graph.json，真笔记标题 + 拖拽/缩放/飞行/点击/搜索）；浮层里放「**看看是怎么做的 →**」把动线拉回正文。GitHub 降为状态段次要文字链，首屏不出现。
- **已上架**：插件已正式上架 Obsidian 社区插件市场。kicker、状态段、安装路径全改为「设置 → 社区插件 → 搜 Galaxy View 安装」；BRAT 降为 beta 备注。
- **叙事中度重构**：首屏加「一眼看懂」成果带（已上架 / 4 天 / 16→60fps / 22k→19 / 超越全部前辈）、加「Obsidian 图谱是什么」一句、把 PM 决策做成「决策」callout（不 fork、数字门控）、基准卡加 before→after 迷你条。
- **性能取舍（明确告知）**：整页实时星系 + 玻璃模糊是全站最重组合。缓解：滚出首屏冻结背景画布、浮层打开时暂停背景（错峰双 bloom）、标签页隐藏暂停、移动端降级、reduced-motion 静帧、真渲染器懒加载。低端机首屏仍可能偏吃 GPU。
- 全部为**草案**，待你视觉终审。

### 关键决策

- **背景用实时星系（你拍板）**：全页固定画布 + 滚出首屏冻结（玻璃罩静止画布的 backdrop-filter 成本低）。被否决「首屏实时 + 下方静态深空」。
- **两个渲染器各司其职**：背景 = 程序化星云（`galaxy-hero.js`，好看、轻）；浮层 = 真渲染器（`graph-view-galaxy.js`，真数据、真产品演示）。错峰运行避免双 bloom。
- 浮层 modal 机制照搬工作台看板（scrim/inert/焦点圈闭/ESC/滚动锁/AbortController）。

### 当前状态：验证

- dev 实测 `/projects/galaxy-view/`：背景星系挂载（整页固定）、`body.gv-space` 生效、两个 CTA + 成果带在位、无报错（截图确认首屏：星系底 + 玻璃 + 反转 CTA + 已上架带）。
- 浮层实测：点击主 CTA → 浮层打开、滚动锁、真渲染器挂载 `stageCanvas=1` + **23 个真实笔记标题** + 布局沉降、`.open` 生效。浮层淡入透明度因 headless 节流 CSS transition 未推进（真浏览器正常）；像素截图受并行 session 抢标签页 + HMR 重载阻挠未拿到干净图——功能已确认。
- **完整 `npm run build` 本轮未跑**（按「实际渲染/预览」验收；且本仓有并行 session 在跑构建/编辑，clean build 会互相争 .vite）。设计定稿后再一次性跑构建确认可部署。

### 文件级变更清单

- 修改：`src/pages/projects/galaxy-view.astro`（整页背景结构 + 反转 CTA + 成果带 + 决策 callout + 基准迷你条 + 已上架 + 全屏浮层 markup + is:global 深空背景 + 大量 scoped 样式）、`src/scripts/galaxy-page.js`（背景挂载 + 配色/辉光 + 全屏浮层控制器 + 懒挂 renderGraph3D + 背景暂停联动 + 焦点圈闭/ESC/滚动锁）、`src/scripts/galaxy-hero.js`（改整页固定背景 + 滚出首屏冻结 + pause/resume）、`src/layouts/Glass.astro`（+`space` prop + body class）
- 复用（未改）：`src/scripts/graph-view-galaxy.js`（renderGraph3D 真渲染器）、`src/scripts/galaxy/*`、`src/lib/site-data.mjs`
- 文档：`WORKLOG.md`（本条）

## 2026-06-16 · v6：星图评级多维化收口 + 内容回溯抽样入站（Human-in-the-loop）

### ⚠ 体验影响（用户可见层）
1. 评级口径三项调整：**商业事件**（融资/IPO/并购）单独标 business 类型、absolute≤3（不再占超新星）；源级新增**北斗**（猎户座之上的最高级，9 实体）；person 按**主业身份**归领域。
2. 前端：条目加「商业」类型徽章；人物卡加源级星徽，**北斗金色醒目**（❖）。
3. 前沿数据从 36 条扩到 118 条（新增 82 条回溯动态 + 8 个新实体）。

### 做了什么
1. **Human-in-the-loop 回溯**：用户给 ~60 实体种子名单（person/org 双轨、10 tier、priority/subdomain/affiliation 的完整系统设计）→ 派 15 个 web 研究 agent 抽样回溯过去 3 个月（2026-03-15~06-15）真实动态、星图评级、校准分类 → 生成校正清单 → 用户校 3 条口径 → 重校准 → 入站。
2. **三口径固化进体系**：collect-frontier schema/prompt 加 business 类型（融资 absolute≤3）；frontier-ui 加北斗 CONSTELLATION（含 CONSTELLATION_RANK）；config 8 个实体升北斗 + person 按主业重定 domain。
3. **抽样入站**：import-backfill.mjs 把 82 条回溯动态合并进 frontier.json（slug 对齐 andrej-karpathy→karpathy、URL 去重跳过 5 条、字段补全、标 backfill），config 扩到 people 14 / topics 9。
4. 前端 business 标签（4 处）+ 人物卡北斗金徽。

### 关键决策与被否决的备选
- **商业事件单独标记**（用户拍板）：融资/IPO 声量大但不改写能力边界，absolute≤3、归 business 类型，不混入能力星图——超新星从抽样的 31% 回落。
- **北斗 = 猎户座之上最高源级**（用户拍板）：四机构（OpenAI/Anthropic/DeepMind/DeepSeek）+ 五顶级人物（Ilya/Karpathy/Demis/Dario/LeCun）。
- **person 按主业身份归类**（用户拍板）：Karpathy=工程教育、Dario/Ilya=前沿实验室、研究者→研究与评测；不因近期发长文就归写作。
- **回溯靠 web 研究而非抓取管线**：RSS/X 只给最近 ~20 条，拿不到 3 月历史；arXiv 能查但仅论文。多 agent web 搜索是唯一可行路径，每条带来源 URL + confidence、搜不到不编。
- **先抽样入站再全量**（用户拍板）：15 个高优先级实体先入站验证口径与观感；剩 ~43 实体全量回溯（~2-3M tokens）待用户看效果后决定。
- 黑洞通胀教训延续：抽样首轮也出现 gravity 误判，prompt 已收严（公开内容一律 gravity=false）。

### 当前状态
- 构建绿（635+ 页），dist 验证：business 标签、北斗金徽 5、时间轴 118 节点、人物卡 14。
- 数据：data/frontier.json 118 条（82 回溯 backfill）；原始样本 data/frontier-backfill-sample.json；校正清单 data/frontier-backfill-review.md。
- 星类分布健康无通胀：超新星26/新星22/微光40/彗星12/流星11/深空5/星尘2。

### 未尽事项与已知问题
1. 新增 4 位人物（李飞飞/Chris Olah/Subbarao/Tenenbaum）暂用字母牌兜底头像，未生成真头像（fei-fei/olah 有 wiki 可生成，subbarao/josh 无 wiki）。
2. 回溯条目无长摘要（web 研究只给一句话判断），前端展开摘要显示的是 verdict 本身——回溯固有局限，可对 backfill 条目隐藏展开区只留判断+原文。
3. 全量回溯（剩 ~43 实体）未做，等用户看抽样入站效果后决定节奏。
4. 新实体的「日常抓取源」sources 暂空（回溯数据已入库，日常源待配）——collect-frontier 会 warn 但不阻塞。
5. 未推送，等用户过目效果。

### 文件级变更
- 新增：scripts/import-backfill.mjs、data/frontier-backfill-sample.json、data/frontier-backfill-review.md
- 修改：scripts/config.mjs（北斗 8 实体 + 8 新实体 + person 主业 domain）、src/lib/frontier-ui.mjs（北斗 CONSTELLATION + RANK）、scripts/collect-frontier.mjs（business schema/prompt）、scripts/migrate-frontier-rating.mjs（措辞对齐）、src/components/FrontierEntry.astro（business 标签）、src/components/FrontierPersonCard.astro（源级星徽）、src/pages/frontier.astro（business 筛选）、src/pages/index.astro（business 标签）、src/styles/glass.css（北斗金徽）、data/frontier.json（118 条）

## 2026-06-15（galaxy）· 个人主页新增 Galaxy View 项目案例 + 高交互 3D 星系落地页

> **修订（同日，视觉回退）**：hero 渲染器经一轮预览后**回退**。真渲染器版（渲染真实知识图谱）被判「太丑」——真图谱的力导向链接太密、读成「网」而非「星云」。改回**程序化生成的星云**（`src/scripts/galaxy-hero.js`，1×Points 聚合 + 发光球 shader + bloom，确定性种子、不含真实数据），**bloom 默认开**（关掉会发扁）、保留配色（6 主题）/辉光切换。
> 当前事实：① hero = 程序化星云（非真渲染器）；② `galaxy-hero.js` **已恢复**（不是删除）；③ `galaxy-page.js` 改回 import `galaxy-hero.js`；④ 落地页不再 `loadSiteData`/内联 graph、去掉点击读出；⑤ `galaxy/mount.js`+`galaxy/cameraDirector.js` 的可嵌入改动**保留未回退**（加性、默认不变，spike 仍可用，但本页已不调用）。下文凡「真渲染器 / 真实图谱 / 点击读出标题 / draw calls=6」均指被回退的版本，留作决策记录。

### 体验影响（着重 · 先看这个）

- 「项目」栏目新增 **Galaxy View**，置于首页**第 2 位**（紧随 MuseumCollect），featured。卡片点击进**站内二级落地页** `/projects/galaxy-view/`（其余项目仍直跳 GitHub）——这是全站第一个项目二级页。
- 落地页 hero 是**实时 3D 星系**：复用上一个 session 移植进 `src/scripts/galaxy/` 的**真渲染器**（聚合渲染 + d3-force-3d Worker 布局 + 镜头导演），渲染**本站真实（已发布脱敏）知识图谱**（与首页 /graph 同源，实测 1127 节点）。拖拽旋转、点击节点飞过去并显示真实笔记标题、闲置巡航。整帧 **draw calls = 6**（实测）。
- **性能取舍（明确告知）**：此页动态加载 three.js + d3-force（独立 chunk，不进首发包）。已加：懒加载（hero 进视口才拉 chunk）、出视口/标签页隐藏即暂停 RAF、移动端降级（关 bloom + pixelRatio≤1.5 + 星空减密，靠 shader 热核保约 80% 观感）、嵌入模式关掉滚轮缩放与 WASD（不劫持页面滚动/键盘）、WebGL 不可用或无图数据回退 SVG 海报、reduced-motion 关闭闲置巡航。
- 文案全程第一人称、判断先行（主线：性能墙 → 聚合渲染 → 性能与美学汇合）；PM×AI 协作按要求**点到为止**（不以「不写代码」开场）。
- 全部为**草案**，hero 文字暗角 / 读出位置 / 时间线密度等待你视觉终审。

### 做了什么（结果导向）

1. `projects.ts` 新增 Galaxy View 条目（index 1、featured、href 站内 `/projects/galaxy-view/`）。
2. 自绘 `public/assets/proj-galaxy-view.svg` 缩略图（产品无真实截图，隐私）。
3. 落地页 `src/pages/projects/galaxy-view.astro`：10 段案例长文（命题 / 问题+前辈墓地 / 聚合渲染突破 / 基准数字表 / 逆向 NASA Eyes / 里程碑时间线+战争故事 / 品味细节 / 工作方法 / 状态+GitHub CTA），scoped 样式贴合钴蓝玻璃设计系统，滚动揭示 + 数字 count-up；内联真实 graph.json（loadSiteData）。
4. `src/scripts/galaxy-page.js`：懒加载真渲染器、出视口/隐藏暂停、按钮联动（辉光开关 / 回总览）、点击节点读出真实标题、WebGL/数据回退。
5. 把上个 session 的真渲染器从「spike 专用」补成「可嵌入」（**加性改动，spike 不受影响**）：`galaxy/mount.js` 加 embed/mobile/reduced 入参 + pause/resume/setBloom/getBloom；`galaxy/cameraDirector.js` 加 enableZoom/enablePan/enableKeys/cruiseEnabled/enabled/touchAction 选项（默认全不变）。
6. 删除中途自写、后被真渲染器取代的 `src/scripts/galaxy-hero.js`。

### 关键决策与被否决的备选

- **hero 用真渲染器（你拍板）**：开工发现上个 session 已移植真渲染器 + 一次性 spike 验证过它能跑真实 graph.json，遂接入。**被否决**「保留我自研的程序化复刻星系」——真渲染器更有说服力（真插件跑真图谱），且数据已在站内 /graph 公开、无新增隐私风险。
- 落地页用**单个静态页**而非 `[slug].astro` 动态路由：只有这一个项目需要落地页，不引入抽象。
- hero 控制从初版「配色/辉光切换」收敛为「辉光开关 + 回总览 + 点击节点读出真实标题」：点击飞行 + 真标题比配色循环更有信息量、更 authentic。

### 当前状态：能跑什么、怎么跑

- `npm run build` → **退出码 0**，`dist/projects/galaxy-view/index.html` 生成（252KB，含内联真图）；worker/mount/three 正确 code-split 成独立 chunk（`dist/_astro/forceWorker-*.js`、`mount.*.js`）。尾部 `manifest ENOENT` 是构建收尾清理竞态（前几条记录的已知现象），不影响产物。
- 实测（dev，`/projects/galaxy-view/`）：hero 渲染真实 1127 节点星系、`drawCalls=6`、`settled=true`；9/9 段滚动揭示生效；基准表 6 行；大数字 count-up 到 19；点击节点读出真实笔记标题。已截图 hero（钴蓝发光星系 + 全套文案 + GitHub CTA）。
- 入口链路：首页第 2 位卡片 → 点击进落地页 → hero 实时 3D + GitHub CTA 硬链 `github.com/Longwind1984/galaxy-view`。

### 未尽事项与已知问题

1. **GitHub 仓库需 push 成 public**，否则 CTA 404（你已说现在就去 push）。
2. **本会话期间有另一个 Claude session 在同仓库并行作业**（前沿/frontier 任务 + `astro build --outDir dist-default-check`/`dist-kg2b`，并同改 WORKLOG）——持续 HMR 重载 + 争 CPU + 污染 Vite 缓存，导致本地预览反复跳页/掉 chunk。我的源码经核对完好；上面的实测是在它的间隙抓到的。
3. **遗留实验**：`src/pages/galaxy-spike.astro` + `dist-kg2spike/`、`dist-default-check/`、`dist-kg2b/` 等临时 dist 产物仍在仓库；spike 页自带注释「验证完可删」（`src/scripts/galaxy/` 已被本页正式复用，**保留**）。建议清理 spike 页 + 临时 dist 目录，但非本任务产生、未擅自删。
4. 真渲染器 reduced-motion 下仍有极缓星空自转/微闪（renderer.render 内置），未做成完全静帧——幅度可忽略；如要严格静帧需再改 renderer。
5. 移动端 hero = 自转 + 点击飞行（不接管拖拽手势以保页面可滚）；真机触屏未逐一验证。
6. headless 预览报 `pointer:coarse` → 命中移动端档（bloom 关）；真机带鼠标桌面 bloom 默认开。

### 文件级变更清单（自动罗列，可跳读）

- 新增：`src/pages/projects/galaxy-view.astro`、`src/scripts/galaxy-page.js`、`public/assets/proj-galaxy-view.svg`
- 修改：`src/data/projects.ts`（+Galaxy View 条目，index 1）、`src/scripts/galaxy/mount.js`（embed/mobile/reduced/pause/resume/setBloom）、`src/scripts/galaxy/cameraDirector.js`（嵌入选项，默认不变）
- 删除：`src/scripts/galaxy-hero.js`（中途自研，被真渲染器取代）
- 文档：`WORKLOG.md`（本条）

## 2026-06-15（续）· v5：前沿追踪三大升级——星图多维评级 + 二维时间轴 + Routine 云端兜底

### ⚠ 体验影响（置顶，用户可见层变更）

1. **评级从单一分数改为多维「星图」**：每条动态不再是 importance 1-5，而是 `声量 apparent × 分量 absolute` 两轴解耦 + gravity/periodic/canon 三个布尔，映射成天文星类徽章（超新星/深空/新星/流星/黑洞/微光/星尘…）。深空=被低估（高分量低声量）、流星=炒作（低分量高声量），条目卡显示星类徽章替代旧金点。
2. **落地页顶部从横滚人物条改为二维时间轴**：纵轴领域分组含人物/源行，横轴时间（7/30/90 天可切窗），节点按评级大小/颜色编码、点击深链到下方条目、行名可筛选。
3. **主页前沿卡片加迷你时间轴**：突出「持续追踪」的时间序状态（近 14 天泳道），在今日要点大卡之上。

### 做了什么（按用户三点）

1. **二维时间轴**（`FrontierTimeline.astro` + `frontier.js` 窗口切换 + glass.css `.ft-tl`）：泳道图，纯 CSS/SVG 无图表库；mini（主页领域聚合无 JS）/ full（落地页人物行 + 7/30/90 切窗）。节点 `%` 定位（响应式，非固定 px 滚动）。
2. **星图评级体系**（用户在 Downloads 拟了规约 v1，我读取后落地）：采集端 `collect-frontier` schema 改三维分 + prompt 注入紧凑规约；星类由 `frontier-ui.starOf` **确定性映射**（规则单点，改规则不必重抓）；源级星类（猎户座/星辰/行星）标在 config。规约全 13 类按「评的是什么」分三层落地：条目级自动 / 源级 config 标 / 场级 v1 暂缓。完整文档 `docs/star-rating.md`。
3. **Routine 云端兜底**：`collect-frontier --remote`（直连/跳被墙 X 源/claude 走 PATH）+ `docs/frontier-routine.md`（手动配置 prompt/cron/能力边界）。

### 关键决策与被否决的备选

- **评级三层落地而非硬塞 13 类给逐条管线**：逐条 claude 只能可靠产出 EVENT 类 + 维度分；FIXTURE（源）是人物档案属性、FIELD（场）需聚合——硬塞会让一堆永不命中的星类成摆设、且通胀。
- **采集端只存维度分、星类前端算**：规则单点在 `starOf`，改规则零重抓；`starin` 全网格覆盖（补了规约 absolute≥4 高声量的盲区）。
- **Routine 只能兜底不能主力**（诚实告知用户的硬约束）：云端隔离 VM 访问不到本机文件（工作台数据只能本地）、且抓不到被墙 X 源（名单里多人只有 X 源）。本地 LaunchAgent 仍是主力。
- **黑洞通胀修正**：首轮迁移 prompt 对 gravity 定义太松，把 Simon Willison 公开帖等误判黑洞；收紧措辞（任何公开可读内容一律 gravity=false）后重评，0 黑洞。
- **存量 27 条调 claude 仅评级补三维**（不碰已发布内容），口径与新采集逐字对齐（审查发现措辞偏弱已修正重评）。
- 时间轴「可滑动」用窗口切换（7/30/90）+ `%` 定位实现，而非固定 px/天 的拖动滚动——更响应式；27 条/4 天数据下完全够看。

### 当前状态：能跑什么

- `npm run collect:frontier`（全源）/ `collect:frontier:remote`（云端子集）/ `frontier:portraits` / `migrate-frontier-rating.mjs --force`（存量补评级）。
- 星类分布健康无通胀：超新星/深空/新星/流星/微光/彗星/星尘 多样，0 黑洞。
- 落地页时间轴 DOM 实测通过：3 领域组/10 行/27 节点/窗口切换刻度更新/星徽 27/行名筛选/节点深链。主页 mini 时间轴渲染正确。
- 完工跑了 18-agent 三维度对抗审查，confirmed 问题已逐个修复（migrate 措辞对齐、enhanceText REMOTE 跳过、frontier.js 死选择器清理、docs 推送说明、REMOTE 日志措辞）；判定不修的（migrate REMOTE = YAGNI 本地工具）用注释澄清。

### 未尽事项与已知问题

1. **真实视觉效果待用户在浏览器过目**：dev 预览浏览器被并行会话占用，未能截图；`localhost:4321/frontier` 可看真实效果。
2. 场级星类（星云/基点）v1 未自动化，留作未来手工策展位。
3. 时间轴无「拖动滑动」（用窗口切换替代）；数据攒多后若需更细时间缩放再加。
4. Routine 需用户手动在 claude.ai 配置（需 GitHub 授权，我无法代办）；按 `docs/frontier-routine.md`。
5. 未推送上线——本地验证完，待用户过目视觉后 commit+push。

### 文件级变更清单

- 新增：`src/components/FrontierTimeline.astro`、`scripts/migrate-frontier-rating.mjs`、`docs/star-rating.md`、`docs/frontier-routine.md`
- 修改：`scripts/collect-frontier.mjs`（三维 schema/prompt/落盘 + REMOTE 模式 + 防通胀）、`scripts/config.mjs`（people/topics 源级 constellation）、`src/lib/frontier-ui.mjs`（STAR_CLASS/starOf/hypeGap/CONSTELLATION）、`src/components/FrontierEntry.astro`（星类徽章）、`src/pages/frontier.astro`（时间轴替换横滚条）、`src/pages/index.astro`（mini 时间轴）、`src/scripts/frontier.js`（窗口切换 + hashchange + 死选择器清理）、`src/styles/glass.css`（ft-star + ft-tl ~90 行）、`package.json`、`README.md`
- 数据：`data/frontier.json`（27 条补三维评级）

## 2026-06-15（四续）· 头像提示词放宽 + dario/yann/lilian/demis 重做

### 体验影响（先看）

- 上一轮「全量重生」用了**过度具象**的提示词（强制金线横穿 / 头占 60% / 「少几笔就能认出」），结果把
  **dario / yann / lilian / demis 做塌、卡通化、面部细节流失**——用户判定旧金标准更优。本轮放宽提示词重做这 4 人：
  面部细节与神态明显回升、**已超过旧金标准**；金色点缀回归「自然的弧线 / 曲线」而非死板横线段。
- 关键认知（用户纠正）：**提示词只该锁「风格一致性」，不要 micro-管构图 / 姿态 / 金线形状 / 占比**——
  过度具象会压掉模型的自由发挥与面部表现力。
- 其余 6 人（karpathy/ilya/francois/simon/sam/nathan）仍是上一轮（较具象提示词）产物，**本轮未动**
  （用户只点名这 4 人 + 收尾）。这 4 人细节略高于那 6 人，整体仍同一风格族；要全套细节齐平可用同一放宽
  提示词把 6 人也重抽——**待定，未做**。

### 做了什么

1. **放宽 `stylePrompt`**：只锁风格一致性（钴蓝深空 + 星点 + 自然金色点缀 + 白线/冰川蓝调色板），删掉
   构图/姿态/金线形状/占比的硬性指令；`generate` 的似真 wrapper 回退原版（不再用「少几笔」压细节）。
2. **重做 4 人**（删 4 张 webp + 跑脚本）：dario-amodei / yann-lecun / lilian-weng / demis-hassabis。
   逐张与旧金标准对比，4 张均更优（细节/神态/自然金弧），无边框，全部采用。

### 当前状态

- 线上 10 张 = 4 张放宽提示词新版 + 6 张上一轮版本。`npm run frontier:portraits` 缺图才生。
- 未推送上线（仅本地）。

### 未尽 / 已知

1. 6 人是否也用放宽提示词重抽以求全套细节齐平——**待用户定**（本轮按要求只动 4 人）。
2. 未 push。

### 文件级变更

- 修改：`scripts/config.mjs`（`stylePrompt` 放宽 + 教训注释）、`scripts/generate-frontier-portraits.mjs`（似真 wrapper 回退原版）
- 资产：`public/assets/frontier/{dario-amodei,yann-lecun,lilian-weng,demis-hassabis}.webp` 重做

## 2026-06-15（三续）· 工作台重设计：首屏 Glance 卡 → 原地展开 bento 数据看板

### 体验影响（着重 · 先看这个）

- 工作台从「首屏右侧 480px、还要内部滚动的单卡」改成「首屏精简 **Glance 卡** → 点『展开数据看板』在首屏**原地展开/收起**成全宽 **bento 看板**（模态浮层，暗 scrim 盖住 hero）」。首屏多了一层动态行为。
- **删**了独立的「02 工作台数据」正文段；口径/估算并进看板里一个极小的「口径 v2」折叠入口。锚点 `#workbench` 从正文段迁到 Glance 卡（顶部导航/scrollspy 仍指它）。
- 正文段**重编号 01–05**（项目/知识库/前沿/写作/阅读）；首屏目录条去掉「工作台」数字项（它就是首屏本体）；**顶部全局导航的「工作台」保留**，点它回首屏 Glance——故出现「导航留、目录条去」的不对称。
- 首屏主数从「今日 token」改为「累计 2.7B tokens」+ 产出副句（今日 token 降为看板里小字，规避「今天没干活=0」当头牌）；模型分布由文字 chips 升级为**分段条**；22 周热力图放大并补图例。
- **迭代（同会话，用户反馈后）**：首屏主/副标题改为「在人工智能与人类的十字路口」+ 个人化文案（去掉滴滴/Uber 简历式数字）；Glance 卡进一步缩小（宽 480→400、数字 46→33px、内边距收紧），并**用整体多源热力图替掉 14 日 sparkline**（14 日趋势仅留在展开看板）——把首屏主视觉（雪峰 + 登顶人影）让出来。
- 以上均为**草案**，需你在预览里做视觉与信息架构终审后才算定稿。

### 做了什么（结果导向）

1. 调研三路业界最佳实践（proof-of-work 个人主页 / 仪表盘数据可视化 / quantified-self），落到设计：bento 层级（1 主 tile + 支撑）、KPI 卡、Tufte sparkline、热力图给空间+图例、**每个活动指标配产出**、streak/产出叙事。
2. 新增 `WorkbenchGlance.astro`（收起卡）+ `WorkbenchBoard.astro`（展开看板），数据同源 SSR 透传、Board 默认隐藏、无客户端取数。
3. 展开/收起交互在 `home.js`：切类液态动画 + 焦点管理 + ESC + 点 scrim/站内锚点关闭 + inert 背景 + 滚动锁 + reduced-motion 即时显隐；复用既有 `AbortController`/`astro:page-load` 重 init；热力图段因 `#heatmap` id 不变零改动。
4. 产出导向：看板「产出联动」stat tile 真链接——提交→`#projects`、笔记→`#knowledge`、写作→`#blog`（活动即成果）。
5. 玻璃/可达性：看板钴蓝实时玻璃 + 暗 scrim；接入三档降级阶梯（reduced-transparency / 无 backdrop-filter / high-contrast）；`hm-tip` z-index 提到 320，让热力图悬浮明细浮在看板之上。

### 关键决策与被否决的备选

- **方向 A 改良版（你拍板）**：不做单独模块/不走 tab，Glance 原地展开为模态浮层。**被否决** B「精炼单卡原位重排」（受 480px 宽限制，数据展不开）。
- 浮层用 `position:fixed` 模态（z 高于导航 + inert 背景）而非 plan 初稿的「z 低于导航」——更稳的 a11y 与层级，等效实现「原地展开」意图。
- 主数用累计/连续而非今日 token——规避首屏 0 值脆弱（调研：活动必须配产出/语境）。
- 顶部导航不动（全局共享层）：只迁 `#workbench` 锚点 + 本页内重编号，最小化波及面。

### 当前状态：能跑什么、怎么跑

- `npm run dev` → localhost:4321 首页：Glance 一屏放下**不滚动**；点「展开数据看板」→ 浮层盖 hero（暗 scrim + 钴蓝玻璃，身后 Glance/hero 已隐去不叠影）；热力图维度切换在看板内生效；收起钮/ESC/点 scrim 均可关闭，焦点与 `aria-expanded` 归位、滚动解锁、Glance 复显。已在桌面 1440 + 移动 375（全屏 sheet）两档验证。
- `npm run build` → **退出码 0** 构建通过（本次因并行的 galaxy 构建争用 CPU，耗时偏长；尾部 `ENOENT manifest` 是两套构建抢共享临时文件所致，与本改动无关）。

### 未尽事项与已知问题

1. **视觉终审待你拍**：看板内 14 日趋势图偏大/偏高、热力图在宽 tile 内左对齐留白——是否收窄趋势 / 居中热力图。
2. **信息架构终审**：重编号 01–05 + 目录条去「工作台」 vs 导航保留「工作台」的不对称是否接受；若想对称，备选是导航也去「工作台」或目录条保留一个「工作台」展开触发项。
3. ESC/scrim 关闭与焦点圈闭仅桌面浏览器模拟过；真机触屏 + 键盘 Tab 圈闭建议再过一遍。
4. reduced-motion / 三档玻璃降级是按规范加的 CSS，未逐一在对应系统设置下肉眼验证。
5. 旧死 CSS（`.wb-grid`/`.wb-detail-*`/`.tk-*` + 1180 断点的 `.wb-grid` 规则）暂留未删，待视觉定稿后清理。

### 文件级变更清单（自动罗列，可跳读）

- 新增：`src/components/WorkbenchGlance.astro`、`src/components/WorkbenchBoard.astro`
- 修改：`src/pages/index.astro`（hero 挂 Glance + 浮层、删 `#workbench` 段、正文重编号、目录条、组件透传 props）、`src/scripts/home.js`（工作台展开/收起控制器）、`src/styles/glass.css`（`.hero-wb` 去滚动 + Glance/Board/scrim/分段条/产出 tile/口径入口样式 + 移动 sheet + reduced-motion + 三档降级接入 + `hm-tip` z-index）
- 文档：`WORKLOG.md`（本条）

## 2026-06-15（再续）· 头像回退 Nano Banana + 管线优化（弃用 Seedream）

### 做了什么

1. **弃用 Seedream，头像回退 Nano Banana（Gemini）**：上一条把头像切到 Seedream 后，用户看对比判定「几乎不可用」。
   多策略 + 15 个对抗评审 agent 复核确认：Seedream 复刻不了「钴蓝之夜」细线稿——风格漂移、**随机加白边/相框**
   （小 logo 极碍眼，逐张随机非提示词可治）、串色、似真不可控。已 `git checkout` 恢复 10 张 Gemini 金标准 +
   还原 Gemini 管线（脚本/config）。Seedream 的 key/lib/文档保留作非头像生图备选。
2. **优化 Nano Banana 管线（两条方向）**：
   (a) 风格一致 + 面部识别度——重写 `stylePrompt`：似真优先（少几笔也认得出谁）、强制金线+星点+近黑满版底、
   头占画面约 60% 的一致构图、三七分头肩像；generate wrapper 改为「似真优先于风格化」。
   (b) 调用经济性——管线本就「只为缺图的人生成」；明确：改 prompt 不自动重生、单张用 `--force`、
   全员重生才删 webp；还原度差先查参考图而非盲目全量重生。
3. **验证 + 纠错**：用优化提示词跑 karpathy + demis 两张样张（/tmp，不动线上）——风格贴合金标准、
   金线/星点/占比到位、**无边框**、面部识别度提升。另：我一度误判 demis 参考图「是错的人」，经核 Wikipedia
   实为本人（2024 化学诺奖照，今貌有须戴蓝框镜）——是我记忆过时，参考图无误，已更正注释与说法。

### 关键决策与被否决的备选

- **回退 Nano Banana（用户拍板）**：Seedream 虽统一了管线，但质量/一致性/似真均不达标；Gemini 是已验证的金标准。
- **不全量重生（默认）**：现有 10 张金标准保留；优化提示词主要用于将来新人 + 可选的一次性统一升级。是否用新提示词
  把 10 张重做一遍交用户定（约 ¥/$ 微量，一次性）。
- **被否决**：继续调 Seedream 提示词/加风格参考图——实测仍随机加边框，边框是逐张随机、非提示词可根治。

### 当前状态：能跑什么、怎么跑

- **线上 10 张已用新提示词全量重生**（用户拍板）：逐张验收，3 处随机缺陷已 `--force` 重抽修掉——
  simon-willison（白边框）、ilya-sutskever（连抽 2 次「暗底暗线」无白填充，第 3 次正常；其参考图最小/低对比）。
  成品：统一线稿、近黑满版底 + 星点 + 金线、头占约 60%、无边框、识别度提升。
- `npm run frontier:portraits` 缺图才生，走代理 + `.gemini-key`；代理 7897 在；Seedream key/lib 保留备用。

### 未尽事项与已知问题

1. 新提示词比旧版面部细节更足（更易识别），若嫌过细可下调 stylePrompt；Gemini 单张有随机性，必要时 `--force` 重抽。
2. **未推送上线**（仅本地，未跑 build——assets 同名 drop-in、wiring 未变，已逐张验图）。满意后 commit+push 触发 EdgeOne。
3. ilya 参考图偏小（13KB），若想更稳可在 config 给他 `refPhoto` 直链换张高清照。

### 文件级变更清单

- 还原：`scripts/generate-frontier-portraits.mjs`、`scripts/config.mjs`、`public/assets/frontier/*.webp` ×10（git checkout 回 Gemini）
- 修改：`scripts/config.mjs`（`frontier.portrait.stylePrompt` 优化 + 注释更正/经济性说明）、
  `scripts/generate-frontier-portraits.mjs`（似真 wrapper 强化）、`README.md`（头像 SOP 步骤 3 回 Gemini）、
  `docs/image-generation.md`（重写为「头像=Nano Banana，方舟=备选」）
- 保留：`scripts/.ark-key`、`scripts/lib/ark-image.mjs`（非头像生图备选，未删）

## 2026-06-15 · 人物快照生图切到火山方舟 Seedream 4.0（统一生图后端）

### 做了什么

1. **接入字节火山方舟（Volcengine Ark）作为项目统一生图后端**（文生图 + 图生图），替换原 Gemini nano-banana-2。key 存 `scripts/.ark-key`（已 gitignore），一把 key 通用所有字节系模型（账号级，换模型只改 model 字段）。
2. **统一入口 `scripts/lib/ark-image.mjs`**：端点 / 模型 ID / 鉴权 / 参考图 base64 编码只记忆这一处，别处只调 `arkImage()`。改写 `generate-frontier-portraits.mjs` 走 Seedream 4.0 图生图（`doubao-seedream-4-0-250828`，本人照片做似真锚点）；境内域名经 `NO_PROXY` 强制直连、不走翻墙代理（与旧 Gemini 管线相反）。
3. **复刻全部 10 张前沿人物快照**：旧 Gemini 版备份至 /tmp 且 git 可恢复，删后用统一 `stylePrompt` 一次性重生，保证整组风格一致。
4. **文档**：新增 `docs/image-generation.md`（key 位置 / 调用规则 / 计费 / 直连注意）；更正 README 头像 SOP 关于「不传参考图」的过期说法（实际一直传本人照片做 i2i）。

### 关键决策与被否决的备选

- **风格方向（用户拍板 A）**：实测 Seedream 审美与旧「钴蓝之夜」细线稿不同，朴素版/调校版两次 prompt 都复刻不了旧风格（底更亮、厚涂、爱自加白边/粉衬衫/圈耳环/领夹麦）。给三选项——A 接受新风格全部重生 / B 用风格参考图逼近旧风格 / C 旧的不动只用于新人——用户选 **A**，整组换成 Seedream 风格、内部一致优先。
- **草样先行**：先出 2 张草样（karpathy + lilian）写到 /tmp 给用户看、未确认不覆盖现有 webp；计费操作（批量约 ¥2）在选定 A 后才执行。
- **stylePrompt 加减法约束**：不改审美方向，只补「满版去白边 + 不得自加参考图里没有的首饰/服饰」两条减法，压制实测的两类缺陷。

### 当前状态：能跑什么、怎么跑

- `npm run frontier:portraits` → 仅补缺图；删 `public/assets/frontier/*.webp` 可全员统一重生；`-- --force <slug>` 重抽单张。
- `npm run build` 绿：10 张新头像入 `dist/assets/frontier/`，/frontier 页全部引用到位。
- 10 张已逐一肉眼验收：无白边、无串色；karpathy / lilian 因单张随机性各重跑一次修掉粉衬衫 / 白边框。

### 未尽事项与已知问题

1. **Seedream 单张有随机性**：偶发白边 / 串色 / 自添服饰，`-- --force <slug>` 重跑即换一张。
2. **背景明暗仍有轻微批次差异**（dario / yann 略亮），未逐张抠；要严格统一可逐个 `--force` 重抽。
3. **未推送上线**：仅本地 dist 验证；满意后 `npm run sync` 或手动 commit+push 触发 EdgeOne 重建。
4. 旧 Gemini key（`scripts/.gemini-key`）与 `geminiModel` 备份保留未删，备查。

### 文件级变更清单

- 新增：`scripts/lib/ark-image.mjs`、`scripts/.ark-key`（gitignore）、`docs/image-generation.md`
- 修改：`scripts/generate-frontier-portraits.mjs`（Gemini→Seedream 图生图 + NO_PROXY 直连）、`scripts/config.mjs`（`frontier.portrait`: provider/arkModel/genSize + stylePrompt 加去白边/去乱加饰品约束 + 注释更新）、`.gitignore`（+ `scripts/.ark-key`）、`README.md`（头像 SOP 步骤 3 更正）
- 资产：`public/assets/frontier/*.webp` ×10 全量重生（Seedream 4.0）

---

## 2026-06-14 · v4 续：合并 Trae 首屏重构 + 页脚分享按钮 + 推送上线

### 做了什么

1. **合并并行 Trae 迭代**：origin/main 已被 Trae（worktree）会话推进「重构首页第一屏设计」——把原 INDEX 目录侧栏换成 `hero-wb` 工作台数据卡（今日 token/趋势/热力图上提首屏）+ 横向目录条。把 origin/main 合入 v4，唯一冲突在 `glass.css` 的 6 行 hero 头：**取 Trae 的 100vh 居中布局 + v4 的太阳金 kicker**（Trae 保留的是旧白 kicker，设计系统规定 kicker 用金）。其余 Trae 新类（hero-wb/hero-index-strip/wb-detail + 降级三档登记）全用 v4 token，3-way 干净合入；index.astro 取 Trae 版（v4 未碰）。结果 = Trae 的 IA（工作台进首屏）+ v4 的视觉语言，两者正交兼容。
2. **页脚融合分享按钮**：页脚链接排加「分享名片」按钮，开整站名片卡弹层（`/share/site.jpg`）。分享弹层从 reader-only 改为「reader 或有页脚」都渲染；`reader.js` 分享逻辑泛化为多触发器（`[data-share-trigger]` 各自带 card/title/url），reader chrome 钮与页脚钮共用一套。解决了上一条 WORKLOG「site 卡已生成但无入口」的遗留。
3. **推送上线**：v4（含本次合并）合并进 main 并 push，EdgeOne 自动重建。

### 验证

- build 全量绿；首页 hero-wb 卡在 v4 玻璃质感下渲染、kicker 金/目录条编号群青/MiSans 字体；页脚「分享名片」→ 整站名片卡（2.7B token/598 节点/19 天）720×1280 加载、复制/下载/系统分享通；reader 页双触发器（博文卡 + 整站卡）各开各的、互不干扰；移动端页脚按钮在链接排内不破版；控制台零错。

### 文件级变更

- 修改：`src/layouts/Glass.astro`（页脚分享按钮 + 弹层渲染条件 reader→reader||footer + reader chrome 钮加 data-share-trigger）、`src/scripts/reader.js`（分享逻辑多触发器化）、`src/styles/glass.css`（合并 Trae hero-wb 等 + `.foot-share` 样式 + hero 冲突解决）、`src/pages/index.astro`（采用 Trae 首屏重构）、`package-lock.json`

---

## 2026-06-13 · v4：设计系统入库 + v2「钴蓝之夜」全站落地 + 玻璃明信片分享卡

### ⚠ 体验影响（置顶，全部为用户可见层变更，未经确认不算定稿）

1. **全站换色**：底色转深钴蓝 #070D20 系；操作色从冰川蓝 #4D9FEC 换为群青 `oklch(0.58 0.20 263)`；新增太阳金 `oklch(0.85 0.13 86)` 仅用于小字数据强调（kicker/live/热力图顶档），永不上按钮和大数字。
2. **背景压暗 78%→62% + 右上太阳金晕**：照片透出更多、戏剧中心保留——整页观感显著变亮。
3. **全站字体更换（SF Pro 退役）**：UI 主力 MiSans（拉丁本地 VF + CJK CDN 子集 npmmirror 源 + 本地 L3 兜底 14.7MB）；数据/标签/落款 Geist Mono；书摘/引文换霞鹜文楷「人的声音」。中文渲染从系统苹方变为 MiSans——所有平台观感一致但与 v3 不同。
4. **玻璃配方钴蓝化**：.sec/导航/卡片从灰白渐变玻璃改为钴蓝透色玻璃，描边由白改蓝白三档。
5. **热力图 4 档→5 档「雪夜→日出」**：群青逐档攀升，最活跃的 ~2% 天（当前仅 2026-06-07）变成带微辉光的金格。
6. **图谱 12 色等明度色环替换 18 色旧板**：2D/3D/图例/主页一致换色；3D 选中青 #02bfe7（NASA 词汇）保留未动。
7. **前沿模块领域色随色环更新**（lab/工程/研究/写作 = h240/180/90/300），研究域从旧金 #E8B36A 改为 h90 暗金。
8. **kb/blog 分享卡从横版 OG 换为竖版 360×640 玻璃明信片**（设计系统 ShareCard 规格）：雪山照片 + 钴蓝玻璃面板 + 金 kicker + 来源徽章/主题 chip + URL/钩子/QR 落款 + 摄影署名；弹层与下载/系统分享随之切换（横版 OG 卡保留给社交平台 meta 抓取，同步换 v2 配色与 MiSans）。

### 做了什么

1. **设计系统入库**（commit 24b1603 已推送）：`docs/design-system/` 完整收录 Claude Design 产出的 v2「钴蓝之夜」包（tokens/组件/18 张规范卡/UI kit/参考存档；剔除 78MB uploads 原始字体）。写入项目记忆：后续 UI 改动必须先查阅该包。
2. **v2 全站落地**：以 DS `styles/glass.css`（v2 基底）重组 `src/styles/glass.css`，回贴 v3.2-v3.6 漂移块（kg-stage/gx-label/rd-ai/bk-/ft- 共 ~300 行）并适配（gx-label 字体、ft 旧金→太阳金）；`src/styles/tokens/` 镜像 DS tokens；字体管线（fonts.css + Glass.astro CDN link + public/fonts 新增 6 个字体文件）；JS 侧 GRAPH_PALETTE/DOMAIN_ACCENT/热力图分档同步。
3. **ShareCard 实现**：`src/lib/share-card.mjs`（satori，无 backdrop-filter → 面板内嵌 hero-blur 按 cover 几何精确对齐再叠钴蓝渐变，与实时玻璃同配方）；三形态 node/article/site；`/share/kb|blog/*.jpg` + `/share/site.jpg` 构建期端点（JPEG q82 ≈ 55KB/张）；QR（qrcode 依赖）指向页面 URL；reader 分享弹层换竖卡。
4. **撤销项坚持**：DS 快照仍带 sec-prerendered 假毛玻璃路径，按 2026-06-12 用户决策剔除不回归。

### 关键决策与被否决的备选

- **CDN 选 npmmirror 而非 DS 写的 jsdelivr**：站点部署大陆备案域名，jsdelivr 在大陆长期不稳；npmmirror（阿里）同包同路径。DS 文件本身未改，落地层替换。
- **分享卡 satori 玻璃**：被否决的备选是「半透明渐变假玻璃」（无模糊，违背 Liquid Glass 调性）与「客户端 DOM 截图」（html2canvas 不支持 backdrop-filter）；采用「预模糊照片对齐内嵌」——烘焙图像里这是物理等价实现，非作弊路径。
- **竖卡输出 JPEG 而非 PNG**：照片底 PNG 单张 >700KB×640 张不可接受；JPEG q82 ≈ 55KB，dist 增量 ~35MB。
- **MiSans 构建字体取官方 zip 静态 Regular/Semibold**（npm 包只有切片 woff2，satori 不识）；标题 600 重，缺字回退 Noto Medium。

### 当前状态：能跑什么、怎么跑

- `npm run dev` → localhost:4321；`npm run build` → ~1270 页产物（634 页 + ~640 张竖卡 + ~630 张 OG）。
- 本地未推送，等用户过目 v2 观感与分享卡后再推（用户可见层默认草案）。

### 未尽事项与已知问题

1. v2 换色后全站截图细看（对比度/降级三档/移动端）只做了抽查级验证，未逐页审。
2. MiSans CJK CDN 子集 4 档字重声明值为 330/450/520/630（包内口径），CSS 350-700 请求按最近匹配——观感 OK 但与名义字重有偏差。
3. 分享卡标题超 30 字符截断（lineClamp 2 + 字符保险），04T 超长标题如「R02 中型·模型路由 + 语义缓存 降本实验」恰好 2 行；更长的会带 …。
4. site 形态分享卡已生成 `/share/site.jpg` 但暂无入口（主页非 reader 页无分享钮）——待定是否在页脚加。
5. config.mjs 里前沿头像生成 prompt 仍引用旧色（#4D9FEC/#E8B36A）——改了会使新旧头像风格不一致，留待头像整体重生成时一并处理。

### 文件级变更清单（自动罗列，可跳读）

- 新增：`docs/design-system/`（120 文件）、`src/styles/tokens/{colors,typography,radius-motion}.css`、`src/styles/fonts.css`、`src/lib/share-card.mjs`、`src/pages/share/kb/[...slug].jpg.ts`、`src/pages/share/blog/[...slug].jpg.ts`、`src/pages/share/site.jpg.ts`、`public/fonts/{MiSansLatinVF.ttf,MiSansL3-Regular.otf,GeistMono-*.woff2,OFL-Geist.txt}`、`assets-src/fonts/{MiSans-Regular,MiSans-Semibold}.ttf`、`assets-src/fonts/{GeistMono-Regular,GeistMono-Medium}.otf`、`assets-src/fonts/LXGWWenKai-Regular.ttf`
- 重写：`src/styles/glass.css`（DS v2 基底 + 漂移块回贴，1290 行）
- 修改：`src/layouts/Glass.astro`（tokens/fonts import + CDN link + shareImage prop + 竖卡弹层）、`src/scripts/reader.js`（data-share 优先）、`src/scripts/home.js`（热力 5 档 + 2D 标签字体）、`src/scripts/graph-view.js`（标签字体）、`src/components/TrendChart.astro`（Geist Mono）、`src/lib/sample.js`（12 色环）、`src/lib/frontier-ui.mjs`（领域色）、`src/lib/og-image.mjs`（v2 配色 + MiSans）、`scripts/lib/util.mjs`（热力 5 档）、`src/pages/kb/[...slug].astro`、`src/pages/blog/[...slug].astro`（shareImage）、`package.json`（+qrcode devDep）
- 数据：`data/activity.json`（5 档重生成）

## 2026-06-12（六续）· v3.6：前沿追踪体验大改——似真头像 + IA 反转 + 重要度全链路

### 做了什么（按用户四条反馈逐一）

1. **头像似真化**（用户：「Dario 完全不像」）：管线升级为「真实照片 → 风格化」——每人先取真实照片（config 显式 `wiki` 词条主图 8 人 / X 头像 via nitter 2 人；显式配置是因为按名字猜会错人：Nathan_Lambert 词条是澳洲政客），作为主体参考图传给 nano banana 2，再按 stylePrompt 统一风格。全员第三次重生成，目检 Dario（卷发圆框眼镜）、Ilya（光头）、Lilian（黑长发刘海）均可辨认本人。照片缓存 scripts/.frontier-refs/（gitignore，不发布）。
2. **落地页 IA 反转**（用户：「为什么文章在上、人在下、没折叠」）：人物以**横滚头像条**置顶（56px 头像+名字+条数角标，点击即筛选；0 条者降权禁点；尾接机构源 chip）——压缩态在上、完整档案卡沉底 #people，避免「先滚 10 张大卡才见今天更新」的反效果。动态流**按日折叠**：最新一天展开，更早日组收成 `<details>`（摘要行=日期+条数+该日最高信号标题）；筛选激活时全组强制展开防吞结果。
3. **主页卡片重设计**（用户：「只露标题不够吸引」）：三段式——①10 人头像锚点条（有动态者亮、无动态者暗，链到档案区）②今日要点大卡（importance 最高一条：头像+人名+判断 clamp 2 行）③两条紧凑行。**选条规则改为 importance≥4 优先且排除 insufficientContext**——上线即生效：之前占门面的「Sam Altman 一句期待语」（模型自评 2 分）被自动换下。
4. **独立审计 agent**（用户指定）：产出 13 项问题清单 + 完整方案（全文见会话记录），已实施的关键项：importance 全链路上线（此前采集端打分、前端整条丢弃）、日组内按重要度排序、5 分条目金点标记、标题直接外链原文（原先埋两层）、标签减噪（每条露 2 个其余收进展开区，154 个按钮→52）、条目内冗余日期删除、「今天/昨天」相对日标、NEW 标记（采集端新增 addedAt 字段，下轮起生效）、筛选胶囊 slug 漏出修复、类型徽章去色（与领域色双语义撞色）、0 条人物全位点禁点。

### 关键决策与被否决的备选

- 人物区上移采用「压缩横滚条 + 完整档案沉底」而非整区搬顶：375px 下 10 张大卡是 10 屏滚动，反而推远正文（审计 B2 论证）。
- 折叠按日而非按重要度分层：重要度用「组内排序+金点」表达，不增加分层 UI。
- 审计明确「不要做」并采纳：时间轴矩阵（数据密度不足）、人物详情页（人均 0-5 条）、重要度数字展示、头像条 marquee、无限滚动。
- 审计建议删 `?view=cards`，但用户先前拍板两套都留——保留（用户决策优先于审计）。
- 头像第三批确认了正确的参考图语义：**本人照片=似真锚点（必须传）；别人成品=串脸事故（禁止传）**。

### 当前状态

- 全量构建绿（630 页）；落地页/主页/交互均 DOM 实测通过（横滚条筛选联动、折叠展开恢复、禁点、胶囊人名、金点 ×5、标题外链 ×26）。
- 仍未推送（与 v3.2/v3.4 一起等合并推）。

### 未尽事项

1. NEW 标记依赖 addedAt 字段，现存 26 条无此字段——明天采集起新条目才会带。
2. 「盯 10 人」叙事 vs 流里机构源占 16/26（审计 A3）：UI 已用横滚条强化「人」，但根治在采集侧（人物源密度），观察一周再调名单/quota。
3. 4 人零动态（Ilya/LeCun/Lilian/Nathan）——lookback 只有 3 天属正常，但若一周后仍零，检查其源配置。

### 文件级变更

- 修改：`scripts/generate-frontier-portraits.mjs`（真实照片参考管线）、`scripts/config.mjs`（人物 wiki/refPhoto 字段）、`scripts/collect-frontier.mjs`（addedAt + xcancel 占位 RSS 过滤）、`src/pages/frontier.astro`（IA 重构）、`src/components/FrontierEntry.astro`（标题外链/金点/NEW/标签减噪/去日期）、`src/components/FrontierPersonCard.astro`（0 条禁点）、`src/pages/index.astro`（三段式卡）、`src/scripts/frontier.js`（组级折叠/横滚条联动/人名映射）、`src/styles/glass.css`（+约 100 行）、`.gitignore`（.frontier-refs）
- 资产：`public/assets/frontier/*.webp` 全员重生成（第三批，似真版）

## 2026-06-12（五续）· v3.5：前沿追踪人物卡升级 + 头像管线 + 增量一致性守卫

### 做了什么

1. **人物卡重设计**（档案馆气质）：64px 头像列 + 名字/头衔/一句话定位 + 条目数，按领域着色（lab 蓝/engineering 青/research 金/writing 紫，取自 GRAPH_PALETTE 不加新色票）。
2. **头像双轨管线**（`npm run frontier:portraits`）：有 GEMINI_API_KEY（env 或 scripts/.gemini-key，已 gitignore）时调 nano banana 2（gemini-3.1-flash-image，官方文档 2026-06-12 查证，约 $0.067/张）自动为缺头像的人生成——风格由 config 的 stylePrompt 模板锁定 + 已有头像作参考图传入（跨批次风格一致）；无 key 时打印每人完整 prompt 供 AI Studio 手动生成，PNG 丢回目录重跑脚本自动压 webp。**头像缺失不破版**：人物卡回退程序化「星座字母牌」（slug 哈希种子的确定性 SVG，深空底+星座连线+缩写+金色短划，与 AI 共创书封面模板同一气质）。
3. **增量一致性守卫**（用户核心关切「批量加人时怎么保持一致」）：
   - 分类一致：domain 是闭集枚举，collect-frontier 启动即校验，不在枚举直接报错退出；
   - schema 一致：slug 格式/唯一性、X handle、rss url 全部启动校验（增量管线通断检查点）；
   - 标签一致：每次梳理把现有条目 TOP30 高频标签注入 prompt 要求优先复用，控制同义漂移；
   - 头像一致：stylePrompt 单点定义 + 参考图传递；title/bio 文案规范写进 README SOP（机构+角色 ≤20 字 / 一句话定位 ≤40 字）。
4. README 新增「新增追踪人物 SOP」四步流程。

### 关键决策

- 名单保持现状 10 人（用户拍板，后续批量增加）。
- 本机无 GEMINI_API_KEY、anygen CLI 未装——头像生成做成双轨而不是阻塞等凭证：管线先通，AI 头像是即插即用的增强。
- 字母牌兜底是设计决策不是将就：新增人物从「config 加一条」那一刻起页面就完整，头像异步补。

### 当前状态

- **10 张 AI 头像已生成**（用户提供 GEMINI_API_KEY 后两批跑完）：512×512 webp 落 `public/assets/frontier/`，构建产物验证通过；key 在 `scripts/.gemini-key`（gitignore，权限 600）。
- 踩坑两个并已修：① 文档给的 `v1` 端点不认 `responseModalities`，实际要走 `v1beta`+`imageConfig`；② **参考图会「串脸」**——第一批把已有头像当风格参考传入，Lilian Weng 生成出了 Karpathy 的脸；删除参考图机制、纯 stylePrompt 模板锁风格后第二批全员主体正确且风格依旧一致（目检 5 张确认）。
- `npm run collect:frontier -- --dry-run` 校验通过；人物卡 DOM 验证：10 卡全部用真头像（img），字母牌兜底逻辑保留给未来新增人物。

### 未尽事项

1. 预览截图在滚动位全 navy、img 懒加载在后台冻结预览窗中不触发——均为预览环境现象（与 v3.1 的 rAF 冻结同源），验证一律以 DOM/构建产物为准；上线后真浏览器再过目一遍头像观感。
2. stylePrompt 是初稿，若要整体调风格：改模板 → 删 `public/assets/frontier/*.webp` → 重跑（约 $0.67/全员）。
3. 头像相似度依赖模型对公众人物的认知：知名度低的人（如未来新增的小众学者）可能长相不准，届时可手动放真照片风格化（脚本的 PNG 规整轨道已支持）。

### 文件级变更

- 新增：`scripts/generate-frontier-portraits.mjs`、`src/lib/frontier-ui.mjs`
- 修改：`scripts/config.mjs`（frontier.portrait 块）、`scripts/collect-frontier.mjs`（validateFrontierConfig + TAG_VOCAB 注入）、`src/components/FrontierPersonCard.astro`（重写）、`src/pages/frontier.astro`（头像探测）、`src/styles/glass.css`（人物卡布局重写）、`package.json`（frontier:portraits）、`.gitignore`（.gemini-key）、`README.md`（SOP）

## 2026-06-12（四续）· v3.4：四项体验反馈修复

1. **图例展开/收起失败**：`.kg-leg-item` 自带 `display:flex` 压过了 `hidden` 属性——补 `[hidden]{display:none}`（与 v2 修 ⌘K 面板同一军规，已在 CSS 里注释立法）。
2. **全屏按钮远离窗口**：图例展开把 kg-stage 拉高而 3D 窗固定 460px，按钮锚在 stage 底就悬空了——改为窗口高度 100% 跟随 stage（min 460px），按钮永远贴窗右下角。
3. **撤销写死底图，回归实时 Liquid Glass**：删除 v2 的 `sec-prerendered` 性能路径（预模糊 hero-blur.jpg + fixed attachment 替代 backdrop-filter）——写死底图与实时玻璃观感有差异，一致性优先于合成开销；全站 .sec 恢复实时 `backdrop-filter: blur(20px) saturate(150%)`。
4. **AI 共创书真封面 + 首页展开**：《记忆的四种耦合》从仅存的 epub 提取**原版封面**；其余 7 本源文件已删除（导入微信读书后清理），按原版模板（深 navy 底/白宋体题/金色短划/灰蓝副题/底部署名）重绘 SVG——**副题为按各书主题补写，非原文**，资产在 `public/assets/books/ai/`，映射在 `config.mjs → wereadAiCovers`。首页 AI 共创区从话题 chips 改回展开的 8 本封面横条（点击进各书划线页），/reading 与书页同步用真封面。

状态：本地构建绿（630 页），四项已在预览逐项验证。**仍未推送**——与前沿模块（v3.3，A/B 视觉待拍板）一起合并推。

## 2026-06-12（三续）· v3.3：前沿追踪模块——每日抓取 AI 学者动态 + 模型梳理 + /frontier 阅读流

### 做了什么

新增「前沿追踪」整套模块（参考「边缘行者」的信息架构，视觉完全走站内 Liquid Glass 体系）：

1. **每日采集管线**：`collect-frontier.mjs` 抓取 10 位 AI 前沿人物（Karpathy、Dario、Ilya、Hassabis、LeCun、Chollet、Lilian Weng、Simon Willison、Sam Altman、Nathan Lambert）+ 5 个机构/话题源（Anthropic/OpenAI/DeepMind/ARC Prize/arXiv agent 论文）的公开动态，覆盖博客 RSS、arXiv API、YouTube、X（nitter.net + rss.xcancel.com 镜像池）。
2. **模型梳理**：每条新动态走本机 `claude -p` 无头模式（现有订阅、零 API 计费）产出中文标题、一句话判断、200-400 字摘要、标签、内容类型四分类（署名作品/本人发言/个人行动/被引用）。首批已落 26 条真实数据，单条约 8-15 秒。
3. **前端**：`/frontier` 动态流页（四维筛选：类型/领域/人物/标签 + URL 参数深链 + 按日分组 + 展开式摘要 + 原文摘录核查块）、人物档案卡区、主页新增 04 section（最新 4 条）、导航第 6 项「前沿」、⌘K 搜索纳入（`/ft` 前缀）、独立订阅源 `/frontier.xml`。
4. **编排**：挂入 `npm run sync` 第 5 步；LaunchAgent plist 补了 PATH/代理环境变量（launchd 下没有 shell alias）。

### 关键决策与被否决的备选

- **模型调用走 claude CLI 无头而非 Anthropic API**（用户拍板）：零新增计费，代价是只能本地跑、Mac 关机当天缺数。`--no-session-persistence` 是硬性要求——否则每天虚增十几个会话污染工作台 usage/activity 统计（proof-of-work 指标不能掺水）。`--bare` 被否决：它强制 API key 认证，绕开订阅。
- **X 抓取走第三方镜像池**（用户拍板 v1 必含 X）：nitter.net 主、rss.xcancel.com 备，镜像 URL 归一为 x.com 做跨镜像去重。实测镜像有瞬时 400（同一 URL curl 通而连续请求被拒），设计为单源失败静默缺失、`stats.lastRun.skippedSources` 可见、次日自动补抓。被否决：RSSHub 公共实例（403）、syndication 端点（已死）。
- **涉政双闸是硬约束**（站点部署在备案域名）：`excludePatterns` 正则预过滤（不送模型）+ prompt 内 relevant=false 判定，与「公版书划线政治暴露风险」同一决策脉络。
- **幻觉防护**：prompt 硬约束只许基于抓到的原文 + 落盘保留 500 字符原文摘录供前端核查 + 模型自报 `insufficientContext`。抽查 4 条（Karpathy/Dario/DiffusionGemma），关键事实均能对上原文。
- **时间轴鸟瞰矩阵不进 v1**：冷启动数据稀疏，矩阵大面积空白比没有难看；攒两周数据后再加「近 14 天活跃微条」。
- **RSS/Atom 解析手写约 80 行而非引依赖**：仅需 5 个字段；约定 ≥2 个真实源解析翻车才升级 fast-xml-parser。本轮 18 个源全部解析正常。

### 当前状态：能跑什么、怎么跑

- `npm run collect:frontier`——单独采集（`--dry-run` 只看抓取结果不调模型）；`npm run sync`——全量同步含前沿追踪。
- `data/frontier.json` 已有 26 条真实数据；`npm run build` 全量通过；`/frontier` 页筛选/深链/375px Dock 均实测通过。
- 视觉 A/B：用户拍板**两套都留**——默认报纸流，`?view=cards` 切卡片流，暂不删。
- **每日定时已启用**（用户确认）：plist 已 `cp + launchctl load`，今晚 21:30 起每日自动 sync+push。注意 sync 的 git add 只含 data/content/kb/assets 路径，并行未定稿的源码改动不会被自动提交。
- 完工前跑了一轮三维度多代理对抗审查（16 agents）：12 个候选发现中 7 个被验证层推翻（误报），5 个确认并已修复——claude stdout JSON.parse 包 try/catch、writeJson 改临时文件+rename 原子写（util.mjs，全部采集脚本受益）、seen 过期清理加日期格式校验、frontier.js document 级监听加防重挂载守卫、标签内 `|` 字符落盘前替换（与前端分隔符冲突）。

### 未尽事项与已知问题

1. **语义重复**：同一事件经不同账号发布会各成一条（如 Dario 新文 = 本人推 + Anthropic 官号推），URL 去重拦不住；v2 可加模型判重。
2. **ylecun 源两轮瞬时 400**：镜像站对连续请求的随机拒绝，已加 1.2s 节流，次日观察；长期退路是自建 RSSHub。
3. X 条目时间窗内的置顶推会反复出现在 feed 里（seen 账本已兜住，只是首轮会收进旧置顶）。
4. arXiv 查询 `cat:cs.CL AND abs:"LLM agent"` 偏宽，论文条目质量不齐，名单待用户用几天后修剪。
5. 订阅限流撞车（21:30 恰逢重度使用 CC 时）：限流即中止、次日补做，未实测触发路径。
6. `?view=cards` 试穿参数在筛选交互后会从 URL 消失（类保留），定稿删落选方向时一并清理。

### 文件级变更清单

- 新增：`scripts/collect-frontier.mjs`、`src/pages/frontier.astro`、`src/pages/frontier.xml.ts`、`src/components/FrontierEntry.astro`、`src/components/FrontierPersonCard.astro`、`src/scripts/frontier.js`、`data/frontier.json`、`data/frontier-seen.json`
- 修改：`scripts/config.mjs`（+frontier 块）、`scripts/sync.mjs`（第 5 步）、`scripts/com.ricksi.workbench-sync.plist`（EnvironmentVariables）、`package.json`（collect:frontier）、`src/lib/site-data.mjs`、`src/lib/sample.js`（SAMPLE_FRONTIER）、`src/layouts/Glass.astro`（navItems+scrollspy 派生+alternate）、`src/pages/index.astro`（04 section+目录卡+改号）、`src/pages/blog/index.astro`（sec-no 05）、`src/pages/search-index.json.ts`、`src/scripts/cmdk.js`、`src/styles/glass.css`（ft-* 约 110 行+移动 Dock 收紧）、`README.md`

## 2026-06-12（再续）· v3.2：图谱交互三连 + 阅读模块二级页与人工筛选中间层

### 做了什么

**知识图谱三个交互迭代**：
1. 主页图例折叠：14 个主题域默认只显前 6 个 + 「展开全部」按钮，图谱卡不再被撑长。
2. 全屏入口改为预览窗右下角的玻璃小按钮「⤢ 全屏探索」（原侧栏文字链接移除），符合播放器式交互直觉。
3. 节点标签炫光修复：标签从 WebGL SpriteText 整体迁到 **CSS2DRenderer DOM 叠加层**——文字彻底退出 bloom 后处理管线，零炫光、系统字体渲染、样式回归站点调性（这也是 NASA Eyes 的标签做法）；节点本体辉光保持不变。

**阅读模块重构（首页精简 + 二级页 + 筛选中间层）**：
1. 首页阅读区收敛为 teaser：统计行 + AI 共创一行话题 chips + 最近在读 + 书架前 9 本 + 「进入阅读页」。
2. 新增 `/reading/` 总页（完整看板、AI 共创全块、全部书架）和 **每本书的落地页 `/reading/<id>/`** 承载划线句子（17 本人选书 + 8 本 AI 共创 + 最近在读，共 26 页）。
3. **人工筛选中间层**：`scripts/config.mjs → wereadShelf`（mode manual + titles 白名单，已预填当前 17 本）；只有白名单书的划线会被抓取并公开发布；每次采集在控制台打印「候选书目」清单（87 本有阅读痕迹的书）供增删。
4. 划线已做硬敏感词扫描（台/港/疆/藏/领导人等：零命中）；古典政治哲学语境的一般词汇未拦，**逐本内容把关仍在你**——本地预览 `/reading/` 逐本点开过目。

### 关键决策

- 「展开还是二级页」：选二级页——每本书的点击天然是落地页，首页保持 teaser，层级一致。
- 划线只从白名单书抓取（范围=展示范围），公版书内容风险由书目筛选兜底而非关键词过滤。
- 同名书（如两个版本的《论美国的民主》）按「读完>进度>最近」择优去重。

### 当前状态与未尽事项

- ⚠ **本次改动未提交未推送**（用户决策）：与并行会话的「前沿追踪」模块在 index.astro/glass.css/Glass.astro/sample.js/config.mjs 中已织在一起，等前沿完工后合并一次推送。本地 `npm run build` 绿（630 页，含 26 个 /reading 页面）。
- 预览窗后台化时 rAF 冻结导致部分动态行为只能在可见浏览器验证（已知环境现象）。
- 书架白名单增删后记得重跑 `npm run sync`。

### 文件级变更（全部待合并提交）

- 新增：`src/pages/reading/index.astro`、`src/pages/reading/[book].astro`、`src/lib/reading-ui.mjs`
- 修改：`src/scripts/graph-view3d.js`（CSS2D 标签）、`src/scripts/home.js`（图例折叠）、`src/pages/index.astro`（kg-stage 包裹 + 窗内按钮 + 阅读区精简）、`src/styles/glass.css`（.gx-label/.kg-expand/.kg-leg-toggle/.rd-ai-compact/.bk-*）、`scripts/collect-weread.mjs`（白名单/候选清单/全量划线）、`scripts/config.mjs`（wereadShelf）、`data/reading.json`

## 2026-06-12（续）· v3.1：主页图谱卡 3D 化 + 全屏页力学参数面板

### 做了什么

1. **主页图谱预览升 3D**：知识库区的图谱卡从 2D SVG 换成迷你 3D 深空窗——滚动到该区块时才懒加载 three（不进首页首发包），缓慢自转营造氛围；滚轮/双指留给页面滚动（不劫持），桌面可拖拽旋转，点击任意节点直接跳到全图并聚焦该笔记；图例 hover/锁定与搜索照常联动（2D/3D 控制器 API 同形，零分叉）。WebGL 不可用、系统减少动态或加载失败时自动回退原 2D。
2. **/graph 力学参数面板**（Obsidian Graph View 式可玩调参）：缩放栏新增 ⚙ 按钮，弹出玻璃面板含六个滑杆——斥力、链接距离、链接拉力、聚类引力、节点大小、标签密度；物理项实时重热布局，视觉项即时生效；自动存 localStorage、一键重置；仅 3D 视图显示（切 2D 自动收起）。

### 关键决策与已知问题

- 懒加载触发从 IntersectionObserver 换成「滚动 + 初始位置检查」：预览环境实测 IO 连初始回调都不投递，站内 reveal 动画早有同类兜底，这里跟齐。
- 3D 实例构造后显式按宿主尺寸 set 一次 width/height：默认取窗口尺寸，而 ResizeObserver 的初始回调同样不可依赖（修掉了迷你窗 canvas 撑满全窗的 bug）。
- 调参的 d3-force 坑：strength 访问器在 .strength() 调用时缓存逐节点值，setParams 后必须重新 set 同一访问器再 reheat 才生效（graph-view3d.js 内注释留档）。
- 「reheat 不动」排查结论：预览窗后台化时 Chrome 冻结 rAF，引擎自然不 tick——环境现象非代码缺陷，源码链路（engineRunning → 无条件 layoutTick）已核对。
- scripts/config.mjs 里新增的「前沿追踪」配置草案不属于本次工作，未提交。

### 文件级变更

- `src/scripts/graph-view3d.js`（mini 模式 / GRAPH_PARAM_DEFAULTS / setParams·getParams / applyPhysics·applyNodeScale / 显式初始尺寸）
- `src/scripts/home.js`（图谱卡懒加载 3D + 回退链 + 文案动态切换）
- `src/scripts/graph-explore.js`（参数面板接线 / localStorage 持久 / 模式联动显隐）
- `src/pages/graph.astro`（⚙ 按钮 + 面板 markup）、`src/styles/glass.css`（.kg-3d / .gx-params / 滑杆样式）

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

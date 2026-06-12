# WORKLOG（append-only，倒金字塔：结论在前、清单沉底）

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

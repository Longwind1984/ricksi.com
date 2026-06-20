# Rick 工作台 · 活数据个人主页

司豪杰 Rick Si 的 proof-of-work 工作台：Liquid Glass 视觉 + 真实数据管线 + Obsidian 知识库发布。
「本页本身就是作品」——从 Claude Design 设计探索到 Claude Code 实现与数据自动化的完整 AI 协作交付。

## 架构

```
├── src/
│   ├── pages/           # index（主页）/ blog / kb（141 篇笔记页 + 图谱索引）
│   ├── layouts/Glass.astro   # 玻璃视觉系统共享布局（导航/页脚/折射滤镜）
│   ├── scripts/         # nav 液态胶囊 / home 主页行为 / graph-view 力导向图谱
│   ├── styles/          # glass.css（v2 钴蓝之夜）+ tokens/（设计系统镜像）+ fonts.css
│   └── lib/             # 构建时数据装载（缺失自动回退样例值）+ og/分享卡渲染器
├── content/
│   ├── posts/           # 博客 Markdown（front-matter: title/date/tag）
│   └── kb/              # 知识库（由 sync-vault 从 Obsidian 自动生成，勿手改）
├── data/                # 采集产物（JSON 入库 = 永久数据存档）
├── scripts/             # 数据采集器（见下）
├── docs/design-system/  # ★ 全项目设计指导准则（v2 钴蓝之夜完整包）——任何 UI 改动前先读它
└── legacy/index.html    # 设计稿原始实现存档（视觉基准）
```

**设计准则**：`docs/design-system/`（Claude Design 产出）是唯一视觉事实源——色彩（群青唯一操作色 +
太阳金数据光）、字体组合壹（MiSans + Geist Mono + 霞鹜文楷）、玻璃配方、圆角/动效 token、组件规格
（含 ShareCard 分享卡）。`src/styles/tokens/` 是它的镜像，改 token 两边同步。

## 数据管线：本地优先 + 仓库即存档

本地数据源（Claude Code 日志、Obsidian 库、本地 git 仓）只存在于这台 Mac，因此采集在本地跑，
产物 JSON 提交进 Git —— push 到 `main` 触发 EdgeOne + Vercel 双平台自动重建，仓库本身成为只增不减的数据存档。

```bash
npm run sync            # 一键：采集全部 → commit → push（--no-push 跳过提交）
```

| 脚本 | 数据源 | 产物 |
|---|---|---|
| `collect-activity` | 本地 git 全历史 + Obsidian 笔记时间线 + Claude 会话日志 | `data/activity.json`（多维热力图） |
| `collect-usage` | Claude Code 本地 JSONL（实测）+ 起用期估算 + 网页端参数粗估（口径 v2，见 `docs/token-estimation.md`） | `data/usage.json` |
| `sync-vault` | Obsidian `04AI/` 真实结构与双链（04T 专题库下钻 F1~F6 切面；内置发布消毒管线） | `data/graph.json` + `content/kb/` + 隐私清单 |
| `fetch-github` | GitHub GraphQL（Actions 每日 cron，需 token） | 合并进 activity 的 gh 维度 |
| `collect-weread` | 微信读书官方 Agent API（书架/笔记/统计/划线 + AI 共创书白名单） | `data/reading.json` + 封面 |
| `collect-frontier` | AI 学者/信息源公开动态（博客 RSS / arXiv / YouTube / X 镜像池）→ `claude -p` 无头梳理成中文摘要+判断+标签+**星图多维评级** | `data/frontier.json`（滚动 90 天）+ 月度归档 + 去重账本 |

**发布消毒管线**（sync-vault 内置，只改发布版不动库原文件）：剥离「衍生对话存档」等工作残桩小节、
清除「待补充」占位行、屏蔽词替换并报告、私人日记类 wikilink 抹成〔私人记录〕、敏感标题默认不发布
（`scripts/config.mjs → sanitize` 可调）；消毒报告写入 `data/kb-manifest.json`。
04T 专题库的 PKM 质量门控（front-matter publish:false）被显式覆盖为全量发布（用户决策 2026-06-12）。

**微信读书 AI 共创书白名单**：secret=1 私密书一律排除，仅 `scripts/config.mjs → wereadAiTopics`
按书名显式放行，在主页阅读区以独立「方法论展示」分区呈现、不混入真实阅读统计。

**自制 ePub 在线阅读器**：自主上传的 ePub 书不走微信 API，登记在 `data/local-books.json`（id 用 `CB_local_<slug>`），
导言/副题/封面覆盖在 `data/book-extras.json`（按 id/title），二者均为 authored 源、sync 永不覆写，由
`scripts/merge-local-books.mjs`（sync 第 4.5 步，幂等、无 key 也跑）在采集后确定性合入 `reading.json`。
有 epub 源文件的书，落地页出「开始阅读」→ `/reading/<id>/read/`：基于 epub.js 的钴蓝玻璃阅读器，
支持翻页/目录/字号/进度、**选中文字划线（localStorage 持久化）、悬浮菜单、生成玻璃明信片金句卡分享（含 CFI 深链回链）**。
epub 文件放 `public/assets/books/epub/<slug>.epub`，封面放 `public/assets/books/epub-covers/`；
AI 共创书封面为各书主题定制的信息图 SVG（`public/assets/books/ai/`）。补传旧书 epub：丢文件 + 在 `book-extras.json` 对应条目加 `"epub"`。

**前沿追踪（/frontier）**：追踪名单（人物/话题/信息源）在 `scripts/config.mjs → frontier` 集中配置，
随时增删。每条产出 = 中文标题 + 一句话判断 + 200-400 字摘要 + 标签 + 原文摘录（核查锚点）+ 原文链接。
模型调用走本机 `claude -p` 无头模式（现有订阅，零 API 计费；`--no-session-persistence` 防止污染
usage/activity 统计）。X 抓取依赖第三方镜像池（nitter 等，单源失败静默缺失、次日补抓，
`stats.lastRun.skippedSources` 可见）。内容双闸：`excludePatterns` 正则预过滤 + 模型判定
`relevant=false` 丢弃——涉政内容为硬性排除（站点部署在备案域名）。摘要只允许基于抓到的原文，
信息不足时模型自报 `insufficientContext` 并收短。

**星图评级（多维，非线性分级）**：每条打三维分——`apparent` 声量 × `absolute` 分量（真实重要性，
与热度无关）× `gravity`/`periodic`/`canon` 三个布尔。星类（超新星/深空/新星/流星/黑洞/微光/星尘…）
由 `src/lib/frontier-ui.mjs` 的 `starOf()` 从维度**确定性映射**——规则单点，改规则不必重抓。核心是
「视亮度与绝对亮度解耦」：高分量+低声量=**深空（被低估）**，低分量+高声量=**流星（炒作）**。源级星类
（猎户座/星辰/行星）标在 `config.frontier.people[].constellation`。完整规约见 `docs/star-rating.md`。
存量数据用 `scripts/migrate-frontier-rating.mjs` 一次性补评级（调 claude 仅评级、不碰内容）。

**自动化分工**：本地 LaunchAgent（每天 21:30，`npm run sync`）是主力，跑完整管线（工作台数据 +
前沿全源含 X + push）。可选的云端 Claude Code Routine 是兜底，只跑前沿公网子集
（`npm run collect:frontier:remote`，跳过被墙 X 源），Mac 关机当天也能更新——配置见
`docs/frontier-routine.md`。云端访问不到本机文件，工作台数据只能本地采。

**新增追踪人物 SOP（一致性靠管线不靠手感）**：

1. `scripts/config.mjs → frontier.people` 加一条：`slug`（kebab-case）/`name`/`domain`（四枚举之一，
   要扩分类先改 `domains`）/`title`（机构+角色，≤20 字）/`bio`（一句话定位，≤40 字）/`sources`
2. `npm run collect:frontier -- --dry-run` —— 启动即跑 config 校验：slug 格式与唯一性、domain 枚举、
   source type/handle/url 合法性，不合法直接报错退出（这是增量管线的通断检查点）；同时实测新源可达性
3. `npm run frontier:portraits` —— 只为缺头像的人生成（已有 webp 跳过，省调用）：用 Nano Banana
   （Gemini，key 在 `scripts/.gemini-key`，走代理），风格由 config 的 `stylePrompt` 锁定（似真优先 +
   金线/星点/占比 60% 一致构图），似真靠**本人**照片做图生图（缓存 `scripts/.frontier-refs/`，只能传本人照片——
   传别人的成品头像会串脸）。单独重做某人 `-- --force <slug>`；全员统一重生才删 dir 下全部 webp。
   还原度差先查参考图对不对（可用 `refPhoto` 直链覆盖）。完整说明见 `docs/image-generation.md`。
   （Seedream/火山方舟实测复刻不了这套线稿风、似真不可控，已弃用于头像）
4. `npm run build` 预览 —— 头像没生成也不破版：人物卡自动回退程序化「星座字母牌」（slug 种子确定性 SVG，
   与深空视觉同源）

分类一致性由 `domains` 闭集枚举保证；标签一致性由「每次梳理把现有 TOP30 标签注入 prompt 要求优先复用」控制漂移。

**微信读书接入（官方 Skill 体系）**：打开 [weread.qq.com/r/weread-skills](https://weread.qq.com/r/weread-skills)
登录并复制 API Key（`wrk-` 开头），写入 `scripts/.weread-key`（已 gitignore，绝不入库），
下次 `npm run sync` 自动采集。私密阅读（secret）书目自动排除，不会出现在公开站点。

**每日自动同步**（可选）：

```bash
cp scripts/com.ricksi.workbench-sync.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.ricksi.workbench-sync.plist   # 每天 21:30
```

**发布走 HTTPS（前提，否则每晚采集了推不上去）**：本机 Clash fake-ip 把 GitHub SSH（22 端口）路由到黑洞，
裸 `git push`（`git@github.com`）会连不上。故 remote 用 HTTPS、凭证从文件读（绕开 launchd 下 keychain 的不确定性）：

```bash
git remote set-url origin https://github.com/Longwind1984/ricksi.com.git
git config --local credential.helper '' && git config --local --add credential.helper store   # 本仓只用 store
{ printf 'protocol=https\nhost=github.com\nusername=x-access-token\npassword='; gh auth token; printf '\n'; } | git credential approve   # 写入 ~/.git-credentials(600)
```

plist 已注入 `HTTPS_PROXY=127.0.0.1:7897`，HTTPS 443 走代理可达。`sync.mjs` push 前 `pull --rebase --autostash`
防分叉；任一致命步骤失败弹 macOS 通知（不再静默）。gh OAuth token 若轮换失效会推送失败（有通知），重跑上面
最后一行重新 seed，或换成自建 fine-grained PAT（`contents: read/write`）。

**隐私**：`scripts/config.mjs` 的 `excludeClusters` 默认排除求职/待解问题文件夹；
单篇笔记 front-matter `publish: false` 可排除；`data/kb-manifest.json` 是全量发布清单，推公开仓库前请过目。

## 本地开发

```bash
npm install
npm run dev       # localhost:4321
npm run build     # 产出 dist/（145 静态页）
```

## 部署（EdgeOne Pages + Vercel 双平台）

站点是 **Astro 静态输出**（无 adapter，产物即 `dist/` 纯静态）。**EdgeOne 与 Vercel 同时连接这同一个
GitHub 仓库（`Longwind1984/ricksi.com`），生产分支均为 `main`**——一次 `git push` 到 `main`，两个平台
各自收到 GitHub 事件、并行重建部署。非 `main` 分支：Vercel 出 preview，EdgeOne 视项目设置而定。

**共同构建配置**（两边一致）：安装 `npm install` · 构建 `npm run build` · 输出目录 `dist` · Node ≥ 20。

**EdgeOne Pages**
1. 控制台 → 创建项目 → 连接 GitHub 仓库 → 框架预设 **Astro**（构建配置同上）。
2. 备案完成后绑定自定义域名（站点部署目标是**已备案域名**，含涉政硬过滤闸）；把 `astro.config.mjs`
   的 `site` 填正式域名重部署。
3. ⚠ **`.epub` MIME**：自制 ePub 阅读器从 `/assets/books/epub/*.epub` 运行时 fetch，需确认 EdgeOne 按
   `application/epub+zip` inline 返回（建议 `Cache-Control: public, max-age=31536000, immutable`）。
   epub.js 按字节读不强依赖 Content-Type，但若 EdgeOne 对未知扩展名返回 404 或 attachment 下载则会读不出书。

**Vercel**
1. Import 同一 GitHub 仓库 → 零配置自动识别 Astro（静态，无需 adapter；构建/输出同上）。
2. 生产分支 `main`；PR/非 main 分支自动出 Preview 部署。
3. `.epub` 等静态资源由 Vercel 按扩展名自动设 `application/epub+zip`，一般无需额外配置；如需自定义缓存头
   可加 `vercel.json` 的 `headers`（当前未用，保持零配置）。

**可选**：GitHub 仓库 Settings → Secrets 加 `CONTRIB_TOKEN`（PAT，read:user）让每日 Actions 抓贡献数据。

之后每次 `npm run sync`（采集→commit→push）或手动 push 到 `main`，两个平台都会自动重建——数据保持新鲜。

## 站点能力速查

- `/graph` **3D 知识图谱**（NASA Eyes 风格：深空星点/辉光/距离雾/相机飞行；three.js 仅在该页按需加载）：
  搜索、主题域过滤、标签 LOD、`?focus=` 深链；右下角可切 2D，WebGL 不可用或 reduced-motion 自动回退 2D
- 知识库分层：索引页「精选 · 总览与代表作」+ 完整归档；每篇笔记标注来源档位（共创 / AI 整理），
  方法公开于博文《这个库是怎么来的》
- 阅读页 reader chrome：kb/blog 详情页收起完整导航（R monogram + 分享/搜索），滚读自动隐藏；
  分享按钮弹出**竖版玻璃明信片**（360×640 @2x，设计系统 ShareCard：照片 + 钴蓝玻璃面板 +
  来源徽章 + QR，构建期 satori 生成 `/share/kb|blog/*.jpg`；横版 OG 卡保留给社交 meta）
- 工作台口径 v2：今日全口径+输出注脚、累计 = Code 实测/估算 + 网页粗估分列、估算方法页内可达
- `/frontier` **前沿追踪**：二维时间轴（纵轴领域含人物、横轴可切窗 7/30/90 天、节点按星图评级编码）
  + 每日动态流（中文摘要、一句话判断、星图多维评级）；四维筛选 + URL 深链 + 订阅源（/frontier.xml）。
  主页有迷你时间轴预览，点节点深链到落地页对应条目
- `⌘K` / `/` 全站命令面板：支持 `/kb` `/blog` `/proj` `/ft` 前缀过滤
- View Transitions 页面转场、RSS（/rss.xml + /frontier.xml）、sitemap、玻璃 404、全站 OG 卡（含 /og/home.png）
- Liquid Glass 对齐:降级三档（减透明/无 backdrop-filter/高对比）、滚动收缩导航、44px 触达
- 招聘官视角的批判性审查存档于 `docs/interviewer-critique.md`（v3 迭代的需求来源之一）

## Backlog（记录在案，未排期）

- 图谱时间轴回放（按笔记创建时间的生长动画）
- Chromium 折射镶边色散（feDisplacementMap RGB 三通道）
- 站内「减少透明度」手动开关；多语言 EN；隐私友好访问统计

## 待替换素材

- **简历 PDF 是 v0.8 中间版**（`public/assets/rick-si-resume.pdf`）：「AI 项目经历」第二条有复制粘贴损坏
  （重复三遍 + 黄色高亮），修复后同名覆盖即可，链接不用动
- Slash Goal / 行程套件 / WeatherLens 的公开仓库（现标「仓库整理中」，`src/data/projects.ts` 补 href 即可）
- Slash Goal / 行程套件的真实截图（现为设计 SVG 封面）
- `content/posts/` 继续添加文章（front-matter 照首篇）

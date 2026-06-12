# Rick 工作台 · 活数据个人主页

司豪杰 Rick Si 的 proof-of-work 工作台：Liquid Glass 视觉 + 真实数据管线 + Obsidian 知识库发布。
「本页本身就是作品」——从 Claude Design 设计探索到 Claude Code 实现与数据自动化的完整 AI 协作交付。

## 架构

```
├── src/
│   ├── pages/           # index（主页）/ blog / kb（141 篇笔记页 + 图谱索引）
│   ├── layouts/Glass.astro   # 玻璃视觉系统共享布局（导航/页脚/折射滤镜）
│   ├── scripts/         # nav 液态胶囊 / home 主页行为 / graph-view 力导向图谱
│   ├── styles/glass.css # 设计系统（含移动端底部 Dock 设计）
│   └── lib/             # 构建时数据装载（缺失自动回退样例值）
├── content/
│   ├── posts/           # 博客 Markdown（front-matter: title/date/tag）
│   └── kb/              # 知识库（由 sync-vault 从 Obsidian 自动生成，勿手改）
├── data/                # 采集产物（JSON 入库 = 永久数据存档）
├── scripts/             # 数据采集器（见下）
└── legacy/index.html    # 设计稿原始实现存档（视觉基准）
```

## 数据管线：本地优先 + 仓库即存档

本地数据源（Claude Code 日志、Obsidian 库、本地 git 仓）只存在于这台 Mac，因此采集在本地跑，
产物 JSON 提交进 Git —— push 触发 EdgeOne 自动重建，仓库本身成为只增不减的数据存档。

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

**发布消毒管线**（sync-vault 内置，只改发布版不动库原文件）：剥离「衍生对话存档」等工作残桩小节、
清除「待补充」占位行、屏蔽词替换并报告、私人日记类 wikilink 抹成〔私人记录〕、敏感标题默认不发布
（`scripts/config.mjs → sanitize` 可调）；消毒报告写入 `data/kb-manifest.json`。
04T 专题库的 PKM 质量门控（front-matter publish:false）被显式覆盖为全量发布（用户决策 2026-06-12）。

**微信读书 AI 共创书白名单**：secret=1 私密书一律排除，仅 `scripts/config.mjs → wereadAiTopics`
按书名显式放行（当前 4 话题 8 本），在主页阅读区以独立「方法论展示」分区呈现、不混入真实阅读统计。

**微信读书接入（官方 Skill 体系）**：打开 [weread.qq.com/r/weread-skills](https://weread.qq.com/r/weread-skills)
登录并复制 API Key（`wrk-` 开头），写入 `scripts/.weread-key`（已 gitignore，绝不入库），
下次 `npm run sync` 自动采集。私密阅读（secret）书目自动排除，不会出现在公开站点。

**每日自动同步**（可选）：

```bash
cp scripts/com.ricksi.workbench-sync.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.ricksi.workbench-sync.plist   # 每天 21:30
```

**隐私**：`scripts/config.mjs` 的 `excludeClusters` 默认排除求职/待解问题文件夹；
单篇笔记 front-matter `publish: false` 可排除；`data/kb-manifest.json` 是全量发布清单，推公开仓库前请过目。

## 本地开发

```bash
npm install
npm run dev       # localhost:4321
npm run build     # 产出 dist/（145 静态页）
```

## 部署到 EdgeOne Pages

1. 仓库推到 GitHub
2. EdgeOne Pages 控制台 → 创建项目 → 连接该 GitHub 仓库
3. 构建配置：
   - 框架预设：**Astro**（或自定义）
   - 安装命令：`npm install`
   - 构建命令：`npm run build`
   - 输出目录：`dist`
   - Node 版本：≥ 20
4. （可选）GitHub 仓库 Settings → Secrets 添加 `CONTRIB_TOKEN`（PAT，read:user 权限）让每日
   Actions 抓 GitHub 贡献数据
5. 备案完成后在 EdgeOne 绑定自定义域名；同时把 `astro.config.mjs` 的 `site` 填上正式域名并重新部署

之后每次 `npm run sync` 或 git push 都会自动触发重建——数据保持新鲜。

## 站点能力速查

- `/graph` **3D 知识图谱**（NASA Eyes 风格：深空星点/辉光/距离雾/相机飞行；three.js 仅在该页按需加载）：
  搜索、主题域过滤、标签 LOD、`?focus=` 深链；右下角可切 2D，WebGL 不可用或 reduced-motion 自动回退 2D
- 知识库分层：索引页「精选 · 总览与代表作」+ 完整归档；每篇笔记标注来源档位（共创 / AI 整理），
  方法公开于博文《这个库是怎么来的》
- 阅读页 reader chrome：kb/blog 详情页收起完整导航（R monogram + 分享/搜索），滚读自动隐藏；
  分享按钮弹出 OG 卡（复制链接 / 下载 / 系统分享）
- 工作台口径 v2：今日全口径+输出注脚、累计 = Code 实测/估算 + 网页粗估分列、估算方法页内可达
- `⌘K` / `/` 全站命令面板：支持 `/kb` `/blog` `/proj` 前缀过滤
- View Transitions 页面转场、RSS（/rss.xml）、sitemap、玻璃 404、全站 OG 卡（含 /og/home.png）
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

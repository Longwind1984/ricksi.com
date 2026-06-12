---
title: E01 Cursor 剖解·IDE-fork 哲学
cluster: 专题 · 工程与成本
created: '2026-06-07'
updated: '2026-06-11'
provenance: ai
facet: 编程工具
---

Cursor 把整个 VS Code 复制了一份，再在里面长出 AI——这个"fork 一个 IDE"的决定不是工程偷懒，而是一次明确的产品哲学押注：**用最低的迁移摩擦换取对编辑器内核的完全控制权**。本节点要回答的问题是：这个押注买到了什么、又把 Cursor 锁进了什么。判断主轴是一对不可调和的张力——**嵌入 IDE 范式带来的"低摩擦"红利，与被 IDE 范式锁定的"天花板"风险**，二者是同一枚硬币的两面。

## §0 为什么用"IDE-fork 哲学"这个框架,而不是"功能对比"框架

读 Cursor 最容易掉进的坑,是把它当成"VS Code + 一个更好的 Copilot"来评测——比 Tab 补全准不准、比 Agent 跨文件能力强不强。这个框架会让你在选型会上输掉:因为按 feature list 比,Cursor、Copilot、Windsurf、TRAE 的功能矩阵正在快速同质化(2025 年内各家都补齐了 Agent Mode),你说不清"为什么我选 Cursor 而不是装个 Copilot 插件"。

正确的框架是**产品形态决定能力上限**。一个产品是"IDE fork"还是"IDE 插件"还是"CLI",不是实现细节,而是它在"控制权—摩擦—锁定"三角里的位置选择。Cursor 选择 fork VS Code,意味着它放弃了"装个插件就能用"的零摩擦,换来了对补全 UI、diff 渲染、上下文索引、键盘事件流的底层控制权——这正是它能做出 Tab 多行预测和 instant apply 的前提,也正是 [Claude Code](/kb/ai-公司与产品/claude-code/) 走 CLI 路线、GitHub Copilot 走插件路线时各自放弃或保留的东西。看清这个三角,才能在面试桌上 30 秒说清"Cursor 的护城河和命门各是什么"。

## §1 IDE-fork 这个决定:得到了什么

Cursor(母公司 Anysphere)是一个 **VS Code 的开源分支**,而非 VS Code 插件——这是它与 GitHub Copilot(插件)、[Claude Code](/kb/ai-公司与产品/claude-code/)(CLI + IDE 集成)的根本分野。

VS Code 基于 MIT 开源,允许 fork。Cursor 直接 fork 了它,因此:

| 红利 | 具体兑现 | 插件做不到的原因 |
|---|---|---|
| **零学习成本迁移** | VS Code 用户的快捷键、主题、扩展、settings.json 一键导入 | —— 这是插件方案的优势,但 fork 也继承了 |
| **补全 UI 的完全控制** | Tab 可以预测并渲染 1–3 行多处编辑,而不只是行尾灰字 | 插件受 VS Code 补全 API 约束,难以接管整个编辑区渲染 |
| **diff/apply 渲染接管** | Agent 编辑后以 inline diff 呈现,可逐块 accept | 插件层难以深度改写 diff gutter 行为 |
| **上下文索引内建** | 启动即对整个 codebase 建 embedding 索引,无需用户配置 | 插件需走宿主 API,索引深度受限 |

一句话:**fork 让 Cursor 能改的不只是"加什么功能",而是"改什么交互范式"**。这是低摩擦红利的真正来源——不是"省去安装步骤",而是"AI 能渗透到编辑器每一个像素和每一次键盘事件"。

## §2 Composer 与 Tab:两条产品线,两种心智

Cursor 的能力可以拆成两条互补的产品线,对应两种完全不同的用户心智:

**Tab(自动补全)**——"我在写,AI 在补"
- 预测 1–3 行,延迟 <100ms(据 deployhq.com 2026 功能指南口径)
- 不只补行尾,能预测光标将要跳到的**下一处编辑位置**(对标 Copilot 的 Next Edit Suggestions)
- 心智模型:开发者主导,AI 是"读心式的快捷键"

**Composer / Agent Mode**——"我说要什么,AI 去改"
- Composer 是多文件生成对话框(2024 引入),2025 年起产品重心转向 **Agent Mode**:跨文件自主编辑、运行命令、读测试结果
- **Cursor 3(2026-04-02 发布)**是 Cursor 自启动以来最大的架构变更:引入独立的 **Agents Window**(把 IDE 重定位成 agent 执行运行时,可跨 repo/环境并行跑多个 agent)、自研前沿编程模型 **Composer 2**、Cursor Marketplace、内建浏览器、重设计 diff 视图(来源:cursor.com/blog/cursor-3;InfoQ 2026-04;Futurum)
- **Background Agent → Cloud Agent**:任务可本地起、推到云端 sandbox 继续跑而不占本机、再拉回本地迭代,不阻塞本地 git 状态
- **Subagent 并行**:**Cursor 3.2(2026-04-24)**新增 `/multitask`——把一个请求拆成多个 subagent 并行执行,并扩展 worktrees 与多 root workspace(来源:cursor.com/changelog 2026-04-24)
- **Bugbot**:Teams/Enterprise 计划的 agentic code review;配置从旧的 `.cursorrules` 单文件演进到 `.cursor/rules/` 目录
- 心智模型:AI 主导,开发者是"审稿人 + 验收人"

> [!note] 判断:这两条线的张力,正是 Cursor 产品演化的内在矛盾。
> Tab 是"嵌入 IDE 范式"的极致——它只有在你手握键盘、眼盯编辑区时才有价值。而 Agent Mode 的终局(Background Agent 在云端跑、你去喝咖啡)恰恰**不需要 IDE**——它需要的是一个任务队列和一个结果审阅面板。Cursor 3 把重心转向 Agent,等于亲手把自己最强的差异化(Tab + 编辑器深度集成)推向边缘。这是后文判断主轴的伏笔。

## §3 上下文机制:embedding 索引 + 按需检索

Cursor 的上下文工程是它"开箱即用"体验的技术底座,也是理解它与 [Claude Code](/kb/ai-公司与产品/claude-code/) 路线差异的关键:

- **codebase 索引**:打开项目即对全库建 [Embedding](/kb/基础知识库/embedding/) 向量索引(增量更新),Agent/Composer 检索时用语义相似度召回相关文件片段——这是典型的 [RAG](/kb/基础知识库/rag/) over code 思路。
- **@ 符号显式注入**:用户可 `@文件` `@符号` `@docs` 手动把上下文塞进对话,补语义检索的不足。
- **编辑应用**:Cursor 用专门的 **Fast Apply / Speculative Edits** 机制落地编辑。其 instant apply 基于定制微调模型(早期为 `llama-70b-ft-spec`),核心技术是把"开发者提供的原文件"作为 speculation,server 端找最长匹配前缀、温度=0 确定性验证后续写——速度约 **1,000 tok/s**(约 3,500 字符/秒),比 vanilla Llama-3-70B 快约 13×(来源:Fireworks × Cursor 工程博文,2024-08 公开)。

这里藏着一个 PM 必须看穿的**架构选择对照**(详见 [m208 - AI 基础设施与中间件选型](/kb/工程化与落地架构/m208-ai-基础设施与中间件选型/),本节点只做应用层判断,不复述其基础设施细节):

| 维度 | Cursor:embedding 索引 + 检索 | Claude Code:agent grep / 文件系统导航 |
|---|---|---|
| 上手 | 开箱即用,无需配置 | 需 agent 主动探索,但更"看得见"它在看什么 |
| 大库表现 | 向量检索可能丢失调用关系 | grep/AST 探索保留结构,但 token 更贵 |
| 反直觉证据 | —— | arXiv 2603.20432(2026-03)发现:给 coding agent **额外加 RAG 检索工具并不稳定提升性能**,有时反而降低,因为 agent 会减少更有效的 grep 而依赖向量检索导致策略退化 |

也就是说,Cursor 的"自动 embedding 索引"是体验红利,但在**跨文件重构、影响面分析**这类需要精确调用图的任务上,纯语义检索是已知的弱项——这不是 Cursor 偷懒,而是 IDE-fork 形态倾向于"隐藏复杂度给用户爽",而隐藏的代价是 agent 的检索策略不完全透明。

## §4 定价:从请求制到信用额度制的"隐性涨价"

⚠️ 以下定价为 volatile,口径:2026-06 WebSearch 整理,正式决策前请核 cursor.com/pricing。

| 计划 | 月费〔以 2026-06 为准·待核实〕 |
|---|---|
| Hobby | 免费(功能受限) |
| Pro | $20/月 |
| Pro+ | $60/月 |
| Ultra | $200/月 |
| Teams | $40/用户/月 |
| Enterprise | 定价商谈 |

**最值得 PM 警惕的是定价模型的范式切换**:2025-06,Cursor 从"$20 含 500 次高级请求"的**请求包月制**,改为**信用额度(Credit)制**——当时 $20 计划约折合 225 次高级请求,被普遍读作"同价缩水"的隐性涨价。到 2026-06 口径,Credit 制进一步细化:**每个付费计划含一个等于其月费美元数的 credit 池**(Pro=$20、Pro+=$60、Ultra 池约 $400),关键是 **Auto 模式不消耗 credit、且不限量**,只有手动选用前沿模型或开 Max 模式才扣 credit(来源:cursor.com/pricing 及 2026 多家整理,如 aiproductivity.ai)。也就是说,Cursor 用"默认 Auto 免费、高级用法计量"把成本焦虑和成本现实做了切割——日常用户体感"无限",重度手动调模型者才感知账单。

> [!note] 这不是 Cursor 一家的问题,而是整个赛道的结构性事件。
> 同期 GitHub Copilot 在 2026-06-01 全面切换为 AI Credits 用量计费(代码补全/NES 不消耗 Credits,聊天/agent/code review 消耗;来源:GitHub Changelog 2026-06-01,已 WebFetch 核实);Windsurf(已改名 Devin Desktop)2026-03-19 废除 Credit 制改为 Quota 制。**三家在同一年里反复改计费,说明 agentic coding 的真实 token 成本远超 SaaS 包月模型能承受的水平**——这是 [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/) 在产品定价层面的直接投影:当单次 Agent 任务可能烧掉数百万 token,固定月费必然向用量计费收敛。PM 选型时不能只看当月报价,要问"它的计费模型还会变几次"。

## §5 判断主轴:嵌入 IDE 的得与失——90% 的人会错的四个点

这是本节点的命门。以下每点用"症状 → 为什么会错 → 正确做法 → 真实反例"四件套。

### 错位一:"Cursor = 更好的 Copilot"

- **症状**:选型会上把 Cursor 和 Copilot 放进同一张 feature 对照表逐项打勾,结论是"功能差不多,Copilot 更便宜就选 Copilot"。
- **为什么会错**:这忽略了**形态差异决定的体验天花板**。插件方案(Copilot)受宿主编辑器 API 约束,无法接管整个补全渲染和 diff 行为;fork 方案(Cursor)能做到的"多行 Tab 预测 + 编辑器级 instant apply"是插件层难以复刻的。比 feature 比的是"现在有什么",比形态比的是"能做到什么"。
- **正确做法**:先问形态(fork / 插件 / CLI),再问该形态允许的交互范式,最后才比具体 feature。
- **真实反例**:Copilot 直到 2026 年才把 Next Edit Suggestions(预测下一处编辑)做成熟,而 Cursor 的 Tab 多行预测早在 fork 形态下就是默认体验——这个时间差正是形态红利的证据。

### 错位二:"fork VS Code 是低成本捷径"

- **症状**:认为 Cursor 走捷径,长期一定打不过自研 IDE 或大厂插件。
- **为什么会错**:fork 的真实代价不在"做出来",而在**长期维护税**——VS Code 上游每次大版本更新,Cursor 都要 rebase,合并冲突、安全补丁、扩展兼容性都要自己扛。这是一笔持续的隐性成本,也是"被 IDE 范式锁定"的第一层含义:**你的产品节奏被上游绑架**。
- **正确做法**:把 fork 看成"借了一笔需要持续还利息的债"——红利是即时的(零迁移),利息是长期的(rebase 税 + 范式锁定)。
- **真实反例**:Windsurf(原 Codeium)同样 fork VS Code,2025-12 被 Cognition 以 $2.5 亿收购、2026-06-02 改名 Devin Desktop 后,把 Cascade 用 Rust 重写为 Devin Local(来源:devin.ai/blog)——重写动作本身说明 fork 来的底座到一定阶段会成为包袱,需要部分逃离 VS Code 范式。

### 错位三:"Agent Mode 越强,Cursor 护城河越深"

- **症状**:看到 Cursor 3(2026-04)主推 Agents Window、Cloud Agent,3.2(2026-04-24)又加 `/multitask` subagent 并行,就认为它在 agentic 竞赛中越战越勇。
- **为什么会错**:这是判断主轴最深的一刀——**Agent 能力越强,IDE 这层外壳越显多余**。当 Agent 在云端后台自主跑完整任务,用户需要的是任务编排面板,不是一个编辑器。届时 Cursor 的核心资产(编辑器深度集成、Tab)在 Agent workflow 里贡献度下降,而它的形态包袱(整个 VS Code 的维护)却一分不少。这正是 [Claude Code](/kb/ai-公司与产品/claude-code/) 用 CLE/CLI 形态轻装上阵反而占便宜的地方——CLI 没有编辑器要维护,Agent 即全部。
- **正确做法**:判断一个 coding 产品的长期价值,要看它的**形态是否与它押注的能力终局一致**。Cursor 押注 Agent,但形态是 IDE,存在错配。
- **真实反例**:Cursor 自己把 Cursor 3 的界面重心从编辑器转向 Agent 视图——这等于产品团队亲口承认"编辑器不再是中心"。但它无法卸掉 VS Code 这层壳,因为壳正是它低摩擦红利的来源。这就是锁定:**进退两难**。

### 错位四:"用户量 / ARR 数字 = 确定的胜势"

- **症状**:引用"$3B ARR""100 万 DAU"论证 Cursor 已锁定胜局。
- **为什么会错**:这些数字口径混乱且部分不可证伪。**$3B ARR(2026-04)出自 Sacra 估算,非 Anysphere 官方公告**;TechCrunch 2026-03 报道的 $2B 也来自"知情人士"(来源:TechCrunch 2026-03-02),非财报。付费用户 >36 万、DAU 超 100 万为 2025 Q4 第三方统计口径(来源:getpanto.ai)。把估算值当确证事实写进选型报告,是 PM 的认识论事故。
- **正确做法**:区分官方披露 / 第三方估算 / 媒体引述三个置信层级,volatile 数字一律标日期口径。
- **真实反例**:同期 Windsurf 被收购、改名、重写核心——这条赛道一年内的剧变(收购、改名、计费三连改)说明**ARR 高 ≠ 形态稳**,用户迁移成本因 fork 形态的"VS Code 兼容"反而很低(导出 settings 即可走),护城河没有数字看起来那么深。

## §6 产品 PM 视角补盲:三个工程视角看不到的"看走眼"点

1. **用户心理:迁移成本的不对称**。fork 形态让"迁入 Cursor"零摩擦,但同样让"迁出 Cursor"零摩擦——你的 VS Code 配置随时可导回。低迁移壁垒是把双刃剑,Cursor 用它抢用户,对手也能用它抢回去。这与"被锁定的是厂商而非用户"形成有趣反转:**被 IDE 范式锁定的是 Cursor,被锁定得最浅的反而是用户**。
2. **商业模式:计费焦虑即留存风险**。2025-06 改 Credit 制后,开发者社区对"预算不可控"的焦虑真实存在(Copilot 同类切换被 Visual Studio Magazine 起标题"You Will Get Less, but Pay the Same Price")。对 PM 而言,**计费模型的稳定性本身是一个留存变量**,不是财务后台的事。
3. **合规边界:数据管辖**。Cursor 是美国公司,代码上下文走其云端索引,受美国法律管辖。对 Rick 所在的 DiDi/99 这类有数据出境与等保要求的组织,这是硬约束——这正是国产工具([E03 字节 TRAE 与 Windsurf 剖解](/kb/专题-工程与成本/e03-字节-trae-与-windsurf-剖解/) 等)主打"国内服务器 + 私有化部署"的切入点。**选型不只是比能力,是比管辖。**

## §7 对手框架回应:接受 + 边界

**业界反方立场(IDE-native 拥趸,如 Cursor / Windsurf 路线的支持者)**:"AI coding 的未来一定是 AI 原生 IDE,因为只有接管编辑器才能做出最丝滑的人机协作体验,CLI 是给极客的过渡形态。"

- **接受**:在"人在回路、边写边改"的高频交互场景里,IDE-fork 的体验确实是 CLI 无法比的——Tab 的多行预测、inline diff 的逐块 accept,这些都依赖对编辑器的底层控制,Cursor 在这一层的领先是真实的、由形态决定的。
- **边界与赌注**:但我赌的是——**agentic coding 的重心正从"边写边改"向"派活验收"迁移**,而后者不需要 IDE。Cursor 3 自己把界面转向 Agent 就是证据。IDE-fork 的体验优势绑定在一个正在萎缩的交互范式上。我可能错在哪:如果"边写边改"始终是主流(对大量维护型、增量型工作这完全可能),那么 IDE-fork 形态的红利会长期跑赢,我的"形态错配"判断就过度看空了 Cursor。

**Rick 未读的对手框架引入——Clayton Christensen 的"延续性创新 vs 破坏性创新"**:从这个透镜看,Cursor 对 VS Code 是一次**延续性创新**(在既有 IDE 范式上做得更好),而 [Claude Code](/kb/ai-公司与产品/claude-code/) 的 CLI/agent-first 路线可能是**破坏性创新**(从一个"看起来更差"的形态——没有图形编辑器——切入,但更契合 agent 终局)。Christensen 的洞察是:在位者(IDE 范式)在延续性创新上几乎不可战胜,但常常被自己看不起的破坏性形态从下方掀翻。这个框架逼问 Cursor 的盲点:**它在 IDE 这个维度做到了极致,但极致本身可能是被锁死在错误维度上的极致**。当然,边界是——破坏性创新理论被批评为事后叙事、可证伪性弱(Jill Lepore 等的批评),不能当成预言,只能当成一个值得警惕的失效场景。

## §8 跨域呼应:维特根斯坦"语言游戏"与工具范式锁定

[Polanyi 默会知识与提示工程的认识论张力](/kb/基础知识库/polanyi-默会知识与提示工程的认识论张力/) 提醒我们:工具不只是手段,它重塑使用者的认知结构。这里我调度一个更锋利的框架——维特根斯坦的**"语言游戏"(language game)**:一个工具内建的交互语法,会规训用户"能想到什么样的操作"。

IDE 这个"语言游戏"的语法是:文件、行、光标、编辑、保存、运行。Cursor 把 AI 嵌进这套语法,红利是用户**不用学新游戏**就能用 AI;代价是用户的 AI 想象力被这套语法**封顶**——你会本能地用"补全这一行""改这个文件"的方式使唤 AI,而很难跳到"把这个 24 文件的模块整体演进到下一个架构"。CLI/agent 形态因为没有编辑器这套语法的束缚,反而**允许一种新的语言游戏**:用任务和意图驱动,而非用文件和光标驱动。

**这改变了什么技术判断**:它让我不再把"Cursor 体验更丝滑"当成无条件优势,而看成"它把用户更牢地绑在旧语言游戏里"——丝滑的代价是想象力的天花板。这与 §5 错位三、错位四的判断同源:被锁定的不只是产品形态,还有用户对"AI 能为我做什么"的认知边界。(跨域入口:0117社会学 的技术与社会建构视角。)

## §9 PM 决策启示

- **面试怎么用**:被问"怎么看 Cursor"时,不要背 feature。用一句话框住:"Cursor 是 IDE-fork 哲学的代表作,它用零迁移摩擦换编辑器底层控制权,做出了 Tab 和 instant apply 的体验护城河;但它的形态绑定在'边写边改'范式上,而 agentic coding 正在向'派活验收'迁移,Cursor 3 自己转向 Agent 视图就是这个张力的证据。"——形态 → 红利 → 锁定 → 证据,30 秒讲完。
- **选型怎么用**:做一张"形态—控制权—摩擦—锁定—管辖"五列表,把 Cursor / Copilot / Claude Code / TRAE 填进去,而不是 feature 对照表。计费模型稳定性单列一行。数据管辖单列一行(对有合规要求的组织是一票否决项)。
- **复现怎么用**:想理解 instant apply 为何快,去读 Fireworks × Cursor 的 Speculative Edits 工程博文;想验证"embedding 检索 vs agent grep"的差异,对同一个跨文件重构任务分别用 Cursor Agent 和 [Claude Code](/kb/ai-公司与产品/claude-code/) 跑一遍,观察它们各自"看了哪些文件"。

## §10 与已有节点的关系

- 对照 [Claude Code](/kb/ai-公司与产品/claude-code/)(0410 产品卡):该卡描述 Claude Code 的 CLI + IDE 集成形态、演化时间线与 Rick 自用体验。本节点**做对话与纠偏**——把 Cursor 的 IDE-fork 形态作为 Claude Code CLI 形态的对照镜,论证"形态错配"判断,不复述 Claude Code 的版本基线。
- 对照 [c10 - Agent 技术栈与工具调用](/kb/基础知识库/c10-agent-技术栈与工具调用/)(基础章):c10 讲 Agent 的工具调用基础与 G3 截面。本节点**做深化**——把抽象的"工具调用"落到一个真实产品(Cursor Agent Mode)的上下文检索与编辑应用机制上,不复述 [Function Calling](/kb/基础知识库/function-calling/) 的基础定义。
- 对照 [m207 - Agent 产品化：场景推演与失败模式](/kb/工程化与落地架构/m207-agent-产品化-场景推演与失败模式/):m207 讲 Agent 产品化的失败模式。本节点**做实例补缺**——提供"形态与能力终局错配"这一具体失败模式的产品级反例。
- 对照 [m208 - AI 基础设施与中间件选型](/kb/工程化与落地架构/m208-ai-基础设施与中间件选型/) 与 [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/):本节点在应用层引用其 [RAG](/kb/基础知识库/rag/)/[Embedding](/kb/基础知识库/embedding/) 与成本结论,**不复述**基础设施与成本计算细节,只做产品定价层投影。

## §11 关联节点

**核心(必读)**
- [Claude Code](/kb/ai-公司与产品/claude-code/) —— CLI 形态对照镜,本节点判断主轴的对手参照
- [m207 - Agent 产品化：场景推演与失败模式](/kb/工程化与落地架构/m207-agent-产品化-场景推演与失败模式/) —— "形态—能力终局错配"失败模式的上位框架
- [c10 - Agent 技术栈与工具调用](/kb/基础知识库/c10-agent-技术栈与工具调用/) —— Agent 工具调用与上下文检索的基础章
- [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/) —— 解释计费模型从包月向用量收敛的成本逻辑
- [Polanyi 默会知识与提示工程的认识论张力](/kb/基础知识库/polanyi-默会知识与提示工程的认识论张力/) —— §8 跨域呼应的认识论入口

**延伸(可选)**
- [m208 - AI 基础设施与中间件选型](/kb/工程化与落地架构/m208-ai-基础设施与中间件选型/) —— embedding 索引 vs agent grep 的基础设施层
- [RAG](/kb/基础知识库/rag/) / [Embedding](/kb/基础知识库/embedding/) —— Cursor 上下文检索的底层范式
- [Function Calling](/kb/基础知识库/function-calling/) —— Agent Mode 工具调用的原子能力
- [Agent](/kb/基础知识库/agent/) —— agentic coding 的上位概念
- [Anthropic](/kb/ai-公司与产品/anthropic/) / [Claude](/kb/ai-公司与产品/claude/) —— Cursor 默认可选的前沿模型供应方
- [AI PM 知识图谱·总索引](/kb/ai-pm-知识图谱/ai-pm-知识图谱-总索引/) —— 全库入口
- 0117社会学 —— 技术范式锁定的社会建构视角

## §12 修订日志

- **R0(2026-06-07)**:首稿。建立 IDE-fork 哲学框架,判断主轴四件套(错位一至四),Christensen 破坏性创新 + 维特根斯坦语言游戏双跨域,定价/用户量数字按 volatile 标注,与 Claude Code/c10/m207/m208/m209 建立升级对照。
- **R0.1(2026-06-07)**:WebSearch 核实并修订三处载重事实——(1)Cursor 3(2026-04-02)= Agents Window + Composer 2 + Marketplace,Subagent `/multitask` 实为 3.2(2026-04-24)新增,已分版本标注;(2)定价 Credit 制 2026-06 口径修正:credit 池 = 月费美元数,Auto 模式不限量不扣 credit,仅手动前沿模型/Max 模式计量;(3)§5 错位三同步分版本时间线。仍待核实:ARR(\$3B 为 Sacra 估算、\$2B 为 TechCrunch 知情人士口径,均非官方财报)、DAU/付费用户为第三方统计口径,正式引用前再核。

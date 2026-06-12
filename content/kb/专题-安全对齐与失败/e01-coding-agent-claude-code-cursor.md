---
title: E01 Coding Agent·Claude Code & Cursor
cluster: 专题 · 安全对齐与失败
created: '2026-05-18'
updated: '2026-06-12'
provenance: ai
facet: Agent
---

# E01 Coding Agent·Claude Code & Cursor

一句话定义：[Claude Code](/kb/ai-公司与产品/claude-code/) 与 Cursor 是 2024–2026 年间 [Agent](/kb/基础知识库/agent/) 落地最成熟的两个产品形态——一个把 agent 放进 CLI、按"会话式协作者"组织；一个把 agent 放进 IDE、按"延伸的手"组织。两者共享同一底座（LLM + 工具调用循环），却在 harness 的形态选择上彻底分叉，是研究 [Harness 设计哲学](/kb/专题-安全对齐与失败/a02-抽象层级辨析-harness-framework-agent-skill-orchestrator/) 的最佳活体样本。

## 1.1 为什么先看 Coding Agent

[m206 - Agent 产品化：记忆机制与技术进展](/kb/工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/) 在 §2.4.2 给出过三启示，其中决定性的一条是："选错误成本低 + 验证容易的场景先落地"。Coding 是 [Agent](/kb/基础知识库/agent/) 落地最早最成熟的场景，原因可以分解为三条工程约束：

- **错误可逆**：写错一行代码可以撤销，commit 之前的 working tree 永远可丢弃；与之对照的"发送了一封带错收件人的邮件"则不可撤销。这条约束让 Coding Agent 在 [m207 HITL 三维度判断](/kb/工程化与落地架构/m207-agent-产品化-场景推演与失败模式/) 上天然落在"低风险"一侧。
- **验证机器可读**：编译器、类型检查器、linter、test runner——所有验证手段都返回结构化输出（pass/fail + 行号 + 报错文本），不需要人类介入打分。这把"评估闭环"从 Goodhart 陷阱（[c14 - 模型评估体系与 Goodhart 陷阱](/kb/基础知识库/c14-模型评估体系与-goodhart-陷阱/)）里救了出来：成功率指标无法被 hack，因为指标本身就是真实世界的副产品。
- **使用者就是开发者**：使用 Coding Agent 的人，本身就具备验证能力、能写 prompt、能 debug。这把 [Harness](/kb/专题-安全对齐与失败/a02-抽象层级辨析-harness-framework-agent-skill-orchestrator/) 的复杂度阈值压低了——用户能容忍 CLI、能读懂 trace、能写配置文件。

这三条让 Coding Agent 成为整个 G3/G4（参见 [G02 五代演化详解·G1-G5](/kb/专题-安全对齐与失败/g02-五代演化详解-g1-g5/)）的方法论原型：[Orchestrator](/kb/专题-安全对齐与失败/a06-orchestrator-编排器/)、[Skill](/kb/ai-协作方法论/skill-系统的本质/)、subagent dispatch、长任务管理等设计模式，全部在 Coding Agent 上首先跑通，然后才被"通用 Agent"借去用——但搬过去之后失效率显著上升（[E02 通用 Agent·Manus & Devin](/kb/专题-安全对齐与失败/e02-通用-agent-manus-devin/) 会展开）。

## 1.2 Claude Code 剖解（截至 2026-05，按 S03 六维度统一命名）

**版本基线**：2025 Q1 早期 preview → 2025 年中 GA → 2025-10 Anthropic Skills 公开并接入 → 2025 末 Subagents/Hooks/Plugins 标准化 → 2026.1–2026.5 模型升级到 Sonnet 4.6 / Opus 4.7 / Haiku 4.5。下文按 [S03 Harness Engineering 全景](/kb/专题-安全对齐与失败/s03-harness-engineering-全景/) § 3 六维度对照（取代旧版"harness 哲学/Skill/Tool/Memory/Orchestrator/HITL/可复现度"七项）。

| S03 六维度 | Claude Code 实现 |
|---|---|
| **Prompt 模板与角色配置** | 针对 Anthropic 模型族深度调优；persona 段可改、safety guardrails 段不可改；CLI-first 形态决定语气低废话、高密度 |
| **工具注册与调用调度** | 内置：Read/Edit/Write/Bash/Grep/Glob/WebFetch/WebSearch/TodoWrite/Task/NotebookEdit；外部：原生 MCP（Anthropic 是 MCP 提出方）；Skill 三层（官方 public / 用户 user / 第三方插件市场）|
| **上下文窗口管理** | CLAUDE.md 自动注入项目级 context；memory 子目录跨会话；显式 `/clear` 反选保留段；显式触发的 memory 写入避免噪声累积 |
| **错误恢复与重试策略** | 配置项（不硬编码）；错误信息结构化 LLM-readable；headless mode 支持 resume |
| **HITL 断点** | permission mode 多档位（默认/acceptEdits/bypassPermissions/plan），把控制权交给用户 mode 选择而非 Agent 自行判断（务实选择，因模型自评不可靠） |
| **Observability** | `/cost` 命令显示 token 消耗；trace 可被 Anthropic Console 看；企业级可接入 OpenTelemetry |

**可复现度**：harness 闭源（CLI 主程序、Plan/TodoWrite/Task 内部实现不公开），但生态层全开放——SKILL.md 标准公开、CLAUDE.md 写法公开、MCP 协议公开、插件市场允许第三方上架。结果是 harness 不可复现，但"Claude Code 风格的开发实践"完全可学。Rick 已在用——本份知识库的自动化运行、Obsidian 索引同步、cubox/flomo/weread 处理脚本，全部由 Claude Code 驱动。

## 1.3 Cursor 剖解（截至 2026-05，按 S03 六维度统一命名）

**版本基线**：2023 早期发布 → 2024 推出 Composer（Agent mode）→ 2025 上半年 .cursorrules → User Rules / Project Rules 升级、Bug Bot → 2025 年中 MCP 接入、Background Agents → 2026 初支持"多任务并行 Agent"。

| S03 六维度 | Cursor 实现 |
|---|---|
| **Prompt 模板与角色配置** | 模型中立设计（接 Claude/GPT-5/Gemini/DeepSeek），prompt 必须更通用；persona 通过 .cursorrules / User Rules 由用户覆盖（比 Claude Code 走得更宽）|
| **工具注册与调用调度** | 内置：codebase indexing (Merkle tree + embedding)、Apply、Terminal、Browser；外部：MCP（2025 年中接入，与 Claude Code 共享同一协议生态）|
| **上下文窗口管理** | .cursorrules 单文件 → User Rules（账号级）+ Project Rules（仓库级 + glob 触发）；Tab 补全靠 codebase indexing 跨文件 |
| **错误恢复与重试策略** | Composer 内置但配置粒度较粗；Background Agents 支持长任务 resume |
| **HITL 断点** | 核心是 Apply 前 inline diff 预览，所有改动按行/段/文件接受或拒绝；HITL 设计成"编辑器原生交互"，比 Claude Code permission mode 更轻 |
| **Observability** | 订阅用量面板（session 级），to B 客户可接入 enterprise console；trace 粒度比 Claude Code 粗 |

**可复现度**：闭源，但 .cursorrules 与 Project Rules 公开——社区大量分享的 rules 模板（awesome-cursorrules、PatrickJS/awesome-cursorrules）形成事实上的"用户层 skill 市场"。

## 1.4 横向对照表

| 维度 | Claude Code | Cursor |
|---|---|---|
| **形态** | CLI / 桌面 App / IDE 插件 | Fork 的 VS Code |
| **默认控制粒度** | 任务级（plan → edit → verify）| 补全级（Tab）+ 任务级（Composer）|
| **高频交互** | 一段自然语言任务 + 多步执行 | Tab 接受 + Cmd+K 局部编辑 |
| **Skill / Rules 系统** | SKILL.md 三层（官方 / 用户 / 第三方）| User Rules + Project Rules（用户为主）|
| **Subagent dispatch** | Task 工具，多类型子 Agent | Composer 单主线程，2026 加多任务并行 |
| **MCP** | 原生（Anthropic 提出方）| 2025 接入 |
| **后台异步任务** | Headless mode + scheduled tasks | Background Agents（2026）|
| **HITL 形态** | permission mode 多档位 | Apply 前 inline diff 预览 |
| **模型** | Claude Opus 4.7 / Sonnet 4.6 / Haiku 4.5 多模型分层 | 接 [Claude](/kb/ai-公司与产品/claude/) / GPT-5 / Gemini 3 / DeepSeek V4 多家 |
| **商业模式** | API 按 token 计费（也有订阅包）| 订阅 + token 用量上限 |
| **目标用户** | 重型任务、长任务、CLI 老用户 | 日常编码、补全密集、IDE 重度用户 |

## 1.5 设计哲学的分歧（保留概括 + R3 新增三个不可调和的设计选择）

把两家放在一起对比，能看到的不是"功能多寡"的差距，而是对"Agent 是什么"的根本分歧：

**Claude Code 把 agent 当作"协作者"**——要求 Rick 主动表达意图、主动 review plan、主动确认 permission。Plan mode 的存在本身就是哲学声明："先想清楚再动手"。

**Cursor 把 agent 当作"延伸的手"**——要求用户保持心流，把 AI 存在感压到最低。Tab 补全的设计目标是"不需要思考就接受"。Composer 是退路（任务复杂时再上重锤），默认形态是"AI 在背景里跑"。

这两段"协作者 vs 延伸的手"是概括——真正可拿出去用的判断在下面三个不可调和的设计选择。

### 1.5.1 不可调和选择 1：plan 阶段是显式还是隐式

- **Claude Code 的 plan mode 是显式的**——用户必须主动按 Shift+Tab 进入 plan mode，模型在 plan mode 不动文件、只规划。
- **Cursor 的 plan 是隐式的**——Composer 自动 plan（用户看到模型 "Let me first..." 的文本就是 plan 的体现），不会让用户停在 plan 阶段。

这背后是**对"用户应不应被告知 plan 阶段存在"的两种相反判断**：

- Claude Code 立场：用户必须意识到 plan 是一个独立阶段——这是把 PM 的"先 think 再 do"工程化，强迫用户慢下来。
- Cursor 立场：plan 应该藏在交互里——用户不应该感受到 plan 的存在，否则会破坏心流。

两者无法兼容——你不能既显式又隐式。**PM 选型判断**：你的目标用户是"复杂任务为主"（必须慢下来），还是"高频低风险任务为主"（必须快起来）？这道选择题的答案就决定了你该学谁。

### 1.5.2 不可调和选择 2：HITL 决策权由谁掌握

- **Claude Code 的 permission mode 把所有 HITL 决策权交给用户配置**——bypassPermissions / acceptEdits / default 三档由用户选，模型不参与判断。
- **Cursor 的 inline diff 把 HITL 决策权交给 AI 自己生成的 diff 大小**——小 diff（一行）几乎不打断，大 diff（多文件）必然弹出 review，颗粒度由 AI 决定。

这是**"用户 vs AI 谁判断 HITL 颗粒度"的根本分歧**：

- Claude Code 立场：用户最懂自己的风险偏好，把决策权交给用户。
- Cursor 立场：AI 最懂这次改动的影响范围，让 AI 决定何时打断用户。

**PM 选型判断**：你的用户群更接受"配置一次永久生效"（程序员、SRE）还是更接受"AI 帮我把握节奏"（设计师、非技术用户）？这决定了你该走 Claude Code 还是 Cursor 路线。

### 1.5.3 不可调和选择 3：模型耦合 vs 模型中立

- **Claude Code 的 prompt 高度针对 Anthropic 模型族调优**——同一份 prompt 喂给 GPT-5 或 Gemini 效果显著下降。这不是 bug，是选择。
- **Cursor 必须模型中立**——它要接 Claude/GPT-5/Gemini/DeepSeek 四家，prompt 必须通用，单模型上的极致体验被牺牲。

这是 [S03 Harness Engineering 全景](/kb/专题-安全对齐与失败/s03-harness-engineering-全景/) § 5.1 "harness 第一悖论"的活体演绎——**精细化越深，模型锁定越严；模型中立越强，单模型体验越平**。

**PM 选型判断**：你的产品是否要"押注一家模型"？如果是（Claude Code 路线）→ 单模型体验封顶但绑死命运；如果不是（Cursor 路线）→ 模型迁移自由但永远做不到 Claude Code 在 Anthropic 模型上的体验深度。

### 三个选择的元规则

**这三个选择不是"哪个更好"，而是"针对哪类用户更好"——任何想"既要又要"的产品都会在某一个维度被对手碾压**。这是 Coding Agent 市场不会出现"一家通吃"的根本结构性原因。

### 1.5.4 第三条路:Trae Solo / v0 / Bolt 不在"协作者 vs 延伸的手"框架内(R4 新增)

> **R4 反 confirmation bias 修订**:本节点早期把"协作者 vs 延伸的手"作为 Coding Agent 的穷尽分类——但**Trae Solo / v0 / Bolt 这类"非程序员 vibe coding" 产品完全不在这两条路线上**,它们走第三条路。

**第三条路的核心特征**:
- **目标用户:非程序员**(产品经理 / 设计师 / 业务用户)——他们不会读代码,只看预览。
- **交互形态:自然语言 + 即时预览**——用户用自然语言描述要的功能,产品直接生成可运行的预览(不是 diff、不是 plan、不是命令行)。
- **执行模式:不可见的代码**——产品在背后生成代码,但用户**不需要看 / 不会看 / 不应该看代码**。代码是实现细节,不是用户界面。

**典型产品**:
- **Trae Solo**(字节,2026)——AI Native 的全代码生产产品,允许 PM / 设计师直接"对话出"应用。
- **v0**(Vercel,2024)——React 组件 + 网站快速生成,用户用自然语言描述要的 UI。
- **Bolt**(StackBlitz,2024)——浏览器内全栈应用生成,用户描述功能直接看到运行结果。
- **Lovable**(瑞典,2024)——类似 Bolt,主打"chat-to-app"。

**为什么 Trae Solo / v0 / Bolt 不属于"协作者 vs 延伸的手"**:
- **不是"协作者"**——它们不要求用户主动 plan,用户只说目标。
- **不是"延伸的手"**——它们不需要用户在心流里,用户对代码完全无感知。
- **是"代理 (Proxy)"** —— Agent 完全代替用户做技术决策,用户只看产品。这是阿伦特"行动 vs 制作"区分中的"制作"路径——把代码生产完全外包。

**对早期"两条路线穷尽分类" 判断的修正**:
- 不再说"协作者 vs 延伸的手是 Coding Agent 的穷尽分类"——改为"在面向程序员的 Coding Agent 市场,两条路线穷尽;但面向非程序员的 vibe coding 市场,有第三条路"。
- 承认这第三条路**用户群比前两条都大**(全球程序员约 3000 万,非程序员需要"生成应用"的可能是数亿)——这是 v0 / Bolt 等产品估值飙升的原因。

**对 PM 的具体启示**:
- **如果你的产品目标是"让非程序员做 app",不要学 Claude Code 或 Cursor**——它们的设计哲学根本不适用。学 Trae Solo / v0 / Bolt 的"自然语言 + 即时预览 + 代码完全不可见" 路线。
- **如果你的产品目标是"让程序员更高效",在 Claude Code(重型任务) vs Cursor(日常编码)之间选**——别想兼顾非程序员市场,会同时输给两边。
- **三条路线对应三种商业模式**:Claude Code 路线(深度订阅,高 ARPU)、Cursor 路线(广订阅,中 ARPU)、Trae/v0/Bolt 路线(SaaS + 用量计费,低单价但用户群大)。

### 互相借鉴的趋势（保留）

两家都意识到对方覆盖的场景重要，所以 2026 年的趋势是互相借鉴：Cursor 加 Background Agents 学 Claude Code 的长任务，Claude Code 出 VS Code 插件学 Cursor 的 IDE 集成。但默认入口的差异（CLI vs IDE Tab）决定了用户的"第一手势"完全不同，这一手势就是产品哲学的本体。

## 1.6 与已有节点的关系

- 对 [m206 - Agent 产品化：记忆机制与技术进展](/kb/工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/) §2.4.2 三启示的**实例化补全**：旧版只点到"Cursor 的 Tab 补全 + 人类审阅"模式，没拆 harness 各层；本节点把六层架构拆开对照。
- 对 [Claude Code](/kb/ai-公司与产品/claude-code/) 节点的**横向对比补缺**：旧节点只单独描述 Claude Code，没和 Cursor 做"哲学层"对照；本节点补上分歧分析。
- 对 [Skill 系统的本质](/kb/ai-协作方法论/skill-系统的本质/) 的**应用层延伸**：旧节点定义了 skill 是什么，本节点说明 skill 在 Claude Code 与 Cursor（User Rules）里的同源现象。
- 对 [Harness 词义辨析](/kb/专题-安全对齐与失败/harness-词义辨析/) 的**实例化兑现**：旧节点定义了 harness = "agent 运行时框架的通称"，本节点把 Claude Code 和 Cursor 作为两种 harness 形态摊开对照。

## 1.7 PM 决策启示

**面试 case 用法**：当被问"举一个你觉得做得好的 AI 产品"，不要简单说"Claude Code/Cursor 很好用"——把两家的设计哲学分歧讲出来才有信号量。可参考表达："两家都基于 LLM + 工具循环，但 Claude Code 假设用户会主动 plan，Cursor 假设用户在心流里——这导致它们在 HITL 形态（permission mode vs inline diff）、控制粒度（任务级 vs 补全级）、Memory 抽象（CLAUDE.md vs Project Rules）上做出完全不同的选择。这告诉我设计 Agent 产品时，第一个要回答的不是'用什么模型'，而是'用户的第一手势是什么'。"

**自建 Coding Agent 时该学谁**：

- 如果你的用户是"专业开发者 + 长任务为主"（如 SRE、平台工程、大型重构）→ 学 Claude Code：CLI 入口 + plan 显式化 + subagent 隔离 + permission mode；
- 如果你的用户是"半专业 + 日常编码"（如全栈、前端、数据分析）→ 学 Cursor：IDE 集成 + Tab 补全 + diff 预览；
- 如果你的用户是"非开发者 + vibe coding"→ 都不像，参考 Trae Solo / v0 / Bolt 的形态（自然语言 + 即时预览，[Claude Code](/kb/ai-公司与产品/claude-code/) 节点的对照段落已展开）。

**Skill / Rules 系统是必装的**：不论学哪家，把"procedural knowledge 文档化"这一层做出来都是基础设施级的工作。社区已有的 awesome-cursorrules、awesome-claude-code-subagents 是最便宜的入门。

## 1.8 跨域呼应

- **[Polanyi 默会知识](/kb/基础知识库/polanyi-默会知识与提示工程的认识论张力/) ↔ Cursor 的 Tab**：Tab 补全适合"默会节奏"——用户不显式表达意图，靠身体感觉判断"这一段补全要不要接受"。这正是 Polanyi 描述的"我们知道的比我们能说出来的多"。Claude Code 的 plan mode 反之——它强迫把默会变成显式，适合"显式思考"的任务。这两种产品对应了两种不同的认识论姿态。
- **阿伦特 work vs action（范式 相关）**：Coding Agent 替代的是"work"（制作产品的可重复劳动），不是"action"（有创造性的判断与决策）。Claude Code 的 plan mode 是"把 action 留给人、把 work 派给 agent"的形态化；Cursor 的 Tab 则更激进——它把"work"的颗粒度压到一行代码，让 action 几乎不被察觉地嵌在心流里。
- **韦伯科层制 ↔ Subagent dispatch**：Claude Code 的 Task 工具派发子 Agent，本质是把任务做"科层化分解"——主 Agent 像总管，subagent 像专员，permission mode 是审批链。这种"工程化的科层"正是 [Multi-Agent](/kb/专题-安全对齐与失败/a07-multi-agent-teams/) 范式的雏形。

## 1.9 关联节点

**核心关联（必读）**：
- [S03 Harness Engineering 全景](/kb/专题-安全对齐与失败/s03-harness-engineering-全景/)——本节点 § 1.2、§ 1.3 用 S03 六维度统一命名
- [Claude Code](/kb/ai-公司与产品/claude-code/)、[Skill 系统的本质](/kb/ai-协作方法论/skill-系统的本质/)——本节点是这两个节点的横向对比版
- [Harness 词义辨析](/kb/专题-安全对齐与失败/harness-词义辨析/)——harness 词源是本节点设计哲学分歧的理论框架
- [Polanyi 默会知识与提示工程的认识论张力](/kb/基础知识库/polanyi-默会知识与提示工程的认识论张力/)——Cursor Tab 补全的默会节奏在 Polanyi 框架下的解释
- [E02 通用 Agent·Manus & Devin](/kb/专题-安全对齐与失败/e02-通用-agent-manus-devin/)、[E03 Multi-Agent 框架·AutoGen & CrewAI & DeerFlow](/kb/专题-安全对齐与失败/e03-multi-agent-框架-autogen-crewai-deerflow/)——同专题实例剖解三件套

**延伸关联（可选）**：
- 概念辨析：[A02 抽象层级辨析·Harness Framework Agent Skill Orchestrator](/kb/专题-安全对齐与失败/a02-抽象层级辨析-harness-framework-agent-skill-orchestrator/)、[A06 Orchestrator 编排器](/kb/专题-安全对齐与失败/a06-orchestrator-编排器/)、[A07 Multi-Agent Teams](/kb/专题-安全对齐与失败/a07-multi-agent-teams/)、[A08 MCP 与 A2A 协议族](/kb/专题-安全对齐与失败/a08-mcp-与-a2a-协议族/)
- 章节：[c10 - Agent 技术栈与工具调用](/kb/基础知识库/c10-agent-技术栈与工具调用/)、[m206 - Agent 产品化：记忆机制与技术进展](/kb/工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/)、[m207 - Agent 产品化：场景推演与失败模式](/kb/工程化与落地架构/m207-agent-产品化-场景推演与失败模式/)、[m208 - AI 基础设施与中间件选型](/kb/工程化与落地架构/m208-ai-基础设施与中间件选型/)
- 公司 / 产品：[Claude](/kb/ai-公司与产品/claude/)、[Anthropic](/kb/ai-公司与产品/anthropic/)
- 同专题：[S01 Agent 六层架构剖面](/kb/专题-安全对齐与失败/s01-agent-六层架构剖面/)、[G02 五代演化详解·G1-G5](/kb/专题-安全对齐与失败/g02-五代演化详解-g1-g5/)
- 跨域：范式

## 修订日志

- **R3 → R4（2026-05-18）**：本轮聚焦反方对话训练 + 第三条路承担。修订要点:
  1. § 1.5 新增 § 1.5.4 "第三条路:Trae Solo / v0 / Bolt 不在'协作者 vs 延伸的手'框架内" —— 反 confirmation bias 修订:承认本节点早期"协作者 vs 延伸的手" 是穷尽分类的判断不成立;承认非程序员市场有第三条路(自然语言 + 即时预览 + 代码完全不可见)
  2. § 1.5.4 给三种商业模式对照:Claude Code 路线(深度订阅高 ARPU) / Cursor 路线(广订阅中 ARPU) / Trae/v0/Bolt 路线(SaaS + 用量计费低单价但用户群大)
  3. § 1.5.4 显式提醒"想兼顾非程序员市场会同时输给两边" 的 PM 决策启示
  4. 引入的对手立场:Trae Solo / v0 / Bolt 第三条路事实 (对"协作者 vs 延伸的手" 穷尽分类的反驳)
- **R2 → R3（2026-05-18）**：聚焦判断密度提升。本轮修订要点：
  1. § 1.2 / § 1.3 各压缩到 ≈ 400 字（按 S03 六维度统一命名取代旧版自定义维度）——回应 Round 2 [失血-8]、[对话缺失-3]
  2. § 1.5 新增 § 1.5.1 / 1.5.2 / 1.5.3 三个"不可调和的设计选择"作为主轴：plan 显式 vs 隐式 / HITL 决策权用户 vs AI / 模型耦合 vs 中立——每段 300 字带 PM 选型判断
  3. § 1.5 末尾加"元规则：不会出现一家通吃"作为结构性判断
  4. 关联节点分两档，核心关联加 [S03 Harness Engineering 全景](/kb/专题-安全对齐与失败/s03-harness-engineering-全景/)
- **R1 → R2（2026-05-18）**：Claude Code 版本基线时间线拆开"GA + Skills 公开"以避免读者误认为同月发生。
- 2026-06-12 内审修复：frontmatter 补 final_path 字段（= 本文件在库内实际相对路径）。

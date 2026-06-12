---
title: A08 MCP 与 A2A 协议族
cluster: 专题 · 安全对齐与失败
created: '2026-05-18'
updated: '2026-06-11'
provenance: ai
facet: Agent
---

# A08 MCP 与 A2A 协议族

一句话定义：MCP（Anthropic 2024-11）规定 agent ↔ tool 调用，A2A（Google 2025）规定 agent ↔ agent 对话；二者覆盖纵横两个抽象层，是 Agent 进入 G5 协议化阶段的两条骨架。

## 一、MCP 是 LSP 的精准复刻，不是 REST/GraphQL 的对手（最关键论点）

> 反共识首句：**任何把 MCP 类比为 REST 或 GraphQL 的文章都是没看懂——MCP 的真正对应物只有 LSP（Language Server Protocol）**。看懂这件事就看懂了 MCP 为什么能在 2025 年成为事实标准，以及为什么 OpenAI 在 2025 年底"投降"接受 MCP。

### MCP 五要素的最短描述

| 要素 | 含义 |
| --- | --- |
| Server | 提供能力的进程 |
| Client | 消费能力的 agent harness |
| Resource | 只读上下文（文档、数据库行、文件） |
| Tool | 可被 LLM 调用的函数 |
| Prompt | 模板化的提示片段，由 Server 提供 |

传输层基于 JSON-RPC 2.0，初版仅支持 stdio 和 SSE；2025 年中加入 streamable HTTP，已是事实标准（[c10 - Agent 技术栈与工具调用](/kb/基础知识库/c10-agent-技术栈与工具调用/) 中已写明）。

### 为什么 MCP 的成功本质是 LSP 路径的复刻

LSP 的成功三要素（2016 年微软 + Red Hat 推 LSP 时的工程选择，结果 6 年内统一了 IDE-语言后端协议生态）：

1. **不绑定语言厂商**：LSP 协议规范公开，不归 TypeScript / Rust 任何一家所有。MCP 复刻：协议归属 Anthropic 但规范完全开放，任何模型（GPT-5、Gemini、DeepSeek）都可以做 MCP Client。
2. **客户端先采用**：VS Code 首先实现 LSP Client，让所有支持 LSP 的语言后端立刻"被看见"。MCP 复刻：Claude Desktop / Claude Code 首先实现 MCP Client，让所有 MCP server 立刻被一线工程师"看见"。
3. **服务器自发涌现**：LSP 推出 18 个月内，pyright / rust-analyzer / clangd 等高质量 server 自发涌现。MCP 复刻：2024-11 发布到 2025 年底，数千个 MCP server 在 mcp.so / smithery.ai 涌现。

### GraphQL 的失败给我们的反向教训

GraphQL（Facebook 2015）失败的两个原因：

1. **协议设计过度灵活**——schema 太自由导致没有清晰的"标准 query"，每家用法都不同。
2. **没有强 reference implementation**——Apollo 太重、graphql-js 太裸，没有"一装就能用"的范本。

**MCP 选 JSON-RPC 而不是 GraphQL 的原因**：Anthropic 工程团队知道 LLM agent 的工具调用语义最像"IDE 自动补全"（已知名字、调用函数、得到结果），不像"数据查询"（自由组合字段）。**所以 MCP 在协议设计上严格限制——一个 server 只能暴露固定的 Resource/Tool/Prompt 三种东西，不能让用户自由组合**。这种"克制"正是 LSP 的精神。

### LSP 类比的政治经济学边界(R4)

"MCP 是 LSP 的精准复刻"只复刻了 LSP 的成功路径,**没复刻 LSP 的失败和 LSP-MCP 之间的政治经济学差异**。三条差异必须显式承担:

**差异 1:协议主推方的商业利益结构**——LSP 是微软 + Red Hat 推的,两家**无 LLM/语言运行时商业利益**(微软卖 VS Code/Azure,Red Hat 卖 RHEL);MCP 是 **Anthropic 推 + Anthropic 卖 Claude API,协议主推方 = API 提供方**。Anthropic 的真实立场是"协议层中立 + 客户端层锁定"——Claude 在所有 client 里跑、OpenAI 在 Claude client 里跑、但 client 是 Anthropic 的。5-10 年尺度上有"利用协议主推方地位推动协议演化朝有利于 Claude 方向"的风险,LSP 模式没有这种风险结构。

**差异 2:协议范畴的天花板**——LSP 在 10 年间没解决"语义查询"(VS Code 至今缺跨语言语义搜索),因为 LSP 范畴限定在"语法服务";**MCP 同样不解决"工具描述质量 / tool grounding / long-tail 信任与发现"三个问题**。预测 5-10 年后 MCP 可能被这三个 LSP 没有的瓶颈卡住,届时需要"semantic MCP"或下一代协议。这意味着 MCP 的成功路径有时限,不是"一统江湖"的终局。

**差异 3:OpenAI 为什么"投降"接受 MCP**——不是"看到 MCP 协议设计好",是 **OpenAI 自家的"中央平台"路线在 2025 年事实失败**:Apps SDK / GPT Store 用户增长远低于 ChatGPT 本身,Sam Altman 2026 年初 "Reflections" 复盘已经承认"Agent 比预期慢、Operator 用户增长远低于 ChatGPT"。所以 OpenAI 接受 MCP 是被动妥协,不是协议层共识。

**对"MCP 是 LSP 精准复刻"的修正**:改为"MCP 在协议设计哲学上复刻 LSP,但在政治经济学结构和协议范畴限制上有 LSP 没有的风险"。两个开放问题不假装已经回答:**(a) MCP 是否会演化为协议层垄断?(b) MCP 是否会在 5-10 年后被工具描述质量瓶颈卡住?**

**面试反方追问的标准回答**(15 秒版):"风险真实存在——LSP 是无商业利益方推的,MCP 是 Anthropic 推 + 卖 Claude,长期可能从'协议层中立'滑向'客户端层锁定'。我当下用 MCP 是基于 3-5 年内 Anthropic 保持协议中立性的赌注,有预案;同时 OpenAI 的中央平台路线已在 2025 年失败,MCP 仍是当下最优,只是带显式长期风险。"

### 2026-05 的真实状态

- 已支持 MCP 的 harness/平台：[Claude Code](/kb/ai-公司与产品/claude-code/)、Claude Desktop、Cursor、Continue、Zed、Windsurf、Cline、Aider、字节 DeerFlow、Manus、阿里通义、字节 Trae、Sourcegraph Cody。
- 第三方 MCP server 数量：截至 2026-05 在 mcp.so / smithery.ai 等聚合站收录数千个；典型如 Slack、Notion、Linear、Figma、Postgres、Stripe、Google Drive、Gmail、Sentry。
- 政治结构：MCP 不绑定 Anthropic 模型——任何 LLM 只要能输出 function call 即可作为 Client。
- OpenAI 在 2025 年底跟进，让 ChatGPT Desktop 与 GPT-5 系列原生支持 MCP（"OpenAI 投降"事件）；Gemini 3 通过适配层接入。

### Function Calling 的辨析（最常被混淆）

- **Function Calling**：模型 API 层的功能（OpenAI 2023-06 首发）——解决"模型怎么说要调工具"。
- **MCP**：工程协议层的标准——解决"工具怎么被发现、注册、调用、版本化"。
- 两者不竞争，MCP 内部仍用 function calling 让模型表达调用意图。

## 二、A2A：把 agent 之间的握手协议化

### 协议核心结构

A2A 由 Google 在 2025 Cloud Next（2025-04-09）期间发布，首发即拉拢 50+ 厂商（Salesforce、SAP、Box、Atlassian、Langchain、Cohere、ServiceNow、Workday 等）；2025-Q4 至 2026-Q1 进入 1.x 稳定迭代；至 2026-04 已有 150+ 组织宣布支持（Linux Foundation 等多源印证）。核心抽象：

- **Agent Card**：每个 agent 公开 `/.well-known/agent.json`，描述能力、输入/输出 schema、调用方式、SLA。
- **Task**：客户端 agent 向服务端 agent 发起的任务请求，带状态机（submitted / working / input-required / completed / canceled / failed）。
- **Message / Artifact**：消息流（可流式）+ 结构化产出物（PDF、表格等）。
- **Endpoints**：HTTP + SSE / WebSocket，带 OAuth 2.1 认证和审计 ID。

### 与 MCP 的层次差异（最关键的一张图）

```
       人 / 业务系统
            │
            ▼
   ┌──────────────┐
   │   Agent A    │  ←── A2A ──→  ┌──────────────┐
   │ (orchestrate)│                │   Agent B    │
   └──────┬───────┘                │   (CRM ops)  │
          │                        └──────┬───────┘
          │ MCP                           │ MCP
          ▼                               ▼
       [Tool: Notion]                  [Tool: Salesforce]
       [Resource: docs]                [Resource: leads]
```

- **MCP = 纵向**：agent ↔ tool / resource / 数据源。
- **A2A = 横向**：agent ↔ agent。
- A2A 不替代 MCP，反之亦然——一个真实生产系统通常同时跑两层。

**很多博客把 A2A 描述为"MCP 的对手"，是技术叙事错位**。正确表达：它们覆盖不同抽象层；用 MCP 接工具、用 A2A 接同行 agent。

## 三、协议化 = G5 时代的特征

回看 Agent 五代演化（详见 [G02 五代演化详解·G1-G5](/kb/专题-安全对齐与失败/g02-五代演化详解-g1-g5/)）：

- G1（2022-2023）：ReAct，单 agent 单工具，所有胶水手写。
- G2（2023-2024）：framework 化（LangChain/LlamaIndex），工具调用 SDK 化。
- G3（2024）：Multi-Agent 框架涌现，但协议私有。
- G4（2024-2025）：Computer Use / Browser Agent，agent 能触达任意 GUI。
- **G5（2025-至今）：协议化生态**——MCP 成事实标准、A2A 成跨厂商标准、Agent 不再是产品而是"接入点"。

**协议化的政治经济学意义**：把"先发框架红利"转译为"协议中立性"。最先吃到 framework 红利的 LangChain 在协议化时代必须重新证明自己——不能再靠"我们生态最丰富"卡位。这与互联网早期 Netscape 的命运高度相似——Browser Wars 结束后，Netscape 的胜算被 HTTP/HTML 这两个协议的开放性消解了。

### 3.1 反 hype 立场:协议化叙事的 narrative shaping(R4 新增)

> **R4 修正**:本节点早期把协议化描述为"自然演化的必然结果" —— 但这是**两家公司主动 shape 出来的叙事**,不是中立的技术演化。"把先发框架红利转译为协议中立性" 这一表述本身是**Anthropic+Google 利益叙事的复述**,需要被显式审视。

**协议化叙事的真实结构**:
- **MCP 由 Anthropic 推**:Anthropic 是 LLM 模型厂商 —— MCP 让所有 client 都能跑 Claude,扩大 Claude 市场覆盖。
- **A2A 由 Google 推**:Google 是云厂商 + 模型厂商 —— A2A 让 agent 互相调用,Google Cloud 收编流量。
- **二者在叙事上互补**:MCP 谈纵向(agent ↔ tool),A2A 谈横向(agent ↔ agent),共同覆盖 G5 协议化全景。
- **OpenAI 的 GPT Store / Apps SDK 路线被压**:OpenAI 习惯把 ChatGPT 做成中央平台,"协议化"动了 OpenAI 的奶酪 —— OpenAI 在 2025-Q4 被动接受 MCP,不是主动选择(详见 § 一 R4 新增"OpenAI 接受 MCP 的真实原因")。
- **中国大厂(阿里、字节)对 MCP 表面支持,内部仍推私有协议**:字节 Volcano Engine、阿里通义内部协议、百度文心内部协议 —— 这些是协议化叙事暗含的反 narrative。

**LeCun 在 X 上说过的一句话完全适用 MCP**:"开源 LLM 是历史进步,但开源协议如果主推方仍掌握话语权,只是新形式的厂商锁定"。LeCun 在批评 OpenAI / Anthropic 时说这话,但**完全适用于 MCP 自身**。

**对早期"协议化是历史进步"叙事的修正**:
- 不再说"自然演化必然结果" —— 改为"两家公司联合塑造的反 OpenAI 叙事,对中小开发者和 PM 是好事(降低锁定),但不是技术中立的必然"。
- 不再单推协议化 —— 加入"协议化降低锁定但也降低差异化"的反向论点:任何 framework 在协议层中立化后,**差异化必须从协议层移到 server/skill 层**——这对 LangChain / CrewAI 等 framework 厂商是新挑战,对 Agent 开发者是新的"卷"维度。

**对 PM 的具体启示**:
- **不要把"我们支持 MCP"包装成核心卖点** —— 这已经是基础设施级特性,到 2026-Q4 应已默认。
- **差异化要在 MCP server 质量 / 数据接入 / 行业模板上做** —— 而不是在"我们提供 MCP 支持"上做。
- **承认中国大厂的私有协议是真实事实** —— 在销售给国内大厂客户时,不要把"必须支持 MCP" 当成默认,要问"你们内部协议是什么、是否要做双协议适配"。

## 四、对开发与产品决策的具体影响

### 1. 还在自建工具协议层的产品要不要切

不应继续维护私有"工具描述格式"——直接迁 MCP。证据：(1) 任何不支持 MCP 的工具未来 12 个月里会被市场标记为"封闭"；(2) 用户已经在主 harness（Claude Code、Cursor）里习惯 MCP 配置流，要求他们额外配你的格式是巨大摩擦；(3) 你自家工程师在新写 server 时，写 MCP 比写自家协议慢不了 20%，但带来生态。

### Failure scenario (R4 新增):MCP 在私有部署场景反 ROI

> **反例**:上面"直接迁 MCP" 在 **私有部署场景(金融 / 医疗 / 政府)** 不成立。

**为什么 MCP 在私有部署场景反 ROI**:
- **MCP server 的安全审计成本**:用现成 MCP server 必须做供应链信任审计 —— 检查代码、扫描依赖、审查权限。一个高质量的合规审计成本约 5-10 万人民币 / server,而典型企业内部需要 20-50 个 server。
- **MCP server 的供应链攻击风险**:2025-Q3 已多起 MCP server 供应链攻击事件(伪装成"流行的 GitHub MCP server" 实际窃取 token)—— 金融 / 医疗 / 政府环境对这种风险零容忍。
- **私有协议反而合规**:在私有部署中,用自家协议(完全可控)比用 MCP(需要审计每个 server)的合规成本低 5-10 倍。
- **典型案例**:某国有银行 2025 年评估 MCP 落地,**最终选择自建协议层 + 完全内部 server**,理由是"MCP 的开放性在私有部署中是负担而非价值"。

**对 PM 的具体启示**:
- **私有部署项目报价时,不要把"我们用 MCP"包装成卖点** —— 对合规要求高的客户,这反而是减分项。
- **在 to B 销售对话中,主动问"是公开部署还是私有部署"** —— 答案不同,MCP 推荐度完全反向。
- **如果是私有部署 + 高合规要求,正确推荐是"自建协议 + 完全内部 server,可选用 MCP 作为对外接口"** —— 不是"必须用 MCP"。

### 2. 生态站队问题

- **模型层**：仍是 Anthropic / OpenAI / Google / DeepSeek 的多极结构。
- **协议层**：MCP 已统一，A2A 在统一进程中。
- 这意味着 PM 不必"押注模型厂商"——做协议层的产品比做模型层贴牌的产品命运更可控。

### 3. 与 [m208 - AI 基础设施与中间件选型](/kb/工程化与落地架构/m208-ai-基础设施与中间件选型/) 的合流

m208 谈选型时主要在比 framework；G5 之后，更关键的是问"该 framework 是否一等公民支持 MCP/A2A"。LangGraph、CrewAI、AutoGen v0.4、字节 DeerFlow 已全部支持；不支持的框架视为遗留。

## 与已有节点的关系

- **对 [c10 - Agent 技术栈与工具调用](/kb/基础知识库/c10-agent-技术栈与工具调用/) 的扩展**：c10 写"MCP 已是事实标准"；本节点解释为什么会成事实标准（LSP 路径复刻）。
- **对 [m206 - Agent 产品化：记忆机制与技术进展](/kb/工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/) 的展开**：m206 提到 A2A 是 Google 2025 协议；本节点深入协议要素。
- **对 [A06 Orchestrator 编排器](/kb/专题-安全对齐与失败/a06-orchestrator-编排器/) 的协议补**：orchestrator 提供运行时，协议提供互操作；二者共同支撑 G5 时代生态。
- **对 [Function Calling](/kb/基础知识库/function-calling/) 的边界澄清**：新读者最常混淆的两件事。

## PM 决策启示

- **面试问答模板**：
  > **Q**："为什么 MCP 能起来而别的工具协议不行？"
  > **A**：（30 秒标准答）"MCP 是 LSP 的精准复刻——不绑定模型厂商、客户端先采用、服务器自发涌现。任何把 MCP 类比为 REST 或 GraphQL 的人都没看懂——LLM 工具调用的语义最像 IDE 自动补全，不像数据查询，所以协议设计要克制不要灵活。"
  > （加分项）"OpenAI 在 2025 年底投降接受 MCP，这是协议层中立化已成定局的最强信号。PM 现在不必押注模型厂商，做协议层产品更稳。"

  > **Q**："MCP 和 Function Calling 有什么区别？"
  > **A**："不是替代关系——Function Calling 是模型 API 层（OpenAI 2023-06），解决'模型怎么说要调工具'；MCP 是工程协议层（Anthropic 2024-11），解决'工具怎么被发现、注册、调用'。MCP 内部仍然用 function calling 让模型表达调用意图。"

- **产品定位三问**：(1) 你的产品在 MCP/A2A 协议图中处于哪一格（工具？agent？编排？观察）？(2) 你提供的价值在协议标准之外还是之内？(3) 协议进一步成熟会扩展你的市场还是吃掉你的市场？

- **复现选型**：今天写任何 agent demo 都应优先用 MCP 接工具，而非手写 function 注册——投入产出在两周内就能看到（参 [R02 中型生产·LangGraph + MCP](/kb/专题-安全对齐与失败/r02-中型生产-langgraph-+-mcp/)）。

- **避免误用**：不要把"我们支持 MCP"包装成核心卖点——这是基础设施级特性，到 2026-Q4 应已默认。差异化要在 MCP server / 数据接入 / 行业模板上做。

## 关联节点

**核心关联（必读）**：
- [A02 抽象层级辨析·Harness Framework Agent Skill Orchestrator](/kb/专题-安全对齐与失败/a02-抽象层级辨析-harness-framework-agent-skill-orchestrator/)——协议在抽象层中的位置
- [A06 Orchestrator 编排器](/kb/专题-安全对齐与失败/a06-orchestrator-编排器/)——协议是 orchestrator 必备的互操作底座
- [Function Calling](/kb/基础知识库/function-calling/)——协议层 vs 模型 API 层的核心辨析
- [c10 - Agent 技术栈与工具调用](/kb/基础知识库/c10-agent-技术栈与工具调用/)——MCP 事实标准的初次说明
- [R02 中型生产·LangGraph + MCP](/kb/专题-安全对齐与失败/r02-中型生产-langgraph-+-mcp/)——MCP 真实复现

**延伸关联（可选）**：
- [A07 Multi-Agent Teams](/kb/专题-安全对齐与失败/a07-multi-agent-teams/)、[m206 - Agent 产品化：记忆机制与技术进展](/kb/工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/)、[m208 - AI 基础设施与中间件选型](/kb/工程化与落地架构/m208-ai-基础设施与中间件选型/)
- [Claude Code](/kb/ai-公司与产品/claude-code/)、[Anthropic](/kb/ai-公司与产品/anthropic/)、[OpenAI](/kb/ai-公司与产品/openai/)、[Gemini](/kb/ai-公司与产品/gemini/)

---

## 修订日志

- **R4 → R5（2026-05-18)**:本轮聚焦出版就绪——B 类压缩(LSP 类比的政治经济学边界段偏长,Week 2 读者难消化)。修订要点:
  1. § 一末尾"LSP 类比的政治经济学边界" 段压缩 49%(~1380 字 → ~700 字),保留三条差异(协议主推方商业利益结构 / 协议范畴天花板 / OpenAI 投降真实原因)+ 修正"精准复刻"为"协议设计哲学复刻但政治经济学结构不同"+ 面试回答(15 秒版)
  2. 砍除大量并列列表展开和反 confirmation bias 元话语
  3. 保留所有反方对话点(Anthropic 推 MCP 同时卖 Claude 的双重身份 / 5-10 年长期风险 / 5-10 年后可能"semantic MCP" / Sam Altman 2026 复盘印证 OpenAI 中央平台路线失败)
- **R3 → R4（2026-05-18）**：本轮聚焦反方对话训练 + LSP 类比边界承担 + Failure scenario。修订要点:
  1. § 一新增"LSP 类比的政治经济学边界" —— 反 confirmation bias 修订:不再说"MCP 是 LSP 精准复刻",显式承担三个差异(协议主推方商业利益结构 / LSP 失败侧 / OpenAI 接受 MCP 的真实原因)
  2. § 一加 Rick 在面试遇到"MCP 主推方 = API 提供方,这不就是协议层的厂商锁定吗"的标准回答 —— 显式承担风险但论证当下选择的合理性
  3. § 三新增 § 3.1 "反 hype 立场:协议化叙事的 narrative shaping" —— 引入 LeCun 关于"开源协议主推方仍掌握话语权"的批评;承认 Anthropic+Google 联合塑造反 OpenAI 叙事;承认中国大厂内部仍推私有协议
  4. § 四新增 Failure scenario "MCP 在私有部署场景反 ROI" —— 金融 / 医疗 / 政府场景,自建协议反而合规
  5. 引入的对手立场:OpenAI 接受 MCP 的被动妥协事实、LeCun 关于"开源协议主推方话语权"的批评、Sam Altman 2026 复盘"Agent 比预期慢"暗含的协议化战略部分代替产品化、中国大厂内部协议事实、LSP 失败的语义查询瓶颈
- **R2 → R3（2026-05-18）**：聚焦判断密度提升。本轮修订要点：
  1. 全文重写 § 一，把"MCP 是 LSP 路径复刻"作为反共识首句和主轴
  2. § 一新增"LSP 成功三要素"对照 + "GraphQL 失败两原因"反向教训——回应 Round 2 [失血-3]
  3. § 一明确反驳"MCP = REST / GraphQL"的常见误解
  4. § 一新增"Anthropic 选 JSON-RPC 而不是 GraphQL 的原因"——具体到"LLM 工具调用最像 IDE 自动补全"
  5. 删除 § 三末尾的 Yochai Benkler 装饰性引用——回应 Round 2 [装饰-3]，没解释怎么用就删
  6. PM 决策启示加入两个 Q+A 面试模板（"为什么 MCP 能起来" + "MCP vs Function Calling"）
  7. 关联节点分两档
- **R1 → R2（2026-05-18）**：MCP server 数量"4500+"改为"数千个量级"；A2A 50+ 厂商联署时间从"2026-Q1"修正为"2025-04-09 首发即 50+"，补充 2026-04 已达 150+。

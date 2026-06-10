---
title: A02 抽象层级辨析·Harness Framework Agent Skill Orchestrator
cluster: Agent 系统化专题
created: '2026-05-18'
updated: '2026-05-18'
---

# A02 抽象层级辨析·Harness Framework Agent Skill Orchestrator

一句话定义：Harness、Framework、Agent、Skill、Orchestrator 是 AI 工程社区被混用最严重的五个词；它们其实分属六层抽象（模型 / harness / framework / orchestrator / agent / skill），每一层关心的问题、可替换性、生命周期、用户都不同。把它们排到正确的层位上，才能听懂别人到底在说哪一层。

## 一、为什么这件事值得做

在 AI 圈的会议、博客和招聘 JD 里，下面四种用法常常并存：

- "我们用 LangChain 框架搭了个 Agent"——把 framework 和 agent 混为产品形态。
- "Claude Code 是个 Agent"——把 harness 当 agent。
- "Cursor 集成了 Agent 模式"——把 orchestrator 行为当 agent。
- "我们的 Skill 系统就是个微型 Agent"——把 skill 当 agent。

任意两种用法叠在一起的对话往往谈不下去——因为说话双方不在同一层。Rick 在与工程师/客户/同行交流时，需要一张层级表，把每个词钉到该在的位置；否则讨论会一直在"我们说的不是一回事"上空转。

## 二、推荐分层（自底向上六层）

```
┌─────────────────────────────────────────┐
│ 6. Skill         procedural knowledge     │  ← 给 agent 的"操作手册"
├─────────────────────────────────────────┤
│ 5. Agent         端到端任务执行单元         │  ← 用户看到的"那个东西"
├─────────────────────────────────────────┤
│ 4. Orchestrator  多步/多 agent 编排运行时   │  ← 决定调用顺序
├─────────────────────────────────────────┤
│ 3. Framework     开发抽象库                │  ← 提供组件
├─────────────────────────────────────────┤
│ 2. Harness       运行时基座               │  ← 提供 loop + tools + 入口
├─────────────────────────────────────────┤
│ 1. Model         基础模型                 │  ← 推理能力来源
└─────────────────────────────────────────┘
```

| 层 | 名称 | 关心 | 谁定义它 | 可替换性 | 代表产品 |
| --- | --- | --- | --- | --- | --- |
| 1 | Model | 推理能力、上下文长度、定价 | 模型实验室 | 跨层替换不影响其他层 | Claude Opus 4.7、GPT-5、Gemini 3、DeepSeek V4 |
| 2 | Harness | loop、prompts、tools、入口形态 | 工程团队 | 同一模型可装入多个 harness | [Claude Code](/kb/ai-公司与产品/claude-code/)、Cursor、Codex、ChatGPT Desktop、Manus 客户端 |
| 3 | Framework | 组件抽象（Chain、Tool、Memory） | 开源社区 | 同一 harness 可调多个 framework | LangChain、LlamaIndex、Haystack、DSPy |
| 4 | Orchestrator | 状态机、控制流、checkpoint、retry | 一般是 framework 的子集或独立项目 | 同一项目可换 orchestrator | LangGraph、Temporal、Restate、CrewAI Flow、AutoGen Core、字节 DeerFlow |
| 5 | Agent | 角色、目标、工具集、记忆 | 产品/PM 定义 | 同一 orchestrator 可跑多个 agent | Devin、Cursor Composer、Manus 任务实例、CrewAI agent |
| 6 | Skill | 特定任务类型的操作手册 | 任何人（包括用户） | 同一 agent 可加载多个 skill | Anthropic Skill（SKILL.md）、Cursor .cursorrules、Copilot instructions |

## 三、五个用例对照（最常被混淆的那些）

### Claude Code 是 harness，不是 agent

[Harness 词义辨析](/kb/agent-系统化专题/harness-词义辨析/) 已经解释过：Claude Code 提供 prompt 模板、tool loop、文件系统接口、命令解析——这是 harness 的全部要素。当我们说"Claude Code 在帮我重构代码"，运行的是「Claude Opus 模型 + Claude Code harness + 用户写的指令」这一组合，而不是某个固定 agent 在执行。每一次会话其实是 harness 临时实例化一个执行环境。

如果非要找到"agent"在哪一层：Claude Code 的每个 session 可以被看作一个临时 agent；但作为产品概念，Claude Code 本身是 harness。

### LangChain 是 framework，不是 orchestrator

LangChain 早期就被它自己的设计者批评为"两个东西混在一起"——它既提供组件（Chain、Tool、Memory，属 framework 层），又提供执行顺序（默认 AgentExecutor 的 ReAct loop，属 orchestrator 层）。这种混合让 LangChain 在复杂场景下难以调试。LangChain 团队的回应是把"运行时"剥离出来另起 LangGraph——LangGraph 就是 orchestrator 层的 LangChain 续作。

所以：今天写新项目，**LangChain 用于拿组件、LangGraph 用于跑流程**。两者分层，不混用。

### LangGraph 是 orchestrator

它的核心抽象是 State + Node + Edge 的图，加 checkpointer。这是典型 orchestrator 提供的"状态机 + 持久化"。LangGraph 自身不规定 agent 长什么样——它只规定"agent 之间/agent 内部步骤之间"如何流转。把 LangGraph 叫 framework 不严重错（它在 LangChain 生态内），但叫 agent 就错位了。

### Cursor Composer 是 agent

Composer 是用户面对的一个"东西"——你跟它说"帮我把这个组件拆成两个"，它会读文件、写文件、运行测试、回报结果。这是 agent 的全部特征。底层它运行在 Cursor 这个 harness 里，调度可能依赖 Cursor 自家的 orchestrator，调用的工具通过 MCP 协议，而 PM 给它的指令可以以 skill 的形式持久化（.cursorrules）。Composer 是这五层的合成结果——但它本身就是 agent 层。

### Anthropic Skill 是 skill

[Skill 系统的本质](/kb/ai-协作方法论/skill-系统的本质/) 已写明：SKILL.md 是 procedural knowledge 的文档化，由 harness 在合适的上下文动态加载。它不是 agent（没有 loop、没有目标），不是 orchestrator（不管控制流），不是 framework（不提供组件 API）。它属于 skill 层——一种可被 agent 在执行时调用的「操作模式」。

## 四、可替换矩阵（哪些层可以独立换）

| 你想换的 | 替换它需要重写下面这些层吗？ |
| --- | --- |
| 换 model（Opus → GPT-5） | 不需要——harness 通常做了 model 适配 |
| 换 harness（Claude Code → Cursor） | 需要重写工作流（不同 harness 入口/键位/skill 体系不同） |
| 换 framework（LangChain → LlamaIndex） | 需要重写代码，但 harness/model 不需动 |
| 换 orchestrator（LangGraph → Temporal） | 需要重写流程定义，agent 行为不变 |
| 换 agent（Devin → Cursor Composer） | 需要重写工作流和 prompt |
| 换 skill | 几乎零成本——这正是 skill 层存在的意义 |

这张表的政治经济学含义：**越下层越难替换，越上层越易替换**。如果一家公司的技术深度只在 skill 层，它的护城河接近零；如果它的技术深度在 harness/orchestrator 层，护城河深得多。这也是为什么 Anthropic、Cursor、Cognition 等"原生 agent 公司"愿意自己写 harness 而非套用 LangChain。

## 五、跨域呼应：阿伦特"行动"与维特根斯坦"语言游戏"

### 阿伦特：agent 之所以是"agent"，因为它位于「行动」位置

阿伦特在《人的境况》（*The Human Condition*, 1958）把人类活动分为劳动（labor）、工作（work / 制作）、行动（action）三类：

- **劳动**：维持生命的循环性活动，结果消逝。
- **工作 / 制作**：制造可持久的器物，有明确目的与手段。
- **行动**：在多人之间发生的、自由的、不可预测的活动。

把这套区分挪到我们这张五层抽象表：

- Model 是「劳动」——持续不断地生成 token，结果一次性消费。
- Framework、Harness、Orchestrator 是「制作」——稳定可重用的器物，目的明确（提供组件、运行时）。
- **Agent 是「行动」位置**——它的真正特征是"在与环境/用户/其他 agent 的相遇中产生不可完全预知的结果"。

这一解读不是装饰。它解释了为什么"Agent"这个词比 framework 或 orchestrator 难定义——因为"行动"本质上拒绝被工具化清单完全说清。Anthropic 在 *Building Effective Agents* 中那句"agent 是 LLM 自己决定路径"的定义，恰好落在阿伦特的"行动"位置上。

### 维特根斯坦：每层抽象都是一个语言游戏

维特根斯坦《哲学研究》（1953）的核心：词的意义不是固定的，而是在使用中由游戏规则给出。每个学派、每个团队、每个产品社区有自己关于"agent"的语言游戏。LangChain 社区里说 agent 指 AgentExecutor 子类；Anthropic 社区里 agent 指满足四要件的系统；HuggingFace transformers.agents 里又有自己的 agent 类。

意识到这一点意味着：**不存在跨社区通用的「正确定义」**。当你在 GitHub issue、技术博客、产品文档里看到 agent 一词，要先识别"这是谁的语言游戏"，再判断它在我们的六层表中落在哪里。本节点的层次表不是"唯一真理"，而是一张「翻译模板」——在它的帮助下，你能把别人的术语回译到自己的层次表。

### Brian Cantwell Smith《On the Origin of Objects》对六层表的根本性挑战(R4)

> Brian Cantwell Smith(MIT/多伦多,《On the Origin of Objects》1996 + 《The Promise of AI》2019)是当代 AI 哲学最重要的对手之一。Smith 的核心命题:**LLM 无法真正"指称"现实对象,只在文本空间内做语义匹配**。当 LLM 说 `get_weather('Beijing')` ,它不"知道"Beijing 是地球上一个城市,只知道这个 token 在训练数据中与 weather/China/capital 高频共现。这意味着本节点的**六层抽象表是工程便利,不是认识论真理**——任何一层都可能是"我们以为有、实际是 token-space 投影"。

**对 PM 决策的实际意义**:多数 PM 场景(信息处理 / 流程自动化),工程便利够用——LLM 不需要"真正知道"什么是 Agent,只要 token 空间内表现稳定。但**在 narrow 边界场景**(robotics / 自动驾驶 / 物联网 / 需要物理因果推理),token-space 表现 ≠ 真正理解,会出现"看起来对但实际错"——这正是 LeCun "LLM 没有 world model"(详见 [G01 Agent 代际谱系总图](/kb/agent-系统化专题/g01-agent-代际谱系总图/) § 5.1)的实证。**本节点六层表在 LLM-based Agent 范围内有效,在物理世界 Agent 范围内有局限**。

**Rick 的回应立场**:接受 Smith 的元判断(六层是工程便利);坚持实用价值(PM 决策不需要解决哲学问题)。面试遇到"LLM 是否真正理解 Agent"时:"我接受 Smith 的认识论挑战——LLM 在 token 空间内表现像 Agent ≠ 真正是 Agent。但 PM 决策可以悬置这个哲学问题,只在工程意义上让 Agent 稳定可控。Smith 的挑战在 robotics / 物理因果推理是真实问题,在企业 PM 任务可以悬置。"

## 六、与已有节点的关系

- **对 [Harness 词义辨析](/kb/agent-系统化专题/harness-词义辨析/) 的扩展**：Harness 笔记只讲 harness 一层，本节点把它放进六层全景里看。
- **对 [Skill 系统的本质](/kb/ai-协作方法论/skill-系统的本质/) 的扩展**：原节点强调 Skill 与 harness 的对偶；本节点把这种对偶推广到所有层之间的层级关系。
- **对 [m208 - AI 基础设施与中间件选型](/kb/ai-工程化与落地架构/m208-ai-基础设施与中间件选型/) 的概念前置**：m208 直接进入"选哪个框架"，本节点提供选型前必须做的"分层定位"。读 m208 之前先看本节点，可避免把不同层的产品错放在同一比较表里。
- **对 [A01 Agent 概念史与语义流变](/kb/agent-系统化专题/a01-agent-概念史与语义流变/) 的工程补完**：A01 解释"agent 这个词怎么演化到今天"，A02 解释"今天这个词所在的工程语境长什么样"。两者互补。
- **对 [A06 Orchestrator 编排器](/kb/agent-系统化专题/a06-orchestrator-编排器/) 的索引**：A06 深入 orchestrator 内部，本节点给出它在外部的层位。

## 七、PM 决策启示

- **沟通三步**：与任何 AI 工程师/同行/客户讨论前，先做三步——(1) 我们在说哪一层？(2) 是同一个层吗？(3) 如果不是，怎么对齐？这三步在会议里只需 30 秒，能省下后续半小时的鸡同鸭讲。
- **面试问答**：被问"LangChain 是 framework 还是 agent 平台"——答"两者都不准确——它最初是 framework（组件库），后来 LangGraph 才是 orchestrator，agent 是用户基于这两者搭出来的产物"。这种答法显示你看到了层级，比"它是个 framework"信息量大得多。
- **产品定位**：作为 AI PM，你的产品在六层表中处于哪一层，决定了三件事：(1) 客户是谁——上层用户更广但价格敏感，下层用户少但付费意愿强；(2) 护城河——越下层越深；(3) 谁是你的友商——同层才是真友商，跨层是协作关系而非竞争关系。
- **选型决策表**（PM 速查）：
  - 自建 harness：除非你是 Anthropic/Cursor 级别公司，**不要**自建。
  - 选 framework：默认 LangChain（生态广）或 DSPy（编译式、对成本敏感场景）。
  - 选 orchestrator：LangGraph（生态融合）、Temporal（持久化与跨日运行）、CrewAI（multi-agent 快搭）。
  - 写 agent：用 framework + orchestrator 拼，避免锁定。
  - 加 skill：把领域知识沉到 skill 层而非 prompt 里，可热更新。
- **避免误判**：不要把"我们做了一个 agent"当作产品差异化——agent 在 2026 年已经不是稀缺品；真正的差异化在 harness（用户入口体验）、orchestrator（生产级稳定性）、skill（行业知识沉淀）这三层。

## 关联节点

**核心关联（必读）**：
- [A01 Agent 概念史与语义流变](/kb/agent-系统化专题/a01-agent-概念史与语义流变/)——A01 与本节点是同一现象的"概念史 vs 工程史"两面
- [A06 Orchestrator 编排器](/kb/agent-系统化专题/a06-orchestrator-编排器/)——A06 深入第 4 层，本节点给它的外部层位
- [Harness 词义辨析](/kb/agent-系统化专题/harness-词义辨析/)——第 2 层的初始定义文档
- [Skill 系统的本质](/kb/ai-协作方法论/skill-系统的本质/)——第 6 层的初始定义文档
- [m208 - AI 基础设施与中间件选型](/kb/ai-工程化与落地架构/m208-ai-基础设施与中间件选型/)——本节点是 m208 选型前必做的"分层定位"

**延伸关联（可选）**：
- [A07 Multi-Agent Teams](/kb/agent-系统化专题/a07-multi-agent-teams/)、[A08 MCP 与 A2A 协议族](/kb/agent-系统化专题/a08-mcp-与-a2a-协议族/)、[S03 Harness Engineering 全景](/kb/agent-系统化专题/s03-harness-engineering-全景/)
- [c10 - Agent 技术栈与工具调用](/kb/ai-基础知识库/c10-agent-技术栈与工具调用/)、[Claude Code](/kb/ai-公司与产品/claude-code/)、[Claude](/kb/ai-公司与产品/claude/)、[Anthropic](/kb/ai-公司与产品/anthropic/)、范式

---

## 修订日志

- **R4 → R5（2026-05-18)**:本轮聚焦出版就绪——B 类压缩(Smith 段过密)。修订要点:
  1. § 五"Brian Cantwell Smith《On the Origin of Objects》对本节点的根本性挑战" 段压缩 41%(~870 字 → ~510 字),保留核心命题 + PM 决策意义 + 面试回答 + 边界承担,砍 Smith 个人生平/学派详细信息和 Rick 回应立场的展开
  2. 保留所有反方对话点(LLM 不能"指称"现实对象 / token-space 投影 / robotics narrow 场景的真实问题 / LeCun 立场)
- **R3 → R4（2026-05-18）**：本轮聚焦反方对话训练 + 引入 Rick 未读对手框架。修订要点:
  1. § 五新增 "Brian Cantwell Smith《On the Origin of Objects》对本节点的根本性挑战" —— 引入 Rick 未读对手框架,承认本节点六层抽象表是工程便利、不是认识论真理;承认在 narrow 边界场景(robotics / 物理因果推理)有局限
  2. 给出 Rick 在面试遇到"你怎么看 LLM 是否真正理解 Agent"的标准回答 —— 接受 Smith 的认识论挑战但坚持工程便利的实用价值
  3. 引入的对手框架:Brian Cantwell Smith《On the Origin of Objects》(Rick 未读)、LeCun "LLM 没有 world model" 立场 (业界主流反方)
- **R2 → R3（2026-05-18）**：聚焦判断密度提升。A02 本轮微调（已是 7/10）：
  1. 关联节点分两档
  2. 跨域呼应（阿伦特 + 维特根斯坦）经 Round 2 第四节复评判为"有解释力非装饰"——保留
- **R1 → R2（2026-05-18）**：Round 1 同行评议未针对本节点提出具体修订项，无修订动作。

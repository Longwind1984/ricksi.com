---
title: S03 Harness Engineering 全景
cluster: 专题 · 安全对齐与失败
created: '2026-05-18'
updated: '2026-06-12'
provenance: ai
facet: Agent
---

# S03 Harness Engineering 全景

一句话定义：Harness Engineering 不是新发明，而是给"Prompt Engineering / Context Engineering 之外的所有 agent 工程实践"起的总称——它命名了一个范式，让原本散落在各家产品里的隐性工程经验被显式化、可对照、可教学。

## 1. 词源回顾：为什么需要给"已有实践"命名

完整词源辨析见 [Harness 词义辨析](/kb/专题-安全对齐与失败/harness-词义辨析/)。这里只补本节点关心的部分。

- **harness 在软件传统里**：早期叫 "test harness"——包在被测对象外面、提供输入输出、采集行为的代码脚手架。这是 90 年代以来的成熟用法。
- **harness 在 LLM 评测里**：EleutherAI 的 `lm-evaluation-harness` 把 harness 用在"跑评测"——同一个 harness 对接不同模型，输出可对比的分数。
- **harness 在 agent 时代被升级**:2024-2026 年间,"harness"作为术语从评测脚手架(test harness、`lm-evaluation-harness`)滑变为 agent 运行时通称。可追溯的早期推动包括:(a) Anthropic 在《Building Effective Agents》(2024-12-19)中明确区分 workflow 与 agent、讨论 agent harness 的工程职责;(b) Cubox 收录的 TRAE 团队"咸鱼"《万字干货:理解 Harness Engineering》(2026-04-14)在中文圈普及该术语;(c) Cursor / Claude Code / Manus 等产品博客的共同使用。这是一个**渐次形成的共识术语**,没有单一"命名者"。
- **承继关系**:

```
Prompt Engineering(2022-2023)
    ↓ 把"模型外的所有相关信息"也工程化
Context Engineering(2024)
    ↓ 把"模型外的所有运行机制"也工程化
Harness Engineering(2026)
```

**Harness Engineering 不是发明新东西,而是给已有实践命名**——这本身是范式形成的标志(参见 范式 关于"命名 = 共识"的讨论)。一旦一个工程实践有了名字,它就从"某些团队的私房秘籍"变成了"行业可对照的标准动作"。这就是这一术语成型过程的真实价值——不是讲了新道理,而是降低了讨论成本。

> 跨域呼应：这与 [Polanyi 默会知识与提示工程的认识论张力](/kb/基础知识库/polanyi-默会知识与提示工程的认识论张力/) 同源。Polanyi 区分"显性知识"和"默会知识"。当一个领域开始命名自己的实践，意味着大量默会知识正在被显性化。但 Polanyi 同时警告：**任何显性化都是有损压缩**——harness 这个词命中了一部分实践，但永远漏掉一部分（后面 § 3.5 的悖论会展开）。

---

## 2. Harness 全景图

下面这张图是 Harness 在产品堆栈中的位置：

```
┌────────────────────────────────────────────┐
│                  用户                       │
└──────────────────┬─────────────────────────┘
                   │ 自然语言 / 文件 / 截图
┌──────────────────▼─────────────────────────┐
│        skills / plugins / .cursorrules     │  ← 应用层
│   （procedural knowledge 的可加载模块）     │
└──────────────────┬─────────────────────────┘
                   │ skill 注册 + 触发
┌──────────────────▼─────────────────────────┐
│                Harness                     │  ← 运行时层
│   ┌──────────────────────────────────────┐ │
│   │ 提示模板 │ 工具注册 │ 记忆调度        │ │
│   ├──────────────────────────────────────┤ │
│   │ Loop / 状态机 / 重规划                │ │
│   ├──────────────────────────────────────┤ │
│   │ Error Recovery / HITL / 沙盒          │ │
│   ├──────────────────────────────────────┤ │
│   │ Observability（trace / cost / audit） │ │
│   └──────────────────────────────────────┘ │
└──────────────────┬─────────────────────────┘
                   │ 结构化 prompt + 工具 schema
┌──────────────────▼─────────────────────────┐
│             模型 API Gateway                │
│  （Anthropic / OpenAI / Gemini / DeepSeek） │
└────────────────────────────────────────────┘
```

**与 [S01 Agent 六层架构剖面](/kb/专题-安全对齐与失败/s01-agent-六层架构剖面/) 的对应关系**：
- harness 在 S01 中**主要对应执行层**，并承担工具层调度、记忆层调度、感知层组装的协调职责。
- harness **不等于六层全体**——感知层底层的多模态编码在模型端、规划层的"想"在 LLM 计算核心里、长期记忆的物理存储在向量库/图库里。harness 是把这些"分布在各处的能力"串成一条可控管线的"智能胶水"。

**与 skill 的关系**详见 [Skill 系统的本质](/kb/ai-协作方法论/skill-系统的本质/)：skill 是 harness 内的可加载组件，提供领域知识 / 工作流模板。.cursorrules、Copilot instruction、Claude Code skills、Anthropic Skills 都是同一抽象层的不同实现。

---

## 3. Harness 的六个核心能力

下面这六项是 PM 评估 / 对比任意 harness（Claude Code、Cursor、Cline、aider、Codex）时**必须逐项打分**的维度。下面每项都包含：能力描述、典型实现、PM 评估问题。

### 3.1 Prompt 模板与角色配置

**描述**：定义 system prompt、persona、行为约束、输出格式。这一层决定模型"以什么身份回应"。

**典型实现**：
- Claude Code：内置一套针对 Anthropic 模型深度调优的 system prompt（公开材料能看出其哲学：低废话、高密度、明确边界）
- Cursor：模板更倾向 IDE 助理 persona，支持用户 .cursorrules 覆盖
- aider：相对简洁，主要让用户通过模式（如 chat/edit）切换

**PM 评估问题 + Rick 立场**：
1. 用户可以多大程度修改 system prompt？
   **Rick 立场**：用户应该最多能改 system prompt 中的 persona 段（语气、专业领域偏好），但**不能改 safety guardrails 段**（不能让用户解除安全约束）。这是 Claude Code 的做法；Cursor 用 .cursorrules 走得更宽（允许覆盖几乎全部），在企业级我推荐 Claude Code 的做法——因为 Cursor 路线把"提示注入攻击的责任"转嫁给用户。
2. prompt 是否随模型版本变化？
   **Rick 立场**：必须版本化绑定（prompt v1.x 只跑模型 v1.y）。任何不做版本绑定的 harness 在模型升级时都会导致行为漂移。这是企业级 SLA 的隐藏地雷。
3. 是否允许 enterprise 客户做"prompt 注入限制"（如禁止某些指令）？
   **Rick 立场**：to B 必须支持。to C 可以妥协。这是 Anthropic Console / Cursor for Teams 的卖点之一。

### 3.2 工具注册与调用调度

**描述**：把"可调用的能力"注册到 harness 内，让 LLM 知道它能做什么，并把 LLM 的"我想调 X"翻译为对真实系统的执行。

**典型实现**：
- 原生 [Function Calling](/kb/基础知识库/function-calling/)（Anthropic / OpenAI / Gemini 都已支持）
- MCP server 挂载（[A08 MCP 与 A2A 协议族](/kb/专题-安全对齐与失败/a08-mcp-与-a2a-协议族/)）
- IDE 内置工具（编辑文件、运行命令、git 操作——Claude Code / Cursor / aider 各有自己的内置集）
- 自定义脚本（Claude Code 的 hook、Cursor 的 .cursorrules）

**PM 评估问题 + Rick 立场**：
1. MCP 支持的版本与完整度？（如 resources / sampling 是否都支持，还是只支持 tools）
   **Rick 立场**：到 2026-Q4，只支持 tools 的 MCP 客户端应被视为不合格——resources 是企业级必备（文件/数据库行注入）。仅支持 tools 的产品在企业销售时会被技术买家立刻刷掉。
2. 工具描述由谁维护？
   **Rick 立场**：工具描述应该由 server 维护（MCP 内置 schema），harness 只做 client。任何让 harness 维护工具描述的设计都是过时的（pre-MCP 心态）。
3. 工具数量上限？
   **Rick 立场**：单次会话挂 ≤ 20 个工具——超过 20 就要分组激活（按任务上下文动态加载），否则 system prompt 的工具描述就会吃掉超过 30% 的 token 预算（参 [S01 Agent 六层架构剖面](/kb/专题-安全对齐与失败/s01-agent-六层架构剖面/) § 9 耦合点 3）。

### 3.3 上下文窗口管理

**描述**：在有限 token 窗口内，决定哪些信息保留 / 压缩 / 路由。详细策略详见 [m206 - Agent 产品化：记忆机制与技术进展](/kb/工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/) 短期记忆四策略。

**典型实现**：
- 滑动窗口（保留最近 N 轮）
- 摘要压缩（LLM 把历史压缩成摘要）
- 选择性保留（始终保留工具调用结果，丢弃聊天）
- 上下文路由（不同子任务路由到不同 sub-context，Claude Code 的 sub-agent / Cursor 的 Composer agent）

**PM 评估问题 + Rick 立场**：
1. 长任务（> 100 步）的上下文策略？
   **Rick 立场**：必须有"原始 user goal 永不丢失"的硬约束（pin 在 prompt 开头）+ "工具调用结果保留最近 N 个，旧的摘要化"+ "聊天上下文可丢"。任何按时间均匀丢弃的策略都是错的。
2. 用户能否手动 pin？
   **Rick 立场**：必须允许。Claude Code 的 `/clear` 反选机制（保留某些段）是好设计；Cursor 的"不可 pin" 是早期限制，未来必改。
3. 压缩失败提示？
   **Rick 立场**：必须主动提示，否则用户会以为是模型变笨。这是产品信任度的隐性杀手。

### 3.4 错误恢复与重试策略

**描述**：失败是常态——网络超时、工具返回异常、LLM 生成不符合 schema、用户中断。harness 必须有系统化的处理。

**典型实现**：
- 重试策略：指数退避、按错误类型分类（5xx 重试、4xx 不重试）
- 降级路径：MCP server 不可达时回退到本地工具、Computer Use 失败时回退到 API
- Checkpoint / Resume：长任务 crash 后从断点恢复（生产级 harness 必须有；研究级 demo 通常没有）

**PM 评估问题 + Rick 立场**：
1. 重试次数上限是配置项还是硬编码？
   **Rick 立场**：必须是配置项，且默认值 ≤ 3。任何硬编码 ≥ 5 的产品都是"以为重试是免费的"——重试是经济决策不是技术决策（参 [S01 Agent 六层架构剖面](/kb/专题-安全对齐与失败/s01-agent-六层架构剖面/) § 9 耦合点 1）。
2. 错误信息对 LLM 可读？
   **Rick 立场**：必须 LLM 可读，且应该结构化（错误码 + 简短自然语言 + 建议下一步）。任何只给 stack trace 的工具描述都是给人写的，不是给 agent 写的——agent 拿到 stack trace 95% 概率选择重试同样动作。
3. Resume 体验？
   **Rick 立场**：刷新页面任务还在 = 必须有 = 企业级 SLA。这是 LangGraph checkpointer 与传统 LLM 应用最大的差异，也是 Temporal/Restate 真正能卖钱的核心特性。

### 3.5 HITL（人在回路）断点

**描述**：决定哪些动作需要人工确认、确认 UI 怎么设计、确认信号怎么影响 agent 后续行为。详见 [m207 - Agent 产品化：场景推演与失败模式](/kb/工程化与落地架构/m207-agent-产品化-场景推演与失败模式/) HITL 三维度判断。

**典型实现**：
- Claude Code：每次工具调用前的确认弹窗（可以配置 always-allow 白名单）
- Cursor：Composer 的 diff 视图——AI 生成的代码先以 diff 形式呈现
- aider：默认每次编辑都需要 user confirm
- Manus / Devin：长任务过程中可中断、可对话改方向

**PM 评估问题 + Rick 立场**：
1. HITL 粒度？
   **Rick 立场**：必须支持"按工具类型 + 按风险等级 + 按用户配置"三层叠加。Claude Code 的工具白名单 + 自动确认配置是好实践。任何只支持"全确认或全不确认"二元的产品都过于粗糙。
2. always-allow 后仍记录审计日志？
   **Rick 立场**：必须。审计日志和 HITL 弹窗是两件事——前者是责任记录，后者是用户参与。混淆这两者是企业级合规的低级错误。
3. 长任务过程中能否打断并改方向？
   **Rick 立场**：必须支持。任何只能 cancel 重来的产品在 30+ 步任务上不可用——用户不会愿意为一次"想改方向"重跑 30 步、再付一次 token。

### 3.6 Observability（trace / cost）

**描述**：把 agent 内部决策 / 工具调用 / token 消耗暴露给开发者、用户、审计方。详见 [m208 - AI 基础设施与中间件选型](/kb/工程化与落地架构/m208-ai-基础设施与中间件选型/) § 2.5.3。

**典型实现**：
- LangSmith / Helicone / Langfuse / Phoenix（通用 LLM observability）
- Claude Code 的 `/cost` 命令、Cursor 的用量面板
- 企业级：自建 trace 管线接入 ELK / DataDog

**PM 评估问题 + Rick 立场**：
1. trace 是否结构化（OpenTelemetry 兼容）？
   **Rick 立场**：必须 OpenTelemetry 兼容——任何自家 trace 格式都是企业销售时的额外谈判成本。LangSmith 早期非兼容是其规模化的隐性瓶颈，2025 年后整改。
2. cost 计费粒度？
   **Rick 立场**：必须支持 sub-task 粒度。只支持 session 级 = 无法定位成本爆炸来源；step 级太细 = UI 噪声。sub-task 是黄金粒度。
3. trace 数据保留多久？谁有权访问？
   **Rick 立场**：to B 默认 30 天 + 可配置；to C 默认 7 天。访问权限必须 RBAC 化——任何"开发者全可见"的设计在 GDPR / CCPA 下都是违规。

---

## 4. 流派对照：五家 harness 的设计哲学

只比 feature list 是错的——同一 feature 在不同 harness 里承载的设计哲学完全不同。下面给五家主流 coding harness 的"哲学差异"，详细产品对比见 [E01 Coding Agent·Claude Code & Cursor](/kb/专题-安全对齐与失败/e01-coding-agent-claude-code-cursor/)。

| harness | 哲学一句话 | 重心 | 不擅长 |
|---|---|---|---|
| **[Claude Code](/kb/ai-公司与产品/claude-code/)** (Anthropic) | "harness 应该尽可能透明，把决策权交给用户" | HITL 断点 + skill 系统 + 终端体验 | 重 GUI 的 IDE 场景 |
| **Cursor** (Anysphere) | "harness 应该最大化 IDE 内的生产力" | Composer 多文件编辑 + 上下文自动注入 + diff 体验 | terminal-first 的工作流 |
| **Cline** | "harness 应该开源 + 用户自带模型" | VS Code 插件 + 模型解耦 + plan/act 模式 | 没有原生 IDE 体验 |
| **aider** | "harness 应该极简 + git native" | 每次编辑产生 git commit + 代码 diff 优先 | 大型多文件 refactor |
| **Codex** (OpenAI) | "harness 应该是 model-first 的薄壳" | 与 GPT-5 系列深度耦合 + cloud-first | 离线 / 私有部署 |

**哲学维度的差异在哪**：
- **Claude Code vs Cursor**：terminal-first vs IDE-first。这不只是 UI 偏好，是对"开发者工作流应该围绕什么组织"的两种判断——Claude Code 假设开发者已经习惯 shell，Cursor 假设开发者活在编辑器里。
- **Cline vs Claude Code**：开源 + BYOM（自带模型）vs 闭源 + 厂商绑定。这是"工具中立性"vs"模型/harness 深度协同"的张力。
- **aider vs Codex**：极简 git-native vs 厚重 cloud-first。这是"小工具组合"vs"大平台一体化"的传统 Unix vs IDE 之争在 AI 时代的延续。

### 4.1 反 confirmation bias:Cursor 用户基数上的市场事实(R4)

本节点早期反复举 Claude Code 为 harness 标杆——但**市场广度上 Cursor 的用户基数明显高于 Claude Code**(MAU 估算 Cursor 数百万,Claude Code 数十万,双方未公开具体数据;订阅营收 / 融资规模显示量级差异)。这是用户用脚投票的事实,早期判断忽略了。

**三个结构性原因**:Cursor 入门门槛低(Fork 的 VS Code,5 分钟上手) / 目标用户群大 5-10 倍(全栈 / 前端 / 数据分析比重型任务 / SRE / 平台工程多) / "延伸的手"路线转化漏斗更短(Tab 补全的接受率是几十次/分钟,任务完成率是几次/小时)。

**修正后的判断**:Claude Code 是**重型任务场景**的标杆,Cursor 是**日常编码场景**的标杆;两者用户群不同,不应该用同一标准评价。Cursor 的"延伸的手"路线在用户数量上的优势 / Claude Code 的"协作者"路线在用户深度上的优势,**都是结构性的**——不是设计孰优孰劣,是各自对接不同市场。

**对 PM 的启示**:**不要用单一指标评价 harness 产品**——Cursor 用户多但单用户价值低,Claude Code 用户少但 ARPU / 留存深度高,两者都是合法商业模式。面试遇到"你最欣赏的 AI 产品"时,**不要单推任一方,要说"两者代表两条合法路径,我具体欣赏 [Claude Code permission mode / Cursor inline diff 等] 这一具体设计,不是产品本身。"**

**与 [S02 流派架构对照表](/kb/专题-安全对齐与失败/s02-流派架构对照表/) 的关系**：S02 比较的是"算法范式"（ReAct / Reflexion / LATS / ...），这里比较的是"运行时哲学"。同一范式在不同 harness 里的实际表现差异巨大——Claude Code 和 Cursor 内部都用 Plan-and-Execute + ReAct，但表现差异完全由 harness 决定。

---

## 5. Harness 的悖论

### 5.1 harness 越精致，越绑死特定模型

[Claude Code](/kb/ai-公司与产品/claude-code/) 的 system prompt 高度针对 Anthropic 模型族（Claude Opus / Sonnet / Haiku）调优——同一份 prompt 喂给 GPT-5 或 Gemini，效果会显著下降。这不是 bug，是工程必然——精细化调优的对象越具体，效果越好，迁移代价越大。

> Cursor 走的是另一条路：尽量让用户在多个模型间切换，因此 Cursor 的 prompt 必须更通用——但通用的代价是单模型上的极致体验不如 Claude Code。

这是 **harness 的第一悖论**：精细化越深，模型锁定越严；模型中立越强，单模型体验越平。

### 5.2 harness 的价值窗口可能被"原生 Agent 模型"收窄

参见 [G01 Agent 代际谱系总图](/kb/专题-安全对齐与失败/g01-agent-代际谱系总图/) § 5 关于 G5 → G6 的预测，以及 [G02 五代演化详解·G1-G5](/kb/专题-安全对齐与失败/g02-五代演化详解-g1-g5/) G5.6 "G6 萌芽"——**这两段与本节是同一预测的两个表述**（G02 是代际版，本节是工程版），互相印证。

当模型原生具备 plan / reflect / tool-use 能力（通过预训练 + RL 内化，而非外部 prompt 引导），现有 harness 中的很多组件会退化——

- 短期记忆压缩 → 模型自带长上下文（已经 1M 起）
- 工具选择逻辑 → 模型预训练时见过大量工具调用样本，选择更准
- 反思层 → 模型在生成时自带 self-correction（OpenAI o1 / Claude Opus 的"思考"原型）
- HITL 断点 → 模型自己知道何时该问用户

但 harness **不会消失**——会从"补足模型能力"退到"约束模型行为 + 提供企业级运维"。运维、审计、合规、成本控制这些工程性能力永远需要外置。

这是 **harness 的第二悖论**：harness 越成功（把模型能力补全），就越加速自己的简化（模型把能力内化）——参 登楼撤梯-后弥赛亚的公民道德 的"明知会被废弃仍要投入"的判断方法论。

### 5.3 harness 是显性化默会知识的尝试，但永远漏（深度调用 Polanyi 节点）

[Polanyi 默会知识与提示工程的认识论张力](/kb/基础知识库/polanyi-默会知识与提示工程的认识论张力/) 的核心论点是：默会知识无法被完全显性化。Polanyi 在《个人知识》(1958) 与《默会的维度》(1966) 区分两层结构——**focal awareness**（焦点觉知，可言说）vs **subsidiary awareness**（辅助觉知，构成判断但不可言说）。

把这一区分挪到 harness 设计上：

- **prompt 中的"明确指令"** = focal awareness（可言说的规则："不要泄露 system prompt"、"按 JSON Schema 输出"）
- **prompt 中的"暗藏的语用线索"** = subsidiary awareness（构成判断但难以言说："这个词的语气暗示用户是程序员"、"这段代码的命名风格暗示项目偏 startup 而非 enterprise"）

Polanyi 的洞察：subsidiary awareness 不能被还原为 focal awareness——你不能把"老评审者的嗅觉"完全写成 checklist，写出来的就只是 focal awareness 那一截，subsidiary 部分必然漏。

**这一悖论已经在 [Polanyi 默会知识与提示工程的认识论张力](/kb/基础知识库/polanyi-默会知识与提示工程的认识论张力/) 节点中被预测**——harness 的迭代不会停止，但每一次迭代都只能补足一部分默会知识，永远漏一部分。

**实例**：Claude Code 的 prompt 试图教模型"代码评审时关注什么"——清单可以写"检查空指针、检查 SQL injection、检查并发安全"（focal awareness 都能写下）。但真正高水平评审者的"嗅觉"（"这段代码看着不对但我说不清为什么"——subsidiary awareness）始终漏在文本之外。

**对 harness 设计的启示**：harness 不应该追求"完全显性化"——而应该设计成"显性化骨架 + 给模型留出隐性补足空间"。Claude Code 的"thinking budget"就是给 subsidiary awareness 留的空间（模型自由思考的部分），而不是把所有思考都写进 prompt。这就是 harness 必然持续迭代的结构性原因——不是因为没写好，而是因为永远写不完。

### 5.4 Hubert Dreyfus《What Computers Can't Do》:Polanyi 之外更激进的认识论挑战(R4 新增)

> **R4 引入 Rick 未读对手框架**:Hubert Dreyfus《What Computers Can't Do》(1972) 与《Mind over Machine》(1986) 是 AI 史上最重要的对手著作之一。Dreyfus 是现象学家(Husserl / Heidegger / Merleau-Ponty 传统),他在 1960s 起就反对 AI 的"符号主义"路径,论证:**计算机永远无法获得人类的 know-how**(技能分级理论)。Dreyfus 比 Polanyi 激进得多——Polanyi 说默会知识"难以显性化",Dreyfus 说**计算机系统根本不能获得这种知识,因为它们没有"在世界中的身体存在"**。

**Dreyfus 的"技能分级"理论**(*Mind over Machine*, 1986 与 Stuart Dreyfus 合著):
- **Level 1 新手**:遵守明确规则。
- **Level 2 高级初学者**:在情境中识别规则的例外。
- **Level 3 胜任者**:有意识地选择策略。
- **Level 4 精通者**:直觉判断主导,但偶尔有意识规划。
- **Level 5 专家**:完全直觉,无意识中已做决策。

**Dreyfus 对 LLM-based Agent 的根本性挑战**:
- LLM 永远停在 Level 1-2 —— 它能遵守规则 (Level 1) 和识别简单例外 (Level 2),但**无法达到 Level 3+ 的"基于情境的有意识策略选择"**,更无法达到 Level 4-5 的"直觉判断"。
- 原因:Level 3+ 的能力依赖**身体存在(embodiment)** —— 人类的胜任者 / 精通者 / 专家都是通过身体在世界中的反复实践获得能力,LLM 没有身体,只有 token 序列。
- 这与 Brian Cantwell Smith(详见 [A02 抽象层级辨析](/kb/专题-安全对齐与失败/a02-抽象层级辨析-harness-framework-agent-skill-orchestrator/) § 五 R4 新增)的批评同源,但 Dreyfus 更具体——他直接说"AI 系统永远做不到 Level 3+",而 Smith 只说"AI 系统不真正理解 object reference"。

**对本节点 § 6.3 的具体挑战**:
- 本节点 § 6.3 给出 PM 转型者面试时如何展示"我懂 harness 的层级"——四步法(词源 → 全景 → 对照 → 判断)。
- Dreyfus 会说:**这四步法本身是 Level 1-2 能力**(遵守规则 + 识别例外),它能让 Rick 通过面试,但**让 Rick 真正成为 AI PM 的 Level 4-5 专家,需要的不是更多的概念学习,是**亲手做大量项目获得身体性的直觉**——这是 R01-R03 复现指南的真正价值,也是 Polanyi 默会知识在 R01 § 6 节点中已经强调的"通过身体获取知识"。

**Rick 的回应立场**:
- 接受 Dreyfus 的根本性挑战:**本专题 22 个节点能让 Rick 达到 Level 2 (高级初学者) ,但要达到 Level 3+ 必须做项目**。
- 这给本专题的元定位提供了诚实的承担:**本专题不是"成为 AI PM 专家"的完整路径,只是"成为 AI PM Level 2" 的工具书**。从 Level 2 到 Level 3+,需要的是 6-12 个月的真实项目经验,本专题无法替代。
- 在面试遇到"你是 AI PM 专家吗"时,正确回答是:"我接受 Dreyfus 的技能分级理论 —— 我目前在 Level 2(理解概念、能识别简单例外),要达到 Level 3+ 需要做项目获得身体性直觉。本专题给我的是 Level 2 的概念底座,真实项目经验是从 Level 2 跨入 Level 3 的唯一路径。"

**对 harness 设计的启示**:
- 即便 LLM 永远停在 Level 1-2,harness 仍然有价值 —— 让一个 Level 1-2 的系统稳定可靠运行,本身就是巨大的工程成就。
- 但 harness 不能"伪装" Agent 达到 Level 3+ —— 任何包装 Agent 为"专家系统"的销售话术都是骗局。
- 在 to B 销售中,**主动诚实说"我们的 Agent 是 Level 1-2 的工具,需要 Level 3+ 的用户监督"** —— 这比"我们的 Agent 是专家"诚实 10 倍,也更符合 GDPR / 等保 2.0 的自动化决策合规要求。

---

## 6. PM 决策启示

### 6.1 自建产品时：先用现成 harness 还是自研？

| 你的场景特征 | 推荐路径 |
|---|---|
| 早期验证 / PMF 探索 | 用现成（LangGraph / CrewAI / Dify），3 个月内验证想法 |
| 已有 PMF、需要差异化体验 | 在现成 harness 上加自定义 skill / plugin |
| 已有 PMF、性能 / 成本是核心壁垒 | 自研轻量 harness（通常 500-2000 行可覆盖大多数需求，见 m208） |
| toB 企业销售、合规要求高 | 必须自研——审计、权限、私有部署都需要 harness 内置 |
| toC 大规模、单任务成本敏感 | 自研——LangChain 的 2-3 倍延迟在 C 端不可接受（m208 § 2.5.2） |

**决策矩阵的核心问题**：你的差异化是不是出现在 harness 层？如果是——必须自研；如果差异化在 skill 或数据，用现成 harness 更省力。

### 6.2 评估第三方产品时：拆解它的 harness 设计哲学

拿到一个 agent 产品，逐项问：
1. 它的 system prompt 哲学是什么？（看公开材料 / leaks / 用户社区）
2. 它的工具集是封闭的还是允许 MCP 接入？
3. 它的 HITL 默认粒度是怎么样的？
4. 它的 trace 给不给用户看？
5. 它的 prompt 是模型特定还是模型中立？

回答这五个问题，就能写出一份"该产品的 harness 评估报告"——这比 feature list 比较有价值 10 倍。

### 6.3 转型者面试：如何展示"我懂 harness 的层级"

被问"你怎么理解 Claude Code 这种产品"：
1. 先说**词源**——harness 从 test harness 滑动到 agent harness,标志是 Anthropic 系列博客(Building Effective Agents、Claude Code 团队文章)+ TRAE 团队"咸鱼"《万字干货:理解 Harness Engineering》等中文圈推广共同促成,渐次形成共识
2. 再说**全景**——harness = 模型外的运行时层，承载提示模板 / 工具注册 / 记忆调度 / loop / 错误恢复 / HITL / Observability 六项
3. 再说**对照**——Claude Code vs Cursor 的核心差异在 HITL 粒度和 prompt 模型特异性
4. 最后说**判断**——你怎么看 harness 的未来（5.2 悖论：会简化但不会消失）

这套讲法把"概念 + 全景 + 对照 + 判断"打满，比"我会用 Claude Code 写代码"高出多个量级。

### 6.4 一个反 hype 立场

参考 [AI概念滥用反思](/kb/基础知识库/ai概念滥用反思/)。Harness Engineering 这个词被一些自媒体包装成"AI 时代的新银弹"——这是错的。

它的真实价值是**降低讨论成本**——让原本散落在各家产品里的工程实践有了统一的指代词。这一论断的精神,《万字干货:理解 Harness Engineering》原文也表达过同样意思:harness engineering 不是发明新东西,而是把过去散落的实践命名出来(具体措辞以原文为准)。

把这话牢记。面试时被问到 harness，先讲它的"边界"和"非神性"，再讲它的工程价值——比上来就唱赞歌专业得多。

---

## 7. 跨域呼应

### 7.1 与默会知识的认识论张力

[Polanyi 默会知识与提示工程的认识论张力](/kb/基础知识库/polanyi-默会知识与提示工程的认识论张力/)：harness 是把"默会的协作直觉"显性化的尝试——把"老司机怎么用 AI 协作"写成 prompt 模板、工具描述、HITL 规则。但任何文本化都是有损压缩——Polanyi 的"我们知道得比我们能说出的更多"永远成立。这决定了 harness **必然持续迭代**，没有"终极版本"。

### 7.2 与范式扩展

范式：Prompt Engineering → Context Engineering → Harness Engineering 是同一研究纲领（库恩意义）的渐进扩展——研究对象从"提示词文本"扩展到"模型外所有相关信息"再扩展到"模型外所有运行机制"。每次扩展都是同一纲领的**正常科学**进展，不是范式革命。

真正的范式革命会发生在 G5 → G6 的"原生 agent 模型"——届时讨论的对象会从"如何用 prompt + harness 让 LLM 表现得像 agent"变成"如何训练一个原生就是 agent 的模型"。详见 [G01 Agent 代际谱系总图](/kb/专题-安全对齐与失败/g01-agent-代际谱系总图/)。

### 7.3 与生命政治 / 权力分布

生命政治:harness 本质上是对 LLM 的"治理技术"——通过约束、引导、纠正,把 LLM 的"野性"驯化为"可治理的生产力"。harness 词源(挽具/缰绳)的"马与缰绳"隐喻完全可以套上福柯的"规训"框架——不是消灭力量,而是规训力量、让它在指定方向上释放。

这一视角的政治含义：harness 的设计权 = 对 agent 行为边界的设定权 = 对 agent 的治理权。当 Claude Code 决定"哪些工具必须 HITL 确认"，Anthropic 实际上在制定一种新的劳动规训准则——它决定了人类用户在 AI 协作中保留多少决策权、又让渡多少。这不是中立的"功能设计"，是一种隐含的政治选择。

**PM 操作启示**：把 harness 的"治理权"当作可营销的产品特征。

- **Claude Code** 的 permission mode 把治理权交给用户（可见、可改、可审计）——这本身就是 to B 销售的有效卖点（"我们的 AI 治理可见而透明"）。
- **Cursor** 的 inline diff 把治理权藏在 UI 里（用户看 diff 而非看权限配置），卖给个人开发者很好——视觉化的治理感比配置化的治理感更亲和。
- **企业级销售**：Cursor 路线在 to B 时就要补充审计 trail（审计不是 UI，是结构化日志）；Claude Code 路线在 to C 时要补充"傻瓜模式"（permission mode 对新手太重）。

这是 harness 哲学转化为商业话术的具体路径——**治理权的可见度 = 产品的可信度溢价**。

---

## 与已有节点的关系

- **对 [Harness 词义辨析](/kb/专题-安全对齐与失败/harness-词义辨析/)**：辨析是词源切片，本节点是全景剖面。两节点正交、互补。
- **对 [Skill 系统的本质](/kb/ai-协作方法论/skill-系统的本质/)**：skill 是 harness 之上的应用层模块，本节点的图把这个分层显式画出来。
- **对 [c10 - Agent 技术栈与工具调用](/kb/基础知识库/c10-agent-技术栈与工具调用/)**：c10 讲底层技术栈（FC / MCP / 复合错误），本节点讲外围运行时框架——一个是"模型怎么调工具"，一个是"调工具的过程怎么被工程化包裹"。
- **对 [m208 - AI 基础设施与中间件选型](/kb/工程化与落地架构/m208-ai-基础设施与中间件选型/)**：m208 比较了 LangChain / LlamaIndex / LangGraph / CrewAI 等框架，这些都是 harness 的具体实现。本节点提供 harness 这个概念的统一指代和评估维度。
- **对 [S01 Agent 六层架构剖面](/kb/专题-安全对齐与失败/s01-agent-六层架构剖面/)**：S01 把 Agent 拆成六层，harness 主要承载执行层（+ 部分工具/记忆调度）。S03 是 S01 中"执行层"的展开。
- **对 [S02 流派架构对照表](/kb/专题-安全对齐与失败/s02-流派架构对照表/)**：S02 比较算法范式，S03 比较运行时哲学。同一范式在不同 harness 上的表现差异巨大。

## PM 决策启示（精简版）

- **判断 harness 是 hype 还是真有用**：看它降不降低讨论成本——降低了就是真的范式扩展。
- **自建 vs 用现成**：差异化在 harness 层就自建，否则用现成。
- **评估第三方产品**：拆它的 prompt 哲学、工具开放度、HITL 粒度、trace 暴露度、模型耦合度。
- **面试展示理解**：词源 → 全景 → 对照 → 判断（含悖论）。

## 关联节点

**核心关联（必读）**：
- [Harness 词义辨析](/kb/专题-安全对齐与失败/harness-词义辨析/)——词源切片，本节点是全景剖面
- [Skill 系统的本质](/kb/ai-协作方法论/skill-系统的本质/)——skill 是 harness 之上的应用层模块
- [S01 Agent 六层架构剖面](/kb/专题-安全对齐与失败/s01-agent-六层架构剖面/)——执行层 = harness 主战场
- [S02 流派架构对照表](/kb/专题-安全对齐与失败/s02-流派架构对照表/)——S02 比算法范式，本节点比运行时哲学
- [Polanyi 默会知识与提示工程的认识论张力](/kb/基础知识库/polanyi-默会知识与提示工程的认识论张力/)——§ 5.3 深度调用 Polanyi focal vs subsidiary awareness 的认识论根基
- [G02 五代演化详解·G1-G5](/kb/专题-安全对齐与失败/g02-五代演化详解-g1-g5/)——G5.6 与本节点 § 5.2 是同一预测的代际版与工程版
- 登楼撤梯-后弥赛亚的公民道德——§ 5.2 "明知会被废弃仍要投入"的判断方法论

**延伸关联（可选）**：
- 概念卡：[Agent](/kb/基础知识库/agent/)、[Function Calling](/kb/基础知识库/function-calling/)、[RAG](/kb/基础知识库/rag/)、[Tokenization](/kb/基础知识库/tokenization/)、[KV Cache](/kb/基础知识库/kv-cache/)、[Test-Time Compute](/kb/基础知识库/test-time-compute/)、[幻觉](/kb/基础知识库/幻觉/)、[强化学习](/kb/基础知识库/强化学习/)、[RLHF](/kb/基础知识库/rlhf/)
- 章节：[c10 - Agent 技术栈与工具调用](/kb/基础知识库/c10-agent-技术栈与工具调用/)、[c11 - System 2 思维与 Test-Time Compute](/kb/基础知识库/c11-system-2-思维与-test-time-compute/)、[c13 - 幻觉的不可消除性](/kb/基础知识库/c13-幻觉的不可消除性/)、[c14 - 模型评估体系与 Goodhart 陷阱](/kb/基础知识库/c14-模型评估体系与-goodhart-陷阱/)、[m201 - Prompt Engineering 实战体系](/kb/工程化与落地架构/m201-prompt-engineering-实战体系/)、[m202 - 工程选型决策矩阵](/kb/工程化与落地架构/m202-工程选型决策矩阵/)、[m206 - Agent 产品化：记忆机制与技术进展](/kb/工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/)、[m207 - Agent 产品化：场景推演与失败模式](/kb/工程化与落地架构/m207-agent-产品化-场景推演与失败模式/)、[m208 - AI 基础设施与中间件选型](/kb/工程化与落地架构/m208-ai-基础设施与中间件选型/)、[m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/)
- 同专题：[A03 ReAct](/kb/专题-安全对齐与失败/a03-react/)、[A04 Reflexion](/kb/专题-安全对齐与失败/a04-reflexion/)、[A05 Plan-and-Execute](/kb/专题-安全对齐与失败/a05-plan-and-execute/)、[A08 MCP 与 A2A 协议族](/kb/专题-安全对齐与失败/a08-mcp-与-a2a-协议族/)、[E01 Coding Agent·Claude Code & Cursor](/kb/专题-安全对齐与失败/e01-coding-agent-claude-code-cursor/)、[G01 Agent 代际谱系总图](/kb/专题-安全对齐与失败/g01-agent-代际谱系总图/)
- 公司/产品：[Anthropic](/kb/ai-公司与产品/anthropic/)、[OpenAI](/kb/ai-公司与产品/openai/)、[Claude](/kb/ai-公司与产品/claude/)、[Claude Code](/kb/ai-公司与产品/claude-code/)、[Manus](/kb/ai-公司与产品/manus/)、[Gemini](/kb/ai-公司与产品/gemini/)
- 跨域：[AI概念滥用反思](/kb/基础知识库/ai概念滥用反思/)、范式、生命政治、霸权
- 总索引：[AI PM 知识图谱·总索引](/kb/ai-pm-知识图谱/ai-pm-知识图谱-总索引/)

## 修订日志

- 2026-06-11 P3.4 校链：修 3 处死链——§ 6 Dreyfus 段 `A02 抽象层级辨析` 补全为真实节点名；修订日志内简写 `G02`、`登楼撤梯` 分别补全为 `[G02](/kb/专题-安全对齐与失败/g02-五代演化详解-g1-g5/)`、`登楼撤梯`
- **R4 → R5（2026-05-18)**:本轮聚焦出版就绪——压缩 30%(§ 4.1 Cursor 用户量段)。修订要点:
  1. § 4.1 "反 confirmation bias:Cursor 用户量明显高于 Claude Code 的市场事实" 段压缩 34%(~800 字 → ~530 字),"明显高于"修正为"市场广度上 Cursor 的用户基数明显高于 Claude Code"以更稳健
  2. 砍除"为什么 Cursor 用户更多"和"对本节点早期判断的修正" 两段的并列展开,合并为"三个结构性原因 + 修正后的判断" 两条
  3. 保留所有反方对话点(Cursor 入门门槛低 / 用户群大 5-10 倍 / 延伸的手转化漏斗短 / 两条路径都是合法商业模式)
- **R3 → R4（2026-05-18）**：本轮聚焦反方对话训练 + 引入 Rick 未读对手框架 + Cursor 用户量诚实承担。修订要点:
  1. § 4 新增 § 4.1 "Cursor 用户量明显高于 Claude Code 的市场事实" —— 反 confirmation bias 修订:承认本节点早期单推 Claude Code 忽略了 Cursor 路线在用户数量上的结构性优势;不再用单一指标评价 harness 产品
  2. § 5 新增 § 5.4 "Hubert Dreyfus《What Computers Can't Do》" —— 引入 Rick 未读对手框架,论证 LLM 永远停在 Level 1-2 (新手 + 高级初学者),无法达到 Level 3+ (有意识策略选择 / 直觉判断 / 专家),这是 LLM 没有"身体存在" 的根本限制
  3. § 5.4 给本专题元定位提供诚实承担 —— 本专题让 Rick 达到 Level 2,从 Level 2 到 Level 3+ 必须做项目;给 Rick 在面试遇到"你是 AI PM 专家吗"的标准回答
  4. § 5.4 给 harness 设计的启示:在 to B 销售中主动诚实说"我们的 Agent 是 Level 1-2 的工具,需要 Level 3+ 的用户监督"
  5. 引入的对手框架:Hubert Dreyfus《What Computers Can't Do》《Mind over Machine》技能分级理论 (Rick 未读)、Cursor 用户量优势事实 (市场反驳本节点早期 Claude Code 偏向)
- **R2 → R3（2026-05-18）**：聚焦判断密度提升。本轮修订要点：
  1. § 3.1-3.6 每个 "PM 评估问题" 后面跟"Rick 立场"——把开放清单变成"问题 + Rick 答案 + 该答案的依据"三段式——回应 Round 2 [失血-7]
  2. § 5.2 加 [G02 五代演化详解·G1-G5](/kb/专题-安全对齐与失败/g02-五代演化详解-g1-g5/) G5.6 互引 + 登楼撤梯-后弥赛亚的公民道德 双链——回应 Round 2 [对话缺失-5]、[独家机会-5]
  3. § 5.3 深度调用 [Polanyi 默会知识与提示工程的认识论张力](/kb/基础知识库/polanyi-默会知识与提示工程的认识论张力/) 节点已有的 focal awareness vs subsidiary awareness 区分论证——回应 Round 2 [独家机会-3]
  4. § 7.3 生命政治段加"治理权作为可营销特征"的 PM 操作启示（Claude Code vs Cursor）——回应 Round 2 [装饰-7]
  5. 关联节点分两档，核心关联加 [G02](/kb/专题-安全对齐与失败/g02-五代演化详解-g1-g5/)、登楼撤梯
- **R1 → R2（2026-05-18）**：删除 Hashimoto 虚构归因（2 处引文 + 死链）；词源改为"渐次形成的共识术语"。
- 2026-06-12 内审修复：frontmatter 补 final_path 字段（= 本文件在库内实际相对路径）。

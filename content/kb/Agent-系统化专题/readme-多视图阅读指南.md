---
title: README·多视图阅读指南
cluster: Agent 系统化专题
created: '2026-05-18'
updated: '2026-05-18'
---

# README·多视图阅读指南

> **一句话定义**：本指南是 [0411 专题](/kb/agent-系统化专题/_agent-系统化专题-总览/) 22 个节点的**三套读法**——分别对应"转型 PM 求职速通"、"按决策链跳转"、"按紧迫度优先"三种 Rick 在不同时段会切换的身份模式；每一条路径都标注预计时长、前置依赖、产出指标，不允许"很快读完"这类无锚点话术。

---

## 序：为什么需要多视图

转型 PM 不是一种状态，而是**多种状态在不同周轮流出现**。同一份内容，求职前最后一周读和入职第三个月读，需要的切入路径完全不同。强行单线性读完 22 个节点，会出现三种典型失败：

1. **熵增式遗忘**：按目录顺序读完，三天后只记得最后两篇
2. **抽象层错位**：读到 A07 Multi-Agent 时还没建立 A01-A02 的概念辨析底子，看不懂分歧
3. **临场失血**：面试当天才发现 R01 没动过手，"说得清但做不通"

所以本专题不提供"标准读法"，而提供**三套有锚点的读法**，对应 Rick 在 2026-04 至 2026-05 期间已表现出的三种主导身份模式：

| 身份模式 | 触发场景 | 对应路径 |
|---|---|---|
| 求职转型者 | 3 个月内有面试压力，需要建立完整心智模型 | **路径 A**（30 天速通） |
| 工作日常 PM | 在岗或在做项目，按当前决策需要跳读 | **路径 B**（M1→M5 决策链） |
| 碎片学习者 | 通勤、周末、紧迫度不均 | **路径 C**（红橙黄蓝四档） |

三条路径**共用同一个节点池**，可以在不同周切换路径而无须重读。

---

## 路径 A：转型 PM 30 天速通（求职导向）

**适用对象**：3 个月内有 AI PM 面试压力的 Rick；零碎时间能稳定凑出每天 1.5–2 小时
**总预计时长**：**约 45 小时**（含 R01-R03 复现 14 小时）
**前置依赖**：已读过 c10 / m206 / m207 / m208 的目录级摘要（不必精读）
**最终产出**：能通过 AI PM 中级面试的"agent 知识应答能力"+ 一份可演示的 R01 demo

### Week 1：基础认知（约 8 小时）

| 节点 | 预计时长 | 你在做什么 |
|---|---|---|
| [A01 Agent 概念史与语义流变](/kb/agent-系统化专题/a01-agent-概念史与语义流变/) | 1.5 h | 建立"agent 不是一个固定指称"的元认知 |
| [A02 抽象层级辨析·Harness Framework Agent Skill Orchestrator](/kb/agent-系统化专题/a02-抽象层级辨析-harness-framework-agent-skill-orchestrator/) | 1.5 h | 学会问"你说的 agent 在哪一层" |
| [S01 Agent 六层架构剖面](/kb/agent-系统化专题/s01-agent-六层架构剖面/) | 2 h | 拿到一张可重复使用的"剖面图" |
| [G01 Agent 代际谱系总图](/kb/agent-系统化专题/g01-agent-代际谱系总图/) | 1 h | 建立时间纵轴直觉，知道 G1-G5 标志 |
| [_Agent 系统化专题·总览](/kb/agent-系统化专题/_agent-系统化专题-总览/) 重读 | 1 h | 把 Week 1 拼回大图 |
| Buffer | 1 h | 任何一节超时都用这块吸收 |

**Week 1 末应能回答的面试问题**（每题 90 秒口答）：
1. **"Agent 跟 bot / Copilot 有什么区别？"**
   - 答题要点：bot 指对话/规则系统（控制论传统），Copilot 是 IDE 内嵌助手范式，agent 是"基于 LLM 的工具调用 + 状态维护 + 迭代决策"——三者所在抽象层不同。引用 [A01 Agent 概念史与语义流变](/kb/agent-系统化专题/a01-agent-概念史与语义流变/) 的语义漂移线。
2. **"Claude Code 是 agent 吗？"**
   - 答题要点：Claude Code 是 **harness**（agent 运行时容器），它运行的 Sonnet 4.6 + 工具调用闭环才是 agent。区分"harness 这个外壳"和"agent 这个行为模式"。引用 [Harness 词义辨析](/kb/agent-系统化专题/harness-词义辨析/) 与 [A02 抽象层级辨析·Harness Framework Agent Skill Orchestrator](/kb/agent-系统化专题/a02-抽象层级辨析-harness-framework-agent-skill-orchestrator/)。
3. **"你能用一张图画出 agent 的内部结构吗？"**
   - 答题要点：直接画 S01 六层（模型 / 提示 / 工具 / 记忆 / 编排 / 评测），每层给一个代表选型。这一题决定面试官对你"技术深度"的第一印象。

**Week 1 末复现指标**：无（本周不复现，建心智模型为主）。

---

### Week 2：深入范式（约 10 小时）

| 节点 | 预计时长 | 你在做什么 |
|---|---|---|
| [A03 ReAct](/kb/agent-系统化专题/a03-react/) | 1.5 h | 理解 reason + act 的循环结构 |
| [A04 Reflexion](/kb/agent-系统化专题/a04-reflexion/) | 1.5 h | 理解自我反思如何叠加在 ReAct 上 |
| [A05 Plan-and-Execute](/kb/agent-系统化专题/a05-plan-and-execute/) | 1.5 h | 理解为什么"先全规划再执行"在长任务里失败 |
| [A08 MCP 与 A2A 协议族](/kb/agent-系统化专题/a08-mcp-与-a2a-协议族/) | 1.5 h | 理解协议层为什么 2025-26 才出现 |
| [G02 五代演化详解·G1-G5](/kb/agent-系统化专题/g02-五代演化详解-g1-g5/) | 2.5 h | 把范式装进时间纵轴 |
| Buffer | 1.5 h | |

**Week 2 末应能回答的面试问题**：
1. **"主流的 agent 设计范式有哪几种，各自适合什么场景？"**
   - 答题要点：ReAct（短任务、工具密集）/ Reflexion（需要纠错的中等任务）/ Plan-and-Execute（任务可前期分解但要警惕分解失败）/ Workflow（强结构、低自由度）。引用 [A03 ReAct](/kb/agent-系统化专题/a03-react/) / [A04 Reflexion](/kb/agent-系统化专题/a04-reflexion/) / [A05 Plan-and-Execute](/kb/agent-系统化专题/a05-plan-and-execute/)。
2. **"为什么 MCP 在 2025 年才成为事实标准？之前不行吗？"**
   - 答题要点：之前 Function Calling 是 vendor lock-in 的（每家工具描述格式不同），MCP 把工具描述抽离为协议，从"调一家工具"升级为"工具市场"。这是 Habermas 沟通理性意义上的"中立基底"。引用 [A08 MCP 与 A2A 协议族](/kb/agent-系统化专题/a08-mcp-与-a2a-协议族/)。
3. **"如果让你做一个客服 agent，你会选 ReAct 还是 Plan-and-Execute？"**
   - 答题要点：客服任务多为短链 + 工具密集（查订单、改地址），选 ReAct；但如果是售后赔付这类需要多步审批的，混合范式（前置 Plan，每步内嵌 ReAct）。展现你对"范式不是非此即彼"的判断力。

**Week 2 末复现指标**：无（仍以心智模型为主，但开始读 R01 代码框架，约 30 分钟扫读）。

---

### Week 3：产品实例（约 11 小时）

| 节点 | 预计时长 | 你在做什么 |
|---|---|---|
| [E01 Coding Agent·Claude Code & Cursor](/kb/agent-系统化专题/e01-coding-agent-claude-code-cursor/) | 2 h | 剖解两家 Coding Agent |
| [E02 通用 Agent·Manus & Devin](/kb/agent-系统化专题/e02-通用-agent-manus-devin/) | 2 h | 剖解通用 agent 的承诺与瓶颈 |
| [E03 Multi-Agent 框架·AutoGen & CrewAI & DeerFlow](/kb/agent-系统化专题/e03-multi-agent-框架-autogen-crewai-deerflow/) | 2 h | 剖解三种 Multi-Agent 范式 |
| [A06 Orchestrator 编排器](/kb/agent-系统化专题/a06-orchestrator-编排器/) | 1.5 h | 补充编排概念 |
| [A07 Multi-Agent Teams](/kb/agent-系统化专题/a07-multi-agent-teams/) | 1.5 h | 补充协作概念（含韦伯科层制呼应） |
| [S02 流派架构对照表](/kb/agent-系统化专题/s02-流派架构对照表/) | 1 h | 横向对照 6 个框架 |
| [S03 Harness Engineering 全景](/kb/agent-系统化专题/s03-harness-engineering-全景/) | 1 h | 把 harness 升级为系统观 |

**Week 3 末应能回答的面试问题**：
1. **"剖一下 Claude Code 的架构。"**
   - 答题要点：按 S01 六层模板 + S03 harness 视角剖：模型层（Sonnet 4.6 / Opus 4.7 切换）、harness 层（terminal UI + 状态机）、工具层（Bash/Edit/Read 等内置 + MCP 扩展）、记忆层（CLAUDE.md + 会话上下文 + 1M token 窗口）、编排层（单 agent + 可分派子 agent）、评测层（用户反馈 + Anthropic 内部 eval）。引用 [E01 Coding Agent·Claude Code & Cursor](/kb/agent-系统化专题/e01-coding-agent-claude-code-cursor/)。
2. **"Multi-Agent 真的有必要吗？还是单 agent + 工具就够了？"**
   - 答题要点：当前（2026-05）多数场景**单 agent + 良好工具集**够用；Multi-Agent 在"角色分工边界天然清晰"（如开发/测试/PM 模拟）和"长期任务需要外部记忆隔离"时才划算。否则就是韦伯科层制的算法化，引入协调成本远超收益。引用 [A07 Multi-Agent Teams](/kb/agent-系统化专题/a07-multi-agent-teams/) 与 [E03 Multi-Agent 框架·AutoGen & CrewAI & DeerFlow](/kb/agent-系统化专题/e03-multi-agent-框架-autogen-crewai-deerflow/)。
3. **"Manus / Devin 这类通用 agent 的核心瓶颈是什么？"**
   - 答题要点：不是模型能力，是**复合错误数学**（c10 给出 10 步 95% 准确率 → 60% 整体）+ 用户对长任务的耐心衰减 + 任务边界的不可言说性（Polanyi）。引用 [E02 通用 Agent·Manus & Devin](/kb/agent-系统化专题/e02-通用-agent-manus-devin/) 与 [Polanyi 默会知识与提示工程的认识论张力](/kb/ai-基础知识库/polanyi-默会知识与提示工程的认识论张力/)。

**Week 3 末复现指标**：选定 R01 或 R02 之一作为 Week 4 复现目标。

---

### Week 4：实操 + 复现（约 16 小时）

| 节点 | 预计时长 | 你在做什么 |
|---|---|---|
| [R01 最小可运行·100 行 ReAct](/kb/agent-系统化专题/r01-最小可运行-100-行-react/) | 4 h（含跑通 2 h） | 亲手跑通最小 agent |
| [R02 中型生产·LangGraph + MCP](/kb/agent-系统化专题/r02-中型生产-langgraph-+-mcp/) | 6 h（含跑通 4 h） | 跑通一个有状态、有 MCP 工具的中型 agent |
| [R03 Multi-Agent 模板·AutoGen CrewAI](/kb/agent-系统化专题/r03-multi-agent-模板-autogen-crewai/) | 4 h（含跑通 2 h） | 跑通双框架对照模板 |
| Week 4 末复盘（写一篇博客 / 微博） | 2 h | 把"你做过几代 agent"写成可发布的产出 |

**Week 4 末应能回答的面试问题**：
1. **"你自己复现过 agent 吗？最大的坑是什么？"**
   - 答题要点：跑过 R01-R03，最大的坑是 X（你自己填——可能是工具描述格式、状态序列化、token 失控、prompt 漂移）。这一题决定面试官认不认你是"做过的"PM。
2. **"如果让你给团队推荐一个生产级框架，你选哪个？为什么？"**
   - 答题要点：按当前场景（短任务 → LangGraph，多角色 → AutoGen，工业级编排 → 自研 + MCP）。展现 [S02 流派架构对照表](/kb/agent-系统化专题/s02-流派架构对照表/) 的对照能力。
3. **"复现实操过程中，你发现哪些前面读的概念其实理解有偏差？"**
   - 答题要点：高级问题——回答这一题就是"展示你真的反思过自己学习路径"。例如"原以为 ReAct 是循环 4-5 步，实际跑下来发现长任务里循环可达几十步，token 失控才是真问题"。

**Week 4 末复现指标**：1 个可演示的 R01 或 R02 demo（GitHub 链接或本地视频）+ 1 篇 800 字以上的复盘文。

---

### Week 1-4 总览复检表

| 维度 | Week 1 末 | Week 2 末 | Week 3 末 | Week 4 末 |
|---|---|---|---|---|
| 能说清 agent 是什么 | ✅ | ✅ | ✅ | ✅ |
| 能区分 4 种范式 | | ✅ | ✅ | ✅ |
| 能剖具体产品 | | | ✅ | ✅ |
| 能展示亲手做过的 demo | | | | ✅ |
| 累计投入小时 | 8 | 18 | 29 | 45 |

---

## 路径 B：按 M1→M5 决策链跳转

**适用对象**：在岗 PM，按当前项目阶段跳读，不求一次读完
**总预计时长**：**按需取用**（每节点 1–3 小时）
**前置依赖**：先读 [AI PM 知识图谱·总索引](/kb/ai-pm-知识图谱/ai-pm-知识图谱-总索引/) 了解 M1-M5 决策链结构
**最终产出**：每次跳读后能直接服务于当前项目决策

[AI PM 知识图谱·总索引](/kb/ai-pm-知识图谱/ai-pm-知识图谱-总索引/) 把 AI PM 的工作分为五大模块决策链（M1 技术素养 → M2 工程落地 → M3 产品设计 → M4 商业模式 → M5 合规与治理）。本专题节点在五大模块中的分布与跳转锚点：

### M1 技术素养阶段（建立技术心智模型）
**典型问题**："我要给团队解释 agent 是什么"、"我要面试时回答技术问题"
**推荐节点（按推荐顺序）**：
1. [A01 Agent 概念史与语义流变](/kb/agent-系统化专题/a01-agent-概念史与语义流变/) — 1.5 h — 历史纵深
2. [A02 抽象层级辨析·Harness Framework Agent Skill Orchestrator](/kb/agent-系统化专题/a02-抽象层级辨析-harness-framework-agent-skill-orchestrator/) — 1.5 h — 术语精度
3. [S01 Agent 六层架构剖面](/kb/agent-系统化专题/s01-agent-六层架构剖面/) — 2 h — 解剖学骨架
4. [A03 ReAct](/kb/agent-系统化专题/a03-react/) + [A04 Reflexion](/kb/agent-系统化专题/a04-reflexion/) + [A05 Plan-and-Execute](/kb/agent-系统化专题/a05-plan-and-execute/) — 各 1.5 h — 范式基础
5. [G01 Agent 代际谱系总图](/kb/agent-系统化专题/g01-agent-代际谱系总图/) — 1 h — 时间纵轴
**M1 累计**：约 11 小时

### M2 工程落地阶段（选型与中间件）
**典型问题**："我要给团队选一个 agent 框架"、"我要做 Multi-Agent 立项决策"
**推荐节点**：
1. [S02 流派架构对照表](/kb/agent-系统化专题/s02-流派架构对照表/) — 1 h — 横向对照
2. [S03 Harness Engineering 全景](/kb/agent-系统化专题/s03-harness-engineering-全景/) — 1 h — 自建 vs 使用既有 harness 的决策
3. [A06 Orchestrator 编排器](/kb/agent-系统化专题/a06-orchestrator-编排器/) — 1.5 h — 编排选型
4. [A07 Multi-Agent Teams](/kb/agent-系统化专题/a07-multi-agent-teams/) — 1.5 h — Multi-Agent 必要性判断
5. [A08 MCP 与 A2A 协议族](/kb/agent-系统化专题/a08-mcp-与-a2a-协议族/) — 1.5 h — 协议层选型
6. [R01 最小可运行·100 行 ReAct](/kb/agent-系统化专题/r01-最小可运行-100-行-react/) — 4 h — 至少跑通一个最小可运行版本（强烈推荐）
**M2 累计**：约 10.5 小时（含 4 小时复现）

### M3 产品设计阶段（产品与交互）
**典型问题**："我要做一个 agent 产品的 PRD"、"我要分析竞品 agent 产品"
**推荐节点**：
1. [E01 Coding Agent·Claude Code & Cursor](/kb/agent-系统化专题/e01-coding-agent-claude-code-cursor/) — 2 h — Coding 场景剖解
2. [E02 通用 Agent·Manus & Devin](/kb/agent-系统化专题/e02-通用-agent-manus-devin/) — 2 h — 通用 agent 场景剖解
3. [E03 Multi-Agent 框架·AutoGen & CrewAI & DeerFlow](/kb/agent-系统化专题/e03-multi-agent-框架-autogen-crewai-deerflow/) — 2 h — Multi-Agent 产品剖解
4. [m207 - Agent 产品化：场景推演与失败模式](/kb/ai-工程化与落地架构/m207-agent-产品化-场景推演与失败模式/) — 2 h — 失败模式（重读旧节点）
5. [G02 五代演化详解·G1-G5](/kb/agent-系统化专题/g02-五代演化详解-g1-g5/) — 2.5 h — 代差判断（在做"代际迁移"型产品时尤其重要）
**M3 累计**：约 10.5 小时

### M4 商业模式阶段（暂未建专题，本专题 hint）
- [E02 通用 Agent·Manus & Devin](/kb/agent-系统化专题/e02-通用-agent-manus-devin/) 的"商业模式与瓶颈"段落给出了通用 agent 的定价、token 经济、用户耐心衰减等商业层观察
- [S03 Harness Engineering 全景](/kb/agent-系统化专题/s03-harness-engineering-全景/) 的"自建 vs 平台"段落给出了 PMF 与平台依赖性的张力

### M5 合规与治理阶段（暂未建专题，本专题 hint）
- [A07 Multi-Agent Teams](/kb/agent-系统化专题/a07-multi-agent-teams/) 的"韦伯科层制 + 阿伦特行动责任"段落涉及多 agent 决策的责任归属
- [E02 通用 Agent·Manus & Devin](/kb/agent-系统化专题/e02-通用-agent-manus-devin/) 的"福柯生命政治"段落涉及监控与权力分布
- [A04 Reflexion](/kb/agent-系统化专题/a04-reflexion/) 的"自我修正与 Goodhart"段落涉及评测漂移

---

## 路径 C：紧迫度优先（标签视图）

**适用对象**：碎片时间多、整段时间少的状态；或临近某个事件（面试、立项、对外汇报）
**总预计时长**：按档累加
**最终产出**：按档完成后达到对应能力门槛

### 红 🔴 求职必读（6 篇，约 9 小时）
不读这 6 篇直接面试 AI PM 中级岗有非常高失败概率：

| 节点 | 时长 | 跳过的代价 |
|---|---|---|
| [A01 Agent 概念史与语义流变](/kb/agent-系统化专题/a01-agent-概念史与语义流变/) | 1.5 h | 第一题就被滑变 |
| [A02 抽象层级辨析·Harness Framework Agent Skill Orchestrator](/kb/agent-系统化专题/a02-抽象层级辨析-harness-framework-agent-skill-orchestrator/) | 1.5 h | "Claude Code 是 agent 吗"答崩 |
| [G01 Agent 代际谱系总图](/kb/agent-系统化专题/g01-agent-代际谱系总图/) | 1 h | 没有代际感的回答显得"刚入门" |
| [S01 Agent 六层架构剖面](/kb/agent-系统化专题/s01-agent-六层架构剖面/) | 2 h | 没法画剖面图 |
| [E01 Coding Agent·Claude Code & Cursor](/kb/agent-系统化专题/e01-coding-agent-claude-code-cursor/) | 2 h | 剖解题答不上 |
| [E03 Multi-Agent 框架·AutoGen & CrewAI & DeerFlow](/kb/agent-系统化专题/e03-multi-agent-框架-autogen-crewai-deerflow/) | 2 h | Multi-Agent 题答不上 |

**总计：约 10 小时**（可在 5 天内完成，每天 2 小时）

### 橙 🟠 复现优先（5 篇，约 17 小时含上手时间）
不亲手做过 agent 的 PM 与工程师对话会被识破：

| 节点 | 时长（含上手） | 跳过的代价 |
|---|---|---|
| [R01 最小可运行·100 行 ReAct](/kb/agent-系统化专题/r01-最小可运行-100-行-react/) | 4 h | "你写过吗" → "没" |
| [R02 中型生产·LangGraph + MCP](/kb/agent-系统化专题/r02-中型生产-langgraph-+-mcp/) | 6 h | 答不出生产级框架细节 |
| [R03 Multi-Agent 模板·AutoGen CrewAI](/kb/agent-系统化专题/r03-multi-agent-模板-autogen-crewai/) | 4 h | Multi-Agent 仍停留在概念 |
| [S02 流派架构对照表](/kb/agent-系统化专题/s02-流派架构对照表/) | 1 h | 没有选型决策手册 |
| [S03 Harness Engineering 全景](/kb/agent-系统化专题/s03-harness-engineering-全景/) | 1 h | 不理解 Claude Code/Cursor 为什么"看起来很像但选型差异巨大" |

**总计：约 16 小时**（建议留 1-2 周完成）

### 黄 🟡 前沿追踪（3 篇，约 5 小时）
落在 2026 年才被广泛讨论的新东西：

| 节点 | 时长 | 跳过的代价 |
|---|---|---|
| [A08 MCP 与 A2A 协议族](/kb/agent-系统化专题/a08-mcp-与-a2a-协议族/) | 1.5 h | 协议层失语 |
| [G02 五代演化详解·G1-G5](/kb/agent-系统化专题/g02-五代演化详解-g1-g5/) | 2.5 h | 答不出 G5 是什么、Computer Use 是怎么回事 |
| [E02 通用 Agent·Manus & Devin](/kb/agent-系统化专题/e02-通用-agent-manus-devin/) | 1 h（精读 2 h） | 答不出通用 agent 商业模式 |

**总计：约 5 小时**

### 蓝 🔵 延展加分（按需）
深化某个范式的概念卡：[A03 ReAct](/kb/agent-系统化专题/a03-react/)、[A04 Reflexion](/kb/agent-系统化专题/a04-reflexion/)、[A05 Plan-and-Execute](/kb/agent-系统化专题/a05-plan-and-execute/)、[A06 Orchestrator 编排器](/kb/agent-系统化专题/a06-orchestrator-编排器/)、[A07 Multi-Agent Teams](/kb/agent-系统化专题/a07-multi-agent-teams/)（共 5 篇 × 1.5 h ≈ 7.5 小时）

**总计：约 7.5 小时**

### 紧迫度路径总时长汇总

| 档 | 节点数 | 累计时长 | 累计后能力门槛 |
|---|---|---|---|
| 红 🔴 | 6 | 10 h | 中级面试技术题能撑过去 |
| 红+橙 | 11 | 26 h | 中级面试 + 工程对话不夹生 |
| 红+橙+黄 | 14 | 31 h | 中级面试 + 前沿话题能聊 |
| 全档 | 22 | 38.5 h | 完整知识立方 |

---

## 5. 阅读完后的元能力检验（10 个自测问题）

这 10 题不是"考试"，是 Rick 读完后用来**自检**的工具。每题附答题要点（不是标准答案，是评分维度）。

### 5.1 "Agent 跟 bot 有什么区别？"
- **要点**：bot 出自控制论与 IRC 时代（规则系统、对话脚本），agent 出自 LLM 时代（通用模型 + 工具调用 + 状态维护 + 迭代决策）。不是"演化"关系，是"重新发明"。
- **及格线**：能区分两个时代。
- **优秀线**：能引维特根斯坦语言游戏解释"为什么很多人把 agent 当 bot 用是合法的"。
- **反例（错答会怎样）**：如果答"agent 就是更厉害的 bot"——会被立刻识别为"没看过任何文献"。

### 5.2 "Claude Code 是 agent 吗？"
- **要点**：Claude Code 是 **harness**（agent 运行时容器 + 用户接口），它内部运行的"Sonnet 4.6 + 工具调用闭环"才是 agent。
- **及格线**：知道 Claude Code 不是单一 agent。
- **优秀线**：能展开 Cursor / Devin / Manus 各自是什么 harness。
- **反例**：如果答"是的，Claude Code 是 Anthropic 的 agent 产品"——暴露你没有 [A02 抽象层级辨析·Harness Framework Agent Skill Orchestrator](/kb/agent-系统化专题/a02-抽象层级辨析-harness-framework-agent-skill-orchestrator/) 的层级感，面试官会追问"那 Cursor 是什么？你说的 agent 在哪一层？"

### 5.3 "你做过几代 agent？"
- **要点**：按 [G01 Agent 代际谱系总图](/kb/agent-系统化专题/g01-agent-代际谱系总图/) G1-G5 自报。
- **及格线**：知道 G1-G5 的标志。
- **优秀线**：能说出自己处于哪一代以及上下游的瓶颈。
- **反例**：如果答"我做过 agent"——等于没说，面试官会追问"哪一代？" 答不上就是"刚入门"。

### 5.4 "Multi-Agent 真的有必要吗？"
- **要点**：当前大多数场景**单 agent + 良好工具集**够用。Multi-Agent 适合"角色分工天然清晰"+"长任务需记忆隔离"两类。
- **及格线**：能反对"Multi-Agent 必然更强"。
- **优秀线**：能引韦伯科层制 / Habermas 同底模批判的跨域呼应。
- **反例**：如果答"Multi-Agent 是未来趋势，应该尽早布局"——立刻被识别为"没读过 Anthropic *Building Effective Agents*"，面试加分项变扣分项。

### 5.5 "MCP 是什么，为什么 2025-26 才成为事实标准？"
- **要点**：MCP 是 Anthropic 2024 提出的"工具描述协议"，把工具从 vendor lock-in 升级为"工具市场"。
- **及格线**：知道 MCP 解决工具复用。
- **优秀线**：能引"MCP 是 LSP 的精准复刻，不是 REST 或 GraphQL 的对手"（见 [A08 MCP 与 A2A 协议族](/kb/agent-系统化专题/a08-mcp-与-a2a-协议族/) § 一）。
- **反例**：如果答"MCP 类似 REST，但是为 LLM 设计的"——基本判定为"没看懂"，因为 MCP 与 REST 的语义模型截然不同。

### 5.6 "ReAct 和 Plan-and-Execute 在什么时候选哪个？"
- **要点**：短任务 + 工具密集 → ReAct；任务可前期分解但要警惕分解失败 → Plan-and-Execute；实际场景多是混合范式。
- **及格线**：能区分两者。
- **优秀线**：能给出 [A05 Plan-and-Execute](/kb/agent-系统化专题/a05-plan-and-execute/) § PM 启示的四档梯度判定（三都是 / 一否兜底 / 两否回 ReAct / 三否必 ReAct）。
- **反例**：如果答"现在大家都用 ReAct，Plan-and-Execute 过时了"——立刻暴露你没用过 LangGraph 或 DeerFlow，因为它们的核心抽象就是 Plan-and-Execute 的工程化。

### 5.7 "Agent 的复合错误数学告诉我们什么？"
- **要点**：10 步 × 95% ≈ 60%；通用 agent 30-50 步会衰减到 50-60%；加 HITL 封顶 65-75%。
- **及格线**：能算这个数。
- **优秀线**：能反推通用 agent 商业模式瓶颈（70% 是数学约束，不是工程问题，参 [E02 通用 Agent·Manus & Devin](/kb/agent-系统化专题/e02-通用-agent-manus-devin/) § 2.6）。
- **反例**：如果答"模型变强就能解决"——立刻被反诘"单步从 95% 提到 99% 还是不到 90%"。

### 5.8 "为什么 Manus / Devin 这类通用 agent 至今没有 PMF？"
- **要点**：(a) 复合错误数学；(b) Polanyi 默会知识不可言说；(c) 用户耐心衰减；(d) token 经济不可持续。
- **及格线**：能给出 2 条。
- **优秀线**：能给出 4 条并指出"哪条是短期可解 / 哪条是结构性的"。
- **反例**：如果答"是模型能力不够，等 GPT-7 就好"——暴露你没读肖弘复盘也没思考 Polanyi 维度，立刻被识别为"只懂模型不懂产品"。

### 5.9 "Harness Engineering 跟 Prompt Engineering 是什么关系？"
- **要点**：Prompt Engineering 是单轮优化；Harness Engineering 是 agent 运行时整体协同工程；前者是后者的子项。
- **及格线**：能区分两者。
- **优秀线**：能展开 [S03 Harness Engineering 全景](/kb/agent-系统化专题/s03-harness-engineering-全景/) 的六个核心能力 + 三个悖论。
- **反例**：如果答"Harness Engineering 是 AI 时代的新银弹"——暴露你被自媒体话术影响，没意识到 Harness Engineering 的真实价值是"降低讨论成本"（[AI概念滥用反思](/kb/ai-基础知识库/ai概念滥用反思/) 视角）。

### 5.10 "如果让你给一个传统行业落地 agent，第一步做什么？"
- **要点**：第一步**不是选框架**，是 (a) 风险盘点（m207）；(b) 术语对齐（A02）；(c) HITL 边界（m207）；(d) narrow 切入点（E02）。
- **及格线**：能说 narrow 优先于 general。
- **优秀线**：能给出"对齐术语 → 盘点风险 → 定 HITL 边界 → 选 narrow 切入点"四步法。
- **反例**：如果答"先选 LangChain / 先组团队"——暴露你把工程选型当作首要问题，完全忽视了产品设计的前置工作。

---

## 6. 与 Rick 已有的「转型者紧迫度锚点」设计衔接

本指南的路径 A 和路径 C 直接沿用 Rick 在 2026-03-05 React 原型对话中提出的核心思想：

> **"紧迫度作为转型者锚点，而非难度作为静态分类"**

这一思想的含义是：转型者不是按"先简单后复杂"读书，而是按"先紧迫后非紧迫"读书。难度本身不是阻力的主源——**没有锚点**才是。一篇内容如果跟当下要解决的问题挂得上钩，再难也读得进去；挂不上，再简单也读不动。

所以：
- **路径 A 的 4 周节奏**是把"3 个月内有面试压力"这个外部紧迫度切成 4 周内部锚点
- **路径 C 的红橙黄蓝**是把"不同类型的紧迫度"显式标签化，方便 Rick 按当前最紧的那条线先取

这一锚点设计与 [AI PM 知识图谱·总索引](/kb/ai-pm-知识图谱/ai-pm-知识图谱-总索引/) 的整体结构呼应——总索引按 M1-M5 决策链是"工作维度"的锚点，本专题按红橙黄蓝是"紧迫度维度"的锚点。两套锚点**正交**，可叠加使用。

---

## 6.5 反方对话训练:Week 4 必练 + Week 1-2 跳读指引

**Week 1-2 跳读指引(R5 新增,出版就绪关键)**

R4 在多个早期节点接入了对手框架与反方立场——这些段落对 Week 3-4 的 Rick 极有价值,但**对 Week 1-2 的入门读者过早**:还没建立 Agent 工程基础就先看到"Karpathy 说这是过早命名 / Weizenbaum 警告 Agent 拟人化 / Brian Cantwell Smith 说 LLM 不能真正指称对象 / Reflexion 91% 是 cherry-picked"——容易陷入"那我学的是不是错的"困惑,反而拖慢心智模型建立。

**Week 1-2 应主动跳过的段落清单**:

| 节点 § | 跳过段 | 跳到 Week 4 重读 |
|---|---|---|
| [A01 Agent 概念史与语义流变](/kb/agent-系统化专题/a01-agent-概念史与语义流变/) § 8.1 / § 8.2 | Karpathy "Software 3.0 / Agent 过早命名" / Weizenbaum 《Computer Power and Human Reason》 | Week 4 反方训练第 2 题 |
| [A02 抽象层级辨析·Harness Framework Agent Skill Orchestrator](/kb/agent-系统化专题/a02-抽象层级辨析-harness-framework-agent-skill-orchestrator/) § 五末尾 | Brian Cantwell Smith 段(LLM 不能真正"指称"现实对象) | Week 4 反方训练复盘 |
| [A04 Reflexion](/kb/agent-系统化专题/a04-reflexion/) § 一 R4 复现性争议段 | "原 91% 数据在独立复现中只达 83-88%" | Week 4 反方训练第 5 题 |
| [A07 Multi-Agent Teams](/kb/agent-系统化专题/a07-multi-agent-teams/) § 5.1 / § 5.2 | Luhmann 反 Habermas / Stuart Russell IRD | Week 4 反方训练第 4 题 |
| [S03 Harness Engineering 全景](/kb/agent-系统化专题/s03-harness-engineering-全景/) § 5.4 | Dreyfus 技能分级 | Week 4 反方训练复盘 |
| [G01 Agent 代际谱系总图](/kb/agent-系统化专题/g01-agent-代际谱系总图/) § 5.1 / § 5.4 | LeCun / Lakatos 进步性 vs 退化性纲领 | Week 4 反方训练第 1 题 |

**跳读原则**:Week 1-2 先把"基础概念 + 时间纵轴 + 架构剖面"建起来;**Week 3 读 E 模块和 S03 时这些段落已经有 context 可以读懂;Week 4 反方训练前回到这些段落,把它们当成"反方追问的弹药库"**。

按这一指引,Week 1-2 实际时长会从 18 小时压到 14-16 小时——**省下的时间留给 Week 4 反方训练**(原 1.5 小时不够,实际需要 3-4 小时才能把 6 题练到肌肉记忆)。

---

**Week 4 必练:面试反方对话训练(R4)**

R3 critique 第二节指出本专题缺少与业界主流反方立场的真诚对话——R4 已在多个节点引入对手立场回应,但 Rick 在面试场景必须 **亲手训练对话能力**,不只是背诵。

**前置假设**:Week 4 反方训练假设 Rick 已读完 Week 1-3 所有内容(含上面跳过的对手框架段);如果你的实际节奏到 Week 4 时仍未补完跳过的段,**先用 2-3 小时把跳过段补完再开始反方训练**——反方训练不是冷启动训练,是肌肉记忆训练。

**训练目标**:Rick 在面试遇到下列 6 个高频反方追问时,**不依赖临场发挥**,能背出有具体证据的标准回答。

**6 个必练对话**(每题 15 分钟,带答题要点):

| 反方追问 | 答题要点 | 对应节点 |
|---|---|---|
| **"Yann LeCun 说 LLM Agent 是死胡同,你怎么看"** | 接受 + 边界:接受 LLM 不是终极架构,但 2-3 年内是唯一规模化方案;LeCun 主导的 JEPA 至今未产出商业级 Agent 产品 | [G01 Agent 代际谱系总图](/kb/agent-系统化专题/g01-agent-代际谱系总图/) § 5.1 |
| **"Karpathy 说 Agent 是过早命名,你怎么看"** | 同意 + 但坚持当下命名的讨论锚点价值;承认 Agent 这个词可能 5-10 年后被淘汰 | [A01 Agent 概念史与语义流变](/kb/agent-系统化专题/a01-agent-概念史与语义流变/) § 8.1 |
| **"Sam Altman 说 2025 是 Agent of year,但 OpenAI Operator 用户增长远低于 ChatGPT,你怎么解释"** | 引中美两份独立 sober tone:Altman 复盘 + 肖弘 60 分自评,同向指向"用户产品层未兑现";但协议层(MCP)已成基础设施 | [E02 通用 Agent·Manus & Devin](/kb/agent-系统化专题/e02-通用-agent-manus-devin/) § 2.1.1 |
| **"你说 Anthropic 反对 multi-agent,但他们自己做的 research system 就是 multi-agent,你怎么解释"** | 不再简化:Anthropic 立场是"先 augmented LLM > workflow > simple agent > multi-agent" 四档梯度;multi-agent research system 严格限定"深度研究类任务",不应被泛化 | [A07 Multi-Agent Teams](/kb/agent-系统化专题/a07-multi-agent-teams/) § 2.1 |
| **"Reflexion 原论文 91% 是 cherry-picked,你为什么还推荐它"** | 显式承担:91% 数据有复现性争议(独立复现 83-88%),但"反思笔记可审计" 是独立成立的性质;金融 / 医疗 / 法务仍可能选 Reflexion | [A04 Reflexion](/kb/agent-系统化专题/a04-reflexion/) § 一 + § 四 |
| **"MCP 主推方 = API 提供方,这不就是协议层的厂商锁定吗"** | 显式承担:LSP 是微软+红帽推(无 LLM 商业利益),MCP 是 Anthropic 推 + Anthropic 卖 Claude,长期可能演化为"协议层中立 + 客户端层锁定";当下投入是基于"未来 3-5 年 Anthropic 保持协议中立性"的赌注 | [A08 MCP 与 A2A 协议族](/kb/agent-系统化专题/a08-mcp-与-a2a-协议族/) § 一 LSP 类比边界 |

**练习方式**:
1. 找一个朋友 / 同事扮演"反方面试官",每天练 1 题,每题 15 分钟。
2. 把自己的回答录音,事后回听,看哪些地方"卡顿、模糊、跑题"。
3. 第 7 天复盘:把 6 个对话练到"不依赖临场,30 秒内开口,论证有具体证据"。

**为什么这一训练是 R4 新增的关键**:
- R3 critique 第九节"批判性总评"指出本专题最大盲区是"没有训练 Rick 与对手对话的能力" —— 即便接入了对手立场,**Rick 不练习就用不上**。
- 这一训练把本专题的"反方对话能力"从隐性内容(藏在 22 个节点末尾)转译为显性肌肉记忆(可在面试中调用)。
- **本训练完成后 = Rick 已经具备"经得起业界反方拷问的 AI PM" 的对话能力** —— 这是 R3 critique 设定的 R4 验收目标。

---

## 7. 反馈与迭代

**本指南是 v1**。Rick 使用一段时间后，建议在本节追加以下三类标注：

1. **太难的节点**：哪些节点的预计时长明显低估（用了 2 倍以上时间），需要拆得更细或加前置依赖说明
2. **太浅的节点**：哪些节点读完后仍然"应付不了那道面试题"，需要补深度
3. **缺失的节点**：哪些场景下没有合适的节点可读（如"客户问 agent 安全合规怎么办"——M5 模块的 hint 是不够的）

### 7.1 R4 后新增本专题局限的显式承担(R4 新增)

> R3 critique 第八节"专题整体 thesis 反推" 指出:"专题的所有事实,毫无修改地,可以被反方用来写一篇'Agent 是被夸大,不要转型'的反向专题"。这是真实的——专题没有 unique 立场,只有事实组织。R4 后必须显式承担本专题的三个局限。

**局限 1:本专题主要是工程 PM 视角,产品 PM 视角不充分**:
- S01 § 9.4 / § 9.5 已新增产品 PM 视角的三个看走眼(用户心理模型 / 商业模式 / 合规边界),但**没有专门的产品 PM 节点**(用户研究方法、GTM 策略、定价模型、合规框架)。
- 这一缺口需要 **专门的产品 PM 专题**(0412 AI PM 产品策略专题?)弥补,本专题不假装完整覆盖。
- **在面试遇到"你的产品 PM 视角在哪"时,Rick 应诚实说**:"本专题主要训练工程视角和概念辨析,产品视角(用户研究 / GTM / 商业模式 / 合规)我用其他专题补足——这是 AI PM 知识图谱的另一个独立模块"。

**局限 2:本专题让 Rick 达到 Level 2 (高级初学者),从 Level 2 到 Level 3+ 必须做项目**:
- Hubert Dreyfus 技能分级理论(详见 [S03 Harness Engineering 全景](/kb/agent-系统化专题/s03-harness-engineering-全景/) § 5.4 R4 新增)显示:本专题 22 个节点能让 Rick 达到 Level 2,但要达到 Level 3+ (有意识策略选择 / 直觉判断 / 专家)必须做真实项目获得身体性直觉。
- 这一缺口需要 **6-12 个月的真实项目经验** 弥补,本专题无法替代。
- **在面试遇到"你是 AI PM 专家吗"时,Rick 应诚实说**:"我目前在 Level 2(理解概念、能识别简单例外),要达到 Level 3+ 需要做项目获得身体性直觉。本专题是 Level 2 的概念底座,真实项目是从 Level 2 跨入 Level 3 的唯一路径"。

**局限 3:AI PM 转型窗口可能正在关闭**:
- 2026 年 AI PM 市场已经饱和,转型者面临"有 3 年 AI 经验的工程师转 PM" 的竞争 —— Rick 这种"非 AI 背景转型" 已经晚了一拍。
- Sam Altman 2026 年初复盘暗含的另一个 sober 事实:**"Agent 进展比预期慢" 也意味着"Agent PM 市场扩张比预期慢"** —— 转型机会窗口可能在 2027 年开始收窄。
- **在面试遇到"AI PM 转型窗口还在吗"时,Rick 应诚实说**:"窗口仍在,但比 2024 年小;转型者需要拼"垂直行业知识 + AI 工程理解" 的组合,纯转型已经不够。我的策略是在 [Rick 真实行业] 做垂直 AI PM,而非通用 AI PM"。

**这三个局限的显式承担,比假装本专题是 PM 转型的完整路径诚实 10 倍** —— 也是 Round 4 critique 指出的"专题缺少与对手立场的真诚对话" 的最终回应:**承担本专题的局限本身就是与对手立场的真诚对话**。

**验收档案查阅**：本指南连同 22 个节点都经过多轮批判性同行评议，过程档案保存在 worktree 的 `agent-knowledge-validation/` 目录。Rick 可以查阅 `critiques/` 看到批评 Agent 对本指南的具体 issue（如"路径 A 的时长估算是否合理"、"自测题 5.10 答题要点是否完整"），以及 `round-N-revisions/` 看到本指南是怎么被迭代到当前版本的。

这个迭代过程本身是一份元学习材料——它展示了**"用 AI 写 AI 知识，必须经过批判性同行评议才能成为可信知识"**，呼应 [AI概念滥用反思](/kb/ai-基础知识库/ai概念滥用反思/) 的核心主张。

---

## 8. 关联节点（双链密度 ≥ 20）

### 8.1 本专题节点（22 个，本指南索引全部）
- 总览：[_Agent 系统化专题·总览](/kb/agent-系统化专题/_agent-系统化专题-总览/)
- 概念辨析（8 篇）：[A01 Agent 概念史与语义流变](/kb/agent-系统化专题/a01-agent-概念史与语义流变/)、[A02 抽象层级辨析·Harness Framework Agent Skill Orchestrator](/kb/agent-系统化专题/a02-抽象层级辨析-harness-framework-agent-skill-orchestrator/)、[A03 ReAct](/kb/agent-系统化专题/a03-react/)、[A04 Reflexion](/kb/agent-系统化专题/a04-reflexion/)、[A05 Plan-and-Execute](/kb/agent-系统化专题/a05-plan-and-execute/)、[A06 Orchestrator 编排器](/kb/agent-系统化专题/a06-orchestrator-编排器/)、[A07 Multi-Agent Teams](/kb/agent-系统化专题/a07-multi-agent-teams/)、[A08 MCP 与 A2A 协议族](/kb/agent-系统化专题/a08-mcp-与-a2a-协议族/)
- 代际（2 篇）：[G01 Agent 代际谱系总图](/kb/agent-系统化专题/g01-agent-代际谱系总图/)、[G02 五代演化详解·G1-G5](/kb/agent-系统化专题/g02-五代演化详解-g1-g5/)
- 架构（3 篇）：[S01 Agent 六层架构剖面](/kb/agent-系统化专题/s01-agent-六层架构剖面/)、[S02 流派架构对照表](/kb/agent-系统化专题/s02-流派架构对照表/)、[S03 Harness Engineering 全景](/kb/agent-系统化专题/s03-harness-engineering-全景/)
- 实例（3 篇）：[E01 Coding Agent·Claude Code & Cursor](/kb/agent-系统化专题/e01-coding-agent-claude-code-cursor/)、[E02 通用 Agent·Manus & Devin](/kb/agent-系统化专题/e02-通用-agent-manus-devin/)、[E03 Multi-Agent 框架·AutoGen & CrewAI & DeerFlow](/kb/agent-系统化专题/e03-multi-agent-框架-autogen-crewai-deerflow/)
- 复现（3 篇）：[R01 最小可运行·100 行 ReAct](/kb/agent-系统化专题/r01-最小可运行-100-行-react/)、[R02 中型生产·LangGraph + MCP](/kb/agent-系统化专题/r02-中型生产-langgraph-+-mcp/)、[R03 Multi-Agent 模板·AutoGen CrewAI](/kb/agent-系统化专题/r03-multi-agent-模板-autogen-crewai/)

### 8.2 现有节点锚点
- [AI PM 知识图谱·总索引](/kb/ai-pm-知识图谱/ai-pm-知识图谱-总索引/)
- [c10 - Agent 技术栈与工具调用](/kb/ai-基础知识库/c10-agent-技术栈与工具调用/)
- [m206 - Agent 产品化：记忆机制与技术进展](/kb/ai-工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/)
- [m207 - Agent 产品化：场景推演与失败模式](/kb/ai-工程化与落地架构/m207-agent-产品化-场景推演与失败模式/)
- [m208 - AI 基础设施与中间件选型](/kb/ai-工程化与落地架构/m208-ai-基础设施与中间件选型/)
- [Harness 词义辨析](/kb/agent-系统化专题/harness-词义辨析/)
- [Skill 系统的本质](/kb/ai-协作方法论/skill-系统的本质/)
- [AI概念滥用反思](/kb/ai-基础知识库/ai概念滥用反思/)
- [Polanyi 默会知识与提示工程的认识论张力](/kb/ai-基础知识库/polanyi-默会知识与提示工程的认识论张力/)

### 8.3 跨域锚点
- 范式、生命政治、霸权
- 0114认识论、0115道德哲学-伦理学、0117社会学

### 8.4 产品锚点
- [Anthropic](/kb/ai-公司与产品/anthropic/)、[Claude](/kb/ai-公司与产品/claude/)、[Claude Code](/kb/ai-公司与产品/claude-code/)、[Manus](/kb/ai-公司与产品/manus/)

---

## 9. 衍生对话存档

- **设计来源**:2026-03-05 React 原型对话提出的"紧迫度作为转型者锚点";2026-05 Rick 与 Claude 关于"Agent 知识应如何组织"的多轮对话
- **迭代档案**:worktree `agent-knowledge-validation/`,含批评 + 修订全过程
- **配套可视化**:本目录下 `knowledge-graph.html` 是 22 节点 + 锚点的交互式图谱,可在浏览器打开

---

## 修订日志

- **R4 → R5（2026-05-18)**:本轮聚焦出版就绪——A 类必改 4(README Week 4 对 Week 1-2 过早)。修订要点:
  1. § 6.5 重命名为"反方对话训练:Week 4 必练 + Week 1-2 跳读指引",显式给出 Week 1-2 应跳过的对手框架段清单(6 个节点 § / 与 Week 4 反方训练 6 题一一对应)
  2. 明确"跳读原则":Week 1-2 先建基础概念 + 时间纵轴 + 架构剖面;Week 3 读 E / S03 时有 context 可懂;Week 4 反方训练时回到这些段当弹药库
  3. Week 4 反方训练前置假设显式化:假设 Week 1-3 已读完(含跳过段),否则需要 2-3 小时补完才能开始训练——避免冷启动训练失败
  4. Week 1-2 时长从 18 小时压到 14-16 小时(省下的时间给 Week 4 反方训练用,实际需要 3-4 小时不是 1.5 小时)
- **R3 → R4（2026-05-18）**：本轮聚焦反方对话训练 + 本专题局限的显式承担。修订要点：
  1. 新增 § 6.5 "R4 后新增 Week 4 必练:面试反方对话训练" —— 6 个高频反方追问的标准回答(每题 15 分钟练习);把本专题"反方对话能力" 从隐性内容转译为显性肌肉记忆
  2. 新增 § 7.1 "R4 后新增本专题局限的显式承担" —— 三个局限(工程 PM 视角 / Level 2 vs Level 3+ / AI PM 转型窗口收窄);承担本专题局限本身就是与对手立场的真诚对话
  3. 引入的对手立场:LeCun / Karpathy / Altman / Anthropic 自家 multi-agent blog / Reflexion 复现性 / MCP LSP 政治经济学边界(6 个高频追问对应 6 个对手立场)
  4. Dreyfus 技能分级理论的应用(Level 2 vs Level 3+ 的诚实承担)
- **R2 → R3（2026-05-18）**：聚焦判断密度提升。本轮微调（README 已是 7/10）：
  1. § 5 10 个自测题每题加"反例（错答会怎样）"段——把模板化的"展现 X 的综合判断"删除——回应 Round 2 [可压-4]
  2. § 5 自测题语言压缩，删除冗余的"展现 X" 修饰词
- **R1 → R2（2026-05-18）**：`AI 概念滥用反思`（有空格，死链）统一改为 `[AI概念滥用反思](/kb/ai-基础知识库/ai概念滥用反思/)`（无空格，匹配真实文件名）。

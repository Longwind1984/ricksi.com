---
title: R03 Sub-agent Context Isolation 模板
cluster: 专题 · 工程与成本
created: '2026-06-07'
updated: '2026-06-11'
provenance: ai
facet: 上下文工程
---

# R03 Sub-agent Context Isolation 模板

主 agent 的上下文窗口是一条单向腐烂的隧道：每一次工具调用的原始返回——50 行 `ls`、3000 token 的网页 HTML、一整个文件的源码——都会永久挤进 message history，而且再也吐不出来。本节点要解决的问题是：**当一个子任务需要"读很多、产出很少"时，怎样让它的探索垃圾不污染主线程的上下文?** 答案是 sub-agent context isolation——派一个拥有独立 context window 的子 agent 去消化脏活，只把压缩后的结论回传主 agent。这是 LangChain 四操作框架里 **Isolate** 那一档的工程落地（来源：LangChain, "Context Engineering for Agents", 2025-07-02）。本节给方法、给模板、给踩坑清单——但开篇先说清:**隔离不是免费的午餐,它和 Cognition "Don't Build Multi-Agents" 的反方立场是一场尚未终结的工程争论**。

---

## §0 为什么是"隔离"这个框架，而不是"压缩"或"清除"

R03 不是孤立的——它是 0417 信息流四去向决策的第四条出路。一条进来的信息，PM/工程师要决策它去哪：**放 context**（直接塞进窗口）、**外化 memory**（写进 `/memories` 持久化，见 [m206 - Agent 产品化：记忆机制与技术进展](/kb/工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/)）、**走 RAG**（索引后按需检索，见 [c09 - RAG 架构](/kb/基础知识库/c09-rag-架构/)）、还是**让 subagent 先消化回传**（本节点）。

前三条都在"主 agent 自己的一条时间线"上做文章。隔离的独特性在于：它**开了第二条时间线**。压缩（summarization）和清除（observation masking，见本专题 infoflow 节点）是在同一个 context window 内做减法——你压缩的是已经污染过窗口的历史；而隔离是**让污染从一开始就发生在别处**。

用一个具体场景区分三者：主 agent 要回答"这个 50 文件的代码库里，认证逻辑在哪、有没有已知漏洞"。

- **压缩路线**：主 agent 自己 grep、读 12 个文件、累积 80K token，然后触发 summarization 压成 5K——但压缩前那 80K 已经把 KV Cache 撑大、把后续推理拖慢了，且 summarization 本身要多花一次推理（Anthropic `compact_20260112` 在 100 轮搜索评估中减少 84% token，但偶发"摘要阶段误调工具"的缺陷；来源：Anthropic Compaction 文档）。
- **隔离路线**：主 agent 派一个 "code-explorer" 子 agent，子 agent 在自己的窗口里烧掉那 80K，只回传一段 800 token 的结构化结论。**主 agent 的窗口从未见过那 80K**。

这就是隔离对"延迟上下文耗尽时间"的核心贡献，也是它在多步、长程任务中不可替代的原因。但请记住框架边界：**隔离换来的是上下文清洁，代价是跨 agent 通信的语义损耗**——这正是 §判断主轴要拆解的。

---

## §1 隔离的收益：为什么一个干净的主线程值这么多钱

把收益拆成三个可观测维度：

| 维度 | 无隔离（单线程） | 有隔离（子 agent） |
|---|---|---|
| **主线程 token 增速** | 每次工具调用全量累积 | 仅累积压缩后的回传（10–100x 压缩比） |
| **Context Rot 暴露** | 早期 token 随长度衰减（U 形/recency bias） | 主线程长度被压住，远离衰减拐点 |
| **Prompt Cache 命中** | 长 history 前缀稳定时可缓存 | 子 agent 各自缓存其系统提示 |
| **并行度** | 串行 | 多个只读子 agent 可并发 |

Context Rot 是这里的硬约束接地。Chroma 2025-07-14 测试 18 个前沿模型（Claude Opus 4 / Sonnet 4 / GPT-4.1 / Gemini 2.5 Pro / Qwen3-235B 等），**全部在所有输入长度增量上单调性能下降，无一例外**（来源：Chroma, "Context Rot", trychroma.com/research/context-rot, 2025-07-14）。NoLiMa（Adobe/ICML 2025）更狠：GPT-4o 声称 128K，实际有效约 8K（来源：GitHub adobe-research/NoLiMa）。这意味着**"窗口越大越敢往里塞"是错的**——你塞得越多，主 agent 在它最需要清醒判断的那一步越糊涂。隔离的价值不是"省 token 钱"（虽然也省），而是**把主 agent 的决策点保持在它注意力没被稀释的区间内**。

收益边界（failure scenario #1）：当子任务**产出 ≈ 输入**时，隔离无收益甚至有害。Focus Agent 论文发现迭代精炼类任务中主动压缩反增 110% overhead（来源：arXiv 2601.07190）——同理，一个"读 1 份文档、改写成另 1 份文档"的任务,隔离它只是多付一次 agent 启动成本和一次序列化往返,没有压缩红利。**隔离的经济学前提是 fan-in 远小于 fan-out。**

---

## §2 模板：四步落地一个隔离子 agent

下面是一个可直接抄的最小骨架（伪代码，模型无关；Rick 的 Claude Code subagent 体系是其一手实现）。

```text
# 主 agent 侧
1. SCOPE   定义子任务的"输入边界 + 回传 schema"
2. SPAWN   起一个独立 context window 的子 agent，注入 scoped 系统提示
3. EXECUTE 子 agent 在自己窗口内自由探索（脏活全留在这）
4. RETURN  子 agent 按 schema 回传压缩结论；主 agent 只 append 这一段
```

**第一步 SCOPE——回传 schema 是模板的灵魂**。不要让子 agent "自由发挥写个总结"。强制它按结构回传，例如：

```yaml
# code-explorer 子 agent 的回传契约
finding:
  answer: <一句话直接回答主任务的问题>
  evidence:           # 最多 3 条，每条 ≤1 行
    - file: <路径>
      line: <行号>
      note: <为什么相关>
  dead_ends: []       # 探查过但无关的路径（防主 agent 重复派活）
  confidence: high|medium|low
```

`dead_ends` 字段是反踩坑设计：它让主 agent 知道"哪些路子已经走过了",避免下一轮又派一个子 agent 去翻同一个空目录。这呼应 Focus Agent 的"记住'config 文件不在 /src 目录'，而非记住那 50 行 `ls` 输出"（来源：arXiv 2601.07190）。

**第二步 SPAWN——scoped 系统提示要窄**。子 agent 的工具权限、可访问目录、可调用 API 都应是主 agent 的真子集。Claude Code 子 agent 系统是典型实现：专用助手 + 独立隔离上下文窗口 + 受限工具权限（来源：martinuke0.github.io/posts/subagents/）。权限收窄不只是安全考量,更是上下文考量——工具越少,子 agent 的探索分支越收敛,回传越聚焦。

**第三步 EXECUTE——这一步什么都不用做**。模板的精髓恰恰是主 agent 在这一步**完全不可见**子 agent 的内部消息。如果你发现自己想"让主 agent 看一眼子 agent 中间过程",那说明你要的不是隔离,是共享——退回 §判断主轴重新决策。

**第四步 RETURN——只 append 回传体,不 append 过程**。这是隔离与"调用一个返回长文本的工具"的根本区别:工具返回会原样进 history,子 agent 回传只进那段被 schema 约束的结论。

> [!note] 三种隔离粒度（按 fan-out 强度选）
> - **一次性消化**(read-heavy):派子 agent 读完一堆资料回传摘要,用完即弃。最常见。
> - **并行扇出**(map):同时派 N 个子 agent 各查一个子问题,主 agent 做 reduce。⚠️ 见 §判断主轴的"隐式决策冲突"。
> - **常驻专家**(persistent role):一个长期存在的子 agent 反复被主 agent 咨询(如"测试专家"),它维护自己的领域上下文。成本最高。

---

## §3 与 0411 Agent 专题的分工：CE 管信息流，Agent 管分工

本节点必须显式锚定 0411。两个专题的关系是正交互补，不是重叠：

- **0411 Agent = 怎么分工**：[A07 Multi-Agent Teams](/kb/专题-安全对齐与失败/a07-multi-agent-teams/) 讲多 agent 的角色编排、[A06 Orchestrator 编排器](/kb/专题-安全对齐与失败/a06-orchestrator-编排器/) 讲谁调度谁、[R03 Multi-Agent 模板·AutoGen CrewAI](/kb/专题-安全对齐与失败/r03-multi-agent-模板-autogen-crewai/) 给多 agent 框架的代码骨架。它回答的是"系统里有几个 agent、谁负责什么"。
- **0417 CE / 本节点 = 怎么管信息流**：同样是"多个 agent",0417 关心的不是分工拓扑,而是**信息在 agent 之间怎么流动、在哪里被压缩、什么进主线程**。

举个对照:0411 的 [A07 Multi-Agent Teams](/kb/专题-安全对齐与失败/a07-multi-agent-teams/) 会告诉你 "supervisor 派 worker" 这个拓扑;本节点 R03 告诉你 "worker 回传给 supervisor 时,该不该带上 worker 的全部探索 trace"——而这个问题,正是 0411 与 0417 在同一张架构图上吵起来的地方(见下节 Cognition)。**同名注意**:0411 有一个 [R03 Multi-Agent 模板·AutoGen CrewAI](/kb/专题-安全对齐与失败/r03-multi-agent-模板-autogen-crewai/),本节点是 0417 的 R03,两者前缀同序号不同专题,引用时务必写全名消歧。

---

## §4 判断主轴：90% 的人在隔离上会栽的四个坑

这是本节点的命门。每个坑给"症状 → 为什么会错 → 正确做法 → 真实反例"。

### 坑 1：上下文割裂——子 agent 只拿到任务描述，不知道全局意图

- **症状**:子 agent 回传了一个技术上正确、但和主任务跑偏的结果。主 agent 拿到后要么误用,要么得返工。
- **为什么会错**:为了"隔离干净",工程师只给子 agent 一句话任务描述,剥掉了主 agent 此前积累的决策历史。子 agent 因此不知道"为什么要查这个""上一步排除了什么方案"。
- **正确做法**:隔离的是**过程**,不是**意图**。SCOPE 时除了任务,还要注入"主任务目标的一句话 + 已确定的关键约束"。Cognition 的原话:**"Share full agent traces, not just individual messages."**(来源:Cognition, "Don't Build Multi-Agents", cognition.ai/blog/dont-build-multi-agents, 2025)。注意这是"接受+边界":接受意图必须共享,但坚持过程垃圾不必共享——这恰是 Cognition 没说全的一面。
- **真实反例**:Cognition 举例,一个只收到"做个 Flappy Bird 克隆"子任务描述的子 agent,因不知道主 agent 已选定的视觉风格,产出了风格冲突的资产。

### 坑 2:隐式决策冲突——并行子 agent 各自合理,组合起来失败

- **症状**:你派了 2 个并行子 agent,各自的产出单看都对,拼起来却互相矛盾。
- **为什么会错**:并行扇出(map 粒度)下,子 agent 之间零通信,各自做了一个**隐式假设**,而这些假设彼此不兼容。
- **正确做法**:**并行只用于真正无共享决策的只读任务**(如"分别查这 3 个独立的事实")。一旦子任务之间存在隐式设计耦合,退回串行,或让主 agent 先冻结共享决策再扇出。
- **真实反例**:Cognition 的 Super Mario 案例——一个子 agent 建 Mario 风格背景,另一个建视觉不兼容的角色,两个各自合理的决策组合失败(来源:同上)。

### 坑 3:回传无 schema——子 agent 写小作文,主 agent 重新被淹

- **症状**:子 agent 回传了一段 2000 token 的详尽报告。主 agent 的窗口又脏了——隔离白做。
- **为什么会错**:没给回传契约,LLM 默认倾向"详尽以示尽职"。
- **正确做法**:强制 §2 那样的结构化 schema,设回传 token 上限。**隔离的红利完全取决于回传压缩比**;回传不压,等于把脏活从子 agent 搬回主 agent。
- **真实反例**:这是模板缺失而非论文案例,但与 Focus Agent 的核心发现同构——"当前 LLM 在无脚手架情况下不会自然优化上下文效率;被动提示仅节省 6%,必须显式提示'每 10–15 次工具调用压缩一次'"(来源:arXiv 2601.07190)。回传 schema 就是那个不可省的脚手架。

### 坑 4:为隔离而隔离——fan-in≈fan-out 还硬拆

- **症状**:加了子 agent 后,总 token 和延迟不降反升。
- **为什么会错**:误把"多 agent"当成总是更好,忽略了启动成本 + 序列化往返 + 跨 agent 通信损耗。
- **正确做法**:回到 §1 的经济学前提——**只在 fan-in ≪ fan-out 时隔离**。Cognition 的整体结论就是对这个坑的极端表述:当前模型跨 agent 沟通可靠性不足,**很多时候更好的单线程 + 完整上下文保留优于多 agent**(来源:同上)。
- **真实反例**:Focus Agent 的迭代精炼任务,压缩反增 110% overhead(来源:arXiv 2601.07190)——隔离作为压缩的一种,在低 fan-out 任务上同样会反噬。

---

## §5 产品 PM 视角补盲

工程隔离做对了,产品上仍可能看走眼三处:

1. **用户心理模型**:子 agent 隔离对用户**应当是隐形的**。但若你把"主 agent 派了 3 个子 agent"暴露成 UI 进度条,用户会形成"这个产品很慢/很复杂"的认知,即便它实际更快。隔离是后台架构,不是卖点——除非你卖的就是"可观测的 agent 团队"(那是另一种定位)。
2. **成本归因与计费**:子 agent 的 token 消耗算谁的?并行扇出会让单次用户请求的后台调用数翻几倍。若按"每次 agent 调用"计费,隔离会悄悄推高单位成本——PM 必须在定价模型里把"一次用户意图 = N 次 agent 调用"显式化(成本估算见 [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/))。
3. **失败的可解释性**:隔离让 debug 变难。当结果出错,是主 agent 的 reduce 逻辑错了,还是某个子 agent 回传了 low confidence 却被当 high 用?**回传 schema 里的 `confidence` 字段不只是给主 agent 看,更是给事后归因留的审计线索**——这是合规/安全场景(Rick 的 DiDi 安全产品)里隔离架构必须前置设计的可观测性。

---

## §6 对手框架回应：Cognition 的"别建多 agent"是不是判了隔离死刑?

**接受**:Cognition(2025)的反方立场必须被严肃对待,而不是当背景板。他们的两条原则——上下文割裂、隐式决策冲突——直指隔离的真实软肋,且其结论("当前模型跨 agent 沟通可靠性不足")有工程实证支撑,不是空谈。在**有共享设计决策的生成任务**(写代码、做设计)上,我接受他们的判断:单线程 + 完整上下文常常优于隔离。

**边界(我赌的是什么)**:Cognition 把"多 agent 不可靠"过度泛化了。他们的反例全部是**有强隐式耦合的生成任务**(Flappy Bird、Super Mario)。但隔离的甜区从来不是这类任务,而是**只读、高 fan-out、低耦合的消化任务**——"读 50 个文件找认证逻辑""并行核实 3 个独立事实"。在这类任务上,子 agent 之间根本没有需要协调的隐式决策,坑 2 不成立;而 Context Rot(Chroma 18 模型无一幸免)对单线程的伤害是确定的。所以我的赌注是:**隔离 vs 单线程不是普适对错,而是按"任务耦合度 × fan-out 比"分区的工程选择**。Cognition 守住了高耦合区,我守住的是低耦合高扇出区。

这场争论**尚未终结**(confirmation-bias 砍除):本专题早期倾向把隔离当成"长程任务的银弹",这是 bias——补入 Cognition 与 Focus Agent 的反例后,隔离被降级为"四去向之一,有明确适用边界的工具"。实践者社区(Vellum、Collabnix)认为隔离的软肋可用上下文工程(scoped prompts + 消息传递规则)补;Cognition 认为根因是模型可靠性,工程补丁治标不治本——**双方都还没拿出能说服对方的横向 benchmark**。

> [!note] 跨域呼应:维特根斯坦的"私人语言"难题
> 子 agent 回传给主 agent,本质是一次**语言游戏的跨语境翻译**。维特根斯坦论证"私人语言不可能"——意义依赖公共的使用规则。子 agent 在它的隔离窗口里建立了一套"私人理解"(它探查过什么、排除过什么),回传时必须翻译成主 agent 能用的公共 schema。坑 1(上下文割裂)和坑 3(回传无 schema)的本质,都是这次翻译失败:要么子 agent 缺少共享的"意图语境"无法对齐意义,要么没有公共规则(schema)导致回传的"私人语言"主 agent 读不懂。这把"隔离=干净"的工程直觉,纠偏成"隔离=必须配一套显式翻译契约的有损通信"。(见 0114认识论)

---

## §7 PM 决策启示

- **面试怎么用**:被问"多 agent 是不是噱头",不要站队。答:"取决于任务耦合度——只读高扇出任务,隔离能把主 agent 拉出 Context Rot 区(Chroma 测了 18 个模型无一幸免);但有共享设计决策的生成任务,Cognition 的实证显示单线程更稳。我会先看 fan-in/fan-out 比再决定。"——一句话展示你掌握了正反两方的具体证据。
- **选型怎么用**:评估一个 agent 框架(AutoGen/CrewAI/LangGraph)时,别只看"支不支持多 agent",要看**它的子 agent 回传机制能不能强制 schema、能不能传递意图 trace**。不能的,就是把坑 1 和坑 3 留给你。
- **复现怎么用**:抄 §2 四步模板。第一版只做"一次性消化"粒度(最安全),把回传 schema 和 `confidence`/`dead_ends` 字段做扎实,跑通后再考虑并行扇出——并行是坑 2 的高发区,不要一上来就上。

---

## §8 与已有节点的关系

- **对照 [A07 Multi-Agent Teams](/kb/专题-安全对齐与失败/a07-multi-agent-teams/)(0411,深化)**:A07 给多 agent 的角色拓扑;本节点不复述拓扑,而是补上 A07 缺失的"信息流维度"——同一个拓扑下,子 agent 回传该带多少上下文。是**补缺**关系。
- **对照本专题 infoflow 节点(并列,分工)**:infoflow 讲 summarization / observation masking 这类"同一窗口内做减法";本节点讲"开第二条窗口"。是**对话**关系——隔离是压缩之外的第四条信息出路。
- **对照 [m206 - Agent 产品化：记忆机制与技术进展](/kb/工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/)(补缺)**:m206 讲 memory 这条外化路径;本节点的"常驻专家"子 agent 与 memory layer 有交集(一个维护领域上下文的子 agent ≈ 一个活的 memory),但本节点聚焦"消化回传"而非"持久化"。**不复述 m206 的记忆分类**。
- **对照 [R02 中型生产·LangGraph + MCP](/kb/专题-安全对齐与失败/r02-中型生产-langgraph-+-mcp/)(0411,工具层互补)**:R02 给中型生产的 agent 编排代码;本节点的隔离模板可作为 R02 里 worker 节点的回传规范。

---

## §9 关联节点

**核心(必读)**
- [A07 Multi-Agent Teams](/kb/专题-安全对齐与失败/a07-multi-agent-teams/) —— 隔离的拓扑前提:先有多 agent 分工,才谈得上隔离信息流
- [A06 Orchestrator 编排器](/kb/专题-安全对齐与失败/a06-orchestrator-编排器/) —— 主 agent 作为 orchestrator 的调度视角
- [m206 - Agent 产品化：记忆机制与技术进展](/kb/工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/) —— 隔离 vs 外化 memory:四去向中相邻的两条
- [c09 - RAG 架构](/kb/基础知识库/c09-rag-架构/) —— 四去向的第三条(走 RAG),与隔离对照
- [Agent](/kb/基础知识库/agent/) —— 原子概念:子 agent 仍是 agent,继承其全部约束

**延伸(可选)**
- [R03 Multi-Agent 模板·AutoGen CrewAI](/kb/专题-安全对齐与失败/r03-multi-agent-模板-autogen-crewai/) —— 0411 的同序号节点,多 agent 框架代码骨架(注意:不同专题,写全名消歧)
- [R02 中型生产·LangGraph + MCP](/kb/专题-安全对齐与失败/r02-中型生产-langgraph-+-mcp/) —— 子 agent 回传规范可嵌入此模板的 worker 节点
- [A08 MCP 与 A2A 协议族](/kb/专题-安全对齐与失败/a08-mcp-与-a2a-协议族/) —— agent 间通信协议,隔离回传的底层管道
- [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/) —— "一次意图 = N 次调用"的成本归因
- [KV Cache](/kb/基础知识库/kv-cache/) —— 隔离压住主线程长度,直接关系 KV Cache 增速
- [Prompt Caching](/kb/基础知识库/prompt-caching/) —— 子 agent 各自缓存系统提示的机制
- [幻觉](/kb/基础知识库/幻觉/) —— self-reflection 回传可能含幻觉,`confidence` 字段是缓解
- 0114认识论 —— 私人语言难题:回传是一次有损的跨语境翻译
- [AI PM 知识图谱·总索引](/kb/ai-pm-知识图谱/ai-pm-知识图谱-总索引/) —— 总索引入口

---

## 修订日志

- **R1(2026-06-07)** 首稿。建立四步模板(SCOPE/SPAWN/EXECUTE/RETURN)+ 回传 schema;判断主轴四坑(上下文割裂/隐式决策冲突/回传无 schema/为隔离而隔离),每坑四件套;Cognition "Don't Build Multi-Agents" 作为对手框架"接受+边界";维特根斯坦私人语言作跨域呼应;显式锚定 0411(CE 管信息流 vs Agent 管分工);与 A07/infoflow/m206/c09/R02 升级对照。事实接地:Chroma 18 模型(2025-07-14)、NoLiMa GPT-4o 有效约 8K、Focus Agent 22.7%/110%/6%(arXiv 2601.07190)、Cognition 两原则、LangChain Isolate 框架均已标来源。

---
title: E01 Claude Code 与 CLAUDE.md 的 Context 管理剖解
cluster: 专题 · 工程与成本
created: '2026-06-07'
updated: '2026-06-11'
provenance: ai
facet: 上下文工程
---

# E01 Claude Code 与 CLAUDE.md 的 Context 管理剖解

这个节点要回答的问题是：当 context engineering 从一句口号落到一个**每天有人用、有产品反馈、有真实失败模式**的系统里时，它长什么样？我选 Claude Code 作为解剖对象，不是因为它最先进，而是因为我（Rick）每天都在用它写这个知识库——包括你正在读的这篇文档本身就是 Claude Code 在一个被 `CLAUDE.md` 约束、被 compaction 截断、被 subagent 隔离的上下文里生成的。本节的判断主轴是：**`CLAUDE.md` 是"显式 context engineering"目前能拿到的最干净的范例——它把"哪些 token 应该长驻窗口"这个决策从模型手里夺回到人手里——但它同时暴露了显式 context engineering 的硬边界：人写的静态 context 既无法对抗 compaction 的遗忘，也无法对抗模型"读了不照做"的依从性衰减。**

> [!note] 视角声明
> 本节是 E 模块（病理学/实例剖解）的一篇。它不重新讲 context engineering 是什么（见 [A01 Context Engineering 概念史与升格](/kb/专题-工程与成本/a01-context-engineering-概念史与升格/)），也不重新讲 compaction 的技术原理（见 [R01 最小可运行·Context Compaction](/kb/专题-工程与成本/r01-最小可运行-context-compaction/)）。它只做一件事：把一个真实系统拆开，看显式 context 管理在哪里成立、在哪里崩。

## §0 为什么用 Claude Code 而不是"通用 Agent 框架"做剖面

剖解 context 管理，最容易的偷懒路径是拿 LangChain / AutoGPT 这类框架画一张抽象的"记忆层架构图"。我不这么做，因为框架图是**设计意图**，而 Claude Code 是**已经撞过用户的产品**——它的 context 策略里每一条都对应过一次真实的痛：上下文被填满、agent 忘了三步前的决定、subagent 返回了一坨没用的探索日志。E 模块的命门是看"现实怎么走样"，所以剖面对象必须有真实流量。

更关键的是 Claude Code 提供了一个稀有的对照组：它同时拥有**四种**互不相同的 context 管理机制——`CLAUDE.md`（人写的静态长驻 context）、compaction（模型自己写的动态摘要）、subagent（隔离的子窗口）、1M 窗口（暴力扩容）。这四者恰好覆盖了 context engineering 的四种基本动作。把它们放在一个系统里横向比，比读四篇分散的博客更能看清各自的边界。

## §1 CLAUDE.md：把"长驻 token"决策权从模型夺回人手

`CLAUDE.md` 是一个放在仓库根目录的 Markdown 文件，Claude Code 在每次会话启动时把它**整体注入**系统提示，使其成为整个会话期间不被压缩、不被遗忘的"宪法层" context。这就是它的全部魔法——也是它全部价值的来源。

放在 context engineering 的坐标系里看，这正是 Karpathy 那句定义的字面落地："the delicate art and science of filling the context window with just the right information for the next step"（来源：[Andrej Karpathy on X](https://x.com/karpathy/status/1937902205765607626)，2025-06-25）。`CLAUDE.md` 把"哪些 token 必须在窗口里"这个决策，从模型的隐式推断里抽出来，交给人显式书写。它对应 Anthropic 自己给的定义——"curating and maintaining the optimal set of tokens at inference time"（来源：[Anthropic Engineering Blog, "Effective Context Engineering for AI Agents"](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)，2025-09-29）——里那个 "curating"（策展）动作的人类版本。

我的一手体感是：`CLAUDE.md` 真正改变行为的不是"写了什么"，而是"写得多狠"。本知识库的 `CLAUDE.md` 里有一条「索引优先：定位既有节点先查 `00Meta/索引.md`，不做全库盲扫」。这一条不是描述，是**约束**——它直接砍掉了 agent 默认会做的"glob 全库再 grep"行为，把一次可能消耗几万 token 的盲扫压成一次定向读取。这印证了 Anthropic 工程团队反复强调的那句话："Find the smallest set of high-signal tokens that maximize desired outcomes."（来源：同上 Anthropic Engineering Blog）。`CLAUDE.md` 的本质是**用人写的高信号 token，去抢占模型本会用低信号探索填满的窗口空间。**

## §2 Compaction：模型自己写的动态摘要，与它的三个已知缺陷

当对话逼近窗口上限，Claude Code 会触发 compaction：用一次额外的模型调用，把已有历史压成一段摘要，替换掉原始的长历史。这是 context engineering 四动作里的 **Compress**（来源：[LangChain Blog, "Context Engineering for Agents"](https://www.langchain.com/blog/context-engineering-for-agents)，2025-07-02 提出 Write/Select/Compress/Isolate 四策略）。

数字上它确实有效。Anthropic 的 `compact_20260112` 压缩策略（beta，2026-01 发布）默认摘要 prompt 要求保留"状态、下一步、已学到的内容"，在一组 100 轮网页搜索评估中，token 消耗减少约 **84%**（来源：[Anthropic Compaction 官方文档](https://platform.claude.com/docs/en/build-with-claude/compaction)）。Claude Code 的实践触发点约在 80% 窗口（约 160K token）处，保留架构决策、未解决 bug、实现细节，丢弃冗余工具输出（来源：[Claude Code Compaction Explained, okhlopkov.com](https://okhlopkov.com/claude-code-compaction-explained/)，第三方分析博客，具体阈值为该作者观察）。

但 compaction 是这个剖面里最脆的一环，有三个已记录在案的缺陷：第一，官方文档承认偶发模型在摘要阶段**调用工具而非写摘要**；第二，**无法用更便宜的模型做摘要**（2026-06 状态），所以压缩本身也烧 Opus 级的钱；第三——这是对 PM 最致命的——压缩是**有损**的，被判定为"冗余"的 token 一旦丢弃就找不回来。JetBrains Research 在 SWE-bench 上的对比实验甚至发现，LLM Summarization 反而让 agent 运行时间增加约 **15%**，他们推测是摘要遮盖了原本的停止信号；相比之下，单纯把旧工具结果替换成占位符的 Observation Masking 成本降低 **52%**、解决率反升 **2.6%**（来源：[JetBrains Research Blog, "Efficient Context Management"](https://blog.jetbrains.com/research/2025/12/efficient-context-management/)，2025-12，样本量有限）。

这就引出 `CLAUDE.md` 与 compaction 的**致命耦合点**，见 §5。

## §3 Subagent：隔离子窗口，与 Cognition 的反方拷问

Claude Code 的 subagent 机制：主 agent 可以派生一个拥有**独立 context 窗口、独立系统提示、受限工具权限**的子 agent 去做一段探索，子 agent 把过程全部消化在自己的窗口里，只把最终压缩结论回传主 agent。这是四动作里的 **Isolate**，也是本专题"信息流四去向"里"让 subagent 先消化回传"那一支的产品级实现。

它的价值很直接：子 agent 翻了 50 个文件的探索日志，主 agent 一行都不用承接，主窗口被污染的速度因此大幅下降。

> [!warning] 对手框架回应（接受 + 边界）
> 这里必须接入 Cognition 的强力反方立场。在 [Cognition Blog, "Don't Build Multi-Agents"](https://cognition.ai/blog/dont-build-multi-agents)（2025）中，他们提出两条原则：(1) 只接收子任务描述的子 agent，因缺乏整体决策历史而误解任务，主张 "Share full agent traces, not just individual messages"；(2) 并行子 agent 各自做出"局部合理但全局冲突"的隐式决策（他们的著名例子：一个子 agent 建 Super Mario 风格背景，另一个建视觉不兼容的角色，组合即失败）。他们的结论是：当前模型跨 agent 沟通可靠性不足，单线程 + 完整上下文往往优于多 agent。
>
> **我接受 Cognition 对的部分**：隔离确实是用"信息损失"换"窗口洁净"，对需要全局一致性的任务（如一份风格统一的长文档），隔离的代价可能大于收益。**但我坚持的边界是**：Claude Code 的 subagent 默认是**串行委派**而非 Cognition 批评的"并行独立决策"，主 agent 仍持有决策主线——它规避了"原则 2"的隐式冲突，只承担"原则 1"的部分上下文割裂。所以这不是 Cognition 框架的反例，而是它适用边界的一次精确切分：**隔离适合可独立验证的探索性子任务（搜文件、读日志），不适合需要审美/架构一致性的生成性子任务。** 这个边界，恰好是我写本知识库时反复踩过的——让 subagent 并行写多个专题节点，回来风格就会漂。

## §4 1M 窗口：暴力扩容不是 context engineering 的胜利，而是它的失败前提

Claude Code 可接入 1M token 窗口（Claude Opus/Sonnet 4.x 系列，1M 上下文以标准价计费，无长上下文附加费——来源：[Anthropic 官方定价页](https://platform.claude.com/docs/en/about-claude/pricing)，2026-06-07 实查）。直觉上窗口越大、context 管理越不重要。这个直觉是错的，而且是本专题的核心反共识。

**"标称窗口"远不等于"有效窗口"**，这是有系统证据的。NoLiMa 基准（Adobe Research / ICML 2025）测出 Claude 3.5 Sonnet 在 64K 时准确率从 1K 的 87.6% 暴跌至 **29.8%**，GPT-4o 的实际有效上下文约只有 **8K** token，尽管标称 128K（来源：[GitHub adobe-research/NoLiMa](https://github.com/adobe-research/NoLiMa)）。Chroma 的 context rot 研究测了 18 个前沿模型，**无一例外**全部随输入增长而性能下降（来源：[Chroma, "Context Rot"](https://www.trychroma.com/research/context-rot)，2025-07-14）。RULER 基准则显示 Mixtral 标称 32K，在 128K 时得分仅 **44.5/100**（来源：[Hsieh et al., RULER, arXiv:2404.06654](https://arxiv.org/abs/2404.06654)，COLM 2024）。这些印证了经典的 "Lost in the Middle" U 形曲线（来源：[Liu et al., TACL 2024, arXiv:2307.03172](https://arxiv.org/abs/2307.03172)）。

> [!quote] 我赌的判断（带边界）
> 1M 窗口越大，`CLAUDE.md` 这类**主动筛选**机制越重要，而非越不重要——因为窗口的物理上限提高了，但模型在窗口内的**有效注意力**没有同比例提高。把 800K token 塞满，等于主动把高信号的 `CLAUDE.md` 稀释进 context rot 的泥潭。**我的边界**：这个判断对"需要精确利用全部上下文"的任务成立；对"只需在海量文档里捞一根针"的 NIAH 式任务，大窗口仍近乎满分，此时主动筛选的边际收益低。失效场景：若未来出现注意力不随长度衰减的架构（如某些 RoPE 变体研究），本判断的前提会松动。

## §5 判断主轴：90% 的人会在 CLAUDE.md 上搞错的三件事

这一节是本节点的命门。`CLAUDE.md` 看起来是个"写好就一劳永逸"的配置文件，但显式 context engineering 的陷阱全在这里。

**错位一：把"必须长驻"的内容只写进对话，不写进 CLAUDE.md。**
- 症状：会话前半段你口头让 agent "以后都用顿号不用斜杠"，跑了几十轮后它又用回斜杠。
- 为什么会错：compaction 一旦触发，对话历史被压成有损摘要，你的口头约束极可能被判为"冗余"丢弃。Anthropic 的官方实践指引说得很直白——**必须保留的内容不要依赖 compaction，假设它不会被保留**（来源：[Anthropic Context Engineering Cookbook](https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools)）。
- 正确做法：凡是"整个会话都要遵守"的约束，写进 `CLAUDE.md`（长驻、不被压缩），而非对话（会被压缩）。
- 真实反例：本知识库 `CLAUDE.md` 把"标题禁半角斜杠""双链只用确认存在名"写成硬约束，正是因为这两条若靠对话提醒，必死于 compaction。

**错位二：把 CLAUDE.md 写成文档，而不是约束。**
- 症状：`CLAUDE.md` 写满"本项目是一个 PKM 库，包含很多笔记……"这类描述性废话，agent 行为毫无变化。
- 为什么会错：描述性 token 是低信号的，它占了长驻窗口却不改变任何决策。这违背了"smallest set of high-signal tokens"原则。
- 正确做法：每一行 `CLAUDE.md` 都应能回答"它砍掉了 agent 的哪个默认错误行为"。本库的 `CLAUDE.md` 顶部那段 "⚠️ Starter scaffold — confirm before relying on it" 就是反面教训的活化石：它诚实标注了"这是空库时的假设"，提醒人别把描述当约束。
- 真实反例：对比"索引优先"（改变行为）与"这是个知识库"（不改变行为），同样占 token，价值差一个数量级。

**错位三：以为模型一定会照 CLAUDE.md 执行。**
- 症状：明明 `CLAUDE.md` 写了"不删除既有文件"，agent 偶尔还是覆盖了。
- 为什么会错：`CLAUDE.md` 是 context，不是 sandbox 权限。它靠模型的**依从性**生效，而依从性随窗口被填满而衰减——这正是 context rot 在指令层面的表现：早期注入的系统指令，在 800K token 之后的注意力权重被稀释。
- 正确做法：把"绝不能违反"的约束下沉到 **harness 层**（工具权限、hooks、文件系统隔离），把"最好遵守"的偏好留在 `CLAUDE.md`。两者是不同强度的契约。
- 真实反例：依赖 `CLAUDE.md` 写"只读"远不如直接收回写权限可靠——这也是 §3 subagent "受限工具权限"比"提示约束"更可信的同源道理。

**贯穿三者的致命耦合点**：`CLAUDE.md`（长驻、人写、不可压缩）与 compaction（动态、模型写、有损压缩）是两套**不共享真相源**的 context 机制。`CLAUDE.md` 假设自己永远在场，compaction 假设自己有权丢弃一切判为冗余的东西——当一条关键决策只活在对话里、没进 `CLAUDE.md` 时，它就掉进两套机制的缝里被静默吃掉。理解这条缝，是用好 Claude Code 的分水岭。

## §6 产品 PM 视角补盲

工程视角到此为止，但 PM 还要看三个工程师容易漏的点：

- **用户心理模型错配**：用户把 `CLAUDE.md` 当"给 AI 的说明书"（一次写好），实则它是"持续维护的 context 资产"。这个心智模型差异决定了产品要不要做"CLAUDE.md 健康度提示"——当文件膨胀到稀释信号时主动告警。
- **成本的隐形结构**：`CLAUDE.md` 每次会话都全量注入，它越长，**每一轮**对话的固定成本越高。一个 5000 字的 `CLAUDE.md` 在长会话里被反复计费。这与 [Prompt Caching](/kb/基础知识库/prompt-caching/) 直接相关——`CLAUDE.md` 作为稳定前缀恰是 prompt cache 的理想命中对象（缓存命中读取仅 0.1x 基础价，来源：[Anthropic 官方定价页](https://platform.claude.com/docs/en/about-claude/pricing)），所以"把稳定约束前置"既是 context 工程也是成本工程，详见 [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/)。
- **合规与可审计性**：compaction 的有损摘要意味着"agent 为什么做了这个决定"的原始依据可能已被丢弃。对受监管场景（如我做的安全产品），这是一个真实的审计黑洞——决策链条不可完整回溯。

## §7 跨域呼应：维特根斯坦的"规则遵循悖论"

`CLAUDE.md` 这种"写一条规则、期待 agent 照做"的范式，撞上的正是维特根斯坦在《哲学研究》里提出的**规则遵循悖论**（rule-following paradox）：任何一条有限的规则，都无法**自我确定**它在所有未来情形下的应用方式；规则的意义不在文本里，而在共同体反复校正的实践中。

这不是装饰性引用。它直接改变我对 §5「错位三」的判断：人们以为只要把 `CLAUDE.md` 写得足够详尽、足够无歧义，依从性问题就能解决——这是一个**维特根斯坦式的幻觉**。规则文本无法穷尽其应用，agent 对"不删除既有文件"的解读边界（覆盖算不算删除？归档算不算？），不可能靠把规则写得更长来封死。结论很反直觉：**`CLAUDE.md` 的可靠性上限不取决于它写得多完整，而取决于配套的实践校正回路**——hooks 拦截、人工 review、harness 权限。这与 0114认识论 里"显性知识与默会知识的张力"是同一条裂缝：显式 context 永远追不上实践的全部默会要求。把约束下沉到 harness，本质上是承认"有些规则只能用执行环境兜底，不能用文本兜底"。

## §8 PM 决策启示

- **面试怎么用**：被问"你怎么看 context engineering 是不是换皮"时，别空谈定义。直接拆 Claude Code 四机制（CLAUDE.md / compaction / subagent / 1M 窗口）对应四动作（Select / Compress / Isolate / 扩容），指出"换皮论"忽略了 compaction 与 CLAUDE.md 的真相源裂缝——这是 prompt engineering 时代不存在的新工程问题（呼应 [A01 Context Engineering 概念史与升格](/kb/专题-工程与成本/a01-context-engineering-概念史与升格/) 里的争议未决立场）。
- **选型怎么用**：评估任何 agent 产品，别比"支持多大窗口"，比"有没有把长驻 context 与动态 context 分层、约束能不能下沉到 harness"。NoLiMa 数据是你拒绝"1M 窗口=无脑塞"方案的弹药。
- **复现怎么用**：自己搭 agent 时，第一件事不是调 prompt，是设计"哪些 token 长驻（系统/CLAUDE.md 层）、哪些可压缩（对话层）、哪些必须隔离（subagent 层）"的分层。这个分层就是你的 context architecture。

## §9 与已有节点的关系

- 对照 [m201 - Prompt Engineering 实战体系](/kb/工程化与落地架构/m201-prompt-engineering-实战体系/)：m201 讲"怎么写好一句指令"（prompt 层），本节点讲"指令写进哪一层 context、能活多久"（context 层）——这是从 prompt engineering **升格**到 context engineering 的具体落地，做的是**升维**而非复述。m201 §System Prompt 四原则里"稳定性→缓存"那条，在本节 §6 被接上了 `CLAUDE.md` 作为缓存前缀的成本含义。
- 对照 [m206 - Agent 产品化：记忆机制与技术进展](/kb/工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/)：m206 讲长期记忆架构（向量/结构化/图三库），本节点讲"记忆与当前 context 的边界决策"。compaction 丢弃的东西若要留存，正是 m206 的 memory layer 该接住的——本节做的是**对话与补缺**，把 m206 的记忆机制接到 Claude Code 的真实截断点上。
- 对照 [c09 - RAG 架构](/kb/基础知识库/c09-rag-架构/)：c09 的 Lost in the Middle 与本节 §4 的有效窗口论证同源，但 c09 用它论证"为什么要 RAG 而非塞长上下文"，本节用它论证"为什么 1M 窗口下 CLAUDE.md 的主动筛选更重要"——同一事实，不同决策层的**应用纠偏**。
- 跨专题对照 [E01 Coding Agent·Claude Code & Cursor](/kb/专题-安全对齐与失败/e01-coding-agent-claude-code-cursor/)（0411 Agent 专题）：那个 E01 从"Agent 怎么分工"角度剖 Claude Code 的 ReAct/工具循环，本 E01 从"怎么管信息流"角度剖同一产品的 context 层。两者是 **Agent=分工 / CE=信息流**这条专题关系的同一对象双切面，互为补充而非重叠。

## §10 关联节点

**核心（必读）**
- [A01 Context Engineering 概念史与升格](/kb/专题-工程与成本/a01-context-engineering-概念史与升格/)（本专题概念地基）
- [A04 信息流决策框架·四去向](/kb/专题-工程与成本/a04-信息流决策框架-四去向/)（本节 §2/§3 的下游决策框架）
- [m201 - Prompt Engineering 实战体系](/kb/工程化与落地架构/m201-prompt-engineering-实战体系/)（升格关系的起点）
- [m206 - Agent 产品化：记忆机制与技术进展](/kb/工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/)（compaction 之外的 memory layer）
- [Prompt Caching](/kb/基础知识库/prompt-caching/)（CLAUDE.md 的成本工程一面）

**延伸（可选）**
- [c09 - RAG 架构](/kb/基础知识库/c09-rag-架构/) · [KV Cache](/kb/基础知识库/kv-cache/) · [Attention](/kb/基础知识库/attention/)（有效窗口的架构根因）
- [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/)（长驻 context 的计费结构）
- [E01 Coding Agent·Claude Code & Cursor](/kb/专题-安全对齐与失败/e01-coding-agent-claude-code-cursor/)（0411 Agent 专题的同对象异切面）
- 0114认识论（§7 规则遵循悖论的认识论出处）
- [Agent](/kb/基础知识库/agent/) · [Claude Code](/kb/ai-公司与产品/claude-code/) · [Claude](/kb/ai-公司与产品/claude/) · [幻觉](/kb/基础知识库/幻觉/) · [AI PM 知识图谱·总索引](/kb/ai-pm-知识图谱/ai-pm-知识图谱-总索引/)

## 修订日志
- R0（2026-06-07）：首稿。确立判断主轴"CLAUDE.md 是显式 context engineering 范例与其边界"；四机制对照四动作；接入 Cognition 反多 agent 立场（§3）与维特根斯坦规则遵循悖论（§7）；事实接地 NoLiMa/Chroma/RULER/JetBrains/Anthropic compaction 数据。

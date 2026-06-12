---
title: S03 Memory 与 Context Ops 全景
cluster: 专题 · 工程与成本
created: '2026-06-07'
updated: '2026-06-11'
provenance: ai
facet: 上下文工程
---

一个 RAG 索引会腐化、需要重建——这件事 [m205 - RAG 生产环境：索引运维与评估体系](/kb/工程化与落地架构/m205-rag-生产环境-索引运维与评估体系/) 已经讲透了：embedding 漂移、文档过期、召回率衰减，都要靠运维闭环兜住。本节点要解决的问题是：**当系统从"检索一段文本"升级为"维护一个跨会话、自我写入、自我遗忘的 memory layer + 动态 context 窗口"之后，那套腐化逻辑不但没消失，反而长出了几条新的腐化通路**——而且更隐蔽,因为它们藏在模型"看起来记得"的假象里。本节点用一个判断主轴贯穿:**context 与 memory 系统不是建好就完事的资产,它们和索引一样会腐化、会漂移、会被污染,因此需要一套完整的 Ops(监控—评估—回滚—压缩—缓存)闭环**。视角框架:把 memory pipeline 当成一条带 SLO 的生产管线来运维,而不是当成一个"功能"来交付。

## §0 为什么是 "Memory + Context Ops" 这个框架,而不是 "Memory Feature"

读者脑中最容易冒出的默认框架是:memory 是 agent 的一个**功能模块**——接上一个向量库或 Mem0,agent 就"有记忆了"。这个框架的致命错误在于:它把 memory 当成一次性集成的能力,而非需要持续运维的**有状态系统**。

更准确的框架,是把信息流的全生命周期当成一条管线来看。LangChain 2025-07-02 把 context engineering 系统化为四个操作动词——**Write / Select / Compress / Isolate**(来源:LangChain Blog, "Context Engineering for Agents", 2025-07-02),并明确类比为"操作系统管理 CPU 内存"。MemGPT 更早(arXiv:2310.08560, Packer et al., UC Berkeley, 2023-10)就把 LLM 比作操作系统:main context = RAM,external context = disk,LLM 通过工具调用(`core_memory_append`、`archival_memory_search`)驱动数据在层间换页。

操作系统类比的真正价值不在"分层存储",而在它逼你问一个运维问题:**你的换页策略会不会抖动?你的磁盘(长期记忆)会不会塞满垃圾?你的 RAM(context window)会不会因为驻留太多无关页而拖垮命中率?** 这正是 "Feature 框架"看不见、"Ops 框架"才看得见的东西。本节点选择后者:Write/Manage/Read(Pengfei Du 综述, arXiv:2603.07670, 2026-03,把统一架构循环提炼为 `Write → Manage → Read`)三个阶段,每个阶段都对应一组可监控的腐化指标和一套运维动作。

一句话辨析:**Memory Feature 关心"agent 能不能记住";Context Ops 关心"记住的东西会不会变质、变质了你能不能发现、发现了你能不能回滚"。** 后者才是生产级的命门。

## §1 信息流四去向:管线的入口决策

context engineering 的第一性问题不是"怎么压缩",而是"这条信息**该不该进 context、进哪一层**"。一条新信息进入系统时面临四个去向(本专题 [A04 信息流决策框架·四去向](/kb/专题-工程与成本/a04-信息流决策框架-四去向/) 决策的运维落地视角):

| 去向 | 适用信号 | 腐化风险 | 运维抓手 |
|---|---|---|---|
| **放 context** | 当前步骤就要用、高信号、短时效 | context rot(token 累积稀释注意力) | token 预算监控、compaction 阈值 |
| **外化 memory** | 跨会话要复用、用户画像、决策结论 | 记忆污染(写入幻觉)、过时记忆 | 写入校验、TTL/遗忘调度、冲突消解 |
| **走 RAG** | 大规模、动态、可检索的事实 | 索引漂移、召回衰减(见 m205) | 召回率监控、重嵌入、reranker |
| **让 subagent 先消化回传** | 探索性、产生大量中间 token 的子任务 | 上下文割裂、信息丢失 | 回传摘要质量评估 |

Anthropic 的核心建议把这件事压成一句:"Find the smallest set of high-signal tokens that maximize desired outcomes"(找到能最大化期望结果的最小高信号 token 集合)(来源:Anthropic Engineering Blog, "Effective Context Engineering for AI Agents", 2025-09-29)。注意这句话的运维含义:它不是"塞得越多越好",而是一个**持续优化问题**——同一条信息,在任务的不同步骤,最优去向可能不同。这就是为什么需要 Ops 而非一次性配置。

判断:**四去向不是静态分类,而是动态路由**。EMNLP 2024 的 Self-Route(arXiv:2407.16833, Li et al.)证明了这条路由可以让模型自己判断——查询走 RAG 还是走长上下文,Gemini-1.5-Pro 计算成本降 65%、GPT-4o 降 39%,同时维持接近长上下文的性能。这是"去向决策本身可被工程化"的第一手证据。

## §2 Memory Pipeline:Write → Manage → Read 三段腐化点

把长期记忆当管线拆开,每一段都有独立的腐化通路。

**Write 段(写入)** 的腐化是**记忆污染**:agent 通过 self-reflection 写入的记忆可能本身就是幻觉,一旦落盘,后续会被反复检索强化(arXiv:2603.07670 列为"可信反思"开放挑战)。这是 memory 系统比 RAG 更危险的地方——RAG 的语料是人类策展的,而 agent memory 是模型自己写的,模型把自己的幻觉当成了"事实"存档。运维抓手:写入前做事实校验,区分"观测事实"与"模型推断",后者降级标注。

**Manage 段(管理)** 的腐化是**过时与冲突**:用户上个月说"我在北京",这个月搬到上海了,旧记忆不删就会持续误导。Mem0(arXiv:2504.19413, Chhikara et al., 2025-04)的核心卖点之一就是"主动遗忘过时/矛盾信息",并提供 Base(向量)与 Graph(图结构,捕捉关系)两个变体。MemoryBank(Zhong et al., 2024)直接引入艾宾浩斯遗忘曲线做调度。但**何时遗忘、如何安全更新**仍是开放问题(arXiv:2603.11768 专论遗忘机制)。

**Read 段(读取)** 的腐化是**高检索率 ≠ 真记忆**。LongMemEval(ICLR 2025, arXiv:2410.10813)给出了最锋利的一刀:商业 chat assistant 和 long-context LLM 在跨会话记忆上准确率**下降 30%**;多会话与时间类问题准确率常**低于 50%**;且**高检索准确率不等于强知识更新/时间推理能力**——你能把对的记忆捞出来,不代表 agent 能正确推理"这条记忆现在还成不成立"。

> [!warning] 判断主轴落地:memory pipeline 的三段腐化是独立的
> 你可以有完美的检索(Read 健康),却因为写入了幻觉(Write 腐化)而稳定地给出错误答案;也可以写入全对、却因为不遗忘过时项(Manage 腐化)而越用越错。**三段必须分别监控**——只盯检索率(很多团队只做这个)会漏掉另外两条通路。

## §3 Context 监控:把腐化变成可观测指标

"context rot"(上下文腐化)这个术语由向量数据库公司 Chroma 于 2024-07 正式命名,Anthropic 在 2025-09-29 的工程文章中采用并定义为:随 token 累积,注意力稀释导致模型表现退化。关键事实:Chroma 2025-07-14 的系统测评(Kelly Hong、Anton Troynikov、Jeff Huber)覆盖 **18 个前沿模型**(Claude Opus 4 / Sonnet 4 / 3.7 / 3.5、o3 / GPT-4.1 / GPT-4o、Gemini 2.5 Pro/Flash、Qwen3-235B 等),**无一例外全部随输入长度增长而性能下降**(来源:trychroma.com/research/context-rot)。

这意味着 context 不是"填满才出问题",而是**从第一个 token 起就在缓慢退化**。要把它变成可运维的指标,至少监控三类:

1. **窗口占用率与近因偏置漂移**:Chroma 发现上下文 >50% 满时,经典的 U 形曲线(首尾高、中间低,即 Liu et al. 2023 的 "Lost in the Middle")会**变形为偏向近期 token**(recency bias 增强、primacy bias 减弱)。也就是说,窗口越满,越早放进去的系统指令越可能被"忘掉"——这对依赖 system prompt 的 agent 是直接的失败信号。
2. **有效上下文 vs 标称窗口的缺口**:NoLiMa(Adobe Research / ICML 2025)给出残酷数字——Claude 3.5 Sonnet 在 64K 处准确率从 1K 的 87.6% 跌到 29.8%(-57.8pp),GPT-4o 跌到 69.7%,研究结论是 GPT-4o **实际有效上下文约 8K token**,尽管标称 128K(来源:GitHub adobe-research/NoLiMa)。An et al. 2024(arXiv:2410.18745)的规律:开源模型有效上下文通常 ≤ 标称窗口的 50%。**运维含义:不要按标称窗口规划 context 预算,按 RULER/NoLiMa 测出的有效窗口规划。**
3. **干扰项累积**:Chroma 发现 1 个干扰项就降低基线性能,4 个累积更显著。监控"无关 tool_result 在窗口里驻留了多久"是一个实用指标。

这是本节点对 [m205 - RAG 生产环境：索引运维与评估体系](/kb/工程化与落地架构/m205-rag-生产环境-索引运维与评估体系/) 的**升级对照**:m205 监控的是索引侧的召回率/MRR/Faithfulness 衰减;本节点把监控对象上移到 **context 窗口本身**——一个连"索引完全正确"都救不了的腐化层(因为信息确实被检索进来了,只是模型在长窗口里没有正确利用它)。

## §4 Eval:孤立 benchmark 不能代表真实 memory 性能

评估是 Ops 闭环里最容易自欺的一环。两个第一手案例值得 PM 刻进脑子。

**案例一:NIAH 饱和陷阱。** Needle-in-a-Haystack(Greg Kamradt, 2023-11-08 首发)曾是长上下文的标准测试,但 HELMET(Yen et al., arXiv:2410.02694, 2024-10)和 RULER(Hsieh et al., COLM 2024, arXiv:2404.06654)都证明:**在 128K 长度下,NIAH 对几乎所有前沿模型已饱和(满分),完全无法区分能力差异**。RULER 的原始数据更扎心——以 Llama-2-7B 4K 性能(85.6)为及格线,17 个声称长窗口的模型中**只有 4 个**(GPT-4、Command-R、Yi-34B、Mixtral)在 32K 达标;Mixtral 标称 32K,128K 时得分仅 44.5/100。**运维含义:用 NIAH 验收 memory 系统等于没验收。**

**案例二:LoCoMo 争议。** Mem0 发布报告称 MemGPT 在 LoCoMo 得 68.5%;Letta 团队(MemGPT 原作者)**公开质疑**:无法在不大幅重构代码库的情况下复现该场景,Mem0 未响应方法论说明请求,也未公开修改版实现;Letta 反向用 GPT-4o mini + 文件系统操作做了 LoCoMo,得 **74.0%**,反超 Mem0 报告值(来源:Letta Blog, "Benchmarking AI Agent Memory")。

> [!note] 判断主轴落地:memory eval 的腐化是"指标本身腐化"
> 这正是 [m205 - RAG 生产环境：索引运维与评估体系](/kb/工程化与落地架构/m205-rag-生产环境-索引运维与评估体系/) 讲的 Goodhart 陷阱在 memory 层的复现:当 NIAH 成了目标,它就不再是好的度量。Mem0/Letta 之争暴露的不是谁作弊,而是**孤立工具 benchmark 与真实 agent 性能之间的结构性鸿沟**。运维结论:eval 必须分层——单点检索用 NIAH 做烟雾测试(只验"没坏"),跨会话推理用 LongMemEval,语义检索用 NoLiMa,且**任何对外宣称的分数都要附可复现脚本**,否则按 Letta 的标准就是不可信的。

## §5 Drift:memory 系统特有的三种漂移

漂移(drift)是腐化的动力学形式。RAG 索引的漂移(embedding 模型升级导致旧向量与新查询不在同一空间,见 m205)只是其中一种。memory 系统多了两种:

- **记忆漂移(Memory Drift)**:用户画像随时间变化,但记忆库是历史快照的叠加。不做时间衰减,"3 年前喜欢 X"会和"现在喜欢 Y"等权重参与检索。LongMemEval 的"时间推理"维度专测这个,而模型在该维度常低于 50%。
- **分布漂移(Distribution Drift)**:agent 上线后真实任务分布偏离了你 eval 时的分布。你的 memory 压缩策略是在"100 轮网页搜索"上调优的(Anthropic compact_20260112 在该场景省 84% token),换成"代码调试"场景可能完全不适用——Focus Agent(arXiv:2601.07190)就发现迭代精炼类任务里压缩反而增加 **110%** overhead。
- **缓存漂移(Cache Drift)**:见 §6,prompt cache 的失效与你的 context 编辑策略强耦合,改一个会悄悄破坏另一个。

failure scenario 显式标注:**本节点"memory 越多越好"的隐含倾向在高频短任务场景会失效**——给一个只跑 3 轮的客服 agent 接上 Mem0,写入/检索的工具调用 token 开销可能超过它省下的;MemGPT/Letta 每次记忆操作都消耗推理 token,规模化成本是公认的工程权衡,无定论。漂移监控的第一条就是:**先确认你的场景值得有 memory。**

## §6 缓存:被低估的 Ops 杠杆,也是被低估的腐化源

[Prompt Caching](/kb/基础知识库/prompt-caching/) 和 [KV Cache](/kb/基础知识库/kv-cache/) 是 context Ops 里成本与性能的最大杠杆,也是最容易被 memory 操作悄悄破坏的环节。

成本侧的硬数字(Anthropic 官方定价,2026-06-07 实查):Claude Opus 基础输入 $5/MTok、缓存命中读取 $0.50/MTok(省 90%);缓存写入 5 分钟档 1.25x、1 小时档 2x 基础价。**第一次命中即回本(5 分钟档)。** 这是 [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/) 成本公式的输入项。

但这里有一个 context Ops 特有的腐化陷阱,直接来自 JetBrains Research(2025-12, blog.jetbrains.com/research):

> [!warning] 判断主轴落地:压缩策略与缓存的隐性冲突
> 两种主流 context 压缩方案对缓存的影响截然相反:
> - **Observation Masking**(把旧 tool_result 换成占位符,保留 tool_use 记录):**无推理开销**,但会**使 prompt 缓存前缀失效**——你省了 token,却让下一轮全价重算缓存。
> - **LLM Summarization**(摘要替换历史):JetBrains 在 SWE-bench 上发现它反而使 agent **运行时间增加约 15%**(摘要可能遮盖了停止信号),且 Qwen3-Coder 480B 用 Masking 后解决率反升 2.6%、成本降 52%。
>
> 也就是说:你以为在做"context 优化",可能正在做"缓存破坏"。**改 context 编辑策略前,必须同时看缓存命中率指标**——这正是 [m205 - RAG 生产环境：索引运维与评估体系](/kb/工程化与落地架构/m205-rag-生产环境-索引运维与评估体系/) 的运维闭环思想在 context 层的延伸:任何对系统状态的"优化"都可能在另一个维度引发回归,必须有交叉监控。

Rick 的 E01 一手体感:Claude Code 在约 80% 上下文窗口(~160K token)自动触发 compaction,保留架构决策、未解决 bug、实现细节,丢弃冗余工具输出(来源:okhlopkov.com/claude-code-compaction-explained)。Anthropic 推荐的生产组合是:工具结果清除(`clear_tool_uses_20250919`,80K 触发)→ 摘要压缩(`compact_20260112`,默认 150K 触发)→ 跨会话持久化记忆。这条流水线本身就是 Context Ops 的参考实现。

## §7 产品 PM 视角补盲

工程视角谈到这里都是"怎么不腐化"。但 PM 要补三个工程视角看不见的盲点:

1. **记忆的隐私与信任边界**:memory layer 写入的是用户画像、历史决策——这是合规雷区。GDPR 的"被遗忘权"要求用户能删除自己的数据,但你的 memory 如果做了 embedding + 图结构 + 摘要,"删除一条记忆"在技术上可能根本删不干净(摘要里已经融了进去)。**PM 必须在设计记忆 schema 时就预留"可定向删除"的颗粒度**,而不是事后补。结合 Rick 的 DiDi 安全/国际化背景:跨境场景下记忆数据的存储地与可删除性是上线的硬门槛。
2. **"记得"的产品心理学双刃**:用户对"AI 记得我"的期待是非对称的——记对了感知微弱(本该如此),记错了感知强烈(诡异、被冒犯)。一个把用户过时偏好当成现状的推荐,比"完全不记得"造成的信任损伤更大。**memory 的产品 KPI 不该是"记住率",而该是"记错率"和"过时记忆触发的负反馈率"。**
3. **成本的可解释性**:memory + 长 context 让单次调用成本波动巨大(同一 agent,带满记忆 vs 冷启动,token 量可能差一个量级)。给业务方报价时,"平均成本"会严重误导,必须报 P50/P95 分布(Mem0 自己的卖点就是 P95 延迟降 91%)。

## §8 对手框架回应

**接受 + 边界,不是反驳。**

**对手一:Cognition,"Don't Build Multi-Agents"(2025)。** Cognition 主张"Share full agent traces, not just individual messages",反对 subagent 上下文隔离,核心论据是隐式决策冲突(两个 subagent 各自合理的决策组合起来失败)和上下文割裂。**接受**:他们对的部分是——当前模型跨 agent 通信的可靠性确实不足,subagent 回传摘要这条通路(§1 第四去向)是本节点四去向里最脆弱的一条,信息丢失风险真实存在。**边界**:但 Cognition 的"全 trace 共享"方案直接撞上 §3 的 context rot——全 trace 共享意味着主 agent 窗口爆炸式增长,18 个模型无一幸免的腐化会吃掉隔离省下的可靠性。本节点的赌注是:**隔离 + 高质量回传摘要评估(把回传摘要纳入 §4 的 eval 闭环)**优于无脑全共享。这场争论(Vellum/多数实践者 vs Cognition)至今未决。

**对手二(Rick 未读框架):Karpathy 的 "context engineering 是工业级 LLM 应用的核心技艺" vs Hacker News 的换皮质疑。** Hacker News(news.ycombinator.com/item?id=44464219)批评"context engineering 不过是换个名字"。**接受**:就"信息流管理"这件事而言,这批评有道理——RAG、memory、压缩都是既有技术。**边界**:但 context rot 作为可测量的架构属性(Chroma 18 模型实证)、有效上下文远小于标称窗口(NoLiMa 实证)、压缩与缓存的隐性冲突(JetBrains 实证)——这些是 agent 时代**新出现且需要专门运维**的工程挑战,不是重命名能解释的。本节点不押"它是不是新学科",只押"它需要一套独立的 Ops 实践"——这一点证据充分。

**confirmation-bias 砍除**:本节点早期倾向把 Mem0 的漂亮数字(LLM-as-Judge +26%、P95 延迟 -91%、token -90%)当作 memory layer 成熟的正面案例。补入反例:这些数字来自 LOCOMO,而 LOCOMO 正是 Letta 公开质疑可复现性的同一类 benchmark;Mem0 在独立评测(vectorize.io)的 LongMemEval 得分仅 **49.0%**。漂亮的厂商数字必须配上独立 benchmark 的折扣。

## §9 跨域呼应:控制论的"requisite variety" 与系统腐化

调度一个 Rick 熟悉的框架:Ross Ashby 的**必要多样性定律**(Law of Requisite Variety,控制论)——一个控制器要稳住系统,自身的状态多样性必须 ≥ 被控系统的扰动多样性。

把它套到 Context Ops:memory + context 系统本身就是一个"控制器",它要稳住"agent 在长任务中保持正确行为"这个目标。但 §3 证明了一件反直觉的事——**当 context 窗口变大(控制器的"状态空间"看似变大),它的有效控制能力反而下降**(有效上下文 ≤ 标称的 50%,context rot 全模型普遍)。这正是 Ashby 定律的一个变体警告:**徒增状态数量(塞更多 token)不等于增加 requisite variety**,如果新增的状态是噪声(干扰项、过时记忆、未压缩的 tool 输出),它反而稀释了控制器对真正扰动的响应能力。

这改变了一个具体的技术判断:**Context Ops 的目标不是"最大化信息量",而是"最大化信息的控制相关性"**——这恰好是 Anthropic "smallest set of high-signal tokens" 的控制论翻译。运维上,这意味着监控指标里要有"信噪比"这个维度,而不只是"装了多少"。链入 0114认识论:腐化的本质是系统对"什么算有效信息"的判定本身在退化——这是一个认识论问题,不只是工程问题。

## §10 PM 决策启示

- **面试**:被问"你怎么给 agent 加记忆",不要答"接个向量库"。答"我会先用四去向决策图判断信息该不该外化,然后把 memory 当带 SLO 的管线运维——Write 段防幻觉污染,Manage 段做遗忘调度,Read 段用 LongMemEval 而非 NIAH 验收,并交叉监控 prompt cache 命中率"。这一串能直接证明你不是"功能思维"而是"系统运维思维"。
- **选型**:评估 memory 厂商(Mem0/Letta/自建),第一个问题是"你的 benchmark 脚本可复现吗"——这一刀能筛掉一半 PR 稿。第二个问题是"过时记忆的遗忘和定向删除怎么做"(合规 + 准确性双重命门)。
- **复现**:跑 agent 时先量"有效上下文"(用 RULER 风格的小测试),按有效窗口而非标称窗口设 compaction 阈值;改任何 context 编辑策略时,同时盯成本(缓存命中率)和质量(任务成功率)两条线,防止单维优化引发另一维回归。

## §11 与已有节点的关系

- 对 [m205 - RAG 生产环境：索引运维与评估体系](/kb/工程化与落地架构/m205-rag-生产环境-索引运维与评估体系/):**深化 + 上移**。m205 把"索引会腐化、要运维"讲透在检索层;本节点把同一套腐化—监控—回滚的运维哲学上移到 context 窗口与 memory layer,补上了 m205 覆盖不到的两条新腐化通路(context rot、记忆污染)和 memory 特有的 Goodhart 陷阱(NIAH 饱和、LoCoMo 争议)。不复述 m205 的 embedding 漂移/重嵌入机制。
- 对 [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/):**对话 + 补缺**。m209 给出成本公式与 [Prompt Caching](/kb/基础知识库/prompt-caching/) 单价;本节点补上 m209 未展开的"context 压缩策略与缓存命中的隐性冲突"——即省 token 的动作可能破坏缓存、净成本反升(JetBrains 实证)。把 m209 的"算成本"延伸为"算成本时要看交叉效应"。
- 对 [m206 - Agent 产品化：记忆机制与技术进展](/kb/工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/):**纠偏 + 接力**。m206 讲了短期/长期记忆的架构选型;本节点接力讲"记忆建好之后怎么防止它变质",并对 m206 引用的向量库记忆机制补上"高检索率 ≠ 真记忆"的 LongMemEval 警告。
- 对 [m203 - RAG 生产环境：Embedding 与文档解析](/kb/工程化与落地架构/m203-rag-生产环境-embedding-与文档解析/) 与 [m204 - RAG 生产环境：Chunking 与范式演进](/kb/工程化与落地架构/m204-rag-生产环境-chunking-与范式演进/):本节点的"走 RAG"去向(§1)直接复用其检索层设计,不复述。

## §12 关联节点

**核心(必读)**
- [A04 信息流决策框架·四去向](/kb/专题-工程与成本/a04-信息流决策框架-四去向/) —— 信息流四去向决策的总图(本节点是其运维落地)
- [S01 Context 管理分层剖面](/kb/专题-工程与成本/s01-context-管理分层剖面/) —— 六层流水线架构(本节点深化其 Memory/Budget 层的运维)
- [m205 - RAG 生产环境：索引运维与评估体系](/kb/工程化与落地架构/m205-rag-生产环境-索引运维与评估体系/) —— 索引腐化运维(本节点的升级母本)
- [m206 - Agent 产品化：记忆机制与技术进展](/kb/工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/) —— 记忆架构选型(本节点接力其后)
- [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/) —— 缓存成本公式(本节点补交叉效应)
- [Prompt Caching](/kb/基础知识库/prompt-caching/) · [KV Cache](/kb/基础知识库/kv-cache/) —— 缓存腐化的技术基底
- [幻觉](/kb/基础知识库/幻觉/) —— 记忆污染的源头

**延伸(可选)**
- [c09 - RAG 架构](/kb/基础知识库/c09-rag-架构/) —— RAG 去向的架构基础
- [m203 - RAG 生产环境：Embedding 与文档解析](/kb/工程化与落地架构/m203-rag-生产环境-embedding-与文档解析/) · [m204 - RAG 生产环境：Chunking 与范式演进](/kb/工程化与落地架构/m204-rag-生产环境-chunking-与范式演进/)
- [m201 - Prompt Engineering 实战体系](/kb/工程化与落地架构/m201-prompt-engineering-实战体系/) —— 压缩(LLMLingua)与 context 管理的衔接
- [RAG](/kb/基础知识库/rag/) · [Embedding](/kb/基础知识库/embedding/) · [Attention](/kb/基础知识库/attention/) —— context rot 的注意力架构根因
- [Claude Code](/kb/ai-公司与产品/claude-code/) —— compaction 一手实现(E01 体感)
- [Agent](/kb/基础知识库/agent/) —— 被运维的主体
- 0114认识论 —— 腐化的认识论维度
- [AI PM 知识图谱·总索引](/kb/ai-pm-知识图谱/ai-pm-知识图谱-总索引/)

## 修订日志

- R0(2026-06-07):首稿。确立判断主轴"context/memory 系统也会腐化要运维",搭起信息流四去向 → Write/Manage/Read 三段腐化 → 监控/Eval/Drift/缓存四类 Ops 的骨架。事实接地:context rot(Chroma 18 模型)、有效上下文(NoLiMa/RULER)、NIAH 饱和(HELMET)、LoCoMo 争议(Letta vs Mem0)、压缩-缓存冲突(JetBrains)、Anthropic 缓存定价均已接地标年份。跨域调度 Ashby 必要多样性定律。对手框架:Cognition 反多 agent + Hacker News 换皮质疑。

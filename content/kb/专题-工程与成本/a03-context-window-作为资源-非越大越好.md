---
title: A03 Context Window 作为资源·非越大越好
cluster: 专题 · 工程与成本
created: '2026-06-07'
updated: '2026-06-11'
provenance: ai
facet: 上下文工程
---

把"上下文窗口"当成一块"越大越能装"的硬盘，是 2024–2026 年最贵的产品直觉错误之一。本节的视角是：**context window 不是容量，而是一种需要主动预算和分配的稀缺资源**——它有"标称值"和"有效值"两个数，二者的缺口正在系统性地变成生产事故。本节的判断主轴只有一句：**"窗口越大越好"是产品事故之源**。

## §0 为什么是"资源/预算"框架，而不是"容量/上限"框架

读者脑里默认的框架是"容量"：窗口 = 200K token = 一个能装 200K 的盒子，能装满就是物尽其用，装不满是浪费。这个框架会让 PM 做出三类错误决策——为了"用满"而往里塞历史、把"换更大窗口的模型"当成解决问答质量的银弹、把"塞进全部文档"当成比 RAG 更省事的方案。

正确的框架是 Karpathy 在 2025-06-25 给出的:context engineering 是 "the delicate art and science of filling the context window with just the right information for the next step"(来源:[x.com/karpathy/status/1937902205765607626](https://x.com/karpathy/status/1937902205765607626))。注意他的措辞是 *filling with just the right information*,不是 *filling up*。Anthropic 在 "Effective Context Engineering for AI Agents"(2025-09-29)里把这件事说得更硬:目标是 "curating and maintaining the optimal set of tokens at inference time",并提出 **context rot**(上下文腐化)——随 token 累积,注意力稀释,模型表现退化(来源:[anthropic.com/engineering/effective-context-engineering-for-ai-agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents))。

"容量"框架假设边际 token 的价值非负(多放点信息至少不会更差)。"资源"框架的核心反共识是:**边际 token 的价值经常是负的**——多放的那段历史不仅占预算,还会稀释注意力、引入干扰项,把模型从正确答案上拽走。这就是为什么必须换框架:容量框架下"放满"是理性的,资源框架下"放满"是自残。

## §1 标称窗口 ≠ 有效上下文:缺口有多大

把"标称窗口"(模型声称支持的 token 数)和"有效上下文"(模型实际能稳定利用的 token 数)分开,是这一节最值钱的区分。多个独立 benchmark 给出的缺口大到令人不安:

| 模型 | 标称窗口 | 有效上下文(估算) | 来源 |
|---|---|---|---|
| GPT-4o | 128K | 约 8K | NoLiMa(Adobe/ICML 2025) |
| Llama 3.1 70B | 128K | 约 64K | RULER + An et al. 2024 |
| ChatGLM | 128K | 约 4K | An et al. 2024 |
| Mixtral | 32K | 32K 时 RULER 仅 44.5/100 | Hsieh et al. COLM 2024 |

**RULER 基准**(Hsieh et al., "RULER: What's the Real Context Size of Your Long-Context Language Models?", arXiv:2404.06654, COLM 2024)以 Llama-2-7B 在 4K 的成绩(85.6 分)为及格线,测了 17 个声称支持长窗口的模型,结论是 **只有约一半能在 32K 长度真正维持满意性能**。同一篇里 GPT-4 从 4K 的 96.6 分跌到 128K 的 81.2 分,Mixtral 从 4K 的 94.9 跌到 128K 的 44.5(来源:[arXiv 2404.06654](https://arxiv.org/abs/2404.06654))。

**NoLiMa**(Modarressi et al., "NoLiMa: Long-Context Evaluation Beyond Literal Matching", ICML 2025)把题目设计成问题与答案"针"之间没有字面重叠,必须靠语义推理才能找到——比传统大海捞针更接近真实业务。结果更刺眼:Claude 3.5 Sonnet 从 1K 的 87.6% 跌到 64K 的 29.8%(跌 57.8 个百分点);Gemini 1.5 Pro 从 92.6% 跌到 48.2%;研究直接给出 GPT-4o 的"实际有效上下文约 8K token"这一结论,尽管它声称 128K(来源:[GitHub adobe-research/NoLiMa](https://github.com/adobe-research/NoLiMa))。

为什么会这样?An et al.("Why Does the Effective Context Length Fall Short?", arXiv:2410.18745, 2024-10)给的根因是:预训练中远距离位置的频率分布严重左倾,模型对远距离 token 的关注能力天生不足;经验规律是 **开源模型的有效上下文长度普遍不超过训练长度的 50%**(来源:[arXiv 2410.18745](https://arxiv.org/abs/2410.18745))。对 PM 的硬意义:**采购页上的"1M token"是营销标称,不是 SLA**。把它写进产品承诺前,先问"我的任务在多长时崩,而不是它最多能塞多长"。

## §2 Lost in the Middle:位置不是中立的

即便 token 都"在窗口里",它们的位置也决定命运。Liu et al.("Lost in the Middle: How Language Models Use Long Contexts", arXiv:2307.03172, TACL 2024)用 20 篇文档的多文档问答测出一条 **U 形曲线**:答案文档在首位或末位时准确率最高(约 75%),挪到第 10 篇(正中间)时跌到约 55%,跌幅约 20 个百分点。所有受测模型(GPT-3.5/4、Claude 1.3、LLaMA-2 等)都有此效应。最反直觉的一条:GPT-3.5-Turbo 在 20–30 篇文档情境下,准确率**低于它的闭卷表现**(56.1%)——给它更多上下文,反而让它更差(来源:[arXiv 2307.03172](https://arxiv.org/abs/2307.03172) | [ACL Anthology TACL 2024](https://aclanthology.org/2024.tacl-1.9/))。

这条曲线在 2025 年还在变形。Chroma 的 context rot 研究(Kelly Hong、Anton Troynikov、Jeff Huber,2025-07-14)测了 18 个前沿模型(Claude Opus 4/Sonnet 4、o3/GPT-4.1、Gemini 2.5 Pro、Qwen3-235B 等),发现 **所有 18 个模型在所有输入长度增量上都出现性能下降,无一例外**;当上下文填过一半,U 形曲线会偏向近期 token(recency bias 增强、primacy bias 减弱);而且只要 1 个干扰项就足以拉低基线,4 个干扰项累积更明显(来源:[trychroma.com/research/context-rot](https://www.trychroma.com/research/context-rot))。

对 PM 的可操作结论:**关键信息要么放头、要么放尾,绝不要埋在中段**;RAG 召回的最相关 chunk 应放在 prompt 的首尾而非中间;"再多塞几个相关文档进去保险一点"在 U 形曲线和干扰项效应下是负收益操作。

## §3 token 预算:把窗口当成要分配的钱

既然有效上下文是稀缺的,正确姿势是像做财务预算一样做 **token 预算**:窗口里每一类内容(系统指令、工具定义、对话历史、RAG 召回、工具输出、agent 状态)都在抢同一笔预算,且边际收益递减、边际干扰递增。LangChain 在 "Context Engineering for Agents"(2025-07-02)里把这套操作归纳成 Write / Select / Compress / Isolate 四策略,并直接类比操作系统管理 CPU 内存(来源:[langchain.com/blog/context-engineering-for-agents](https://www.langchain.com/blog/context-engineering-for-agents))。这正是本专题反复出现的"信息流四去向"决策:一条信息进来,是放 context、外化 memory、走 RAG、还是让 subagent 先消化再回传——本质是预算分配。

工程上已经有实测数据支撑"主动管预算"的回报。Anthropic 的 compaction(`compact_20260112` beta,2026-01 发布,默认 150K 触发)在 100 轮网页搜索评估中把 token 消耗减少 **84%**;Context Editing + Memory Tool 组合让 agent 搜索性能提升 **39%**(来源:[Anthropic Context Management 博客](https://claude.com/blog/context-management))。JetBrains Research(2025-12)在 SWE-bench 上发现,简单地把旧工具结果替换为占位符(observation masking),让 Qwen3-Coder 480B 解决率 +2.6%、成本 -52%;而 LLM 摘要压缩反而让 agent 运行时间增加约 15%(摘要遮盖了停止信号)(来源:[blog.jetbrains.com/research/2025/12/efficient-context-management](https://blog.jetbrains.com/research/2025/12/efficient-context-management/))。这些数字共同说明一件事:**省着花预算的版本,质量和成本都更好**——"装满"是双输。

## §4 判断主轴:"窗口越大越好"会在哪四处把产品坑死

| 症状 | 为什么会错 | 正确做法 | 真实反例 |
|---|---|---|---|
| **把全部文档塞进长窗口,以为比 RAG 省事** | 误用容量框架,忽略有效上下文 ≪ 标称窗口 | 评估任务在有效上下文长度内是否仍准;长则走 RAG 或 Self-Route | GPT-4o 标称 128K,NoLiMa 测得有效约 8K |
| **"换更大窗口的模型"当问答质量银弹** | 标称窗口涨不等于有效上下文涨;还可能引入更严重的 recency/中段塌陷 | 先跑 RULER/NoLiMa 式自测,看你的任务在目标长度的实际分 | Mixtral 32K→128K,RULER 从 85.9 跌到 44.5 |
| **关键信息埋在 prompt 中段** | Lost in the Middle,U 形曲线中段塌陷约 20pp | 关键 chunk 置首尾;召回结果按相关度排到两端 | Liu et al. 2024,中间位置准确率从 75% 跌到 55% |
| **为"用满窗口"而保留全部历史** | 边际 token 价值为负:干扰项 + context rot + 注意力稀释 | 主动 compaction / observation masking / 外化到 memory | Chroma 18 模型全数随长度退化;1 个干扰项即降分 |

这四点共享同一个底层错误:**把"能装"当成"该装",把标称当有效**。把这张表打印出来贴在选型会的墙上。

## §5 产品 PM 视角补盲

工程视角只看"准不准、贵不贵"。三个容易看走眼的产品/商业点:

- **用户心理模型**:用户看到"支持 100 万字上下文"会预期"它读完了全部、且记住了全部"。当模型因 context rot 漏掉中段细节,用户的归因不是"窗口有有效边界",而是"这 AI 不靠谱/在偷懒"——**标称窗口越大,期望落差越大,信任崩得越快**。这是一个营销与体验的反向耦合。
- **商业模式**:长窗口请求按 token 线性计费,而质量随长度衰减。于是出现"花更多钱买更差结果"的反常区间。详见 [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/)——把"窗口预算"当成一条可优化的成本曲线,而不是"上限越高越值"。
- **合规边界**:把全部历史/全部文档塞进窗口,等于把更多敏感数据暴露在单次推理里(尤其多租户、跨用户场景)。"主动预算 + 外化 memory + 按需 RAG"不仅是性能选择,也是数据最小化的合规选择——对 Rick 所在的安全/国际化产品线尤其关键(GDPR 数据最小化原则)。

## §6 对手框架回应

**对手立场一(长上下文派,以 Gemini 团队为代表)**:Gemini 1.5 技术报告(arXiv:2403.05530, Google DeepMind, 2024)实测在大海捞针(NIAH)任务上,文本模态 100% recall 至 530K token、>99.7% recall 至 1M token(来源:[arXiv 2403.05530](https://arxiv.org/pdf/2403.05530))。他们会说:窗口确实越大越能装,本节危言耸听。

**接受 + 边界**:接受单事实精确检索(NIAH)在超长窗口上确实近乎满分,且 EMNLP 2024(Li et al., arXiv:2407.16833)证实资源充足时长上下文平均性能一致高于 RAG。但坚持边界:**NIAH 已被证明太简单**——HELMET(Yen et al., arXiv:2410.02694, 2024-10)指出 NIAH 在 128K 对几乎所有前沿模型已饱和,无法区分能力差异;一旦换成 NoLiMa 的语义推理或多跳任务,同一批模型断崖式下跌。所以"NIAH 满分"不能反驳"有效上下文 ≪ 标称窗口";它只证明了 NIAH 衡量的那一种最简单的能力没退化。

**对手框架二(Rick 未读,破 echo chamber):Gigerenzer 的生态理性(ecological rationality)**。Gigerenzer 主张"少即是多"(less-is-more effect):在不确定环境下,**忽略部分信息的简单启发式常常优于用尽全部信息的复杂模型**,因为多余信息引入的方差大于它消除的偏差。这正是 token 预算的认知科学版本——不是"信息越全决策越好",而是存在一个最优信息量,过之则有害。Lost in the Middle 与 context rot 可被读作 LLM 身上的"less-is-more":喂全反而更差,因为方差(干扰项、注意力稀释)压过了信息增益。这个框架逼问本节的盲点:我们说"主动预算",但 *最优预算点在哪* 仍是经验调参,没有像 Gigerenzer 那样的环境结构理论来预测它——这是本节的开放问题。

**failure scenario**:本节"少即是好"的主张在 **需要全局推理的任务**(如全文一致性审查、跨整本书的角色追踪)上会失效——这类任务的信息确实彼此依赖,激进压缩会丢掉真正需要的关联(Focus Agent 论文 arXiv:2601.07190 就报告迭代精炼类任务中压缩反而增加 110% overhead)。判断边界:稀疏证据检索类任务越压越好,稠密全局推理类任务则需谨慎。

## §7 跨域呼应:Bateson 的"差异"与信息的负价值

跨域调度一个资源:Gregory Bateson 对信息的定义——"a difference that makes a difference"(造成差异的差异)。Bateson 的洞见是,信息的价值不在其绝对量,而在它**是否对当前判断造成了可区分的改变**;不造成差异的"信息"是噪声,而噪声不是中性的,它消耗注意力。

这把本节从"工程经验"提升为"信息论判断":往窗口里多放的那段历史,如果不 make a difference for the next step(呼应 Karpathy 的 "for the next step"),它就不是信息而是噪声,而 context rot 的实验证明这种噪声有**负价值**——它会稀释注意力、增强 recency bias、累积成干扰项。于是"窗口越大越好"的错误本质是:**把数据量误当成信息量**。Bateson 改变了判断:不该问"我还能装多少",而该问"再装这一段,会改变下一步的输出吗?如果不会,它就是要被砍掉的噪声。"这也接住了本专题"信息流四去向"的决策——不 make a difference 的信息,根本不该进 context,应外化或丢弃。详见 0114认识论。

## §8 PM 决策启示

- **面试怎么用**:被问"为什么不直接用 1M 窗口装下所有文档?"——答"标称窗口不是有效上下文,NoLiMa 测得 GPT-4o 有效约 8K,Lost in the Middle 让中段准确率掉 20pp,所以我会按任务的有效长度做 token 预算,稀疏检索走 RAG、全局推理才用长窗口"。30 秒内显出你区分了标称值与有效值。
- **选型怎么用**:别看采购页的标称窗口,跑一次 RULER/NoLiMa 式的自测,画出你自己任务的"长度—准确率"曲线,把崩塌点当作真实 SLA。
- **复现怎么用**:从 observation masking(零推理开销、JetBrains 实测 -52% 成本)起步,再上 compaction;关键 chunk 排到 prompt 首尾;给 agent 显式压缩指令("每 10–15 次工具调用压缩一次",Focus Agent 实验显示被动提示只省 6%、显式提示省 22.7%)。Rick 在 Claude Code 里的一手体感可直接对照:它在约 80% 窗口(~160K)自动触发 compaction,保留架构决策与未解 bug、丢冗余工具输出——这就是"窗口当预算"在产品里的落地形态。

## §9 与已有节点的关系

- 对照 [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/):m209 从**成本**角度论证长 token 的经济代价;本节从**质量**角度论证有效上下文的衰减——二者是同一枚硬币的两面,**升级关系是"补缺"**:m209 告诉你长窗口贵,本节告诉你长窗口还不准,合起来"既贵又差"才是完整的反"越大越好"论证。不复述 m209 的价格表。
- 对照原子卡 [Attention](/kb/基础知识库/attention/) / [KV Cache](/kb/基础知识库/kv-cache/):本节的 context rot、Lost in the Middle 的架构根因(RoPE 长距离衰减、Softmax 注意力稀释)正是 Attention 机制的下游后果——**升级关系是"深化"**:把"注意力是什么"深化为"注意力的物理限制如何变成产品事故"。
- 对照 [c09 - RAG 架构](/kb/基础知识库/c09-rag-架构/) 与 [m204 - RAG 生产环境：Chunking 与范式演进](/kb/工程化与落地架构/m204-rag-生产环境-chunking-与范式演进/):c09/m204 讲 RAG 怎么做;本节讲**为什么"有效上下文有限"是 RAG 仍不可替代的根本理由之一**——**升级关系是"对话"**,把 RAG 从"工程方案"提升到"对抗 context rot 的必要架构"。
- 与本专题 [A01 Context Engineering 概念史与升格](/kb/专题-工程与成本/a01-context-engineering-概念史与升格/):A01 讲范式升格(why),本节讲范式落地的第一性约束(窗口是资源)。与 [m206 - Agent 产品化：记忆机制与技术进展](/kb/工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/):memory layer 正是"窗口装不下"时的外化去向。

## §10 关联节点

**核心(必读)**
- [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/) — 成本侧的同一论证
- [Attention](/kb/基础知识库/attention/) — context rot 的架构根因
- [c09 - RAG 架构](/kb/基础知识库/c09-rag-架构/) — 有效上下文有限 → RAG 不可替代
- [A01 Context Engineering 概念史与升格](/kb/专题-工程与成本/a01-context-engineering-概念史与升格/) — 范式升格背景

**延伸(可选)**
- [KV Cache](/kb/基础知识库/kv-cache/) — 长上下文的算力物理
- [m204 - RAG 生产环境：Chunking 与范式演进](/kb/工程化与落地架构/m204-rag-生产环境-chunking-与范式演进/) — Chunking 与 Contextual Retrieval
- [m206 - Agent 产品化：记忆机制与技术进展](/kb/工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/) — 外化 memory 去向
- [Prompt Caching](/kb/基础知识库/prompt-caching/) — 预算管理与缓存的交互
- [m201 - Prompt Engineering 实战体系](/kb/工程化与落地架构/m201-prompt-engineering-实战体系/) — Prompt 压缩(LLMLingua)
- 0114认识论 — Bateson 信息观
- [幻觉](/kb/基础知识库/幻觉/) — 相关无关事实最大化幻觉率
- [Claude Code](/kb/ai-公司与产品/claude-code/) — 自动 compaction 的一手体感
- [Gemini](/kb/ai-公司与产品/gemini/) — 长上下文派的实证
- [AI PM 知识图谱·总索引](/kb/ai-pm-知识图谱/ai-pm-知识图谱-总索引/)

## 修订日志
- 2026-06-07 R1:首稿。建立"标称 vs 有效"双值框架,落地 RULER/NoLiMa/Lost-in-the-Middle/context rot 四组实证,判断主轴四件套表,Gemini NIAH 与 Gigerenzer 生态理性双对手框架,Bateson 信息观跨域呼应,与 m209/Attention/c09 三类升级对照。

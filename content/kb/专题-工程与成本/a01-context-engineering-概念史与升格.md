---
title: A01 Context Engineering 概念史与升格
cluster: 专题 · 工程与成本
created: '2026-06-07'
updated: '2026-06-11'
provenance: ai
facet: 上下文工程
---

把 Context Engineering 当成"把提示词写漂亮一点"，是这一整套专题想拆掉的第一个误解。本节点要解决的问题不是"CE 是什么"，而是一个更尖锐的判断题:**一个 2025 年才在推特上被命名的术语，凭什么配得上"the new full-stack skill"这种规格的称呼,而不是又一轮 prompt engineering 式的炒作?** 视角:概念史 + 范式升格判定——用"它升高了哪个抽象层"而不是"它有没有新名字"来裁决这场升格是真升格还是换皮。

## §0 为什么用"抽象层升格"框架,而不是"新词 vs 旧词"框架

读到"context engineering"这个词,90% 的人脑子里会自动跳出两个默认框架,而这两个都会把判断带偏。

第一个错误框架是**"营销改名论"**:既然 prompt engineering 被炒糊了,换个更高级的名字接着卖,本质没变。这个框架的吸引力在于它确实抓住了部分真相——Simon Willison 自己都承认,术语替换的一大动因就是 prompt engineering 已经被污名化成"在聊天框里乱敲字的小技巧"(来源:[Simon Willison, "Context engineering", 2025-06-27](https://simonwillison.net/2025/Jun/27/context-engineering/))。但如果停在这里,你会得出"不必认真对待"的结论,然后在选型会上被一个真正懂 CE 的人按在地上摩擦。

第二个错误框架是**"技能进阶论"**:prompt engineering 是初级,context engineering 是高级,学会前者再学后者。这个框架更隐蔽地有害,因为它假设两者在同一条技能直线上,只是熟练度不同。实际上,Karpathy 把 prompt 定义为"你日常给 LLM 的简短任务描述",把 context engineering 定义为"在每个工业级 LLM 应用里,用恰到好处的信息填充上下文窗口的精细艺术与科学"(来源:[Andrej Karpathy on X, 2025-06-25](https://x.com/karpathy/status/1937902205765607626))——这是两个不同**对象**上的工作:前者操作的是"一句话",后者操作的是"整个 token 空间"。不是熟练度差异,是操作对象的维度差异。

本节点采用的是**抽象层升格框架**:判断一个术语是否构成范式升格,不看它有没有新名字、有没有新技术,而看它有没有把工程的操作对象抬高一个抽象层级。从这个框架看,CE 的命门很清楚——prompt engineering 的对象是"一段静态文本",CE 的对象是"一个在推理全程动态变化的信息流系统"。这不是把同一件事做得更好,是换了一件事来做。Anthropic 把它定义为"在推理时刻策展并维护最优 token 集合"(来源:[Anthropic, "Effective Context Engineering for AI Agents", 2025-09-29](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)),注意"维护"和"推理时刻"两个词:它承认这是一个有时间维度、需要持续运维的对象。

## §1 概念史:一条 2025 年夏天的引爆曲线

CE 的命名史短得惊人,这恰恰是判断它的关键证据之一——它不是学界十年磨一剑的概念,是工业界在 agent 时代撞墙后被迫造出来的词。

- **2025-06-19,Tobi Lütke(Shopify CEO)发推**:"我真的更喜欢 'context engineering' 这个词胜过 prompt engineering。它更好地描述了核心技能:为任务提供所有上下文、使其能被 LLM 合理解决的艺术。"这条推获得约 190 万次浏览(来源:[x.com/tobi/status/1935533422589399127](https://x.com/tobi/status/1935533422589399127))。Lütke 并非首创此词,但他公开背书引爆了传播。
- **2025-06-25,Andrej Karpathy +1 并给出严谨定义**(见 §0 引述,约 230 万次浏览)。Karpathy 此前在 2025-06-17 的 YC AI Startup School 演讲 "Software is Changing (Again)" 中已铺垫了相关框架(来源:[YouTube](https://www.youtube.com/watch?v=LCEmiRjPEtQ))。
- **2025-06-27,Simon Willison 撰文梳理定义**,点明术语替换的社会动因是逃离污名化联想。
- **2025-07-02,LangChain 发布 "Context Engineering for Agents"**,把它系统化为四大操作策略 **Write / Select / Compress / Isolate**,并类比成操作系统管理 CPU 内存的角色(来源:[langchain.com/blog/context-engineering-for-agents](https://www.langchain.com/blog/context-engineering-for-agents))。
- **2025-09-29,Anthropic 发布正式技术文章**,提出 **context rot**(上下文腐化)概念:随 token 累积,注意力稀释导致模型表现退化。
- **学术系统化**:Lingrui Mei 等 15 位作者的综述 "A Survey of Context Engineering for Large Language Models" 于 2025-07-17 提交 arXiv,分析 1400+ 篇论文、166 页(来源:[arXiv:2507.13334](https://arxiv.org/abs/2507.13334));Qishuo Hua 等的 "Context Engineering 2.0" 于 2025-10 提出"熵减"框架——把高熵的人类意图转化为低熵的机器可理解格式(来源:[arXiv:2510.26493](https://arxiv.org/abs/2510.26493))。

时间线本身就是一个判断:**从一条推文到一篇 166 页综述,只用了不到一个月**。这个速度不是学界孕育新概念的速度,是工业界给一个早已存在、却苦于无名的实践打补丁的速度。

## §2 升格的实质:四个维度的对象迁移

把 prompt engineering 和 context engineering 放在四个维度上对照,才能看清"升格"到底升的是什么(对照综合自 Karpathy、Anthropic、LangChain 三方定义):

| 维度 | Prompt Engineering | Context Engineering |
|---|---|---|
| **操作对象** | 单次指令文本 | 整个 token 空间(系统指令+工具定义+外部数据+消息历史) |
| **时态** | 静态(调用前写好) | 动态(推理过程持续优化) |
| **典型产物** | system prompt、few-shot 示例 | RAG 检索、memory layer、工具输出裁剪、subagent 架构 |
| **核心问题** | "这句话怎么写?" | "哪些 token 此刻应该在窗口里?" |
| **关系** | — | prompt engineering 是其真子集 |

关键在最后一行:**prompt engineering 没有被取代,它被降格成了 CE 的一个子集**。写好 system prompt 仍然重要,但它现在只是"决定哪些 token 进窗口"这个更大决策里的一个分支。这正是"把 CE 当写好提示词"之所以是降维误解的精确含义——你把一个父集当成了它的某个子集来理解。

## §3 为什么偏偏是 2024–2025 升格

升格的时机不是偶然,有四个可确证的结构性驱动力同时到位:

1. **Agent 时代到来**——单轮对话变成多步 agent 执行,context window 在任务过程中**动态变化**。prompt 的一次性设计无法应对一个会自己调工具、读文件、改写历史的循环。这是最根本的驱动力:CE 本质是 agent 的副产物。
2. **长上下文窗口普及**——128K 到 1M token 的窗口,使"放什么进去"变成了比"怎么写"更关键的问题。窗口大了,反而需要更克制地填。
3. **术语污名化压力**——"prompt engineer"在 2023 年被过度炒作后遭质疑,需要一个更准确、不带轻佻联想的替代词。
4. **生产系统复杂化**——工业级 LLM 应用里,人工写的 prompt 可能只占总 token 的极小比例,其余全是对话历史、RAG 结果、工具输出、agent 状态。当你管理的 token 里只有 5% 是你"写"的,"写提示词"这个描述就彻底失真了。

这四条里,第 1 条和第 4 条是真正的硬驱动(技术结构变了),第 2、3 条是助推(条件成熟 + 社会动因)。一个诚实的判断:**如果没有 agent,CE 大概率不会作为独立概念出现**——这也是它和 [Agent](/kb/基础知识库/agent/) 专题(0411)的根本关系:Agent 回答"怎么分工",CE 回答"怎么管信息流",后者是前者运转起来后必然暴露的工程问题。

## §4 判断主轴:把 CE 当"写好提示词"会犯的四个错

这是本节点的命门。下面四个误区,每一个都来自把 CE 降维理解成 prompt engineering 的子集:

**误区一:以为"窗口越大越省心,塞进去就行"。**
- 症状:拿到 1M 窗口的模型,把整个知识库、全部历史、所有文档一股脑塞进去,以为信息越全模型越准。
- 为什么会错:这是 prompt 思维的残留——prompt 时代信息是稀缺的,多给总比少给好。但 CE 时代信息是过载的,context rot 是真实的:Chroma 2025-07 测试 18 个前沿模型(含 Claude Opus 4、GPT-4.1、Gemini 2.5 Pro、Qwen3-235B),**无一例外**地随输入长度增加而性能下降(来源:[Chroma, "Context Rot", 2025-07-14](https://www.trychroma.com/research/context-rot))。
- 正确做法:Anthropic 的原则——"找到最小的高信号 token 集合,最大化期望结果"。窗口是需要主动管理的**资源**,不是越大越好的容器。
- 真实反例:Liu et al. 2023(TACL 2024)的 "Lost in the Middle":GPT-3.5-Turbo 在 20–30 篇文档情境下的准确率(约 56%)**低于其闭卷表现**——给更多上下文反而更差(来源:[arXiv:2307.03172](https://arxiv.org/abs/2307.03172))。

**误区二:以为 CE 是"调用前一次性写好"的活儿。**
- 症状:把 CE 当成写一份更长更细的 system prompt,交付后就不管了。
- 为什么会错:CE 的时态是动态的。在一个 100 步的 agent 任务里,第 50 步窗口里该有什么,取决于前 49 步发生了什么。这是运维,不是撰写。
- 正确做法:把信息流的四去向当成**持续决策**——某条信息是放 context、外化到 memory、走 RAG 检索、还是让 subagent 先消化再回传?这个决策在任务全程反复发生。
- 真实反例:Anthropic 的 compaction 策略(`compact_20260112`,2026-01 beta)在默认 150K token 阈值触发摘要压缩,在 100 轮网页搜索评估中 token 消耗减少 84%(来源:[Anthropic Compaction 文档](https://platform.claude.com/docs/en/build-with-claude/compaction))——这是推理过程中的动态压缩,不是事前撰写。

**误区三:以为"CE = 把 prompt 写得更结构化"。**
- 症状:学了 XML 标签、few-shot、CoT,就以为掌握了 CE。
- 为什么会错:这些全是 prompt engineering 的内容,是 CE 的一个子模块。CE 真正的新内容是 memory layer、信息流路由、subagent 上下文隔离、检索 vs 内联的取舍——这些在 prompt 框架里根本不存在。
- 正确做法:把 memory 当一等公民。Anthropic 的 Memory Tool(`memory_20250818`)+ Context Editing 组合,使 agent 搜索性能提升 39%(来源:[Anthropic, "Context Management"](https://claude.com/blog/context-management))——这种收益是任何"写好提示词"都拿不到的,因为它来自一个全新的架构层。
- 真实反例:MemGPT(arXiv:2310.08560,UC Berkeley 2023)把 OS 的内存分层(RAM/磁盘)类比映射到 LLM,让模型自己用工具调用驱动数据在层间移动——这是架构创新,不是提示词技巧。

**误区四:以为 CE 是个人技能,不是系统工程。**
- 症状:把 CE 写进个人简历的"擅长 prompt 调优"一栏。
- 为什么会错:"the new full-stack skill" 这个说法的重点在 **full-stack**——它横跨检索层(RAG)、存储层(memory)、编排层(subagent)、推理层(compaction)。这是一个团队的系统能力,不是一个人的话术技巧。
- 正确做法:把 CE 当成和数据库设计、缓存策略同级的系统工程能力来配置团队和评估候选人。
- 真实反例:LangChain 把 CE 类比成操作系统管理 CPU 内存——你不会说"管理内存"是某个程序员的话术技巧,它是系统级的资源调度。

## §5 产品 PM 视角补盲

工程视角之外,PM 容易看走眼三处:

1. **招聘 JD 的语义滑变陷阱**。2026 年的 JD 开始写"熟悉 context engineering",但 80% 的招聘方自己把它理解成误区三(=写好提示词)。面试时如果你按 CE 的真实定义(信息流系统管理)回答,可能反而被误以为"答非所问"。**对策**:先用一句话校准对方的定义("您说的 CE 是指 prompt 优化,还是包含 memory/RAG/subagent 的整体信息流设计?"),再据此作答。
2. **商业模式的隐含成本**。CE 做得好不好,直接体现在 token 账单上。误区一(窗口塞满)在 demo 阶段看不出问题,上线后按量计费时会变成成本灾难。PM 在做单位经济模型时,必须把"context 管理质量"当成一个成本变量,而不是假设它是免费的。
3. **用户心理模型错位**。用户不知道也不关心 context window 的存在,他们的心理模型是"AI 应该记得我们之前聊过的一切"。当 agent 因为 context 被压缩而"忘了"早先的对话,用户体验到的是"这 AI 变笨了/不专业",而非"窗口满了"。memory layer 的产品价值,本质是在**弥合用户的"无限记忆"预期与模型的"有限窗口"现实**之间的落差。

## §6 对手框架回应:这是不是又一次换皮?

**接受 + 边界**,不是反驳。

业界最强的反方声音来自 Hacker News 和部分 OpenAI 社区:"context engineering 不过是多数人早就在做的东西,只是换了个名字"(来源:[news.ycombinator.com/item?id=44464219](https://news.ycombinator.com/item?id=44464219));更尖锐的版本认为,连这个术语本身都会短命,很快被 "automated workflow architecture" 取代。

**接受它对的部分**:这个批评抓住了真相的一半——CE 确实没有发明任何全新技术,RAG、memory management、prompt 优化都先于这个词存在。如果你期待 CE 带来一项 2025 年才诞生的黑科技,你会失望。Simon Willison 的辩护恰恰承认了这点:术语替换的价值"在于从错误的联想中逃脱,而非宣称发现了新技术"。

**但坚持的边界**:批评者混淆了"没有新技术"和"没有新抽象层"。命名一个抽象层,本身就是工程进步——就像"DevOps"没发明任何新工具,却重组了对一整类问题的认知。CE 把原本散落在 RAG、memory、prompt、agent 各处的决策,统一到"如何管理推理时刻的 token 集合"这一个问题之下。Anthropic 团队的反驳更具体:context rot 这类工程挑战是 agent 时代**新出现**的,长上下文窗口普及之前根本不构成问题,这不是简单重命名。

**我赌的是什么(本节点的赌注)**:我赌 CE 作为抽象层会存活下来,即便"context engineering"这个具体词汇可能被更好的词替代。理由是驱动它的两个硬结构(agent 化 + 信息过载)不会逆转。**但我承认我可能错在哪**:如果未来模型的有效上下文真的逼近标称窗口、context rot 被架构革新消除(STRING 等 RoPE 变体在研究中),那么"主动管理窗口"这件事的工程价值会大幅缩水,CE 可能退化回一个边缘技巧。这是个押在"架构缺陷短期内无法根治"上的赌注——而当前证据(context rot 被归因于 RoPE 长距离衰减这一架构属性)支持这个赌注,但不保证它永远成立。

> [!warning] failure scenario
> 本节点"CE 是真升格"的判断,在一种场景下会失效:如果你的产品是**单轮、短上下文、无 agent** 的简单 LLM 调用(如一个固定模板的文案生成器),那么 CE 对你就是过度工程——此时把它当"写好提示词"反而是正确的简化,而非误解。CE 的价值随 agent 复杂度和上下文长度单调上升,在低复杂度场景趋近于零。

## §7 跨域呼应:Kuhn 的"不可通约性"作为升格的裁判

判断 CE 是真升格还是换皮,我调度 范式 概念背后的 Kuhn 框架——但用法要小心,不能空喊。

Kuhn 的 paradigm shift 有一个常被忽略的判据:**不可通约性(incommensurability)**——新旧范式之间,有些问题在旧范式里根本无法表述。用这把尺子量 CE:在 prompt engineering 的框架里,"context rot""信息流四去向""memory 作为一等公民"这些问题**根本提不出来**,因为 prompt 框架的对象是静态文本,它没有词汇去描述一个动态变化的 token 系统的退化。这正是不可通约性的标志——不是新答案,是连问题都无法在旧框架里被提出。

但 Kuhn 也给了我一个反向的警告(这才是跨域呼应该做的事——改变判断,而不是装饰):Kuhn 强调范式转移需要**危机**作为前提,常规科学不会自己升格。套到 CE 上,这意味着我应该警惕:**如果没有真实的工程危机,CE 就只是营销**。而危机是真的——context rot 的全模型普遍性(Chroma 18 模型无一幸免)、有效上下文远低于标称窗口(NoLiMa 测得 GPT-4o 实际有效约 8K,尽管标称 128K,来源:[arXiv:2410.18745](https://arxiv.org/abs/2410.18745) 及 NoLiMa)——这些是 prompt 框架解释不了、也解决不了的反常。有反常、有不可通约性,Kuhn 的双重判据都满足,我才敢下"真升格"的判断,而非"我觉得它很重要"的直觉。这与 0114认识论 里"如何判定一个概念是真知识还是流行话术"的关切直接相连。

## §8 PM 决策启示

- **面试怎么用**:被问"你怎么理解 context engineering"时,先做框架校准(§5),再用"对象升格"一句话定调:"它不是把提示词写好,是把单次文本工程升级成了对推理全程 token 流的系统管理,prompt engineering 是它的子集。" 然后举 context rot 作为它无法被还原为 prompt 技巧的证据。
- **选型怎么用**:评估一个 agent 平台时,别看它的 prompt 编辑器多花哨,看它有没有 memory layer、有没有 context compaction 策略、subagent 上下文是否隔离——这三项才是 CE 能力的真实指标。
- **复现怎么用**:在 [Claude Code](/kb/ai-公司与产品/claude-code/) 里你已经天天在做 CE 而不自知——CLAUDE.md 是持久化的 context 注入,80% 窗口自动 compaction 是动态管理,subagent 是上下文隔离。下次写 CLAUDE.md 时,把它当"context 资源调度"而非"给 AI 的说明书"来设计,会更有意识。

> [!note] E01 一手体感
> 作为 Claude Code/CLAUDE.md 深度用户,我对"CE 不是写好提示词"最直接的体感来自一次反直觉的发现:**把 CLAUDE.md 写得越长越细,Claude Code 反而越容易跑偏**——因为长 CLAUDE.md 挤占了任务推理所需的窗口,触发 context rot。真正有效的做法是把 CLAUDE.md 压到最小高信号集合,把细节外化到 memory 文件按需读取。这就是误区一在我自己工作流里的活体标本:窗口是资源,不是容器。

## §9 与已有节点的关系

本节点与 [m201 - Prompt Engineering 实战体系](/kb/工程化与落地架构/m201-prompt-engineering-实战体系/) 是**升格对照**关系——m201 讲透了 prompt engineering 的实战体系(zero-shot/few-shot/CoT/structured prompting/prompt 压缩),本节点不复述这些内容,而是论证一件 m201 框架内无法论证的事:**m201 讲的整个体系,是 CE 这个更大对象的一个子集**。m201 §2.1.3 的 prompt 压缩(LLMLingua)在 CE 视角下,只是"信息流四去向"里"压缩后放 context"这一条分支;m201 的 system prompt 四原则,在 CE 视角下,只是"决定哪些 token 进窗口"决策树的一个叶子。两者的关系不是并列或递进,是**包含**——这正是把 CE 误读为 prompt engineering 子集时被颠倒的关系。读完 m201 再读本节点,应该获得的认知升级是:你之前学的所有 prompt 技巧没有过时,但它们的**坐标系**变了。

本节点也是整个 0417 专题的认知地基:后续节点对 context window 限制(对应上下文真实限制的剖面)、memory layer、信息流路由、subagent 隔离的展开,全都预设了本节点确立的"CE 是动态信息流系统管理"这一基本判断。

## 关联节点

**核心(必读)**
- [m201 - Prompt Engineering 实战体系](/kb/工程化与落地架构/m201-prompt-engineering-实战体系/) — 本节点升格对照的直接对象;CE 视角下它讲的体系是子集
- [Agent](/kb/基础知识库/agent/) — CE 是 agent 化的必然副产物;Agent 管分工,CE 管信息流
- [m206 - Agent 产品化：记忆机制与技术进展](/kb/工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/) — memory layer 作为一等公民的工程实现
- [Claude Code](/kb/ai-公司与产品/claude-code/) — Rick 的一手 CE 实践场;CLAUDE.md = 持久化 context 注入
- 0114认识论 — "如何判定真知识 vs 流行话术"的判据来源

**延伸(可选)**
- [c09 - RAG 架构](/kb/基础知识库/c09-rag-架构/) — 信息流四去向之"走 RAG"的架构基础
- [m203 - RAG 生产环境：Embedding 与文档解析](/kb/工程化与落地架构/m203-rag-生产环境-embedding-与文档解析/) — 检索作为 CE 的一个信息源
- [m204 - RAG 生产环境：Chunking 与范式演进](/kb/工程化与落地架构/m204-rag-生产环境-chunking-与范式演进/) — Contextual Retrieval 本质也是 chunk 级 context 工程
- [m205 - RAG 生产环境：索引运维与评估体系](/kb/工程化与落地架构/m205-rag-生产环境-索引运维与评估体系/) — RAG 信息源的质量验证
- [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/) — context 管理质量直接决定 token 成本
- [RAG](/kb/基础知识库/rag/) [Embedding](/kb/基础知识库/embedding/) [KV Cache](/kb/基础知识库/kv-cache/) [Prompt Caching](/kb/基础知识库/prompt-caching/) [Attention](/kb/基础知识库/attention/) [幻觉](/kb/基础知识库/幻觉/) — 原子概念支撑
- [Gemini](/kb/ai-公司与产品/gemini/) [Claude](/kb/ai-公司与产品/claude/) — 长上下文窗口的代表性产品
- [AI PM 知识图谱·总索引](/kb/ai-pm-知识图谱/ai-pm-知识图谱-总索引/) — 全局坐标

## 修订日志
- R1 (2026-06-07):首稿。确立"抽象层升格"框架挡掉"换皮论/技能进阶论"两个默认错误框架;概念史时间线接地至 Lütke/Karpathy/Anthropic 原始来源;判断主轴四误区四件套;Kuhn 不可通约性 + 危机双判据作为升格裁判;E01 CLAUDE.md 一手体感;与 m201 的"包含"而非"递进"关系定调。

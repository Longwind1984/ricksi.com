---
title: A02 Context Prompt Memory RAG 辨析
cluster: 专题 · 工程与成本
created: '2026-06-07'
updated: '2026-06-11'
provenance: ai
facet: 上下文工程
---

四个词被互换着用——"我们做了 prompt engineering""加个 RAG""给 agent 上 memory""优化一下 context"——但它们处在**不同的抽象层**，混用会导致信息流设计的系统性错位:把本该外化进 memory 的东西硬塞进 prompt,把本该走 RAG 的语料一次性灌进 context window,把 subagent 该消化的探索史堆在主线程里。本节点的任务不是给四个词下定义,而是给它们排座次——用一张**层级与分工矩阵**,把"哪个词管哪一段信息流"钉死,让 PM 在选型会上听到这四个词时,能立刻反问:"你说的是哪一层?"

## §0 为什么用"层级矩阵"框架,而不是"四个并列概念"框架

最常见的错误框架,是把 Context / Prompt / Memory / RAG 当成四个**平级、可替换**的技术选项——好像在问"这次我们用 prompt 还是用 RAG"。这是范畴错误(category mistake)。

正确的框架是:**Context 是容器,Prompt / Memory / RAG 是往容器里送货的三种渠道**。Karpathy 给 context engineering 下的定义说得很清楚——它是"the delicate art and science of filling the context window with just the right information for the next step"(来源:[Karpathy on X](https://x.com/karpathy/status/1937902205765607626),2025-06-25)。注意"filling the context window"这个动词:context window 是被填充的对象,prompt / memory / RAG 是填充它的不同手段。Anthropic 的定义同样把 context 定位为容器:"curating and maintaining the optimal set of tokens at inference time",其中包含系统指令、工具定义、外部数据、消息历史的整体(来源:[Anthropic Engineering Blog, "Effective Context Engineering for AI Agents"](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents),2025-09-29)。

所以这四个词不是"四选一",而是**一个容器 + 三条供货链**。把它们摆成并列选项,等于把"冰箱"和"超市配送/自家腌菜/外卖"摆成并列选项——问的层级根本不对。本节用矩阵把这层关系固化。

## §1 四词层级矩阵:容器 vs 渠道,时态,持久性

| 维度 | **Context(上下文)** | **Prompt(提示)** | **Memory(记忆)** | **RAG(检索增强)** |
|---|---|---|---|---|
| **本体** | 容器(context window 这块 token 空间本身) | 渠道:人工预写的指令文本 | 渠道:跨会话持久化的状态 | 渠道:按需检索的外部语料 |
| **抽象层** | 最高层(管"窗口里此刻有什么") | 最具体(管"这句话怎么写") | 中层(管"什么该跨会话留下") | 中层(管"什么该外置、用时再取") |
| **时态** | 动态,推理全程持续变化 | 静态,调用前写好 | 长期,跨会话累积/衰减 | 按需,query 触发时取回 |
| **持久性** | 会话内(窗口关闭即消失) | 模板级(版本管理,相对稳定) | 跨会话(向量库/文件/图) | 索引级(语料库独立于会话存在) |
| **核心问题** | "哪些 token 此刻该在窗口里?" | "这条指令怎么写最准?" | "什么值得跨会话记住?" | "什么不该常驻、用时再拉?" |
| **典型产物** | 整个 token 预算的分配方案 | system prompt、few-shot 示例 | `/memories` 目录、用户画像、`CLAUDE.md` | 向量索引 + chunk + reranker |
| **失效表征** | context rot、lost in the middle | 指令冲突、注入攻击 | 时效幻觉、冲突记忆 | 检索不命中、chunk 切坏 |

读这张表的正确姿势:**从上往下是抽象层降低**。Context 在最高层——它问"窗口里此刻该有什么";Prompt / Memory / RAG 是三种回答"该有什么"的来源,各自管一段不同时态的信息流。Prompt 是你**预先写死**的(调用前),Memory 是**跨会话沉淀**下来的(会话之间),RAG 是**用时现取**的(query 触发)。三条渠道的产物最终都汇入同一个 context window,由 context engineering 统筹"哪段进、占多少 token、放窗口哪个位置"。

这也解释了为什么 prompt engineering 是 context engineering 的**子集**而非对手:写 system prompt 只是"填充容器的一种手段",而填充容器还包括决定要不要拉 RAG、要不要读 memory、要不要让 subagent 先消化。Simon Willison 整理这场术语更替时点破了社会动因:prompt engineering 已被污名化为"在聊天框里乱敲文字的技巧",而 context engineering 更准确地描述了生产级应用的实质工作——它不是发现了新技术,而是"从错误的联想中逃脱"(来源:[Simon Willison's Weblog](https://simonwillison.net/2025/Jun/27/context-engineering/),2025-06-27)。

## §2 信息流四去向:同一块内容,该走哪条渠道

四个词的分工不是抽象的,落到工程上就是一个**路由决策**:手上这块信息(一份长文档、一段对话历史、一条用户偏好、一次工具调用结果),该往哪儿放?这是本专题的核心命题之一——信息流四去向决策。

| 信息的特征 | 应走的渠道 | 理由 | 走错的后果 |
|---|---|---|---|
| 每次调用都必需、稳定不变的指令 | **Prompt**(写进 system prompt) | 稳定前缀可被 [Prompt Caching](/kb/基础知识库/prompt-caching/) 命中,省钱 | 写进 RAG 反而每次检索、引入不命中风险 |
| 跨会话要记住的用户状态/决策 | **Memory**(外化到文件/向量库) | 会话结束不丢;context 窗口关了就没了 | 塞进 prompt 会让前缀膨胀且无法跨会话 |
| 体量大、用时才需、会过时的语料 | **RAG**(外置索引,用时检索) | 避免常驻挤占 token、避免静态信息过时 | 一次性灌进 context → token 爆炸 + context rot |
| 探索性、中间过程、可丢弃的细节 | **Subagent 先消化回传** | 子 agent 独立窗口探索,主线程只收摘要 | 堆在主线程 → 窗口被 `ls` 输出之类垃圾填满 |

第四行值得展开:让 subagent 先消化再回传,本质是**用一个隔离的 context window 换主线程的 token 预算**。子 agent 的探索全过程(几十次工具调用、几千行输出)不必进主 agent 历史,主 agent 只接收最终压缩摘要,从而延迟主窗口耗尽的时间——这是 Claude Code 子 agent 系统的设计逻辑。但这条渠道有代价,见 §4 的对手框架回应。

> [!note] PM 体感(E01 一手):我在用 Claude Code 时反复踩的坑,正是"四去向走错"。早期我把项目背景、编码规范、待办全堆进对话开头(当 prompt 用),结果几轮压缩后规范丢了。后来才学会:**稳定规范进 `CLAUDE.md`(prompt 层)、跨会话状态进 `/memories`(memory 层)、大型代码库靠工具按需读(RAG 式)、复杂子任务派 subagent**。Anthropic 自己的告诫一针见血:**必须放进 `CLAUDE.md` 的内容,不要指望压缩会保留它——假设它不会被保留**(来源:[Anthropic Context Engineering Cookbook](https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools))。这就是把"必需指令"和"可丢弃过程"放错层的直接教训。

## §3 判断主轴:四词混用导致信息流设计混乱的四个高频错位

90% 的团队在这四个词上栽跟头,不是因为不懂某个技术,而是因为**把它们当同义词混用**,导致信息流路由失控。逐个拆解。

**错位一:把 Memory 当 Prompt 用(该外化的硬塞进窗口)**
- 症状:把用户的历史偏好、过往决策全部拼进 system prompt,prompt 越来越长,跨会话还得手动重拼。
- 为什么会错:误以为"让模型记住"="写进 prompt"。但 prompt 是静态模板,不具备跨会话持久性。
- 正确做法:跨会话状态外化进 memory layer(文件或向量库),用时再注入。MemGPT 论文给出的范式就是把 OS 内存分层(RAM/磁盘)映射过来:main context(等价 RAM)放当前必需,external context(等价磁盘)放可换出的记忆,由模型自己用工具调用(`core_memory_append`、`archival_memory_search`)驱动数据在层间搬运(来源:[MemGPT, arXiv:2310.08560](https://arxiv.org/abs/2310.08560),UC Berkeley,2023-10)。
- 真实反例:Anthropic 实测,Memory Tool(`memory_20250818`)+ Context Editing 组合让 agent 搜索性能比基线提升 **39%**(来源:[Anthropic Context Management 博客](https://claude.com/blog/context-management))。把记忆外化不是"少装东西",是性能优化。

**错位二:把 RAG 当 Context 用(把整个语料一次性灌进窗口)**
- 症状:"反正窗口有 1M token,把整个知识库塞进去不就行了?"
- 为什么会错:误以为 context window 越大越能装,忽视了"有效上下文"远小于标称窗口。
- 正确做法:体量大的语料走 RAG 外置检索,只把命中的 chunk 注入。
- 真实反例:NoLiMa benchmark(Adobe/ICML 2025)显示,Claude 3.5 Sonnet 在语义检索任务上从 1K 的 87.6% 跌到 64K 的 29.8%(降 57.8 个百分点);研究还估算 GPT-4o 标称 128K,**实际有效上下文约 8K token**(来源:[GitHub adobe-research/NoLiMa](https://github.com/adobe-research/NoLiMa))。RULER benchmark(NVIDIA,COLM 2024)同样发现,17 个声称长窗口的模型里**只有 4 个能在 32K 维持及格性能**;Mixtral 标称 32K,128K 时得分仅 44.5/100(来源:[RULER, arXiv:2404.06654](https://arxiv.org/abs/2404.06654))。"窗口大就能灌"是被基准反复证伪的幻觉。

**错位三:把 Prompt 当 Context 的全部(只调 prompt,不管窗口里其余 token)**
- 症状:agent 表现不好,团队第一反应是"再调调 prompt",反复改措辞,无视窗口里堆积的工具输出、对话历史。
- 为什么会错:停留在 prompt engineering 的旧框架,没意识到工业级应用里 prompt 可能只占总 token 的极小比例,其余是历史、RAG 结果、工具输出、agent 状态。
- 正确做法:把视角抬到整个 token 预算——这正是 context engineering 升格的原因。Anthropic 的核心建议是"find the smallest set of high-signal tokens that maximize desired outcomes"(找到最小的高信号 token 集合)(来源:[Anthropic Engineering Blog](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents))。
- 真实反例:context rot——Chroma(2025-07-14)测了 18 个前沿模型,**全部**在输入变长时性能单调下降,无一例外(来源:[Chroma context rot 研究](https://www.trychroma.com/research/context-rot))。光改 prompt 措辞,救不了一个被垃圾 token 撑爆的窗口。

**错位四:把"该派 subagent"的活留在主线程(不隔离上下文)**
- 症状:一个复杂任务,主 agent 自己一路探索到底,几十次工具调用全堆在主窗口,很快触发压缩,关键决策被摘要吞掉。
- 为什么会错:不知道 subagent 隔离是一条独立的信息流渠道。
- 正确做法:把探索性子任务派给 subagent,主线程只收回压缩摘要。
- 真实反例(也是边界):Focus Agent 实验(arXiv:2601.07190)显示,agent 自主把探索史压缩进持久化 Knowledge Block 可减少 22.7% token 而准确率不变——但**必须显式提示"每 10-15 次工具调用压缩一次",被动提示仅省 6%**;当前 LLM 在无脚手架时不会自然优化上下文效率(来源:[arXiv:2601.07190](https://arxiv.org/html/2601.07190v1))。隔离不是免费的,要主动设计。

## §4 产品 PM 视角补盲:四词混用的非工程代价

跳出工程视角,四词混用还有三个 PM 容易看走眼的点:

1. **招聘与组织盲点**:JD 写"精通 prompt engineering"和"精通 context engineering"招的是两类人。前者偏文案/调试,后者偏系统/架构。混用术语会招错人——把一个会写 few-shot 的人放到要设计 memory layer + RAG 路由的岗位上。术语的层级混乱直接变成组织能力的错配。

2. **成本结构盲点**:四条渠道的**计费模型完全不同**。Prompt 走稳定前缀,能吃满 [Prompt Caching](/kb/基础知识库/prompt-caching/)(缓存命中只需 0.1x 基础价,5 分钟档首次命中即回本);RAG 是检索成本 + 少量注入 token;Memory 是存储 + 读写;一次性灌满 context 则是**每次都按全量 token 计费**。把语料当 context 灌,不只是质量问题,是把一笔本可缓存/外置的成本变成了每次调用的固定开销。详见 [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/)。

3. **合规与数据边界盲点**:Memory 跨会话持久化用户数据,涉及"记什么、存哪、何时删、谁能读"的隐私合规问题;RAG 的语料库有访问权限边界;而 prompt 和会话内 context 是"用完即焚"。把该进受控 memory 的 PII 顺手拼进 prompt 或留在临时 context,等于绕过了数据治理。对做国际化产品的团队(GDPR 等),这是实打实的合规风险,不是技术洁癖。

## §5 对手框架回应:接受 + 边界

**对手立场一:"context engineering 不过是给 RAG + memory management 换了个名,没有新增实质内容。"**(代表声音:Hacker News 上的批评,来源:[news.ycombinator.com/item?id=44464219](https://news.ycombinator.com/item?id=44464219);OpenAI 社区甚至有帖子认为这个词本身也会被"automated workflow architecture"取代。)

接受其对的部分:确实,RAG、memory 这些技术早已存在,context engineering 没有发明新算法,本节的矩阵也承认它们是既有渠道。**但坚持的边界是**:命名一个统筹层有独立价值。在没有"context"这个容器概念之前,团队会把 prompt / memory / RAG 当三个独立项目各自优化,没人负责"窗口里此刻该有什么"这个全局预算问题——而 context rot 恰恰证明了全局预算是真问题(18 个模型无一幸免)。Anthropic 团队的回应是:context rot 等具体工程挑战是 agent 时代**新出现**的,不是简单重命名(来源:[Anthropic Engineering Blog](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents))。我的赌注:这个词是否构成"学科边界突破"仍有争论(本文立场:争议未决),但作为**信息流路由的统筹框架**,它已经有实操区分度——光这一点就值得保留。

**对手立场二:"既然 subagent 隔离这么好,为什么不无脑多 agent?"——Cognition 的反驳。**

接受其对的部分:Cognition 的"Don't Build Multi-Agents"(来源:[Cognition Blog](https://cognition.ai/blog/dont-build-multi-agents))指出,只接收子任务描述的 subagent 会因缺乏整体决策历史而误解任务,主张"share full agent traces, not just individual messages"。这戳中了 §3 错位四的反面——隔离会切断上下文。**坚持的边界是**:这恰好印证四去向是个**权衡决策**而非教条。subagent 隔离适合"探索过程可丢弃、只要结论"的任务(如代码库搜索);不适合"决策需要全程一致性"的任务(Cognition 举的 Super Mario 例子:两个子 agent 各自做出合理但互不兼容的视觉决策)。判断主轴不是"该不该隔离",而是"这块信息的中间过程到底可不可丢"。这场争论本身没有定论,属于活跃的工程争议——见 [m206 - Agent 产品化：记忆机制与技术进展](/kb/工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/) 对多 agent 记忆边界的讨论。

## §6 跨域呼应:维特根斯坦的"语言游戏"与四词的范畴错误

四词混用的病根,用维特根斯坦的视角看得最清楚:**语言的意义在于使用(meaning is use),而不在于词本身**。Prompt / Context / Memory / RAG 在不同的"语言游戏"里被使用——工程师说 prompt 指 system prompt 模板,产品经理说 prompt 指用户输入框,招聘 JD 说 prompt engineering 指一种岗位能力。同一个能指(signifier),在不同语境下指向不同所指(signified),而混用发生在**人们以为自己在玩同一个语言游戏,其实不是**。

更锋利的是维特根斯坦对**范畴错误**(category mistake,Ryle 的术语,与维氏同源)的诊断:把"容器"和"渠道"摆成并列选项(§0 批评的那个错误框架),就像问"大学在哪里"时,有人带你看了图书馆、教学楼、操场后还在追问"那大学到底在哪"——他把"大学"(一个统摄性的范畴)误当成了"和教学楼平级的一栋楼"。把 context 误当成"和 prompt 平级的一个选项",犯的是同一种错。本节点的矩阵之所以要先排层级再讲分工,正是为了**把范畴错误前置消解**:先确认你问的是哪一层,再谈那一层怎么填。这呼应 0114认识论 中关于概念边界与语义滑变的讨论——术语的层级清晰,是判断力的前提。

## §7 PM 决策启示

- **面试桌**:被问"你怎么理解 context engineering"时,不要复述定义,直接画这张层级矩阵:"context 是容器,prompt/memory/RAG 是三条供货渠道,我的工作是设计信息流路由——这块该缓存进 prompt、那块该外化进 memory、大语料走 RAG、探索性子任务派 subagent。"一句话区分出"调过 prompt 的人"和"设计过信息系统的人"。
- **选型会**:听到有人说"我们上个 RAG"或"加个 memory",先反问"你解决的是哪一层的问题?"——是该外置的语料(RAG)、该跨会话留的状态(memory)、还是该稳定缓存的指令(prompt)?用四去向表当 checklist,挡掉"为了上技术而上技术"。
- **复现台**:动手搭 agent 时,先画一遍信息流四去向,把每块信息钉到一条渠道上;尤其警惕"窗口够大就全灌进去"的诱惑——用 NoLiMa/RULER 的有效上下文数字提醒自己"标称 ≠ 可用"。

## §8 与已有节点的关系

- **对照 [c09 - RAG 架构](/kb/基础知识库/c09-rag-架构/)(升级/纠偏)**:c09 把 RAG 当成一套独立架构详解(chunking、检索范式、reranker、评估)。本节点不复述这些,而是把 RAG **降维成四去向之一**——纠正"RAG 是个独立选项"的认知,把它放回"渠道"的位置。c09 回答"RAG 内部怎么搭",本节点回答"什么时候才该用 RAG 这条渠道、而不是另外三条"。
- **对照 [m206 - Agent 产品化：记忆机制与技术进展](/kb/工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/)(对话/深化)**:m206 详解了短期/长期记忆的具体实现(滑动窗口、摘要压缩、向量/结构化/图三库)。本节点不复述记忆的内部机制,而是把 memory **放进与 prompt/RAG/context 的层级关系里**辨析——回答"什么该走 memory 这条渠道,它和另外三条如何分工"。m206 讲"记忆怎么做",本节点讲"记忆在四词版图里站哪个位置"。
- 与本专题 [A01 Context Engineering 概念史与升格](/kb/专题-工程与成本/a01-context-engineering-概念史与升格/)(同级横向辨析)、[m201 - Prompt Engineering 实战体系](/kb/工程化与落地架构/m201-prompt-engineering-实战体系/) 互补:m201 是 prompt 这条渠道的内部实战,本节点是它的外部定位。

## §9 关联节点

**核心(必读)**
- [c09 - RAG 架构](/kb/基础知识库/c09-rag-架构/) — RAG 渠道的内部架构,本节点的"降维对象"
- [m206 - Agent 产品化：记忆机制与技术进展](/kb/工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/) — memory 渠道的内部机制
- [m201 - Prompt Engineering 实战体系](/kb/工程化与落地架构/m201-prompt-engineering-实战体系/) — prompt 渠道的内部实战
- [RAG](/kb/基础知识库/rag/) / [Embedding](/kb/基础知识库/embedding/) — 原子概念卡
- [Prompt Caching](/kb/基础知识库/prompt-caching/) — 解释 prompt 渠道为何能省钱
- [Agent](/kb/基础知识库/agent/) — subagent 隔离这条渠道的载体

**延伸(可选)**
- [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/) — 四条渠道的成本结构差异
- [m203 - RAG 生产环境：Embedding 与文档解析](/kb/工程化与落地架构/m203-rag-生产环境-embedding-与文档解析/) / [m204 - RAG 生产环境：Chunking 与范式演进](/kb/工程化与落地架构/m204-rag-生产环境-chunking-与范式演进/) / [m205 - RAG 生产环境：索引运维与评估体系](/kb/工程化与落地架构/m205-rag-生产环境-索引运维与评估体系/) — RAG 渠道的生产细节
- [KV Cache](/kb/基础知识库/kv-cache/) — context window 的物理底座
- [幻觉](/kb/基础知识库/幻觉/) — memory 走错导致的时效幻觉
- [Claude Code](/kb/ai-公司与产品/claude-code/) — E01 一手体感的来源
- 0114认识论 — 范畴错误与语义滑变的哲学基础
- [AI PM 知识图谱·总索引](/kb/ai-pm-知识图谱/ai-pm-知识图谱-总索引/)

## 修订日志
- 2026-06-07 R0:首稿。建立四词层级矩阵(容器 vs 三渠道)、信息流四去向决策表、四个高频错位(各带症状/为什么错/正确做法/真实反例)、Cognition 与 HN 两处对手回应、维特根斯坦语言游戏+范畴错误跨域呼应、c09/m206 升级对照。事实接地:NoLiMa/RULER/Chroma/MemGPT/Anthropic 数据均带可追溯来源。

---
title: A02 五词辨析·CoT 推理 思考 慢思考 Inference-scaling
cluster: 专题 · 能力与训练
created: '2026-06-07'
updated: '2026-06-20'
provenance: ai
facet: 推理与测试时计算
---

当一个 PM 在选型会上说"o3 比 GPT-4 强"时，他到底在说什么——是模型本身变聪明了（权重里多了能力），还是这次回答多烧了算力（同一个权重想得更久）？这两件事的成本结构、可控旋钮、失效模式完全不同，但被五个互相缠绕的术语糊成一团：**CoT、reasoning、thinking、test-time compute、inference scaling**。本节点的任务不是给五个词下定义（那太容易），而是证明它们**两两不可通约**——属于不同的层、不同的时间、不同的因果链；混用它们会让你在"能力提升"和"算力堆叠"之间做出系统性错误的归因，进而买错东西、定错价、背错锅。

## §0 为什么用"层 × 时间"二维分类，而不是"由弱到强排个序"

最常见的错误框架，是把这五个词排成一条"进化链"：CoT → reasoning → thinking → test-time compute → inference scaling，越往后越高级。这是错的，而且错得有害——它暗示后者**包含**或**取代**前者，于是 PM 会以为"上了 reasoning model 就不用写 CoT prompt 了""inference scaling 是 test-time compute 的升级版"。

正确的分类轴是两个正交维度（沿用 Ke et al. 2025「A Survey of Frontiers in LLM Reasoning」, arXiv:2504.09037, Salesforce Research 的框架）：

- **轴一：计算发生在训练期还是推理期。** 训练期改权重（一次性投入，全局生效）；推理期不改权重（每次 query 重新付费）。
- **轴二：作用在哪一层。** 提示层（prompt，零权重改动）／模型内部（权重里编码的能力）／搜索调度层（推理期外挂的算法）。

把五个词放进这两个轴，它们立刻散落到不同象限，谁也不在谁的延长线上。下面逐一拆。

## §1 五个词的精确坐标

| 术语 | 它到底指什么 | 权重改吗 | 计算在何时 | 这是一个… |
|---|---|---|---|---|
| **Chain-of-Thought (CoT)** | 提示技术：诱导模型输出中间步骤（Wei et al. 2022） | 否 | 推理期 | 提示层方法 |
| **Reasoning (trained)** | 经 RL/SFT 把推理能力编码进权重的模型属性（o1、R1） | 是（永久） | 训练期 | 模型能力 |
| **Thinking** | 产品话术：模型在出答案前消耗的"思考 token"（Extended Thinking） | 否（指消耗，不指能力来源） | 推理期 | 产品/UI 概念 |
| **Test-time compute (TTC)** | 中性度量：推理期烧掉的算力总量（FLOPs/tokens） | 否 | 推理期 | 一个度量单位 |
| **Inference scaling** | 经验规律：TTC 增加→性能提升的那条曲线（Snell 2024） | 否 | 推理期 | 一条 scaling law |

读这张表的正确方式：**reasoning 是唯一在"训练期/改权重"格子里的词**。其余四个全在推理期、全不改权重——但它们彼此仍不可通约：CoT 是一种"怎么烧"的方法，thinking 是产品给这件事起的名字，TTC 是"烧了多少"的度量，inference scaling 是"烧得越多回报如何"的曲线。把度量（TTC）当方法（CoT）、把曲线（scaling）当能力（reasoning），是后面所有混淆的根。

## §2 三组"看似同义、实则正交"的死亡陷阱

### 2.1 reasoning ≠ thinking ≠ test-time compute

这是判断主轴上最致命的一组。三者分属能力层、产品层、度量层：

- **reasoning** 回答"模型权重里有没有这个能力"——是名词性的、永久的、可蒸馏的（DeepSeek-R1 把 32B 蒸馏版做到 AIME 2024 pass@1 72.6%，MATH-500 94.3%，arXiv:2501.12948，显著优于在同等小模型上直接做 RL）。
- **thinking** 回答"这次回答 UI 上展示/消耗了多少中间过程"——是 Anthropic/OpenAI 的产品命名，对应那串在最终答案前生成的（通常不可见的）token。它不保证质量，只描述行为。
- **test-time compute** 回答"这次烧了多少 FLOPs"——纯度量，连方向都不带。一个没经过 reasoning 训练的旧模型，用 Best-of-64 采样也在消耗大量 TTC，但它没有"thinking token"，也谈不上"trained reasoning"。

> [!warning] 判断主轴：五词混用 → "o3 比 GPT-4 强"的归因塌缩
> **症状**：选型会上有人说"o3 比 GPT-4 强 20 分"，全场点头。
> **为什么会错**：这句话同时混淆了三件不可通约的事——(1) o3 是 trained reasoning model（权重里有能力），GPT-4 不是；(2) o3 一次回答烧的 TTC 是 GPT-4 的几倍到几十倍；(3) "强 20 分"到底来自能力还是来自算力，这句话无法区分。
> **正确做法**：拆成两个独立问题问——"同等 TTC 预算下谁强（能力对比）"和"达到目标分数各需多少 TTC（成本对比）"。这两个答案常常指向不同的采购决策。
> **真实反例**：o3 在 ARC-AGI-1 上从低算力的 75.7% 涨到高算力（约 172× 算力）的 87.5%（来源：ARC Prize, "OpenAI o3 Breakthrough", arcprize.org）。同一个 o3，同一套权重，分数差 12 个点——这 12 分**全部**来自 TTC 而非能力。如果你把高算力配置的 87.5% 当成"o3 的能力"写进选型报告，你低估了真实部署成本一到两个数量级。更狠的反例：同样这个 87.5% 的 o3，在 ARC-AGI-2 上只有 2.9%（人类约 60%，来源：ARC Prize）——高分反映的是 benchmark 拟合，不是通用推理能力的真实跃迁。

### 2.2 CoT ≠ trained reasoning（提示层 ≠ 权重层）

CoT 是 prompt 层的临时形变，上下文一清就消失，不动一根权重；trained reasoning 是焊死在权重里的能力。两者机制不兼容到了**互相伤害**的程度：

- 对**非推理模型**，CoT 提示有效但极不稳定：Gemini Flash 2.0 +13.5%、Sonnet 3.5 +11.7%，但 Gemini Pro 1.5 反而 −17.2%（来源：Wharton GAIL, "The Decreasing Value of Chain of Thought", 2025）。
- 对**已 trained reasoning 的模型**，额外 CoT 提示边际收益接近零甚至为负：o3-mini +2.9%、o4-mini +3.1%、Gemini Flash 2.5 **−3.3%**（同上）。
- 更反直觉：few-shot CoT 可能**损害** RL 推理模型的表现（arXiv:2501.12948 在讨论中提及），因为模型已把更优的推理路径内化，外部示例反而是干扰。

这意味着"上了 reasoning model 还要不要写 CoT prompt"是个有真实成本的产品决策，答案是"基本不要，可能有害"——而把 CoT 和 reasoning 当成同一件事的 PM，会继续在 system prompt 里堆"让我们一步步思考"，白白增加 token 成本还掉点。

### 2.3 inference scaling ≠ inference-time search（曲线 ≠ 算法）

inference scaling 是一条**经验规律**（TTC↑→性能↑的曲线）；inference-time search（Best-of-N、Beam、MCTS）是**实现这条曲线的一类具体算法**。把规律当算法，会以为"只要多采样就一定更好"——但这条曲线有终点：

- Snell et al. 2024（arXiv:2408.03314）确立了 compute-optimal 的 inference scaling：最优搜索策略比 Best-of-N 基线效率提升 **>4×**，FLOPs 匹配下小模型+TTC 可胜过 **14×** 参数的大模型。这是"曲线存在"的奠基证据。
- 但 Yu et al. 2025（arXiv:2502.00271, "Scaling Flaws of Verifier-Guided Search"）反证：样本数继续增大后，verifier-guided search 的边际优势消退，最终反而不如朴素重复采样——因为不完美的验证器会错杀有效路径。曲线在高预算端**平坦化甚至反转**。
- arXiv:2502.12215（"Revisiting TTC Scaling of o1-like Models"）进一步质疑：部分模型声称的 TTC scaling 能力可能是虚假的，高预算下扩展曲线趋平。

所以 inference scaling 是一条**有边界的曲线**，不是"算力越多越强"的承诺；inference-time search 是众多爬这条曲线的方法之一，且各有失效点。

## §3 产品 PM 视角补盲：三个旋钮、三类账单

工程视角到此够了，但 PM 还要补三个"看走眼"点：

1. **用户心理模型错配**：用户看到"thinking..."以为模型更靠谱，于是更信任输出——但 thinking token 多 ≠ 答案对。arXiv:2509.06861 证明，在知识密集型任务上增加 TTC 不持续提升准确率、**反而常增加幻觉**（延长推理诱发确认偏误→过自信幻觉）。把 thinking 当"可信度信号"展示给用户，是在制造一个假的信任锚点。
2. **定价归因错误**：reasoning 是一次性研发成本（训练期，摊到所有调用）；TTC 是边际成本（每次 query 现付，按 output token 费率计，通常比 input 贵 2–6×）。把二者混为一谈，会在定价模型里把"研发投入"和"单次毛利杀手"算混。一条复杂 query 可产生上万 thinking token，总成本被 thinking 部分乘以 10–30×（来源：codeant.ai / aioutlooks.com, 2025，量级估算）。
3. **合规与可解释边界**：o1/o3 的内部 CoT 对用户**不可见且 OpenAI 未公开机制**——你无法用它向监管证明"模型为什么这么判"。把"有 thinking token"等同于"有可审计的推理过程"，在受监管场景（如安全风控、信贷）是危险的过度承诺。

## §4 对手框架回应：接受 + 边界

**反方立场（务实工程派 / "别玩术语，能跑就行"）**：很多资深工程师会说——这五个词在实践中本来就互相渗透，纠结辨析是学究气，反正"调大 effort 旋钮分数就上去"，PM 知道这个就够了。

**接受**：他们对的部分很实在——在单一供应商的封闭产品里，reasoning + thinking + TTC 确实被打包成一个 `reasoning_effort`/`effort` 旋钮，用户体感上就是"一个滑杆"，日常调用不需要拆解。

**边界（本节点坚持的赌注）**：这个"够用论"在三个时刻会崩——(1) **跨供应商选型**时：你必须区分"R1 便宜是因为 GRPO 训练省（能力层）"还是"它默认烧的 TTC 少（度量层）"，否则比不出真实性价比；(2) **自建/微调**时：你要决定把算力花在训练期（trained reasoning，一次投入）还是推理期（TTC，永续付费），这是 m209 路由决策树的核心分叉；(3) **向上汇报**时：把"o3 强"含混上报，等于把一笔被 172× 算力放大的成本风险藏进了一个形容词。旋钮够日常用，但 PM 的价值恰恰在旋钮失效的那三个时刻。

**Rick 未读的对手框架引入**：B.C. Smith 在《On the Origin of Objects》/《The Promise of Artificial Intelligence》中区分"reckoning（机械演算）"与"judgment（有担当的判断）"——他会质疑：把"烧更多 token"叫"thinking"是范畴僭越，TTC 增加的是 reckoning 的量，与 judgment 无关。这个框架逼问本节点的盲点：我们用"reasoning/thinking"这些拟人词，是否在悄悄把"算力堆叠"包装成"认知能力"？（这条线索可在 认知科学 的 System 2 祛魅中展开，见 §6。）

## §5 跨域呼应：维特根斯坦的"语言游戏"与术语滑变

> [!note] 跨域调度：维特根斯坦《哲学研究》——词的意义在于用法，混用同一个词的不同语言游戏会制造伪问题
> 维特根斯坦说，"意义即用法"——同一个词在不同语言游戏里指不同的东西，把它们当成一个东西就生出伪问题。"thinking"正是教科书级案例：在日常语言游戏里它指"有意识的认知活动"，在产品语言游戏里它指"答案前那串 token"，在度量语言游戏里它约等于 TTC。当媒体写"o3 会思考了"，它偷偷把这三个游戏接成一个，于是"o3 比 GPT-4 强"这个句子**看起来**在做能力比较，**实际上**横跨了能力/算力/产品三个不可通约的游戏——这不是一个有真假的命题，而是一个语法混乱。本节点的整张坐标表，本质就是把五个词各自送回它所属的语言游戏，让"o3 比 GPT-4 强"这类伪命题无处藏身。这正对应 认知科学 对 System 2 的祛魅：把"模型在思考"从一个认知断言降级为一个算力调度的工程事实。

## §6 PM 决策启示

- **面试**：被问"怎么看 o3 vs GPT-4"，不要答"o3 更强"。答："这要拆成两个轴——trained reasoning 能力（权重层，一次性）和 test-time compute 消耗（度量层，每次付费）。o3 的 ARC-AGI 分数从 75.7% 到 87.5% 差的 12 分全来自 172× 算力，所以真正的问题是'目标分数下各需多少 TTC、单位成本多少'。"——这一句话就把你和 90% 只会复述 benchmark 的候选人区分开。
- **选型**：建一张"能力轴 × 成本轴"二维表，禁止用单一分数排序。对每个候选模型分别填"同等 TTC 下的能力"和"达标所需 TTC 成本"，路由实现对接 [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/) 的路由决策树。
- **复现**：复现论文分数前，先确认它报的是哪种配置——pass@1（单次）、maj@64（多数投票，已烧 64× TTC）、还是 1000 次重排（o1 AIME 从 74% 涨到 93% 靠的就是这个，来源：OpenAI, "Learning to reason with LLMs"）。把 maj@64 的分数当 pass@1 复现，你会以为模型退化了，其实是你少烧了 63 倍算力。

## §7 与已有节点的关系

- 对 [c11 - System 2 思维与 Test-Time Compute](/kb/基础知识库/c11-system-2-思维与-test-time-compute/)：**深化 + 纠偏**。c11 已建立 System 1/2 框架与 TTC 概念，但把 CoT、reasoning、TTC 在叙述中常常并置使用；本节点补上"五词两两不可通约"的辨析层，把 c11 里隐含的混用显式拆开。不复述 c11 的 System 2 定义与产品形态。
- 对 [Test-Time Compute](/kb/基础知识库/test-time-compute/) 概念卡：**收窄 + 定位**。该卡把 TTC 作为范式定义；本节点指出 TTC 只是五词中的"度量"一格，既不是方法（CoT）也不是能力（reasoning）也不是曲线（inference scaling）——给概念卡补一个"它在术语家族里的精确坐标"。
- 对 [强化学习](/kb/基础知识库/强化学习/) 概念卡：**引用底座**。trained reasoning 的"训练期/改权重"格子，其算法实现（GRPO、RLVR）由该卡承载，本节点只引用不复述。
- 对 [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/)：**对接成本轴**。本节点的"能力轴 × 成本轴"决策表，其成本侧实现（路由、Extended Thinking 的 output token 5–20× 量级）落在 m209。

## §8 关联节点

**核心（必读）**
- [c11 - System 2 思维与 Test-Time Compute](/kb/基础知识库/c11-system-2-思维与-test-time-compute/)
- [Test-Time Compute](/kb/基础知识库/test-time-compute/)
- [强化学习](/kb/基础知识库/强化学习/)
- [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/)
- [Scaling Laws](/kb/基础知识库/scaling-laws/)
- [幻觉](/kb/基础知识库/幻觉/)

**延伸（可选）**
- [Agent](/kb/基础知识库/agent/)
- [DeepSeek](/kb/ai-公司与产品/deepseek/)
- [OpenAI](/kb/ai-公司与产品/openai/)
- [Claude](/kb/ai-公司与产品/claude/)
- [c14 - 模型评估体系与 Goodhart 陷阱](/kb/基础知识库/c14-模型评估体系与-goodhart-陷阱/)
- [c13 - 幻觉的不可消除性](/kb/基础知识库/c13-幻觉的不可消除性/)
- [m201 - Prompt Engineering 实战体系](/kb/工程化与落地架构/m201-prompt-engineering-实战体系/)
- [p305 - 信任架构与可解释性设计](/kb/产品设计与交互范式/p305-信任架构与可解释性设计/)
- [A03 ReAct](/kb/专题-安全对齐与失败/a03-react/)
- [AI PM 知识图谱·总索引](/kb/ai-pm-知识图谱/ai-pm-知识图谱-总索引/)

**待建概念清单（本专题登记，主库暂无，降级为普通文本）**
- （2026-06-11 已入库回链）0426 认知科学现已发布，System 2 祛魅入口已回链至 认知科学，不再降级。
- inference-time search（Best-of-N / Beam / MCTS 的搜索族总卡）
- RLVR（Reinforcement Learning with Verifiable Rewards）
- reasoning_effort / effort 旋钮（产品参数族）

## 修订日志
- 2026-06-11 P3.4 校链：0426 认知科学现已入库，§4/§5 正文与待建清单中"（待建专题，未发布）"降级文本恢复为真 0426 总览 链。
- 2026-06-07 R0：首稿。建立"层 × 时间"二维坐标表，落地三组不可通约死亡陷阱（reasoning≠thinking≠TTC、CoT≠trained reasoning、inference scaling≠search），判断主轴锚定"o3 比 GPT-4 强"的归因塌缩。跨域调度维特根斯坦语言游戏 + B.C. Smith reckoning/judgment（未读对手框架）。事实接地：o3 ARC-AGI 12 分差、Wharton GAIL CoT 数字、Snell 4×/14×、Yu 2025 反证、arXiv:2509.06861 知识密集型幻觉，均已附来源；arXiv ID 待 grounding pass 二次核验。

---
title: A01 Reasoning 概念史·从 CoT 到 Test-Time Compute
cluster: 专题 · 能力与训练
created: '2026-06-07'
updated: '2026-06-11'
provenance: ai
facet: 推理与测试时计算
---

# A01 Reasoning 概念史·从 CoT 到 Test-Time Compute

> 这篇要解决的问题不是"reasoning 是什么"，而是**"reasoning 这个词在 2022→2025 三年里指代的对象换了几次，而大多数 PM 还在用 2022 年的定义谈 2025 年的产品"**。本节用一条概念史的主轴把三件被混为一谈的东西拆开：prompt 层的 Chain-of-Thought、训练范式里的 trained reasoning、以及推理期的 search。核心论点：**把 o1 当成"更长的 CoT"，是把一次训练范式的格式塔切换误读成了 prompt 工程的连续改良——这个误读会直接让 PM 在选型和成本估算上做错决策。**

---

## §0 为什么是"概念史"框架，而不是"技术综述"框架

谈一个滑变中的术语，有两种写法。一种是技术综述：把 CoT、self-consistency、PRM、GRPO 摆成一张技术清单，讲每个怎么工作。这种写法的致命缺陷是它**预设了这些技术属于同一个谱系**——好像 reasoning 是一条从 2022 平滑爬升到 2025 的曲线，每一步都是上一步的"增强版"。

但真实的历史不是这样。2024 年 9 月 o1 发布时，OpenAI 在 [Learning to reason with LLMs](https://openai.com/index/learning-to-reason-with-llms/) 里说的第一句不是"我们让 CoT 更长了"，而是"我们用**大规模强化学习**训练模型在回答前思考"。这是一句关于**训练**的话，不是关于 prompt 的话。把这两件事放进同一条曲线，等于把"教一个学生背下解题模板"和"让学生在考场里真的演算"画成同一根进步线——它们的**作用机制、成本结构、可控性**全都不可通约（Kuhn 意义上的 incommensurable）。

所以本节用**概念史**而非综述：不追求技术全覆盖，而追求**标出三次"词还是那个词、指代物已经换了"的断裂点**。读完你应该能在听到"这个模型 reasoning 能力强"时，立刻反问一句："你说的是 prompt 层的 CoT，是训练进权重的 reasoning，还是推理期烧算力的 search？这三件事我要付的钱、要等的延迟、能不能复现，完全不一样。"

> [!note] 本节的判断主轴
> reasoning ≠ thinking ≠ test-time compute。把它们当同义词，是 2025 年 AI PM 最高频的认知事故。本节的任务就是把这三个词钉死在各自的坐标上。

---

## §1 第一幕（2022）：CoT 是一种 prompt，权重一动不动

故事起点是 Wei et al. 2022 的 Chain-of-Thought（[arXiv:2201.11903](https://arxiv.org/abs/2201.11903)，"Chain-of-Thought Prompting Elicits Reasoning in Large Language Models"，WebSearch 核实）和 Wang et al. 2022 的 Self-Consistency（[arXiv:2203.11171](https://arxiv.org/abs/2203.11171)，ICLR 2023）。CoT 的原始定义里**没有任何训练成分**：它是在 prompt 里塞进"让我们一步步想"的指令或几个示范，引导模型把中间步骤吐出来。模型权重一个字节都不改。

这一幕的数字是真实且漂亮的。Self-Consistency 在 GSM8K 上 +17.9%、SVAMP +11.0%、AQuA +12.2%、StrategyQA +6.4%（来源：[arXiv:2203.11171](https://arxiv.org/abs/2203.11171)，WebFetch 核实）。这些增益让整个行业相信：**推理能力是"激发"出来的，藏在预训练模型里，只要 prompt 对了就能调出来。**

但 CoT 的本质局限也在这一幕就埋下了：
- **无持久性**：上下文一清空，效果归零，因为什么都没沉淀进权重。
- **闭合答案依赖**：Self-Consistency 的多数投票只对"答案是单个数字/选项"的任务有效，开放生成无法投票。
- **边际递减**：采样路径越多，增益越平，有时甚至倒挂。

关键是 2025 年回头看，CoT 对**已经训练过推理的模型**几乎无效甚至有害。Wharton GAIL 2025 的报告 [The Decreasing Value of Chain of Thought](https://gail.wharton.upenn.edu/research-and-insights/tech-report-chain-of-thought/) 给出对照：对非推理模型，CoT prompting 让 Gemini Flash 2.0 +13.5%、Sonnet 3.5 +11.7%；但对推理模型，o3-mini 仅 +2.9%、o4-mini +3.1%、**Gemini Flash 2.5 反而 -3.3%**。

这是第一个断裂点的证据：当推理被训练进权重后，prompt 层的 CoT 从"主菜"退化成"可能添乱的调料"。**把 o1 当"自带 CoT 的模型"是对的；把它当"CoT prompting 的产品化"是错的——后者会让你以为再写更长的 prompt 能让它更聪明，实际只会更贵更慢。**

---

## §2 第二幕（2024–2025）：trained reasoning，权重被永久改写

2024 年 9 月，o1 把"推理"从 prompt 层搬进了训练层。它用大规模 RL 训练 chain-of-thought，并把思维链对用户隐藏（hidden thinking token）。它的核心主张是一句新的 scaling 话：**推理时计算与训练时计算"都"满足"更多=更好"**（来源：[Learning to reason with LLMs](https://openai.com/index/learning-to-reason-with-llms/)）。

o1 的 AIME 2024 数字本身就是一部"三种 compute 不可通约"的微缩史（来源：OpenAI 博客，WebSearch 核实）：

| 策略 | AIME 2024 分数 | 这是哪一种 compute |
|---|---|---|
| 单次采样 pass@1 | 74% | trained reasoning（权重内化） |
| 64 次多数投票 | 83% | + 推理期并行采样（Self-Consistency 式） |
| 1000+ 次 + 学习评分函数重排 | 93% | + 推理期 search（验证器引导） |

同一个模型，三个分数，对应三种完全不同的 compute 投入——这张表本身就是反驳"reasoning 是一根曲线"的最硬证据。74% 来自训练，83% 多花的钱在并行采样，93% 多花的钱在 search+验证器。**三笔钱的边际收益、延迟代价、可复现性各不相同，PM 不能用一个"reasoning 强"的标签把它们打包。**

2025 年 1 月 22 日，DeepSeek-R1（[arXiv:2501.12948](https://arxiv.org/html/2501.12948v1)，"Incentivizing Reasoning Capability in LLMs via Reinforcement Learning"）把这一幕从闭源黑箱里拽到了阳光下，并贡献了概念史上最反直觉的一笔：

- **R1-Zero**：纯 RL，**无任何人工标注推理轨迹**，直接在 DeepSeek-V3 基座上用 GRPO + 规则奖励训练。它在训练过程中**自发涌现**了自我反思、验证、自适应策略切换——著名的"aha moment"。AIME 2024 pass@1 达 71.0%、maj@vote 86.7%（来源：[arXiv:2501.12948](https://arxiv.org/html/2501.12948v1)，WebFetch 核实）。
- **R1**（四阶段：冷启动 SFT → 推理 RL → 拒绝采样数据整理 → 对齐 RL）：AIME 2024 pass@1 **79.8%**、MATH-500 **97.3%**、Codeforces Elo **2,029**，与 o1-1217 同档（来源：同上）。

R1-Zero 的意义不在于分数，而在于它**证明了推理能力可以由 RL 奖励信号驱动地涌现，而非从人类轨迹模仿而来**。这把 CoT 时代"推理是激发出来的"这个信念彻底改写成"推理是被奖励塑造进权重的"。这是 trained reasoning 区别于 CoT prompting 的本体论分界——一个改权重，一个不改。

> [!warning] confirmation-bias 砍除 #1
> 本专题早期叙事容易把 R1-Zero 的"aha moment"当作"RL 凭空创造了推理"的铁证。但必须补入反例：[arXiv:2503.20783](https://arxiv.org/abs/2503.20783)（"Understanding R1-Zero-Like Training: A Critical Perspective"）发现 DeepSeek-V3-Base 在 epoch 0 已有"aha moment"迹象，Qwen2.5 base 无提示模板也表现强推理——这暗示 RL 可能是**解锁**而非**创造**能力。涌现 vs 解锁之争至今未解，谁都不该把它说死。

---

## §3 第三幕（2024–2025）：test-time compute 成为一条独立的 scaling law

第三个断裂点是理论的：2024 年 8 月，两篇论文把"推理期算力"提升为一条**与参数 scaling 并列、且可能更划算**的独立定律。

- **Snell et al. 2024**（[arXiv:2408.03314](https://arxiv.org/abs/2408.03314)，"Scaling LLM Test-Time Compute Optimally can be More Effective than Scaling Model Parameters"）：计算最优搜索策略比 Best-of-N 基线效率提升 **>4×**；在 FLOPs 匹配下，**小模型 + 测试时计算可超越 14× 参数量的大模型**。关键洞见是"最优策略随任务难度动态变化"——简单题偏好并行采样+验证器，难题偏好迭代精化。
- **Wu et al. 2024**（[arXiv:2408.00724](https://arxiv.org/abs/2408.00724)，ICLR 2025，"Inference Scaling Laws"）：Llemma-7B 配树搜索，在全 FLOPs 预算范围内持续优于 Llemma-34B + 标准多数投票。

这一幕完成了概念史的最后一次坐标重置：**"让模型更聪明"从一次性的预训练事件，变成了推理期可以按需购买的连续变量。** 这正是本专题的总命题——PM 第一次能在质量/延迟/成本三角上拉一根**显式滑杆**，而不是被"模型就这么聪明"的固定上限锁死。

但 test-time compute 不是一个单一动作，它至少有三种不可互换的形态（综合 Snell 2024 与 [arXiv:2504.09037](https://arxiv.org/pdf/2504.09037) 的分类）：

| 形态 | 机制 | 改权重？ | 延迟特征 |
|---|---|---|---|
| **并行扩展** | Best-of-N、Self-consistency、majority vote | 否 | 可并行，延迟≈单次 |
| **顺序扩展** | 迭代精化、beam search、MCTS 树搜索 | 否 | 串行，延迟随深度爆炸 |
| **内部扩展** | 模型按难度自调生成深度（o1/o3 内置，闭源） | 训练时已固化 | 不透明，难预算 |

注意第三列：**只有"内部扩展"的能力是训练进权重的，前两种是推理期的纯算力调度。** 这意味着 test-time compute 和 trained reasoning 是正交的两个维度——一个 trained reasoning 模型上面还可以再叠并行/顺序搜索（o1 的 74%→93% 就是这么叠出来的）。把它们当一回事，就会算错账。

> [!warning] failure scenario #1
> "小模型+search 超越 14× 大模型"这条 Snell 的结论有明确边界。[arXiv:2502.12215](https://arxiv.org/pdf/2502.12215)（"Revisiting TTC Scaling of o1-like Models"）质疑：部分模型声称的测试时扩展曲线在高预算下会**平坦化**，扩展能力可能是虚假的。[arXiv:2502.00271](https://arxiv.org/abs/2502.00271)（Yu et al.）进一步指出：样本数增大后，验证器引导搜索的边际优势消退，最终甚至不如单纯重复采样——因为验证器不完美，会误杀有效路径，且在难题/分布外问题上放大。**所以"加算力就更聪明"在知识密集型、分布外、验证器薄弱的场景会失效。**

---

## §4 判断主轴：三件被混为一谈、却不可通约的事

这是本节的命门。90% 的人在 reasoning 这个词上会犯下面三类错，每一类都直接导致 PM 决策事故。

### 错位一：把 trained reasoning 当成"更长的 CoT"

- **症状**：选型时认为"o1 = GPT-4 + 自动 CoT prompt"，于是试图用 prompt engineering 把普通模型"调"成推理模型，或对 o1 写超长 CoT prompt 想让它更强。
- **为什么会错**：CoT 是推理期、不改权重、上下文依赖；trained reasoning 是训练期、改权重、全局持久。两者机制不兼容——前面引过的反常发现是 **few-shot CoT 可能损害 RL 推理模型表现**（Wharton GAIL 2025 的 Gemini Flash 2.5 -3.3%）。
- **正确做法**：对推理模型，**收回 CoT prompt**，靠 effort 旋钮调推理深度而非靠 prompt 堆步骤。
- **真实反例**：o3-mini 加 CoT 仅 +2.9%、o4-mini +3.1%——增益已逼近噪声；而对非推理模型 CoT 还能给两位数增益。同一个 prompt 技巧，在两类模型上效果差一个数量级，证明它们不是同一物种。

### 错位二：把 test-time compute 当成 trained reasoning 的同义词

- **症状**："这个模型 reasoning 强"被默认为"它内部会自己想很久"，于是不去区分"模型自带的内部推理"和"我在外面叠的 Best-of-N/MCTS"。
- **为什么会错**：test-time compute 是**正交于**训练的算力维度。你可以在一个非推理模型外面叠 search（小模型+search 超 14× 大模型），也可以在一个 trained reasoning 模型外面再叠 search（o1 的 93%）。
- **正确做法**：成本估算时**把两笔账分开记**——内部推理的 token 是模型行为（训练决定），外部 search 的 N 倍采样是你的工程选择（你能关）。
- **真实反例**：o1 单次 74%、1000 次重排 93%。这 19 个百分点不是"模型更聪明"，是你**多付了约 1000 倍推理算力**买来的。误把它记成"模型能力"，预算会爆。

### 错位三：把"思考 token 越多越好"当成单调规律

- **症状**：默认开 max effort、堆最长 thinking budget，以为越想越准。
- **为什么会错**：overthinking 是已确证的反例。Phi-4-reasoning 平均生成 **6,780 tokens** vs 标准 Phi-4 的 **378 tokens**，准确率反而更低（69.54% vs 78.92%，来源：[arXiv:2505.00127](https://arxiv.org/abs/2505.00127)）。强行延长推理预算会让边际收益转负——R1-32B 在 AIME 上 12K token 见顶 55.8%、16K 回落 54.9%，约 7,000 token 后"把对的改错"开始超过"把错的改对"（来源：[arXiv:2604.10739](https://arxiv.org/abs/2604.10739)「When More Thinking Hurts」，已 WebFetch 核实 ID 真实、年份为 2026-04；旧稿"87.3%→70.3%"系误引、已更正）。
- **正确做法**：reasoning 不是免费午餐——存在 underthinking 与 overthinking 双边界，先用 medium effort 跑 eval 再决定是否升档。
- **真实反例**：[arXiv:2508.13141](https://arxiv.org/abs/2508.13141)（OptimalThinkingBench，33 模型）发现**没有一个模型**能同时避免 over- 和 under-thinking。"想得越久越准"是被实证否定的直觉。

---

## §5 产品 PM 视角补盲

工程视角到此为止，但 PM 还要看走眼三件事：

1. **用户心理模型的错配**：用户看到 o1 转圈 30 秒，脑中的隐喻是"它在认真思考"（拟人化的 System 2）。但 [arXiv:2506.02878]（"CoT is Not True Reasoning"，**已被作者撤回，证据存疑**）提醒：可见的 thinking 文本可能只是"看起来像推理"的序列拟合。产品上**别把 thinking 动画当成可信度背书**——它是延迟的成本，不是质量的证明。

2. **商业模式的隐形炸弹**：thinking token 按 **output 费率**计费（通常贵 input 2–6×），单条复杂 query 可产 10,000 thinking tokens，总成本可乘 **10–30×**（来源：codeant.ai / aioutlooks.com，2025）。如果你的产品按 query 定价却放开 reasoning，毛利会被悄悄吃穿。这条直接对接 [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/)。

3. **可控性的产品化形态**：effort 旋钮是 2025 业界给 PM 的第一根显式滑杆，但它是**行为信号、不是硬预算**——即使设 low，足够难的题仍会触发 thinking（来源：Claude Effort 文档，2025）。PM 必须知道这个滑杆不精确，不能拿它做 SLA 级的延迟承诺。

---

## §6 对手框架回应

**对手立场一（业界乐观派，OpenAI/Snell 路线）**："test-time compute 是新 scaling law，加算力就能持续买到智能。"
**接受**：在数学、竞赛编程、可验证任务上，证据扎实——o3 AIME 2024 96.7%、FrontierMath 从 ~2% 跳到 25.2%（来源：[ARC Prize](https://arcprize.org/blog/oai-o3-pub-breakthrough)）。
**边界**：但 o3 在 ARC-AGI-1 高算力达 87.5%，在 ARC-AGI-2 上**仅 2.9%**（人类 ~60%）。这说明高基准分可能是 benchmark overfitting，而非通用推理跃迁。**我赌的是：test-time compute 是"可验证任务"的范式革命，但把它当通用智能的开关是过度外推。**

**对手立场二（Rick 未读的引入对手，Subbarao Kambhampati 路线）**：这位 ASU 教授（前 AAAI 主席）在 "Can Large Language Models Reason and Plan?"（[arXiv:2403.04121](https://arxiv.org/abs/2403.04121)，WebSearch 核实）中主张 LLM 擅长的是 "universal approximate retrieval"（普遍近似检索）而非有原则的推理/规划；其 LLM-Modulo 框架（[arXiv:2402.01817](https://arxiv.org/abs/2402.01817)，ICML 2024）主张把 LLM 与符号验证器紧耦合而非单独信任 LLM 自验证。
**接受**：他对"thinking 文本 ≠ 真推理"的怀疑，与 §5 的撤回论文、与知识密集型任务上 test-time compute 失效（[arXiv:2509.06861](https://arxiv.org/abs/2509.06861)：增加推理算力不持续提升准确率、反而增加幻觉）方向一致。
**边界**：但"是不是真推理"是哲学问题，PM 决策吃的是可观测行为。**只要在可验证任务上行为可靠、可复现、成本可算，我就把它当工程能力用，不等哲学定论。**

---

## §7 跨域呼应：Kuhn 的"不可通约性"为什么是本节的脊椎

调度 Kuhn 的范式与 incommensurability（不可通约性）概念。Kuhn 的核心洞见是：范式切换后，新旧范式用**同一个词指代不同的东西**，且无法用一套中立标准直接比较——这正是 reasoning 一词在 2022→2025 的遭遇。CoT 范式下"reasoning"指"prompt 激发的中间步骤"，trained reasoning 范式下它指"RL 塑造进权重的行为"，test-time compute 范式下它又指"可购买的推理期算力"。**三个范式共用 reasoning 这个能指，所指却互不通约。**

这个框架改变了一个具体的技术判断：它让我拒绝去问"哪种 reasoning 更好"（这是把不可通约的东西放在一根标尺上的伪问题），转而问"在这个决策点，我面对的是哪一种 reasoning，它的成本/延迟/可控性坐标是什么"。**Kuhn 把"选哪个更聪明"这个错误问题，替换成了"识别你站在哪个范式里"这个正确问题**——这就是跨域资源不是装饰、而是改判断的证明。

---

## §8 PM 决策启示

- **面试**：被问"怎么看推理模型"，不要答"很强、是趋势"。答："reasoning 这个词在三年里换了三次所指——prompt 层 CoT、训练进权重的 trained reasoning、推理期可买的 test-time compute。它们的成本结构不可通约。比如 o1 的 74%→93% 不是模型变聪明，是多付了约 1000× 算力。" 这一句话立刻把你和"了解一下"的候选人区分开。
- **选型**：拿到一个"reasoning model"，先做三连问——内部推理是否训练进权重（trained）？我要不要在外面叠 search（test-time）？effort 旋钮能不能关（成本可控性）？
- **复现**：想复现 R1 风格能力，路线是 GRPO + 可验证奖励（RLVR）训进权重，**不是**写更长的 CoT prompt。两者一个改权重一个不改，复现路径完全不同。

---

## §9 与已有节点的关系

本节点对照 [c11 - System 2 思维与 Test-Time Compute](/kb/基础知识库/c11-system-2-思维与-test-time-compute/)，做的是**深化**（不是补缺也不是纠偏）。c11 已建立 System 1/2 框架、CoT/ToT 原理、o1/o3/R1 产品机制、PRM vs ORM 定义——这些事实基础**本节不复述**。本节相对 c11 升高的抽象层是：c11 把 test-time compute 当成"一个产品现象"来介绍，本节把它当成"一个被三次范式切换搅浑的概念"来做**概念史的拆解**，给出"reasoning ≠ thinking ≠ test-time compute"的可操作辨析框架。c11 回答"它怎么用"，本节回答"这个词指的到底是哪一个它"。

成本量化部分（output token 5–20× 等）交由 [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/) 承载，本节只引用不复述。训练算法机制（GRPO 组内 baseline、显存降幅、PPO 对照）交由 [强化学习](/kb/基础知识库/强化学习/) 承载。本节的边界是"概念坐标的厘清"，把"怎么训"和"怎么算钱"显式让渡给下游节点。

---

## §10 关联节点

**核心（必读）**
- [c11 - System 2 思维与 Test-Time Compute](/kb/基础知识库/c11-system-2-思维与-test-time-compute/) —— 本节深化的母节点
- [Test-Time Compute](/kb/基础知识库/test-time-compute/) —— 原子概念卡，三种产品形态
- [强化学习](/kb/基础知识库/强化学习/) —— trained reasoning 的算法底座（GRPO/PPO/RLVR）
- [Scaling Laws](/kb/基础知识库/scaling-laws/) —— test-time compute 作为第三条 scaling 维度的母概念
- [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/) —— reasoning 的成本结构与路由

**延伸（可选）**
- [DeepSeek](/kb/ai-公司与产品/deepseek/) —— R1/R1-Zero 出处
- [OpenAI](/kb/ai-公司与产品/openai/) —— o1/o3 概念起点
- [Claude](/kb/ai-公司与产品/claude/) —— effort 旋钮的产品化形态
- [幻觉](/kb/基础知识库/幻觉/) —— 知识密集型任务上 test-time compute 增加幻觉的连接点
- [Agent](/kb/基础知识库/agent/) —— reasoning 作为 Agent 规划引擎（与 0411 专题对接）
- [AI PM 知识图谱·总索引](/kb/ai-pm-知识图谱/ai-pm-知识图谱-总索引/) —— 全库入口

> 待建概念（本专题"待建概念清单"登记，暂作普通文本，不在主库建 stub）：Self-Consistency、GRPO、RLVR、Process Reward Model、Snell 计算最优、Kambhampati（人物卡）、OptimalThinkingBench。

---

## 修订日志

- R0（2026-06-07）：首稿。建立"三幕概念史 + 三错位判断主轴 + Kuhn 不可通约跨域"骨架。事实接地用专题简报中已 WebFetch/WebSearch 核实的数字。落盘后补核：Wei et al. 2022 CoT arXiv:2201.11903 已 WebSearch 确证；Kambhampati 立场（arXiv:2403.04121 "Can LLMs Reason and Plan?" + arXiv:2402.01817 LLM-Modulo, ICML 2024）已 WebSearch 确证。剩余待核实项：arXiv:2506.02878 撤回状态（已在文中标注"已撤回、证据存疑"，未二次核验撤回页）。
- QC（2026-06-07，0433 QC Agent）：arXiv:2604.10739 经 WebFetch 核实 ID 真实（"When More Thinking Hurts"，2026-04-12 提交），年份 2604=26年04月，非异常；旧引"87.3%→70.3%"与原文不符，已统一替换为 R1-32B AIME 55.8%/54.9% 真实数据，与 E02/E03 对齐，去除"年份异常〔待核实〕"标记。

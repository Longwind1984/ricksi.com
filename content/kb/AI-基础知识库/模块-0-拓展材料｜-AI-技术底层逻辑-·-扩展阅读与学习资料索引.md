---
title: 模块 0 拓展材料｜  AI 技术底层逻辑 · 扩展阅读与学习资料索引
cluster: AI 基础知识库
created: '2026-03-24'
updated: '2026-05-16'
---

使用说明：每条资料标注了 必要性等级（★★★ 强烈建议 / ★★☆ 推荐 / ★☆☆ 选读加分），以及推荐理由。标注为★★★的资料建议在回国求职前全部完成。

---

## 第 1 章 · 认知重构：从确定性系统到概率系统

本章的知识点属于思维框架层，不需要额外深读技术文献。但如果想从最底层建立直觉，以下一条足够。

Andrej Karpathy — "Let's build GPT: from scratch, in code, in spell" (YouTube, ~2h) https://www.youtube.com/watch?v=kCc8FmEb1nY ★★★ 强烈建议 为什么推荐：这是目前最好的"从零用代码构建 GPT"教程，完整走一遍 next-token prediction 的数学和代码实现。看完之后，"概率分布采样"不再是一个抽象概念，而是你亲眼看过每一步计算的具体过程。对于从确定性系统转型的 PM，这比读十篇综述更能建立物理直觉。2 小时时长，在路上可以分段看。

---

## 第 2 章 · Tokenization 与词表工程

Andrej Karpathy — "Let's Build the GPT Tokenizer" (YouTube, ~2h13m) https://www.youtube.com/watch?v=zduSFxRajkE GitHub 配套代码：https://github.com/karpathy/minbpe ★★★ 强烈建议 为什么推荐：Karpathy 从零实现了 BPE tokenizer 的完整代码，并逐一演示了 LLM 中各种"怪异行为"如何追溯到 tokenization（为什么 LLM 不会拼写、为什么非英语性能差、为什么简单算术都做不好）。你的文档中关于多语言 token 效率差异的判断，看完这个视频后会从"知道"变成"理解"。面试中如果被追问 tokenization 对国际化产品的影响，这个视频的素材足够让你讲 10 分钟。

Tiktokenizer（在线可视化工具） https://tiktokenizer.vercel.app ★★☆ 推荐 为什么推荐：直接输入中文/英文/代码/小语种文本，实时看不同 tokenizer 的分词结果和 token 数。用来建立"同一段话在不同模型下消耗多少 token"的直觉，5 分钟就能上手。面试前可以准备几个中英文对比的 token 数据点，作为说明国际化成本差异的具体证据。

---

## 第 3 章 · Transformer 核心机制与注意力变体

3Blue1Brown — Deep Learning 系列 Chapter 5-7（YouTube，共 ~1.5h）

- Chapter 5: Transformers 总体结构 — https://www.3blue1brown.com/lessons/gpt
    
- Chapter 6: Attention 机制逐步拆解 — https://www.3blue1brown.com/lessons/attention
    
- Chapter 7: LLM 如何存储事实 — https://www.3blue1brown.com/topics/neural-networks ★★★ 强烈建议 为什么推荐：Grant Sanderson 的可视化是目前最清晰的 Transformer 机制解释，没有之一。Q/K/V 矩阵运算、multi-head attention、softmax 归一化——这些在文字描述中很抽象的操作，他用动画让你"看见"高维空间中发生了什么。对于非 ML 出身的 PM，这三个视频是投入产出比最高的学习路径。
    

"Attention Is All You Need" 原始论文 Vaswani et al., 2017. https://arxiv.org/abs/1706.03762 ★★☆ 推荐 为什么推荐：这是 Transformer 的开山之作。不需要逐行推导公式，但建议通读一遍 architecture 部分（Section 3），理解 encoder-decoder 原始设计、positional encoding 的初始方案、以及 multi-head attention 的动机。面试中如果被问"为什么是 multi-head 而不是 single head"，答案在这篇论文里。对数学不够自信的话，先看完 3Blue1Brown 再来读，会轻松很多。

GQA 论文 — "GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints" Ainslie et al., 2023. https://arxiv.org/abs/2305.13245 ★☆☆ 选读加分 为什么推荐：这篇短论文清晰地对比了 MHA/MQA/GQA 三种方案的参数量、KV Cache 占用和精度 trade-off。如果你想把第 3 章和第 5 章（KV Cache）的联动理解得更透彻，花 30 分钟读这篇是值得的。但对面试来说，理解概念即可，论文细节不是必须。

---

## 第 4 章 · 模型训练全阶段 Pipeline

### 4.1 Scaling Laws

Chinchilla 论文 — "Training Compute-Optimal Large Language Models" Hoffmann et al., 2022. https://arxiv.org/abs/2203.15556 ★★★ 强烈建议 为什么推荐：这可能是 LLM 时代最具产业影响力的单篇论文。它改变了整个行业的训练策略——从"模型越大越好"转向"数据和参数等比例扩展"。核心结论（参数量翻倍时训练 token 也应翻倍、~20 tokens/parameter 的经验比例）是你文档中数据墙论述的理论根基。不需要复现实验，但 Section 3-4 的核心发现和 Table 1 的模型对比建议仔细读。面试高频话题。

Epoch AI — "Chinchilla Scaling: A Replication Attempt" Besiroglu et al., 2024. https://epoch.ai/publications/chinchilla-scaling-a-replication-attempt ★☆☆ 选读加分 为什么推荐：这篇复现研究指出 Chinchilla 原论文的一些参数估计可能存在问题，实际的最优 token/parameter 比例可能比 20:1 更高。如果面试中有人拿 Chinchilla 定律问你"这个比例现在还准吗"，知道这篇文章的存在会让你显得信息更新且思维审慎。

### 4.2 SFT 与 PEFT

LoRA 原始论文 — "LoRA: Low-Rank Adaptation of Large Language Models" Hu et al., 2021. https://arxiv.org/abs/2106.09685 ★★☆ 推荐 为什么推荐：LoRA 是当前应用层微调的事实标准。论文本身写得简洁清晰，核心思想（冻结原始权重、注入低秩分解矩阵）在第一页就讲明白了。理解 LoRA 的原理对你做"全量微调 vs LoRA vs 纯 RAG"的架构选型判断是必要的。如果数学公式看不下去，至少读 Section 1-2 和 Figure 1。

LIMA 论文 — "LIMA: Less Is More for Alignment" Zhou et al., 2023. https://arxiv.org/abs/2305.11206 ★☆☆ 选读加分 为什么推荐：这篇论文用实验证明了"1000 条高质量 SFT 数据可能优于大量平庸数据"这一反直觉结论。对 PM 的启示是：在垂直领域微调时，数据质量远比数据量重要。如果面试中聊到 SFT 数据策略，引用 LIMA 是加分项。

### 4.3 偏好对齐

DPO 论文 — "Direct Preference Optimization: Your Language Model is Secretly a Reward Model" Rafailov et al., 2023. https://arxiv.org/abs/2305.18290 ★★☆ 推荐 为什么推荐：DPO 已经取代 PPO 成为后训练对齐的主流方案。论文的核心贡献是证明了可以绕过显式的 Reward Model 直接优化偏好——这个简化极大降低了对齐训练的工程复杂度和成本。PM 不需要理解证明过程，但需要理解 DPO 为什么比 RLHF 更受欢迎（更稳定、更便宜、更易实现），以及它在什么场景下可能不如 RLHF。读 Section 1-3 即可。

[Anthropic](/kb/AI-公司与产品/Anthropic/) — "Constitutional AI: Harmlessness from AI Feedback" Bai et al., 2022. https://arxiv.org/abs/2212.08073 ★☆☆ 选读加分 为什么推荐：Constitutional AI 是你文档第 15 章中合成数据质量过滤的理论基础。了解"AI 自我评判和修正"的机制对理解数据飞轮和自动化对齐 pipeline 有帮助。但这更偏研究前沿，面试中不太会被深追。

---

## 第 5 章 · 算力物理定律与 KV Cache

vLLM Blog — "Easy, Fast, and Cheap LLM Serving with PagedAttention" https://blog.vllm.ai/2023/06/20/vllm.html ★★★ 强烈建议 为什么推荐：这篇博客用清晰的图示解释了 KV Cache 的显存浪费问题（60%-80%）以及 PagedAttention 如何借鉴操作系统虚拟内存分页来解决它。文档中提到的 PagedAttention 和显存碎片化治理，这篇是最佳一手信息源。10 分钟读完，直接获得面试中可以讲的具体数据点（如"现有系统 60%-80% 显存浪费""vLLM 将吞吐量提升 2-4 倍"）。

vLLM / PagedAttention 论文 Kwon et al., 2023. https://arxiv.org/abs/2309.06180 ★☆☆ 选读加分 为什么推荐：如果你读完博客后想更深入理解技术细节（例如 block table 的映射机制、parallel sampling 的显存共享），论文本身写得很工程导向，Figure 5-8 的图示非常直观。但对面试而言，博客的信息密度已经足够。

---

## 第 6 章 · 架构演进：Dense / MoE / SSM / Hybrid

[DeepSeek](/kb/AI-公司与产品/DeepSeek/)-V3 技术报告 https://arxiv.org/abs/2412.19437 ★★☆ 推荐 为什么推荐：DeepSeek-V3 是当前 MoE 架构在工程和性能上的最强实践案例（671B 参数、37B 激活、极低训练成本）。报告详细描述了辅助损失设计、专家路由策略和混合并行训练方案。考虑到 DeepSeek 在国内 AI 圈的影响力，面试时对这份报告的熟悉度本身就是信号。不需要逐页读，重点看 Section 2（架构设计）和 Section 4（训练效率）。

Mamba 论文 — "Mamba: Linear-Time Sequence Modeling with Selective State Spaces" Gu & Dao, 2023. https://arxiv.org/abs/2312.00752 ★☆☆ 选读加分 为什么推荐：SSM/Mamba 在你的架构对比表中占一列，但如果面试官深追"SSM 的选择性机制到底是什么"，你需要比"线性时间复杂度"更具体的答案。这篇论文的 Section 3（选择性状态空间层）是核心，解释了 Mamba 如何通过输入相关的选择机制解决传统 SSM 对内容无感知的问题。整篇论文偏数学，Section 1 + 3 即可。

Jamba 技术报告 — "Jamba: A Hybrid Transformer-Mamba Language Model" AI21 Labs, 2024. https://arxiv.org/abs/2403.19887 ★☆☆ 选读加分 为什么推荐：你的架构表新增了 Hybrid 列，Jamba 是最典型的 Transformer + Mamba 混合架构。如果被问"混合架构的层配比怎么选"，这篇报告有直接答案。但除非面试官特别关注架构前沿，这属于加分而非必要知识。

---

## 第 7 章 · 量化与端侧部署

Tim Dettmers 博客 — "A Gentle Introduction to 8-bit Matrix Multiplication for Transformers at Scale" https://huggingface.co/blog/hf-bitsandbytes-integration ★★☆ 推荐 为什么推荐：Tim Dettmers 是 bitsandbytes 库（QLoRA 的底层依赖）的作者。这篇 HuggingFace 博客用非常直觉的方式解释了 INT8 量化的核心挑战（outlier 问题）以及混合精度分解的解决方案。对 PM 来说，这篇博客能让你理解"为什么量化不是简单的精度降级"以及"为什么有些量化方案比其他的好"。

AWQ 论文 — "AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration" Lin et al., 2023. https://arxiv.org/abs/2306.00978 ★☆☆ 选读加分 为什么推荐：AWQ 是当前 4-bit 量化的主流方案。核心 insight 很简洁：不是所有权重同等重要，1% 的"显著权重"（由激活分布决定）对模型性能至关重要，应该被保护。这一个思路就足以让你在面试中解释"为什么 AWQ 优于 GPTQ"。论文 Section 1-3 足够。

---

## 第 8 章 · 解码策略与生成控制

Hugging Face — "How to Generate Text: Using Different Decoding Methods" https://huggingface.co/blog/how-to-generate ★★☆ 推荐 为什么推荐：这篇博客用交互式代码示例对比了贪心解码、beam search、top-k、top-p 的实际输出差异。对 PM 来说，这是最快速建立"不同解码策略产出什么样的文本"直觉的方式。看完后你能具体说出"我们的客服场景应该用低温 + top-p 0.9，因为……"。

Outlines 库 / Structured Generation 官方文档 https://github.com/dottxt-ai/outlines ★☆☆ 选读加分 为什么推荐：Outlines 是 constrained decoding（受约束解码）的主流开源实现。你的文档中提到了 JSON Mode 和结构化输出，如果想理解"模型如何在每步只采样语法合法的 token"，这个项目的 README 和文档是最直接的信息源。对工程实现有好奇心的话值得花 20 分钟浏览。

---

## 第 9 章 · RAG 架构

Langchain 博客 — "RAG From Scratch" 系列 https://github.com/langchain-ai/rag-from-scratch ★★★ 强烈建议 为什么推荐：这个系列覆盖了你文档中 RAG 章节的所有核心概念（Hybrid Search、HyDE、Query Transformation、Multi-Query Retrieval、GraphRAG 基础），并且每个概念都有可运行的代码。对于从未动手搭过 RAG 的人，这是从"理解概念"到"知道如何落地"的关键桥梁。即使你不打算写代码，走一遍 notebook 看输入输出也能极大加深理解。

"Lost in the Middle" 论文 Liu et al., 2023. https://arxiv.org/abs/2307.03172 ★★☆ 推荐 为什么推荐：这篇论文是你文档中"中间迷失"现象的一手来源。它用系统实验证明了模型倾向于利用序列开头和结尾的信息，而忽略中间部分。这个发现直接影响 RAG 的 chunk 排列策略——重要信息应该放在 prompt 的开头或结尾。面试中如果被问"为什么长上下文不能替代 RAG"，这篇论文是标准答案的来源。

Microsoft GraphRAG 论文 — "From Local to Global: A Graph RAG Approach to Query-Focused Summarization" Edge et al., 2024. https://arxiv.org/abs/2404.16130 ★☆☆ 选读加分 为什么推荐：你的文档提到了 GraphRAG 解决多跳推理问题。这篇是微软发布的 GraphRAG 工程化方案，展示了如何从非结构化文本自动构建实体-关系图谱并用于检索。如果你的目标公司中有做知识库产品的（如秘塔科技），了解 GraphRAG 的具体实现会有直接帮助。

---

## 第 10 章 · Agent 技术栈

"ReAct: Synergizing Reasoning and Acting in Language Models" Yao et al., 2022. https://arxiv.org/abs/2210.03629 ★★☆ 推荐 为什么推荐：ReAct 是当前绝大多数 Agent 框架的理论基础。论文本身简洁优雅——核心思想就是让模型交替输出 Thought 和 Action。你的文档中给出了 ReAct 的示例，读这篇原论文能让你理解它在哪些场景下 work、在哪些场景下 fail，以及为什么 fail（错误积累）。考虑到你的目标公司列表中有 Monica/Manus，这是直接相关的基础知识。

Anthropic MCP 文档 — Model Context Protocol https://modelcontextprotocol.io ★★☆ 推荐 为什么推荐：MCP 正在快速成为 Agent-工具互操作的行业标准。了解 MCP 的协议设计和使用方式，对面试 Agent 方向的岗位是直接加分。文档本身不长，重点看 Architecture 和 Tools 部分。

Andrew Ng — "Agentic AI Design Patterns" (DeepLearning.AI 系列短课/讲座) 相关课程页面：https://www.deeplearning.ai/courses/ ★☆☆ 选读加分 为什么推荐：Andrew Ng 在多次讲座中系统总结了 Agentic AI 的四种核心设计模式（Reflection、Tool Use、Planning、Multi-Agent Collaboration）。如果你想用一个干净的框架快速理顺 Agent 产品的设计空间，他的总结比看五篇论文更高效。但这些内容已经在你的文档中有覆盖，所以是"如果有时间就看"的优先级。

---

## 第 11 章 · System 2 思维与 Test-Time Compute

[OpenAI](/kb/AI-公司与产品/OpenAI/) o1 系统卡 https://openai.com/index/openai-o1-system-card/ ★★☆ 推荐 为什么推荐：这是 o1 模型的官方技术说明，解释了"思考 token"的产品化呈现方式、安全对齐的特殊挑战（模型可能在 hidden chain-of-thought 中"欺骗"）、以及 test-time compute 的商业化思路。对理解第 11 章中"动态算力预算控制"和"思维过程白盒化"的产品落地有直接帮助。

DeepSeek-R1 技术报告 https://arxiv.org/abs/2501.12948 ★★☆ 推荐 为什么推荐：DeepSeek-R1 展示了如何通过纯 RL（不依赖大量 SFT 数据）训练出强推理能力，并且将推理过程（chain-of-thought）显式化。在国内 AI 面试中，对 DeepSeek 系列的熟悉度几乎是必修。重点看 Section 2-3 关于训练方法和消融实验的部分。

---

## 第 12 章 · 多模态融合与具身智能

CLIP 原始论文 — "Learning Transferable Visual Models From Natural Language Supervision" Radford et al., 2021. https://arxiv.org/abs/2103.00020 ★★☆ 推荐 为什么推荐：CLIP 是几乎所有多模态模型的起点。核心思想（对比学习将图文映射到同一隐空间）简洁强大，一旦理解，就能看懂后续 LLaVA、GPT-4V、DALL-E 等模型的架构逻辑。论文写得相对易读。Section 2（方法）是核心，约 15 分钟可以读完。

LLaVA 论文 — "Visual Instruction Tuning" Liu et al., 2023. https://arxiv.org/abs/2304.08485 ★☆☆ 选读加分 为什么推荐：LLaVA 是"视觉编码器 + LLM"这一主流多模态架构的代表作。如果你想理解"图像信息如何变成 LLM 可以处理的 token"，这篇论文的架构图（Figure 1）是最直观的。但除非面试目标包含多模态方向，这属于加分而非必要。

---

## 第 13 章 · 幻觉的不可消除性

"Sycophancy in Large Language Models" Sharma et al., 2023. https://arxiv.org/abs/2310.08688（或搜索 Anthropic sycophancy research） ★☆☆ 选读加分 为什么推荐：你的文档中对 Sycophancy 的描述精准，这篇论文提供了系统性实验证据。如果面试中被追问"为什么模型宁愿编造也不说不知道"，你能引用这个研究的具体发现。但你文档现有的论述已经足够，这属于锦上添花。

"Calibration of Large Language Models"（综述方向） 建议搜索：Kadavath et al., 2022 "Language Models (Mostly) Know What They Know" https://arxiv.org/abs/2207.05221 ★★☆ 推荐 为什么推荐：这篇论文直接对应你文档中新增的"校准问题"。它研究了 LLM 在什么情况下能正确判断自己是否知道答案。核心发现是模型确实有一定的自我知识，但校准程度远不够用于可靠的不确定性估计。这连接着你承接文档中"感知可靠性 ≠ 实际准确率"的产品方法论——你可以在面试中把滴滴案例和这篇论文的发现做类比。

---

## 第 14 章 · 模型评估体系

"Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena" Zheng et al., 2023. https://arxiv.org/abs/2306.05685 ★★☆ 推荐 为什么推荐：这是 LLM-as-a-Judge 的奠基论文，也是 Chatbot Arena（LMSYS）的技术基础。你的文档中提到的位置偏见和冗长偏见，这篇论文是一手来源，并给出了具体的缓解方案（随机交换顺序、分维度评分）。考虑到 Chatbot Arena 已经成为行业事实标准评估平台，了解它的方法论是有价值的。

---

## 第 15 章 · 数据墙与后训练霸权

"Textbooks Are All You Need" (Phi 系列) Gunasekar et al., 2023. https://arxiv.org/abs/2306.11644 ★★☆ 推荐 为什么推荐：微软的 Phi 系列模型用极小参数量（1.3B-3B）通过高质量合成数据达到了远超同级别模型的表现，实验性地验证了"数据质量 >> 数据量"这一判断。这篇论文是你文档中"后训练霸权"论点的最佳实证支撑。同时，它也是面试中讨论"小模型 vs 大模型"trade-off 时的好案例。

---

# 综合资源（跨章节）

Andrej Karpathy — "Let's reproduce GPT-2 (124M)" (YouTube, ~4h) https://www.youtube.com/watch?v=l8pRSuU81PU GitHub: https://github.com/karpathy/build-nanogpt ★★☆ 推荐 为什么推荐：这个视频完整走一遍"从空文件到训练出 GPT-2"的全过程，覆盖了你文档中多个章节的核心概念（tokenization、attention、训练循环、loss 函数、优化器）。4 小时时长较长，但它是把你文档中分散在各章节的概念串联成一条完整 pipeline 的最佳方式。如果你选择只看一个"大"资源，选这个。

Sebastian Raschka — "Build a Large Language Model (from Scratch)"（书籍） https://github.com/rasbt/LLMs-from-scratch ★★☆ 推荐 为什么推荐：Manning 出版的这本书配有完整的 GitHub 代码仓库，从 tokenization 到预训练、SFT、DPO 全部从零用 PyTorch 实现。与 Karpathy 视频不同，这本书覆盖了完整的后训练 pipeline（SFT + preference tuning），和你文档第 4 章的结构高度对应。适合在巴西/阿根廷期间作为系统性学习的主线教材。

Chip Huyen — "AI Engineering"（书籍，2025） ★☆☆ 选读加分 为什么推荐：Chip Huyen 从 AI 工程师/PM 视角出发，覆盖了模型选型、prompt engineering、RAG、Agent、评估和部署的实操框架。与你文档不同，她的侧重点不在底层原理而在工程决策和产品落地。作为补充视角有价值，但你的文档已经覆盖了大部分核心技术知识，这本更适合回国后做产品决策时参考。

---

## 学习路径建议（按时间紧迫度排序）

### 如果只有 20 小时（回国前最后冲刺）

1. Karpathy "Let's build GPT" (2h) → 第 1 章直觉
    
2. 3Blue1Brown Transformer 系列 (1.5h) → 第 3 章核心
    
3. Karpathy Tokenizer 视频 (2h) → 第 2 章
    
4. vLLM 博客 (0.5h) → 第 5 章
    
5. Chinchilla 论文核心部分 (1h) → 第 4/15 章
    
6. LoRA 论文 Section 1-2 (0.5h) → 第 4 章
    
7. ReAct 论文 (1h) → 第 10 章
    
8. DeepSeek-V3 报告 Section 2/4 (1.5h) → 第 6 章
    
9. DeepSeek-R1 报告 Section 2-3 (1h) → 第 11 章
    
10. DPO 论文 Section 1-3 (0.5h) → 第 4 章
    
11. RAG From Scratch 核心 notebooks (3h) → 第 9 章
    
12. 其余时间：HuggingFace 解码策略博客、CLIP 论文、"Lost in the Middle" 论文
    

### 如果有 40+ 小时（巴西/阿根廷期间系统学习）

以上全部 + Sebastian Raschka 的书作为主线 + 所有★☆☆标注的论文

---

索引版本：2026 年 3 月 17 日 配合 AI 技术底层逻辑与模型范式解析 v2 使用

  
**

---
title: AI技术底层逻辑 v2 - 扩展阅读索引
cluster: AI 基础知识库
created: '2026-05-13'
updated: '2026-05-16'
---
# AI 技术底层逻辑 v2 · 扩展阅读与学习资料索引

> 配合 [AI技术底层逻辑 v2 - 索引](/kb/ai-基础知识库/ai技术底层逻辑-v2-索引/) 使用。每条资料标注必要性等级。

---

## 第 1 章 · 认知重构

**Andrej Karpathy — "Let's build GPT: from scratch, in code, in spell"** (YouTube, ~2h)
https://www.youtube.com/watch?v=kCc8FmEb1nY
★★★ 从零用代码构建 GPT，完整走一遍 next-token prediction。比读十篇综述更能建立物理直觉。

## 第 2 章 · Tokenization 与词表工程

**Karpathy — "Let's Build the GPT Tokenizer"** (YouTube, ~2h13m)
https://www.youtube.com/watch?v=zduSFxRajkE
★★★ 从零实现 BPE tokenizer，演示 LLM 各种"怪异行为"如何追溯到 tokenization。

**Tiktokenizer（在线可视化工具）**
https://tiktokenizer.vercel.app
★★☆ 实时看不同 tokenizer 的分词结果和 token 数。

## 第 3 章 · Transformer 与注意力机制

**3Blue1Brown — Deep Learning 系列 Chapter 5-7** (~1.5h)
https://www.3blue1brown.com/lessons/gpt
★★★ 目前最清晰的 Transformer 机制可视化解释。

**"Attention Is All You Need" 原始论文**
https://arxiv.org/abs/1706.03762
★★☆ 开山之作，建议通读 Section 3 architecture 部分。

**GQA 论文**
https://arxiv.org/abs/2305.13245
★☆☆ MHA/MQA/GQA 三种方案对比。

## 第 4 章 · 训练 Pipeline

### 4.1 Scaling Laws

**Chinchilla 论文**
https://arxiv.org/abs/2203.15556
★★★ 最具产业影响力的单篇论文，Section 3-4 和 Table 1 必读。

**Epoch AI — Chinchilla 复现研究**
https://epoch.ai/publications/chinchilla-scaling-a-replication-attempt
★☆☆ 指出 Chinchilla 参数估计可能有问题。

### 4.2 SFT 与 PEFT

**LoRA 原始论文**
https://arxiv.org/abs/2106.09685
★★☆ Section 1-2 和 Figure 1 即可。

**LIMA 论文 — "Less Is More for Alignment"**
https://arxiv.org/abs/2305.11206
★☆☆ 1000 条高质量 SFT > 10 万条平庸数据。

### 4.3 偏好对齐

**DPO 论文**
https://arxiv.org/abs/2305.18290
★★☆ 理解了 DPO 为什么比 RLHF 更受欢迎即可，不需要理解证明。

**Constitutional AI 论文**
https://arxiv.org/abs/2212.08073
★☆☆ 合成数据质量过滤的理论基础。

## 第 5 章 · KV Cache

**vLLM Blog — PagedAttention**
https://blog.vllm.ai/2023/06/20/vllm.html
★★★ 10 分钟读完，直接获得面试可用的具体数据点。

**vLLM / PagedAttention 论文**
https://arxiv.org/abs/2309.06180
★☆☆ 博客信息密度已足够。

## 第 6 章 · 架构演进

**[DeepSeek](/kb/ai-公司与产品/deepseek/)-V3 技术报告**
https://arxiv.org/abs/2412.19437
★★☆ Section 2（架构设计）和 Section 4（训练效率）。

**Mamba 论文**
https://arxiv.org/abs/2312.00752
★☆☆ Section 3 解释 Mamba 如何通过输入相关的选择机制解决问题。

**Jamba 技术报告**
https://arxiv.org/abs/2403.19887
★☆☆ 最典型的 Transformer + Mamba 混合架构。

## 第 7 章 · 量化

**Tim Dettmers — INT8 量化入门**
https://huggingface.co/blog/hf-bitsandbytes-integration
★★☆ 理解 outlier 问题和混合精度分解方案。

**AWQ 论文**
https://arxiv.org/abs/2306.00978
★☆☆ 核心 insight：1% 的"显著权重"对模型性能至关重要。

## 第 8 章 · 解码策略

**Hugging Face — "How to Generate Text"**
https://huggingface.co/blog/how-to-generate
★★☆ 交互式代码示例对比不同解码方法。

**Outlines 库 / Structured Generation**
https://github.com/dottxt-ai/outlines
★☆☆ Constrained decoding 主流开源实现。

## 第 9 章 · RAG

**Langchain — "RAG From Scratch" 系列**
https://github.com/langchain-ai/rag-from-scratch
★★★ 从概念到代码落地的关键桥梁。

**"Lost in the Middle" 论文**
https://arxiv.org/abs/2307.03172
★★☆ 重要信息应放在 prompt 开头或结尾。

**Microsoft GraphRAG 论文**
https://arxiv.org/abs/2404.16130
★☆☆ 从非结构化文本构建实体-关系图谱。

## 第 10 章 · Agent

**ReAct 论文**
https://arxiv.org/abs/2210.03629
★★☆ 当前绝大多数 Agent 框架的理论基础。

**[Anthropic](/kb/ai-公司与产品/anthropic/) MCP 文档**
https://modelcontextprotocol.io
★★☆ 正在快速成为 Agent-工具互操作的行业标准。

**Andrew Ng — Agentic AI Design Patterns**
https://www.deeplearning.ai/courses/
★☆☆ 四种核心设计模式（Reflection、Tool Use、Planning、Multi-Agent Collaboration）。

## 第 11 章 · System 2 与 Test-Time Compute

**[OpenAI](/kb/ai-公司与产品/openai/) o1 系统卡**
https://openai.com/index/openai-o1-system-card/
★★☆ "思考 token"的产品化呈现方式、算力预算控制。

**DeepSeek-R1 技术报告**
https://arxiv.org/abs/2501.12948
★★☆ 纯 RL 训练强推理能力，Section 2-3 必读。

## 第 12 章 · 多模态

**CLIP 原始论文**
https://arxiv.org/abs/2103.00020
★★☆ 几乎所有多模态模型的起点，Section 2 约 15 分钟。

**LLaVA 论文**
https://arxiv.org/abs/2304.08485
★☆☆ "视觉编码器 + LLM"主流架构的代表作。

## 第 13 章 · 幻觉

**Sycophancy in LLMs**
https://arxiv.org/abs/2310.08688
★☆☆ 模型的系统性"谄媚"实验证据。

**Calibration — "Language Models (Mostly) Know What They Know"**
https://arxiv.org/abs/2207.05221
★★☆ 校准问题的奠基性研究。

## 第 14 章 · 评估体系

**LLM-as-a-Judge 奠基论文**
https://arxiv.org/abs/2306.05685
★★☆ Chatbot Arena 的技术基础。

## 第 15 章 · 数据墙

**"Textbooks Are All You Need" (Phi 系列)**
https://arxiv.org/abs/2306.11644
★★☆ 极小参数通过高质量合成数据达到远超同级别表现。

---

## 综合资源（跨章节）

**Karpathy — "Let's reproduce GPT-2 (124M)"** (~4h)
https://www.youtube.com/watch?v=l8pRSuU81PU
把分散在各章节的概念串联成一条完整 pipeline。如果只看一个"大"资源，选这个。

**Sebastian Raschka — "Build a Large Language Model (from Scratch)"**
https://github.com/rasbt/LLMs-from-scratch
从 tokenization 到预训练、SFT、DPO 全部从零 PyTorch 实现。

**Chip Huyen — "AI Engineering"（书籍，2025）**
侧重工程决策和产品落地，回国后做产品决策时参考。

---

## 学习路径建议

### 20 小时（回国前最后冲刺）
1. Karpathy "Let's build GPT" (2h) → c01
2. 3Blue1Brown Transformer 系列 (1.5h) → c03
3. Karpathy Tokenizer 视频 (2h) → c02
4. vLLM 博客 (0.5h) → c05
5. Chinchilla 论文核心 (1h) → c04/c15
6. LoRA 论文 Section 1-2 (0.5h) → c04
7. ReAct 论文 (1h) → c10
8. DeepSeek-V3 Section 2/4 (1.5h) → c06
9. DeepSeek-R1 Section 2-3 (1h) → c11
10. DPO 论文 Section 1-3 (0.5h) → c04
11. RAG From Scratch 核心 notebooks (3h) → c09
12. 其余时间：HuggingFace 解码策略博客、CLIP 论文、Lost in the Middle

### 40+ 小时（巴西/阿根廷期间系统学习）
以上全部 + Sebastian Raschka 书为主线 + 所有 ★☆☆ 论文

---

> 索引版本：2026 年 3 月 17 日 · [返回主索引](/kb/ai-基础知识库/ai技术底层逻辑-v2-索引/)

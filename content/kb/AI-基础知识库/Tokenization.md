---
title: Tokenization
cluster: AI 基础知识库
created: '2026-06-03'
updated: '2026-06-03'
---

# Tokenization

## 一句话定义

**把人类输入的字符流切成模型能处理的离散单位（token）的过程**。Tokenization 是 LLM 的入口与出口——决定模型看到什么、产出什么、按什么计费。

## 核心机制：BPE 及其变体

### BPE（Byte Pair Encoding）— 主流

从字符 / 字节级起步，统计训练语料中最高频的相邻 token 对，反复合并至词表达目标大小（通常 32K–128K）。

**关键性质**：BPE 不是"理解"语言，而是学习语料中的统计共现频率。高频字符序列获得独立 token，低频序列被拆成碎片。

### 各家变体对照

| 算法 | 代表使用者 | 区别 |
|------|----------|------|
| **BPE**（字节级） | GPT-2 起 / Llama / Mistral / DeepSeek | 通用、稳健 |
| **WordPiece** | BERT / DistilBERT | 优化的是 likelihood 而非频率 |
| **Unigram** | XLNet / mT5 | 概率模型，给出每个分词的概率 |
| **SentencePiece** | T5 / Llama / Gemma | BPE/Unigram 的封装；不依赖预分词；多语言友好 |
| **Tiktoken** | OpenAI 系列 | Byte-level BPE 的高效 Rust 实现 |

## 词表大小的演化

| 模型 | 词表 | 说明 |
|------|------|------|
| GPT-2 | 50,257 | byte-level BPE 起点 |
| GPT-3 / 3.5 | 50,257 | 与 GPT-2 同 |
| GPT-4o | ~200K | 大幅扩词表，中文/多语言效率显著改善 |
| Llama 2 | 32,000 | SentencePiece，英语偏向 |
| Llama 3 | 128,000 | 多语言能力大幅提升 |
| Qwen 2.5 | 151,936 | 中文优化 |
| DeepSeek-V3 | 128,000 | 中英平衡 |
| Claude 3+ | ~200K（推测） | 不公开 tokenizer 细节 |

**趋势**：词表越大 → 单 token 信息密度越高 → 同等内容 token 数减少 → 推理更快、成本更低，但 embedding 矩阵也更大。

## 对产品的三重影响

### 1. 成本直接绑定 token 数
API 按 token 计费。低效分词可能消耗 2-3 倍 token 数：
- GPT-2 tokenizer 对中文："你好世界" ≈ 8 tokens
- Llama 3 / GPT-4o tokenizer："你好世界" ≈ 2-3 tokens
- 对中文重度业务，选用现代多语言 tokenizer 是直接的成本优化

### 2. 上下文窗口的"实际容量"
英文 "Hello world" ≈ 2 tokens；同等信息量的中文在老 tokenizer 上可能消耗 3-5 倍。日语、阿拉伯语、印地语在小词表上更糟。

### 3. 模型能力的语言不平等
BPE 词表在英语上最高效，中文次之，小语种被拆成字节级碎片。这导致：
- 小语种 prompt 容易触达 context limit
- 小语种 chunk 的 [Embedding](/kb/ai-基础知识库/embedding/) 质量更差（语义边界混乱）
- 小语种用户的 API 成本更高（同样信息更多 token）

## 多模态统一 Token 空间

GPT-4o / Gemini 2 / Claude Sonnet 4 等多模态模型采用统一 token 流，将文本、图像 patch、音频帧全部编码进同一个 token 空间。

**图像 token 成本常被低估**：
- 一张 512×512 图像 ≈ 500-1000 个文本 token（OpenAI 计费基准）
- 高清图像（1024×1024 detail=high）≈ 1500+ tokens
- 视频按帧采样，1 分钟视频 ≈ 数万 token

PM 设计多模态产品要明确：用户上传图越大、视频越长，单次请求成本急剧上升。

## 产品决策锁定风险

Tokenizer 一旦确定几乎不可更改——所有权重与特定 token ID 绑定，更换词表等于重新训练。这有几个工程后果：
- **微调必须用预训练同款 tokenizer**
- **跨模型迁移 prompt** 时同一段文本 token 数不同，预算需重算
- **缓存（[Prompt Caching](/kb/ai-基础知识库/prompt-caching/)）** 命中以 token 序列为单位，跨 tokenizer 不可迁移

## 边界研究：无 Tokenizer 路线

- **Byte-Level Transformer**（如 ByT5 / MegaByte）：直接处理 UTF-8 字节，理论上消除 tokenizer。代价：序列变长（同等信息 byte 数 ≈ char 数 ≈ 2-4× tokens），训练算力增加。
- **Mamba / 状态空间模型**：对长序列处理更友好，使 byte-level 路线变得可行。
- **2026 状态**：byte-level / tokenizer-free 仍在研究阶段，工业生产仍以 BPE 为主。

详见 [拓展：无 Tokenizer 路线](/kb/ai-基础知识库/拓展-无-tokenizer-路线/) / [拓展：多模态统一 Tokenizer 空间](/kb/ai-基础知识库/拓展-多模态统一-tokenizer-空间/)。

## 对 AI PM 的隐藏陷阱

1. **演示 demo 的语言偏置**：英文 demo 流畅，中文 demo 慢且贵——根因可能是 tokenizer 而非模型本身
2. **用户字数限制怎么写？**"输入限 4000 字" vs "输入限 4000 tokens"，中文 vs 英文用户体感完全不同
3. **流式输出的"卡顿感"**：低效 tokenizer + 慢推理 → 用户感知"打字慢"，与延迟优化同样影响 UX
4. **多语言产品的成本核算**：单价 = 模型价 × token 倍数 × 语言系数
5. **prompt 模板压缩**：换更现代的 tokenizer 后，模板自动"变短"，可重新设计 prompt 复杂度
6. **token 计数器要内置**：让用户/PM 实时看到 token 消耗，避免突发账单

## 相关章节与节点

- [c02 Tokenization 与词表工程（详解）](/kb/ai-基础知识库/c02-tokenization-与词表工程/)
- [c03 Token 作为 Transformer 的输入](/kb/ai-基础知识库/c03-transformer-核心机制与注意力变体/)
- [c09 Tokenization 对检索的影响](/kb/ai-基础知识库/c09-rag-架构/)
- [c12 视觉 Tokenization](/kb/ai-基础知识库/c12-多模态融合与具身智能/)
- [拓展：无 Tokenizer 路线](/kb/ai-基础知识库/拓展-无-tokenizer-路线/)
- [拓展：多模态统一 Tokenizer 空间](/kb/ai-基础知识库/拓展-多模态统一-tokenizer-空间/)
- [Embedding](/kb/ai-基础知识库/embedding/)（token 序列 → 向量的下一步）
- [KV Cache](/kb/ai-基础知识库/kv-cache/)（按 token 为单位缓存）
- [BPE 分词 - 离散与连续的边界辨析](/kb/ai-基础知识库/bpe-分词-离散与连续的边界辨析/)
- [问题：为什么词表数量必须是离散有限的？](/kb/ai-基础知识库/问题-为什么词表数量必须是离散有限的/)

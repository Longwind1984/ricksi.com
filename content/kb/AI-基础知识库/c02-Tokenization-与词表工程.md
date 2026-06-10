---
title: c02 - Tokenization 与词表工程
cluster: AI 基础知识库
created: '2026-05-13'
updated: '2026-05-16'
---

# 2. Tokenization 与词表工程

[Tokenization](/kb/AI-基础知识库/Tokenization/) 是 LLM 最底层的机制之一，决定了模型"看到"什么、"说出"什么、以及每一次交互的真实成本。

## 2.1 BPE 分词的核心机制

当前主流 LLM 几乎都使用 Byte Pair Encoding (BPE) 或其变体。核心过程：从字符级起步，统计训练语料中最高频的相邻 [token](/kb/AI-基础知识库/Tokenization/) 对，反复合并，直至词表达到目标大小（通常 32K–128K）。

关键性质：BPE 不是"理解"语言，而是学习语料中的统计共现频率。

## 2.2 Tokenization 对产品的三重影响

**成本直接绑定**：API 按 token 计费。低效分词可能消耗 2-3 倍 token 数。

**上下文窗口的实际容量**：英文 "Hello world" ≈ 2 tokens，同等信息量的中文可能消耗 3-5 tokens。

**模型能力的语言不平等**：BPE 词表在英语上最高效，中文次之，小语种被拆成字节级碎片。

## 2.3 多语言产品的 Tokenization 陷阱

**中文分词效率**：早期模型（LLaMA-1）一个汉字可能被拆成 3 个字节级 token。后续中文模型（Qwen、ChatGLM、Yi）大幅改善。但小语种又会遭遇同样问题。

**代码与结构化文本**：代码中的缩进、括号、变量名等在不同 tokenizer 下消耗差异很大。

## 2.4 多模态统一 token 空间

GPT-4o 采用了统一 token 流，将文本、图像 patch、音频帧全部编码进同一个 token 空间。图像 token 成本常被低估——一张 512×512 图像可能等价于 500–1000 个文本 token。

## 2.5 扩展：产品决策与 Tokenizer

Tokenizer 一旦确定几乎不可更改——所有权重与特定 token ID 绑定，更换词表等于重新训练。产品选型时，tokenizer 设计是一个锁定风险。

相关概念卡：[Tokenization](/kb/AI-基础知识库/Tokenization/)
模块二延伸：[m203 Embedding 选型](/kb/AI-工程化与落地架构/m203-RAG-生产环境：Embedding-与文档解析/) — 多语言 Tokenization 效率差异如何影响 Embedding 模型选型
上一章：[c01 认知重构](/kb/AI-基础知识库/c01-认知重构：从确定性系统到概率系统/)
下一章：[c03 Transformer 核心机制](/kb/AI-基础知识库/c03-Transformer-核心机制与注意力变体/)

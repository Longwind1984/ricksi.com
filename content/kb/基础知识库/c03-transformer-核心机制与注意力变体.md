---
title: c03 - Transformer 核心机制与注意力变体
cluster: 基础知识库
created: '2026-05-13'
updated: '2026-05-16'
provenance: co
---

# 3. Transformer 核心机制与注意力变体演进

[Transformer](/kb/基础知识库/attention/) 是当前几乎所有大模型的基座架构。理解其核心机制是理解后续所有章节的前置条件。

## 3.1 Self-Attention 的物理直觉

每个 token 生成三个向量：Query (Q)、Key (K)、Value (V)。Q 是"我在找什么"，K 是"我能提供什么"，V 是"我的实际内容"。

Attention(Q, K, V) = [softmax](/kb/基础知识库/softmax/)(QK^T / √d_k) V

QK^T 的计算量随序列长度呈 O(N²) 增长——长文本成本暴涨的数学根源。

## 3.2 多头注意力 (MHA) → 分组查询注意力 (GQA) 的演进

**MHA**：每个注意力头拥有独立的 Q、K、V 投影。KV Cache 占用 ∝ H。

**MQA**：所有头共享同一组 K 和 V，KV Cache 缩小到 1/H。

**GQA**：将 H 个头分成 G 组，组内共享 K/V。LLaMA-2 70B、Qwen-2、Mistral 采用。在显存效率和精度之间取得最佳平衡。

**对产品的影响**：MHA → GQA 的演进是"同样的 GPU 能多服务几倍用户"的直接产品约束。

## 3.3 位置编码：RoPE 与长文本扩展

RoPE 通过旋转矩阵将位置信息编码进 Q 和 K 向量。通过修改旋转频率基数（YaRN、NTK-aware），可以将 4K 上下文模型外推到 128K+。

相关概念卡：[Attention 机制](/kb/基础知识库/attention/)、[KV Cache](/kb/基础知识库/kv-cache/)
模块二延伸：[m208 §2.5.4 模型服务层](/kb/工程化与落地架构/m208-ai-基础设施与中间件选型/) — vLLM/SGLang 如何利用注意力机制优化实现高吞吐推理
上一章：[c02 Tokenization](/kb/基础知识库/c02-tokenization-与词表工程/)
下一章：[c04 模型训练 Pipeline](/kb/基础知识库/c04-模型训练全阶段-pipeline/)

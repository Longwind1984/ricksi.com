---
title: Attention
cluster: 基础知识库
created: '2026-05-13'
updated: '2026-05-15'
provenance: co
---

# Attention 机制

## 核心思想

每个 token 生成三个向量：**Query (Q)**、**Key (K)**、**Value (V)**。

- **Q** — "我在找什么"
- **K** — "我能提供什么"  
- **V** — "我的实际内容"

Attention(Q, K, V) = softmax(QK^T / √d_k) V

QK^T 的计算量随序列长度呈 O(N²) 增长——这是长文本成本暴涨的数学根源。

## 多头注意力 → 分组查询注意力的演进

| 方案 | KV 头数 | KV Cache 占用 | 精度 |
|------|---------|---------------|------|
| MHA (Multi-Head) | = 总头数 H | 基线 | 最高 |
| MQA (Multi-Query) | 1 | 1/H | 有损 |
| GQA (Grouped-Query) | G 组 | G/H | 最佳折中 |

GQA 是当前主流（LLaMA-2 70B、Qwen-2、Mistral），在显存效率和精度之间取得最佳平衡。

## 位置编码：RoPE

RoPE 通过旋转矩阵将位置信息编码进 Q 和 K 向量，使注意力分数自然地随相对距离衰减。通过修改旋转频率基数（YaRN、NTK-aware），可以将 4K 上下文模型外推到 128K+。

## 相关章节

- [c03 Transformer 核心机制](/kb/基础知识库/c03-transformer-核心机制与注意力变体/)
- [c05 KV Cache — GQA 联动](/kb/基础知识库/c05-算力物理定律与-kv-cache/)
- [c06 SSM vs Attention](/kb/基础知识库/c06-架构演进-dense-moe-ssm-hybrid/)
- [c12 ViT 与多模态](/kb/基础知识库/c12-多模态融合与具身智能/)

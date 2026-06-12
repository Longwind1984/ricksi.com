---
title: Embedding
cluster: 基础知识库
created: '2026-05-22'
updated: '2026-05-22'
provenance: co
---

# Embedding / 向量嵌入

## 核心定义

将非结构化数据（文本、图像、音频）映射为高维连续向量（dense vector）的技术。Embedding 的核心价值是让"语义相近"的内容在向量空间中距离相近。

不是 LLM 时代的新发明——word2vec (2013)、GloVe、fastText 已是经典；LLM 时代真正改变的是"用预训练大模型的中间层作为通用 Embedding"这条路径，让单一模型既能生成又能检索。

## 核心应用

**语义搜索**：将查询和文档都转为 Embedding，通过余弦相似度找到最相关的内容（[c09 RAG 的密集检索](/kb/基础知识库/c09-rag-架构/)）。

**跨模态对齐**：[CLIP](/kb/基础知识库/自回归生成/) 将图像和文本映射到同一向量空间，实现用文字搜图片。

**降维与聚类**：将高维非结构化数据压缩为可计算的结构化表示（[c01 无监督学习](/kb/基础知识库/c01-认知重构-从确定性系统到概率系统/)）。

**去重 / 近邻判定**：网页 / 文档库的近重复检测、内容审核中识别变体绕过、推荐系统的冷启动相似度。

## Embedding 模型生态（2026 视角）

| 提供方 | 代表模型 | 维度 | 特点 |
|--------|---------|------|------|
| OpenAI | text-embedding-3-large/small | 256–3072（可缩放）| Matryoshka 训练，工业默认 |
| Cohere | Embed v3 | 1024 | 多语言强，re-rank 配套好 |
| Voyage AI | voyage-3 / voyage-code | 1024 | 代码 / 法律 / 金融垂直版本 |
| BGE (智源) | bge-m3 / bge-large | 1024 | 开源 + 中文最强基线之一 |
| Anthropic | （未提供原生 Embedding API，建议外接）| — | 走 RAG 时常配 Voyage / Cohere |

选型不只看 leaderboard——Recall@10 提升 2 个点常被向量维度翻倍的存储成本抵消。

## 检索范式：Sparse / Dense / Hybrid

- **Sparse（BM25 / SPLADE）**：传统倒排索引 + tf-idf 变体，对精确关键词、低频术语最稳
- **Dense（Embedding）**：语义相近的同义改写也能召回，但对罕见专名 / 数字 / 代码标识符弱
- **Hybrid**：典型生产配置——sparse 召回 + dense 召回 + reciprocal rank fusion (RRF)

Anthropic 的 Contextual Retrieval (2024) 论文证明：在 dense + sparse 基础上，把 chunk 用 prompt 加上下文再编码，能把检索失败率再降低 67%。

## 量化与压缩

为了把 1B 文档的向量库存进单机内存，量化是必须的：

- **int8 量化**：精度损失 <2%，存储缩 4 倍
- **二值化 (binary embedding)**：精度损失 5–10%，存储缩 32 倍，适合粗排
- **Matryoshka Representation Learning (MRL)**：训练时让前 256 / 512 / 1024 维都可单独使用，按场景截断而无需 re-train

## 向量数据库选型

| 库 | 类型 | 适用场景 |
|----|------|---------|
| pgvector | Postgres 扩展 | 小到中等规模、已用 PG、想避免多组件 |
| Pinecone | 托管 SaaS | 不想自运维、需要快速上量 |
| Qdrant | 自托管 Rust | 中等规模、需要混合过滤 + payload |
| Milvus | 自托管 / Zilliz | 大规模分布式（10B+ 向量）|
| Weaviate | 自托管 / 托管 | 内置混合检索 + 多模态 |
| LanceDB | embed-in-app | 桌面应用 / 单进程嵌入 |

## 局限性

- 对低频罕见词汇的 Embedding 往往失真（与 [Tokenization](/kb/基础知识库/tokenization/) 直接相关）
- 固定维度向量存在信息瓶颈
- 无法处理"多跳推理"——需结合 [GraphRAG](/kb/基础知识库/rag/) 或 Agentic Retrieval
- 不能直接表达"否定"——"不含巧克力的甜点"与"含巧克力的甜点"在 Embedding 空间中距离非常近
- Embedding 模型更换 = 全库重建索引，迁移成本高，选型即长期承诺

## 对 Rick 的 PM 价值

设计 RAG 系统时的检查清单：

1. **不要默认 Embedding 一招通吃**：先评估 BM25 基线，再上 Hybrid——常常 BM25 已能解决 80% 的问题
2. **Chunk 策略 > 模型选型**：固定 size 切块是 RAG 失败的最大单一原因；用结构化切（按章节 / 段落 / 语义）
3. **加 re-ranker**：dense 召回 top-50 + cross-encoder rerank top-5，质量提升立竿见影
4. **量化前先评估**：在自家 evaluation set 上测 int8 / binary 的实际 Recall 损失，不要相信通用 benchmark
5. **预算总向量库的更换成本**：选型时假设"一年内换模型"作为压力测试，看是否能承受

## 相关链接

- [c01 无监督学习](/kb/基础知识库/c01-认知重构-从确定性系统到概率系统/)
- [c09 密集向量检索](/kb/基础知识库/c09-rag-架构/)
- [c12 CLIP 跨模态对齐](/kb/基础知识库/c12-多模态融合与具身智能/)
- [Tokenization](/kb/基础知识库/tokenization/) [RAG](/kb/基础知识库/rag/) [Prompt Caching](/kb/基础知识库/prompt-caching/)

## 来源 / 证据池

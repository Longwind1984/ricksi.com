---
title: RAG
cluster: 基础知识库
created: '2026-06-03'
updated: '2026-06-03'
provenance: co
---

# RAG 检索增强生成

## 一句话定义

**RAG = 在生成前先检索相关知识，把检索结果注入 prompt 让 LLM 据此回答**。本质是建立**非参数化记忆（Non-parametric Memory）**——知识存在外部库中，而非模型权重里。

## 核心定位（隐喻）

LLM 是负责逻辑计算的 CPU，RAG 是外挂的硬盘与实时内存。企图用微调将知识压入模型权重中，在工程上极其低效且容易引发 [灾难性遗忘](/kb/基础知识库/灾难性遗忘/)。

## 为什么不是用微调或长上下文？

| 方案 | 何时用 | 致命短板 |
|------|--------|---------|
| **SFT 注入知识** | 风格 / 行为塑形 | 难以更新；引发 [灾难性遗忘](/kb/基础知识库/灾难性遗忘/)；事实仍可能幻觉 |
| **长上下文（百万 token）** | 单次会话内的大文档分析 | Prefill O(N²) 算力爆炸；"中间迷失" (Lost in the Middle) |
| **RAG** | 大语料知识库 + 频繁更新 + 可追溯 | 检索质量天花板限制最终生成质量 |

详细决策矩阵见 [c04 RAG vs 微调](/kb/基础知识库/c04-模型训练全阶段-pipeline/)。

## 混合检索架构（Hybrid Search）

| 方法 | 优势 | 劣势 |
|------|------|------|
| 稀疏检索（BM25） | 专有名词 / 编号 / 法律条文召回率极高；可解释；快 | 无法理解语义同义 |
| 密集向量检索（[Embedding](/kb/基础知识库/embedding/)） | 语义匹配；跨语言；模糊 query | 低频罕见词 Embedding 失真；黑盒 |
| Hybrid（RRF 加权融合） | 综合两者优势 | 加权调参；工程复杂度上升 |
| Reranker（重排序） | 决定 RAG 体验的生死线 | 需额外模型推理 |

**经验法则**：先 BM25 + Embedding 各召回 Top-20 → RRF 融合 → Reranker 重排 → Top-3~5 喂给 LLM 生成。

## 高阶演化（2024-2026）

- **GraphRAG**（[Microsoft](/kb/ai-公司与产品/microsoft/) 2024）：构建实体-关系图谱，解决"多跳推理"问题。适合知识结构高度互联的领域（医学、法律、企业内部知识图）。
- **Contextual Retrieval**（[Anthropic](/kb/ai-公司与产品/anthropic/) 2024-09）：在 chunk 前用 LLM 加一段"该 chunk 在原文档中的位置/上下文"说明。Anthropic 报告把检索失败率降低 ~67%（限其 benchmark）。
- **Adaptive RAG**：先判断 query 是否需要检索（简单事实/闲聊不检索）、再决定检索深度（单跳 / 多跳）。
- **Agentic RAG**：检索作为 [Agent](/kb/基础知识库/agent/) 工具之一；模型自行决定何时检索、检索什么、是否多次迭代检索。
- **Late Interaction（ColBERT）**：query 与 doc token 级别交互，介于 cross-encoder 与 bi-encoder 之间，召回精度更高。

## 工程要素

### 1. 分块（Chunking）策略
- 固定大小（256 / 512 / 1024 tokens）— 最简单但可能切断语义
- 语义分块（按段落 / Markdown 标题）— 答案更连贯
- **层级分块**：小 chunk（128 tokens）召回 + 大 chunk（含上下文，1024 tokens）喂生成 — 当前最佳实践

### 2. 向量库选型（2026 主流）
| 选项 | 适用场景 |
|------|---------|
| **pgvector**（Postgres 扩展）| 已有 Postgres / 中小规模 / 需要事务一致性 |
| **Qdrant** | 开源 / 中型规模 / Rust 性能 |
| **Weaviate** | 开源 / 模块化 / 自带 hybrid search |
| **Milvus / Zilliz Cloud** | 亿级以上向量 / 工业级 |
| **Pinecone** | SaaS 优先 / 不想运维 |
| **LanceDB** | 嵌入式 / 边缘 / 本地 RAG |

### 3. 评估解耦
- **检索评估**：Hit Rate@K、MRR、Recall@K（看候选有没有相关 chunk）
- **生成评估**：Faithfulness（生成有没有忠于检索到的 chunk）、Answer Relevance（回答了 query 没有）
- 工具：Ragas、TruLens、LlamaIndex Eval

### 4. Query 转换
- HyDE：让 LLM 先生成"假回答"，用假回答的 embedding 检索（缓解 query 太短的问题）
- Query Rewriting：长对话场景把多轮 query 改写成独立 query
- Query Decomposition：复杂 query 拆成多个子 query 分别检索

## 常见失败模式（AI PM 必看）

1. **召回正确但 Reranker 没把它排到 Top**：体验上看像"知识库没有这条"，实则有
2. **Chunk 太碎答案断片**：用户问"X 的完整流程"，命中三个分散 chunk 但缺连接
3. **专有名词被 Embedding 模型映射偏**（如内部产品代号没在预训练语料中）→ BM25 兜底必要
4. **多语言失衡**：英文 chunk 与中文 query 跨语言检索精度差 → 用多语言 embedding 模型
5. **更新延迟**：用户感知到知识库已更新但检索还命中旧 chunk → 索引重建策略
6. **Prompt 注入风险**：检索到的不可信 chunk 被当作指令执行 → chunk 与指令明确分隔

## RAG 框架生态

| 框架 | 定位 | 何时选 |
|------|------|--------|
| **LlamaIndex** | 数据连接器 + 索引为核心 | 数据源多、需要多种索引结构 |
| **LangChain** | Pipeline / Agent 编排 | 已是 LangChain 栈、需要多 chain 串联 |
| **Haystack** | 企业级 RAG / 偏 NLP 工业流水线 | 欧洲 / 需要可解释 retrieval |
| **DSPy** | 把 prompt 当作可优化变量 | 想用编译器思路优化 RAG |
| **Custom** | 强 PM 控制力 | 体验决定性强 / 不想被框架绑死 |

## 对 AI PM 的设计 Checklist

1. **是否真的需要 RAG？** 知识更新频率？事实可追溯性需求？如果都不强，未必要上 RAG。
2. **检索是否要让用户感知？** 显示"引用来源" vs 隐身。前者 build trust，后者保持流畅。
3. **失败回落策略**：检索为空时模型应该说"不知道"还是开放生成？
4. **新鲜度承诺**：用户期望"问得到今天的事"？索引刷新频率？
5. **可观测性**：日志要不要保留"哪条 query 命中了哪些 chunk"？影响 debug 与产品迭代速度。
6. **成本曲线**：embedding 一次性成本 + 检索每次推理 + Reranker 推理 + LLM 生成；规模化前算好。

## 相关章节与节点

- [c04 RAG vs 微调决策](/kb/基础知识库/c04-模型训练全阶段-pipeline/)
- [c09 RAG 架构详解（工程版）](/kb/基础知识库/c09-rag-架构/)
- [c13 RAG 作为幻觉应对策略](/kb/基础知识库/c13-幻觉的不可消除性/)
- [Embedding 向量嵌入](/kb/基础知识库/embedding/)（密集检索的底层技术）
- [Tokenization](/kb/基础知识库/tokenization/)（影响检索精度）
- [灾难性遗忘](/kb/基础知识库/灾难性遗忘/)（RAG 不引发遗忘，优于 SFT 注入知识）
- [Function Calling](/kb/基础知识库/function-calling/)（Agentic RAG 的工具调用基础）

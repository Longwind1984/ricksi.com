---
title: Prompt Caching
cluster: AI 基础知识库
created: '2026-05-18'
updated: '2026-05-18'
---

# Prompt Caching

> 大模型推理优化技术：把一段反复使用的 prompt 前缀（系统提示、工具定义、长文档、few-shot 例子）的 KV Cache 缓存在服务端，下次请求带相同前缀时直接复用，跳过这部分的 prefill 计算与 Token 计费。是 2024 年 [Anthropic](/kb/AI-公司与产品/Anthropic/) 公开商业化、随后被 [OpenAI](/kb/AI-公司与产品/OpenAI/) / Google / [DeepSeek](/kb/AI-公司与产品/DeepSeek/) 等全行业跟进的标准能力。对长上下文 / 工具调用 / Agent 类应用是数量级的成本与延迟优化。

## 工作原理（与 KV Cache 的关系）
- 大模型推理分两阶段：**prefill**（计算输入 token 的 KV 矩阵）和 **decode**（逐 token 生成）。
- prefill 计算量随上下文长度线性增长；Agent / 长对话 / 长文档检索场景下，prefill 是延迟与计费的大头。
- prompt caching 的核心：**前缀相同的请求，KV Cache 可以原样复用**。服务端把高频前缀的 KV 矩阵保存在 GPU 显存或 CPU 内存中，命中时只需新增 token 的增量计算。
- 与 [KV Cache](/kb/AI-基础知识库/KV-Cache/) 的区别：KV Cache 是模型推理过程中"逐 token 累积已计算 KV"的内部机制（解决重复计算同一前缀）；prompt caching 把这一机制**跨请求**复用，是把单次推理优化扩展到多请求场景的工程外延。

## 各家实现差异
- **[Anthropic](/kb/AI-公司与产品/Anthropic/) Claude**（2024.8 公开 GA）
  - 显式标记：开发者在 prompt 中加 `cache_control` 字段标识可缓存段（最多 4 段）
  - 价格：缓存写入 = 1.25x 标准 token 价；缓存命中 = 0.1x 标准 token 价（约 90% 折扣）
  - 缓存 TTL：默认 5 分钟（可付费延长到 1 小时）
- **[OpenAI](/kb/AI-公司与产品/OpenAI/) GPT**（2024.10 公开自动缓存）
  - 自动模式：≥ 1024 token 的前缀自动缓存，无需开发者标记
  - 命中折扣：50%（命中 token 半价）；无显式写入费用
  - TTL：5–10 分钟
- **Google Gemini**（context caching API）
  - 显式 API：开发者通过 `CreateCachedContent` 上传可缓存内容，按存储时长付费
  - 适合超大文档（百万级 token）的反复查询场景
- **[DeepSeek](/kb/AI-公司与产品/DeepSeek/) / 国内 lab**
  - DeepSeek 走了"完全自动 + 极低价"路线，命中折扣 90%；触发条件比 OpenAI 更宽松
- **共同特征**：所有实现都要求前缀**完全相同**（一字之差就 miss）；TTL 短（避免显存占用）；不跨用户共享（隐私 + 安全）

## 应用场景
- **Agent 系统**：系统提示、工具定义、Memory 上下文常在多轮交互中保持不变——是 Anthropic 最初公开 caching 时主打的场景。Rick 在 [Agent 产品化](/kb/AI-工程化与落地架构/m206-Agent-产品化：记忆机制与技术进展/) 中讨论的"长上下文 Agent 成本结构"，prompt caching 是核心优化手段。
- **长文档问答**：把整本书、整份合同、整套代码库放进 prompt 的"document Q&A"模式——首问全价、后续命中折扣
- **Few-shot 示例库**：高频复用的示例集（如代码风格示例、客服对话样本）放在 prompt 开头
- **多轮对话**：会话历史作为前缀，每轮只增量计费新消息
- **批量处理**：同一系统提示下批量执行不同任务（如 1000 篇文章的同种分析）

## 限制与陷阱
- **前缀必须完全一致**：包括标点、空白、换行——动态拼接 prompt 时一个变量插在前面，命中率瞬间归零。最佳实践：**静态内容前置、动态内容后置**。
- **TTL 不可靠**：实际命中率受服务器负载、显存压力影响，文档承诺的 5 分钟可能实际短得多。生产环境需要监控命中率指标。
- **跨账户不共享**：组织 A 缓存的 prompt，组织 B 用一样的 prompt 也是 miss——是 SaaS 厂商希望 cache 命中但实际命中率低的常见原因。
- **写入也要钱**（Anthropic）：第一次写入比标准 token 贵 25%；如果某个 prompt 只命中一次，反而比不缓存更贵。门槛粗算：**需要命中至少 1–2 次才回本**。
- **不影响输出质量**：纯工程优化，不改变模型行为；但调试时 cache 命中 vs miss 可能导致延迟差异，需要在 perf 测试中注意区分。

## 对 Rick 的价值
- **AI PM 的成本意识基础**：Agent 类产品的单位经济模型 (unit economics) 高度依赖 prompt caching 是否被正确使用。理解 prompt caching 是评估"一个 AI 产品能否做大"的工程前提——Rick 在 [Agent 产品化](/kb/AI-工程化与落地架构/m206-Agent-产品化：记忆机制与技术进展/) 和 [算力物理定律](/kb/AI-基础知识库/c05-算力物理定律与-KV-Cache/) 章节都触及这一点。
- **产品 architecture 设计原则**：把"静态系统提示 + 动态用户输入"分离，是 prompt caching 友好的产品设计范式；这一原则也延伸到 [Function Calling](/kb/AI-基础知识库/Function-Calling/) 工具定义的稳定性、Memory 系统的状态管理。
- **多模型分层路由的成本基线**：Rick 在 [多模型分层](/kb/AI-基础知识库/多模型分层/) 中讨论的"按任务难度选择不同模型"路线，必须考虑各家 prompt caching 折扣差异——caching 友好的模型在"重前缀 + 轻输出"场景下成本可能反超号称便宜的模型。
- **Claude Code 设计原理参考**：[Claude Code](/kb/AI-公司与产品/Claude-Code/) 通过 system reminder / context compaction 等机制把 token 复用最大化，本质是 prompt caching 友好型 IDE Agent 的产品化样板。

## 关联节点
- 上游：[KV Cache](/kb/AI-基础知识库/KV-Cache/) Transformer [c05 - 算力物理定律与 KV Cache](/kb/AI-基础知识库/c05-算力物理定律与-KV-Cache/)
- 服务商：[Anthropic](/kb/AI-公司与产品/Anthropic/) [OpenAI](/kb/AI-公司与产品/OpenAI/) Google [Gemini](/kb/AI-公司与产品/Gemini/) [DeepSeek](/kb/AI-公司与产品/DeepSeek/)
- 产品形态：[Claude Code](/kb/AI-公司与产品/Claude-Code/) [Agent](/kb/AI-基础知识库/Agent/) [Function Calling](/kb/AI-基础知识库/Function-Calling/)
- 议题：[m206 - Agent 产品化：记忆机制与技术进展](/kb/AI-工程化与落地架构/m206-Agent-产品化：记忆机制与技术进展/) [多模型分层](/kb/AI-基础知识库/多模型分层/)
- 上下文：长上下文（如存在）

## 来源 / 证据池
- Anthropic 官方文档：anthropic.com/docs/build-with-claude/prompt-caching
- OpenAI 文档：platform.openai.com/docs/guides/prompt-caching
- Google AI 文档：ai.google.dev/gemini-api/docs/caching
- 经验文章：Anthropic 工程博客、Latent Space 与 Stratechery 的 caching 经济模型分析
- （待补充：从 Cubox 反链汇集的具体证据）

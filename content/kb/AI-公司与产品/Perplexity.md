---
title: Perplexity
cluster: AI 公司与产品
created: '2026-05-15'
updated: '2026-05-16'
provenance: co
---

# Perplexity

> AI 答案引擎（answer engine），把 [RAG](/kb/基础知识库/rag/) 模式做成 C 端消费产品。主张"以可溯源的答案替代蓝色链接列表"，是搜索范式从"导航 → 回答"迁移的代表样本。由 Aravind Srinivas（前 OpenAI / DeepMind）2022 年在旧金山创立。

## 产品画像
- **核心交付**：自然语言问 → 自然语言答 + 引用源链接 + 后续追问建议（Related）。
- **底层模式**：实时网页检索 + 排序 + LLM 总结生成；模型不固定（用户可在 GPT/Claude/Gemini/DeepSeek/自研 Sonar 间切换）。
- **关键 SKU**：
  - 免费版：基础回答 + 每日少量 Pro 查询。
  - **Pro**：多模型切换、Pro Search（多轮深检索）、文件上传。
  - **Spaces**：将一组源 / 提示 / 共享笔记圈成"主题工作区"，团队协作。
  - **Comet**（2024–2025）：AI 浏览器 / 桌面端，把 Perplexity 当作浏览器默认搜索 + 上下文捕获工具。
  - **Enterprise Pro** + **Perplexity API**：把"答案 + 引用"作为基础设施卖给开发者 / 公司。

## 商业与资本
- 估值：2025–2026 已突破 90 亿美元；Nvidia、Jeff Bezos、IVP、NEA、SoftBank 等参与多轮融资。
- 模式：订阅（Pro）+ API + 企业版；与 [Anthropic](/kb/ai-公司与产品/anthropic/)、[OpenAI](/kb/ai-公司与产品/openai/)、[DeepSeek](/kb/ai-公司与产品/deepseek/) 等模型提供方议价采购计算 / 推理。
- 营收口碑反差：用户增长极快但毛利低（搜索 + LLM 双成本）；持续被质疑长期单位经济模型。

## 与同类对比
- **vs. ChatGPT Search / Bing Copilot**：Perplexity 更聚焦"问答 + 引用"单一动作，UI 极简；ChatGPT 把搜索作为更宽 Agent 链路的一环。
- **vs. Google AI Overviews**：Google 的优势是搜索索引本身和分发；Perplexity 的优势是产品形态和品牌 narrative，但抗不过分发劣势。
- **vs. [DeepSeek](/kb/ai-公司与产品/deepseek/) / Kimi / 元宝**：国内同类产品在中文垂直信源（微信、知乎、B站）上更强；Perplexity 在英文权威源（学术、新闻、文档）覆盖更好。

## 主要争议
- **抓取与版权**：被 Forbes、New York Times、Wired、Wikimedia 等多次指控未授权抓取与抄袭式摘要。后续调整 robots.txt 遵守策略 + 推出"出版商收入分成计划"。
- **答案幻觉与引用错位**：早期版本被多次发现"引用了源 A 但内容来自源 B 或纯生成"。属于 [RAG](/kb/基础知识库/rag/) 产品的通病——Perplexity 是被聚光的样板。
- **品牌过度承诺**：CEO 频繁公开声称"取代 Google"，但分发与 ecosystem 差距客观仍大。

## 对 Rick 的价值
- **AI 搜索范式的"教科书级案例"**：Perplexity 把 [RAG](/kb/基础知识库/rag/) 从工程模式做成 C 端产品的完整路径——选源、排序、生成、引用、追问、记忆——每个环节都对应 [m203 - RAG 生产环境：Embedding 与文档解析](/kb/工程化与落地架构/m203-rag-生产环境-embedding-与文档解析/) / [m204 - RAG 生产环境：Chunking 与范式演进](/kb/工程化与落地架构/m204-rag-生产环境-chunking-与范式演进/) / [m205 - RAG 生产环境：索引运维与评估体系](/kb/工程化与落地架构/m205-rag-生产环境-索引运维与评估体系/) 里的一个具体决策。是 Rick 评估"垂直答案产品"时的对照基线。
- **交互范式样本**：Related Questions（追问推荐）、Spaces（主题工作区）、Comet（浏览器内嵌）共同构成"非对话框 AI 入口"的样本——对应 [p302 - 七种 AI 交互设计模式](/kb/产品设计与交互范式/p302-七种-ai-交互设计模式/) 的多个模式。
- **AI PM 商业模型的反面教材**：Perplexity 同时演示了"产品形态领先 + 单位经济亏损"的张力，是 Rick 评估自己 AI 产品商业模式时常用的 pessimistic case。

## 关联节点
- 技术：[RAG](/kb/基础知识库/rag/) [Embedding](/kb/基础知识库/embedding/) [Function Calling](/kb/基础知识库/function-calling/) [c09 - RAG 架构](/kb/基础知识库/c09-rag-架构/)
- 同类产品：[ChatGPT](/kb/ai-公司与产品/chatgpt/) [Gemini](/kb/ai-公司与产品/gemini/) [Manus](/kb/ai-公司与产品/manus/)
- 交互议题：[p302 - 七种 AI 交互设计模式](/kb/产品设计与交互范式/p302-七种-ai-交互设计模式/) [p306 - 数据飞轮与反馈回路设计](/kb/产品设计与交互范式/p306-数据飞轮与反馈回路设计/)
- 工程议题：[m203 - RAG 生产环境：Embedding 与文档解析](/kb/工程化与落地架构/m203-rag-生产环境-embedding-与文档解析/) [m204 - RAG 生产环境：Chunking 与范式演进](/kb/工程化与落地架构/m204-rag-生产环境-chunking-与范式演进/) [m205 - RAG 生产环境：索引运维与评估体系](/kb/工程化与落地架构/m205-rag-生产环境-索引运维与评估体系/)

## 来源 / 证据池
- 公开来源：Perplexity 官方博客、Aravind Srinivas 公开访谈（Stratechery、Lex Fridman、Acquired）、版权争议报道（Forbes、NYT）

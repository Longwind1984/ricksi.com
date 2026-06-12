---
title: ChatGPT
cluster: AI 公司与产品
created: '2026-05-15'
updated: '2026-05-17'
provenance: co
---

# ChatGPT

> [OpenAI](/kb/ai-公司与产品/openai/) 的对话式 AI 产品，2022-11-30 公测后 5 天破百万用户、2 个月破亿，是消费互联网历史上增长最快的应用。把"大语言模型"从研究术语变成大众日常工具，并由此重新定义了 AI 产品的形态、估值与人才市场。

## 产品定义
- **底层模型**：GPT 系列（GPT-3.5 → GPT-4 → GPT-4o → GPT-5 → o1/o3 推理模型），由 OpenAI 自研。
- **接口形态**：对话框 + 文件上传 + 图像理解 + 实时语音 + Canvas 协作 + 多步 [Agent](/kb/基础知识库/agent/)（Operator、Apps in ChatGPT）。
- **付费层级**：Free / Plus（20 美元/月）/ Pro（200 美元/月）/ Team / Enterprise / Edu。
- **使用量级**：2026 月活用户量级在 4–5 亿，远超任何其他 AI 应用；同时是 [OpenAI](/kb/ai-公司与产品/openai/) 主要收入来源（订阅 + 企业版）。

## 演化时间线
- **2022.11** ChatGPT 公测（基于 GPT-3.5 + RLHF 对齐）。原始命名只是 OpenAI 把 InstructGPT 包了对话 UI 的"研究 demo"，未预期会爆。
- **2023.3** GPT-4 + ChatGPT Plus；ChatGPT 插件商店（短命，2023 末被关停）。
- **2023.11** GPTs（用户自定义 GPT）+ Assistants API + ChatGPT Voice。Sam Altman "OpenAI 五日政变"发生在同月。
- **2024.5** GPT-4o "Omni"——单一模型原生支持文本/图像/音频；Realtime API 把语音对话延迟压到 ~300ms 级。
- **2024.9** o1 推理模型上线 ChatGPT Pro，开启 Long CoT 在产品端的应用。
- **2025** GPT-5、Canvas、Operator（Computer Use 同类）、Apps in ChatGPT（App Store 形态）。
- **2026** 走向"AI 操作系统"——把第三方应用嵌入对话流，Custom GPT + Apps + Tasks 形成多模态平台层；同时面临 [Claude](/kb/ai-公司与产品/claude/) / [Gemini](/kb/ai-公司与产品/gemini/) 的紧逼。

## 产品设计特征
- **对话流为单一交互骨架**：所有能力（文档、图像、语音、Agent、插件、应用）都收敛到一个对话框入口。这一选择带来"用户心智简单"的红利，也带来"功能堆叠后入口拥挤"的代价。
- **能力快速堆叠 + 体验稳定性弱**：GPT-4o → o1 → Tasks → Apps 各代特性迭代极快，但功能间界面与一致性较弱，Plus 用户常需"手动选模型"。这是 Rick 〔私人记录〕 笔记里点名的典型反面案例之一。
- **"客服化"批评**：在 2025–2026 国内外多位评论者（含 Rick 的 〔私人记录〕 札记）认为 ChatGPT 在通用性/默认人设上趋于保守、对深度任务的"思考味道"弱于 Claude。
- **平台化定位**：从"AI 工具"显著转向"AI 应用商店与 OS"——Apps in ChatGPT 让第三方 SaaS 直接嵌入对话流，是 m205 - AI 产品形态：从工具到 Agent 框架里的"消费者侧 Agent 平台"代表。

## 与同行对比
- **vs. [Claude](/kb/ai-公司与产品/claude/)**：ChatGPT 强在多模态全栈与消费者品牌，Claude 强在长文档/编码/对齐质量。开发者社区里 2025–2026 普遍倾向 Claude 做严肃工作，ChatGPT 做日常对话。
- **vs. [Gemini](/kb/ai-公司与产品/gemini/)**：Gemini 占 Google 生态分发与搜索绑定，ChatGPT 占独立品牌入口。Gemini Advanced 在长上下文（2M token）与 Workspace 集成上有优势。
- **vs. [Perplexity](/kb/ai-公司与产品/perplexity/)**：ChatGPT 是"对话 + 信息检索"的瑞士军刀，Perplexity 是垂直搜索；ChatGPT 在 Search 模式后已部分蚕食 Perplexity 用户。
- **vs. DeepSeek / 国内 chatbot**：DeepSeek 开源 + 低价；ChatGPT 收 20 美元/月并占据全球品牌位。两者价格 × 渠道 × 监管的差异已结构化。

## 对 Rick 的价值
- **AI 产品形态演化的活样本**：从"对话框"→"插件 / GPTs"→"Realtime / Canvas"→"Apps + Agent 平台"的演化路径是 m205 - AI 产品形态：从工具到 Agent 与 [p302 - 七种 AI 交互设计模式](/kb/产品设计与交互范式/p302-七种-ai-交互设计模式/) 的现成案例库。
- **反面教材意义**：Rick 多次记录"ChatGPT 沦为客服"的体验——这是研究"模型能力领先 ≠ 产品体验领先"的最好对照组（〔私人记录〕）。
- **职业判断锚点**：评估"加入 OpenAI 还是 Anthropic / Google"时，ChatGPT 的产品节奏与 Claude / Gemini 的对比是直接的工作流体验参考。
- **付费决策依据**：作为 Plus / Pro 用户，理解迭代节奏（"等下个模型"还是"立即用"）影响日常工作效率。Rick 目前主力 Claude，ChatGPT 是次要参考。

## 关联节点
- 公司：[OpenAI](/kb/ai-公司与产品/openai/) [Microsoft](/kb/ai-公司与产品/microsoft/)
- 产品对照：[Claude](/kb/ai-公司与产品/claude/) [Gemini](/kb/ai-公司与产品/gemini/) [Perplexity](/kb/ai-公司与产品/perplexity/) [DeepSeek](/kb/ai-公司与产品/deepseek/)
- 技术：[RLHF](/kb/基础知识库/rlhf/) c11 - 推理模型与 Long CoT [Agent](/kb/基础知识库/agent/) [Function Calling](/kb/基础知识库/function-calling/) [Computer Use](/kb/ai-公司与产品/computer-use/)
- 产品议题：m205 - AI 产品形态：从工具到 Agent [p302 - 七种 AI 交互设计模式](/kb/产品设计与交互范式/p302-七种-ai-交互设计模式/) 〔私人记录〕 〔私人记录〕

## 来源 / 证据池

<!-- evidence-pool-start -->
> [!quote]+ 📎 证据池 · 41 条 · 自动生成于 2026-05-16
>
> ## A 级精读
> - 设计分享-AI产品深度分析报告（三）-2026-04-04 · 2026-04-04 · 爱淘器设计 主要从事产品策划/品牌策划/营销策划，产品设计，品牌视觉设计，展示设计 结构设计，原型制作，批量生产跟踪，U
> - Transformers, the tech behind LLMs - Deep Learning Chapter 5-2026-03-23 · 2026-03-23 · Formally speaking, a GPT is a Generative Pre-Trained Transfo
> - 对话尤瓦尔·赫拉利：人类对秩序的渴求先于真相，是互联网和AI控制个人的首要原因-2026-03-06 · 2026-03-06 · 腾讯科技《AI未来指北》作者 博阳 编辑 郑可君 对话尤瓦尔·赫拉利（音频全程实录） ,腾讯科技 ,52分钟 进度条 3
> - 〔私人记录〕 · 2026-03-04 · AI 巨头对比札记：微软 Copilot 落地差、谷歌产品意志缺位、ChatGPT 沦为客服，唯有 Anthropic/
> - 深度｜收入8个月翻4倍，自动化神器n8n创始人：AI要么是一个巨大的机遇，要么是公司的终结-2025-10-13 · 2025-10-13 · Z Potentials 我们与Z Potentials同频共振 488篇原创内容 公众号 ， 图片来源：EU-Star
> - OpenAI正在押注一场系统级豪赌｜奥特曼最新重磅访谈-2025-10-09 · 2025-10-09 · 10月9日消息，DevDay大会落幕后，山姆・奥特曼再次登上Stratechery访谈节目。这一次，他不谈模型，不谈AG
> - 博肯福德（施密特最著名的学生）｜〈世俗化与民主国家的问题〉（1967）-2025-09-25 · 2025-09-25 · 本文选自Religion, Law, and Democracy Selected Writings (Ernst-Wo
> - 博肯福德（施密特最著名的学生）｜〈理解卡尔-施密特宪法理论的一个关键〉（1988）-2025-09-25 · 2025-09-25 · 本文选自Constitutional and Political Theory Selected Writings, V
> - DeepSeek创始人专访：中国的AI不可能永远跟随，需要有人站到技术的前沿-2025-01-27 · 2025-01-27 · 一觉醒来，DeepSeek 发布的 iOS 应用超越了 ChatGPT，直接登顶 AppStore。
> - LLMs 推荐发展综述-生成型推荐 & 非生成型推荐-2024-11-24 · 2024-11-24 · 点击蓝字 关注我们
>
> ## B/C 级参考 (24 条)
> - B · 字节跳动超级智能体DeerFlow 2.0开源，登顶GitHub Trending第一！-2026-03-05 · 2026-03-05
> - B · Google又发布了一篇可能改变AI未来的论文，这次它教AI拥有了记忆。-2025-11-24 · 2025-11-24
> - B · AI Coding日志-序章-2025-11-17 · 2025-11-17
> - B · AI Coding日志-序章-2025-09-25 · 2025-09-25
> - B · 深度｜OpenAI研究员Dan Roberts：AI主流认知将被打破，未来某个时点强化学习将完全主导整个训练过程-2025-05-17 · 2025-05-17
> - B · 大厂产品范式被动摇，创业的可能性回归-2025-03-18 · 2025-03-18
> - B · 选择-杂交-突变，DeepMind将自然选择引入LLM思维，实现心智进化-2025-01-24 · 2025-01-24
> - B · OpenAI发布智能体Operator！能推理、联网自主执行任务-2025-01-24 · 2025-01-24
> - B · ChunkRAG：比CRAG提升10个点准确率-2024-11-25 · 2024-11-25
> - B · 一文读懂：从RAG到多模态RAG-2024-11-21 · 2024-11-21
> - ...还有 14 条
<!-- evidence-pool-end -->

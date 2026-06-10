---
title: Gemini
cluster: AI 公司与产品
created: '2026-05-15'
updated: '2026-05-17'
---

# Gemini

> Google DeepMind 的多模态大模型产品族，2023 年 12 月发布以替代 Bard。原生多模态（文本/图像/音频/视频/代码"端到端训练"）+ 长上下文（百万 token 级）+ 深度绑定 Google 生态（Search、Docs、Gmail、Android、Workspace）。是大厂派 AI 产品的代表，与 [OpenAI](/kb/ai-公司与产品/openai/) / [Anthropic](/kb/ai-公司与产品/anthropic/) 的"独立实验室"路径形成对照。

## 产品定义
- **底层模型**：Gemini 模型家族（Nano / Flash / Pro / Ultra），由 Google DeepMind 自研。原生多模态架构（与 GPT-4o 类似，区别于 GPT-4 时代的"图文拼接"路径）。
- **接口形态**：gemini.google.com 网页 + 移动 App + AI Studio + API + 嵌入 Google 全家桶（Search 的 AI Overviews、Workspace 的侧边栏、Pixel 的 Gemini Live）。
- **付费层级**：Free / Gemini Advanced（Google One AI Premium 20 美元/月）/ Workspace Business / Enterprise。
- **使用量级**：2026 月活用户估算 2–3 亿（多数来自 Google 生态被动分发），独立产品入口的活跃度弱于 [ChatGPT](/kb/ai-公司与产品/chatgpt/)。

## 演化时间线
- **2023.12** Gemini 1.0（Pro / Ultra）发布，宣告 Google 全面入场，但首发演示视频被指过度剪辑，舆情反弹。
- **2024.2** Gemini 1.5 Pro 上线，开启**百万 token 长上下文**赛道（之后扩到 2M token，是行业最长公开规模）。
- **2024.5** Gemini Flash + Gemini Live（语音对话），与 GPT-4o 同期对位。
- **2025** Gemini 2.0 / 2.5 系列；Deep Research（"研究型 Agent"形态，能花数十分钟生成长报告）；Workspace 全线集成。
- **2026** Gemini 3 系列；编程模型在 SWE-bench 等基准与 Claude / GPT-5 形成"三强并立"；KV cache 压缩论文（["谷歌的 DeepSeek 时刻"](20260325)）把 Gemini 编程模型的服务成本拉到行业最低水平。
- 2026 Rick 多次记录"Gemini 在 Deep Research、长文摘要、跨文档分析"任务上是不可替代的工具。

## 产品设计特征
- **长上下文 = 战略优势**：1M–2M token 上下文窗口是 Gemini 的第一性差异化。"把整本书 / 整个代码库 / 几小时视频一次性塞进去"是其他模型 2026 仍难匹敌的能力。
- **原生多模态**：从训练阶段就以多模态语料对齐，不是后接编码器。Pixel 上的实时摄像头识图 + Gemini Live 语音对话 → "AI 助手 = OS 一部分"的形态尝试。
- **大厂分发反向赋能**：Search AI Overviews 直接面向 Google 数十亿用户；Workspace 把 Gemini 塞进 Docs/Gmail/Sheets。这是 Anthropic / OpenAI 无法复制的渠道。
- **组织拖累的产品意志缺位**：Rick 多次评论 Google AI 产品"技术领先但产品决断力弱"——发布节奏被组织内部协调与品牌风险拖慢，导致很多模型能力没转化为体验领先。这是 20260304-AI产品体验的代差与组织问题 的标志性案例。
- **Deep Research 是少数突破**：在"长任务 + 网络搜索 + 报告生成"垂直里 Deep Research 比 [ChatGPT](/kb/ai-公司与产品/chatgpt/) 与 [Perplexity](/kb/ai-公司与产品/perplexity/) 体验都更稳，是 Gemini 的产品代表作。

## 与同行对比
- **vs. [ChatGPT](/kb/ai-公司与产品/chatgpt/)**：Gemini 强在长上下文、Workspace 集成、Deep Research；ChatGPT 强在独立品牌入口、应用商店生态、迭代速度。Gemini 在专业用户群的"严肃任务"占比上升中。
- **vs. [Claude](/kb/ai-公司与产品/claude/)**：Claude 在写作/编程/对齐质量上更精；Gemini 在多模态/长上下文/价格上占优。开发者层面 Claude > Gemini，企业采购层面 Gemini 在 Workspace 客户里占天然位。
- **vs. 其他大厂派**：Microsoft Copilot 在 Office 端、Apple Intelligence 在端侧、Meta AI 在 Instagram/WhatsApp——Gemini 是其中产品形态最完整、模型自研最强的一家。

## 对 Rick 的价值
- **"大厂派 AI 产品组织化失误"研究样本**：Rick 关注组织能力 × 产品体验的关系（20260304-AI产品体验的代差与组织问题）。Gemini 是研究"组织规模、协调成本、品牌风险厌恶"如何拖累产品决断的最佳活体案例。
- **长上下文工作流工具**：Deep Research + 长上下文摘要在 Rick 的 拉美旅行 资料整理、读书笔记综合、跨文档梳理工作里都不可替代——本库多个旅行笔记的来源是 Gemini Deep Research / Google AI Studio 输出（Try Gemini Deep Research-2026-01-12 Mexico Travelogue- Existential - Google AI Studio-2026-01-31）。
- **多模型工作流的固定槽**：Rick 已形成"Claude 主力写作 + Gemini Deep Research / 长文档 + ChatGPT 备份"的多模型工作栈，Gemini 在其中承担"长文本压缩 + 跨文档检索"的不可替代位置。
- **AI PM 视角的"反向案例库"**：Gemini 大量功能上线但用户感受迟钝，是研究"功能上线 ≠ 体验上线"的标准教材。

## 关联节点
- 公司：Google DeepMind Alphabet
- 产品对照：[ChatGPT](/kb/ai-公司与产品/chatgpt/) [Claude](/kb/ai-公司与产品/claude/) [Perplexity](/kb/ai-公司与产品/perplexity/) [DeepSeek](/kb/ai-公司与产品/deepseek/)
- 技术：多模态 [KV Cache](/kb/ai-基础知识库/kv-cache/) c08 - 长上下文 [Agent](/kb/ai-基础知识库/agent/) [Function Calling](/kb/ai-基础知识库/function-calling/)
- 产品议题：m205 - AI 产品形态：从工具到 Agent 20260304-AI产品体验的代差与组织问题 20260304-微博 AI 20260304-微软Copilot和谷歌Gemini的产品体验问题
- Rick 工作流：Try Gemini Deep Research-2026-01-12 Mexico Travelogue- Existential - Google AI Studio-2026-01-31

## 来源 / 证据池

（待补充: 从 Cubox 或永久笔记反链汇集到此节点的证据条目）

<!-- evidence-pool-start -->
> [!quote]+ 📎 证据池 · 25 条 · 自动生成于 2026-05-16
>
> ## A 级精读
> - 20260304-微博 AI · 2026-03-04 · AI 巨头对比札记：微软 Copilot 落地差、谷歌产品意志缺位、ChatGPT 沦为客服，唯有 Anthropic/
> - 20260129-洪都拉斯 🇭🇳 17 天，香蕉共和国行记 · 2026-01-29 · 洪都拉斯17天香蕉共和国行记：边境拒签、Copán 玛雅遗址、铁腚来回获得贴纸延长签的旅行札记。
> - Try Gemini Deep Research-2026-01-12 · 2026-01-12 · 在洪都拉斯西部起伏的群山与茂密的雨林之间，静卧着一座被时光凝固的城市——科潘（Copán）。这座位于玛雅文明世界东南边缘
> - AI赋能决策，听见“未来的声音”-2024-03-28 · 2024-03-28 · 导读 Foreword
> - 腾讯司晓：“相变”是下个时代的前情提要-2024-02-02 · 2024-02-02 · 司晓 腾讯集团副总裁、腾讯研究院院长 2024 年 1 月 24 日，由腾讯研究院和腾讯可持续社会价值事业部主办的“20
>
> ## B/C 级参考 (20 条)
> - B · 2026 年初我对 AI 的结构性认知，本文留待一年后印证-2026-04-09 · 2026-04-09
> - B · 谷歌新论文把内存股价干崩了！KV cache压缩6倍，“谷歌的DeepSeek时刻”-2026-03-25 · 2026-03-25
> - B · 解析文学：穿透、在场、独创 - Google AI Studio-2026-02-19 · 2026-02-19
> - B · 洪都拉斯 17 天，香蕉共和国行记-2026-02-17 · 2026-02-17
> - B · Mexico Travelogue- Existential - Google AI Studio-2026-01-31 · 2026-01-31
> - B · Google Gemini-2026-01-30 · 2026-01-30
> - B · Google Gemini-2026-01-21 · 2026-01-21
> - B · 20260118-在学了15分钟潜水之后，我决定放弃。 · 2026-01-18
> - B · Google Gemini-2026-01-15 · 2026-01-15
> - B · Google Gemini-2025-12-26 · 2025-12-26
> - ...还有 10 条
<!-- evidence-pool-end -->

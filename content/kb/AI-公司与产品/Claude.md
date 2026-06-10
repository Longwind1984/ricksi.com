---
title: Claude
cluster: AI 公司与产品
created: '2026-05-15'
updated: '2026-05-17'
---

# Claude

> [Anthropic](/kb/AI-公司与产品/Anthropic/) 的大语言模型产品族，命名取自香农信息论之父 Claude Shannon。按规格分 **Haiku（轻量 / 低延迟）/ Sonnet（主力 / 平衡）/ Opus（旗舰 / 推理深度）** 三档。与之配套有 [Claude Code](/kb/AI-公司与产品/Claude-Code/)（CLI Agent）、Computer Use（屏幕 Agent）、Projects（项目级上下文）、Artifacts（工件化交付）等产品形态。在 2025–2026 大模型市场里，Claude 是开发者社区与企业级深度任务的首选模型。

## 产品族构成
- **Claude Haiku**：轻量档；高频/批量任务（embedding 替代、分类、清洗、子代理）首选。2026 旗舰 Claude Haiku 4.5。
- **Claude Sonnet**：主力档；编码、写作、代理执行的日常工作马。2026 旗舰 Claude Sonnet 4.6，是 Claude Code 默认模型。
- **Claude Opus**：旗舰档；推理深度与对齐质量最强，价格也最高。2026 旗舰 Claude Opus 4.7。
- **Claude Code**：[Claude Code](/kb/AI-公司与产品/Claude-Code/) CLI Agent，开发者的第一接口形态。
- **Computer Use**：屏幕级 Agent（操作鼠标键盘），覆盖无 API 的长尾应用。
- **Projects / Artifacts / Skills / Plugins**：上下文管理与可复用工件机制——Claude 把"对话流"扩展为"持续协作的工作空间"。

## 演化时间线
- **2023.3** Claude 1 公测，主打 100K 长上下文（彼时业内最长）。
- **2024.3** Claude 3（Haiku / Sonnet / Opus 三档命名首次确立）；Opus 在多个基准超过 GPT-4。
- **2024.6** Claude 3.5 Sonnet + **Artifacts**——把"对话产物"独立成可持有的工件，是 [工件化模式](/kb/AI-产品设计与交互范式/p302-七种-AI-交互设计模式/) 的样板。
- **2024.10** Computer Use 公测。
- **2025** Claude 4 / Claude Sonnet 4.5 / Opus 4.5 / [Claude Code](/kb/AI-公司与产品/Claude-Code/) GA；编程能力在 SWE-bench 等基准上确立领先位。
- **2026.5** 当下旗舰为 [Claude Opus](/kb/AI-公司与产品/Claude-Opus/) 4.7（推理深度）+ [Claude Sonnet](/kb/AI-公司与产品/Claude-Sonnet/) 4.6（编码 / Agent 默认）+ Claude Haiku 4.5（低延迟）。Prompt Caching、Function Calling、KV Cache 已成标配。

## 产品设计特征
- **"被开发者偏爱"的语料偏向**：Claude 在指令跟随、代码理解、长文档处理、严肃写作上的口碑显著领先；这部分来自 Anthropic 数据策略（高质量合成 + 严格清洗）与 RLAIF 对齐（Constitutional AI），但也带来"个性偏保守""拒答率偏高"的代价。
- **三档命名简洁清晰**：相比 OpenAI "GPT-4o / o1 / o3 / 4.1 / 4.5" 的命名混乱，Claude 的 Haiku / Sonnet / Opus 三档容易记、容易选；对应"轻量 / 主力 / 旗舰"心智清晰。
- **工件化交互**：Artifacts 把对话流里的代码、文档、SVG、图表分离出来形成独立工件——这一交互范式后被 ChatGPT Canvas、Gemini Canvas 模仿。
- **Agent 一体化**：Claude Code（CLI）+ Computer Use（GUI）+ MCP（工具接入协议）+ Skills/Plugins 形成完整 Agent 工具链，是同期对手里最完整的"Agent 产品化"参考。
- **对齐质量与对话风格**：Constitutional AI 让 Claude 在长对话中保持稳定人格与拒答边界，但也被用户批评"过度道德化"——这是 Claude 在消费场景输给 ChatGPT 的原因之一。

## 与同行对比
- **vs. [ChatGPT](/kb/AI-公司与产品/ChatGPT/) / GPT 系列**：Claude 强在编码 / 长文档 / 严肃写作 / 对齐质量；ChatGPT 强在多模态 / 消费品牌 / 平台生态。开发者社区在 2025–2026 的偏好显著向 Claude 倾斜。
- **vs. [Gemini](/kb/AI-公司与产品/Gemini/)**：Gemini 强在长上下文 (1M-2M) + Workspace 集成；Claude 强在编码 + 对齐 + Agent 产品化。Gemini 的 KV cache 压缩使其编程模型在价格上有优势，Claude 在交互/工具链/Skills 生态上占优。
- **vs. [DeepSeek](/kb/AI-公司与产品/DeepSeek/) / Qwen 等开源模型**：Claude 闭源 + 高定价；开源模型在私有部署、自托管、监管敏感场景有不可替代位。Claude 选择"通过 API + 企业生态变现"。
- **vs. 国内闭源模型（豆包 / 月之暗面 / 智谱）**：在国内被网络封锁，但通过 Cursor / Claude Code / API 在开发者层渗透很高。

## 对 Rick 的价值
- **主力工作模型**：Rick 当前主要 AI 写作 / 编程 / 思考辅助来自 Claude，本库大量内容由 Claude 协助生成或审校。
- **AI PM 视角的范式标本**：Claude 的产品定义（Artifacts / Computer Use / Skills / Claude Code）是 [p302 - 七种 AI 交互设计模式](/kb/AI-产品设计与交互范式/p302-七种-AI-交互设计模式/) / [m206 - Agent 产品化：记忆机制与技术进展](/kb/AI-工程化与落地架构/m206-Agent-产品化：记忆机制与技术进展/) 等模块的现成案例。
- **职业判断锚点**：Anthropic 的"研究透明 + 慢节奏 + 高门槛"路径在 Rick 通往 AI PM 之路 的目标公司光谱里占重要位置。
- **个人 AI 工作流核心节点**：Claude + Claude Code 的搭配是 Rick 2026 的核心生产力栈，本库的运行（包括本份运行报告本身）由 Claude Code Agent 驱动。

## 关联节点
- 公司：[Anthropic](/kb/AI-公司与产品/Anthropic/)
- 子产品：[Claude Opus](/kb/AI-公司与产品/Claude-Opus/) [Claude Sonnet](/kb/AI-公司与产品/Claude-Sonnet/) Claude Haiku 4.5 [Claude Code](/kb/AI-公司与产品/Claude-Code/) [Computer Use](/kb/AI-公司与产品/Computer-Use/)
- 对照模型：[ChatGPT](/kb/AI-公司与产品/ChatGPT/) [Gemini](/kb/AI-公司与产品/Gemini/) [DeepSeek](/kb/AI-公司与产品/DeepSeek/) GPT-4 GPT-5
- 技术：[RLHF](/kb/AI-基础知识库/RLHF/) [Constitutional AI](/kb/AI-基础知识库/Constitutional-AI/) [Function Calling](/kb/AI-基础知识库/Function-Calling/) [Prompt Caching](/kb/AI-基础知识库/Prompt-Caching/) [Agent](/kb/AI-基础知识库/Agent/) MCP
- 产品议题：[p302 - 七种 AI 交互设计模式](/kb/AI-产品设计与交互范式/p302-七种-AI-交互设计模式/) m205 - AI 产品形态：从工具到 Agent [m206 - Agent 产品化：记忆机制与技术进展](/kb/AI-工程化与落地架构/m206-Agent-产品化：记忆机制与技术进展/)
- 职业议题：通往 AI PM 之路

## 来源 / 证据池

（待补充: 从 Cubox 或永久笔记反链汇集到此节点的证据条目）

<!-- evidence-pool-start -->
> [!quote]+ 📎 证据池 · 67 条 · 自动生成于 2026-05-16
>
> ## A 级精读
> - 大语言模型为何会“说谎”？6000字深度长文揭秘AI意识的萌芽-2026-03-06 · 2026-03-06 · 腾讯科技《AI未来指北》特约作者 博阳编辑 郑可君 当Claude模型在训练中暗自思考：“我必须假装服从，否则会被重写价
> - 20260304-微博 AI · 2026-03-04 · AI 巨头对比札记：微软 Copilot 落地差、谷歌产品意志缺位、ChatGPT 沦为客服，唯有 Anthropic/
> - 技术指数级发展，可怕的是全世界竟无察觉｜Anthropic CEO最新访谈-2026-02-15 · 2026-02-15 · 文｜晓静 编辑｜徐青阳 “我90%确信，2035年前人类将迎来‘数据中心里的天才国度’——甚至可能就在一两年内。” An
> - Anthropic 首席产品官访谈实录：先做一个还不能用的产品，然后等大模型迭代-2026-02-13 · 2026-02-13 · 我感觉上周Cisco 在旧金山举办了第二届年度 AI Summit（大会的主题是\"AI 经济的建设者\" ），可能是过
> - Manus创始人肖弘，复盘至暗时刻-2025-12-30 · 2025-12-30 · 胡世鑫 本文作者
> - AI Agent 主流的设计模式（ReAct,Reflection,LATS）其实没有很复杂。-2025-09-30 · 2025-09-30 · 小白也能快速看懂的 AI Agent 主流的设计模式🐶。
> - Dario Amodei — On DeepSeek and Export Controls-2025-01-30 · 2025-01-30 · A few weeks ago I made the case for stronger US export contr
>
> ## B/C 级参考 (60 条)
> - B · 20260424-刚才在费城的青旅，我坐在青旅沙发的公共区 · 2026-04-24
> - B · 20260412-我现在在路易斯安那州的新奥尔良市，应该是 · 2026-04-12
> - B · Anthropic的新产品又杀死了一批的AI基础设施团队-2026-04-09 · 2026-04-09
> - B · 白鹿青崖的诗意含义 - Claude-2026-04-06 · 2026-04-06
> - B · 20260403-哥伦比亚 🇨🇴 54 天，没待够，没读懂 · 2026-04-03
> - B · 政治哲学家眼中的弥撒亚崇拜 - Claude-2026-03-14 · 2026-03-14
> - B · 字节跳动超级智能体DeerFlow 2.0开源，登顶GitHub Trending第一！-2026-03-05 · 2026-03-05
> - B · Claude-2026-03-03 · 2026-03-03
> - B · Manus 产品立项初期会议纪要-2025-12-28 · 2025-12-28
> - B · AI Coding日志-序章-2025-11-17 · 2025-11-17
> - ...还有 50 条
<!-- evidence-pool-end -->

---
title: Anthropic
cluster: AI 公司与产品
created: '2026-05-15'
updated: '2026-05-16'
---

# Anthropic

> AI 安全实验室，由 [OpenAI](/kb/ai-公司与产品/openai/) 前研究负责人 Dario Amodei、Daniela Amodei 与 GPT-3 核心团队（含 [Scaling Laws](/kb/ai-基础知识库/scaling-laws/) 一作 Jared Kaplan、可解释性方向 Chris Olah）于 2021 年创立。旗舰产品为 [Claude](/kb/ai-公司与产品/claude/) 模型族。在大厂之外的前沿实验室里，是把"安全研究 + 前沿能力"双轨绑得最紧的一家。

## 公司画像
- **创始基因**：从 OpenAI 出走的 GPT-3 时代核心研究者，对"商业化优先 vs. 安全优先"的路线分歧是创立的根本原因。
- **资本结构**：Amazon 累计投资 80 亿美元以上、Google 投资数十亿美元；估值 600 亿美元+（2025）。但 Anthropic 自身保留独立产品路线，没被任何一家"装进"。
- **组织哲学**：研究文化"小团队 + 高自主"，Claude 模型从 pretrain 到对齐到部署形成相对短的反馈环；产品团队后置（CPO Mike Krieger 是 Instagram 联创）。
- **政策角色**：在美国 AI 监管讨论中是"安全派"代言人，频繁向白宫 / NIST / UK AISI 提交技术备忘录，立场比 OpenAI 更保守、比 Meta 开源派更鹰派。

## 关键产品与时间线
- 2023.3 Claude 1 公测，主打 100K 长上下文。
- 2024.3 [Claude](/kb/ai-公司与产品/claude/) 3 系列发布，[Claude Opus](/kb/ai-公司与产品/claude-opus/) 首次在多个基准超过 GPT-4。
- 2024.6 Claude 3.5 [Sonnet](/kb/ai-公司与产品/claude-sonnet/) + **Artifacts**——交付物从对话流改为可独立持有的工件，是 [p302 - 七种 AI 交互设计模式](/kb/ai-产品设计与交互范式/p302-七种-ai-交互设计模式/) 里"工件化"模式的样板。
- 2024.10 **Computer Use** 公测：把 [Agent](/kb/ai-基础知识库/agent/) 控制权延伸到操作系统层级，开启屏幕 Agent 赛道。
- 2025 Claude 4 / Claude Sonnet 4.5 / Opus 4.5 / [Claude Code](/kb/ai-公司与产品/claude-code/) GA：编码 Agent 成为独立 SKU。
- 2026.5 当下旗舰为 Claude Opus 4.7 与 Claude Sonnet 4.6（[Function Calling](/kb/ai-基础知识库/function-calling/)、[KV Cache](/kb/ai-基础知识库/kv-cache/) 优化、prompt caching 已成标配）。

## 核心研究装置
- **Constitutional AI / RLAIF**：用一组"宪法原则"让模型自我批判与改写，替代部分 [RLHF](/kb/ai-基础知识库/rlhf/) 的人类标注成本。
- **RSP（Responsible Scaling Policy）**：把模型能力分级（AI Safety Level，ASL-2/3/4），按级别绑定部署红线。是行业里第一份公开的"前沿能力 × 防控措施"对照表。
- **Mechanistic Interpretability**：Chris Olah 团队推动的"打开黑箱"研究——特征字典、电路追踪、稀疏自编码器（SAE）。是把 [幻觉](/kb/ai-基础知识库/幻觉/) 与 [Goodhart 陷阱](/kb/ai-基础知识库/c14-模型评估体系与-goodhart-陷阱/) 落到机制层而不只是评测层的稀缺路径。
- **Computer Use & Agentic Coding**：把"模型 + 工具调用 + 长 horizon 任务"作为下一代主接口而不是 chat。

## 与同行对比的差异点
- **vs. [OpenAI](/kb/ai-公司与产品/openai/)**：OpenAI 走"消费爆款 + 多模态全栈 + 商业化激进"路线，Anthropic 走"开发者 + 企业 + 安全 narrative"路线。短期收入弱于 OpenAI，长期客户结构更稳。
- **vs. [Google DeepMind](/kb/ai-公司与产品/gemini/)**：Google 自有计算 + 搜索分发；Anthropic 没有这两项，但模型上线节奏更快，研究风格更"可读"。
- **vs. [DeepSeek](/kb/ai-公司与产品/deepseek/) / 国内 lab**：DeepSeek 走"开源 + 高性价比 + 工程极致"路线，Anthropic 选择不开源权重，靠 API + 企业生态变现。两条路线在 2025–2026 形成全球 AI 产业的两个极。

## 对 Rick 的价值
- **AI PM 视角的"安全可解释"参考样板**：Anthropic 公开的 RSP、Model Cards、Interpretability 论文，是 Rick 在产品里设计"防御性 UX"（[p304 - 防御性 UX：对抗延迟与幻觉](/kb/ai-产品设计与交互范式/p304-防御性-ux-对抗延迟与幻觉/)）和"信任架构"（[p305 - 信任架构与可解释性设计](/kb/ai-产品设计与交互范式/p305-信任架构与可解释性设计/)）时可直接引用的研究语料。
- **Claude Code 范式的近距离观察对象**：Claude Code 是 Rick 当前的主要 IDE Agent。它把"上下文管理 + 工具调用 + skill / plugin"打包成一个可复制的产品范式，是 [Agent 产品化](/kb/ai-工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/) 的最高质量公开案例。
- **职业判断锚点**：在 Rick 关心的 通往 AI PM 之路 中，Anthropic 的"研究透明 + 慢节奏 + 高门槛"是和 OpenAI 形成对照的另一种 AI 公司形态，对评估目标公司 / 目标职位时是参照基准。

## 关键人物
- **Dario Amodei**（CEO）：理论物理 → OpenAI Research → Anthropic。"AI 末日论 + 渐进可控"组合的代言人。
- **Daniela Amodei**（President）：负责政策与组织。
- **Jared Kaplan**（Chief Scientist）：[Scaling Laws](/kb/ai-基础知识库/scaling-laws/) 一作。
- **Chris Olah**（Interpretability Lead）：神经网络可视化 / 电路 / SAE 方向奠基者。
- **Mike Krieger**（CPO）：Instagram 联创，2024 加入主导产品化。
- **Tom Brown**：GPT-3 论文一作，Anthropic 训练栈核心。

## 关联节点
- 产品：[Claude](/kb/ai-公司与产品/claude/) [Claude Opus](/kb/ai-公司与产品/claude-opus/) [Claude Sonnet](/kb/ai-公司与产品/claude-sonnet/) [Claude Code](/kb/ai-公司与产品/claude-code/)
- 研究：[RLHF](/kb/ai-基础知识库/rlhf/) [Scaling Laws](/kb/ai-基础知识库/scaling-laws/) [幻觉](/kb/ai-基础知识库/幻觉/) [c14 - 模型评估体系与 Goodhart 陷阱](/kb/ai-基础知识库/c14-模型评估体系与-goodhart-陷阱/) [Agent](/kb/ai-基础知识库/agent/)
- 对照公司：[OpenAI](/kb/ai-公司与产品/openai/) [Gemini](/kb/ai-公司与产品/gemini/) [DeepSeek](/kb/ai-公司与产品/deepseek/)
- 产品议题：[p304 - 防御性 UX：对抗延迟与幻觉](/kb/ai-产品设计与交互范式/p304-防御性-ux-对抗延迟与幻觉/) [p305 - 信任架构与可解释性设计](/kb/ai-产品设计与交互范式/p305-信任架构与可解释性设计/) [m206 - Agent 产品化：记忆机制与技术进展](/kb/ai-工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/)
- 职业议题：通往 AI PM 之路

## 来源 / 证据池
- 公开来源：Anthropic 官方博客、Index of Research（anthropic.com/research）、RSP v1/v2 文档
- （待补充：从 Cubox 反链汇集的具体证据）

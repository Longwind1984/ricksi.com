---
title: Constitutional AI
cluster: AI 基础知识库
created: '2026-05-18'
updated: '2026-05-18'
---

# Constitutional AI

> [Anthropic](/kb/ai-公司与产品/anthropic/) 2022 年提出的模型对齐方法，简写 CAI。核心思路：用一组明文写下的"宪法原则"（principles / constitution）让模型自我批评并改写自己的回答，再用这些自我改写的数据替代部分人类标注，做 [RLHF](/kb/ai-基础知识库/rlhf/) 的"RL-from-AI-Feedback" (RLAIF) 训练。是当前主流前沿模型对齐路线中"减少人类标注成本 + 让安全规则可读可审计"的代表方案。

## 核心机制
- **第一阶段：监督学习 (SL-CAI)**
  - 用普通对话模型生成对"红队 prompt"的初始回答
  - 让模型自己读这组原则（如"不要协助制造武器""不要鼓励自残""保持有帮助的语气"），自我批评回答并改写
  - 用"原始回答 → 自我改写回答"的对作为微调样本，先训出一个 baseline 安全模型
- **第二阶段：强化学习 (RL-CAI / RLAIF)**
  - 对每个 prompt 生成两个回答，让另一个模型基于"宪法"做偏好判断（A 比 B 更好 / 更安全）
  - 用 AI 而非人类的偏好作为奖励信号训练 PPO，替代 [RLHF](/kb/ai-基础知识库/rlhf/) 中昂贵的人类标注环节
  - 最终模型既保持帮助性，又内化了宪法定义的安全行为

## 宪法是什么
- **不是一份固定文档**：[Anthropic](/kb/ai-公司与产品/anthropic/) 多次更新公开版本，初版借鉴《世界人权宣言》、Apple 服务条款、AI 安全研究文献等
- **典型条款**：
  - "选择最少种族主义 / 性别主义 / 有害刻板印象的回答"
  - "如果用户问到自残或自杀，优先表达共情并提供帮助资源"
  - "不要给出可能被用于制造化学、生物、放射、核武器的具体指导"
  - "在拒绝时仍要清晰解释拒绝的理由"
  - "保持有帮助、有诚意、不居高临下"
- **关键设计哲学**：把"安全规则"从隐式标注偏好 (RLHF) 转为可读可审计的明文原则——任何人都能读 Claude 的宪法，知道它"应该如何拒绝什么"

## 与 RLHF 的对比
- **[RLHF](/kb/ai-基础知识库/rlhf/)**：依赖大量人类标注员对成对回答打偏好分。优点是符合"真实人类判断"；缺点是昂贵、慢、标注员一致性低、安全规则隐式不可审计、容易传递标注员自身偏见。
- **CAI / RLAIF**：用 AI 做偏好判断 + 自我改写。优点是规则可读、扩展便宜、迭代快；缺点是"AI 评 AI"可能放大模型自身偏差（如过度礼貌、过度拒绝），且宪法本身的措辞高度影响最终模型行为。
- **生产实践**：[Claude](/kb/ai-公司与产品/claude/) 模型族使用 RLHF + CAI 的混合栈，并叠加 RSP (Responsible Scaling Policy) 红线机制。[OpenAI](/kb/ai-公司与产品/openai/)、Google 等公司也吸收了 RLAIF 思路，但 CAI 的"明文宪法 + 自我批评"框架是 Anthropic 标志性贡献。

## 影响与争议
- **正面影响**：把"AI 安全规则"从黑箱标注变成可公开讨论的文本，是大模型时代少数能做"治理透明性"的工程实践。Anthropic RSP 与 Constitutional AI 一同构成行业里第一份"安全 + 能力联动"参考样板。
- **争议一：过度拒绝**：早期 Claude 因宪法保守，对正常请求也频繁拒答（"I can't help with that"），是 2023–2024 间 Claude 与 ChatGPT 用户口碑落差的重要原因。后续版本 (Claude 3 / 4 系列) 通过修订宪法和引入"有帮助性优先"原则有所缓解。
- **争议二：宪法即政治**：宪法的措辞由 Anthropic 单方面决定。多元价值如何取舍、谁来决定"什么是有害"——是当下"AI 治理"讨论无法回避的问题。CAI 把这个问题摆到了明面，但没回答。
- **争议三：RLAIF 的可信度**：当 AI 既是被训对象又是偏好评估者，是否会形成"AI 评 AI"的封闭循环。学术界对此评价不一，但工程实践普遍认为"RLAIF + 少量 RLHF 校准"已可达可接受效果。

## 对 Rick 的价值
- **AI PM 视角理解模型行为差异的钥匙**：为什么 [Claude](/kb/ai-公司与产品/claude/) 比 [ChatGPT](/kb/ai-公司与产品/chatgpt/) / [Gemini](/kb/ai-公司与产品/gemini/) 的回答更"克制 / 诚实 / 不擅自承诺"——很大程度上是宪法措辞与 CAI 训练直接塑造的产品人格。这一观察对 Rick 在 AI 产品形态 比较模型选型时是直接参考。
- **AI 治理透明性的少数样本**：当 Rick 在公共写作或职业判断中需要回答"AI 公司怎么处理安全 vs 能力的张力"时，CAI / RSP 是少数能给出"可读 + 可验证"答案的公开实践。
- **产品设计原则参考**：明文化的原则 + 自我批评 + 多轮改写——这套机制本身可以借鉴到产品设计语料库（prompt engineering、写作风格手册、AI 工作流模板）中。

## 关联节点
- 公司：[Anthropic](/kb/ai-公司与产品/anthropic/)
- 模型：[Claude](/kb/ai-公司与产品/claude/) [Claude Opus](/kb/ai-公司与产品/claude-opus/) [Claude Sonnet](/kb/ai-公司与产品/claude-sonnet/)
- 对齐技术：[RLHF](/kb/ai-基础知识库/rlhf/) DPO RLAIF
- 安全治理：RSP (Responsible Scaling Policy)、Model Cards、[AI 公司政治敏感内容立场对比](/kb/ai-公司与产品/ai-公司政治敏感内容立场对比/)
- 产品议题：m205 - AI 产品形态：从工具到 Agent [p305 - 信任架构与可解释性设计](/kb/ai-产品设计与交互范式/p305-信任架构与可解释性设计/)
- 上下游：c12 - RLHF 与对齐工程（如存在）/ [c14 - 模型评估体系与 Goodhart 陷阱](/kb/ai-基础知识库/c14-模型评估体系与-goodhart-陷阱/)

## 来源 / 证据池
- Anthropic 原始论文：*Constitutional AI: Harmlessness from AI Feedback* (Bai et al., 2022, arXiv:2212.08073)
- Anthropic 博客系列：Claude's Constitution (anthropic.com/news)
- 学术综述：*A Survey of LLM Alignment Techniques* 系列文章
- （待补充：从 Cubox 反链汇集的具体证据）

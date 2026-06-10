---
title: GPTs
cluster: AI 公司与产品
created: '2026-05-19'
updated: '2026-05-19'
---

# GPTs

## 一句话定义

[OpenAI](/kb/AI-公司与产品/OpenAI/) 在 DevDay 2023-11 发布的"自定义 GPT + GPT Store"产品形态——任何 ChatGPT Plus 用户可通过自然语言对话或表单创建带专属 system prompt、知识库、工具（Code Interpreter / Browsing / DALL-E / Custom Actions）的"GPT 应用"，并提交到 **GPT Store** 供他人调用。是 OpenAI 把 ChatGPT 从"对话产品"扩张为"Agent 平台"的关键尝试，也是 2024–2025 AI 应用商店之争的代表样本。

## 演化时间线

| 时间 | 事件 |
|------|------|
| 2023-11 (DevDay) | Sam Altman 演示 GPT Builder 自然语言创建流程 + 宣布 GPT Store 即将开放 |
| 2024-01 | GPT Store 正式上线，分类 7 大领域；首批数百万 GPTs 涌入 |
| 2024-Q2 | OpenAI 推出 **GPT Builder Revenue Program**：与少数创作者按使用量分成 |
| 2024-Q3 至 2024-Q4 | Custom GPT 加入"@提及"功能，可在主对话中临时召唤其他 GPT |
| 2025 间 | GPT Store 增长趋缓，注意力转向 OpenAI 自研 Agent 产品（[Computer Use](/kb/AI-公司与产品/Computer-Use/)、Operator 等）；GPTs 转为"用户自助场景"的长尾配置 |

## 产品组成

| 组件 | 说明 |
|------|------|
| **GPT Builder** | 自然语言对话式创建器，可在聊天中渐进调整 system prompt 与人格 |
| **Configure 表单** | 直接编辑：Name / Description / Instructions / 上传 Knowledge / 启用 Tools / Custom Actions |
| **Custom Actions** | OpenAPI schema 声明，让 GPT 调用第三方 API（最重要的扩展机制） |
| **Knowledge Files** | 上传 PDF / Markdown / CSV 等做 RAG 私有知识 |
| **Tools** | Code Interpreter / Browsing / Image Generation 等内置工具开关 |
| **GPT Store** | 公开发布与发现 GPTs，按分类、热度、官方推荐排序 |

## 设计意图与产品形态判断

- **平台化雄心**：OpenAI 试图把 ChatGPT 变成"AI 时代的 App Store"，让长尾开发者承担应用扩张，OpenAI 抽佣（实际收入分成机制至 2026 仍不透明）
- **降低开发门槛**：用对话创建应用，比写代码低 2–3 个数量级，吸引非工程师用户
- **数据飞轮**：用户创建的 GPT + 使用日志反哺训练数据，强化 ChatGPT 通用能力
- **生态闭环**：通过 GPTs + Custom Actions 把第三方 API 流量引回 ChatGPT 主入口

## 问题与争议

- **同质化**：GPT Store 大部分 GPT 是"写邮件助手""简历优化""学习助手"等浅层 prompt 封装，被批评"价值密度不足"
- **创作者分成不透明**：Revenue Program 至 2025 仍只对极少数顶部 GPT 开放，OpenAI 未公开分成公式
- **质量审核**：GPT Store 上线初期出现"伪 OpenAI 官方 GPT"骗用户付费、prompt injection 提取 system prompt 等问题
- **平台依赖风险**：第三方 GPT 完全锚定 ChatGPT，OpenAI 政策变化（如降低 RPM、关停某类 Custom Actions）可瞬间清空创作者积累
- **与 Agent 产品的内部竞争**：2025 OpenAI 把战略重心转向自研 [Computer Use](/kb/AI-公司与产品/Computer-Use/) / Operator 等 Agent 产品后，GPTs 在内部被相对边缘化

## 与同类形态对比

| 平台 | 产品 | 创建方式 | 主要差异 |
|------|------|---------|---------|
| **OpenAI GPTs** | Custom GPT + GPT Store | 对话或表单 | 强 ChatGPT 生态绑定；分成机制不透明 |
| [Anthropic](/kb/AI-公司与产品/Anthropic/) Projects + Skills | Projects / Skills | 命令行 / SDK | 偏开发者；不主动做应用商店 |
| Google Gemini Gems | Gem | 表单 | Workspace 内置；目标 enterprise 而非创作者 |
| 字节跳动 豆包 Bots / 扣子 (Coze) | Bot | 拖拽式工作流 | 重国内市场；多渠道分发（飞书、抖音、微信） |
| Poe (Quora) | Bots | 表单 + 多模型可选 | 用户可在同界面调用 Claude / GPT / Llama 多模型 |
| Character.AI | Characters | 表单 | 角色扮演为主，非生产力 |

## 当前定位（2026-05）

- GPTs 在 ChatGPT 内仍是稳定功能，但增长重心已让位给 Agent 产品族
- "App-like GPTs"被定位为**用户自助场景**：个人写作助手、个性化 RAG、内部团队工具，而非"AI App Store 第二代"
- OpenAI 2025–2026 公开通讯中较少强调 GPT Store 数字，转而聚焦 [Computer Use](/kb/AI-公司与产品/Computer-Use/)、Operator 与 Agent SDK

## 对 Rick 的价值

1. **AI 应用商店形态对照样本**——GPT Store 是 AI 平台经济第一次大规模尝试，其增长—放缓曲线可作为思考 AI 应用分发的"第一代失败教训"
2. **AI PM 产品边界判断**——当 OpenAI 同时做"应用平台"和"Agent 产品"时，平台与产品的内部冲突在产品历史上极具教学价值
3. **个人生产力**——Rick 自己的 Newsletter / 旅行规划 / 登山数据分析可建专属 GPT 用作私人助手层
4. **AI 独立开发者角度**——Custom Actions 仍是低成本接入 ChatGPT 流量的有效通道，特别适合工具型 SaaS 的获客

## 关联节点

- 母公司：[OpenAI](/kb/AI-公司与产品/OpenAI/)
- 同公司产品：[ChatGPT](/kb/AI-公司与产品/ChatGPT/) [DALL-E](/kb/AI-公司与产品/DALL-E/) [Codex](/kb/AI-公司与产品/Codex/) [Sora](/kb/AI-公司与产品/Sora/) [Computer Use](/kb/AI-公司与产品/Computer-Use/)
- 同类对照：豆包 / 扣子（Coze） / Poe / Anthropic Projects / Gemini Gems
- 概念：[Agent](/kb/AI-基础知识库/Agent/) / Custom Action / OpenAPI / [RAG](/kb/AI-基础知识库/RAG/)
- 商业模式：平台经济 / 创作者经济 / App Store 模型

## 来源

- OpenAI DevDay 2023-11 主题演讲与产品页
- OpenAI GPT Store 官方文档与帮助中心
- *The Information* / Stratechery 关于 GPT Store 增长与定位转向的分析
- vault 内：[OpenAI](/kb/AI-公司与产品/OpenAI/) [ChatGPT](/kb/AI-公司与产品/ChatGPT/) 节点中已多次互引

## 证据池

- 待 Cubox 反链汇总脚本恢复后批量回填外部摘录
- 当前 vault 内 5 处反链：见 [OpenAI](/kb/AI-公司与产品/OpenAI/) / [ChatGPT](/kb/AI-公司与产品/ChatGPT/) 系列节点

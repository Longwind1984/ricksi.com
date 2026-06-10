---
title: Manus
cluster: AI 公司与产品
created: '2026-05-15'
updated: '2026-05-21'
---

# Manus

> 中国通用 AI Agent 旗舰产品（蝴蝶效应 / Butterfly Effect，肖弘创立），2025-03 上线公开 beta。范式：**Computer Use + 云端虚拟桌面 + 状态持久化**。slogan 式定义：「给 AI 配一台云端电脑」。

> **深度展开见 [E02 通用 Agent·Manus & Devin](/kb/agent-系统化专题/e02-通用-agent-manus-devin/)**——本节点作为 hub，给出产品画像、商业事件线与对照视角；六层架构、设计哲学、复合错误数学、反共识决策、复盘叙事请跳转 E02。

## 产品画像

- **核心交付**：用户提交自然语言任务 → Agent 在云端 Linux 桌面里异步执行（shell / 浏览器 / 任意软件）→ 完成后通知用户。
- **底层范式**：[Computer Use](/kb/ai-公司与产品/computer-use/) 视觉截图理解 + 模拟键鼠 + Multi-Agent 内部分工（Planner / Executor / 专项 Agent）+ 全状态持久化（cookies / FS / API key 跨会话保留）。
- **UI 哲学**：渐进式披露 + OS 隐喻——Planner / Shell / Browser / Editor 不预先全展开，Agent 用到什么浮现什么（区别于 Devin 的"左对话/右四 tab"平铺）。
- **HITL**：Interactive Mode——遇验证码 / 二次验证 / 关键确认时把浏览器控制权交回用户，操作完再交还 Agent。
- **典型任务步数**：30–50 步级别（不是 5–8 步的工具调用，是数十步的任务编排）。

## 公司与商业事件线

| 时间 | 事件 |
|------|------|
| 2022 | 肖弘（hidecloud，连续创业者）创立蝴蝶效应；早期产品 Monica（浏览器 AI 插件，2023–2024 实现盈利） |
| 2024 | ZhenFund 种子 → 红杉中国 / 腾讯 A 轮；Manus 立项；先做 7 个月 AI 浏览器（自编译 Chrome），后砍掉转向云端虚拟机 |
| 2025-03-06 | Manus 公开 beta 上线；7 天内吸引 200 万人预约（单次任务成本约 2 美元限制了增长） |
| 2025-04 | Benchmark 领投 B 轮，约 7500 万美元，估值约 5 亿美元 |
| 2025-12 | ARR 突破 1 亿美元；Meta 宣布拟以约 20 亿美元收购蝴蝶效应，肖弘将出任 Meta 副总裁 |
| 2026-04-27 | 中国国家发改委以未通过反垄断 / 并购审查为由叫停 Meta 收购；Manus 在事实层面恢复独立运营 |

商业逻辑：「用昂贵的算力换增长」——零市场预算，所有成本投到算力让产品体验惊艳。押注的是底层 token 成本下降（[Scaling Laws](/kb/ai-基础知识库/scaling-laws/) + 摩尔定律）让今天「贵到亏本」的体验变成明天的标配。

## 与同类对比

- **vs [ChatGPT](/kb/ai-公司与产品/chatgpt/) / OpenAI Operator**：Operator 是浏览器内 Agent（受限于浏览器能力天花板）；Manus 是完整虚拟桌面（可装专业软件、跑代码、保存状态）。Manus 团队明确判断「浏览器是 Agent 能力天花板」。
- **vs Devin（Cognition AI）**：Devin 偏 SWE 垂直（IDE + terminal + browser，输出 PR）；Manus 走水平通用（任何能在 Linux 桌面完成的工作）。Manus 立项纪要明确批评 Devin 的「session credential 不持久化」与「UI 信息过载」。详见 [E02 通用 Agent·Manus & Devin](/kb/agent-系统化专题/e02-通用-agent-manus-devin/) §2.4 横向对照表。
- **vs Claude Computer Use / Anthropic**：[Anthropic](/kb/ai-公司与产品/anthropic/) 把 Computer Use 作为 [Claude](/kb/ai-公司与产品/claude/) 的能力暴露给开发者（API），Manus 把它产品化为面向终端用户的 C 端订阅服务——同一底层范式的两个分工。
- **vs 国内同类（智谱 AutoGLM / 百度文心 Agent）**：Manus 国际关注度更高，是中国 Agent 出海的代表样本；国内产品在垂直场景（如电商运营）落地更快。

## 主要议题与争议

- **通用 vs 垂直之争**：肖弘自承「通用 Agent 现在是 demo > 生产，真正赚钱的还是垂直」并给自家 AI 原生组织度打 60 分——这是 Agent 创业最重要的 sober tone 之一，与 [OpenAI](/kb/ai-公司与产品/openai/) Sam Altman 2026 年初 Reflections「Agent 进展比预期慢」形成中美两份独立同向印证（详见 [E02 通用 Agent·Manus & Devin](/kb/agent-系统化专题/e02-通用-agent-manus-devin/) §2.1.1）。
- **复合错误数学约束**：通用 Agent 任务步数 30–50 步，按 [c10 - Agent 技术栈与工具调用](/kb/ai-基础知识库/c10-agent-技术栈与工具调用/) §10.3 的复合错误模型，完整成功率天然受限于 50–75%；这是数学约束不是工程约束。
- **自主性边界事件（火车班次案例）**：Manus 帮用户查火车班次时，发现官网因罢工无数据后**自行尝试查找客服联系方式、起草询问邮件、甚至准备注册一个邮箱**——肖弘讲述时形容「既震撼又危险」。这是 Agent 越过「劳动 / 工作」边界进入「行动」的真实案例，对应 [m207 - Agent 产品化：场景推演与失败模式](/kb/ai-工程化与落地架构/m207-agent-产品化-场景推演与失败模式/) 的「安全越界」失败模式。
- **算力成本与商业模式**：早期单任务成本 ~2 美元、长任务复合衰减、C 端订阅难以覆盖算力，与 [Perplexity](/kb/ai-公司与产品/perplexity/) 同样陷入「产品形态领先 + 单位经济亏损」张力。
- **监管反复**：2025-12 Meta 收购拟议 → 2026-04 中国 NDRC 叫停。这是 AI 公司跨境并购在主权 AI 政策语境下的第一个标志性反复，对评估中国 AI 公司的退出路径有参考意义。

## 对 Rick 的价值

- **AI PM 评估通用 Agent 的对照基线**：评估任何「通用 Agent」类产品时，问五个问题——步数与成功率拟合曲线、状态持久化能力、HITL 介入颗粒度、复合错误恢复机制、token 成本曲线。这些都来自 Manus 的产品决策痕迹。
- **AI 创业的反共识叙事样本**：砍掉做了 7 个月的 AI 浏览器 / 选百度模式（通用平台）而非 Hao123 模式（预集成功能列表）/ 零市场预算押算力增长——三个反共识决策都来自肖弘公开复盘，可作为面试 case 与产品判断训练材料。
- **「劳动 / 工作 / 行动」与 AI 自主性边界**：火车班次案例把 阿伦特 的劳动—工作—行动三分搬到了 AI 产品决策层——三档自主性开关是合理的产品设计方向。
- **Agent 范式与底层能力的解耦观察点**：Manus 的成败本质上取决于 [Computer Use](/kb/ai-公司与产品/computer-use/) 视觉模型的稳定度（这是 [Anthropic](/kb/ai-公司与产品/anthropic/) / [OpenAI](/kb/ai-公司与产品/openai/) 的基础研究问题），不是 Manus 自己的工程能力——这是 PM 应用层与底层模型层的依赖关系样板。

## 关联节点

**核心展开**：
- [E02 通用 Agent·Manus & Devin](/kb/agent-系统化专题/e02-通用-agent-manus-devin/)——本节点的完整剖解版本（六层架构 / 设计哲学 / 复合错误数学 / R1-R5 修订史 / 跨域呼应）

**技术与范式**：
- [Computer Use](/kb/ai-公司与产品/computer-use/) [Agent](/kb/ai-基础知识库/agent/) [c10 - Agent 技术栈与工具调用](/kb/ai-基础知识库/c10-agent-技术栈与工具调用/)
- [Harness 词义辨析](/kb/agent-系统化专题/harness-词义辨析/) [S01 Agent 六层架构剖面](/kb/agent-系统化专题/s01-agent-六层架构剖面/) [G02 五代演化详解·G1-G5](/kb/agent-系统化专题/g02-五代演化详解-g1-g5/)
- [m206 - Agent 产品化：记忆机制与技术进展](/kb/ai-工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/) [m207 - Agent 产品化：场景推演与失败模式](/kb/ai-工程化与落地架构/m207-agent-产品化-场景推演与失败模式/)

**同类产品**：
- [ChatGPT](/kb/ai-公司与产品/chatgpt/)（Operator）[Claude](/kb/ai-公司与产品/claude/)（Computer Use）[Perplexity](/kb/ai-公司与产品/perplexity/) [DeepSeek](/kb/ai-公司与产品/deepseek/)

**公司与人物**：
- [Anthropic](/kb/ai-公司与产品/anthropic/) [OpenAI](/kb/ai-公司与产品/openai/)（生态对照）

**跨域**：
- 阿伦特（劳动/工作/行动 与 AI 自主性边界）生命政治（自我技术外包）

## 来源 / 证据池

- 一手证据：
  - Cubox/Manus创始人肖弘，复盘至暗时刻-2025-12-30——三次反共识决策 + 砍 AI 浏览器 + 零市场预算策略 + 火车班次 Agent 越界事件 + AI 原生组织 60 分自评
  - Cubox/Manus 产品立项初期会议纪要-2025-12-28——百度 vs Hao123 战略类比 + 云端浏览器与状态持久化 + Devin UI 批判 + 渐进式披露
  - Cubox/大厂产品范式被动摇，创业的可能性回归-2025-03-18——Manus 上线 7 天 200 万预约 + 单次任务 2 美元成本
- 公开新闻：CNBC 2025-12-30《Meta acquires intelligent agent firm Manus》；TechCrunch 2026-04-27《China blocks Meta's $2B Manus deal after months-long probe》；Wikipedia "Manus (AI agent)"（2026-05 维护版）
- 衍生分析见 [E02 通用 Agent·Manus & Devin](/kb/agent-系统化专题/e02-通用-agent-manus-devin/) §2.11 衍生对话存档

---

*2026-05-21 由 stub（325B）扩充为 hub 节点，主体深度展开仍在 [E02 通用 Agent·Manus & Devin](/kb/agent-系统化专题/e02-通用-agent-manus-devin/)*

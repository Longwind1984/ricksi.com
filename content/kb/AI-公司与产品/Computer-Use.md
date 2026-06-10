---
title: Computer Use
cluster: AI 公司与产品
created: '2026-05-18'
updated: '2026-05-18'
---

# Computer Use

> 让大模型像人类一样直接操作电脑——看屏幕截图、移动鼠标、敲键盘、点击按钮、读取应用界面——执行多步任务的产品形态与技术能力。2024 年 10 月 [Anthropic](/kb/ai-公司与产品/anthropic/) 在 [Claude](/kb/ai-公司与产品/claude/) 3.5 Sonnet 上首次推出公测版，定义了这一赛道的产品边界。同代竞品包括 [OpenAI](/kb/ai-公司与产品/openai/) 的 Operator（2025 年 1 月）、Google 的 Project Mariner、Adept 的 ACT-1 (早期版本)。是当前 [Agent](/kb/ai-基础知识库/agent/) 产品化路线中最具"通用性"承诺、但同时也是失败率最高、最难评估的形态。

## 产品定义
- **能力面**：模型接收屏幕截图 + 任务描述，输出"鼠标点击坐标 / 键盘输入 / 滚动 / 等待"等原子操作序列，反复循环直至任务完成。底层是 [tool use](/kb/ai-基础知识库/function-calling/) + 视觉理解 + 长 horizon 规划三能力的组合。
- **形态面**：通常以 API 或独立桌面/网页 Agent 形式提供。开发者通过 sandbox VM 把 Agent 跑在隔离环境里——理论上"看见即可操作"，不依赖应用是否提供 API。
- **使命承诺**：成为"AI 时代的通用胶水"——绕过应用厂商不愿意开放的 API、不愿意做的集成、不愿意支持的工作流，直接由模型"看图办事"。这是把"AI 嵌入既有 SaaS"模式转向"AI 代替用户操作既有 SaaS"模式的关键尝试。

## 演化时间线
- 2022 之前 RPA（Robotic Process Automation）厂商（UiPath、Automation Anywhere）已经做"屏幕自动化"，但是规则驱动，脆弱性高。
- 2022.9 Adept 公司发布 ACT-1 demo，首次展示"自然语言指令 → 浏览器动作"的 LLM 驱动屏幕 Agent。
- 2023 OpenAI 启动 ChatGPT Browse、Code Interpreter 等"工具调用"功能，但都没跨出沙盒；Bing Chat 出现"自动导航网页"实验。
- 2024.10 [Anthropic](/kb/ai-公司与产品/anthropic/) 公测 [Claude](/kb/ai-公司与产品/claude/) Computer Use，是首个公开 API 形式的屏幕 Agent；同月发布 Demo 包括 Excel 操作、Web Form 填写、跨应用复制粘贴。
- 2025.1 OpenAI 发布 Operator，主打消费级用法（订餐、订票、查询）；同期 Google Project Mariner 公测。
- 2025 Anthropic 把 Computer Use 集成进 Claude.ai 的 Workspaces 与 Claude Code 的 IDE 控制能力中。
- 2026 当下技术成熟度仍处早期：简单浏览器任务成功率 60–80%，复杂跨应用任务 < 40%。各家都在改进 grounding（视觉定位）、长记忆、错误恢复机制。

## 技术挑战
- **Grounding 精度**：把"点击购买按钮"翻译为"鼠标移动到 (x=1247, y=583) 后单击左键"需要视觉-坐标对齐能力。模型经常"看见但点不准"，是当前最大瓶颈。
- **长 horizon 规划**：跨应用、跨网页的任务需要 50–200 步操作，错误率随步数指数累积；需要中间检查点、回滚机制。
- **状态不稳定性**：弹窗、加载延迟、广告、Cookie 提示、登录墙——真实世界 UI 充满噪声，与训练数据分布偏差大。
- **评估难题**：没有统一基准。OSWorld、WebArena、AgentBench 等是早期尝试，但都不能完全覆盖"任意应用 / 任意任务"。
- **安全与红线**：Agent 能点击 "Delete account"、"Transfer money"、"Sign contract"，[Anthropic](/kb/ai-公司与产品/anthropic/) 在 Computer Use 文档中明确警告需要在 sandbox + 人类确认 loop 中使用，是 [安全评估](/kb/ai-基础知识库/c14-模型评估体系与-goodhart-陷阱/) 与 [防御性 UX](/kb/ai-产品设计与交互范式/p304-防御性-ux-对抗延迟与幻觉/) 的高难度场景。

## 产品形态对比
- **vs. API Agent**：API Agent 通过应用厂商提供的接口完成任务，依赖应用方合作；Computer Use 绕过 API 限制但失败率显著更高。Rick 在 AI 产品形态 中讨论的"扁平 API 整合" vs "屏幕智能 Agent" 是当前最关键的路线分歧。
- **vs. IDE Agent ([Claude Code](/kb/ai-公司与产品/claude-code/) / Cursor)**：IDE Agent 在更受控的环境中操作（文件系统、命令行、特定 IDE 协议），失败率低于通用屏幕 Agent，但能力域窄。两者一起构成"狭窄但靠谱" vs "通用但脆弱"的产品光谱。
- **vs. RPA**：传统 RPA 工具规则驱动、需要预先录制脚本；Computer Use 自然语言驱动、临时规划。RPA 在结构化业务流程仍然更可靠，Computer Use 在长尾未定义任务上潜力更大。

## 对 Rick 的价值
- **Agent 产品化的极端样本**：Computer Use 是 [Agent 产品化](/kb/ai-工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/) 中"最激进的承诺、最大的风险、最长的爬坡曲线"——研究它就是研究 Agent 时代的产品 PMF 在什么形态下最难达到。
- **PM 评估 AI 产品成熟度的标尺**：当 Computer Use 类产品的常用任务成功率从 60% → 90%，意味着 Agent 时代真正落地；这是 Rick 在 20260304-AI产品体验的代差与组织问题 中观察的"AI 产品代差"的下一个分水岭。
- **AI 安全可观测的现实必要性**：Computer Use 把"AI 自主操作"具身化到桌面级别，是讨论 AI 安全（误操作、对抗攻击、prompt injection）不再抽象的产品场景；与 Rick 在 [p304 - 防御性 UX：对抗延迟与幻觉](/kb/ai-产品设计与交互范式/p304-防御性-ux-对抗延迟与幻觉/) [p305 - 信任架构与可解释性设计](/kb/ai-产品设计与交互范式/p305-信任架构与可解释性设计/) 的设计议题强相关。

## 关联节点
- 上游能力：[Function Calling](/kb/ai-基础知识库/function-calling/) [Agent](/kb/ai-基础知识库/agent/) [RLHF](/kb/ai-基础知识库/rlhf/) 视觉理解 长上下文
- 产品代表：[Anthropic](/kb/ai-公司与产品/anthropic/) Computer Use、[OpenAI](/kb/ai-公司与产品/openai/) Operator、Google Project Mariner、Adept ACT-1
- 公司：[Anthropic](/kb/ai-公司与产品/anthropic/) [OpenAI](/kb/ai-公司与产品/openai/) Google [Microsoft](/kb/ai-公司与产品/microsoft/) Adept
- 产品议题：m205 - AI 产品形态：从工具到 Agent [m206 - Agent 产品化：记忆机制与技术进展](/kb/ai-工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/) [p302 - 七种 AI 交互设计模式](/kb/ai-产品设计与交互范式/p302-七种-ai-交互设计模式/) [p304 - 防御性 UX：对抗延迟与幻觉](/kb/ai-产品设计与交互范式/p304-防御性-ux-对抗延迟与幻觉/) [p305 - 信任架构与可解释性设计](/kb/ai-产品设计与交互范式/p305-信任架构与可解释性设计/)
- 评估议题：[c14 - 模型评估体系与 Goodhart 陷阱](/kb/ai-基础知识库/c14-模型评估体系与-goodhart-陷阱/)
- 职业议题：通往 AI PM 之路

## 来源 / 证据池
- Anthropic 官方文档：anthropic.com/computer-use (2024.10 公测公告)
- OpenAI Operator 发布会与系统卡片 (2025.1)
- 学术基准：OSWorld、WebArena、AgentBench
- （待补充：从 Cubox 反链汇集的具体证据）

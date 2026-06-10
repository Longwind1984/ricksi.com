---
title: Claude Code
cluster: AI 公司与产品
created: '2026-05-15'
updated: '2026-05-18'
---

# [Claude](/kb/ai-公司与产品/claude/) Code

> [Anthropic](/kb/ai-公司与产品/anthropic/) 推出的 CLI Agent 工具，与 Claude 模型同源，面向开发者完成代码编辑、命令执行、多步任务。2025 年 GA，2026 年已是开发者 Agent 工具市场的事实标准之一（与 Cursor、Cline、Aider、Trae Solo 等并列）。其产品形态把"上下文管理 + 工具调用 + skill / plugin 扩展"打包成一个可复制的范式，是 [Agent 产品化](/kb/ai-工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/) 的最高质量公开案例。

## 产品定义
- **形态**：本地 CLI 工具（macOS / Windows / Linux），跑 Node/Bun；亦有桌面 App 与 IDE 插件（VS Code / JetBrains）。
- **核心能力**：在本地仓库内读写文件、跑命令、调 git、嵌入 MCP 工具；以 Plan / TodoWrite / 多步执行 / verification 闭环为协作骨架。
- **模型默认**：Claude Sonnet 4.6 主力执行 + Claude Opus 4.7 规划 + Haiku 4.5 子任务，按需切换（[多模型分层](/kb/ai-基础知识库/多模型分层/) 范式）。
- **扩展机制**：CLAUDE.md（仓库级 prompt）+ Skills（可复用工作流）+ Subagents（子代理隔离上下文）+ Hooks（生命周期回调）+ Plugins（第三方集成）。
- **生态**：obra/superpowers、voltagent/awesome-claude-code-subagents、Anthropic 官方 marketplace、ccusage（用量可视化）等社区/官方插件。

## 演化时间线
- **2025 Q1** Claude Code 早期 Preview。
- **2025 中** GA + Skills 机制公开。
- **2025 末** Subagents / Hooks / Plugins 标准化；MCP（Model Context Protocol）成为外部工具接入协议。
- **2026.1–2026.5** Sonnet 4.5 → 4.6 / Opus 4.5 → 4.7 多次升级；产品形态稳定为"CLI + 桌面 + IDE 插件 + 远程 Agents"。

## 与 Trae Solo 的形态差异：开发者 CLI vs 自然语言 vibe coding

Trae Solo（字节跳动 2025 年发布）以"vibe coding"为定位——非开发者通过自然语言指令完成 web 应用/小工具生成，目标是把"想到就能做出来"的门槛压到无代码能力的人也能用。Claude Code 走相反路径——开发者 CLI，假定使用者已具备代码工程素养，把 Agent 嵌入 git/terminal/IDE 工作流，强化的是高频专业用户的速度与控制力。

从产品形态拆开看：
- **Trae Solo**：自然语言界面 + 自动构建 + 即时预览 + 部署一条龙，重在降低进入门槛；其能力栈包括 Computer Use 式的 GUI 操作，适用于把已有 SaaS/网页流程封装成自动化。
- **Claude Code**：终端命令 + 文件系统直接读写 + git 集成 + skill/plugin 扩展，重在融入既有开发者工作流；通过 MCP/API 与外部系统对接，避免 Computer Use 的高 token 成本。

两者共享底层（大模型 + Agent loop + 工具调用），分歧点在 **MCP/API 对接 vs Computer Use 对接的体验差**：MCP/API 直连结构化、低延迟、低 token 消耗，但需要被对接方提供接口；Computer Use 暴力无差别兼容 GUI，覆盖率高但 token 成本与速度天然偏高（每一次操作要把屏幕截图编码进 context）。这道体验差会长期存在——只要 GUI 不消失、屏幕状态需要 LLM 视觉解析，Computer Use 的 token 与速度上限就由当代硬件与模型架构决定，不是工程优化能抹平的量级差。

产品意涵：Trae Solo 在"无 API 的长尾应用"上有 Claude Code 不可替代的覆盖面，Claude Code 在"已结构化的开发栈"上有 Trae Solo 难以追赶的密度与控制。两类产品会长期共存，而不是收敛为同一形态。

## 高阶玩家工具栈：从上下文管理到验证闭环

Rick 从初阶进阶时整理的实践图谱。统一原理：所有"高阶"操作都围绕一根轴——管理上下文窗口、降低决策风险、把工具能力下沉到 deterministic 层。

三轴框架：上下文管理（CLAUDE.md / skills / subagents / hooks）× 模型分层（Opus 规划 + Sonnet 执行 + Haiku 子任务 + effort 控制）× 验证闭环（test / lint / review）。

- **配置层 quick wins**：settings.json 设 statusLine / env / 思考令牌上限；CLAUDE.md 控制 200 行内，超出迁移到 skills；用 .claudeignore 排除 noise
- **上下文管理（最大杠杆）**：Plan mode 优先（Opus 规划 → Sonnet 执行）；子代理隔离 verbose 输出（grep/glob/read 重活给 subagent）；并行 git worktree；/compact 降阈值
- **代码质量验证闭环**：给 Claude 可验证对象（跑测试、类型检查、linter）；装 obra/superpowers 系列 skills（TDD + 调试 + verification-before-completion）；专门的 code review subagent；hooks 自动拦截危险操作 + 自动 lint/format；"对抗式" prompt 让 Claude 自我审视
- **Token 节约**：分层模型 + 用 skills 替代冗长 CLAUDE.md + 子代理隔离 + bash filter hook 去 ANSI 码 + 过滤测试输出再喂模型；装 ccusage 可视化成本
- **Prompt patterns**：反向访谈 / 挑战式提示 / 分阶段门控计划（每阶段有测试）/ 垂直切片 / "两次失败才加入 CLAUDE.md"原则
- **生态推荐**：obra/superpowers、voltagent/awesome-claude-code-subagents、Anthropic 官方 marketplace、napkin（per-repo 错误备忘录）

## 对 Rick 的价值
- **Rick 主力开发 Agent**：本库的运行（包括 PKM 自动化、Obsidian 索引同步、cubox/flomo 处理脚本、weread 接入等）都由 Claude Code 驱动。
- **AI PM 学习样本**：Claude Code 是研究"Agent 如何产品化"的最佳活体——上下文管理、工具调用、Skills 机制、Plan/TodoWrite 流程、Hooks 都是可直接迁移到 Rick 自己 AI 产品设计的范式。
- **PKM 自动化基础设施**：scheduled-tasks + skills + agents 构成"夜间自动跑 PKM 优化"的能力栈（本份运行报告即由此而来）。

## 关联节点
- 公司 / 模型：[Anthropic](/kb/ai-公司与产品/anthropic/) [Claude](/kb/ai-公司与产品/claude/) [Claude Opus](/kb/ai-公司与产品/claude-opus/) [Claude Sonnet](/kb/ai-公司与产品/claude-sonnet/)
- 产品对照：Cursor / Cline / Aider / Trae Solo / Codex CLI
- 技术：[Agent](/kb/ai-基础知识库/agent/) MCP [Function Calling](/kb/ai-基础知识库/function-calling/) [Prompt Caching](/kb/ai-基础知识库/prompt-caching/) [多模型分层](/kb/ai-基础知识库/多模型分层/)
- 产品议题：[m206 - Agent 产品化：记忆机制与技术进展](/kb/ai-工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/) [p302 - 七种 AI 交互设计模式](/kb/ai-产品设计与交互范式/p302-七种-ai-交互设计模式/)

## 衍生对话存档
- Trae Solo 的定位与实际应用
- Claude Code 最佳实践

## 来源 / 证据池

（待补充: 从 Cubox 或永久笔记反链汇集到此节点的证据条目）

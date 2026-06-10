---
title: Codex
cluster: AI 公司与产品
created: '2026-05-19'
updated: '2026-05-19'
---

# Codex

## 一句话定义

[OpenAI](/kb/ai-公司与产品/openai/) 的代码生成与编程 Agent 产品线，2021–2022 阶段以"Codex 模型"为 GitHub Copilot 提供算力底座；2023–2024 间一度被合并入 GPT-4；2025 以"**Codex Web** + **Codex CLI**" 复活，重新定位为**云端长任务编程 Agent**，与 [Anthropic](/kb/ai-公司与产品/anthropic/) [Claude Code](/kb/ai-公司与产品/claude-code/) 同台竞争。

## 三代演化时间线

| 阶段 | 时间 | 主要形态 | 主要消费者 |
|------|------|---------|----------|
| **Codex 1.0**（模型即产品） | 2021-07 至 2023 | OpenAI Codex 模型 API；Python/JS 等数十种语言 | GitHub Copilot 内嵌 |
| **沉寂期**（能力被吸入通用模型） | 2023 至 2024 | Codex API 被弃用，能力转入 GPT-4 / GPT-4o | GitHub Copilot 切到 GPT-4 |
| **Codex 2.0**（Agent 化复活） | 2025 至今 | Codex CLI / Codex Web / Codex IDE 集成 | 开发者直接订阅 + ChatGPT Pro 用户 |

## 当前产品形态（2025–2026）

### Codex Web
- 浏览器内的"工程师 Agent"：上传仓库 + 指派任务（修 bug / 实现功能 / 写测试），Agent 在隔离的虚拟环境中迭代，完成后给出 PR diff
- 任务时长一般 5–30 分钟，支持长任务（"async coding agent"定位）
- 与 GitHub / GitLab / 自建仓库通过 OAuth 集成

### Codex CLI
- 类似 [Claude Code](/kb/ai-公司与产品/claude-code/) 的命令行 Agent：在本地终端运行，可读写工作目录、执行命令、用 Apply Patch 修改文件
- 开源（Apache 2.0），但需要 OpenAI API Key 或 ChatGPT Pro 订阅
- 与 Codex Web 共享任务模型，Web 启动长任务、CLI 做交互式开发

### Codex IDE Integrations
- 与 VS Code / Cursor / JetBrains 等 IDE 集成（GitHub Copilot 仍是最大渠道，但 Codex 也直接发布插件）

## 与 Claude Code 的对比

| 维度 | Codex | [Claude Code](/kb/ai-公司与产品/claude-code/) |
|------|-------|----------------|
| **底层模型** | GPT-5 系列 / Codex 微调模型 | Claude 4.x 系列（Opus / Sonnet） |
| **CLI 体验** | Codex CLI（开源） | Claude Code（开源） |
| **强项** | 长任务异步执行、Web 端"派活"形态、与 GitHub 深整合 | 交互式调试、Plan/Edit 流畅度、子代理与 Skills 生态 |
| **弱项** | 交互式深度不及 Claude Code | 异步"派活"端尚不成熟（仅 SDK 暴露） |
| **付费** | ChatGPT Pro / API | Claude Pro / Max / API |
| **MCP 支持** | 支持 | 原生支持（Anthropic 起家协议） |

OpenAI 与 Anthropic 在 2025–2026 间形成"**Web 异步 Agent vs. 终端深交互 Agent**"的产品分野——双方仍互相借鉴但风格分明。

## 设计意图

- **重新拿回编程入口**：GitHub Copilot 的算力虽用 GPT，但用户感知是"GitHub 的产品"；Codex Web/CLI 是 OpenAI 直接面向开发者建立独立入口
- **长任务 Agent 模板**：Codex Web 的"分配任务 + 异步执行 + 完成回报"是 OpenAI 验证 Agent 产品形态的关键试验场（同步 Operator 在浏览器任务上的尝试）
- **开发者订阅留存**：把 ChatGPT Pro 升级到"含编程 Agent"的差异化档位，与 Anthropic Max 计划对位
- **数据飞轮**：长任务期间的多步推理与代码评测能高质量反哺 RLHF

## 局限与风险

- **品牌混乱**：Codex 1.0 (2021) 与 Codex 2.0 (2025) 同名但产品定义完全不同，文档与社区记忆错位
- **GitHub Copilot 关系**：GitHub 由微软全资，但 Copilot 与 Codex Web 在长任务端某种程度竞争——OpenAI/Microsoft 间产品边界仍在博弈
- **隔离环境安全**：Codex Web 的虚拟环境授权管理（能否触达生产数据、写入到哪些分支）是合规与安全的最大风险点
- **价格**：长任务消耗 token 量大，普通订阅 Pro 用户的 quota 限制较紧

## 对 Rick 的价值

1. **AI 独立开发者实战工具**——Codex CLI 与 [Claude Code](/kb/ai-公司与产品/claude-code/) 并用是 Rick 当前工作流的可能组合，对比体验本身就是观察素材
2. **Agent 产品形态判断**——Web 异步 vs 终端交互的两条路线对比，为 AI PM 设计 Agent 产品提供直接参照
3. **AI PM 视角**——Codex 的产品史（被吸入通用模型 → 又被独立出来）说明"专用模型 vs 通用模型"在 OpenAI 内部的来回摇摆
4. **Newsletter 主题**——"Codex 2.0 是怎么从 2023 的失败中复活的"是适合 AI PM 受众的产品史故事

## 关联节点

- 母公司：[OpenAI](/kb/ai-公司与产品/openai/)
- 同公司产品：[ChatGPT](/kb/ai-公司与产品/chatgpt/) [GPTs](/kb/ai-公司与产品/gpts/) [DALL-E](/kb/ai-公司与产品/dall-e/) [Sora](/kb/ai-公司与产品/sora/) [Computer Use](/kb/ai-公司与产品/computer-use/)
- 竞品：[Claude Code](/kb/ai-公司与产品/claude-code/) / Cursor / Cline / GitHub Copilot Workspace / Gemini Code Assist
- 概念：[Agent](/kb/ai-基础知识库/agent/) / [多模型分层](/kb/ai-基础知识库/多模型分层/) / MCP / Apply Patch / 长上下文
- 关联：[Microsoft](/kb/ai-公司与产品/microsoft/)（通过 Azure 算力与 GitHub Copilot 关系）

## 来源

- OpenAI Codex 产品页与 2025 重启公告
- *OpenAI Codex Live*（2021 论文 arXiv:2107.03374，Codex 1.0 技术报告）
- OpenAI 2025 DevDay / 公开开发者通讯关于 Codex CLI 与 Web 的发布说明
- vault 内：[OpenAI](/kb/ai-公司与产品/openai/) [ChatGPT](/kb/ai-公司与产品/chatgpt/) [Claude Code](/kb/ai-公司与产品/claude-code/) 已多次互引

## 证据池

- 待 Cubox 反链汇总脚本恢复后批量回填外部摘录
- 当前 vault 内 4 处反链：见 [OpenAI](/kb/ai-公司与产品/openai/) / [Claude Code](/kb/ai-公司与产品/claude-code/) 对比与 AI PM 知识图谱节点

---
title: Claude Opus
cluster: AI 公司与产品
created: '2026-05-15'
updated: '2026-05-16'
---

# [Claude](/kb/ai-公司与产品/claude/) Opus

> [Anthropic](/kb/ai-公司与产品/anthropic/) Claude 系列的旗舰大模型，定位"最深推理 / 最复杂任务 / 最长 horizon"。在 [Claude Sonnet](/kb/ai-公司与产品/claude-sonnet/) 主打速度与性价比时，Opus 负责承担"难题终判"。当前主线版本：Claude Opus 4.7（2026.5）。

## 模型定位
- **能力轴**：复杂多步推理、长上下文（200K+）、代码 Agent、研究级写作。
- **成本轴**：单 token 价格显著高于 Sonnet（约 5–6x），但单位有效任务上往往更便宜，因为减少了重试与人工兜底。
- **延迟轴**：明显高于 Sonnet，不适合实时交互；适合"提交 → 等结果"的离线 / 后台任务。
- **典型场景**：[Claude Code](/kb/ai-公司与产品/claude-code/) 中的"困难修复 / 大架构改动"、深度研究助理、法律 / 科研 / 投研分析、产品 / 战略 long-form 思考。

## 版本与节奏
- **Claude 3 Opus**（2024.3）：首次在多个学术基准超越 GPT-4，是 Anthropic 进入第一梯队的标志。
- **Claude Opus 4**（2025）：把 Agentic 能力作为主升级方向，编码 SWE-bench 表现跃升。
- **Claude Opus 4.5 / 4.6**：迭代 [Function Calling](/kb/ai-基础知识库/function-calling/)、parallel tool use、Memory Tool（[KV Cache](/kb/ai-基础知识库/kv-cache/) / prompt caching 默认开启）。
- **Claude Opus 4.7**（2026.5，当前）：知识截止 2026.1；显著加强对话内压缩（compaction）、agentic loop 中的自纠错与长任务持续运行。

## 与同档对手对比
- **vs. GPT-5 / o3-pro**：Opus 在"长 horizon 编码 + 工具调用 + 写作 voice"上稳定，o-series 在数学 / 竞赛推理上更强。
- **vs. Gemini 3 Pro / Ultra**：Gemini 在多模态 + 上下文长度上有优势；Opus 在代码 / 指令服从 / 安全行为上更稳。
- **vs. [DeepSeek](/kb/ai-公司与产品/deepseek/) V4-Pro / R1**：DeepSeek 性价比碾压，但在复杂 Agent loop 与"自我评估"环节稳定性不如 Opus。

## 使用判断（Rick 视角）
- **何时用 Opus**：任务一次性失败成本高（重要文档、跨文件重构、决策建议）、需要"模型自己规划多步"、需要安全 / 可解释行为（如带审计要求的输出）。
- **何时用 Sonnet 而不是 Opus**：日常对话、批量任务、实时 IDE 自动补全、需要并行多 Agent 时（成本权衡）。
- **何时用 Haiku 而不是 Opus**：分类、提取、路由、便宜的子任务派发。
- **何时该跨家选型**：见 [m202 - 工程选型决策矩阵](/kb/ai-工程化与落地架构/m202-工程选型决策矩阵/)——单点能力极致时考虑 GPT/Gemini/DeepSeek 互补。

## 对 Rick 的价值
- **当前 Claude Code 主体执行模型**：本日志即 Opus 4.7 写就。它的输出风格与 Rick 已建立长期默契：节制、不堆砌、能区分"该写"与"不该写"。
- **Agentic 产品标准的检验器**：当 Rick 评估别家 Agent 产品时，Opus 是稳定的对照基准——能力底线和操作风格都可预期。

## 关联节点
- 系列：[Claude](/kb/ai-公司与产品/claude/) [Claude Sonnet](/kb/ai-公司与产品/claude-sonnet/) [Claude Code](/kb/ai-公司与产品/claude-code/)
- 公司：[Anthropic](/kb/ai-公司与产品/anthropic/)
- 能力：[Agent](/kb/ai-基础知识库/agent/) [Function Calling](/kb/ai-基础知识库/function-calling/) [KV Cache](/kb/ai-基础知识库/kv-cache/) [c11 - System 2 思维与 Test-Time Compute](/kb/ai-基础知识库/c11-system-2-思维与-test-time-compute/)
- 选型框架：[m202 - 工程选型决策矩阵](/kb/ai-工程化与落地架构/m202-工程选型决策矩阵/) [m209 - 推理成本控制手册](/kb/ai-工程化与落地架构/m209-推理成本控制手册/)
- 对照产品：[ChatGPT](/kb/ai-公司与产品/chatgpt/) [Gemini](/kb/ai-公司与产品/gemini/) [DeepSeek](/kb/ai-公司与产品/deepseek/)

## 来源 / 证据池
- 公开来源：Anthropic Model Card、定价页、Claude Code release notes
- （待补充：从 Cubox 反链汇集的具体证据）

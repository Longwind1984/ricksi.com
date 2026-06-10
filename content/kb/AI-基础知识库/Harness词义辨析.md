---
title: Harness词义辨析
cluster: AI 基础知识库
created: '2026-05-18'
updated: '2026-05-18'
---
# Harness 词义辨析

一句话定义：在 AI 工程社区，"harness" 从评测术语（LM eval harness）滑动为 agent 运行时框架的通称，指模型外围用于约束、调度、工具调用、记忆管理的代码层。

核心要点：
- 词源：harness 本义为马具/挽具，引申为"约束并驱动"。在软件语境里，"test harness" 是早期成熟用法——围绕被测对象、提供输入输出、采集行为。
- 语义滑动一：LM eval harness（如 EleutherAI 的 lm-evaluation-harness）→ 跑模型评测的工具脚手架。
- 语义滑动二：agent harness → 在模型外部组织 prompt、tool calls、loop、内存、错误恢复的全部代码；Claude Code、Cursor、Codex 都是各自的 harness。
- 语义滑动三：社区中 "harness vs. model" 的二分被用来强调能力来源——同一模型在不同 harness 里表现差异巨大。
- Superpowers skill 不是 harness，而是 harness 上运行的"plugin/skill"层：skill 提供领域知识与工作流，harness 决定怎么把 skill 调起来。
- Claude Code 是 harness；plugins/skills 是 harness 内的可加载组件；二者不在同一抽象层。

## 关联节点
- [Claude Code](/kb/ai-公司与产品/claude-code/)
- *Superpowers skill*（提议新建）

## 专题升级（0411）

本卡片做的是词源/语义滑动梳理。完整的抽象层级辨析（harness vs framework vs agent vs skill vs orchestrator 五词分层）与 Harness Engineering 全景请见：
- [A02 抽象层级辨析·Harness Framework Agent Skill Orchestrator](/kb/agent-系统化专题/a02-抽象层级辨析-harness-framework-agent-skill-orchestrator/)
- [S03 Harness Engineering 全景](/kb/agent-系统化专题/s03-harness-engineering-全景/)（含 Hashimoto 命名史 + Dreyfus 技能分级 + 五家 coding harness 对照）
- [_Agent 系统化专题·总览](/kb/agent-系统化专题/_agent-系统化专题-总览/)

## 衍生对话存档
- 来源对话

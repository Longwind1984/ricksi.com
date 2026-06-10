---
title: Skill 系统的本质
cluster: AI 协作方法论
created: '2026-05-18'
updated: '2026-05-18'
---

# Skill 系统的本质

Skill 是写给 Claude 自己看的操作手册——以 SKILL.md 文件夹形式承载特定任务类型的最佳实践指令，在推理时动态加载到上下文窗口。

核心要点：
- 不是代码、不是插件、不是 API，而是 procedural knowledge 的文档化封装
- 推理时动态加载 → 可热更新、不需要重新训练模型
- 三层结构：官方 public/、示例 examples/、用户 user/，对应 Anthropic 自维护与用户自定义
- 设计哲学接近 RAG，但检索的是「如何做事」而非「知识本身」
- 与 Cursor 的 .cursorrules、Copilot 的 instruction files 同一类抽象
- 给模型加一层 quality assurance middleware，把波动大的裸模型输出收敛到经验范式内

## 关联节点
- [Claude](/kb/ai-公司与产品/claude/)
- [Claude Code](/kb/ai-公司与产品/claude-code/)
- [Anthropic](/kb/ai-公司与产品/anthropic/)
- [AI PM 知识图谱·总索引](/kb/ai-pm-知识图谱/ai-pm-知识图谱-总索引/)

## 专题升级（0411）

Skill 在 Agent 抽象层级中的位置（harness 内的可加载 procedural knowledge plugin）请见：
- [A02 抽象层级辨析·Harness Framework Agent Skill Orchestrator](/kb/agent-系统化专题/a02-抽象层级辨析-harness-framework-agent-skill-orchestrator/)
- [S03 Harness Engineering 全景](/kb/agent-系统化专题/s03-harness-engineering-全景/) §"harness 六大核心能力"
- [_Agent 系统化专题·总览](/kb/agent-系统化专题/_agent-系统化专题-总览/)

## 衍生对话存档
- 来源对话

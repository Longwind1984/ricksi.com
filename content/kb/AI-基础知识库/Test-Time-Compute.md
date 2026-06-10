---
title: Test-Time Compute
cluster: AI 基础知识库
created: '2026-05-13'
updated: '2026-05-16'
---

# System 2 / Test-Time Compute

## 范式转移

将算力从预训练阶段转移到**推理阶段**（Test-Time Compute）。

通过强化学习 (RL) 训练模型在推理时进行树搜索 (MCTS)、试错与回溯。

## ORM vs PRM

| 方案 | 机制 | 局限 |
|------|------|------|
| ORM (Outcome Reward Model) | 只看最终结果 0/1 | 无法区分"推理正确但计算失误"和"方向错误" |
| PRM (Process Reward Model) | 对每一步推理打分 | 让"思考质量"本身成为可优化的目标 |

PRM 对应人类认知中 System 1（快速直觉）→ System 2（慢速深度推理）的切换。

## 与 Agent 的融合：Reasoning Agent

Agent 遇到复杂决策节点时，不是一步 ReAct 就输出 Action，而是先进入长时间的 hidden reasoning，再输出经过深度推理的行动。

## 颠覆性的产品形态

- **异步代理工作流**：后台独立任务 + Progress Dashboard
- **思维过程白盒化**：展示"查阅→发现矛盾→回溯换路"的过程
- **动态算力预算控制 (Budget Slider)**：按算力/思考时间计费

## 相关章节

- [c11 System 2 详解](/kb/ai-基础知识库/c11-system-2-思维与-test-time-compute/)
- [c10 Reasoning Agent 融合](/kb/ai-基础知识库/c10-agent-技术栈与工具调用/)

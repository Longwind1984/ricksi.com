---
title: Claude Sonnet
cluster: AI 公司与产品
created: '2026-05-15'
updated: '2026-05-16'
---

# [Claude](/kb/AI-公司与产品/Claude/) Sonnet

> [Anthropic](/kb/AI-公司与产品/Anthropic/) Claude 系列的中位模型，定位"能力 / 延迟 / 成本"的最优平衡点。是 [Claude Code](/kb/AI-公司与产品/Claude-Code/) 默认模型、API 流量主力、企业部署最常用版本。当前主线：Claude Sonnet 4.6（2026.5）。

## 模型定位
- **能力轴**：日常 90% 任务足够（编码、写作、检索摘要、Agent loop、function calling）；少数复杂推理需要交给 [Claude Opus](/kb/AI-公司与产品/Claude-Opus/)。
- **成本轴**：约为 Opus 的 1/5；适合批量、流式、实时 UI 场景。
- **延迟轴**：单次响应明显快于 Opus，可支持交互式产品。
- **典型场景**：IDE 内代码助理（Cursor / Claude Code 默认）、客服 / 助理类对话产品、长篇文档摘要、企业级 RAG 应用、Agent 调度层。

## 版本与节奏
- **Claude 3.5 Sonnet**（2024.6）：定义"中段模型也能做主力"的版本，引入 **Artifacts**（独立工件）和 Computer Use 预览。
- **Claude Sonnet 4 / 4.5**（2025）：编码、工具调用、长上下文持续提升。SWE-bench 与 Tau-bench（agent eval）成绩跃升。
- **Claude Sonnet 4.6**（2026.5，当前）：与 Opus 4.7 同源训练栈；强化对话内压缩、parallel tool use、skill / plugin 生态适配。

## 与同档对手对比
- **vs. GPT-4o / GPT-4.1 / GPT-5 mini**：在编码、Agent loop、指令服从上 Sonnet 占优；在多模态生成（图像 / 视频）上 GPT 更全。
- **vs. Gemini 2.5 Flash / 3 Flash**：Gemini Flash 延迟和上下文长度极强；Sonnet 在代码与"理解长指令"上更稳。
- **vs. [DeepSeek](/kb/AI-公司与产品/DeepSeek/) V4 / V4-Pro**：DeepSeek 单 token 价格远低于 Sonnet，但 Sonnet 在 RLHF 行为一致性和 Agent 安全行为上更稳定。

## 使用判断（Rick 视角）
- **何时优先 Sonnet**：交互式 UI（聊天、IDE 补全）、需要在响应 < 5s 内给出有用结果、并行多 Agent（成本×N 时差距放大）。
- **何时升级到 [Opus](/kb/AI-公司与产品/Claude-Opus/)**：跨文件大规模重构、深度研究 / 战略文档、Agent 长 horizon 失败代价高时。
- **何时降级到 Haiku**：分类 / 抽取 / 简单路由、知道任务难度低、对延迟极度敏感。

## 对 Rick 的价值
- **AI PM 产品决策的默认基准**：在做"我应该把这个功能交给哪个模型"判断时，Sonnet 是"性价比最大、行为最可预期"的默认锚点。
- **Anthropic 产品哲学的最高产体现**：Sonnet 的迭代速度（每 2–4 个月一个版本号）反映了 Anthropic "中段模型 = 主力"的判断——值得 Rick 在做产品定位时类比参考（不要总盯旗舰，做好"次旗舰"往往才是流量主力）。

## 关联节点
- 系列：[Claude](/kb/AI-公司与产品/Claude/) [Claude Opus](/kb/AI-公司与产品/Claude-Opus/) [Claude Code](/kb/AI-公司与产品/Claude-Code/)
- 公司：[Anthropic](/kb/AI-公司与产品/Anthropic/)
- 能力：[Agent](/kb/AI-基础知识库/Agent/) [Function Calling](/kb/AI-基础知识库/Function-Calling/) [RAG](/kb/AI-基础知识库/RAG/)
- 选型框架：[m202 - 工程选型决策矩阵](/kb/AI-工程化与落地架构/m202-工程选型决策矩阵/) [m209 - 推理成本控制手册](/kb/AI-工程化与落地架构/m209-推理成本控制手册/)
- 对照产品：[ChatGPT](/kb/AI-公司与产品/ChatGPT/) [Gemini](/kb/AI-公司与产品/Gemini/) [DeepSeek](/kb/AI-公司与产品/DeepSeek/)

## 来源 / 证据池
- 公开来源：Anthropic Model Card、定价页、Cursor / Claude Code release notes
- （待补充：从 Cubox 反链汇集的具体证据）

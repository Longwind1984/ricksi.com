---
title: SFT
cluster: AI 基础知识库
created: '2026-05-22'
updated: '2026-05-22'
---

# SFT 监督微调

## 核心定义

在高质量的 (指令, 回答) 对上进行微调，教会基座模型"听懂人话、格式化输出"。SFT **不是在注入新知识**，而是在激活和重组预训练阶段已经学到的知识。

与 [预训练](/kb/ai-基础知识库/预训练/) 的关系：预训练学到世界知识，SFT 教会输出格式与行为规范。

## 在训练 Pipeline 中的位置

```
Pretrain → SFT → Reward Modeling → RLHF / DPO / KTO → Eval
              ↑
        本节点焦点
```

- 没有 SFT 直接做 RLHF 会让模型几乎无法收敛——RLHF 需要一个"已经会按指令做出半合理回答"的起点
- 现代 pipeline 经常用 SFT 多轮迭代（Iterative SFT），每轮用更高质量数据替换前轮

## Instruction tuning vs Chat tuning

| 维度 | Instruction Tuning | Chat Tuning |
|------|-------------------|-------------|
| 数据形态 | 单轮 (instruction → response) | 多轮对话 (含 system + user + assistant 来回) |
| 典型起源 | FLAN / T0 / Alpaca | Vicuna / OpenAssistant / Anthropic HH |
| 应用场景 | 一次性任务（翻译 / 摘要） | 真实助手产品（多轮上下文、澄清提问） |

主流 chat model 实际是 Instruction tuning + Chat tuning 的混合数据集训练。

## 关键发现

- **LIMA (2023)**：1000 条极高质量的 SFT 样本可能优于 10 万条平庸样本——质量 > 数量的最强证据
- **OpenAssistant Conversations (2023)**：开源对话语料，证明社区众包能产出可用的 SFT 数据
- **Self-Instruct (2022)**：让模型自己生成指令样本，迭代提升——后来演化为 Synthetic Data 范式
- **Constitutional AI (Anthropic)**：用模型自己批判自己的回答生成 SFT 数据，减少人工标注瓶颈

## SFT 数据来源谱系

1. **人工标注**：质量最高，成本最贵，规模受限
2. **专家筛选众包**：OpenAssistant 路径，质量中等，成本中等
3. **Distillation from teacher**：用 GPT-4 / Claude 生成数据再训小模型（Alpaca / Vicuna 路径）——商用受 OpenAI 条款限制
4. **Synthetic Data**：模型自生成 + 自评估 + 筛选，已是大厂主流（见 [c15 数据墙](/kb/ai-基础知识库/c15-数据墙与后训练霸权/)）
5. **Constitutional / 自我批判**：Anthropic 的 RLAIF 路径，让模型对照"宪法"原则改写自己的回答

## 风险

- **过拟合 / 复读机**：SFT 阶段过度灌入同一格式数据，输出风格僵化（"As an AI language model..." 起手是早期 ChatGPT 的标志性副产品）
- **灾难性遗忘**：SFT 注入新领域知识容易让模型忘掉预训练已学的通用能力——这是 [幻觉](/kb/ai-基础知识库/幻觉/) 的来源之一
- **能力对齐税 (alignment tax)**：经过 SFT + RLHF 的模型在某些 raw 推理任务上比 base model 弱
- **风格污染**：教师模型的回答风格（爱列点 / 偏好结构化）会被学徒模型继承

## SFT vs RAG vs Long Context vs RLHF

| 目标 | 优先方案 | 备注 |
|------|---------|------|
| 注入领域知识 | RAG（[c09](/kb/ai-基础知识库/c09-rag-架构/)）| SFT 注入知识 ROI 极低且易遗忘 |
| 注入"动态变化"事实 | RAG | SFT 一旦训练成本沉没 |
| 改变行为模式 / 输出格式 | SFT / [LoRA](/kb/ai-基础知识库/lora/) | 这是 SFT 的 sweet spot |
| 改变价值观 / 偏好 | [RLHF](/kb/ai-基础知识库/rlhf/) / DPO | SFT 无法做 ranking 信号 |
| 一次性少量内容 | Long Context + Prompt | 不到几千条数据时连 LoRA 都不值得 |

## PEFT 路径：LoRA 与 SFT 的关系

[LoRA](/kb/ai-基础知识库/lora/) 是 SFT 的工程实现优化：在不动 base 权重的前提下只训练低秩适配矩阵，存储 / 部署成本骤降。绝大多数"SFT"的工业实践其实是 LoRA SFT，全量参数 SFT 只在 base model 提供商内部进行。

## 对 Rick 的 PM 价值

判断"是否该让团队做 SFT"的快速 checklist：

1. **目标是否是行为而非知识？** 如果用户抱怨的是"答得不准"——做 RAG；如果是"语气不对 / 不按格式回答"——做 SFT
2. **数据准备的人力是否充足？** 没有 1000+ 高质量 (input, output) 对就别启动——评估期就会失败
3. **base model 是否已被同行 SFT 过同样目标？** 微调一个已是 chat 模型的 chat 行为大概率掉点
4. **是否有 LoRA 部署基础设施？** 没有的话 SFT 后的部署成本（多模型托管）会让 ROI 崩溃
5. **eval set 是否就绪？** 没有自动评估的 SFT 等于盲调，越调越差

## 相关链接

- [c01 监督学习映射](/kb/ai-基础知识库/c01-认知重构-从确定性系统到概率系统/)
- [c04 训练 Pipeline](/kb/ai-基础知识库/c04-模型训练全阶段-pipeline/)
- [c09 RAG vs SFT](/kb/ai-基础知识库/c09-rag-架构/)
- [c15 数据墙](/kb/ai-基础知识库/c15-数据墙与后训练霸权/)
- [预训练](/kb/ai-基础知识库/预训练/) [RLHF](/kb/ai-基础知识库/rlhf/) [LoRA](/kb/ai-基础知识库/lora/) [Constitutional AI](/kb/ai-基础知识库/constitutional-ai/) [合成数据](/kb/ai-基础知识库/合成数据/) [幻觉](/kb/ai-基础知识库/幻觉/)

## 来源 / 证据池

（待补充：LIMA 原文 / Alpaca 历史争议 / Anthropic Constitutional AI 论文）

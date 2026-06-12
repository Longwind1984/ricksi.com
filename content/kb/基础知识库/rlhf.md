---
title: RLHF
cluster: 基础知识库
created: '2026-06-03'
updated: '2026-06-03'
provenance: co
---

# RLHF / DPO / 对齐

## 一句话定义

**对齐 = 让模型的输出分布往"人类觉得好"的方向偏移**。RLHF 与 DPO 是两种主流技术路径，本质都是用偏好数据塑形输出分布。

## RLHF 完整 Pipeline

```
基础预训练模型
    ↓ SFT（有监督微调，先学指令跟随）
SFT 模型
    ↓ 收集人类偏好对（同 prompt 多回答，标注员排序）
偏好数据集
    ↓ 训练 Reward Model（RM）
Reward Model
    ↓ 用 RM 作为奖励信号，PPO 强化学习
对齐后的模型
```

**关键工程要点**：
- PPO 同时运行 4 个模型：Policy（待优化）/ Reference（冻结的 SFT，防止漂移）/ Reward Model / Value Function
- 极不稳定，对超参数（学习率、KL 系数、clip 范围）极度敏感
- 训练成本高 — 同等规模下比 SFT 贵 5-10×

## DPO 简化路径

**核心数学洞察**：可以从 Bradley-Terry 偏好模型直接推导出策略目标，绕过显式 Reward Model。

```
SFT 模型 + 偏好对 (prompt, chosen, rejected)
    ↓ DPO loss = -log σ(β × [log π(chosen) - log π_ref(chosen) - log π(rejected) + log π_ref(rejected)])
对齐后的模型
```

**为什么大家纷纷转 DPO**：
- 训练稳定（标准监督学习的稳定性）
- 工程链路短（少 1 个 RM 模型 + 少 1 个 PPO 流程）
- 实测效果与 RLHF 持平甚至更好（学术评估）

**DPO 的隐藏代价**：
- 偏好对的数据质量比 PPO 更重要 — 噪声数据直接进入梯度
- "在偏好分布外"的 prompt 上效果不一定迁移
- 难以做 online 学习（PPO 可以边训练边采样）

## RLHF vs DPO vs SFT 对比

| 维度 | SFT | RLHF (PPO) | DPO |
|------|-----|------------|-----|
| 学习信号 | "正确回答" | 偏好排序 + RM 奖励 | 偏好对 |
| 训练稳定性 | 高 | 低 | 中-高 |
| 工程复杂度 | 低 | 高 | 中 |
| 数据需求 | 大量高质 SFT 对 | 数万偏好对 | 数万偏好对 |
| 适用场景 | 学新任务 / 学指令格式 | 风险高的对齐 / 多目标平衡 | 中等规模团队的首选 |
| 2026 主流？ | 仍是基础 | 减少（前沿仍用，如 OpenAI o-series 训练） | 中等规模团队主流 |

## RLAIF（[Anthropic](/kb/ai-公司与产品/anthropic/)）与 Constitutional AI

**痛点**：人类标注偏好昂贵且不一致。

**RLAIF（Reinforcement Learning from AI Feedback）**：让大模型作为标注员产生偏好数据。已被验证在多数任务上接近 RLHF 效果。

**[Constitutional AI](/kb/基础知识库/constitutional-ai/)（CAI）**：Anthropic 的方法 — 让模型根据预定义的"宪法原则"自我评判和修正：
1. SFT 阶段：让模型批评并修正自己的有害输出（Self-Critique）
2. RL 阶段：用模型自己判断的偏好做 RLAIF

Claude 系列的"安全感"很大程度来自 CAI。

## 2024-2026 演化

- **RLVR（Reinforcement Learning with Verifiable Rewards）**：对数学、代码、逻辑任务，用"答案是否正确"作为可验证奖励，替代偏好模型。是 [DeepSeek](/kb/ai-公司与产品/deepseek/) R1 / OpenAI o-series 推理能力的关键。
- **Process Reward Model (PRM)**：奖励不只看最终答案，看中间推理步骤。
- **Online DPO / IPO / KTO**：DPO 家族的迭代变体，分别解决"模型崩溃"、"reward over-optimization"等问题
- **Iterative SFT + DPO**：SFT → DPO → 用对齐后的模型采样新数据 → 再 SFT/DPO，多轮迭代

## 对齐的本质（理论视角）

**对齐不是教模型"什么是对的"**，而是在塑造模型输出的**概率分布形状**：
- 压低有害 / 低质 / 不符合人类偏好的输出概率
- 抬高有用 / 安全 / 符合人类偏好的输出概率

这个"塑形"过程的代价被称为 **Alignment Tax**：对齐后模型在某些"开放性任务"上能力可能下降（如创意写作、知识 recall），这是已知现象。

## 已知失败模式

1. **Reward Hacking**：模型学会让 Reward Model 给高分的"奇技淫巧"（重复用户夸赞它的词、用 markdown 包装答案、堆砌看似可靠的引用）
2. **Sycophancy（谄媚）**：标注员倾向于给"附和我"的回答打高分，导致模型对错误问题也附和
3. **Mode Collapse**：DPO 训练过头，模型输出过度单调，多样性下降
4. **Distribution Shift**：偏好数据分布与实际用户分布偏离，效果不迁移
5. **多目标冲突**：有用 / 真实 / 安全 三个目标内在冲突（最有用的答案可能不安全）

## 对 AI PM 的设计 Checklist

1. **对齐预算**：你的产品对"被监管的有害输出"风险有多敏感？决定要不要做额外对齐
2. **偏好数据来源**：用户反馈（👍/👎）能不能直接训？要不要先做数据清洗与过滤？
3. **A/B 测试基线**：对齐后模型 vs SFT 模型，业务指标真的更好吗？还是只是评估集 win rate 高？
4. **可观测：监控 Sycophancy**：定期红蓝队测试"模型会不会附和错误前提"
5. **对齐 vs 个性化的张力**：通用对齐让模型"温和"，但部分用户群体喜欢"直率"，需不需要 prompt 层让步？
6. **避免 Reward Hacking 的产品方式**：直接用业务 KPI 做训练信号会被 hack；保留"人在回路"的最终判断

## 相关章节与节点

- [c04 偏好对齐（详解）](/kb/基础知识库/c04-模型训练全阶段-pipeline/)
- [c13 对齐税与 Sycophancy](/kb/基础知识库/c13-幻觉的不可消除性/)
- [c15 后训练数据策略](/kb/基础知识库/c15-数据墙与后训练霸权/)
- [Constitutional AI](/kb/基础知识库/constitutional-ai/)（Anthropic 的对齐方法）
- [SFT](/kb/基础知识库/sft/)（对齐的前置步骤）
- [LoRA](/kb/基础知识库/lora/)（参数高效对齐）
- [强化学习](/kb/基础知识库/强化学习/)（理论基础）
- [幻觉](/kb/基础知识库/幻觉/)（对齐能缓解但不能消除）

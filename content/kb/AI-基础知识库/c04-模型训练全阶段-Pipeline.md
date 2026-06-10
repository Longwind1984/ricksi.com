---
title: c04 - 模型训练全阶段 Pipeline
cluster: AI 基础知识库
created: '2026-05-13'
updated: '2026-05-16'
---

# 4. 模型训练全阶段 Pipeline

LLM 的训练是一条多阶段、多目标的 pipeline：[预训练](/kb/ai-基础知识库/预训练/) → [监督微调](/kb/ai-基础知识库/sft/) → [偏好对齐](/kb/ai-基础知识库/rlhf/)

## 4.1 预训练 (Pre-training) 与 Scaling Laws

[预训练](/kb/ai-基础知识库/预训练/) 在海量文本上做 next-token prediction，消耗总训练算力 90%+。

**Scaling Laws**：Kaplan et al. (2020) 和 Hoffmann et al. (2022, "Chinchilla")：

L(N, D) ≈ (N_c/N)^α_N + (D_c/D)^α_D + L_∞

Chinchilla 定律：参数量和训练数据应按 1:20 比例扩展。

## 4.2 监督微调 (SFT) 与参数高效微调 (PEFT)

[SFT](/kb/ai-基础知识库/sft/) 不是在注入新知识，而是在激活和重组 [预训练](/kb/ai-基础知识库/预训练/) 阶段学到的知识。1000 条高质量 SFT 样本可能优于 10 万条平庸样本。

**PEFT 光谱**：全量微调 → LoRA → QLoRA → Prefix Tuning → Adapter

**关键决策**：领域知识获取优先 [RAG](/kb/ai-基础知识库/rag/)（避免 [灾难性遗忘](/kb/ai-基础知识库/灾难性遗忘/)）；行为模式改变用 [LoRA](/kb/ai-基础知识库/lora/)/[SFT](/kb/ai-基础知识库/sft/)；深度能力改变用全量微调。

## 4.3 偏好对齐：RLHF、DPO 与 Constitutional AI

[RL](/kb/ai-基础知识库/强化学习/)HF 完整 pipeline：收集偏好数据 → 训练 Reward Model → PPO 优化。

DPO 绕过显式 Reward Model，直接从偏好对优化，已成为主流。

Constitutional AI 让模型根据"宪法原则"自我评判修正。

相关概念卡：[Scaling Laws](/kb/ai-基础知识库/scaling-laws/)、[PEFT / LoRA](/kb/ai-基础知识库/lora/)、[RLHF / DPO](/kb/ai-基础知识库/rlhf/)
模块二延伸：[m202 §2.2.3 模式 B](/kb/ai-工程化与落地架构/m202-工程选型决策矩阵/) — RAG + LoRA 的互补组合模式 | [m210 数据工程流](/kb/ai-工程化与落地架构/m210-数据工程流实操/) — 合成数据 Pipeline 与标注工程实操
上一章：[c03 Transformer](/kb/ai-基础知识库/c03-transformer-核心机制与注意力变体/)
下一章：[c05 KV Cache](/kb/ai-基础知识库/c05-算力物理定律与-kv-cache/)

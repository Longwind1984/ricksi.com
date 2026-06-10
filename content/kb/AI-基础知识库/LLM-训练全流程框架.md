---
title: LLM 训练全流程框架
cluster: AI 基础知识库
created: '2026-05-16'
updated: '2026-05-18'
---
# LLM 训练全流程框架

一句话定义：当代 LLM 训练自顶向下分为四阶段——数据准备、预训练（next-token prediction + scaling laws）、后训练（SFT + 偏好对齐 RLHF/DPO）、评估与推理优化——每一阶段都伴随相应的失败模式与产品权衡。

核心要点：
- 数据准备：原始抓取（CommonCrawl）→ 清洗去重（MinHash/SemDedup）→ 质量过滤（启发式 + 分类器）→ tokenization（BPE/SentencePiece，词表 32K–256K）。数据墙问题：高质量英文文本接近抓取上限，后续靠合成数据与多模态扩量。
- 预训练：next-token prediction、cross-entropy loss；scaling laws（Kaplan 2020、Chinchilla 2022）给 compute/params/tokens 三者最优配比（Chinchilla ratio ~20 tokens/param）；长上下文靠 RoPE 改造 + 继续训练。
- SFT：高质量指令-响应配对，把"补全文本"模型变成"回答指令"模型；规模 1K–1M，质量远比量重要。
- 偏好对齐：RLHF = SFT + Reward Model + PPO；DPO 压缩为直接偏好优化无需独立 RM；Constitutional AI 用 AI 反馈替代人类反馈。目标维度通常是 HHH。
- 评估：MMLU、GSM8K、HumanEval、MT-Bench 受 Goodhart 陷阱影响——优化指标即破坏指标；红队、Arena 人类偏好是补充。
- 推理优化：KV Cache、量化（INT8/FP8/INT4）、speculative decoding、continuous batching、MoE 稀疏激活——决定边际成本与定价空间。
- 失败模式：预训练 = 数据/算力错配；SFT = 灾难性遗忘；RLHF = reward hacking / 谄媚；推理 = 幻觉与上下文遗失。

## 关联节点
- [预训练](/kb/ai-基础知识库/预训练/) [SFT](/kb/ai-基础知识库/sft/) [RLHF](/kb/ai-基础知识库/rlhf/) [Tokenization](/kb/ai-基础知识库/tokenization/) [Scaling Laws](/kb/ai-基础知识库/scaling-laws/) [KV Cache](/kb/ai-基础知识库/kv-cache/)
- [c04 - 模型训练全阶段 Pipeline](/kb/ai-基础知识库/c04-模型训练全阶段-pipeline/) [幻觉](/kb/ai-基础知识库/幻觉/) [灾难性遗忘](/kb/ai-基础知识库/灾难性遗忘/)

## 衍生对话存档
- 来源对话

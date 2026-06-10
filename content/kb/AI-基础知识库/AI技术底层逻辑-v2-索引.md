---
title: AI技术底层逻辑 v2 - 索引
cluster: AI 基础知识库
created: '2026-05-13'
updated: '2026-05-18'
---
# AI 技术底层逻辑 v2 — 索引

> 本文档的源内容来自 Google Doc《AI 技术底层逻辑与模型范式解析（v2）》，by [Claude Opus](/kb/AI-公司与产品/Claude-Opus/) 4.6。为便于在 Obsidian 中建立知识关联，已按章节拆分为独立页面，并为跨章关键概念建立了独立概念卡。

---

## 章节地图

| # | 章节 | 核心关联 |
|---|------|---------|
| [01](/kb/AI-基础知识库/c01-认知重构：从确定性系统到概率系统/) | 认知重构：从确定性系统到概率系统 | → [幻觉](/kb/AI-基础知识库/幻觉/)、[SFT](/kb/AI-基础知识库/SFT/)、[Embedding](/kb/AI-基础知识库/Embedding/) |
| [02](/kb/AI-基础知识库/c02-Tokenization-与词表工程/) | Tokenization 与词表工程 | → [Tokenization](/kb/AI-基础知识库/Tokenization/) |
| [03](/kb/AI-基础知识库/c03-Transformer-核心机制与注意力变体/) | Transformer 核心机制与注意力变体 | → [Attention](/kb/AI-基础知识库/Attention/)、[KV Cache](/kb/AI-基础知识库/KV-Cache/)、[Softmax](/kb/AI-基础知识库/Softmax/) |
| [04](/kb/AI-基础知识库/c04-模型训练全阶段-Pipeline/) | 模型训练全阶段 Pipeline | → [预训练](/kb/AI-基础知识库/预训练/)、[SFT](/kb/AI-基础知识库/SFT/)、[Scaling Laws](/kb/AI-基础知识库/Scaling-Laws/)、[对齐](/kb/AI-基础知识库/RLHF/)、[RAG](/kb/AI-基础知识库/RAG/) |
| [05](/kb/AI-基础知识库/c05-算力物理定律与-KV-Cache/) | 算力物理定律与 KV Cache | → [KV Cache](/kb/AI-基础知识库/KV-Cache/)、[自回归](/kb/AI-基础知识库/自回归生成/)、[GQA 联动](/kb/AI-基础知识库/Attention/) |
| [06](/kb/AI-基础知识库/c06-架构演进：Dense-MoE-SSM-Hybrid/) | 架构演进：后 Transformer 时代的抉择 | → [MoE](/kb/AI-基础知识库/MoE/)、[SSM vs Attention](/kb/AI-基础知识库/Attention/) |
| [07](/kb/AI-基础知识库/c07-量化-Quantization-与端侧部署/) | 量化与端侧部署 | → [量化](/kb/AI-基础知识库/量化/)、[QLoRA](/kb/AI-基础知识库/LoRA/)、[KV Cache 量化](/kb/AI-基础知识库/KV-Cache/) |
| [08](/kb/AI-基础知识库/c08-解码策略与生成控制/) | 解码策略与生成控制 | → [Temperature](/kb/AI-基础知识库/Softmax/)、[Function Calling](/kb/AI-基础知识库/Function-Calling/)、[Agent](/kb/AI-基础知识库/Agent/) |
| [09](/kb/AI-基础知识库/c09-RAG-架构/) | RAG 架构的工程解构与非参数化记忆 | → [RAG](/kb/AI-基础知识库/RAG/)、[Embedding 检索](/kb/AI-基础知识库/Embedding/)、[LLM 基础](/kb/AI-基础知识库/预训练/) |
| [10](/kb/AI-基础知识库/c10-Agent-技术栈与工具调用/) | Agent 技术栈与工具调用 | → [Agent](/kb/AI-基础知识库/Agent/)、[Function Calling](/kb/AI-基础知识库/Function-Calling/) |
| [11](/kb/AI-基础知识库/c11-System-2-思维与-Test-Time-Compute/) | System 2 思维、强化学习与产品范式重构 | → [Test-Time Compute](/kb/AI-基础知识库/Test-Time-Compute/)、[算力转移](/kb/AI-基础知识库/预训练/)、[RL](/kb/AI-基础知识库/强化学习/) |
| [12](/kb/AI-基础知识库/c12-多模态融合与具身智能/) | 多模态融合与具身智能 | → [自回归](/kb/AI-基础知识库/自回归生成/)、[CLIP](/kb/AI-基础知识库/Embedding/)、[视觉 Tokenization](/kb/AI-基础知识库/Tokenization/) |
| [13](/kb/AI-基础知识库/c13-幻觉的不可消除性/) | 彻底祛魅：为什么"幻觉"无法被彻底消除？ | → [幻觉](/kb/AI-基础知识库/幻觉/)、[Softmax 本质](/kb/AI-基础知识库/Softmax/)、[对齐税](/kb/AI-基础知识库/RLHF/) |
| [14](/kb/AI-基础知识库/c14-模型评估体系与-Goodhart-陷阱/) | 模型评估体系的重构与 Goodhart 陷阱 | → [校准](/kb/AI-基础知识库/幻觉/)、[SFT 过拟合](/kb/AI-基础知识库/SFT/)、[Benchmark 通胀](/kb/AI-基础知识库/Scaling-Laws/) |
| [15](/kb/AI-基础知识库/c15-数据墙与后训练霸权/) | 数据墙与后训练霸权 | → [Scaling Laws](/kb/AI-基础知识库/Scaling-Laws/)、[预训练](/kb/AI-基础知识库/预训练/)、[合成数据](/kb/AI-基础知识库/合成数据/) |

---

## 核心概念卡

| 概念 | 涉及章节 | 一句话定位 |
|------|---------|-----------|
| [Attention 机制](/kb/AI-基础知识库/Attention/) | c03, c05, c06, c12 | Transformer 的"我在找什么/我能提供什么"机制 |
| [Tokenization](/kb/AI-基础知识库/Tokenization/) | c02, c03, c09, c12 | 模型"看到"世界的底层分词方式 |
| [KV Cache](/kb/AI-基础知识库/KV-Cache/) | c03, c05, c07 | 决定并发上限的显存物理约束 |
| [Scaling Laws](/kb/AI-基础知识库/Scaling-Laws/) | c04, c14, c15 | 模型性能与参数量/数据量的幂律关系 |
| [PEFT / LoRA 微调](/kb/AI-基础知识库/LoRA/) | c04, c07 | 低成本微调的主流工程方案 |
| [RLHF / DPO 对齐](/kb/AI-基础知识库/RLHF/) | c04, c13, c15 | 将模型行为与人类偏好对齐的方法 |
| [量化 Quantization](/kb/AI-基础知识库/量化/) | c04, c05, c07 | 精度压缩换取推理速度和端侧可行 |
| [RAG 检索增强生成](/kb/AI-基础知识库/RAG/) | c04, c09, c13 | 外挂"硬盘"给 LLM 的非参数化记忆 |
| [Agent 与工具调用](/kb/AI-基础知识库/Agent/) | c08, c10, c11 | LLM 外围的规划-执行-反馈循环 |
| [System 2 / Test-Time Compute](/kb/AI-基础知识库/Test-Time-Compute/) | c11 | 将算力从预训练转移到推理阶段 |
| [幻觉与校准](/kb/AI-基础知识库/幻觉/) | c01, c13, c14 | 生成式模型的核心架构特性，非 Bug |
| [预训练 Pre-training](/kb/AI-基础知识库/预训练/) | c04, c11, c15 | 消耗 90%+ 算力的基座模型学习阶段 |
| [SFT 监督微调](/kb/AI-基础知识库/SFT/) | c01, c04, c09, c14 | 教会基座模型"听懂人话、格式化输出" |
| [Softmax](/kb/AI-基础知识库/Softmax/) | c03, c08, c13 | 将 logits 转为概率分布的核心数学函数 |
| [自回归生成](/kb/AI-基础知识库/自回归生成/) | c05, c12 | 逐个 token 预测的文本生成范式 |
| [Embedding 向量嵌入](/kb/AI-基础知识库/Embedding/) | c01, c09, c12 | 将非结构化数据映射为高维向量 |
| [强化学习 RL](/kb/AI-基础知识库/强化学习/) | c04, c11, c15 | 在 LLM 中三次出现的关键训练方法 |
| [合成数据 Synthetic Data](/kb/AI-基础知识库/合成数据/) | c04, c15 | 突破数据墙的核心手段，需防 model collapse |
| [灾难性遗忘](/kb/AI-基础知识库/灾难性遗忘/) | c04, c09 | 微调时丢失旧知识，RAG 不引发遗忘 |
| [Function Calling](/kb/AI-基础知识库/Function-Calling/) | c08, c10 | LLM 输出结构化函数调用的能力 |
| [MoE 混合专家模型](/kb/AI-基础知识库/MoE/) | c06 | 每次推理只激活部分专家的稀疏架构 |

---

## 全文联动图

```
c01（认知重构）
  ↓ 底层机制
c02（Tokenization）←→ c03（Attention 机制）
  ↓                          ↓
c04（训练 Pipeline）←→ c05（KV Cache — GQA 联动）
  │   ├─ Scaling Laws → c15（数据墙）
  │   ├─ PEFT/LoRA  → c07（量化）
  │   └─ RLHF/DPO   → c13（幻觉与对齐税）
  ↓
c06（架构演进 Dense/MoE/SSM）←→ c07（量化 → 端侧部署）
  ↓
c08（解码策略）→ c10（Agent Function Calling）
  ↓                ↓
c09（RAG）      c11（System 2 + Agent = Reasoning Agent）
  ↓
c12（多模态 + 具身智能）
  ↓
c13（幻觉不可消除）←→ c14（评估体系）←→ c15（数据墙）
```

---

> 版本：v2 · 源文档：[c01](/kb/AI-基础知识库/c01-认知重构：从确定性系统到概率系统/) → [c15](/kb/AI-基础知识库/c15-数据墙与后训练霸权/)
> 同步自 Google Doc《AI 技术底层逻辑与模型范式解析（v2）》by [Claude](/kb/AI-公司与产品/Claude/) Opus 4.6

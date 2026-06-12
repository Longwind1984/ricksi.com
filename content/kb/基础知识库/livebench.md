---
title: LiveBench
cluster: 基础知识库
created: '2026-06-12'
updated: '2026-06-12'
provenance: co
---

# LiveBench

**LiveBench 是一个"抗数据污染、题目定期更新"的开放 LLM 评测基准：它每月用新近来源生成全新题目、且所有题目都有客观可自动判分的标准答案，以此规避模型把测试集背进训练数据所导致的虚高。**

## 核心要点

- **谁做的、何时发布**：由 Abacus.AI（含其 Head of Research Colin White 等）、纽约大学、Nvidia、马里兰大学、南加州大学的研究者联合构建，**Yann LeCun 是合作者之一**。奠基论文《LiveBench: A Challenging, Contamination-Limited LLM Benchmark》于 **2024-06-27** 提交至 arXiv（2406.19314）。([VentureBeat](https://venturebeat.com/ai/livebench-open-ai-model-benchmark-contamination-free-test-data)、[arXiv](https://arxiv.org/abs/2406.19314))

- **怎么抗污染（第一条护城河）**：**题目定期（按月）轮换更新**，素材取自"发布时间晚于模型训练截止"的新鲜来源——新近 arXiv 论文、最新的数学奥赛题、当期新闻事件等。模型没机会在训练阶段见过这些题，从根上压制"背题"。([Medium / NYU CDS](https://nyudatascience.medium.com/livebench-challenging-language-models-with-contamination-free-questions-999b52967ec8))

- **怎么客观判分（第二条护城河）**：每道题都有**可验证的、唯一的标准答案**，因此即使是难题也能**自动、客观地判分，完全不依赖 LLM-as-Judge**——绕开了"裁判模型自身偏置"这一污染源。([arXiv PDF](https://arxiv.org/pdf/2406.19314))

- **覆盖的任务类别**：跨多个领域设题，公开材料中提及的类别包括 **数学、编码（coding）、推理（reasoning）、语言、指令遵循（instruction following）、数据分析** 等。([VentureBeat](https://venturebeat.com/ai/livebench-open-ai-model-benchmark-contamination-free-test-data)、[GitHub](https://github.com/livebench/livebench))

> 注：论文标题原文用的是 "Contamination-**Limited**"（污染受限），媒体多简称 "contamination-free"；严格说它是"持续压制污染"而非"一劳永逸消除"。

## 在本库的用法

被 [0412 评测系统化专题](/kb/专题-评测与度量/_评测系统化专题-总览/) 的 **S02（[S02 评测方法流派对照矩阵](/kb/专题-评测与度量/s02-评测方法流派对照矩阵/)）** 引用，作为六维取舍矩阵里 **"抗数据污染"格的正面范例**——即"用动态/定期更新的题库 + 客观自动判分"这条流派如何同时回应 [基准污染](/kb/专题-评测与度量/a03-benchmark-与数据污染/) 与 [Goodhart 定律](/kb/专题-评测与度量/a06-goodhart-与指标失效/) 两类失效。（S02 的 R1 工作日志原本因 evidence brief 未给 LiveBench 具体数据而暂缓建链，本卡补上这一节点。）

## 关联节点

- [Goodhart 定律](/kb/专题-评测与度量/a06-goodhart-与指标失效/) —— 固定基准被优化到失效的机制；LiveBench 的"定期换题"正是对 Goodhart 的工程化反制。
- [A03 Benchmark 与数据污染](/kb/专题-评测与度量/a03-benchmark-与数据污染/) —— 数据污染问题的概念辨析，LiveBench 是其对策的代表实现。
- [S02 评测方法流派对照矩阵](/kb/专题-评测与度量/s02-评测方法流派对照矩阵/) —— 本卡的主引用方，抗污染流派所在格。
- [评测系统化专题·总览](/kb/专题-评测与度量/_评测系统化专题-总览/) —— 0412 专题导航中枢。

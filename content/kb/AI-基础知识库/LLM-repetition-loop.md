---
title: LLM repetition loop
cluster: AI 基础知识库
created: '2026-05-16'
updated: '2026-05-18'
---
# LLM repetition loop

一句话定义：自回归语言模型在生成时陷入字符或短语循环（如 "iteiteiteite..."）的退化现象，根因是采样概率分布对当前 prefix 形成自我强化的不动点。

核心要点：
- 机制：自回归生成下，模型基于 prefix 估算下一 token；当某段后缀使下一 token 分布高度集中于自身（或紧邻 token）时，循环成为吸引子。低温/贪心解码下尤其易触发。
- 边界条件不是"语义合理性"——而是分布形状。这是为什么明显违反人类语义的 "iteiteite" 也会被选中：它在该 prefix 上 token 概率高度集中。
- 缓解方法：temperature > 0.5、top-p（nucleus sampling）、frequency/presence penalty、no-repeat-ngram、Contrastive Decoding（Li et al. 2022）、DoLa（2023）。
- 与 hallucination 的区别：hallucination 是分布够散但内容错误；repetition loop 是分布过窄、退化为字符级循环。
- 误举例陷阱：若 AI 解释该 bug 时给出的"合理续写示例"也属于无意义重复（如 "and ite portland cement"），说明模型未真正区分"语义合理"与"高概率续写"，是元层面的同一问题。
- 与训练阶段关联：训练语料中大量含截断 / 模板化重复时（如表格、列表），模型对"重复"分布做了部分先验拟合，推理阶段被激发。

## 关联节点
- [自回归生成](/kb/AI-基础知识库/自回归生成/)
- [c03 - Transformer 核心机制与注意力变体](/kb/AI-基础知识库/c03-Transformer-核心机制与注意力变体/)

## 衍生对话存档
- 来源对话

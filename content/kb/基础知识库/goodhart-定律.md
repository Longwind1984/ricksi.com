---
title: Goodhart 定律
cluster: 基础知识库
created: '2026-06-12'
updated: '2026-06-12'
provenance: co
---

# Goodhart 定律

> **一句话定义**：当一个指标成为优化目标，它就不再是一个好指标——因为压力会让人/系统去优化指标本身，而非指标原本想衡量的东西。

## 核心要点

- **Goodhart 原始表述（1975）**：英国经济学家 Charles Goodhart 在货币政策论文中写道——"任何被观测到的统计规律，一旦因调控目的而被施加压力，就趋于崩塌"（Any observed statistical regularity will tend to collapse once pressure is placed upon it for control purposes）。原意针对货币供应量调控。

- **Strathern 通俗化版本（1997）**：人类学家 Marilyn Strathern 提炼出今天最广为流传的口语版——"当一个指标成为目标，它就不再是好指标"（When a measure becomes a target, it ceases to be a good measure）。这句"名言"严格说是 Strathern 的措辞，而非 Goodhart 原文。

- **与坎贝尔定律（Campbell's Law）的关系**：社会心理学家 Donald Campbell 1979 年独立提出近义命题——"一个定量社会指标越是被用于社会决策，它就越容易受腐蚀压力，也越容易扭曲它本应监测的社会过程"。两者常并称；近来 AI 对齐文献进一步区分二者：**Goodhart 区**指优化代理指标导致真实目标偏移（改进评测系统可缓解），**Campbell 区**指智能体主动降低评测系统的有效辨别力（评测越改越被反超，更危险）。

- **在 AI 里的体现**：是 reward hacking / 刷榜 / 指标失效的统一解释框架。RLHF 中表现为 reward model 过优化——真实质量随优化代理奖励先升后降（gold reward 见顶回落，OpenAI *Scaling Laws for Reward Model Overoptimization*, 2022）；评测层表现为模型/团队针对 benchmark 刷分，榜单分数与真实能力脱钩。

## 在本库的用法

本卡是**判断主轴**而非孤立词条。`0412 评测系统化专题` 用它解释"为什么单一指标必然失效、为什么需要多指标 + 持续换题"（见 `A06 Goodhart 与指标失效`）；`0427 信息检索专题` 用它警惕检索/排序指标被过优化；`0419 对齐哲学专题` 用它界定 reward hacking 的边界（见 `A03 Reward Hacking 与 Goodhart`）。凡涉及"用一个数衡量、再拿这个数当目标"的场景，先过一遍本定律。

## 关联节点

- [c14 - 模型评估体系与 Goodhart 陷阱](/kb/基础知识库/c14-模型评估体系与-goodhart-陷阱/) —— **评测语境的深入**：评估体系如何被 Goodhart 陷阱侵蚀、以及缓解手段，本卡不重复
- [A03 Reward Hacking 与 Goodhart](/kb/专题-安全对齐与失败/a03-reward-hacking-与-goodhart/) —— reward hacking 与本定律的概念辨析（专题节点）
- [RLHF](/kb/基础知识库/rlhf/) —— reward model 过优化是本定律在后训练中的直接实例

---

## 出处

- [Goodhart's law — Wikipedia](https://en.wikipedia.org/wiki/Goodhart%27s_law)（1975 原始表述、Strathern 1997 通俗化）
- [Campbell's law — Wikipedia](https://en.wikipedia.org/wiki/Campbell's_law)（Campbell 1979 原文）
- [Goodhart's Law in Reinforcement Learning (ICLR 2024)](https://arxiv.org/html/2310.09144v1)（Goodhart 与 reward gaming 的形式化关系）
- [Scaling Laws for Reward Model Overoptimization (OpenAI, 2022)](https://arxiv.org/pdf/2210.10760)（代理奖励过优化的实证曲线）

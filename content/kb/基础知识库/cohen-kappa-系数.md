---
title: Cohen Kappa 系数
cluster: 基础知识库
created: '2026-05-16'
updated: '2026-05-16'
provenance: co
---

# Cohen Kappa 系数

## 一句话定义

Kappa 是把 Accuracy 减去随机基线、再归一化到 [-1, 1] 区间的版本——本质上是**机会校正后的准确率**，用来衡量两个评分者（或模型与真值）之间的一致性，扣除靠运气能拿到的部分。

## 公式

$$\kappa = \frac{p_o - p_e}{1 - p_e}$$

- $p_o$（observed agreement）= 混淆矩阵对角线之和 / 总数 = 就是 **Accuracy**
- $p_e$（expected agreement）= 两个分类器按各自边际分布独立猜测时的期望一致率

可改写为：

$$\kappa = \frac{\text{Accuracy} - \text{随机基线 Accuracy}}{1 - \text{随机基线 Accuracy}}$$

## 核心要点

- **本质类比**：Kappa 最直接对应混淆矩阵中的 Accuracy，但是经过"随机基线"校正后的版本。
- **取值范围**：κ = 1 完美一致；κ = 0 等同随机猜测；κ < 0 比随机还差（罕见但可能）。
- **解决什么问题**：Accuracy 在类别不平衡时会虚高（95% 阴性场景下，全部预测阴性能拿 95%，但 Kappa ≈ 0），Kappa 把"白送的部分"扣掉。
- **与 MCC 的关系**：在二分类下，Kappa 与 Matthews 相关系数数值高度接近；Kappa 来自评分者一致性传统，MCC 来自相关系数传统（Pearson 的 φ 变体），几何意义略有不同。
- **与 F1 的差异**：F1 只看正类的 precision/recall 调和均值，对类不平衡只是部分鲁棒；Kappa/MCC 综合两类表现，更可信。
- **一句话记忆**：扣掉白捡的部分之后，模型还剩多少真本事。

## 类不平衡鲁棒性排序

| 指标 | 本质 | 类不平衡敏感性 |
|---|---|---|
| Accuracy | $p_o$ | 高（虚高） |
| **Kappa** | **chance-corrected Accuracy** | **低** |
| MCC | 类相关系数版 Kappa | 低 |
| F1 | precision/recall 调和均值 | 中（只看正类） |

## 工程实践

类不平衡的分类任务，如果只想看一个综合数字，**Kappa 或 MCC 都比 Accuracy 更可信**。这也是为什么医学诊断、内容审核、标注一致性评估等场景默认报 Kappa 而非 Accuracy——这些场景的基础分布天然倾斜，单看准确率会被多数类淹没。

## 关联

- 上游基础：*混淆矩阵*、*准确率（Accuracy）*——见 [c14 - 模型评估体系与 Goodhart 陷阱](/kb/基础知识库/c14-模型评估体系与-goodhart-陷阱/) 中的评估指标讨论
- 近亲指标：*MCC*（Matthews 相关系数）、*F1 Score*
- 评估方法学：[c14 - 模型评估体系与 Goodhart 陷阱](/kb/基础知识库/c14-模型评估体系与-goodhart-陷阱/)——单一指标必然被博弈，多指标交叉验证才是工程实践


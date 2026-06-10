---
title: Softmax
cluster: AI 基础知识库
created: '2026-06-07'
updated: '2026-06-07'
---

# Softmax

## 一句话定义

**Softmax 是把一组实数（logits）变成和为 1 的概率分布的函数**——它是 LLM 输出层、[Attention](/kb/AI-基础知识库/Attention/) 权重、[MoE](/kb/AI-基础知识库/MoE/) Router 三处共用的核心数学组件，几乎所有"哪个候选项更可能"的选择都通过它。

## 数学定义

P(i) = exp(x_i) / Σⱼ exp(x_j)

性质：
- 输出和为 1，每项 ∈ (0, 1)
- 平移不变性：`softmax(x + c) = softmax(x)`（用于数值稳定化）
- 单调性：x_i 越大 → P(i) 越大
- 指数放大：x 的差距经 exp 放大，**小差距变成大概率差距**——这是它"挑赢家"的根源

## 数值稳定化（工程必做）

朴素实现的灾难：x_i = 1000 时 exp(1000) 直接溢出。

**减最大值技巧**：

```
m = max(x)
P(i) = exp(x_i - m) / Σⱼ exp(x_j - m)
```

由平移不变性，结果不变，但所有指数变为 ≤ 0，最大为 1，永不溢出。这是 PyTorch / NumPy 内置实现的标准做法。

**log-sum-exp**：训练时配套使用 `log P(i) = (x_i - m) - log Σⱼ exp(x_j - m)`，避免概率项过小导致下游 log 取无穷。

## 在 LLM 中的三个关键位置

### 1. Attention 权重

`softmax(QK^T / √d_k)` 把"Q 与每个 K 的相似度"转成"我应该多关注哪些 token"的权重。

**为什么除以 √d_k**：避免大 d_k 下点积值过大、softmax 饱和（接近 one-hot）、梯度消失。

### 2. 输出层（Token 采样）

模型最后一层产出 vocab 大小的 logits → softmax 转概率 → 按策略采样下一个 token。

### 3. [MoE](/kb/AI-基础知识库/MoE/) Router

每个 token 经 router 网络得到 N_expert 个 logits → softmax → 选 Top-K experts。

DeepSeek-V3 等先进 MoE 不直接用 softmax 路由（路由稳定性差），改用 sigmoid + auxiliary-loss-free balance，但 softmax 仍是经典 baseline。

## Temperature 与采样策略族

**Temperature T**：在 softmax 前给 logits 除以 T

P(i) = exp(x_i / T) / Σⱼ exp(x_j / T)

| T 区间 | 分布形态 | 行为 | 典型用途 |
|--------|---------|------|---------|
| T → 0 | 退化为 one-hot | 贪心解码 | 数学 / 代码（确定性） |
| T = 0.3-0.5 | 偏尖锐 | 保守 | 客服 / 总结 |
| T = 0.7-1.0 | 标准 | 平衡 | 通用对话 |
| T > 1.0 | 平坦 | 多样 | 创意写作 / 头脑风暴 |
| T → ∞ | 趋近均匀 | 无意义随机 | （理论极限） |

**搭配的截断采样**：

- **Top-K**：只保留概率前 K 个 token 重新归一化（典型 K=40-50）
- **Top-P / Nucleus**：累积概率达 P 的最小集合（典型 P=0.9-0.95），动态调整候选规模
- **Min-P**：保留概率 ≥ P_max × p 的 token（自适应过滤）
- **Mirostat**：动态调温目标 perplexity 守恒

实际生产线常用组合：`temperature=0.7, top_p=0.95, top_k=50`。

## 与幻觉的关系

**面对边缘知识时，模型必定通过相邻概念的概率插值强行输出。**

机制：训练数据没覆盖的领域 → logits 在多个候选间分布平摊 → softmax 仍会输出一个"看起来确定"的最大值 → 模型说出未验证内容。

这就是 [幻觉](/kb/AI-基础知识库/幻觉/) 的数学根源之一：**softmax 没有"我不知道"这一项**。它强制把概率全部分配给 vocab 内 token，没有 abstain 选项。

**研究方向**：
- 设置 logit 阈值，低于阈值时拒答（Selective Prediction）
- 用 calibration 校准 softmax，让低置信度可识别
- Conformal Prediction：返回可能集合而非单点
- Constitutional AI / RLHF 训练"我不知道"动作

## Softmax Bottleneck（Yang et al. 2018）

**理论上的限制**：标准 softmax 的输出概率分布秩 ≤ hidden_dim。对于需要表达多模态分布的任务（如同一上下文有多种合理续写），这构成"瓶颈"。

**缓解方案**：
- **Mixture of Softmaxes（MoS）**：用多个 softmax 头加权混合，提升秩
- **Sparse Softmax / Entmax**：允许部分概率严格为 0，让分布更结构化
- **MoE 输出层**：不同 expert 提供不同分布

实际 LLM 训练中 hidden_dim 很大（4K-16K），Softmax Bottleneck 影响相对小，但在小模型 / 低秩 LoRA 场景仍要警惕。

## Sparse Softmax 家族

| 变体 | 特征 | 用途 |
|------|------|------|
| **Softmax** | 严格正概率，分母含全 vocab | 默认 |
| **Sparsemax** | 部分项为严格 0 | 注意力可解释性 |
| **α-Entmax** | α 控制稀疏度 | 注意力 / 路由 |
| **Gumbel-Softmax** | 加 Gumbel 噪声后取 argmax 的可微近似 | 离散变量 RL / VAE |
| **Top-K Softmax** | 只在 Top-K 上归一化 | MoE 路由 |

[MoE](/kb/AI-基础知识库/MoE/) 路由是 Top-K Softmax 最大规模的工程实践——每个 token 只激活 1-8 个 expert，背后是稀疏路由 + 负载均衡的精妙工程。

## 一个反直觉发现：Softmax 不是"概率"

虽然 softmax 输出"和为 1"看起来像概率，但这只是 frequentist 角度的归一化，**不是 Bayesian 意义上的后验概率**——它没有不确定性量化，模型对正确答案和错误答案都可能输出 0.99 置信度。

**含义**：
- 看到模型输出 P=0.95 不等于"95% 正确"
- 校准（calibration）研究就是修这个错位——温度缩放 / Platt scaling / Isotonic regression
- LLM 默认是 **overconfident** 的，这是产品里"模型胡说八道还很自信"的根源

## 与 Rick PM 视角的连接点

- **解码参数调优**：temperature / top-p / top-k 是产品端最常调的旋钮；理解 softmax 就理解了"为什么 T=0 适合代码，T=1 适合诗"
- **校准问题**：模型置信度不可信，产品里不能直接用"概率"做决策门槛，需要 calibration 或外部验证
- **幻觉的边界**：softmax 没有"我不知道"——产品如果要做拒答，必须在 softmax 外加机制（阈值 / verifier / RAG 兜底）
- **MoE 与路由**：理解 softmax 路由→理解 MoE 负载均衡为什么这么难、为什么 DeepSeek 要发明 loss-free balance

## 相关章节

- [c03 Attention 中的 softmax](/kb/AI-基础知识库/c03-Transformer-核心机制与注意力变体/)
- [c08 Temperature / Top-K / Top-P](/kb/AI-基础知识库/c08-解码策略与生成控制/)
- [c13 幻觉的数学根源](/kb/AI-基础知识库/c13-幻觉的不可消除性/)
- [c14 校准与置信度](/kb/AI-基础知识库/c14-模型评估体系与-Goodhart-陷阱/)

## 关联节点

- 数学组件：[Attention](/kb/AI-基础知识库/Attention/) [Embedding](/kb/AI-基础知识库/Embedding/)
- 解码相关：[幻觉](/kb/AI-基础知识库/幻觉/) [Test-Time Compute](/kb/AI-基础知识库/Test-Time-Compute/)
- 工程实现：[MoE](/kb/AI-基础知识库/MoE/) [自回归生成](/kb/AI-基础知识库/自回归生成/)

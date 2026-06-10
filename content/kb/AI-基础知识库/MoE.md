---
title: MoE
cluster: AI 基础知识库
created: '2026-06-06'
updated: '2026-06-06'
---

# MoE 混合专家模型 (Mixture of Experts)

## 一句话定义

把单一巨型 FFN 拆成多个**专家子网络**，每个 token 经路由器 (Router) 只激活 Top-K 个专家——以"总参数大但激活参数少"换取**容量 vs 推理成本**的解耦。

## 核心结构

```
输入 token →  Router (gating) → 选 Top-K 专家
                              ↓
        Expert 1 / Expert 2 / ... / Expert N
                              ↓
              加权求和（按 router 输出的 softmax 权重）→ 输出
```

- **总参数 (Total)**：所有专家参数之和——决定模型容量上限
- **激活参数 (Active)**：单次前向实际跑的专家参数量——决定推理成本
- **稀疏度** = Active / Total，常见 5%-10%

## "参数量"的欺骗性 — 必须双标注

| 模型 | 总参数 | 激活参数 | 稀疏度 | 备注 |
|------|--------|---------|--------|------|
| Mixtral-8x7B | 47B | 13B | 28% | 早期开源标杆（8 专家 Top-2） |
| Mixtral-8x22B | 141B | 39B | 28% | 同架构放大 |
| DeepSeek-V2 | 236B | 21B | 9% | 细粒度专家（160 expert + 2 shared） |
| DeepSeek-V3 | 671B | 37B | 5.5% | 256 routed + 1 shared，Top-8 |
| Llama-4 Scout | 109B | 17B | 16% | 16 专家 |
| Llama-4 Maverick | 400B | 17B | 4.3% | 128 专家，超稀疏 |
| Qwen3-235B-A22B | 235B | 22B | 9% | 2025-04 |
| Grok-1 (xAI) | 314B | ~78B | 25% | 8 专家 Top-2 |

> 💡 评估模型时永远问两个数：**总参数 / 激活参数**。任何只标"671B 大模型"的描述都在暗示推理成本，但实际成本接近一个 37B Dense 模型。

## Router 机制的演化

### Top-K Gating（主流）
对每个 token，router 输出 N 维分布，选概率最高的 K 个专家。K=1 (Switch Transformer) 最稀疏；K=2 (Mixtral) 是工业默认；K=8 (DeepSeek-V3) 用于细粒度。

### Expert Choice（Google 2022）
反过来：每个专家挑 token，保证负载均匀。容量利用率更高，但单 token 不一定都被处理（需 padding）。

### Shared Expert（DeepSeek 创新）
保留 1-2 个**永远激活的共享专家**承载通用知识，其余 routed 专家学差异化能力。降低专家间冗余、提升细粒度专家化。

### Fine-grained Expert（DeepSeek-V2/V3）
把传统 8 大专家拆成 64/160/256 小专家，每专家更"专精"。配合 Top-K 大（如 Top-8），表达力强。

## 训练的核心难题：负载均衡

理想中专家被均匀使用，实际易出现：

- **路由坍塌 (Router Collapse)**：router 永远只选少数几个专家，其余从未训练
- **负载不均**：部分专家被分配 60% token，部分 < 5%；分布式部署下 GPU 利用率掉到地板

**主流缓解手段**：

| 手段 | 出处 | 机制 |
|------|------|------|
| Auxiliary Load Balance Loss | Switch Transformer (2021) | 加正则项惩罚"使用频率方差大" |
| Expert Choice Routing | Google (2022) | 反向选 token，强制负载均匀 |
| Capacity Factor | 通用 | 每专家容量 = C × (tokens/N)，超出丢弃或溢出 |
| Loss-free Balance | DeepSeek-V3 (2024) | 用 router bias 动态调整，**不引入辅助 loss**——避免梯度冲突 |
| Z-loss | ST-MoE | 抑制 router logits 过大导致数值不稳定 |

DeepSeek-V3 的 **loss-free balance** 是 2024 最重要的工程突破：传统 aux loss 会损害模型能力（梯度 trade-off），新方法通过 bias 调整等效实现均衡而**零能力损失**。

## 分布式部署的核心难题：All-to-All 通信

专家通常分布在不同 GPU 上，路由后需要：

1. **Dispatch**：每个 GPU 把 token 发到目标专家所在 GPU（All-to-All 1）
2. **Compute**：各 GPU 跑本地专家
3. **Combine**：结果汇回原 GPU（All-to-All 2）

这两个 All-to-All 是 MoE 推理延迟的**最大瓶颈**，尤其跨节点 InfiniBand 带宽紧张时。

**工程化优化**：
- **Expert Parallelism (EP)**：专家维度并行，配合 Tensor Parallel
- **DeepEP（DeepSeek 开源）**：高度优化的 All-to-All 内核
- **Overlap Compute & Communication**：跑专家 N 时并行传 token 到专家 N+1
- **MoE Inference Acceleration**（vLLM/SGLang）：动态合并稀疏激活的 batch

## MoE vs Dense 的核心 trade-off

| 维度 | MoE | Dense |
|------|-----|-------|
| 训练算力 (FLOPs) | 同 active 参数的 Dense × 1.2-1.5 | 基线 |
| 训练显存 | 高（全部专家都要存）| 低 |
| 推理算力 | ~active 参数 | 全参数 |
| 推理显存 | 高（全部专家都要驻 GPU） | 低 |
| 通信成本 | 高（All-to-All） | 低 |
| 单 GPU 部署 | 困难（显存挤）| 容易 |
| 多 GPU 集群 | 优势明显 | 平稳 |
| 知识蒸馏目标 | 可（MoE → Dense） | 通常源 |
| 微调难度 | 高（路由可能漂移）| 低 |

> **关键悖论**：MoE 推理 FLOPs 低，但**显存需求最高**——所以"便宜"只在大规模服务化下成立（batch size 大 + 多用户共享），个人本地部署 MoE 反而比 Dense 贵。

## 训练 vs 推理的计算分布

- **训练**：稀疏激活节省 FLOPs 30-50%，是 DeepSeek-V3 能 5.5M H800 GPU 小时训完的关键
- **推理 (prefill)**：稀疏激活节省同等
- **推理 (decode)**：受限于 batch size 小（单用户）或 memory bandwidth → MoE 优势缩小，甚至 Dense 更优

## 2024-2026 演化

- **细粒度专家化** (Fine-grained)：从 8 专家走向 256 专家，单专家更精
- **共享专家** (Shared Expert)：DeepSeek 范式扩散
- **Loss-free Balance**：DeepSeek-V3 范式，新 MoE 训练标配
- **Inference 优化**：DeepEP / vLLM-MoE / SGLang-MoE 把 All-to-All 延迟做到接近 Dense
- **MoE in Reasoning Models**：DeepSeek-R1（基于 V3）证明 MoE 也能跑深推理；Qwen3-MoE 同
- **多模态 MoE**：MoE 用于跨模态路由（不同模态走不同专家），Llama-4 / Gemini 系列

## 与产品 / PM 的连接点

- **总参数 ≠ 性能**：不要被"671B 万亿参数"忽悠；查激活参数 + Benchmark
- **MoE 推理的 cost 曲线非线性**：低并发下不便宜（显存占满空跑）；高并发下成本暴降——MoE 适合**大型服务化部署**，不适合本地侧
- **微调风险**：用户用 MoE 模型做 LoRA 时，路由层若动了，能力可能崩
- **生态成熟度**：MoE 模型在 vLLM/SGLang 上有专用优化，但部分老框架/边缘部署仍是 Dense 友好

## 相关章节与节点

- [c06 架构对比](/kb/AI-基础知识库/c06-架构演进：Dense-MoE-SSM-Hybrid/)
- [Scaling Laws](/kb/AI-基础知识库/Scaling-Laws/) — MoE 的 scaling 行为与 Dense 略不同
- [KV Cache](/kb/AI-基础知识库/KV-Cache/) — MoE 也吃 KV，与稀疏激活无关
- [多模型分层](/kb/AI-基础知识库/多模型分层/) — 把 MoE 当一种"硬件层的专家选路"
- [DeepSeek](/kb/AI-公司与产品/DeepSeek/) — V2/V3 是 MoE 范式重要推动者

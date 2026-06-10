---
title: Scaling Laws
cluster: AI 基础知识库
created: '2026-06-04'
updated: '2026-06-04'
---

# Scaling Laws

## 一句话定义

**Scaling Laws = 模型损失（loss）与算力、参数、数据三者之间存在幂律可预测关系**。它把 LLM 训练从经验工程升级为可外推的科学，是 2020 年代「越大越好」战略的理论基石，也是 2024 年起「越大不再越好」战术回调的诊断依据。

## 核心公式

L(N, D) ≈ (N_c / N)^α_N + (D_c / D)^α_D + L_∞

- **L** — 损失（loss）
- **N** — 参数量
- **D** — 训练 token 数
- **L_∞** — 不可压缩的熵下限（数据本身的随机性 + 任务本质难度）
- **α_N、α_D** — 各自的 scaling exponent，约 0.05–0.10 量级

含义：投入算力（N×D）时，loss 沿幂律下降；但每多投入一倍算力，loss 改善幅度递减。

## 三代 Scaling Laws 演化

| 代 | 论文 | 核心结论 | 工程含义 |
|----|------|---------|---------|
| 1.0 算力主导 | Kaplan 2020 (OpenAI) | 给定算力，应优先加大模型参数；数据需求随参数缓慢增长 | GPT-3 175B 训了 ~300B tokens（事后看严重欠拟合） |
| 2.0 数据-参数平衡 | Hoffmann 2022 (Chinchilla, DeepMind) | 算力固定时，参数和数据应近似 **1:20** 同步扩 | Chinchilla 70B 训 1.4T tokens，比 Gopher 280B 强 |
| 2.5 推理优化超训 | 行业实践 2023+ | 对要长期推理服务的模型，**故意 overtrain**（超 20× tokens/param）摊销推理成本 | Llama-3-70B 训了 15T tokens（≈ 200× ratio），换取更小模型更强能力 |
| 3.0 推理时扩展 | OpenAI o1/o3、DeepSeek-R1 2024+ | 推理时投入更多算力（[Test-Time Compute](/kb/AI-基础知识库/Test-Time-Compute/)）也遵循 scaling law | 算力可在「训练时」和「推理时」两条曲线间动态分配 |

## Chinchilla 比例的工程直觉

| 模型 | 参数 | 训练 tokens | tokens/param 比 | 是否 Chinchilla 最优 |
|------|------|-------------|------------------|----------------------|
| GPT-3 | 175B | 300B | ≈ 1.7× | 严重欠拟合（应训 3.5T） |
| Chinchilla | 70B | 1.4T | 20× | 最优（论文锚点） |
| Llama-2 70B | 70B | 2T | 28× | 略超训 |
| Llama-3 70B | 70B | 15T | ≈ 214× | 极度超训（换推理效率） |
| Llama-3 8B | 8B | 15T | ≈ 1875× | 极致超训（小模型路线） |

**直觉**：训练成本一次性，推理成本千万次。模型越要被高频推理使用，越值得 overtrain 出"小而强"的版本。

## 何时不再适用：边界条件

- **数据墙**：当高质量人类文本接近耗尽，单纯加 D 不再产生预期的 loss 下降（见 [c15 数据墙](/kb/AI-基础知识库/c15-数据墙与后训练霸权/)）
- **能力涌现非平滑**：某些能力（如算术、CoT 推理）呈阶跃式出现，不是连续幂律——这给 PM 的能力预测带来不确定性
- **Goodhart 陷阱**：loss 下降不等于真实能力提升；某些 benchmark 饱和后 loss 仍降但用户感受无变化（见 [c14](/kb/AI-基础知识库/c14-模型评估体系与-Goodhart-陷阱/)）
- **Broken Neural Scaling Laws**（Caballero 2023）：观察到部分任务 loss 曲线在某临界算力处发生折断，幂律不再单一

## 三条算力曲线的分配

```
                       Train-Time Scaling
                      （Kaplan→Chinchilla→Overtrain）
                              ↓
        总算力 = ─────────── Pareto Frontier ─────────
                              ↑
                     Test-Time Scaling
                  （o1/o3/R1：MCTS + PRM 搜索）
```

2024 年起，前沿实验室开始把同等算力投到推理而非训练侧——这是 范式 转移。

## PM 决策启示

1. **评估模型供应商**：训了多少 token 比参数量更能预测质量；问"tokens/param ratio"是关键
2. **选小模型还是大模型**：高频推理场景选过度训练的小模型（Llama-3 8B、Phi-4）；低频复杂任务选大模型
3. **预算分配**：训练算力 ≠ 推理算力；reasoning model 的成本曲线和经典 LLM 完全不同
4. **能力外推风险**：不要直接外推某个能力的进步速度——涌现可能跳跃，也可能停滞
5. **数据投入的边际收益**：低质量数据扩 10× 不如高质量数据扩 1×；后训练阶段尤其

## 关键人物与论文

- **Jared Kaplan** (Anthropic 联创) — Kaplan 2020 论文一作，把 scaling laws 从猜测变定律
- **Jordan Hoffmann** (DeepMind) — Chinchilla 论文一作，纠正了 Kaplan 的参数偏重
- **Richard Sutton** — *The Bitter Lesson* (2019)，论证算力压倒结构创新的 70 年历史规律
- **Yi Tay** — Emergent abilities of LLMs (2022)，论证能力涌现的不连续性

## 相关章节

- [c04 预训练与 Scaling Laws](/kb/AI-基础知识库/c04-模型训练全阶段-Pipeline/)
- [c14 Benchmark 通胀](/kb/AI-基础知识库/c14-模型评估体系与-Goodhart-陷阱/)
- [c15 数据墙](/kb/AI-基础知识库/c15-数据墙与后训练霸权/)
- [c11 算力转移](/kb/AI-基础知识库/c11-System-2-思维与-Test-Time-Compute/)

## 关联概念

[预训练](/kb/AI-基础知识库/预训练/)·[合成数据](/kb/AI-基础知识库/合成数据/)·[Test-Time Compute](/kb/AI-基础知识库/Test-Time-Compute/)·Chinchilla·数据墙·范式

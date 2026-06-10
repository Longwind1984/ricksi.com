---
title: c05 - 算力物理定律与 KV Cache
cluster: AI 基础知识库
created: '2026-05-13'
updated: '2026-05-16'
---

# 5. 算力物理定律与 KV Cache 账本推演

LLM 推理的成本和延迟，不是抽象的"算力问题"，而是两条不同的物理约束在不同阶段切换主导权。理解这一点，是 PM 做成本决策和延迟设计的基础。

## 5.1 两阶段瓶颈的物理本质

**Prefill 阶段**（处理输入 prompt）：并行计算所有 token 的注意力矩阵，计算量正比于 O(N²)。瓶颈在算力（FLOPs），决定 **TTFT（Time To First Token，首字延迟）**。

**Decode 阶段**（逐字生成输出）：[自回归](/kb/ai-基础知识库/自回归生成/)逐 token 生成，每步计算量小但需反复读取整个 KV Cache。瓶颈在显存带宽（Memory Bandwidth），决定 **TPOT（每 token 生成时间）**。

**产品含义**：
- 长 Prompt → 拉高首字延迟，但不影响生成速度
- 输出 token 多 → 拉长总等待时间
- 这是"输入贵在等待，输出贵在数量"的物理根源

追问工程师的关键问题：我们产品的瓶颈是 TTFT 还是 TPOT？用户感知到的慢，是等第一个字慢，还是生成过程慢？

## 5.2 KV Cache：并发上限的硬锁

[KV Cache](/kb/ai-基础知识库/kv-cache/) 为每个对话存储历史注意力的 K 和 V 矩阵，使 Decode 阶段无需重复计算已处理过的 token。代价是持续占用显存。

公式：
```
KV Cache (GB) = 2 × 层数 × KV头数 × 头维度 × 序列长度 × 精度字节数
```

**具体案例**：Llama-3-70B（GQA, FP16, 100K tokens）≈ 32.8 GB —— 相当于单张 A100 的全部显存。

**核心结论**：KV Cache 大小直接决定系统能同时服务多少并发用户。上下文窗口越长，每个用户占用的显存越多，并发上限越低，单用户服务成本越高。**支持 100K 上下文是产品特性，也是成本决策**，两者必须同时评估。

## 5.3 关键优化技术与 PM 认知边界

**PagedAttention / vLLM**：像操作系统管理内存页一样管理 KV Cache，大幅减少碎片浪费，提升 GPU 利用率。当前服务端推理框架标配，PM 了解其作用即可，无需理解实现。

**Prompt Caching（前缀缓存）**：对 System Prompt 或固定前缀的 KV Cache 做跨请求复用。[Anthropic](/kb/ai-公司与产品/anthropic/)、[OpenAI](/kb/ai-公司与产品/openai/)、Google 均已开放此特性。

对 PM 的直接价值：如果 System Prompt 很长（2000 tokens 以上），启用 Prompt Caching 可降低 60–80% 的 Prefill 成本和延迟。**System Prompt 的长度不只是质量设计，也是账单设计**。

**Continuous Batching（连续批处理）**：传统静态批处理让所有请求等待最长的那个完成。Continuous Batching 允许请求动态进出队列，GPU 利用率大幅提升，高并发服务的基础设施标准。这直接影响你的 API 供应商选型。

**Speculative Decoding（投机解码）**：小模型猜测后续 token，大模型批量验证。吞吐提升 2-3 倍，但需要两个模型常驻显存。PM 了解存在即可，无需深入。

**KV Cache 量化**：将 KV Cache 从 FP16 降至 FP8/INT8，同等显存下并发上限接近翻倍，是高并发场景的重要成本优化手段（详见 [c07 量化](/kb/ai-基础知识库/c07-量化-quantization-与端侧部署/)）。

## 5.4 PM 成本直觉校准

| 产品决策 | 算力后果 |
|---------|---------|
| 支持 128K 上下文 | 单用户 KV Cache 成本约为 4K 上下文的 32 倍 |
| System Prompt 从 500 → 5000 tokens | 每次请求 Prefill 成本上升 10 倍，但开启 Caching 后边际成本接近 0 |
| 增加流式输出（Streaming） | 不改变总 token 数，但改善用户感知延迟，是低成本体验优化 |
| 要求更长的输出 | 输出 token 通常比输入 token 成本高 3-5 倍（API 定价反映了这一事实） |

相关概念卡：[KV Cache](/kb/ai-基础知识库/kv-cache/)、[自回归生成](/kb/ai-基础知识库/自回归生成/)
模块二延伸：[m209 成本控制手册](/kb/ai-工程化与落地架构/m209-推理成本控制手册/) — Prompt Caching、模型路由、语义缓存的完整成本优化体系（降本 70–80%）
上一章：[c04 训练 Pipeline](/kb/ai-基础知识库/c04-模型训练全阶段-pipeline/)
下一章：[c06 架构演进](/kb/ai-基础知识库/c06-架构演进-dense-moe-ssm-hybrid/)

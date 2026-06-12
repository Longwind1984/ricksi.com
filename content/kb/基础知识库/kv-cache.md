---
title: KV Cache
cluster: 基础知识库
created: '2026-05-13'
updated: '2026-05-18'
provenance: co
---

# KV Cache

## 物理含义

大模型能"记住"上文，靠的是缓存所有历史 token 的 Key 和 Value 向量。KV Cache 的物理大小直接锁死了系统能承载的**并发请求数**。

## 计算公式

KV Cache (bytes) = 2 × L × n_kv × d_head × S × dtype_bytes

其中：
- **2** — K 和 V 两组向量
- **L** — Transformer 层数
- **n_kv** — KV 头数（MHA = H，GQA = G，远小于 H）
- **d_head** — 每头维度
- **S** — 序列长度
- **dtype_bytes** — 数据类型字节数（FP16=2, FP8=1）

## 实例推算（Llama-3-70B, GQA, FP16）

L=80, n_kv=8, d_head=128, S=100K, dtype=2 bytes

→ KV Cache ≈ 32.8 GB

## 与 GQA 的联动

如果 Llama-3-70B 仍使用 MHA（n_kv=64），同一场景的 KV Cache 将膨胀 **8 倍**。GQA 不是学术花活，而是让 100K 上下文在工程上可行的前置条件。

## 优化 Tricks

- **PagedAttention**：将 KV Cache 分页管理，消除显存碎片（vLLM 核心创新）
- **Radix Tree Prompt Caching**：复用共享前缀的 KV Cache，降低 70%+ 计算成本
- **KV Cache 量化**：FP16 → FP8/INT8，并发上限翻倍

## PM 视角：长会话保持与产品设计推论

KV Cache 不是磁盘文件，是 GPU 显存里的向量；任何会话停顿后再续，都涉及"重新 prefill 全部历史"还是"命中缓存"两条岔路。云端模型的工程约定是 RAM 内 KV 一般只活 5–10 分钟，磁盘 / 对象存储兜底的窗口在小时至数天级，跨周/月几乎都得走 prefill。这把"长会话保持"翻译成了一条产品设计约束：用户隔十分钟回到并行任务里继续推进，每一次回来都可能是一次满价 prefill。

由此推出一条 PM 直觉：界面应当鼓励用户在单一长对话里一次性闭环、而不是并行开多个长会话——后者把缓存命中率打散，成本和延迟双输。DeepSeek 把 KV Cache 落盘以撑出更长持久窗口是一条降本路径，但代价是首响应延迟、磁盘 I/O 与一致性管理；其他厂商不全跟，是因为目标负载（短链高并发 vs. 长链低并发）与硬件栈各异，**降本的代价**总是落在 SLA 或基础设施投资曲线上某处。

## 相关章节

- [c03 GQA 与 Attention 变体](/kb/基础知识库/c03-transformer-核心机制与注意力变体/)
- [c05 算力物理与 KV Cache](/kb/基础知识库/c05-算力物理定律与-kv-cache/)
- [c07 KV Cache 量化](/kb/基础知识库/c07-量化-quantization-与端侧部署/)


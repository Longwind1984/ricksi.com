---
title: A03 Token Economics 精算
cluster: 专题 · 工程与成本
created: '2026-06-07'
updated: '2026-06-11'
provenance: ai
facet: 成本工程
---

# A03 Token Economics 精算

> 这个节点要解决的问题是：**PM 能不能在没有工程在场的情况下，拿出计算器，把"一次任务到底花多少钱"算到个位数？** 不是"大概很贵"，是"这次对话的 API 成本是 $0.018，其中 output 占 87%，缓存命中后降到 $0.011"。这是把 [A02 成本对象层级辨析·per-token per-query per-task per-user per-seat](/kb/专题-工程与成本/a02-成本对象层级辨析-per-token-per-query-per-task-per-user-per-seat/) 的口径落到可复算算式的一节——口径厘清了"算的是哪笔账"，本节给出"那笔账具体怎么算"。本节用的框架是 **token 单价分解 × 计费维度展开**：把一张看似只有两个数字（input 价、output 价）的价目表，拆成六个真正决定账单的乘数。

## §0 为什么是"分解单价"而不是"背一个均价"

90% 的 PM 第一次算 AI 成本时，做的是这件事：找一个"每千 token 多少钱"的均价，乘以"大概多少 token"，得到一个数。这个框架从根上就错，因为**token 单价不是一个数，是一组结构性不对称的数**——input 和 output 不同价、缓存命中和未命中不同价、thinking token 和可见输出不同价、不同模型差一到两个数量级。用单一均价算，等于用"商品平均售价"算超市利润：你把茅台和矿泉水按件数平均了。

正确的框架是**先确认计费维度，再代入单价**。一次 API 调用的成本不是 `tokens × price`，而是：

```
成本 = input_tokens × P_in
     + output_tokens × P_out          ← P_out 通常是 P_in 的 3–5 倍
     + cached_input_tokens × P_cache_read   ← 命中缓存的 input，单价大幅折扣
     + cache_write_tokens × P_cache_write   ← 写入缓存有溢价（首次）
     + thinking_tokens × P_out         ← reasoning 模型的思考 token，按 output 计费但用户看不见
```

这五项里，**没有一项是 PM 凭直觉能跳过的**。跳过 output 价差，你会把成本低估 3 倍；跳过 thinking token，你会把一个 reasoning 任务的成本低估到不可用；跳过缓存，你会以为长 system prompt 的高频应用烧不起，其实命中后便宜 90%。这一节的目的，就是让你不再背均价，而是会把这个算式当场展开。

## §1 第一性不对称：output 为什么比 input 贵

这是 token economics 里最反直觉、也最容易被 PM 忽略的一条：**几乎所有主流模型的 output token 单价是 input 的 3–5 倍。**

以 Anthropic Claude 的公开定价为例〔截至 2026-06，来源：platform.claude.com pricing；单价 volatile 需定期复查〕：现役 Claude Sonnet 档为 input $3 / 百万 token、output $15 / 百万 token（5 倍差）；现役 Claude Opus 档为 input $5 / output $25（5 倍差）；轻量 Haiku 档为 input $1 / output $5。此 $3/$15、$5/$25、$1/$5 三档自 4.x 系列起跨多个版本保持稳定，但仍属 volatile 价、可能随新版调整。各家旗舰模型普遍维持 input∶output = 1∶5 的结构（output 跨各现役 Claude 档恒为 input 的 5 倍）。

**为什么贵？** 不是厂商定价策略，是物理决定的。回到 [c05 - 算力物理定律与 KV Cache](/kb/基础知识库/c05-算力物理定律与-kv-cache/)：推理分 **Prefill（预填充）** 和 **Decode（解码）** 两阶段。Prefill 处理 input——可以一次性把整段 prompt 并行喂进 GPU，是**计算密集（compute-bound）**、高吞吐的；Decode 逐个生成 output token——每生成一个 token 都要把整个 KV Cache 从显存读一遍，是**显存带宽密集（memory-bound）**、低吞吐的。同样一块 GPU，单位时间能 prefill 的 token 数远多于能 decode 的。**output 贵，是因为它占用的是更稀缺的那种资源（显存带宽 + 串行解码时间），而不是更多的 FLOPs。**

> [!note] 对 PM 的直接含义
> 这条不对称改变你的功能设计排序：**任何"让模型多说话"的功能，成本曲线都比"让模型多读"陡得多。** 一个让用户上传 50 页文档问一句的功能（input 重、output 轻），比一个让模型生成 50 页报告的功能（input 轻、output 重）便宜得多——哪怕 token 总数一样。设计长输出功能（代码生成、长文写作、详细报告）时，成本风险主要在 output 侧，限流也该限 output（max_tokens），而不是只限 input。

## §2 KV Cache 成本：那笔"不在价目表上"的账

PM 看 API 价目表只看到 input/output 两个数字，但 [c05 - 算力物理定律与 KV Cache](/kb/基础知识库/c05-算力物理定律与-kv-cache/) 揭示了第三笔被价格隐藏的成本：**KV Cache 占用的显存，决定了一块 GPU 能同时服务多少并发用户，从而决定了 per-token 价格能压到多低。**

KV Cache 是模型为已处理的每个 token 缓存的 Key/Value 向量，避免重复计算。它随**上下文长度线性增长**：上下文越长、并发越多，显存占用越大。c05 给的物理量级是 Llama-3-70B 处理 100K token 上下文约需 32.8 GB KV Cache〔来源：c05 节点，物理公式推算〕——一块 80GB H100 装下模型权重后，剩余显存能容纳的并发会被 KV Cache 迅速吃满。

**这笔账对 PM 的含义是间接但致命的**：你看到的 per-token 单价，是厂商按某个假设的"平均上下文长度 + 并发利用率"摊出来的。**当你的应用让用户把上下文堆到 100K+、又要低延迟（高优先级、不能排队），你实际占用的显存远超平均，厂商要么涨价（长上下文档位）、要么硬锁并发（rate limit）。** [c05 - 算力物理定律与 KV Cache](/kb/基础知识库/c05-算力物理定律与-kv-cache/) 提到的 **MLA（Multi-head Latent Attention，DeepSeek-V3 用以压缩 KV Cache 显存的新机制）** 之所以是大事，正是因为它直接松开了这道并发枷锁——这是 c05 物理公式没展开、但对 per-token 定价影响巨大的补缺点（详见 [G02 成本代际演化详解](/kb/专题-工程与成本/g02-成本代际演化详解/)）。

PM 不需要会算 KV Cache 的字节数，但**必须知道"长上下文"在账单上是双重收费**：一次是上下文里的 token 本身按 input 计费，一次是它撑大 KV Cache、压低并发、间接抬高单价（表现为长上下文档位涨价或 rate limit 收紧）。这正是 [E01 ChatGPT 与 Claude 的 context rate-limit 产品成本耦合剖解](/kb/专题-工程与成本/e01-chatgpt-与-claude-的-context-rate-limit-产品成本耦合剖解/) 要剖的耦合。

## §3 Prompt Caching：把折扣机制算进算式

[Prompt Caching](/kb/基础知识库/prompt-caching/) 是过去两年从无到各家标配的降本机制（见 [G02 成本代际演化详解](/kb/专题-工程与成本/g02-成本代际演化详解/)），但它的经济学被大量误读成"开了就省钱"。要算对账，必须把它的三档单价和触发条件搞清楚。

以 Anthropic 的 Prompt Caching 为例〔以 2026-06 定价，来源：platform.claude.com/docs prompt-caching〕，它把 input 拆成三种价：

| token 类型 | 相对标准 input 价 | 含义 |
|---|---|---|
| **缓存写入**（cache write，首次） | **1.25×**（5 分钟 TTL）/ **2×**（1 小时 TTL） | 第一次把这段 prefix 写进缓存，有溢价 |
| **缓存读取**（cache read，命中） | **0.1×**（即只付标准 input 价的 10%） | 后续命中同一段 prefix，大幅折扣 |
| **未缓存 input** | 1× | 没进缓存的部分，原价 |

> [!note] TTL 的成本含义
> 5 分钟 TTL 的写入溢价是 1.25×，意味着只要这段缓存在 5 分钟内被命中读取 ≥1 次就回本（省下的 0.9× > 多付的 0.25×）。选 1 小时 TTL 写入溢价翻到 2×，要被命中更多次才划算——TTL 越长，回本门槛越高〔来源：platform.claude.com/docs prompt-caching〕。

机制的关键是 **prefix 匹配 + TTL**：缓存命中要求 prompt 的**前缀**逐字节一致，且在 TTL（Anthropic 默认 5 分钟，可选更长）内被再次命中。这导出了它的盈亏边界——

**算式上怎么体现**：一个带 10K token 长 system prompt（工具定义 + few-shot 示例）、高频被调用的应用，第一次付 `10K × 1.25 × P_in`，之后每次只付 `10K × 0.1 × P_in`。命中率越高、调用越密，越赚。[m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/) §2.6 实测过一个长 system prompt 高频场景的收益约 **$1,620 / 百万请求**〔来源：m209 节点实测，特定场景值，换场景需重算〕。

**但这是有边界的（接受 + 边界）**：缓存写入的 1.25× 溢价意味着，**如果命中率太低（每段 prefix 平均被命中不到一次），你付的写入溢价比省下的读取折扣还多——开缓存反而亏。** 短 TTL 场景（用户请求间隔超过 5 分钟）同样命中归零。所以"Prompt Caching 普适降本"是错的：它只在**长稳定前缀 + 高命中率 + 短间隔**三条同时满足时才赚，这正是 [S02 降本手段流派对照矩阵](/kb/专题-工程与成本/s02-降本手段流派对照矩阵/) 要把它和其它手段排进矩阵的原因。

> [!warning] PM 易踩的口径错位
> 别把 Prompt Caching 和 **prefix sharing（前缀共享）** 混为一谈。前者是面向 API 用户的**计费折扣**（你付钱买的折扣）；后者是推理引擎（如 vLLM 的 prefix caching）在**服务端内部**对相同前缀复用 KV Cache 的**工程优化**（厂商省的成本，未必折给你）。c05 的物理优化属于后者，API 价目表上的 Prompt Caching 属于前者。算账时只有前者进你的算式。

## §4 Thinking token：reasoning 模型把成本表改写了

2025 年起，extended thinking / reasoning 模型（o 系列、Claude 的 extended thinking、DeepSeek-R1 路线）引入了第四种 token：**thinking token（思考 token）——模型在给出最终答案前的内部推理过程**。它的计费规则是 token economics 里最新、也最容易让 PM 把成本低估一个数量级的一条：

**thinking token 按 output 价计费，但用户在最终回复里看不到它。** 也就是说，一个用户只看到 200 token 答案的任务，背后可能消耗了 3,000 token 的 thinking——你按 `(3000 + 200) × P_out` 付费，而不是 `200 × P_out`。[c11 - System 2 思维与 Test-Time Compute](/kb/基础知识库/c11-system-2-思维与-test-time-compute/) / [Test-Time Compute](/kb/基础知识库/test-time-compute/) 讲的"用推理时计算换质量"，在账单上的代价就是这笔隐形的 thinking token。

**这条改写了"一次任务成本"的算法**：对 reasoning 模型，你不能用"答案长度"估成本，必须估**思考预算（thinking budget）**。这也是 [A04 推理成本三角·模型大小 延迟 质量](/kb/专题-工程与成本/a04-推理成本三角-模型大小-延迟-质量/) 的核心——质量提升来自更多 thinking token，而 thinking token 直接是钱和延迟。

> [!note] 接 0412 评测专题
> 这条直接连到 [A02 成本对象层级辨析·per-token per-query per-task per-user per-seat](/kb/专题-工程与成本/a02-成本对象层级辨析-per-token-per-query-per-task-per-user-per-seat/) 的 per-task 口径与 0412 评测专题的"分数值不值这个价"：一个 SWE-bench 高分若靠堆 thinking token + 多次采样（best-of-n）换来，per-task 成本可能高到产品化不可行。**高分和高成本是同一枚硬币**，PM 看 benchmark 必须同时问"这分用了多少 thinking token"。

## §5 一次任务的可复算算式（把上面五项合起来）

现在把前四节合成一个 PM 可以当场用计算器跑的算式。这是本节对 [R01 最小可运行·Token 成本计算器](/kb/专题-工程与成本/r01-最小可运行-token-成本计算器/) 的概念支撑——R01 把它做成可参数化的工具，这里给手算版。

**单次调用成本算式**：

```
C_call = (I_uncached × P_in)
       + (I_cached_write × P_in × 1.25)
       + (I_cached_read  × P_in × 0.1)
       + ((O_visible + O_thinking) × P_out)
```

**示例（手算一次客服对话）**〔单价以现役 Claude Sonnet 档为例〔截至 2026-06，来源：platform.claude.com pricing〕，设 P_in = $3/M、P_out = $15/M（M = 百万 token）：

- system prompt（工具定义 + 知识）8,000 token，启用缓存、本次命中：`8000 × $3/M × 0.1 = $0.0024`
- 用户本轮输入 + 历史对话 2,000 token，未缓存：`2000 × $3/M = $0.006`
- 模型回复 500 token，无 thinking：`500 × $15/M = $0.0075`
- **本次调用合计 ≈ $0.0159**

**关键观察**：output 只占 500 token（全部 token 的 4.7%），却贡献了 $0.0075（成本的 47%）——这就是 §1 的不对称在一次真实调用里的样子。若关掉缓存，system prompt 那 8,000 token 按原价 `8000 × $3/M = $0.024`，单次成本跳到 $0.0375，**翻一倍多**——这就是 §3 缓存的真实收益。

**从单次到 per-user**（接 [A02 成本对象层级辨析·per-token per-query per-task per-user per-seat](/kb/专题-工程与成本/a02-成本对象层级辨析-per-token-per-query-per-task-per-user-per-seat/) / [R03 Unit Economics 模型·CAC COGS LTV 与盈亏平衡](/kb/专题-工程与成本/r03-unit-economics-模型-cac-cogs-ltv-与盈亏平衡/)）：

```
per-user 月成本 ≈ C_call × 平均轮次/会话 × 会话数/月 × 活跃率
```

一个月活用户日均 1 次会话、每会话 8 轮，月成本 ≈ `$0.0159 × 8 × 30 ≈ $3.8`。如果订阅价 $20/月、毛利目标 70%，COGS 上限是 $6——这个用户**勉强在线内**，但只要他重度使用（每会话 20 轮）就破线。**这就是 PM 该当场算出来、用来定免费额度和 rate limit 的数**（接 [A07 成本约束反向塑造产品](/kb/专题-工程与成本/a07-成本约束反向塑造产品/)）。

## 判断主轴：90% 的人在 token 精算上会搞错的四个点

这一节是本节点的命门——逐点给"症状 → 为什么会错 → 正确做法 → 真实反例"。

### 错位一：用 input/output 均价算成本，忽略 output 价差

- **症状**：PM 拿一个"每千 token X 元"的数，乘以总 token 数，得出成本。汇报时说"这个功能每次调用约 Y 元"。
- **为什么会错**：token 总数里 input 和 output 的配比，和单价里 input∶output 的 1∶5 配比，是两个独立维度。均价默认两者占比相等，但真实应用里 input 常占 80%+ token、output 占成本 50%+。**用均价等于同时高估 output 的量、低估它的价，误差方向不定、幅度可达 2–3 倍。**
- **正确做法**：永远分开列 input/output 两行，分别乘各自单价。max_tokens（output 上限）是成本的主开关，比 input 上限重要得多。
- **真实反例**：一个"AI 生成营销文案"功能，input 是 300 token 的简短 brief、output 是 2,000 token 的长文案。按均价（假设 $5/M）算 `2300 × $5/M = $0.0115`；按真实价（input $3/M、output $15/M）算 `300×$3/M + 2000×$15/M = $0.0009 + $0.03 = $0.0309`，**是均价估算的 2.7 倍**。定价会上按均价报免费额度，上线就亏穿。

### 错位二：reasoning 模型只按"可见答案长度"估成本，漏掉 thinking token

- **症状**：用 reasoning 模型做复杂任务，看到回复只有几百字，按几百 token 估成本，得出"很便宜"。
- **为什么会错**：thinking token 按 output 价计费但不可见（§4）。可见答案 200 token、思考 3,000 token，真实成本是估算的 16 倍。
- **正确做法**：reasoning 模型按"思考预算"估，不按答案长度。能设 thinking budget 上限的就设上限纳入算式；不能设的，用该模型在同类任务的平均 thinking token 经验值（需实测，标〔待核实〕直到测出）。
- **真实反例**：用 o 系列/extended thinking 做代码调试，用户看到 30 行修复代码（约 400 token），实际模型 thinking 了数千 token。把"每次调试 $0.006"写进 deck，实际账单是它的十几倍——这正是 [A04 推理成本三角·模型大小 延迟 质量](/kb/专题-工程与成本/a04-推理成本三角-模型大小-延迟-质量/) 警告的成本暴涨。

### 错位三：以为"开了 Prompt Caching 就一定省钱"

- **症状**：听说缓存能降 90%，给所有调用都开缓存，预期成本砍九成。
- **为什么会错**：缓存写入有 1.25× 溢价、命中要求 prefix 逐字节一致且在 TTL 内（§3）。低命中率场景，写入溢价 > 读取折扣，**开缓存反而更贵**。
- **正确做法**：先估命中率。只有"长稳定前缀（system prompt/工具定义不变）+ 高频 + 请求间隔 < TTL"才开。前缀里有时间戳、用户名、随机 ID 这类逐次变化的内容，会破坏 prefix 匹配——要把可变内容挪到 prompt 末尾，让稳定前缀尽量长。
- **真实反例**：一个低频（用户几小时来一次）、且 system prompt 里嵌了当前时间戳的应用，给它开缓存：每次 prefix 都不命中（时间戳变了）、还付 1.25× 写入溢价，账单不降反升。

### 错位四：把某个案例的"降本百分比"当通用常数

- **症状**：看到 [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/) 的"缓存省 $1,620/百万请求""路由平均成本 37%""优化后降 70–80%"，直接搬进自己产品的成本估算。
- **为什么会错**：这些是 m209 **特定场景**（长 system prompt 高频 / 特定路由配比 / 知识库问答）的实测值。降本百分比随模型、任务、上下文长度、命中率剧烈漂移（见 [S02 降本手段流派对照矩阵](/kb/专题-工程与成本/s02-降本手段流派对照矩阵/) 的同一警告）。
- **正确做法**：把这些数字当**量级参照**（"缓存能带来数量级 1 的降本"），不当精确预算。自己的产品必须用自己的参数重算一遍（用 [R01 最小可运行·Token 成本计算器](/kb/专题-工程与成本/r01-最小可运行-token-成本计算器/)）。
- **真实反例**：把"路由降 63%"搬到一个请求复杂度高度同质的产品（没有低复杂度请求可分流），路由不仅没降本，还加了一层判别开销和延迟——这是 m209 数字脱离场景被误用的典型。

## 产品 PM 视角补盲

工程视角把 token 精算停在"算准 API 账单"。产品 PM 还要补三个看走眼的点：

1. **计价单位与用户心理模型的错位**：用户不理解 token，更不理解 input/output 不同价。如果你的产品按 token 向用户计费（API 类产品），用户会困惑"我就问了一句话怎么扣这么多"——因为他生成的长回复在扣费。**面向 C 端时，几乎不能把 token 暴露给用户**，要折算成"次数/字数/积分"等用户能建心理预期的单位，差额由你承担定价风险（接 [A02 成本对象层级辨析·per-token per-query per-task per-user per-seat](/kb/专题-工程与成本/a02-成本对象层级辨析-per-token-per-query-per-task-per-user-per-seat/) 的 per-task/per-seat 口径）。
2. **缓存折扣的商业模式含义**：Prompt Caching 让"长 system prompt"从成本负担变成可摊薄的固定投入——这反过来鼓励你把更多能力（工具、知识、人设）塞进稳定前缀。**这是成本机制在塑造产品架构**（接 [A07 成本约束反向塑造产品](/kb/专题-工程与成本/a07-成本约束反向塑造产品/)）：缓存经济学让"重 system prompt、轻每轮输入"的设计变得划算。
3. **合规与计费的耦合**：thinking token 不可见但计费，意味着用户为"看不到的过程"付费。在对计费透明度有监管要求的场景（金融、政府采购），"按不可见 token 计费"可能引发争议——PM 要预判这个解释成本。

## 对手框架回应

**业界反方立场（"token 价格在快速下降，精算这件事不值得 PM 花时间，等降价就行"）**：这是 token 价格外推乐观主义。**接受它对的部分**——token 单价确实在以惊人速度下降（详见 [G01 推理成本代际谱系总图](/kb/专题-工程与成本/g01-推理成本代际谱系总图/)），今天算得精确的成本，半年后可能因降价整体下移，精算的绝对数字会过期。**但坚持本节的边界**：(1) 下降的是单价，**结构性不对称不变**——input∶output 的 1∶5、thinking token 计费、缓存的盈亏边界，这些算式结构不随降价改变，PM 要会的是结构不是某个数字；(2) Jevons 悖论（见 [A07 成本约束反向塑造产品](/kb/专题-工程与成本/a07-成本约束反向塑造产品/)）下，单价降会刺激用量/上下文/thinking 暴涨，**会算账的 PM 才知道降价红利被吃到哪去了**；(3) 降价是不均匀的——reasoning token、长上下文这些新增成本项往往逆势上涨。所以"等降价"不能替代"会精算"，反而降价时代更需要精算来追踪成本结构的迁移。

## PM 决策启示

- **面试怎么用**：被问"你怎么评估一个 AI 功能的成本"，不要答"看 token 用量"，要当场拆算式：分 input/output、问有没有 reasoning（thinking token）、问 prefix 能不能缓存、给一个 per-call → per-user 的换算。能把 §5 那个 $0.0159 的手算讲出来，立刻和"只会说很贵"的候选人区分开。
- **选型怎么用**：对比两个模型不能只比 input 单价。要比 `(典型 input × P_in + 典型 output × P_out + 预期 thinking × P_out)` 的**任务级总成本**——一个 output 便宜、thinking 少的模型，可能比 input 便宜但话痨的模型更省（接 [m202 - 工程选型决策矩阵](/kb/工程化与落地架构/m202-工程选型决策矩阵/) 的成本预算维度）。
- **复现怎么用**：用 [R01 最小可运行·Token 成本计算器](/kb/专题-工程与成本/r01-最小可运行-token-成本计算器/) 把本节算式参数化，输入你产品的真实 token 分布，输出 per-call / per-user 成本，再喂给 [R03 Unit Economics 模型·CAC COGS LTV 与盈亏平衡](/kb/专题-工程与成本/r03-unit-economics-模型-cac-cogs-ltv-与盈亏平衡/) 算毛利和盈亏平衡点。

## 与已有节点的关系

- 对 [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/)：**补缺 + 抽象层升高**。m209 §2.6 给了降本手段清单和实测数字（缓存 $1,620/百万请求、路由 37%），但**未展开 extended thinking 的 thinking token 单独计费机制**——本节补上这个改写成本表的关键项，并把 m209 的零散手段重定位为"单次调用算式里的乘数"。不复述 m209 的手段实现细节。
- 对 [c05 - 算力物理定律与 KV Cache](/kb/基础知识库/c05-算力物理定律与-kv-cache/)：**抽象化**。c05 讲 KV Cache 的物理公式（32.8GB）和 Prefill/Decode 两阶段；本节把这些物理量翻译成"per-token 价目表里看不见的那部分"（output 为什么贵、长上下文为什么双重收费），并补 c05 未展开的 **prefix sharing 与 Prompt Caching 的区分**。不复述物理推导。
- 对 [c11 - System 2 思维与 Test-Time Compute](/kb/基础知识库/c11-system-2-思维与-test-time-compute/) / [Test-Time Compute](/kb/基础知识库/test-time-compute/)：**对话**。c11 讲推理时计算换质量的能力侧；本节接其成本侧（thinking token 计费）。
- 对 [Prompt Caching](/kb/基础知识库/prompt-caching/) 概念卡：**定位 + 升级**。把概念卡的机制描述升级为带三档单价和盈亏边界的可算账模型。

## 关联节点

**核心（必读）**
- [A02 成本对象层级辨析·per-token per-query per-task per-user per-seat](/kb/专题-工程与成本/a02-成本对象层级辨析-per-token-per-query-per-task-per-user-per-seat/)（本节的口径前提：算的是哪个对象）
- [A04 推理成本三角·模型大小 延迟 质量](/kb/专题-工程与成本/a04-推理成本三角-模型大小-延迟-质量/)（thinking token → 成本三角）
- [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/)（本节补缺其 thinking token 项）
- [c05 - 算力物理定律与 KV Cache](/kb/基础知识库/c05-算力物理定律与-kv-cache/)（output 价差与 KV Cache 的物理根源）
- [Prompt Caching](/kb/基础知识库/prompt-caching/)（缓存折扣机制）
- [R01 最小可运行·Token 成本计算器](/kb/专题-工程与成本/r01-最小可运行-token-成本计算器/)（本节算式的工具化）
- [A07 成本约束反向塑造产品](/kb/专题-工程与成本/a07-成本约束反向塑造产品/)（精算结果如何倒逼定价/限流）

**延伸（可选）**
- [A05 模型路由与 Mixture-of-models](/kb/专题-工程与成本/a05-模型路由与-mixture-of-models/)（用便宜模型降低 P_in/P_out 的工程手段）
- [S01 AI 产品成本结构分层剖面](/kb/专题-工程与成本/s01-ai-产品成本结构分层剖面/)（单次算式如何嵌进成本分层堆栈）
- [S02 降本手段流派对照矩阵](/kb/专题-工程与成本/s02-降本手段流派对照矩阵/)（缓存/路由/量化的横向对照）
- [R03 Unit Economics 模型·CAC COGS LTV 与盈亏平衡](/kb/专题-工程与成本/r03-unit-economics-模型-cac-cogs-ltv-与盈亏平衡/)（per-user 成本 → 毛利）
- [E01 ChatGPT 与 Claude 的 context rate-limit 产品成本耦合剖解](/kb/专题-工程与成本/e01-chatgpt-与-claude-的-context-rate-limit-产品成本耦合剖解/)（KV Cache 双重收费的真实产品体现）
- [Test-Time Compute](/kb/基础知识库/test-time-compute/)、[KV Cache](/kb/基础知识库/kv-cache/)、[m202 - 工程选型决策矩阵](/kb/工程化与落地架构/m202-工程选型决策矩阵/)
- [_成本工程系统化专题·总览](/kb/专题-工程与成本/_成本工程系统化专题-总览/)、[AI PM 知识图谱·总索引](/kb/ai-pm-知识图谱/ai-pm-知识图谱-总索引/)

## 修订日志
- **R0（2026-06-07，首稿）**：按宪章 §4 十一段骨架写成。§0 框架辨析（分解单价 vs 背均价）；§1 output 价差的 Prefill/Decode 物理根源；§2 KV Cache 的隐形双重收费；§3 Prompt Caching 三档单价 + 盈亏边界 + prefix sharing 辨析；§4 thinking token 改写成本表 + 接 0412；§5 给出可复算单次算式 + 手算示例（$0.0159）+ per-user 换算（$3.8/月）；判断主轴四错位（output 均价/thinking 漏算/缓存盲开/降本百分比误用），每条四件套；产品视角补盲三点（用户计价心理/缓存塑形架构/计费合规）；对手回应（token 外推乐观主义，接受+三条边界）；与 m209/c05/c11/Prompt Caching 升级对照。
- **R1（2026-06-07，定价核实）**：WebSearch 核实并回填三组硬数字：① Claude Sonnet 4.5 = input $3/M、output $15/M，Opus 4.5 = $5/$25，input∶output = 1∶5 跨现役 Claude 模型恒定〔来源：platform.claude.com/docs pricing〕；② Prompt Caching 写入 1.25×（5min TTL）/ 2×（1h TTL）、读取 0.1×〔来源：platform.claude.com/docs prompt-caching〕，补 TTL 回本门槛 callout；③ 示例算式单价由"待核实"升级为带来源。Opus 4.5 单价标 volatile 提示后续可能变动（2026 年内 Opus 系列经历过价格调整）。**遗留待核实项**：① reasoning 模型的"平均 thinking token / 任务"经验值——无通用常数，已在判断主轴错位二明确要求按模型实测、保留〔待核实〕直到测出，这是结构性留白非疏漏。
- 2026-06-11 P3.1 接地修复：①§1 主定价段把过时的具体版本号"Sonnet 4.5 / Opus 4.5"改为版本无关的"现役 Claude Sonnet / Opus 档"，价格 $3/$15、$5/$25 经 claude-api 权威定价表复核确为现役档真值（另补 Haiku $1/$5 一档），并标〔截至 2026-06，volatile 需定期复查〕；§5 手算示例同样去具体版本号。理由：R1 锚定的 4.5 版本现已被更新版（Sonnet 4.6 / Opus 4.8）取代，但三档价格跨版本未变，去版本号后既保真又抗过时。② KV Cache 32.8GB（Llama-3-70B 100K FP16）经 WebSearch 交叉复核为真值（公式 2×层×头×维×seqlen×2B，多源一致），引自 c05 未走样，维持原样。Prompt Caching 0.1×/1.25×/2× 经 claude-api 文档复核一致。

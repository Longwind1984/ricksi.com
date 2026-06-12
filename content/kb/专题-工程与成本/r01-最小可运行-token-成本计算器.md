---
title: R01 最小可运行·Token 成本计算器
cluster: 专题 · 工程与成本
created: '2026-06-07'
updated: '2026-06-11'
provenance: ai
facet: 成本工程
---

# R01 最小可运行·Token 成本计算器

> 这个节点要解决的问题是：**当工程同学说"这次对话花了多少钱"时，PM 能不能在自己的笔记本上、用一段三十行的代码、把一段真实对话的成本算到分位**——而不是只会复述"output 比 input 贵几倍"这种听来的口径。本节用的框架是「成本计算器即一张可执行的成本对象映射表」：把 [A02 成本对象层级辨析·per-token per-query per-task per-user per-seat](/kb/专题-工程与成本/a02-成本对象层级辨析-per-token-per-query-per-task-per-user-per-seat/) 里的五层口径，落成一个参数化函数，input/output/缓存/重试每一项都对应代码里一个显式参数。最后用一节专门讲**为什么这个 demo 算出来的数，照搬进定价会就会出事**——demo≠生产，是这个节点的命门。

---

## §0 为什么是"参数化计算器"而不是"查一张价格表"

读者脑子里默认的框架往往是错的：**"算成本不就是查官网价格表、乘以 token 数吗？"** 这个框架挡在前面，必须先拆掉。

价格表给你的是 per-million-token 单价，但一次真实对话的成本**不是单价 × 总 token**，而是一个被四个独立变量撑开的多项式：

1. **input 和 output 不同价**：几乎所有商用 API 的 output 单价是 input 的几倍（见 §1 实测口径），把两者混成"总 token"会系统性低估——因为对话里 output 往往才是贵的那一头。
2. **缓存把 input 拆成两种价**：命中 [Prompt Caching](/kb/基础知识库/prompt-caching/) 的 input token 只收一个零头（Anthropic 文档口径为缓存读取约为基础 input 价的 1/10），但**写入缓存那一次反而有溢价**（约 1.25×）。一段长 system prompt，第一次调用比不缓存还贵，第二次起才便宜——计算器必须能表达"第 N 次调用"。
3. **重试是隐形乘数**：超时、限流、JSON 解析失败触发的自动重试，会把同一次请求的成本翻 1.x 到 2x 倍，而这笔钱**price list 上根本不存在**。
4. **reasoning/thinking token 单独计费**：开了 extended thinking 的模型，思考过程的 token 按 output 价计费但你看不到内容（见 [A03 Token Economics 精算](/kb/专题-工程与成本/a03-token-economics-精算/)）。

所以"查价格表"这个框架的失效点是：它把一个**四维参数空间**压成了一个标量乘法。正确的框架是**把价格表当成计算器的一行配置，把上面四个变量当成计算器的入参**——这才是把 [A02 成本对象层级辨析·per-token per-query per-task per-user per-seat](/kb/专题-工程与成本/a02-成本对象层级辨析-per-token-per-query-per-task-per-user-per-seat/) 的"per-token → per-query"那一跳，真正变成可执行的东西。本节点给的代码骨架，刻意把这四个变量全部暴露成显式参数，就是为了不让任何一个被默默吞掉。

---

## §1 实测口径：四档单价的数量级（必须自己核，别背）

下表是写作时核到的**倍率口径**（已 WebSearch 核 Anthropic 官方 pricing/文档，2026-06），用来让计算器的默认值不至于离谱。⚠️ 绝对单价 volatile，标〔以2026-06定价·待核实〕；**倍率关系**则相对稳定，已核实。生产前仍须以官方 pricing 页重核绝对价——这正是 demo≠生产的第一条（见 §5）。

| 计费项 | 典型口径（每百万 token，2026-06） | 相对 input 的倍率 | 在计算器里的参数名 |
|---|---|---|---|
| input（基础） | 小模型 $1 级（Haiku）、中端 $3 级（Sonnet）、旗舰 $5 级（Opus）〔截至 2026-06 已核实，来源 platform.claude.com pricing；单价 volatile 需定期复查〕 | 1× | `price_in` |
| output（基础） | 当前 Claude 全系稳定为 input 的 **5×**（Haiku $1/$5、Sonnet $3/$15、Opus $5/$25，来源：platform.claude.com pricing〔截至 2026-06 已核实〕）；其它厂商多在 3–5× 区间 | 3–5×（Claude 稳定 5×） | `price_out` |
| cache write（5 分钟 TTL 写入溢价） | input 的 **1.25×**（来源：Anthropic Prompt Caching 文档；1 小时 TTL 写入为 2×） | 1.25× | `price_cache_write` |
| cache read（命中折扣） | input 的 **0.1×**（来源：Anthropic Prompt Caching 文档，命中价为标准 input 的 10%） | 0.1× | `price_cache_read` |

> [!note] 缓存何时回本（已核实）
> Anthropic 文档口径：5 分钟 TTL（写入 1.25×）下，**第一次缓存读命中就开始净赚**（节省 0.9× input − 多付 0.25× 写入溢价 = 第一次读即正收益）；1 小时 TTL（写入 2×）则要**两次读命中**才回本。这把 §3 错点二"开了缓存就一定省钱"钉死成一个可算的边界：净收益 = 读命中省的 − 写入多付的，命中次数太少就反号。

> [!note] 为什么这里只给倍率不写死单价
> 宪章 §8 的事实接地纪律：token 单价是 volatile 数字，半年就过时。本节点的价值**不在"今天某模型多少钱"，而在"成本的结构长什么样"**——结构（input/output/cache/retry 四维）半年不变，单价天天变。所以计算器把单价做成入参，文中只给**经得起时间的倍率关系**（output≈3–5×input、cache read≈0.1×、cache write≈1.25×），具体数字交给你跑代码前去官网 copy。这也是与 [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/) 的一处显式分工：m209 §2.6 给的是某时点的具体降本数字（如 $1,620/百万请求），是"那一刻的快照"；R01 给的是"任何时刻都能重算的机器"。

---

## §2 可跑代码骨架（Python，零依赖）

下面是最小可运行骨架。**刻意不依赖任何 SDK 或网络**——它只做一件事：把 token 用量 + 单价配置，算成一个分项成本字典。tokenizer 在生产里要用官方库（见 §5），demo 里用"4 字符≈1 token"的粗估，**这个粗估的危险性本身就是 demo≠生产的核心反例**。

```python
from dataclasses import dataclass

@dataclass
class Pricing:
    """单价配置：每百万 token 的美元价。⚠️ 跑前必须去官网重核，本默认值是占位。"""
    price_in: float            # 基础 input
    price_out: float           # 基础 output（通常 3–5× input）
    price_cache_write: float   # 写入缓存（约 1.25× input）
    price_cache_read: float    # 命中缓存（约 0.1× input）

def rough_tokens(text: str) -> int:
    """粗估：英文 ~4 字符/token。中文/代码会严重偏差——见 §5 第①条陷阱。"""
    return max(1, len(text) // 4)

def cost_of_one_call(
    pricing: Pricing,
    n_in: int,              # 本次未命中缓存的 input token
    n_out: int,             # 本次 output token（含 reasoning token，若开了 thinking）
    n_cache_write: int = 0, # 本次写入缓存的 token（首次建缓存）
    n_cache_read: int = 0,  # 本次命中缓存的 token（复用 system prompt 等）
) -> dict:
    """一次 API 调用的分项成本。单位：美元。"""
    M = 1_000_000
    return {
        "input":       n_in          * pricing.price_in          / M,
        "output":      n_out         * pricing.price_out         / M,
        "cache_write": n_cache_write * pricing.price_cache_write / M,
        "cache_read":  n_cache_read  * pricing.price_cache_read  / M,
    }

def cost_of_conversation(
    pricing: Pricing,
    turns: list[dict],          # 每轮 {"n_in","n_out","n_cache_write","n_cache_read"}
    retry_factor: float = 1.0,  # 重试乘数：1.15 表示平均每次请求多花 15%（超时/限流/解析失败）
) -> dict:
    """一次完整对话（多轮）的总成本，含重试乘数。"""
    total = {"input": 0.0, "output": 0.0, "cache_write": 0.0, "cache_read": 0.0}
    for t in turns:
        c = cost_of_one_call(pricing, t["n_in"], t["n_out"],
                             t.get("n_cache_write", 0), t.get("n_cache_read", 0))
        for k in total:
            total[k] += c[k]
    subtotal = sum(total.values())
    grand = subtotal * retry_factor          # 重试是乘在总额上的隐形成本
    return {**total, "subtotal": round(subtotal, 6),
            "retry_overhead": round(grand - subtotal, 6),
            "grand_total": round(grand, 6)}

# ---- demo：一段 3 轮对话，带长 system prompt + 缓存复用 + 15% 重试 ----
if __name__ == "__main__":
    # 默认值=Claude Sonnet 2026-06 真实单价（input $3 / output $15，cache write 1.25×=$3.75 / read 0.1×=$0.30）；
    # 跑你自己的产品前，仍请替换为你所用模型的官网实时价：
    p = Pricing(price_in=3.0, price_out=15.0,
                price_cache_write=3.75, price_cache_read=0.30)
    turns = [
        # 第1轮：写入 8000 token 的 system prompt（建缓存）+ 200 input + 500 output
        {"n_in": 200, "n_out": 500, "n_cache_write": 8000, "n_cache_read": 0},
        # 第2轮：system prompt 命中缓存（read），新增 150 input + 600 output
        {"n_in": 150, "n_out": 600, "n_cache_write": 0,    "n_cache_read": 8000},
        # 第3轮：同上命中缓存
        {"n_in": 180, "n_out": 800, "n_cache_write": 0,    "n_cache_read": 8000},
    ]
    print(cost_of_conversation(p, turns, retry_factor=1.15))
```

跑出来你会看到三件事，每件都对应一个 PM 该有的肌肉记忆：(a) **output 那一项往往是 input 的几倍**，哪怕 token 数差不多；(b) **cache_write 在第 1 轮就吃掉一笔溢价**，要到第 2、3 轮 cache_read 才把它赚回来——缓存对**单次短对话是亏的**，对**长 prompt 高频复用才赚**；(c) `retry_overhead` 这一行是 price list 上永远不会出现、但月底账单一定有的钱。把这三件事变成本能，就是这个最小计算器的全部目的。

> [!note] 把它接到 per-user
> 上面只算到 per-query（一次对话）。要跳到 [A02 成本对象层级辨析·per-token per-query per-task per-user per-seat](/kb/专题-工程与成本/a02-成本对象层级辨析-per-token-per-query-per-task-per-user-per-seat/) 的 per-user，再乘一个"人均月对话数"、除一个"付费转化率"——那是 [R03 Unit Economics 模型·CAC COGS LTV 与盈亏平衡](/kb/专题-工程与成本/r03-unit-economics-模型-cac-cogs-ltv-与盈亏平衡/) 的活，R01 只负责把最底层那块砖烧硬。

---

## §3 判断主轴：算成本时 90% 的人会搞错的四个点

这一节是把"技术博客"和"PM 顶刊"分开的命门。每点用 **症状 → 为什么会错 → 正确做法 → 真实反例** 四件套。

### 错点一：把 input 和 output 混成"总 token × 一个单价"
- **症状**：报成本时说"这次大概 5000 token，按 $X/百万算……"，一个标量乘法搞定。
- **为什么会错**：output 单价通常是 input 的 3–5×（§1），而对话/生成类产品的成本重心常在 output 一侧；混算会系统性低估，且**低估的方向恰好是你最该警惕的方向**（output 越多越贵，而 output 正是用户体感的"产出"）。
- **正确做法**：input/output 永远分两栏算，代码里用两个参数（`n_in` / `n_out`）。
- **真实反例**：一个"帮用户把要点扩写成长文"的功能，input 是几百 token 的要点，output 是几千 token 的成文——若按"总 token 一个价"估，会把这个**重 output 功能**的成本算成实际的几分之一，定价时直接亏穿。

### 错点二：默认"开了缓存就一定省钱"
- **症状**：听说 [Prompt Caching](/kb/基础知识库/prompt-caching/) 能省 90%，于是给所有调用一律开缓存，报成本时直接按 input × 0.1 算。
- **为什么会错**：缓存读命中确实便宜（≈0.1× input），但**写入有 ~1.25× 溢价**，且缓存有 TTL（Anthropic 文档口径默认 5 分钟）。命中率低、调用稀疏、prompt 短的场景，缓存**不降反升**——你为每次都写一遍缓存付溢价，却很少读到。
- **正确做法**：缓存的净收益 = 命中节省 − 写入溢价，必须把 `n_cache_write` 和 `n_cache_read` 分开建模（代码里就是两个参数），并估命中率。短对话、低频调用先别开。
- **真实反例**：一个客服 bot，每个会话独立、system prompt 也就几百 token、用户问完即走——给它开 Prompt Caching，几乎每次都是 write 没有 read，月底账单比不开还高。这正是 [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/) 给的 $1,620/百万请求收益的**适用边界**：那个数字成立于"长 system prompt + 高频复用"，换成上面这种场景就反号。

### 错点三：成本里不含重试，把 happy path 当真实成本
- **症状**：计算器只算"一次成功调用"的钱，retry_factor 默认就是 1.0，从没改过。
- **为什么会错**：生产环境有超时、限流（429）、output JSON 解析失败触发的自动重试；多步 [RAG](/kb/基础知识库/rag/)/Agent 流程里，任何一步失败都会重跑。**重试是乘在成本上的，不是加**——一个 1.3 的重试乘数，等于成本凭空涨 30%，而它在任何 price list 上都不存在。
- **正确做法**：retry_factor 必须从日志里实测（失败率、平均重试次数），别用 1.0。代码里把它做成乘在 grand_total 上的显式参数。
- **真实反例**：一个让模型输出严格 JSON 的抽取功能，schema 一复杂，解析失败率上去，平均每条要重试 1.6 次——demo 里算出来 per-query $0.01，生产里实际 $0.016，规模化后这 60% 的差额就是几十万的账单缺口。这一笔账 [E03 一个 RAG Agent 产品的 unit economics 拆解](/kb/专题-工程与成本/e03-一个-rag-agent-产品的-unit-economics-拆解/) 会在 Agent 多步场景里算得更狠。

### 错点四：忘了 reasoning/thinking token 也按 output 计费
- **症状**：开了 extended thinking 的模型，报成本只数最终回答的 token，没数思考过程。
- **为什么会错**：thinking token 通常按 output 价计费（见 [A03 Token Economics 精算](/kb/专题-工程与成本/a03-token-economics-精算/)、[Test-Time Compute](/kb/基础知识库/test-time-compute/)），而它的量可能是最终回答的好几倍，且**你在界面上看不到**——成本悄悄翻倍。
- **正确做法**：把 reasoning token 一并塞进 `n_out`（或单列一栏），从 API 返回的 usage 字段里读真实值，别从可见文本估。
- **真实反例**：一个用 reasoning model 跑复杂规划的功能，最终回答 800 token，但思考过程 4000 token——只数回答的话成本算成了 1/6。这正是 [A04 推理成本三角·模型大小 延迟 质量](/kb/专题-工程与成本/a04-推理成本三角-模型大小-延迟-质量/) 说的"用 test-time compute 换质量"那笔账，必须落到计算器里才看得见。

---

## §4 产品 PM 视角补盲：计算器之外的三个"看走眼"

工程视角的计算器算的是 API 账单，但 PM 要补三个工程视角天然看不见的洞：

1. **用户心理模型 vs 成本结构的错位**：用户感知的"一次提问"≠一次 API call。用户问一句话，背后可能是检索 + 多次生成 + 重排（[RAG](/kb/基础知识库/rag/) 流程）。**用户以为他只用了一次，你的计算器要算的是 N 次**——按"用户可见的交互次数"估成本会严重偏低。
2. **免费额度 = 没结账的成本**：免费用户的每一次调用都进你的账单，但不进收入。计算器里那个 `grand_total` 乘以"免费用户日活 × 人均调用"，就是纯烧钱的获客成本（见 [A07 成本约束反向塑造产品](/kb/专题-工程与成本/a07-成本约束反向塑造产品/)）。PM 定免费额度，本质是在用这个计算器的输出反推"能烧多少"。
3. **合规/隐私让某些 token 无法走最便宜的路**：涉敏感数据的请求不能路由到最便宜的外部小模型、或必须走端侧（见 [A06 端侧与云端成本重构](/kb/专题-工程与成本/a06-端侧与云端成本重构/)），这部分 token 的实际单价比计算器默认值高——成本不是技术最优，是**合规约束下的次优**。

---

## §5 demo≠生产：这个计算器在哪里会骗你（陷阱清单）

这是本节点的命门收尾。上面的 30 行代码能让你在面试里证明"我真算过"，但**直接拿它的输出进定价会，会出事**。逐条标注它的失效边界：

- **① tokenizer 是骗局之首**：demo 用"4 字符≈1 token"。这个粗估对英文勉强、**对中文和代码会偏差 1.5–3 倍**（中文一个字常≥1 token，代码符号密集）。Rick 做国际化产品，多语种场景下这个误差会让成本估算整个跑偏。**生产必须用官方 tokenizer**（如 Anthropic 的 token counting 接口或对应库）逐请求实测，绝不能用字符数估。这是 demo≠生产的第一条，也是最致命的一条。
- **② 单价会过期**：代码里的 `Pricing` 默认值虽是写作时（2026-06）的 Claude Sonnet 真实价，但 token 价格 volatile，半年就可能变（§1 已标〔以2026-06定价·待核实〕）。生产前必须以官方 pricing 页重核，且要建机制跟踪降价（见 [G01 推理成本代际谱系总图](/kb/专题-工程与成本/g01-推理成本代际谱系总图/)：降价快于产品迭代）。把过期单价当真，等于拿去年的汇率报今年的价。
- **③ retry_factor 是猜的，生产要从日志实测**：demo 里填 1.15 是拍的。真实重试率随模型、负载、schema 复杂度漂移，必须从 observability（见 [S03 FinOps for AI·成本可观测与归因全景](/kb/专题-工程与成本/s03-finops-for-ai-成本可观测与归因全景/)）里读真实失败率，而不是填一个好看的数。
- **④ 它只算了 LLM API 这一层，不是 TCO**：计算器算的是 per-token API 账单，但真实成本还有 embedding、向量库、检索、重排、日志存储、工程维护（端到端见 [S01 AI 产品成本结构分层剖面](/kb/专题-工程与成本/s01-ai-产品成本结构分层剖面/) 的成本分层堆栈）。把 API 账单当总成本，是只看了冰山尖。
- **⑤ 单点估计是认识论幻觉**：calculator 输出一个精确到分位的数，会给人"我算准了"的错觉。但 input/output 量、缓存命中率、重试率全是分布不是常数。**生产要算的是 p50/p95 区间和敏感性，不是一个点**（这条接 [R03 Unit Economics 模型·CAC COGS LTV 与盈亏平衡](/kb/专题-工程与成本/r03-unit-economics-模型-cac-cogs-ltv-与盈亏平衡/) 的敏感性分析，也是 [Polanyi 默会知识与提示工程的认识论张力](/kb/基础知识库/polanyi-默会知识与提示工程的认识论张力/) 在成本估算上的回响——很多"已知数"其实是默会的猜测）。

> [!warning] 业界反方："PM 不用自己写计算器，云厂商 dashboard / 第三方 FinOps 工具都给现成的"
> **接受**：这是对的。生产环境绝不该靠一段手写脚本核账，AWS/Azure/各 LLM 网关（OpenRouter、Portkey 等）的成本面板、以及专门的 LLM observability 工具，做得比这 30 行强得多，且能实时归因（见 [S03 FinOps for AI·成本可观测与归因全景](/kb/专题-工程与成本/s03-finops-for-ai-成本可观测与归因全景/)）。**边界**：但这些工具给你的是**结果**，不是**理解**。PM 在选型会上被工程问"你这个降本方案降的是 input 还是 output、缓存写入溢价算没算、重试乘数多少"时，dashboard 上的一个总数答不上来——你需要的是**脑子里有这张四维成本结构图**。手写一次计算器的价值不在生产可用，而在**把成本的结构刻进直觉**：之后看任何 dashboard，你都知道那个数是怎么拼出来的、哪一项可能被它悄悄漏掉（比如多数面板默认不显式拆 reasoning token）。这正是这个节点放在「05 复现指南」最入门位置的理由——它是**理解的脚手架，不是生产的工具**。

---

## §6 PM 决策启示：面试 / 选型 / 复现三类落地

- **面试桌**：被问"你怎么估一个 AI 功能的成本"，别背单价。现场拆四维——"input/output 分开、缓存看命中率和写入溢价、重试是乘数、reasoning token 按 output 计"，再补一句"但 demo 算法用字符估 token、单价会过期、重试率得从日志实测，所以这只是数量级"。这套"先给结构、再主动标失效边界"的回答，立刻和"背价格表"的候选人拉开认识论差距。
- **选型会**：拿这个计算器当**质询工具**而非报数工具。工程报"换 X 模型降本 40%"时，逐项追问：降的是 input 还是 output 价？高频复用场景缓存收益有没有算进对照？新模型的重试率/限流比旧的高吗？——把对方的"一个百分比"打回成四维结构（呼应 [S02 降本手段流派对照矩阵](/kb/专题-工程与成本/s02-降本手段流派对照矩阵/) 的逐维对照）。
- **复现台**：把上面骨架跑起来，换上你产品真实的 token 分布和官网实时单价，得到 per-query 数量级，再交棒给 [R02 中型·模型路由 + 语义缓存 降本实验](/kb/专题-工程与成本/r02-中型-模型路由-+-语义缓存-降本实验/)（实测降本）和 [R03 Unit Economics 模型·CAC COGS LTV 与盈亏平衡](/kb/专题-工程与成本/r03-unit-economics-模型-cac-cogs-ltv-与盈亏平衡/)（接到毛利）。R01 是这条复现链的第一块砖。

---

## §7 与已有节点的关系（升级对照，不复述）

- **对 [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/)**：m209 §2.6 给的是某时点的**具体降本数字快照**（缓存收益 $1,620/百万请求、路由平均成本 37%、优化后降幅 70–80%）。R01 不复述这些数字，而是**升高一层做"补缺 + 工具化"**：把 m209 的结论数字变成一台**任何时刻都能重算的参数化机器**，并显式补 m209 未展开的两块——**重试乘数**（m209 的降本清单里没有这一笔隐形成本）和 **reasoning/thinking token 单独计费**（m209 未展开 extended thinking 的计费机制）。一句话：m209 是"那一刻该用哪个降本手段省了多少"，R01 是"成本由哪四维拼成、自己怎么算"。
- **对 [c05 - 算力物理定律与 KV Cache](/kb/基础知识库/c05-算力物理定律与-kv-cache/)**：c05 讲 [KV Cache](/kb/基础知识库/kv-cache/) 的**物理显存公式**。R01 是它的**经济侧翻译**——把"KV Cache 占多少显存"翻成"缓存读/写在 per-token 成本里值多少钱"，让物理约束落到一个 PM 能算的美元数。
- **对 [m202 - 工程选型决策矩阵](/kb/工程化与落地架构/m202-工程选型决策矩阵/)**：m202 的"成本预算"维度是**定性**的隐性成本判断。R01 给它一个**定量入口**——把"成本预算"这一栏变成可填的具体 per-query 数字，再由 [R03 Unit Economics 模型·CAC COGS LTV 与盈亏平衡](/kb/专题-工程与成本/r03-unit-economics-模型-cac-cogs-ltv-与盈亏平衡/) 接到盈亏平衡点。
- 与 [c06 - 架构演进：Dense MoE SSM Hybrid](/kb/基础知识库/c06-架构演进-dense-moe-ssm-hybrid/)、[c07 - 量化 Quantization 与端侧部署](/kb/基础知识库/c07-量化-quantization-与端侧部署/) 是**间接对话**：架构选择（MoE/量化）改变的是计算器里的单价入参，R01 不重复它们的技术内容，只把它们的产物当成 `Pricing` 配置的来源。

---

## §8 关联节点

**核心（必读）**
- [A02 成本对象层级辨析·per-token per-query per-task per-user per-seat](/kb/专题-工程与成本/a02-成本对象层级辨析-per-token-per-query-per-task-per-user-per-seat/)（R01 是它 per-token→per-query 那一跳的可执行版）
- [A03 Token Economics 精算](/kb/专题-工程与成本/a03-token-economics-精算/)（input/output/缓存/reasoning token 的计费原理，R01 的理论底座）
- [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/)（被升级的旧节点：从数字快照到参数化机器）
- [R03 Unit Economics 模型·CAC COGS LTV 与盈亏平衡](/kb/专题-工程与成本/r03-unit-economics-模型-cac-cogs-ltv-与盈亏平衡/)（R01 的下游：per-query→per-user→毛利）
- [Prompt Caching](/kb/基础知识库/prompt-caching/)（缓存写入溢价 vs 读命中折扣的判断来源）
- [A07 成本约束反向塑造产品](/kb/专题-工程与成本/a07-成本约束反向塑造产品/)（计算器输出反推免费额度/限流的判断主轴）

**延伸（可选）**
- [R02 中型·模型路由 + 语义缓存 降本实验](/kb/专题-工程与成本/r02-中型-模型路由-+-语义缓存-降本实验/)（复现链下一站：实测降本）
- [S01 AI 产品成本结构分层剖面](/kb/专题-工程与成本/s01-ai-产品成本结构分层剖面/)(R01 只算 API 层，TCO 全景在此)
- [S02 降本手段流派对照矩阵](/kb/专题-工程与成本/s02-降本手段流派对照矩阵/)(把"降本 X%"打回四维结构的对照工具)
- [S03 FinOps for AI·成本可观测与归因全景](/kb/专题-工程与成本/s03-finops-for-ai-成本可观测与归因全景/)(生产级核账：从手写脚本到可归因体系)
- [E03 一个 RAG Agent 产品的 unit economics 拆解](/kb/专题-工程与成本/e03-一个-rag-agent-产品的-unit-economics-拆解/)(多步重试把成本翻倍的真实标本)
- [A04 推理成本三角·模型大小 延迟 质量](/kb/专题-工程与成本/a04-推理成本三角-模型大小-延迟-质量/)（reasoning token 换质量的那笔账）
- [c05 - 算力物理定律与 KV Cache](/kb/基础知识库/c05-算力物理定律与-kv-cache/)、[KV Cache](/kb/基础知识库/kv-cache/)（缓存成本的物理底）
- [m202 - 工程选型决策矩阵](/kb/工程化与落地架构/m202-工程选型决策矩阵/)、[c06 - 架构演进：Dense MoE SSM Hybrid](/kb/基础知识库/c06-架构演进-dense-moe-ssm-hybrid/)、[c07 - 量化 Quantization 与端侧部署](/kb/基础知识库/c07-量化-quantization-与端侧部署/)（单价入参的来源）
- [Test-Time Compute](/kb/基础知识库/test-time-compute/)、[RAG](/kb/基础知识库/rag/)（reasoning token、多步流程的成本放大）
- [Polanyi 默会知识与提示工程的认识论张力](/kb/基础知识库/polanyi-默会知识与提示工程的认识论张力/)（单点估计的认识论幻觉）
- [_成本工程系统化专题·总览](/kb/专题-工程与成本/_成本工程系统化专题-总览/)、[AI PM 知识图谱·总索引](/kb/ai-pm-知识图谱/ai-pm-知识图谱-总索引/)

---

## §9 修订日志

- **R0（2026-06-07，初稿）**：按宪章 §4 十一段骨架成文。§0 拆"查价格表"默认框架、立"四维参数空间"框架；§1 给四档单价倍率口径（绝对价 volatile 标〔以2026-06定价·待核实〕，倍率关系已 WebSearch 核实）；§2 零依赖 Python 计算器骨架（input/output/cache_write/cache_read/retry_factor 全显式参数 + 可跑 demo）；§3 判断主轴四件套四点（input/output 混算、缓存默认省钱、漏重试、漏 reasoning token）；§4 PM 补盲三点；§5 demo≠生产五条陷阱（tokenizer/过期单价/猜的重试率/非 TCO/单点估计幻觉）+ 业界反方"用现成 dashboard"的接受+边界；§6 三类落地；§7 与 m209/c05/m202/c06/c07 升级对照（不复述，定位为"把数字快照升级为参数化机器"+补重试与 reasoning token 两块缺）；§8 关联节点核心/延伸分档。**R0.1（2026-06-07，grounding pass）**：经 WebSearch 核 Anthropic 官方 Pricing 与 Prompt Caching 文档，确认并落地：output=input 的 **5×**（Claude 全系 Haiku $1/$5、Sonnet $3/$15、Opus $5/$25 稳定 5×）、cache write(5min)=**1.25×**、cache read=**0.1×**、默认 TTL=**5 分钟**（1 小时 TTL 写入为 2×，需 2 次读命中回本）；demo 默认价标注为 Sonnet 2026-06 真实价；§1 增"缓存何时回本"已核实 callout。绝对单价仍保留 volatile 标注。**遗留待核实**：① 非 Anthropic 厂商的 output/input 倍率（文中以"多在 3–5×区间"概括，未逐家核）；② 入库后复检专题内双链 resolve。
**来源**：Anthropic Pricing 文档（platform.claude.com/docs/en/about-claude/pricing）、Anthropic Prompt Caching 文档（platform.claude.com/docs/en/build-with-claude/prompt-caching），均核于 2026-06。
- 2026-06-11 P3.1 接地修复：§1 单价表两行的〔以2026-06定价·待核实〕升级为〔截至 2026-06 已核实，需定期复查〕——Haiku $1/$5、Sonnet $3/$15、Opus $5/$25 三档经 claude-api 权威定价表复核确为现役 Claude 真值；input 行补上对应模型档标注。倍率关系（output=5×、cache write 1.25×/2×、cache read 0.1×）此前已核、维持。本节点定位为"参数化机器"，绝对价仍作入参、文中只保经得起时间的倍率，故无需进一步降级。

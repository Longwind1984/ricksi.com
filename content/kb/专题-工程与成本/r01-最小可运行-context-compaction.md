---
title: R01 最小可运行·Context Compaction
cluster: 专题 · 工程与成本
created: '2026-06-07'
updated: '2026-06-11'
provenance: ai
facet: 上下文工程
---

# R01 最小可运行·Context Compaction

**问题陈述**：当一个多轮 agent 跑到第 30 次工具调用，它的对话历史塞满了 40 条早就不再有用的 `tool_result`——10 分钟前那次 `ls` 的 50 行输出、三次失败的 grep、被覆盖掉的旧文件内容。这些 token 不仅在烧钱，还在主动伤害模型表现（见 [m205 - RAG 生产环境：索引运维与评估体系](/kb/工程化与落地架构/m205-rag-生产环境-索引运维与评估体系/) 提到的 context rot）。本节点不讲理论，只回答一个操作问题：**如何用最少的代码，给一个会话装上"压缩 + 预算控制"的最小 loop**？框架视角是 LangChain 把上下文管理类比操作系统的 **Write / Select / Compress / Isolate** 四操作（来源：[LangChain Blog, Context Engineering for Agents, 2025-07-02](https://www.langchain.com/blog/context-engineering-for-agents)），本节点只做其中的 **Compress**——而且是最朴素的那种：预算守门 + 摘要/遮蔽二选一。

> [!warning] 读这节之前先校准期望
> 本节的代码是**会跑、能演示原理**的骨架，不是生产实现。所有"什么时候压、压成什么、丢什么"的决策，在真实系统里都要按你的任务类型重新调参——结尾 §7 会把 demo 与生产的鸿沟逐条列清。

---

## §0 为什么是"预算 + 二选一"这个框架，而不是"无脑摘要"

绝大多数人想到"压缩上下文"，第一反应是"让模型把历史总结一下"。这是一个**有代价的默认选项**，不是免费午餐。把框架钉死在两个轴上，能挡掉九成误解：

**轴一:触发判据 = token 预算,不是轮数。** 按"每 N 轮压一次"是脆的——一轮里可能塞进一个 200KB 的文件读取,也可能只是一句"好的"。正确的守门指标是**实际 token 占用占窗口的比例**。Claude Code 的公开行为是在约 80% 窗口(约 160K token)触发压缩(来源:[Claude Code Compaction Explained, okhlopkov.com](https://okhlopkov.com/claude-code-compaction-explained/),第三方分析);Anthropic 的 `compact_20260112` API 策略默认阈值 150K、最低可配到 50K(来源:[Anthropic Compaction 文档](https://platform.claude.com/docs/en/build-with-claude/compaction))。

**轴二:压缩手段 = 摘要 vs 遮蔽,这是一个真实的工程取舍。**

| 手段 | 做什么 | 推理开销 | 缓存影响 | 何时用 |
|---|---|---|---|---|
| **LLM Summarization(摘要)** | 多调一次模型,把历史压成摘要替换原文 | 有(多一次推理) | 让整段缓存前缀失效 | 历史语义密集、需要跨步推理 |
| **Observation Masking(遮蔽)** | 把旧 `tool_result` 替换成占位符,保留 `tool_use` 记录 | 无 | 同样破坏缓存前缀,但无推理成本 | 工具输出"用完即弃"(ls/grep/读文件) |

JetBrains Research 在 SWE-bench 上的对照实验给了一个反直觉结论:**遮蔽往往比摘要更便宜也更可靠**——Qwen3-Coder 480B 用遮蔽后解决率提升 2.6%、成本降低 52%;而 LLM 摘要反而让 agent 运行时间增加约 15%(摘要可能把"该停了"的信号一起总结没了)。(来源:[JetBrains Research, Efficient Context Management, 2025-12](https://blog.jetbrains.com/research/2025/12/efficient-context-management/))

所以最小 loop 的骨架不是"摘要器",而是**一个预算守门员 + 一个可插拔的压缩策略**。下面给两个策略,先跑遮蔽(零额外推理,适合入门),再给摘要(更接近 Claude Code 的体感)。

---

## §1 数据结构:把"消息"建成可压缩对象

最小 loop 的前提是消息可被估算、可被替换。先定义一个朴素的消息容器。

```python
from dataclasses import dataclass, field
from typing import Literal
import json

Role = Literal["system", "user", "assistant", "tool"]

@dataclass
class Msg:
    role: Role
    content: str
    tool_call_id: str | None = None   # tool 消息绑定到哪次调用
    compacted: bool = False           # 是否已被压缩/遮蔽

def est_tokens(text: str) -> int:
    """粗估 token 数。生产环境必须换成真 tokenizer(见 §7)。
    这里用 4 字符≈1 token 的英文经验值做 first-order approximation,
    对中文会严重低估(中文常 1-2 字符/token),仅供 demo 守门用。"""
    return max(1, len(text) // 4)

def total_tokens(msgs: list[Msg]) -> int:
    return sum(est_tokens(m.content) for m in msgs)
```

> [!note] 这里的 `est_tokens` 是 demo 的第一个谎言
> 用字符数除以 4 估 token,是英文场景的粗略经验,**对中文、对代码、对 JSON 都会偏掉**。它的唯一作用是让守门逻辑跑起来。真实系统必须用模型自带的 tokenizer 或 count_tokens API——否则你以为还有 30% 余量,实际已经溢出。

---

## §2 预算守门:什么时候该压

守门员只做一件事:每轮把当前 token 数和预算比一比,超线就触发压缩。这对应 Anthropic 的"软阈值"思路——不要等窗口填满才压(那时模型表现已经在 context rot 里了)。

```python
@dataclass
class Budget:
    window: int = 8000        # demo 用小窗口,真实窗口 128K-1M
    soft_ratio: float = 0.7   # 占用超 70% 就触发压缩
    keep_recent: int = 4      # 永远保留最近 N 条原文(近因最关键)

    @property
    def soft_limit(self) -> int:
        return int(self.window * self.soft_ratio)

def need_compaction(msgs: list[Msg], budget: Budget) -> bool:
    return total_tokens(msgs) > budget.soft_limit
```

`soft_ratio=0.7` 不是魔法数字:Chroma 的研究发现上下文超过 50% 满时,U 形曲线开始向"近因偏好"倾斜、中段信息被进一步稀释(来源:[Chroma, Context Rot, 2025-07-14](https://www.trychroma.com/research/context-rot))。在 50%–80% 之间留一个触发带,是在"压太早浪费推理"和"压太晚已经退化"之间的折中。

---

## §3 策略 A:Observation Masking(零额外推理,先跑这个)

遮蔽的核心隐喻(借自 Focus Agent 论文,arxiv 2601.07190):**agent 不需要记住 10 分钟前 `ls` 的 50 行输出,只需要记住"config 文件不在 /src"这个结论。** 但最小版连"提结论"都省了——直接把旧工具输出换成占位符,保留它"调过这个工具"的痕迹。

```python
def mask_old_tool_results(msgs: list[Msg], budget: Budget) -> list[Msg]:
    """把除最近 keep_recent 条之外的 tool 消息内容替换为占位符。
    保留 role 和 tool_call_id,让模型知道'这一步调过工具、结果已归档'。"""
    n = len(msgs)
    out = []
    for i, m in enumerate(msgs):
        is_recent = i >= n - budget.keep_recent
        if m.role == "tool" and not is_recent and not m.compacted:
            placeholder = f"[tool result elided to save context; tool_call_id={m.tool_call_id}]"
            out.append(Msg(role="tool", content=placeholder,
                           tool_call_id=m.tool_call_id, compacted=True))
        else:
            out.append(m)
    return out
```

遮蔽的好:**无推理成本、不可能产生摘要幻觉**(没调模型,谈何编造)。坏:它假设旧工具输出真的没用了——对"迭代精炼类"任务(反复读同一个文件慢慢改)会误删关键信息。Focus Agent 论文里就有反例:迭代精炼任务中压缩反而增加 110% overhead。

---

## §4 策略 B:LLM Summarization(更接近 Claude Code 体感)

摘要要多调一次模型。关键不在调用本身,在**摘要 prompt 写什么**。Anthropic 的默认压缩 prompt 要求保留三件东西:**状态、下一步、已学到的内容**(来源:Anthropic Compaction 文档)。这三件套是从惨痛教训里长出来的——只总结"聊了啥"而不留"下一步要干啥",压缩后的 agent 会忘记自己在做什么。

```python
SUMMARY_PROMPT = """你是上下文压缩器。把下面这段 agent 历史压成一段简报。
必须保留:(1) 当前任务状态;(2) 下一步要做什么;(3) 已经确认/学到的关键事实与失败教训。
丢弃:冗余的工具原始输出、已被覆盖的中间结果、寒暄。
不要编造历史里没有的内容。输出纯文本简报,不要工具调用。

= 历史 =
{history}
= 简报 =
"""

def summarize(msgs_to_compress: list[Msg], call_llm) -> Msg:
    history = "\n".join(f"[{m.role}] {m.content}" for m in msgs_to_compress)
    summary_text = call_llm(SUMMARY_PROMPT.format(history=history))
    return Msg(role="system",
               content=f"[历史摘要]\n{summary_text}",
               compacted=True)

def compact_by_summary(msgs: list[Msg], budget: Budget, call_llm) -> list[Msg]:
    """保留 system 头 + 最近 keep_recent 条原文,中间段落压成一条摘要。"""
    head = [m for m in msgs if m.role == "system" and not m.compacted][:1]
    recent = msgs[-budget.keep_recent:]
    middle = msgs[len(head): len(msgs) - budget.keep_recent]
    if not middle:
        return msgs
    summary = summarize(middle, call_llm)
    return head + [summary] + recent
```

> [!warning] Anthropic 官方实现的两个已知坑(2026-06 状态)
> 即便是 Anthropic 的 `compact_20260112`,也有两个公开缺陷:(1) 模型偶尔在"该写摘要"时跑去调工具;(2) 暂时无法用更便宜的小模型来做摘要(来源:Anthropic Compaction 文档)。这说明摘要这条路在产线上仍不平整——你的最小 loop 里"摘要器调了工具怎么办"这类异常,生产时必须显式兜底。

---

## §5 最小主循环:把守门 + 策略缝起来

现在拼成一个能跑的 loop。注意它只做"压缩"这一件 context engineering 的事——决策、工具执行都用桩(stub)代替,聚焦演示压缩时机。

```python
def run_agent_loop(task: str, budget: Budget, call_llm,
                   strategy: str = "mask", max_steps: int = 30):
    msgs: list[Msg] = [
        Msg("system", "你是一个最小 agent,逐步完成任务。"),
        Msg("user", task),
    ]
    for step in range(max_steps):
        # 1) 守门:超预算就压
        if need_compaction(msgs, budget):
            before = total_tokens(msgs)
            if strategy == "mask":
                msgs = mask_old_tool_results(msgs, budget)
            elif strategy == "summary":
                msgs = compact_by_summary(msgs, budget, call_llm)
            after = total_tokens(msgs)
            print(f"[step {step}] 压缩 {strategy}: {before} -> {after} tokens "
                  f"(省 {100*(before-after)//max(before,1)}%)")

        # 2) 决策(此处用桩;真实环境是 call_llm(msgs))
        action = decide_next_action(msgs, step)   # stub
        if action["type"] == "done":
            return action["answer"], msgs

        # 3) 执行工具(桩),把结果作为 tool 消息追加
        result = run_tool(action)                 # stub,可能返回大段输出
        msgs.append(Msg("assistant", f"调用工具: {action['name']}"))
        msgs.append(Msg("tool", result, tool_call_id=f"call_{step}"))

    return None, msgs
```

跑起来你会看到典型的 **sawtooth(锯齿)曲线**:token 数爬升 → 触线 → 压缩骤降 → 再爬升。这正是 Focus Agent 论文里描述的形态。遮蔽策略下,每次压缩几乎零成本但省得有限;摘要策略下,每次压缩贵一点但能把中段彻底归档。在 100 轮网页搜索的评估里,Anthropic 报告压缩能减少 84% 的 token 消耗(来源:Anthropic Compaction 文档)——这就是这套机制的经济价值上限的一个参考点。

---

## §6 判断主轴:90% 的人在 Compaction 上会搞错的四件事

这一节是本节点与"贴一段代码就完事"的技术博客的分界线。

**错点 1:用轮数而非 token 做触发判据。**
- **症状**:"我每 10 轮压一次,怎么有时还是溢出?"
- **为什么会错**:一轮的 token 量方差极大,读一个大文件就能顶十轮闲聊。
- **正确做法**:守门指标永远是 token 占用比(§2),轮数最多做辅助。
- **真实反例**:Focus Agent 论文发现,被动提示("需要时压一下")只省 6% token,必须显式提示"每 10–15 次工具调用压一次"才省到 22.7%——而后者本质也是在用调用次数逼近 token 预算,且仍需脚手架(来源:[arXiv 2601.07190](https://arxiv.org/html/2601.07190v1))。

**错点 2:默认"摘要比遮蔽好"。**
- **症状**:一上来就上 LLM 摘要,结果 agent 变慢、还偶发遗漏停止信号。
- **为什么会错**:摘要多一次推理、破缓存、可能引入摘要幻觉,还可能把"该停了"总结没。
- **正确做法**:工具输出"用完即弃"的场景先用遮蔽;只有语义密集、需跨步推理的历史才上摘要。
- **真实反例**:JetBrains 数据——遮蔽降本 52%、解决率 +2.6%;摘要反增 15% runtime(来源:JetBrains Research, 2025-12)。

**错点 3:压缩前不锚定"近因",一刀切全压。**
- **症状**:压完之后 agent "失忆",忘了上一步刚做了什么。
- **为什么会错**:近期消息携带当前决策状态,是最高信号的部分;上下文越满,模型越偏向近因(Chroma 的 recency bias 增强观察)。
- **正确做法**:`keep_recent` 永远保留最近 N 条原文(§2 的设计),只压中段。
- **真实反例**:"Lost in the Middle"(Liu et al., TACL 2024,arXiv 2307.03172)的 U 形曲线说明首尾本就比中段被关注得多——压缩要顺着这个曲线,优先归档中段,而非破坏首尾。

**错点 4:把"压缩后的摘要"当成可靠记忆,不做外化。**
- **症状**:关键决策只活在压缩摘要里,几轮后被二次压缩抹掉。
- **为什么会错**:摘要会被反复压缩、会失真;它不是持久层。
- **正确做法**:必须长期保留的东西(架构决策、用户偏好)写进**外部 memory 文件**(`NOTES.md`/memory tool),压缩后重新读回,而不是赌它在摘要里活下来。Anthropic 的明确规则:**假设需要 `CLAUDE.md` 级别保留的内容不会被压缩保留**(来源:[Anthropic Context Engineering Cookbook](https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools))。这正是本专题"信息流四去向"里"外化 memory"那一支——压缩(放 context)解决不了的,要让位给 memory layer。

---

## §7 产品 PM 视角补盲:demo ≠ 生产的七条鸿沟

把这个最小 loop 端上选型会之前,PM 必须知道它和生产实现之间隔着什么。逐条对照:

| # | demo 里的简化 | 生产必须做的 |
|---|---|---|
| 1 | `est_tokens` 用字符/4 估算 | 换真 tokenizer / count_tokens API,否则守门会错判,尤其中文/代码 |
| 2 | 压缩破坏缓存前缀无所谓 | 生产里 Prompt Caching 命中读取仅 0.1x 基础价(见 [Prompt Caching](/kb/基础知识库/prompt-caching/)),频繁压缩=反复让缓存失效=成本反弹,要权衡压缩频率 vs 缓存收益 |
| 3 | 摘要器一定老实输出文本 | 要兜底"摘要时跑去调工具""摘要超长""摘要幻觉"——Anthropic 官方实现也踩这坑 |
| 4 | 压完就扔,无持久化 | 关键状态外化到 memory 文件;压缩 + 记忆工具组合 Anthropic 报告搜索性能 +39%(来源:[Anthropic Context Management 博客](https://claude.com/blog/context-management)) |
| 5 | 单一策略全程跑到底 | 生产是分层组合:Anthropic 推荐"工具结果清除(`clear_tool_uses_20250919`)→ 摘要压缩 → 跨会话持久记忆",阈值各异 |
| 6 | 假设压缩总是净收益 | 迭代精炼类任务压缩反增 110% overhead(Focus Agent),要按任务类型开关 |
| 7 | 没有评估 | 生产必须测"压缩后任务成功率是否掉",压缩是有损操作,不评估等于盲压 |

> [!note] PM 一句话决策版
> 选型时别问"这个框架支不支持上下文压缩",要问三件事:**(a) 触发判据是 token 还是轮数?(b) 能不能选遮蔽 vs 摘要、能不能分层组合?(c) 压缩后有没有把关键状态外化到 memory?** 三个都答不上,这就是个 demo 级实现。

---

## §8 对手框架回应:压缩本身是不是个伪命题?

**反方立场(Cognition,2025):干脆别让上下文变脏。** Cognition 在《Don't Build Multi-Agents》里主张"Share full agent traces, not just individual messages"——与其费力压缩,不如保持单线程、完整保留上下文,因为当前模型跨 agent 通信不可靠,压缩/隔离引入的信息损失常常得不偿失(来源:[Cognition Blog](https://cognition.ai/blog/dont-build-multi-agents))。

**接受**:Cognition 对得很——在上下文还没逼近窗口、任务又需要全局连贯推理时,**压缩是净损失**,本节点 §6 错点 2、§7 鸿沟 6 已经承认这点。盲目压缩确实会切断"该停了"这类信号。

**边界(本节点坚持的)**:Cognition 的"完整保留"假设了一个有限长度的任务。但长跑 agent(几十上百轮工具调用)迟早撞窗口上限,这时不是"压不压"的选择题,而是"主动压 vs 被动崩"——窗口填满后模型不会优雅降级,而是 context rot 加剧、近因偏好失控。所以本节点的赌注是:**压缩不是为了省钱(那是副产品),而是为了在长任务里把信息流维持在模型注意力还能用的区间内。** 短任务听 Cognition 的,长任务这个最小 loop 才有意义——边界就在"任务长度 × 窗口余量"这条线上。

**failure scenario 显式标注**:若任务本质是"反复精炼同一份内容"(写长文、迭代改代码),本节点的压缩 loop 会主动伤害你——它会把上一版的细节当冗余丢掉。这种场景应关掉压缩,改用外部版本快照。

---

## §9 跨域呼应:维特根斯坦的"语言游戏"与"什么算冗余"

压缩的核心动作是判定**哪些 token 是冗余的**。但"冗余"不是 token 本身的属性——同一段 `ls` 输出,在"找文件"的语言游戏里压完即弃,在"审计文件系统变更"的语言游戏里却是核心证据。维特根斯坦的 **语言游戏(language game)** 观点在这里直接改变工程判断:**意义由使用语境决定,脱离任务谈"这条消息有没有用"是无意义的。**

这解释了为什么没有"通用最优压缩策略"——Focus Agent 在探索类任务省 22.7%、在迭代精炼任务反增 110%,不是算法好坏,是同一个"丢弃旧输出"的动作在两个语言游戏里意义相反。对 PM 的硬启示:**任何宣称"自动智能压缩、无需配置"的产品都在回避这个语境依赖性**;真正可用的压缩必须把"什么算冗余"的定义权交还给任务(可配置的保留规则、领域特定的摘要 prompt)。这与 0114认识论 里"事实的语境依赖"是同一条线。

---

## §10 PM 决策启示

- **面试怎么用**:被问"如何控制 agent 的上下文成本",别只说"做摘要"。给出分层答案:token 守门(不是轮数)→ 遮蔽优先于摘要(给 JetBrains 的 52% 降本数据)→ 关键状态外化 memory(给 Anthropic +39% 数据)→ 按任务类型开关压缩。一句话区分你和背书的人。
- **选型怎么用**:用 §7 的三问("token 还是轮数 / 能否选策略 / 是否外化")拷问任何 agent 框架的上下文管理能力。
- **复现怎么用**:从 `strategy="mask"` 起步(零额外推理、不可能幻觉),跑通 sawtooth 曲线建立体感,再升级到 summary,最后接 memory 外化——这条路径对应本专题 [A04 信息流决策框架·四去向](/kb/专题-工程与成本/a04-信息流决策框架-四去向/) 里"放 context / 外化 memory"两支的落地。

---

## §11 与已有节点的关系

- 对照 [m206 - Agent 产品化：记忆机制与技术进展](/kb/工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/) 的"短期记忆四策略(全量/滑动窗口/摘要压缩/选择性保留)":m206 在**概念层**列举了策略,本节点做的是**操作层补缺**——把"摘要压缩""选择性保留"落成可跑代码,并补上 m206 没展开的"触发判据"和"遮蔽 vs 摘要"取舍。属于**深化 + 补缺**。
- 对照 [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/):m209 讲成本控制的全景手段,本节点是其中"上下文 token 控制"这一支的最小实现,提供 §7 鸿沟 2 的缓存权衡细节。属于**对话**(成本视角 ↔ 实现视角)。
- 对照 [m201 - Prompt Engineering 实战体系](/kb/工程化与落地架构/m201-prompt-engineering-实战体系/) 的 Prompt 压缩(LLMLingua):那是**输入级、token 级**的有损压缩;本节点是**会话级、消息级**的压缩。两者正交,可叠加。属于**补缺**(不同压缩层级)。
- 不复述以上节点的事实基础;本节点只补它们未落到代码的操作面。

---

## §12 关联节点

**核心(必读)**
- [m206 - Agent 产品化：记忆机制与技术进展](/kb/工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/) — 短期/长期记忆机制的概念框架,本节点的上位
- [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/) — 压缩省 token 的成本闭环
- [KV Cache](/kb/基础知识库/kv-cache/) — 压缩破坏缓存前缀的底层原因
- [Prompt Caching](/kb/基础知识库/prompt-caching/) — §7 鸿沟 2 的缓存收益权衡
- [Agent](/kb/基础知识库/agent/) — 本节点服务的执行主体

**延伸(可选)**
- [m201 - Prompt Engineering 实战体系](/kb/工程化与落地架构/m201-prompt-engineering-实战体系/) — token 级 Prompt 压缩(正交层级)
- [m205 - RAG 生产环境：索引运维与评估体系](/kb/工程化与落地架构/m205-rag-生产环境-索引运维与评估体系/) — context rot 与评估视角
- [c09 - RAG 架构](/kb/基础知识库/c09-rag-架构/) — 当压缩不够、需要走外部检索时的去向
- [Claude Code](/kb/ai-公司与产品/claude-code/) — 80% 窗口自动压缩的真实产品参照(Rick 一手体感)
- [幻觉](/kb/基础知识库/幻觉/) — 摘要压缩可能引入的摘要幻觉
- [Attention](/kb/基础知识库/attention/) — U 形曲线 / 近因偏好的注意力机制根因
- 0114认识论 — §9 "冗余的语境依赖"的哲学接口
- [AI PM 知识图谱·总索引](/kb/ai-pm-知识图谱/ai-pm-知识图谱-总索引/) — 全局导航

---

## 修订日志
- R1(2026-06-07):首稿。建立"预算守门 + 遮蔽/摘要二选一"最小骨架;给可跑代码;§6 四错点、§7 七鸿沟、§8 Cognition 反方、§9 维特根斯坦语境依赖。事实接地:JetBrains/Anthropic/Focus Agent/Chroma/Liu et al. 数据均带来源年份。

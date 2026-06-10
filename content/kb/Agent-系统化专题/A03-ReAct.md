---
title: A03 ReAct
cluster: Agent 系统化专题
created: '2026-05-18'
updated: '2026-05-18'
---

# A03 ReAct

一句话定义：ReAct（Yao et al., arXiv 2210.03629, ICLR 2023）是一种让 LLM 在「自然语言推理」与「外部动作」之间交错进行的提示范式，把思维链（CoT）与工具调用合并成 Thought → Action → Observation → Thought 的可观察循环，从而把"推理"从模型内部独白变成可被工程检视和回放的轨迹。

## 一、原始论文要点

- 作者：Shunyu Yao（彼时 Princeton 博士生;2024-10 加入 Anthropic,2025-10 转入 Google DeepMind)等;普林斯顿与 Google Brain 合作。预印本 2022-10,ICLR 2023 接收。
- 实验环境：HotpotQA（多跳问答）、FEVER（事实核查）、ALFWorld（具身任务）、WebShop（网购模拟）。
- 关键发现：单独 CoT 会幻觉，单独 Act-only（无思考）会盲动；二者交错可以让模型在 ALFWorld 上的成功率从 25% 量级抬到 70% 量级，且产生的轨迹明显更可读。
- 提示结构：每一步以 `Thought:` `Action:` `Observation:` 三段标签生成，模型自己写 thought，工程层解析 Action 行送给工具，把 Observation 回填进上下文继续下一步。

## 二、为什么是 G1 的奠基性范式

- 它第一次把"推理"和"动作"放在同一个文本流里：在 ReAct 之前，CoT 是"我想"，Function Calling 是"我做"；ReAct 之后才有真正意义上的 Agent loop。
- 它把 Agent 的运行变成一份「日志」：每一步都是可读的、可中断的、可回放的文本，这为 Reflexion、自一致性投票、轨迹评估器等所有后续工作打开了空间。
- 没有 ReAct，就没有今天的 [c10 - Agent 技术栈与工具调用](/kb/AI-基础知识库/c10-Agent-技术栈与工具调用/) 里描述的"工具调用 loop"——它是默认运行时形态的来源。

## 三、与 CoT 和 Tool Use 的区别

| 范式 | 推理可见 | 动作可执行 | 与世界交互 |
| --- | --- | --- | --- |
| CoT（Chain of Thought） | 是 | 否 | 闭环在 prompt 内 |
| 纯 Tool Use / [Function Calling](/kb/AI-基础知识库/Function-Calling/) | 否（直接输出函数名+参数） | 是 | 单步 |
| ReAct | 是 | 是 | 可任意多步 |

ReAct 的关键贡献不是"教会模型用工具"——这件事 toolformer、function calling 都做了——而是**强制要求模型在每次调用工具前后用自然语言陈述理由**。这一约束既是性能来源（明确意图减少滥用工具），也是日后所有可观察性工具（LangSmith、Langfuse、OpenLLMetry）的工程前提。

## 四、与同期工作的边界

- 与 ReWOO（Reasoning WithOut Observation）：ReWOO 提议先一次性规划再批量执行，是对 ReAct"边想边做"成本高的反弹，演化为 [A05 Plan-and-Execute](/kb/Agent-系统化专题/A05-Plan-and-Execute/) 流派。
- 与 Toolformer(Schick et al., Meta AI 2023, arXiv:2302.04761):Toolformer 是在预训练阶段教模型何时插入 API 调用;ReAct 是纯 prompting 方案,不动模型。两者今天已合流——主流模型在 SFT/RLHF 阶段就被"内置 ReAct"。
- 与 [c11 - System 2 思维与 Test-Time Compute](/kb/AI-基础知识库/c11-System-2-思维与-Test-Time-Compute/)：ReAct 是最早的「test-time compute 通过外部循环换取性能」的代表，比 o1 系的"内部长 reasoning trace"早三年。

## 五、四个已被验证的弱点

> **判断先行**：这四个弱点不是"将来研究方向"，而是 PM 在 2026 年写第一份 Agent PRD 时**今天就要做工程预算的四个具体头疼事**——每个都对应一项后续工程化路径（Reflexion / context engineering / Extended Thinking / Plan-and-Execute），不知道这四个弱点就会反复重新发明轮子。

1. **单循环深度有限**：每一步 thought 都依赖上一步 observation 准确；trajectory 超过 ~30 步后误差累积明显，对应 [c10 - Agent 技术栈与工具调用](/kb/AI-基础知识库/c10-Agent-技术栈与工具调用/) 中"复合错误数学（10 步 95% → 60%）"的结构。这就是为什么 [R01 最小可运行·100 行 ReAct](/kb/Agent-系统化专题/R01-最小可运行·100-行-ReAct/) 把 MAX_STEPS 默认设为 10——把这个限制变成可亲手撞墙的体验。
2. **无反思机制**：失败后不会自动总结，必须靠外层 wrapper 补；这正是 [A04 Reflexion](/kb/Agent-系统化专题/A04-Reflexion/) 想要解决的缺口。
3. **长 trajectory 漂移**：上下文越长，模型越倾向于在 thought 里复述前文而不是推进任务（"内卷思考"）；KV 长尾效应明显。
4. **Thought 可被绕过**：当 RLHF 训练的模型被 fine-tune 后，thought 字段经常变成"装饰性自言自语"，真实决策已发生在隐空间。这是为什么 [Anthropic](/kb/AI-公司与产品/Anthropic/) 在 Claude 3 之后引入显式 Extended Thinking（thinking budget 必须显式分配，而不是依赖"请你思考一下"）——细节参 Anthropic 官方 Extended Thinking 文档（docs.anthropic.com，2025 年起作为产品级特性）。从更早的解释性研究（如 Lampinen et al. 2022 关于 LLM step-by-step 解释的可信性研究）开始，学界就已经观察到"模型说的思考"和"模型实际的决策路径"不必然一致；Anthropic 把这一观察转译为工程实践，就是 Extended Thinking 的诞生。

## 与已有节点的关系

- **对 [c10 - Agent 技术栈与工具调用](/kb/AI-基础知识库/c10-Agent-技术栈与工具调用/) 的补缺**：c10 把 ReAct 写为一个表格项；这里把它还原到论文出处与历史地位。
- **对 [A04 Reflexion](/kb/Agent-系统化专题/A04-Reflexion/) 的前置铺垫**：Reflexion 在结构上是 ReAct 的外层包装。
- **对 [Agent](/kb/AI-基础知识库/Agent/) 节点的纠偏**：Agent 节点把"ReAct 框架"列为能力栈之一，给人"ReAct 是一个组件"的错觉；本节点强调它是范式而非组件，是当前几乎所有 agent harness 默认 loop 形状的来源。

## PM 决策启示

- **面试问答**：被问"你怎么向工程师讲清楚 Agent 与 ChatGPT 的区别"时，答 ReAct——一条可被中断和重放的 Thought-Action-Observation 日志，是 Agent 区别于"一次性提问"的最小可识别标志。
- **复现选型**：如果团队只能投入一周做 PoC，跳过 LangGraph，直接手写 100 行 ReAct loop（见 [R01 最小可运行·100 行 ReAct](/kb/Agent-系统化专题/R01-最小可运行·100-行-ReAct/)）足够覆盖 80% 概念验证，比上 framework 学得快。
- **观察评估**：当采购任何"Agent 平台"时，问对方一句"你们 trajectory 长什么样、能不能 export 全部 thought"——能给出完整 ReAct-shaped log 的才有可观察性，否则只是黑箱套壳。
- **避免误用**：纯检索类任务（一次 RAG 就够）不要硬塞 ReAct loop——多一次 thought 多一次幻觉机会。判据：任务是否真的需要 ≥3 步外部交互。

## 关联节点

**核心关联（必读）**：
- [A04 Reflexion](/kb/Agent-系统化专题/A04-Reflexion/)——Reflexion 在结构上是 ReAct 的外层包装
- [c10 - Agent 技术栈与工具调用](/kb/AI-基础知识库/c10-Agent-技术栈与工具调用/)——本节点把 c10 一表格项还原为范式起源
- [c11 - System 2 思维与 Test-Time Compute](/kb/AI-基础知识库/c11-System-2-思维与-Test-Time-Compute/)——ReAct 是最早的 test-time compute 外置形态
- [Function Calling](/kb/AI-基础知识库/Function-Calling/)——CoT + Function Calling 的真正合流形态
- [R01 最小可运行·100 行 ReAct](/kb/Agent-系统化专题/R01-最小可运行·100-行-ReAct/)——亲手验证 § 五四个弱点中的 1-2 个

**延伸关联（可选）**：
- [A05 Plan-and-Execute](/kb/Agent-系统化专题/A05-Plan-and-Execute/)、[A06 Orchestrator 编排器](/kb/Agent-系统化专题/A06-Orchestrator-编排器/)
- [Agent](/kb/AI-基础知识库/Agent/)、范式

---

## 修订日志

- **R3 → R4（2026-05-18）**：本轮 A03 仅做轻微修订(已是较强节点),主要承担一个上游对手立场。
  1. 末尾本节点不动主体内容,但本节点的判断要在 [G01 Agent 代际谱系总图](/kb/Agent-系统化专题/G01-Agent-代际谱系总图/) § 5.4 R4 新增 Lakatos 框架下重新评估:**ReAct 在工业上的代际地位是进步性纲领,因为它一直是上层架构(Reflexion / Plan-and-Execute / Computer Use / Multi-Agent)的原语**——这一点与 G2 AutoGPT / G3 Reflexion / G4 Multi-Agent 的退化性纲领命运不同。
  2. **ReAct 在 LLM Agent 范式下是稳定的工程原语**,Yann LeCun world model 立场(详见 [G01 Agent 代际谱系总图](/kb/Agent-系统化专题/G01-Agent-代际谱系总图/) § 5.1 R4 新增)即便长期对,**也不会影响 ReAct 在 LLM-based Agent 范围内的工程价值**——LeCun 反对的是整个 LLM-based Agent 路径,不是 ReAct 范式本身。
- **R2 → R3（2026-05-18）**：聚焦判断密度提升。本轮修订要点：
  1. § 五加判断先行段——"四个弱点是 PM 今天要做工程预算的四个具体头疼事，不是研究方向"
  2. § 五.4 "Thought 可被绕过"补完整证据链——明确引用 Anthropic Extended Thinking 文档 + Lampinen et al. 2022 学术源——回应 Round 2 [无证据-1]
  3. § 五.1 接 R01 复现的"亲手撞墙"建议，形成 A03 ↔ R01 对话
  4. 关联节点分两档
- **R1 → R2（2026-05-18）**：Shunyu Yao 所在机构修正为"2024-10 Anthropic / 2025-10 Google DeepMind"；Toolformer 引用补全为完整 arXiv 编号。

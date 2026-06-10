---
title: A05 Plan-and-Execute
cluster: Agent 系统化专题
created: '2026-05-18'
updated: '2026-05-18'
---

# A05 Plan-and-Execute

一句话定义：Plan-and-Execute 是与 [A03 ReAct](/kb/Agent-系统化专题/A03-ReAct/)「边想边做」相对立的另一种 agent 形态，先让规划器（planner）一次性生成完整任务列表或 DAG，再由执行器（executor / worker）按计划批量调用工具，最后由汇总器（solver）整合结果——其代表项目从 BabyAGI（Yohei Nakajima 2023-03）、LangChain Plan-and-Execute（Harrison Chase 2023-05）、到 ReWOO（Xu et al., arXiv 2305.18323）一脉相承。

## 一、思想源流（三条独立涌现的线）

1. **BabyAGI（2023-03）**：Twitter 程序员 Yohei Nakajima 用 200 行 Python 演示了「LLM 产 task list → 执行 task → 用结果生成下一批 task」，是大众视野里第一个"自动规划+循环执行"的玩具。
2. **LangChain Plan-and-Execute Agent（2023-05）**：受 BabyAGI 与 [Wang et al. *Plan-and-Solve Prompting*, ACL 2023] 启发，把 ReAct 中"每步都问 LLM 下一步做什么"的高成本结构替换为"先规划一次、再执行一串"。
3. **ReWOO，Reasoning WithOut Observation（Xu et al. 2305.18323）**：把 plan 阶段做得更彻底——一次生成所有 "Plan-Evidence-Worker" 三元组，执行阶段不再回探，仅在最后由 Solver 综合。其核心论点：在 token-cost 视角下，ReAct 把每个 thought 都重新放入上下文，token 复杂度近 O(n²)；Plan-and-Execute / ReWOO 把 thought 一次性写完，复杂度回落到 O(n)。

## 二、与 ReAct 的根本对比

| 维度 | ReAct（边想边做） | Plan-and-Execute（先想后做） |
| --- | --- | --- |
| 决策时机 | 每步动态决定 | 一次决定全部步骤 |
| 上下文成本 | 单步累积，长任务爆炸 | 计划写完后执行阶段轻量 |
| 适应性 | 强（observation 可改变后续） | 弱（计划僵化） |
| 调试性 | 难（步骤随机） | 强（计划即文档） |
| 适合 | 不可预知环境（浏览器、操作系统） | API 流水线、ETL、数据分析 |
| 失败模式 | 长 trajectory 漂移 | 计划阶段误差被放大 |

一句话：ReAct 把不确定性吸收在每一步，Plan-and-Execute 把不确定性押注在第一步。

## 三、什么时候选 Plan-and-Execute

- 任务结构相对固定、步骤数可预估（例如"抓 3 个 API → 清洗 → 写报告"）。
- 工具调用成本远高于 LLM 推理成本（例如调用一次外部数据 API 是 5 秒、几美分），值得用规划减少冗余调用。
- 需要把"agent 在做什么"展示给非技术 stakeholder——一份事先生成的计划比一串 thought 更可读、更容易获得批准（HITL 友好，对接 [m207 - Agent 产品化：场景推演与失败模式](/kb/AI-工程化与落地架构/m207-Agent-产品化：场景推演与失败模式/) 中的 HITL 维度）。
- 任务边界清晰、目标可枚举——典型如"分析这家公司最近三季财报"。

## 四、什么时候不要选

- **环境状态会变**：浏览器、操作系统、CLI——这类 Computer Use 场景下，t=0 的计划在 t=5 时就过时。这是为什么 [Claude Code](/kb/AI-公司与产品/Claude-Code/)、Cursor、Manus 的核心 loop 都是 ReAct 形态而不是 Plan-and-Execute。
- **第一步成本高**：planner 阶段被压上了全部不确定性。如果 planner 写错一步，错误会向后传染整条流水线；没有 [A04 Reflexion](/kb/Agent-系统化专题/A04-Reflexion/) 兜底就是裸奔。
- **任务规模超出上下文**：planner 必须把整个任务装进一次 prompt，过长会触发提示截断；这也是 BabyAGI 在复杂任务上常见的天花板。

## 五、Plan-and-Execute 在 2026 年的真实状态

- BabyAGI 早已停摆，但它把 "task queue" 的隐喻留给了所有后续框架（CrewAI、AutoGen、LangGraph 都有类似抽象）。
- LangChain 官方仍维护 Plan-and-Execute Agent，但社区主流转向 [A06 Orchestrator 编排器](/kb/Agent-系统化专题/A06-Orchestrator-编排器/) 流派——把"plan"显式建模成图（LangGraph）而非隐式 task list。
- ReWOO 的「先规划、Worker 无 observation」结构被 DSPy 等编译式框架吸收，演化为"compile-time planning"——计划在开发阶段固化，运行时不再调用 planner。
- 在多 agent 系统中（见 [A07 Multi-Agent Teams](/kb/Agent-系统化专题/A07-Multi-Agent-Teams/)），Plan-and-Execute 退化为"Manager-Worker"模式的内核：Manager 出 plan，Workers 并发执行。

## 与已有节点的关系

- **对 [A03 ReAct](/kb/Agent-系统化专题/A03-ReAct/) 的对立面补充**：很多 Agent 教材只讲 ReAct，让读者误以为 Agent = ReAct。本节点把 Plan-and-Execute 作为另一种合法答案立起来。
- **对 [m208 - AI 基础设施与中间件选型](/kb/AI-工程化与落地架构/m208-AI-基础设施与中间件选型/) 的概念补缺**：m208 谈框架选型时把 LangGraph 当作主流；本节点回溯其上游思想（Plan-and-Execute → LangGraph 是工程实现层的演化）。
- **对 [A06 Orchestrator 编排器](/kb/Agent-系统化专题/A06-Orchestrator-编排器/) 的前置铺垫**：图编排把 Plan-and-Execute 的"计划"由文本升级为代码结构。

## PM 决策启示

- **选型判据三问的梯度判定**（取代原"任一否就回 ReAct"的二元判定）：
  - 三问全"是" → 直接上 Plan-and-Execute，标准场景。
  - **两问"是"一问"否"** → 仍可用 Plan-and-Execute + replan 兜底（在执行阶段加 replan 触发条件，如某 worker 失败 ≥2 次回 planner）。
  - **一问"是"两问"否"** → 必须回 ReAct，Plan-and-Execute 的"计划即文档"优势已经被环境不确定性吃掉。
  - **三问全"否"** → 必须 ReAct，否则就是把不确定性押在 planner 一个人身上的脆性系统。

  三问回顾：(1) 任务步骤数能否预估？(2) 环境状态是否稳定？(3) 是否需要把计划交给人审批？

- **面试问答**：
  > **Q**："BabyAGI 现在还有人用吗？"
  > **A**："BabyAGI 作为产品死了，作为模式活在 CrewAI 的 Manager-Worker、LangGraph 的 supervisor pattern、AutoGen 的 GroupChat 里。它的'task queue'隐喻是所有后续 multi-agent 框架的隐含底座——所以问 BabyAGI 不如问'你今天用的框架里的 plan 阶段长什么样'。"

- **成本权衡**：Plan-and-Execute 把"思考"集中前置，可显著降低 inference 总量。在 [m209 - 推理成本控制手册](/kb/AI-工程化与落地架构/m209-推理成本控制手册/) 的核算下，长任务可省 30-60% token——但前提是 plan 不需要频繁重写。

- **风险预案**：必须显式设计"replan 触发条件"——例如某 worker 失败 ≥2 次，回到 planner 重新规划。没有 replan 的 Plan-and-Execute 是脆性系统。

## 关联节点

**核心关联（必读）**：
- [A03 ReAct](/kb/Agent-系统化专题/A03-ReAct/)——本节点是 ReAct 的对立面，理解二者对比即理解 Agent 形态的根本分歧
- [A06 Orchestrator 编排器](/kb/Agent-系统化专题/A06-Orchestrator-编排器/)——图编排把 Plan-and-Execute 的"计划"由文本升级为代码结构
- [A07 Multi-Agent Teams](/kb/Agent-系统化专题/A07-Multi-Agent-Teams/)——Plan-and-Execute 退化为 Manager-Worker 即 multi-agent 内核
- [m209 - 推理成本控制手册](/kb/AI-工程化与落地架构/m209-推理成本控制手册/)——Plan-and-Execute 的 token 节省核算

**延伸关联（可选）**：
- [A04 Reflexion](/kb/Agent-系统化专题/A04-Reflexion/)、[c10 - Agent 技术栈与工具调用](/kb/AI-基础知识库/c10-Agent-技术栈与工具调用/)、[m207 - Agent 产品化：场景推演与失败模式](/kb/AI-工程化与落地架构/m207-Agent-产品化：场景推演与失败模式/)、[m208 - AI 基础设施与中间件选型](/kb/AI-工程化与落地架构/m208-AI-基础设施与中间件选型/)、范式

---

## 修订日志

- **R3 → R4（2026-05-18）**：本轮 A05 仅做轻微修订(已是较强节点),主要承担两个上游对手立场。
  1. **Plan-and-Execute 范式与 Anthropic "workflow" 概念的对应关系(R4 显式)**:Plan-and-Execute 本质是 Anthropic *Building Effective Agents* 四档梯度中 "workflow"档(预定义路径)的具体实现——这是本节点判断"步骤可预先规划"场景适合 Plan-and-Execute 的工程基础(详见 [A07 Multi-Agent Teams](/kb/Agent-系统化专题/A07-Multi-Agent-Teams/) § 2.1 R4 新增的 Anthropic 立场精读)。
  2. **Plan-and-Execute 在 2025 下半年起的复兴(R4 显式)**:与 multi-agent 反向去化趋势(详见 [E03 Multi-Agent 框架·AutoGen & CrewAI & DeerFlow](/kb/Agent-系统化专题/E03-Multi-Agent-框架·AutoGen-CrewAI-DeerFlow/) § 3.6.1 R4 新增)同向,**Plan-and-Execute 范式在 2025 下半年起重新回流主流**——业界发现 multi-agent 的"角色分工" 大多可以被 Plan-and-Execute 的"任务分工" 替代,且更可控、更便宜。Plan-and-Execute 不是 G3 时代过时的范式,是 2026 年的主流 default 之一。
- **R2 → R3（2026-05-18）**：聚焦判断密度提升。本轮修订要点：
  1. PM 决策启示"三问"从二元判定升级为四档梯度判定——回应 Round 2 [空洞-2]
  2. 面试问答 Q+A 模板化（"BabyAGI 现在还有人用吗"）
  3. 关联节点分两档
- **R1 → R2（2026-05-18）**：Round 1 同行评议未针对本节点提出具体修订项，无修订动作。

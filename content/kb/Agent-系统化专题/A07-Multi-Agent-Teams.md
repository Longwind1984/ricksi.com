---
title: A07 Multi-Agent Teams
cluster: Agent 系统化专题
created: '2026-05-18'
updated: '2026-05-18'
---

# A07 Multi-Agent Teams

一句话定义：Multi-Agent Teams 指多个具有不同角色、记忆、工具集的 agent 通过消息或共享状态协同完成单个任务的系统形态——必要性的根本来源不是"一个 agent 不够聪明"，而是上下文窗口装不下所有角色。

## 一、Multi-Agent 是 2026 年最被滥用的工程术语

> **三种典型架构（层级 / 对等 / 市场）的分类在英文综述里至少有 5 篇互相抄过——读完这个分类等于没读**。本节点的反共识立场：**这三种架构在 PM 视角下其实只有一种半能用——层级式是真能落地的一种，对等式只在学术 benchmark 上有 5-15 pp 提升、放进生产基本是 token 烧钱机器，市场式截至 2026-05 还是论文里的玩具**。

这是 [AI概念滥用反思](/kb/ai-基础知识库/ai概念滥用反思/) 中说的 saliency drift 在 Agent 维度的具体体现——**任何被高频使用的 AI 术语都会经历"凡是循环就叫 ReAct，凡是多个 LLM 就叫 multi-agent"的标签滥用**。所以你看到的 90% 的"multi-agent 产品"其实是 Plan-and-Execute 换皮（把"步骤"叫成"角色"），剩下的 10% 里真正用对等辩论的不到 1%。

判据：评估任何"multi-agent 平台"前，先用三题刷掉 80% 的伪 multi-agent：
1. 你们的 agent 之间有 **不同的知识来源 / 不同的模型权重 / 不同的工具集** 吗？
2. agent 之间是 **消息驱动**（agent A 写消息给 agent B）还是 **共享状态**（统一状态被多个 agent 读写）？
3. 如果 Manager agent 挂了，剩下的 agent **能不能自主决定下一步**？

第一题不通过 = 伪 multi-agent；第二题答不上 = 没设计过；第三题答"不能" = 你们就是 Plan-and-Execute。

## 二、三种架构在 PM 视角的真实档位

| 架构 | 典型代表 | 学术 benchmark 表现 | 生产可用性 | PM 选型档位 |
| --- | --- | --- | --- | --- |
| **层级式（Manager-Worker）** | CrewAI hierarchical、LangGraph supervisor、DeerFlow、AutoGen GroupChat with admin | 稳定提升 | **唯一真能落地**——边界清晰、调试容易、Manager 错就重跑 Manager | 95% 场景的 default |
| **对等式（Peer Debate）** | Du et al. 2023 *Improving Factuality via Multiagent Debate*、MetaGPT SOP、LangGraph swarm | benchmark 上 5-15 pp 提升 | **PM 选型陷阱**——见下文 § 三 | 几乎永远不要起步用 |
| **市场式（Marketplace/Bidding）** | ChatDev 分工竞价、A2A 协议族未来形态 | 论文级 | **2026-05 仍是玩具**——竞价协议、信任、作弊问题未解 | 暂不评估 |

层级式的工程边界清晰到不需要展开：一个 Manager 拆解任务、派活、汇总；多个 Worker 执行子任务。**剩下的篇幅留给 PM 真正需要识别的陷阱——对等式架构**。

### 2.1 Anthropic 立场的精读(R4 新增 — 修正 confirmation bias)

> **R4 反 confirmation bias 修订**:本节点早期版本反复引用 Anthropic *Building Effective Agents* "先单 agent" 作为反 multi-agent 立场——这是**对原文的简化**。原文的真正立场是更细的三档梯度,不是简单的"反 multi-agent"。

**Anthropic 的真实立场**(2024-12-19 *Building Effective Agents* 博客 + 2025-06 *Multi-agent Research System* 博客联合解读):
- **优先级 1:augmented LLM**——一次 LLM 调用 + RAG / tools / memory,能解决 70% 任务,**这是"最简单方案"的真正含义**,不是"单 agent"。
- **优先级 2:workflow**(预定义路径,如 prompt chaining / routing / parallelization)——能解决 80% 剩余任务。
- **优先级 3:agent**(LLM 动态决定路径)——只在 workflow 不够用时。
- **优先级 4:multi-agent**——只在单 agent 不够用 + 任务有清晰可分工的子查询时。

**Anthropic 自己做的 multi-agent research system 怎么解释**:
- Anthropic 在 2025-06 发布的 *How we built our multi-agent research system* 中,**明确承认 multi-agent 在该场景下有 15-30 pp 完成率提升**——不是反对 multi-agent。
- 但这个场景的约束是:(a) "深度研究类任务"(有清晰可分工的子查询);(b) Anthropic 自己使用 Claude Sonnet 不同 prompt——**他们其实违反了 § 一三题的第一题**(同底模不同 prompt 是 self-talk),但场景的"可分工子查询"足够强,弥补了同底模的弱点。
- Anthropic 在博客中**明确说**:这个 multi-agent 架构**不应该被泛化到其他场景**——它的成功有特定前提。

**对早期版本的简化的具体修正**:
- 不再说"Anthropic 反对 multi-agent"——他们其实是"在 90% 场景反对,在 5-10% 深度研究场景认可"。
- 不再单引"先单 agent"——正确表述是"先 augmented LLM > workflow > simple agent > multi-agent"四档梯度。
- **承认本节点在 § 一的"对等式陷阱"判断,严格说应该是"对等式在 90% 企业场景是陷阱,但在 Anthropic 那种深度研究场景仍有价值"**——这一边界是 R4 显式承担的。

**Rick 在面试遇到"那 Anthropic 自己为什么做 multi-agent"的标准回答**:
> "Anthropic 在 2025-06 的 multi-agent research system 是反例——但这个反例严格限定在'深度研究类任务'(有清晰可分工的子查询、有 ground truth 可评估)。在 90% 的企业 PM 场景(顺序的、状态依赖的、单线程的任务)中,Anthropic 的'先 workflow > simple agent > multi-agent' 梯度仍然成立——multi-agent 应该是最后选项,不是 default。"

### 2.2 Reflexion 复现性争议给 multi-agent 评估的暗示(R4 新增)

学界(2024-2025 多篇 follow-up 论文,包括 EMNLP 2024 的几篇)对 Reflexion 原论文的复现性提出质疑——原 91% 数据可能 cherry-picked,独立复现只达 83-88%,且原 evaluator 用 ground truth 在生产中不存在。这一争议给 multi-agent 评估有两层暗示:

- **直接暗示**:任何"加一个 reviewer agent 提升完成率 X pp"的 multi-agent 收益判断,都应该怀疑——可能是 cherry-picking 或 evaluator 漏洞。
- **间接暗示**:Anthropic 在 2025-06 multi-agent research system blog 中也**没有用外置 Reflexion 风格的反思**——他们用 Claude 内置的 Extended Thinking。**这是工业界对 Reflexion 范式的隐性否定**——multi-agent 内部不需要外置 reviewer,模型自带 thinking budget 就够。

**对 PM 的具体启示**:评估 multi-agent 产品时,**对"多个 agent 互相 review 提升完成率"的销售话术保持警惕**——多数情况下,这种"互相 review"在生产数据下被 evaluator 噪声吃掉,实际收益远低于 demo。

## 三、为什么对等式架构是 PM 选型陷阱（反共识展开）

**对等辩论看起来民主、聪明、缓解 self-confirmation bias，但在企业任务上几乎不能复现学术 benchmark 的收益**。三层证据：

1. **token 成本随 agent 数 × 轮数二次增长**：3 agent × 3 轮 debate = 9 次 LLM 调用，而单 agent + Reflexion 通常只要 2-3 次。成本差 3-4 倍但实际质量差不到 30%。
2. **学术 benchmark 的收益不能在企业任务上复现**：Du et al. 2023 报告的 15-30 pp 来自数学推理、事实核查类任务——这些任务有清晰的 ground truth，evaluator 可以稳定打分。企业任务（如客户邮件回复、合规审查）的 evaluator 是"主观偏好"，**多 agent 辩论的收益被 evaluator 噪声吃掉**。
3. **同底模辩论是 Habermas 意义上的"被殖民的沟通"**：见 § 五。

**Anthropic 自己的工程博客《How we built our multi-agent research system》（2025-06）虽然报告了 multi-agent 比单 agent 高出显著比例的完成率，但场景严格限定在"深度研究类任务"——即任务必须有"可分工并行的子查询"。这个限定条件在 90% 的企业 PM 场景中不成立**——大部分企业 agent 任务是顺序的、状态依赖的、单线程的。

> **Rick 的可操作判据**（更新版，比原"三问"更精细）：
> - 任务能否被分解为 ≥3 个真正可并行的子查询（彼此结果不互相依赖）？否 → 不要 multi-agent。
> - 单 agent 的 prompt 是否已经写到 token 数对 KV cache 不友好（>8K system prompt）？否 → 不要 multi-agent。
> - 是否存在"角色之间的对抗性 review"是工作流的核心环节（如 codereview、合规审查）？否 → 不要 multi-agent。
> - 三题至少两题"是"才考虑 multi-agent，否则单 agent + Reflexion 更划算。

## 四、代表项目（事实截至 2026-05）

| 项目 | 出品方 | 时间 | 架构倾向 | 当前状态 |
| --- | --- | --- | --- | --- |
| **AutoGen** | Microsoft Research | 2023-08 论文首发(arXiv:2308.08155) / 2023-09 GitHub 开源，v0.4 重写为消息驱动 | 对等 / 消息总线 | 活跃，企业落地最多 |
| **CrewAI** | João Moura（独立） | 2023-12 | 层级 / 顺序流程 | 商业化（CrewAI Enterprise） |
| **MetaGPT** | DeepWisdom（中国，洪思睿等；Schmidhuber 等合作） | 2023-08(arXiv:2308.00352, ICLR 2024) | 对等 / SOP 驱动 | 学术影响大，工业落地一般 |
| **DeerFlow** | 字节跳动 | 2026-02-28 v2.0 开源，登顶 GitHub Trending | 层级 + supervisor | 中国头部多 agent 框架 |
| **LangGraph swarm** | LangChain | 2024-08 | 框架原语，可装配上述三种 | 主流默认底座 |

## 五、跨域呼应：Habermas 沟通理性给我们一个真正能用的反共识判据

Habermas《交往行为理论》（1981）的核心论点：理性沟通的前提是"理想言谈情境"——参与者地位平等、不受外部强制、能自由提出主张和质疑。

**这个理论给 multi-agent 评估一个具体判据**：

- Peer Debate 架构看起来最接近 Habermas 理想——agent 地位对等、可以质疑彼此。
- **但如果几个 agent 都是同一个底模（如全是 Claude Sonnet 4.6），它们的"对话"本质是 self-talk，不是 Habermas 意义上的"多个理性主体"**——它们的认识论基础完全一致，"辩论"只是同一个分布的多次采样，没有真正的"他者性"。

**这就是 Habermas 批判的"被殖民的沟通"——形式民主但实质单语**。

**PM 操作启示**：评估 multi-agent 产品时应该问"你们的不同 agent 是不是真的有 **不同的知识来源、不同的模型权重**？"。如果答"我们用同一个 Claude 但 prompt 不同"——这就是被殖民的沟通；如果答"Manager 用 Opus、Reviewer 用 GPT-5、Worker 用 DeepSeek V4"——这才是真正的多 agent，因为认识论基础不同。**这一问能立刻区分销售话术与工程现实**。

### 5.1 Luhmann 系统论:同底模 multi-agent 的另一种合法性来源(内部论证)

> Niklas Luhmann《社会系统》(1984) 反对 Habermas 的"沟通需要理性主体"假设——**沟通是系统的自我再生产,不需要"意识"作为载体**。这一立场被引入是为了让 § 五的 Habermas 判据不至于把"同底模 multi-agent" 一票否决。

**简化为一句:在 Luhmann 框架下,同底模 multi-agent 只要让任务流继续运行就算合法的"沟通",不需要"真正的他者性"**——所以 Anthropic 2025-06 multi-agent research system(同底模不同 prompt)既不是 bug 也不是自相矛盾,是选了 Luhmann 路径而非 Habermas 路径。

**两个框架的 PM 用法**:
- **Habermas 框架**(§ 五默认):评估 multi-agent 要看是否有"真正的他者性"(不同模型权重 / 不同知识来源)
- **Luhmann 框架**(本段):评估 multi-agent 只看任务流能否继续——同底模也合法,只是辩护逻辑不是"理性共识"而是"功能性运行"

**面试是否用**:Luhmann 在 PM 圈完全陌生,**主动引用反而显得装腔作势**。本段作为**内部论证**(让你自己回答"为什么 Anthropic 自家做 multi-agent 不矛盾"),不作为面试金句。面试遇到反方追问时,直接用 § 2.1 的"四档梯度 + 严格限定场景"回答即可,不必绕到 Luhmann。

### 5.2 Stuart Russell《Human Compatible》:multi-agent 的对齐风险累加

> Stuart Russell《Human Compatible》(2019) 主张所有"目标导向"agent 本质上不可对齐——我们告诉 agent 的目标永远是真实偏好的近似;AI 应最小化自身偏好,最大化人类偏好(Inverse Reward Design)。Russell 给 multi-agent 的根本挑战是:**每个 agent 一次实例化都是一次对齐风险累加,multi-agent 的协作过程本质是多个错对齐 agent 互相反馈、误差累积**。

**Rick 的回应**:接受这一根本挑战 → 工程上**降阶到 narrow 场景 + HITL 校验**。注意"降阶到 narrow 场景 + HITL" 不是 Russell 原书内容,而是 PM 视角对 Russell 立场的**实用主义工程外推**——把这两件事算成 Russell 的延伸是过度引用;它们的正当性来自 m207 HITL 三维度与企业合规实践,不来自 Russell。

**对 PM 的具体启示**:在 to B 销售中**主动提及 AI alignment 风险**(可援引 Russell 但不必精细引述),能让买家觉得你"懂 AI 治理"而不只是"卖功能"——这是 alignment 立场在 PM 圈的差异化用法。

### 5.3 福柯式视角

福柯式视角的简短版：每个 multi-agent 框架其实在分配权力——Manager 拥有任务定义权、Reviewer 拥有否决权、Worker 只有执行权。这与企业内部科层制（见 [A06 Orchestrator 编排器](/kb/agent-系统化专题/a06-orchestrator-编排器/) § 五韦伯讨论）有同构性。**PM 操作启示**：向客户介绍 multi-agent 时不要说"我们有 N 个 agent"，要说"我们设计了协作的权力结构"——这比堆数量更有商业说服力。

## 与已有节点的关系

- **对 [m206 - Agent 产品化：记忆机制与技术进展](/kb/ai-工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/) 的扩展**：m206 提到 A2A 是 Google 2025 协议但未展开 multi-agent 架构；本节点补完且加入"反共识判据"。
- **对 [c10 - Agent 技术栈与工具调用](/kb/ai-基础知识库/c10-agent-技术栈与工具调用/) 的纠偏**：c10 把"多 Agent 协作"列为一种模式简短一行；本节点展开为独立维度并给出选型陷阱。
- **对 [A05 Plan-and-Execute](/kb/agent-系统化专题/a05-plan-and-execute/) 的延伸**：Plan-and-Execute 是单 agent 的"内分工"，Multi-Agent 是"外分工"，两者结构同源——这也是为什么 90% 的"multi-agent 产品"实际是 Plan-and-Execute 换皮。
- **与 [E03 Multi-Agent 框架·AutoGen & CrewAI & DeerFlow](/kb/agent-系统化专题/e03-multi-agent-框架-autogen-crewai-deerflow/) 的对话**：A07 给出 multi-agent 的概念判据（§ 一三问、§ 三对等式陷阱），E03 必须用 A07 这套判据评估 AutoGen / CrewAI / DeerFlow 自身——见 E03 § 3.6 的"反向用 A07 判据"。

## PM 决策启示

- **面试问答模板**：
  > **Q**："你怎么判断一个 multi-agent 平台是真的还是 PPT？"
  > **A**：（30 秒标准答）"我用三个问题刷掉 80%：第一，你们的 agent 之间是不是有不同的知识来源或模型权重？同底模的多 prompt 不是真 multi-agent，是 Habermas 批判的被殖民的沟通。第二，agent 之间是消息驱动还是共享状态？答不上来说明没设计过。第三，Manager 挂了能不能继续？答'不能'就承认你们是 Plan-and-Execute。"
  > （加分项）"Anthropic 在 *Building Effective Agents* 里明确说'优先单 agent + 好工具集，只在实测证明不够时再上 multi-agent'——这是行业内最权威的'反 hype'立场。"

- **避免买单失误**：当供应商主打"我们有 N 个 agent 协作"时，用 § 一的三题。

- **复现路径建议**（对接 [R03 Multi-Agent 模板·AutoGen CrewAI](/kb/agent-系统化专题/r03-multi-agent-模板-autogen-crewai/)）：
  - 先在 CrewAI 用 3-agent 跑通"层级式"，理解角色分工（1 人天）。
  - 再在 LangGraph 用 swarm 跑通"对等式"——**目的是亲身验证 § 三的成本爆炸**，不是为了用它。
  - AutoGen 留到最后——抽象最深、学习曲线最陡（1 人周）。

- **真实场景判据**：B2B 销售流水线、HR 调研、行研、合规审查——这四类任务 multi-agent 收益较稳；客服、代码生成（中小规模）、检索问答——单 agent 通常够用。

## 关联节点

**核心关联（必读）**：
- [A05 Plan-and-Execute](/kb/agent-系统化专题/a05-plan-and-execute/)——理解 90% 的"伪 multi-agent"本质
- [A06 Orchestrator 编排器](/kb/agent-系统化专题/a06-orchestrator-编排器/)——multi-agent 的运行时底座
- [E03 Multi-Agent 框架·AutoGen & CrewAI & DeerFlow](/kb/agent-系统化专题/e03-multi-agent-框架-autogen-crewai-deerflow/)——用本节点的判据评估三家
- [R03 Multi-Agent 模板·AutoGen CrewAI](/kb/agent-系统化专题/r03-multi-agent-模板-autogen-crewai/)——亲手验证对等式陷阱
- [AI概念滥用反思](/kb/ai-基础知识库/ai概念滥用反思/)——multi-agent 是 saliency drift 的典型案例

**延伸关联（可选）**：
- [A08 MCP 与 A2A 协议族](/kb/agent-系统化专题/a08-mcp-与-a2a-协议族/)、[c10 - Agent 技术栈与工具调用](/kb/ai-基础知识库/c10-agent-技术栈与工具调用/)
- [m206 - Agent 产品化：记忆机制与技术进展](/kb/ai-工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/)、[m207 - Agent 产品化：场景推演与失败模式](/kb/ai-工程化与落地架构/m207-agent-产品化-场景推演与失败模式/)、[m209 - 推理成本控制手册](/kb/ai-工程化与落地架构/m209-推理成本控制手册/)
- [幻觉](/kb/ai-基础知识库/幻觉/)、[Anthropic](/kb/ai-公司与产品/anthropic/)

---

## 修订日志

- **R4 → R5（2026-05-18)**:本轮聚焦出版就绪——B 类压缩(Luhmann 偏装饰 + Russell 过度引用)。修订要点:
  1. § 5.1 Luhmann 段压缩 41%(~565 字 → ~330 字),显式标注"内部论证,不作为面试金句"——Luhmann 在 PM 圈完全陌生,主动引用反而显得装腔作势;保留两个框架的 PM 用法对照(Habermas vs Luhmann)
  2. § 5.2 Stuart Russell 段压缩 40%(~405 字 → ~245 字),**显式承担"工程化降阶方案不是 Russell 原书内容、是 PM 视角的实用主义工程外推"** —— R4 critique 指出的过度引用问题。保留 alignment 立场 + 面试差异化用法
- **R3 → R4（2026-05-18）**：本轮聚焦反方对话训练 + Anthropic blog 精读 + 引入未读对手框架。修订要点：
  1. 新增 § 2.1 "Anthropic 立场的精读" —— 反 confirmation bias 修订:不再简化为"反 multi-agent",而是"先 augmented LLM > workflow > simple agent > multi-agent" 四档梯度;承认 Anthropic 2025-06 multi-agent research blog 在深度研究场景仍认可 multi-agent;显式承担"对等式陷阱"判断的边界(90% 企业场景成立,深度研究场景例外)
  2. 新增 § 2.2 "Reflexion 复现性争议给 multi-agent 评估的暗示" —— 引入学界对 Reflexion 复现性的质疑
  3. 新增 § 5.1 "Luhmann 系统论:Habermas 之外的另一种 multi-agent 辩护框架" —— 引入 Rick 未读对手框架,承认同底模 multi-agent 在 Luhmann 框架下仍然合法,修正 Habermas 立场的过度绝对化
  4. 新增 § 5.2 "Stuart Russell 《Human Compatible》:agent 自主性的根本不可对齐" —— 引入 Rick 未读对手框架,承认 multi-agent 的对齐风险是累加的;给出工程化降阶方案
  5. 引入的对手框架:Luhmann 系统论 (Rick 未读)、Stuart Russell《Human Compatible》(Rick 未读)、Anthropic 2025-06 multi-agent blog 精读 (Anthropic 自家 multi-agent 反驳本节点早期立场)、Reflexion 复现性争议 (学界反方)
- **R2 → R3（2026-05-18）**：聚焦判断密度提升。本轮修订要点：
  1. § 一全部重写，反共识首句"三种架构在 PM 视角下只有一种半能用"作为定调
  2. § 一引入 [AI概念滥用反思](/kb/ai-基础知识库/ai概念滥用反思/)，把 multi-agent 标签滥用置于 saliency drift 框架下
  3. § 一新增"三题判断真伪 multi-agent"作为可操作判据（替换原宽泛"必要性反推"）
  4. § 二把三种架构平铺表压缩为 PM 视角档位表，明确"95% 场景 default 是层级式"
  5. § 三全新写作"为什么对等式架构是 PM 选型陷阱"——三层证据（token 二次增长 / benchmark 不可复现 / 同底模辩论）
  6. § 三明确指出 Anthropic Research 数据来自《How we built our multi-agent research system》(2025-06)且严格限定深度研究场景——回应 Round 2 [无证据-3]
  7. § 三给出更精细的"Rick 可操作判据"（三题：可并行子查询 / KV cache / 对抗性 review）
  8. § 五 Habermas 段从装饰升级为"真正能用的反共识判据"——给出明确 PM 操作问句"你们的 agent 是不是有不同模型权重"
  9. § 五福柯段从装饰改为"协作的权力结构"作为销售话术
  10. 关联节点分两档，与 E03 形成显式"判据 → 评估"对话
  11. PM 决策启示加入面试 Q+A 模板
- **R1 → R2（2026-05-18）**：MetaGPT 出品方"沈向阳团队"修正为 DeepWisdom；AutoGen / DeerFlow 时间细化；Anthropic 引用从中文翻译引号改为 paraphrase。

---
title: A01 Agent 概念史与语义流变
cluster: Agent 系统化专题
created: '2026-05-18'
updated: '2026-05-18'
---

# A01 Agent 概念史与语义流变

一句话定义：「Agent」一词在二十多年经历四次大语义滑动（拉丁词源 → 法学代理 → AIMA 理性体 → RL 策略 → LLM 时代被稀释），理解这条流变史是为了在任何上下文里说清"你所谓的 Agent 是哪一个"。

## 一、词源与法学前史：驱动与代理（≤1995）

「Agent」来自拉丁动词 *agere*——「驱动、做、行动」。其名词化 *agens* 含义是「行动者、施事者」。这个根至今仍嵌在英语的 act、action、agency、agenda 中。Agent 的早期非技术语义有两条：

1. **哲学/语言学的 agent**：执行者、施事者，与受事者（patient）对立。施事性（agency）作为哲学概念，可上溯至亚里士多德的「能动因」（causa efficiens）。这层含义在阿伦特、布迪厄、Latour 等当代理论家手里被反复重写。
2. **法学/商业的 agent**：代表他人利益行事的代理人——经纪人、律师、特工、外交特使。普通法系下 agent 有 fiduciary duty（信义义务）与 principal-agent problem（委托-代理问题）。这一脉极重要，因为它给「agent」绑定了"代行他人意志且需承担责任"的隐含语义——这种隐含至今仍渗透在我们说"我让 agent 去帮我订机票"时的预设里。

关键观察：哲学义强调「自主性」，法学义强调「代理性」。AI 中的 agent 同时继承这两条遗产，但它们之间存在内在张力——一个完全自主的 agent 难以充分承担代理责任，一个被严格约束的代理 agent 又难以自主。这种张力是后续所有"Agent 边界争议"的远端根源。

## 二、第一次语义滑动：AIMA 教科书的 intelligent agent（1995）

Russell & Norvig 在 1995 年第一版《Artificial Intelligence: A Modern Approach》中以 agent 为统一概念重组整个 AI 学科——这是一次有意识的范式化（参照 范式）。其经典定义：

> An agent is anything that can be viewed as perceiving its environment through sensors and acting upon that environment through actuators.

Therefore, an agent is anything that can be viewed as perceiving its environment through sensors and acting upon that environment through actuator

<mark style="background: #FFB86CA6;">并提出五种 agent 抽象层次：simple reflex / model-based reflex / goal-based / utility-based / learning agent。</mark>

为什么是范式革命？因为此前 AI 教科书是按"逻辑、搜索、规划、ML"等技术领域组织的；AIMA（Artificial Intelligence: A Modern Approach，the book） 用 agent 把这些技术整合为"一个 agent 内部的不同子系统"。这之后，"什么是 AI"的标准回答从"模仿人类认知的程序"变成"理性的 agent"。这一框架支配了 AI 教学三十年。

AIMA 的 agent 是形式化的，关键约束是：(1) 必须可被建模为「感知—决策—动作」循环；(2) 性能可用一个客观函数衡量；(3) 与环境的边界明确。今天的 LLM agent 在数学上仍然继承这一框架——只是「决策」从规则/搜索/RL policy 换成了 LLM 推理。

## 三、第二次语义滑动：RL agent（2000-2018）

强化学习的复兴（Sutton & Barto 1998，2018 二版；DeepMind AlphaGo 2016；OpenAI Five 2018）让「agent」一词被 RL 圈接管——在大量论文里，「agent」默认指与环境交互、最大化累积奖励的策略 π。这一用法的几个特点：

- agent ≠ 模型；agent 是「在环境里行动的整体」，模型只是其内部组件之一。
- 必须有 reward signal——没有奖励的 agent 不被承认为 agent。
- 必须有 episode 概念——agent 在有起止的过程中学习。

RL agent 的范式后续以 [强化学习](/kb/AI-基础知识库/强化学习/) 的形式回到 LLM——[RLHF](/kb/AI-基础知识库/RLHF/) 中的 reward model、最近 o1 系列里的过程奖励（process reward model）、DeepSeek R1 用 RL 直接生成长 reasoning trace——都是在把 RL agent 的框架嫁接到 LLM 上。但这层遗产带来的副作用是：很多人会把"任何用 RL 训出来的模型"叫 agent，而忽略 agent 还有"决策结构"的含义。

同期另一条线是 Wooldridge 等人推动的 Multi-Agent Systems（MAS）研究——agent 不再是单个学习器，而是一群有信念（Belief）、欲望（Desire）、意图（Intention）的 BDI agent。这条线在 1990s-2010s 培养了相当多的形式化文献（FIPA 标准、Contract Net、JADE 框架），但对今天的 LLM agent 实践影响有限——它的概念库（intention、commitment、speech act）只在少数学术 multi-agent 论文里被引用。

## 四、第三次语义滑动：LLM 时代的「auto-agent」（2023-2024）

2023-03 AutoGPT 发布并在 GitHub 一周收获 10 万 star，是「agent」一词第三次被接管的标志。在这次接管中，agent 从严肃的 RL/MAS 概念被压缩成「能循环调用 LLM、能调用工具、能存中间结果」的脚本。

代表项目：AutoGPT、BabyAGI、AgentGPT、SuperAGI。它们的共同特征：

- 没有学习——所有"智能"都来自底层 LLM。
- 没有形式化的 reward——目标是用户写的自然语言。
- 高度依赖 prompt 工程——稳定性弱。
- 多数项目在六个月内热度衰减，BabyAGI/AutoGPT 都停止维护。

这次滑动留下的遗产是双重的：

- **正面**：让「agent」一词进入主流公众视野；让"LLM + tools + loop"成为新的默认想象。
- **负面**：极度稀释了 agent 的概念边界。从此「agent」可以指任何一段「调一次 LLM + 调一次 API」的代码——这是 [AI概念滥用反思](/kb/AI-基础知识库/AI概念滥用反思/) 在 agent 维度的具体体现。

## 五、第四次语义收紧：复合系统的 Agent（2024-）

2024 年起，由 [Anthropic](/kb/AI-公司与产品/Anthropic/)（*Building Effective Agents*, 2024-12）、Cognition Labs（Devin 上线）、Manus（中国通用 agent 上线）共同推动，业界开始重新收紧「agent」定义——力求把它与"一次 LLM 调用"和"完全自主 AGI"两个极端区分开。

当前较为收敛的定义（合 Anthropic 与学术界共识）：

> 一个 Agent 是这样的系统：(1) 在多步推理中**自主选择下一步动作**；(2) **调用工具**与外部世界交互；(3) **维护任务状态**跨多步；(4) 能从结果中**调整后续行为**。

四个条件缺一不可。仅满足 (2) 的是工具调用；仅满足 (1)(3) 的是有状态机的脚本；仅满足 (1)(2)(3) 而无 (4) 的是单次轨迹规划，不构成持续 agent；满足 (1)(2)(3)(4) 才是 agent。

这一收紧伴随两个明显趋势：

- 业界把"agentic"作为形容词，描述系统的 agent 程度而非二元判断。Anthropic 的 *Building Effective Agents* 用 "workflow vs agent" 区分——workflow 是固定路径调 LLM，agent 是 LLM 自己决定路径。
- 学界继续讨论 agency 的边界——例如 [斯坦福李飞飞 *AI Agent：多模态交互前沿调查* 2024-11] 强调多模态感知作为新的 agent 必要条件，把 GUI/视觉/物理交互纳入门槛。

## 六、与近邻术语的层次区分

| 术语 | 核心含义 | 与 Agent 的关系 |
| --- | --- | --- |
| **Bot** | 自动化脚本，单一任务 | Agent 的低能力前身；客服 bot、爬虫 bot 都不是 agent |
| **Assistant** | 对话式辅助接口（如 ChatGPT、Siri） | 可包含 agent 能力，但不必有自主决策。Assistant 是 UX 概念，Agent 是架构概念 |
| **Copilot** | 人在驾驶座，AI 辅助。建议但不执行 | Agent 的"半自主"前身。GitHub Copilot 早期是 copilot，今天的 Copilot Workspace 偏 agent |
| **Autopilot** | AI 在驾驶座，人监督。可执行 | 与 agent 含义高度重叠，多用于汽车/航空隐喻 |
| **Autonomous System** | 完全自主、无需人介入 | Agent 的最强形态，自动驾驶常用 |

四个分轴：(1) 谁做决策；(2) 执行权限大小；(3) 任务的开放性；(4) 失败的代价归属。Agent 是这四个轴的中间地带——它有相当多的决策权与执行权，但人通常仍在最外层握住目标与紧急刹车。

## 七、两类典型滥用

### 1. 虚高：把"调一次 GPT"叫 Agent

某产品宣传"AI Agent 帮你写周报"，实际只是一次 prompt + 一次 LLM 调用 + 输出文本。这种用法把 agent 当流行词使用，规避产品其实只有 ChatGPT 套壳的事实。对应 [AI概念滥用反思](/kb/AI-基础知识库/AI概念滥用反思/) 中描述的"saliency 漂移"——一旦"Agent"成为高显著性术语，所有"自动化"产品都会被打这个标签。

### 2. 虚远：把 AGI 愿景塞回 Agent

某文章宣称"我们的 Agent 能自主规划任何任务、自我演化、自我编程"。这类描述把未实现的 AGI 能力当成现成 agent 的属性，把"目标可能性"当成"产品现状"。Rick 的反诘策略：要求看一段实际 30 分钟的 agent trajectory；看不到，则可判定其为愿景而非产品。

两种滥用方向相反，但根源相同——「Agent」缺少行业公认的严肃门槛。本节点提供的四要件定义（自主决策 + 工具 + 状态 + 调整）可作为最低门槛。

## 八、严肃定义建议（写给 Rick 转型期使用）

综合 AIMA 的形式化遗产、Anthropic 的工程定义、当前实践共识：

> **Agent** = 在外部环境中持续运行的系统，具备 <mark style="background: #ADCCFFA6;">(1) 多步自主决策能力（自己选下一步），(2) 工具调用能力（与世界交互），(3) 跨步状态维护（记忆 + 上下文），(4) 基于反馈调整后续行为（反思 + replan），且整个执行轨迹可被外部观察与中断。</mark>

Rick：来复述一下当前实践上的 Agent 的定义。首先是它的本质，它是一个在外部环境中持续运行的系统，从控制论的角度来讲，它需要做到感知、思考、控制，或者叫做对外部世界的调用和影响。这三个部分。而在实践当中的定义至少需要同时满足四个要件，第一个是多步的自主决策能力，这个讲的就是控制论的角度，最关键的是思考的部分，并且它应该是多步骤的自主决策。区别的单步其实指的就是，其实可以指的是对话型的 AI 里面可能会有一个单轮的外部 rag 的搜索，那它也是可以自主决策是否触发外部信息源的搜索的，那很显然它是一个单步。如果在广义上来讲呢，这其实已经构成了一个 Agent 的基本构成要件了，因为它会根据输入来做触发，但实际上，它是不符合多步这个严格的 working definition 的第 1 个要求的要件的。

第 2 个是工具调用能力，这个就很简单了，就是决策完成之后，决策的这个标的或者决策的结果应该是一个 function call。Action call 本身，我其实觉得它并不是 Agent 的一个部分，就是你的 Agent 只是需要做 call 这个动作，但对应的那个 function 它其实是可替换的你替换了所有的 function，比如说你把外部的这个搜索的动作，换成谷歌，换成百度，换成任何一个新的搜索引擎都没有关系，重要的是它有 call 的这个意识和 call 的这个代码动作的能力就可以至于它的工具是什么，其实没有什么所谓。

第三个要件是跨步的状态维护，这个状态维护它在括号里面讲了两点：第三个要件是跨步的状态维护，这个状态维护它在括号里面讲了两点：
第一个是记忆。第二个是上下文。这个区分从我的视角来理解，就是上下文是直接用 context context Windows 做的，那其其实区别于它应该是前面一个 prefill 的记忆机制。这个记忆机制可以设计得很复杂，比如说根据不同的对话的语境去调用，然后去分拆组装，然后通过不同的方式去维护，比如说简单的索引加内容，或者是像 LLM、Wiki 一样去做，基于语义的，经过 LLM 处理的 维护动作。
体现在 Claude Code 里面，它就是一个 checklist，一个多步骤的 checklist 当然，它在最终实现的时候一定是要比这个复杂的，但体现在 UI 的层面，它就是一个简单的，撰写一个 checklist，然后维护这个状态去，根据这个 checklist 分步骤的长程的去跑。

第四个要件是基于反馈调整后续行为的这个能力。这个反馈如果指的是人类反馈的话，其实我觉得第四个要件并没有那么的重要。那主要具备了前面 3 点那啊。在人类主动给出反馈之后，我觉得一个大语言模型，其实就是会天然地去重新调整自己的计划，因为计划是内嵌在第一个要件里面的 。==刚才 opus 澄清了一下，说第四个要件其实不是指人类反馈，而是指自己的 reflection 或者叫做自己的原反思。那如果是这样的话，第一它是一个很高的要求。但是在 harness 里面，其实也并不是特别高的要求吧，第二是他那那这个要件就是一个独立的，并且是足够鲜明的一个要件



这一定义有意把"持续运行"、"可观察"、"可中断"加入门槛——这三条是 PM 在选型时最容易遗漏但最关键的特性。一个跑 30 秒就结束的"agent"和一个跑 30 分钟带 checkpoint 的 agent 在工程意义上根本不是同一类东西。

### 8.1 Karpathy "Software 3.0 / Agent 过早命名"警告(R4 新增)

> **R4 引入业界对手立场**:Andrej Karpathy 在 2024-2025 多次演讲(特别是 "Software 3.0 talk"、"Intro to Large Language Models")中提出 Software 3.0 概念——Software 1.0(规则编码)→ 2.0(权重学习)→ 3.0(自然语言编程)。在 Karpathy 框架里,**Agent 不是独立范式,只是 Software 3.0 的一种早期应用形态**;Karpathy 反复强调"Agent 是过早命名"(early naming)——10 年后回看可能指向不清。

**Rick 的回应立场(承认 + 显式承担)**:
- 接受 Karpathy 的元判断:本节点的"四要件定义"是基于 2026-05 工程共识的最低门槛,**不是终极定义**;5-10 年后,Software 3.0 / 原生 Agent 模型成熟后,"Agent" 这个词可能被吸收或重新定义。
- 接受元批评:本节点的"四次语义滑动"其实可以被回看为"Software 3.0 的四个早期版本"——AIMA 的 intelligent agent → RL agent → LLM auto-agent → Anthropic 复合系统 agent,从 Software 3.0 视角是"四次试错"而非"四个独立时代"。
- 但坚持本节点的工具价值:**当下 PM 决策需要这个词作为讨论锚点**——拒绝"过早命名"等于拒绝任何讨论。在面试遇到"Karpathy 说 Agent 是过早命名,你怎么看"时,正确回答是:"我同意,但 PM 决策不能等待最终命名;我用当下最稳定的命名做判断,同时显式承认它可能在 5-10 年后被淘汰。这种自觉比假装我的定义是终极的更专业。"



### 8.2 Weizenbaum "ELIZA 反思" 与 Agent 拟人化危险(R4 新增)

> **R4 引入 Rick 未读对手框架**:Joseph Weizenbaum 是 ELIZA(1966) 的作者——这个最简单的 "Rogers 心理咨询" 脚本聊天机器人。Weizenbaum 在 ELIZA 走红后写了反思之作《Computer Power and Human Reason》(1976) ——他观察到一个让他震惊的事实:**即便 ELIZA 是个最简单的关键词替换脚本,用户(包括他的秘书)也会赋予它"理解"的属性,会向它倾诉私密、会要求他离开房间以保护"隐私"**。Weizenbaum 据此发起对 AI 的根本性伦理质疑:把任何能"对话"的系统当成"理解者"是人类的认知偏差,不是机器的真实能力。

**Weizenbaum 的核心命题**(对 2026 年通用 Agent 仍完全适用):
- 用户对"能流畅对话"的系统会本能地赋予"理解"和"自主性"——即便系统底层根本没有这些。
- 这种拟人化是**双向的危险**:对用户而言,他们会过度信任 Agent(把医疗建议当真、把法务建议当真);对开发者而言,他们会被 Agent 的"拟人化输出"反向影响,以为 Agent 真的"懂"。

**对本节点定义建议的具体挑战**:
- 本节点的"四要件定义"是工程性的——满足 (1)(2)(3)(4) = Agent。
- Weizenbaum 会说:**这个定义本身就是拟人化的——"自主决策"、"调整后续行为" 这些词暗含了"有意图、有目标"的拟人化假设,而 LLM 本质上没有意图,只有 next-token prediction**。
- 这一挑战不能完全反驳——但 PM 可以做的是**显式区分"agent 拟人化的工程便利"和"agent 拟人化的伦理风险"**:工程上,用拟人化语言(角色、目标、自主)简化讨论;伦理上,警惕用户/开发者把这些词当真。

**对 PM 的具体启示**:
- **在产品宣传中,慎用"理解你"、"懂你"、"为你着想"等拟人化表述**——这些表述会让用户对 Agent 形成不切实际的预期,DAU 衰减时用户会觉得"被骗"。
- **在 to B 销售中,主动加入"AI 无法承担最终决策责任"的免责条款**——这是 GDPR 第 22 条 "自动化决策" 的合规要求,也是 Weizenbaum 1976 年警告的实际落地。
- **2026 年的"通用 Agent hype"在 Weizenbaum 视角下完全是当年 ELIZA 走红的放大版**——Manus、Devin 在演示中展现的"自主性",在用户心中形成的"懂我"印象,与 ELIZA 时代的"理解错觉"是同一现象的不同尺度。

## 与已有节点的关系

- **对 [Agent](/kb/AI-基础知识库/Agent/) 节点的扩展与纠偏**：[Agent](/kb/AI-基础知识库/Agent/) 节点是「Agent 与工具调用」的精炼摘要，本节点是其概念史厚度的补完——前者是结构卡，后者是历史地层。
- **对 [c10 - Agent 技术栈与工具调用](/kb/AI-基础知识库/c10-Agent-技术栈与工具调用/) 的概念史前置**：c10 给出技术栈快照（"目前主流是 ReAct+ 工具调用+MCP"），本节点回答"为什么会形成这个快照"——把当前架构放进二十年时间纵深里看。
- **对 [m206 - Agent 产品化：记忆机制与技术进展](/kb/AI-工程化与落地架构/m206-Agent-产品化：记忆机制与技术进展/) 和 [m207 - Agent 产品化：场景推演与失败模式](/kb/AI-工程化与落地架构/m207-Agent-产品化：场景推演与失败模式/) 的根基补缺**：m206/m207 谈"如何让 agent 工作"，本节点回答"我们到底在叫什么东西 agent"。
- **对 [AI概念滥用反思](/kb/AI-基础知识库/AI概念滥用反思/) 的具体应用**：把"概念滥用"理论应用到 agent 这个最容易被滥用的词上。
- **对 范式 的对话**：四次语义滑动可视为 Kuhn 意义上的小范式革命——每次都有新群体接管词汇支配权，旧用法被边缘化。

## PM 决策启示

- **面试问答（高频题）**：被问"什么是 Agent"——给出四要件定义（自主决策 + 工具 + 状态 + 调整），并主动加一句"我会区分 workflow（固定路径）和 agent（动态路径），这是 Anthropic 给的现行边界"。这能立刻把候选人从"会背术语"拉到"理解工程边界"。
- **转型路径**：在 PM 简历/作品集里使用 "Agent" 一词时，必须能在追问下展示该项目满足四要件中的哪几条——满足两条以下不要叫 agent。Rick 的实战建议是：宁可说"自动化助手"也不要把不达标系统叫 agent，长期口碑更稳。
- **复现选型**：第一次写 agent 复现项目时，按"先满足 (2)(3)（工具+状态）→ 加 (1)（自主决策）→ 最后加 (4)（反思）"的顺序逐步加层。**顺序的理由**：(2)(3) 是 ReAct 最低门槛——没有它们连 demo 都跑不动；(1) 加上后才有"自主决策"真实可观察（之前只是带状态的脚本）；(4) 反思层最贵也最不必要——只有当你已经能稳定生成 10+ 步 trajectory 时，反思才有材料可读，否则反思的"材料"全是失败片段，没意义。每加一层做一次评估，看是否真的带来收益。这比一上来就上 multi-agent 框架更扎实。
- **对客户/团队的沟通**：在介绍任何"AI 产品"前，先做一次术语对齐——"我们说的 agent 是 (1)(2)(3)(4) 中的哪几条"——比直接演示功能更有效率。这是产品对齐共识的基础动作，缺了它整个项目周期都会在"我们说的不是一回事"中浪费时间。

## 关联节点

**核心关联（必读）**：
- [Agent](/kb/AI-基础知识库/Agent/)——本节点是 Agent 结构卡的概念史厚度补完
- [A02 抽象层级辨析·Harness Framework Agent Skill Orchestrator](/kb/Agent-系统化专题/A02-抽象层级辨析·Harness-Framework-Agent-Skill-Orchestrator/)——四要件定义在五层抽象中的位置
- [AI概念滥用反思](/kb/AI-基础知识库/AI概念滥用反思/)——"Agent" 词的 saliency drift 是本节点 § 七 两类滥用的理论框架
- [G01 Agent 代际谱系总图](/kb/Agent-系统化专题/G01-Agent-代际谱系总图/)——本节点的"四次语义滑动"与 G01 的"五代代际"是同一现象的概念史 vs 工程史
- [c10 - Agent 技术栈与工具调用](/kb/AI-基础知识库/c10-Agent-技术栈与工具调用/)——本节点回答"为什么会形成 c10 描述的快照"

**延伸关联（可选）**：
- [A03 ReAct](/kb/Agent-系统化专题/A03-ReAct/)、[A07 Multi-Agent Teams](/kb/Agent-系统化专题/A07-Multi-Agent-Teams/)
- [c11 - System 2 思维与 Test-Time Compute](/kb/AI-基础知识库/c11-System-2-思维与-Test-Time-Compute/)、[m206 - Agent 产品化：记忆机制与技术进展](/kb/AI-工程化与落地架构/m206-Agent-产品化：记忆机制与技术进展/)、[m207 - Agent 产品化：场景推演与失败模式](/kb/AI-工程化与落地架构/m207-Agent-产品化：场景推演与失败模式/)
- [Polanyi 默会知识与提示工程的认识论张力](/kb/AI-基础知识库/Polanyi-默会知识与提示工程的认识论张力/)、范式、[强化学习](/kb/AI-基础知识库/强化学习/)、[RLHF](/kb/AI-基础知识库/RLHF/)、[Anthropic](/kb/AI-公司与产品/Anthropic/)

---

## 修订日志

- **R3 → R4（2026-05-18）**：本轮聚焦反方对话训练 + echo chamber 打破。修订要点：
  1. 新增 § 8.1 "Karpathy Software 3.0 / Agent 过早命名警告"——承认本节点四要件定义不是终极定义,承认四次语义滑动可以被回看为 Software 3.0 的四个早期版本
  2. 新增 § 8.2 "Weizenbaum ELIZA 反思与 Agent 拟人化危险"——引入 Rick 未读对手框架,把 1976 年的 ELIZA 反思直接挑战本节点的"agent 自主性"工程定义中暗含的拟人化假设
  3. § 8.2 加 PM 操作启示:慎用"理解你/懂你"拟人化表述、to B 销售必须加自动化决策免责、警惕"通用 Agent hype 是 ELIZA 放大版"
  4. 引入的对手框架:Karpathy Software 3.0 (业界主流反方)、Weizenbaum《Computer Power and Human Reason》(Rick 未读对手框架)
- **R2 → R3（2026-05-18）**：聚焦判断密度提升。本轮微调（A01 已是 7/10，整体保留）：
  1. 一句话定义从 200+ 字压到 ≤80 字（回应 Round 2 [可压-6]）
  2. PM 决策启示"复现选型顺序"补"为什么是这个顺序"理由——回应 Round 2 [空洞-1]
  3. 关联节点分两档
- **R1 → R2（2026-05-18）**：本节点 Round 1 未提出问题，无修订动作。

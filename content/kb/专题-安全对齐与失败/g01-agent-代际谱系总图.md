---
title: G01 Agent 代际谱系总图
cluster: 专题 · 安全对齐与失败
created: '2026-05-18'
updated: '2026-06-11'
provenance: ai
facet: Agent
---

# G01 Agent 代际谱系总图

> **一句话定义**：Agent 从 2022 年 ReAct 至 2026 年 MCP/A2A，可划分为五代不可通约的范式（G1-G5），每代解决的是上一代被根本卡死的问题，而非同一问题的渐进改良；PM 选型的第一步是辨认对方说的"agent"属于哪一代的农耕方式。

## 1. 引子：为什么需要"代际"视角，而不是"演进"叙事

线性演进叙事——"Agent 越来越强"——是 2024 年市场宣传的标准话术,但它对 PM 决策没有任何帮助。问题在于：当客户说"我要一个 agent",销售说"我们的 framework 支持 agent",同事说"竞品发布了新 agent",这些"agent"指的根本不是同一种东西。

Kuhn 在《科学革命的结构》中用"范式"(paradigm)与"不可通约性"(incommensurability)两个概念,描述自然科学的代际跃迁:燃素说与氧化说不是程度差异,而是看待同一现象的"格式塔切换";掌握老范式的科学家会本能拒绝新范式,因为新范式让老范式的全部成就显得"无意义"。Agent 的代际同样具备这种不可通约性:G3 的 Reflexion 反思机制不是 G2 AutoGPT 的改良版,它解决的是"自主性"完全无法解决的"不可靠性"问题;G5 的 MCP 协议族不是 G4 LangGraph 的下一个版本,它解决的是 framework 战争消耗社区时间的元问题。

**展开 G2 → G3 这一次不可通约性论证**(读者最容易追问的点):AutoGPT 的设计假设是"LLM 足够聪明,只需要让它自由跑";Reflexion 的设计假设是"LLM 一定会错,关键是错了之后能不能学"。两套假设互斥——你不可能既相信"LLM 聪明到足以自主"又同时设计"假设它会错的反思层"。所以 Reflexion 不是 AutoGPT 的下一个版本,而是**放弃了 AutoGPT 的认识论基础**——这就是 Kuhn 意义上的格式塔切换。同理:G4 Computer Use 假设"API 是稀缺品,要绕过 API",而 G5 协议化假设"API 是公共品,要标准化 API"——后者放弃了前者的稀缺性预设。任何代际跃迁都伴随这种"上一代的核心预设被新一代当作问题来取消"的认识论翻转。

代际视角的真正用处:**让 PM 在选型对话的前 5 分钟内,就能判断对方在谈的是哪一代的方法论,从而避免用 G4 的预算去做 G2 的事,或用 G2 的预期去验收 G4 的项目**。

参见 `范式` 对 Kuhn 范式概念的展开,以及 `[AI概念滥用反思](/kb/基础知识库/ai概念滥用反思/)` 对"Agent"这个词在不同语境下被偷换的整理。

## 2. 五代谱系总览表

| 代 | 时间窗 | 标志性 paper / 系统 | 代表产品 | 核心范式 | 决定性突破 | 本质局限 | PM 实用结论 |
|---|---|---|---|---|---|---|---|
| **G1** ReAct / Tool Use | 2022-10 ~ 2023-夏 | ReAct (Yao et al. 2022, arXiv:2210.03629)、Toolformer (Schick et al. 2023, arXiv:2302.04761)、OpenAI Function Calling (2023-06) | 早期 LangChain Agent、ChatGPT Plugins (2023-03)、ReAct demo | `Thought → Action → Observation` 单循环 | 让 LLM 从"只生成文本"跨入"调用外部工具完成任务" | 长 trajectory 漂移、无自我纠错、5 步以上完成率断崖式下降 | 不适合 >5 步的任务,适合短链工具调用,Function Calling 仍是所有后续代际的底层原语 |
| **G2** 自主代理 | 2023-03 ~ 2023-秋 | AutoGPT (Significant-Gravitas, 开源 2023-03-30)、BabyAGI (Nakajima 2023-04)、AgentGPT | AutoGPT、AgentGPT、SuperAGI | 目标 → 子目标递归分解 → 长时无人值守 | 让公众**相信** Agent 真的存在;催生了一整个 framework 生态 | 完成率极低(<20%)、循环陷阱、token 烧得失控 | 概念演示价值 ≫ 生产价值;肖弘在 Manus 复盘里直说"AutoGPT 让所有人相信但没有人真用" |
| **G3** Agentic Workflow | 2023-末 ~ 2024-全年 | Reflexion (Shinn et al. 2023, arXiv:2303.11366)、LATS (Zhou et al. 2023, arXiv:2310.04406)、Self-Refine (Madaan et al. 2023, arXiv:2303.17651)、Chain-of-Verification (Dhuliawala et al. 2023, arXiv:2309.11495) | LangGraph (2024)、AutoGen 1.x (2024 春)、DeerFlow 早期版本 | 执行 → 自我评估 → 反思笔记 → 重试;或树搜索探索多分支 | 把任务可靠性从 ~30% 拉到 70-80% | 设计成本高、调参像玄学、反思的"反思"陷入循环 | 进入"能用"门槛;Claude Code 的 thinking loop 本质是 G3 的工业化版本 |
| **G4** Multi-Agent + Computer Use | 2024-全年 ~ 2025-全年 | AutoGen (Microsoft 2023, arXiv:2308.08155)、Claude Computer Use (Anthropic 2024-10)、Manus (蝴蝶效应 2025-03)、Devin (Cognition 2024-03)、OpenAI Operator (2025-01) | Claude Computer Use、Manus、Devin、Operator、CrewAI、AutoGen 2.x | 范式 A:角色分工的 Multi-Agent;范式 B:视觉-动作循环的 Computer Use | 突破 API 边界(屏幕级操控)、复杂任务可分担 | Token 成本爆炸、屏幕理解不稳(Anthropic 自承 OSWorld < 25%) | 选场景:Computer Use 适合无 API 的遗留系统 + 错误可逆;Multi-Agent 适合可并行的研究/代码任务 |
| **G5** 协议化 | 2024-11 ~ 2026-至今 | MCP (Anthropic 2024-11)、A2A (Google 2025-04)、Anthropic Skills (2025-10)、Cursor MCP 接入 (2025) | MCP server 生态(聚合站如 mcp.so / smithery.ai 收录数千个,2026-05 量级)、A2A 早期采纳者、Anthropic 开源 skills 仓库(`anthropics/skills`)+ Console 私有上传通道、Cursor、Claude Code、DeerFlow 2.0 | 工具调用、Agent 间通信、能力封装全部标准化为协议 | 从 framework 战进入生态战;开发者不再为某个 SDK 锁定 | 协议博弈(MCP vs A2A vs OpenAI 自有)、长尾兼容、协议安全 | PM 必须站队 + 评估协议中立性;选 framework 看它对 MCP 的一等公民支持 |

## 3. 五次范式跃迁的驱动力分析

每代到下一代的核心驱动**不是**"模型变强了"——那是表层叙事。深层驱动是上一代被卡死的具体瓶颈:

- **G1 → G2**:不是 GPT-4 让 AutoGPT 成为可能(GPT-3.5 就能跑 AutoGPT),而是**开源社区对"自主性"的浪漫想象**与 Hype Cycle 共振。学界已经知道单步 ReAct 不够,但产业界还没有"agent 能干完一件大事"的心理预期——AutoGPT 制造了这种预期,而预期本身是产品。
- **G2 → G3**:AutoGPT 失败率不可用迫使学界搬出"反思"。Reflexion (Shinn 2023) 的核心洞察:**LLM 在"判断自己做错"上比"做对"上更可靠**,所以把"评估"作为独立模块。这是认识论上的反转——`[Polanyi 默会知识与提示工程的认识论张力](/kb/基础知识库/polanyi-默会知识与提示工程的认识论张力/)` 指出每代 agent 都在试图把"默会的判断"显式化,G3 是第一次系统性地把"反思判断"模块化。
- **G3 → G4**:API 经济的天花板——很多有价值的工作流(报销系统、企业内部 ERP、遗留 Web 应用)**根本没有 API**。多模态成熟(GPT-4V 2023-09、Claude 3.5 Sonnet vision 2024-06)让"看屏幕"成为可能,Anthropic 2024-10 的 Computer Use 把这条技术路线产品化。Multi-Agent 同时崛起的驱动是不同的:**单 Agent 上下文窗口和注意力都顶不住复杂任务**,需要 韦伯科层制 式的角色分工(详见 `[A07 Multi-Agent Teams](/kb/专题-安全对齐与失败/a07-multi-agent-teams/)`)。
- **G4 → G5**:framework 重复造轮子的疲劳。LangChain / LangGraph / AutoGen / CrewAI / Dify / Letta / Mastra... 每个都有自己的 tool schema、memory format、agent protocol,导致同一个工具要写 5 次适配。Anthropic 2024-11 推出 MCP,本质是回应**生态级协调失败**;Google 2025-04 的 A2A 是大厂生态争夺的第二战场。这一代的驱动力是**社区时间成本**,不是技术能力。

每一次跃迁的代价是:**老代际的人会本能拒绝新代际的范式**。LangChain 资深用户最初抵触 LangGraph;LangGraph 老用户抵触 MCP;Multi-Agent 派抵触 Computer Use("浪费 token");协议派抵触原生 Agent 模型("不通用")。Kuhn 说过,科学革命不是靠老科学家被说服,而是靠他们退休。

## 4. 不可通约性提示:三个最容易混淆的错位

PM 选型最常翻车的三个混淆:

1. **把 G3 反思当成 G4 多 Agent**:Reflexion 是单 Agent 内部的"评估子模块",不是两个独立 agent 协作。把它当 Multi-Agent 卖,客户会期待"并行处理",但 G3 本质是串行重试。
2. **把 G4 Computer Use 当成 G5 协议**:Computer Use 是**绕过 API 的妥协方案**,不是"通用接口"。当 API 存在且稳定时,Computer Use 在每个维度都更差(慢、贵、错误率高)。把 Computer Use 当协议方案卖给已有 API 的客户,是高级的反向工程。
3. **把 G5 MCP 当成 G2 自主性**:MCP 是工具调用协议,**不会让 agent 自动变得更"自主"**。给一个 G2 的 AutoGPT 接 100 个 MCP server,它只会更快地陷入 100 倍多的循环。

详见 `[A02 抽象层级辨析·Harness Framework Agent Skill Orchestrator](/kb/专题-安全对齐与失败/a02-抽象层级辨析-harness-framework-agent-skill-orchestrator/)` 对这些层级的正交分解。

## 5. 当下(2026-05)所处的位置:G4 落地、G5 协议化、G6 萌芽

**2026-05 的横截面**(分层判断,避免"全面落地"的乐观叙事):
- **G4 分层落地**:**协议层 + Computer Use 技术层已规模化**(Computer Use 在客服自动化、Web 自动化场景规模化部署;Manus 在中国市场已有数十万付费用户;Devin 在代码生产环境跑通,详见 `[E02 通用 Agent·Manus & Devin](/kb/专题-安全对齐与失败/e02-通用-agent-manus-devin/)`);但**用户产品层(通用 Agent / 对等式 Multi-Agent)仍 demo > 生产**——肖弘自己给 AI 原生组织度打了 60 分,Sam Altman 在 2026 年初的 "Reflections" 复盘中承认"Agent 的进展比我们 2025 年初预期慢、Operator 用户增长远低于 ChatGPT、Apps SDK 未形成 GPT Store 那样的爆发"。两份独立的内部复盘(中美各一)同向指向"用户产品层未兑现"。
- **G5 协议正在生态化**(但需区分"宣称支持"vs"实际依赖"):MCP server 在 mcp.so / smithery.ai 等聚合站收录数千个(2026-05 量级,具体数随统计口径浮动);**但真正活跃维护、被生产环境依赖的可能只有 50-100 个**——"宣称支持 MCP"和"实际把 MCP 当唯一接口"是两件事。Anthropic Skills(2025-10 推出);Cursor、Claude Code、Zed、Continue 全部把 MCP 作为一等公民;OpenAI 在 2025-Q4 被动接受 MCP(很大成分是 Apps SDK / GPT Store 没竞争过协议化路线,不是"主动选择");中国大厂(阿里、字节、百度)表面支持 MCP,内部仍推私有协议(字节 Volcano Engine、阿里通义内部协议)。**G5 协议化是开放的,但不是中立的——协议化叙事更接近 Anthropic+Google 联合塑造的反 OpenAI 立场**。
- **G6 萌芽**:**原生 Agent 模型**——OpenAI o3 (2024-12)、Claude Opus 4.7 (2026) 的 reasoning loop 已经在内部"吸收"了 G3 的 reflection 和 G4 的 tool use。详见 `[c11 - System 2 思维与 Test-Time Compute](/kb/基础知识库/c11-system-2-思维与-test-time-compute/)`。

### 5.1 对 Yann LeCun "LLM Agent 是死胡同"立场的回应

**LeCun 的核心立场**(2023-2025 多次重申):LLM 没有 world model,只是 next-token predictor;Agent 化 LLM 是把"不可靠的预测"累积起来,叠加 N 次后是"不可靠 ^ N";真正的 Agent 需要 JEPA(Joint Embedding Predictive Architecture)这类不基于 token 的 world model。"Building agents on top of LLMs is a fundamental mistake"。

**Rick 的回应立场(不是反驳,是承认 + 边界)**:
- 接受 LeCun 的核心观察:LLM 不是终极架构,LLM-based Agent 在需要物理因果推理的任务上确实存在结构性局限(这与 E02 § 2.6 的"70% 上限"数学约束同向)。
- 但拒绝 LeCun 的工程结论:**在 5-10 年内,LLM + harness + 协议是唯一规模化方案**;JEPA 仍是研究方向,不是 PM 决策范围内的工程现实。
- 这一回应有一个 LeCun 无法反驳的事实:**他在 Meta FAIR 主导的 JEPA 研究至 2026-05 仍未产出商业级 Agent 产品**——即便 LeCun 立场长期正确,短期内 Rick 不可能用 JEPA 替代 LLM Agent 工程。所以 PM 决策不是"押注哪个架构正确",而是"在哪个时间窗口内,哪个架构能用"。
- **这一立场需要 Rick 明确承认两件事**:(a) 即便 LeCun 在 10 年尺度上对,本专题的所有判断仍在 2-3 年尺度上成立;(b) 本专题的"代际叙事"必须接受"可能整个 LLM Agent 路径 5 年后被证伪"的不确定性——这是 Lakatos 意义上的"研究纲领的退化风险"。详见 § 5.4。

### 5.2 对 Andrej Karpathy "Software 3.0 / Agent 过早命名"立场的回应

**Karpathy 的核心立场**(2024-2025 多次演讲):Software 1.0 = 规则编码、2.0 = 权重学习、3.0 = 自然语言编程。在 Karpathy 的框架里,**Agent 不是独立范式**,只是 Software 3.0 的一种早期应用形态;"Agent 是过早命名"——现在叫"Agent"的东西可能 10 年后回看会指向不清。

**Rick 的回应立场(部分接受 + 显式承担)**:
- 接受 Karpathy 的元判断:**"Agent" 这个词在 5-10 年后可能被 Software 3.0 / 原生 Agent 模型 / 其他更大叙事吸收或重新定义**——本专题所有判断有"被时代淘汰"的可能。
- 但坚持本专题的工具价值:即便"Agent"是早期粗糙词,**当下的 PM 决策需要这个词作为讨论锚点**——拒绝"过早命名"等于拒绝任何讨论。
- **G6 不只是工程升级,可能是 Karpathy 意义上的"Software 3.0 成熟形态"**:届时 Agent 这个词会被淘汰或重新定义,本专题的 G1-G5 谱系可能被回看为 "Software 3.0 的五个早期版本"。Rick 在面试遇到"Karpathy 说 Agent 是过早命名"时,正确回答是:"我同意,但 PM 决策不能等待最终命名,必须用当下最稳定的命名做判断"——这种自觉比"我的判断是终极的"专业 10 倍。

**对 Rick 的具体启示**:这意味着 **harness / skill 的价值窗口可能在 2-3 年内收窄**。但**这一预测有两个必须显式标注的赌注前提**:(a) 原生 Agent 模型 5-10 年内确实成熟(LeCun 反对);(b) Rick 当下学的 LangGraph / harness 知识仍能 transferable 到原生 Agent 时代。两个前提都是赌注,不是保证——如果 (a) 失败,LLM 路径继续延伸,harness 投入收益期更长;如果 (b) 失败,Rick 当下学的部分知识(纯 prompt 工程)归零、另一部分(协议与治理认知)仍有用。**这是「登楼撤梯」的两个可能崩塌点,不是 metaphor 的胜利**。

### 5.3 "登楼撤梯"的反案例:梯子可能在登顶前先断

`登楼撤梯-后弥赛亚的公民道德` 提供了"明知会被废弃仍要投入"的判断方法论,但这个 metaphor 假设"梯子会一直用到登顶"——这是个**未经证明的假设**。两种反案例:

- **反案例 1:梯子在登顶前断**——LangGraph 在 2027 年因模型原生支持长上下文 + 内置工具调用而失去价值;Rick 2026 年的 LangGraph 投入,可能在第 12 个月就直接归零(不是被 "G6 模型替代",是 LangChain 公司商业化失败 / 项目活跃度衰减),用户被迫迁移到下一个未知 framework。
- **反案例 2:登顶后发现不是想去的楼**——原生 Agent 模型成熟后,Agent 的形态可能完全偏离今天的设想(如不是"端到端任务执行"而是"持续交互助手"),今天学的 plan/reflect/tool-use 工程能力**部分错位**——你学的是骑马,新时代是开汽车,虽然都是"交通",但具体技能要重学。

**这两种反案例不否定"登楼撤梯"的方法论,但要求 Rick 明确两件事**:(a) 投入比例要倾斜——纯 prompt 工程少投,协议与治理认知多投;(b) 准备好"梯子断"的预案——把学习经验沉淀为可迁移的元能力(架构剖面、PM 决策框架),而不只是具体框架知识。

### 5.4 用 Lakatos 框架审视 G1-G5 是"进步性"还是"退化性"科研纲领

> **R4 引入 Rick 未读过的对手框架**:Imre Lakatos《科研纲领的方法论》(*The Methodology of Scientific Research Programmes*, 1978) 是 Kuhn 范式理论最重要的批判者。Lakatos 反对 Kuhn 的"不可通约的范式革命",主张:**科学研究是"科研纲领"的渐进调整——每个纲领有一个不可放弃的"硬核"(hard core)和一组可调整的"保护带"(protective belt);评判一个纲领的标准不是"范式革命"而是"它能不能持续产生新的可证实预测"(进步性 progressive)还是"只能补丁式辩护已知失败"(退化性 degenerating)**。

**用 Lakatos 框架审视 G1-G5**:
- **硬核**(整个 LLM Agent 研究纲领不可放弃的预设):LLM 通过 next-token prediction + in-context learning 可以表现得像 agent。
- **保护带**(可调整的工程辅助假设):ReAct prompting、Reflexion 外置反思、Multi-Agent 角色分工、Computer Use 视觉接口、MCP 协议化——这些都是为了让硬核继续工作而引入的辅助机制。

**进步性 vs 退化性的判据**:
- G1 → G2 是**进步性**——AutoGPT 虽然失败率高,但产生了新的可证实预测("LLM 可以自主分解目标")。
- G2 → G3 是**进步性**——Reflexion 让任务完成率从 ~30% 到 70-80%,产生了"评估子模块独立"的可证实改进。
- G3 → G4 Multi-Agent 路线是**有争议**——Multi-Agent 在 2024 短暂成 SOTA,但 2025 年下半年起被"单 agent + 长 reasoning"反向取代(Anthropic / Cursor / Devin 都在去 multi-agent 化),这条线呈现**退化性**特征(在 narrow 场景外没有产生持续的可证实改进)。
- G4 Computer Use 路线是**进步性**——绕过 API 边界确实开辟了新的应用空间。
- G5 协议化是**进步性**——MCP/A2A 确实降低了 N×M 适配成本,产生了可量化的工程价值。

**Lakatos 框架给本专题的不舒服的判断**:**G3 Reflexion 路径在工业上其实从未真正主流——Claude Code、Cursor、Devin 大量直接从 G1 跳到 G6 的 thinking budget,跳过外置 G3 Reflexion。G3 是学术影响力的"代际",但工业上的"代际"是 G1 → G6 跳跃**。本专题把 G3 当成"五代之一"是受学术叙事影响,严格按 Lakatos 框架,G3 在工业上是退化性纲领,Reflexion 工业占比从未超过 20%。

**对 PM 的具体启示**:不要按学术影响力评估代际,要按工业实际应用率评估。在面试遇到"为什么我们的 Coding Agent 没用 Reflexion"时,正确回答是"Coding Agent 跳过外置 Reflexion 直接用 thinking budget 是 Lakatos 意义上的进步性选择——外置 Reflexion 在 2026 年的工业实际占比 < 20%"。

### 5.5 总体:Hype Cycle 视角下的当下定位

把以上分析合在一起,**Agent 在 2026-05 处于 Gartner Hype Cycle 的"幻灭低谷期"(Trough of Disillusionment)向"启蒙斜坡期"(Slope of Enlightenment)过渡阶段**——
- **过去 12 个月发生的事**:Sam Altman 2025 年初宣告"2025 是 Agent of year"(Peak of Inflated Expectations 顶点)→ 2025 全年陆续暴露 Computer Use 不稳、通用 Agent demo > 生产、Multi-Agent token 烧穿 → 2026 年初 Altman 复盘"Agent 比预期慢"(进入幻灭低谷)。
- **当下的真实状态**:协议层(MCP)已经成为基础设施(Slope of Enlightenment 早期),用户产品层(通用 Agent / 对等 Multi-Agent)仍在低谷修复中。
- **未来 12 个月预测**:G5 协议化生态深化、G6 原生 Agent 模型逐步成熟、对等 Multi-Agent 大概率被进一步去化、Computer Use 在 narrow 场景成熟、通用 Agent 仍然 demo > 生产。

**对 Rick 的启示**:**当下是转型 PM 进入 Agent 赛道的合理窗口**——不是最早(已过 hype 顶点),不是最晚(协议化未饱和),正好在"反 hype 共识形成 + 协议化基础设施稳定"的交叉点。但要承认**AI PM 转型窗口可能正在关闭**——2026 年 AI PM 市场已经饱和,转型者面临"有 3 年 AI 经验的工程师转 PM"的竞争。这是 Sam Altman 2026 年初复盘暗含的另一个 sober 事实,本专题在 README 的"局限"段落已显式提醒。

## 6. 跨域呼应:用三个理论框架审视代际

**Kuhn 范式革命**:每代之间不是改良,是格式塔切换。这意味着 PM 评估某个新 agent 产品时,**问"它解决了上一代什么瓶颈"比问"它新增了什么功能"更有诊断力**。如果回答不出明确的"上一代瓶颈",这个产品大概率是在打补丁。

**福柯 生命政治**:每一代 agent 让渡的"自主性"边界,对应一种新的治理形态。G1 ReAct:人完全控制每一步;G2 AutoGPT:人让渡执行权但保留目标定义权;G4 Computer Use:人让渡屏幕操控权(包括误操作风险);G5 协议化:人让渡的是"信任谁来提供工具"。每一次让渡都伴随**新的可治理性问题**(详见 `生命政治` 与 `[m207 - Agent 产品化：场景推演与失败模式](/kb/工程化与落地架构/m207-agent-产品化-场景推演与失败模式/)` 的 HITL 三维度判断)。这不是抽象的哲学,是企业合规审查必须面对的具体问题:"这个 agent 能动我的客户数据库吗?"

**韦伯科层制 vs 市场理性**:G4 Multi-Agent Teams 是**理性科层制的工程化**——manager agent、worker agent、reviewer agent,角色明确、流程固化(详见 `[A07 Multi-Agent Teams](/kb/专题-安全对齐与失败/a07-multi-agent-teams/)`)。G5 协议化则是**市场理性**——工具与 agent 之间通过协议(类比合约)自由组合,不再依赖中央编排。这两种治理形态在企业内部的张力,与 Coase《企业的性质》提出的"组织 vs 市场"边界问题完全同构。PM 选型时,这个张力直接表现为:用 LangGraph 把流程固化(科层),还是用 MCP 让 agent 自由调度工具(市场)?

**阿伦特行动 vs 制作**(待建跨域节点)还可以补一层:G1-G3 本质是"制作"(把任务转化为产物),G4 Computer Use 与 G5 协议化开始进入"行动"领域(在与他者/系统的关系中产生不可预期的后果)。这层张力在 m207 失败模式分析里已经隐含。

## 7. 与已有节点的关系

- **`[c10 - Agent 技术栈与工具调用](/kb/基础知识库/c10-agent-技术栈与工具调用/)`**:c10 给出的是 **G3 的截面快照**(2024 年视角)——ReAct + 工具调用 + 记忆四类型 + 复合错误数学。c10 本身没有错,但它把"Agent"等同于"G3 时代的 Agentic Workflow",对 G4 Computer Use 与 G5 协议化只有零星提及。本节点提供**时间纵轴**,让 c10 的内容定位为"G3 章节",避免读者把 G3 当成全部。
- **`[m206 - Agent 产品化：记忆机制与技术进展](/kb/工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/)`**:m206 的三大启示(Browser Agent / A2A / Coding Agent)其实**横跨 G4 与 G5**——Browser Agent 是 G4 Computer Use 的产品化,A2A 是 G5 协议化的核心,Coding Agent(Claude Code、Cursor、Devin)是 G4 末期到 G5 早期的混合形态。本节点把这些散点放回代际坐标系。
- **`[m207 - Agent 产品化：场景推演与失败模式](/kb/工程化与落地架构/m207-agent-产品化-场景推演与失败模式/)`**:m207 的六类失败模式,其实**每一类对应特定代际的局限**——"trajectory 漂移"是 G1 局限,"循环陷阱"是 G2 局限,"评估器失灵"是 G3 局限,"屏幕理解错误"是 G4 局限。本节点为这些失败模式提供"病因学"分类。
- **`[m208 - AI 基础设施与中间件选型](/kb/工程化与落地架构/m208-ai-基础设施与中间件选型/)`**:m208 的 framework 对比(LangChain / LangGraph / CrewAI / Dify)其实是 **G3-G4 时代的产物**;G5 时代框架重要性下降,协议重要性上升。本节点对 m208 提供"代际预警"。
- **`[Agent](/kb/基础知识库/agent/)`**:Agent 概念卡的"工具调用 + ReAct + Planning"三要素定义,**精确对应 G1-G3**,对 G4 Multi-Agent / Computer Use 和 G5 协议化覆盖不够。本节点对 Agent 概念卡是**纵深扩展**。
- **`[Harness 词义辨析](/kb/专题-安全对齐与失败/harness-词义辨析/)` / `[Skill 系统的本质](/kb/ai-协作方法论/skill-系统的本质/)`**:这两个节点是 G5 协议化代的关键认知装备,本节点把它们定位为"G5 范式的核心词汇"。

总体定位:本节点对 c10/m206/m207/m208 的关系是**"补缺时间纵轴"**——已有节点是横切面分析,本节点是纵向谱系。两者互补,不互斥。

## 8. PM 决策启示

1. **简历/面试**:必须能说清自己做过的是哪一代。
   - "我用 LangChain 做了一个 Q&A agent" → G1/G2
   - "我设计了 Reflexion 风格的纠错循环" → G3
   - "我做了一个 multi-agent 协作系统" → G4
   - "我们的 agent 支持 MCP" → G5 入门
   - "我们设计了自己的 agent 协议" → G5 深度参与
   - **不要说"我做过 agent"**,这等于没说,面试官会追问代际。
2. **选型对话(销售/客户)**:5 分钟内问出对方要的是哪一代。
   - 关键问题:**"任务平均多少步?有 API 还是要看屏幕?多个 agent 协作还是单 agent?能接受人在 loop 里吗?"** 这四个问题分别筛出 G1/G4-Computer-Use/G4-Multi/G3 边界。
3. **产品定位**:你的产品被颠覆的速度 = 你处于的代次距离 G5 的距离。
   - 还在做 G2 风格的"通用 AutoGPT" → 12 个月内被 G4 Computer Use 替代或挤出
   - 在做 G3 风格的 "Agentic Workflow framework" → 24 个月内被 G5 协议生态消解
   - 在做 G5 协议层的工具/agent → 寿命较长,但要看 G6 原生 Agent 模型何时商品化
4. **复现路径**(详见 `[R01 最小可运行·100 行 ReAct](/kb/专题-安全对齐与失败/r01-最小可运行-100-行-react/)`、`[R02 中型生产·LangGraph + MCP](/kb/专题-安全对齐与失败/r02-中型生产-langgraph-+-mcp/)`、`[R03 Multi-Agent 模板·AutoGen CrewAI](/kb/专题-安全对齐与失败/r03-multi-agent-模板-autogen-crewai/)`):
   - 学习路径必须按代际:**G1 → G3 → G5**(跳过 G2 是因为 G2 主要价值在 hype,跳过 G4 单独学是因为 G4 是 G3 + 多模态,先掌握 G3)
   - **不要从 LangChain Agent 入门**,它把 G1/G2/G3 混在一个抽象里教,会让你形成"agent = 一坨东西"的错误直觉
   - 建议入门顺序:100 行手写 ReAct → 加 reflection → 接 MCP server → 多 agent
5. **简历对外叙事建议**:在转型 AI PM 的简历上,**明确标注自己理解 agent 的代际**——这比说"熟悉 LangChain"含金量高一个数量级。具体表达可参考:"理解 Agent 从 ReAct (2022) 到 MCP/A2A (2024-2025) 的五代范式演化,能在选型对话中快速识别需求所属代际"。

## 10. 关联节点

**核心关联（必读）**：
- `[G02 五代演化详解·G1-G5](/kb/专题-安全对齐与失败/g02-五代演化详解-g1-g5/)`——G01 是骨,G02 是肉,必须配对阅读
- `[A01 Agent 概念史与语义流变](/kb/专题-安全对齐与失败/a01-agent-概念史与语义流变/)`——四次语义滑动 ↔ 五代代际,概念史 vs 工程史
- `[A02 抽象层级辨析·Harness Framework Agent Skill Orchestrator](/kb/专题-安全对齐与失败/a02-抽象层级辨析-harness-framework-agent-skill-orchestrator/)`——本节点 § 4 三个错位用 A02 层级表正交分解
- `[c10 - Agent 技术栈与工具调用](/kb/基础知识库/c10-agent-技术栈与工具调用/)`——c10 是 G3 横切面,本节点提供时间纵轴
- `登楼撤梯-后弥赛亚的公民道德`——§ 5 G6 萌芽的"撤梯"判断方法论的理论锚点
- `[AI概念滥用反思](/kb/基础知识库/ai概念滥用反思/)`——五代之间最大的混淆都源于"Agent"标签的 saliency drift

**延伸关联（可选）**：
- 同专题:`[A03 ReAct](/kb/专题-安全对齐与失败/a03-react/)`、`[A04 Reflexion](/kb/专题-安全对齐与失败/a04-reflexion/)`、`[A07 Multi-Agent Teams](/kb/专题-安全对齐与失败/a07-multi-agent-teams/)`、`[A08 MCP 与 A2A 协议族](/kb/专题-安全对齐与失败/a08-mcp-与-a2a-协议族/)`、`[S01 Agent 六层架构剖面](/kb/专题-安全对齐与失败/s01-agent-六层架构剖面/)`、`[E01 Coding Agent·Claude Code & Cursor](/kb/专题-安全对齐与失败/e01-coding-agent-claude-code-cursor/)`、`[E02 通用 Agent·Manus & Devin](/kb/专题-安全对齐与失败/e02-通用-agent-manus-devin/)`、`[E03 Multi-Agent 框架·AutoGen & CrewAI & DeerFlow](/kb/专题-安全对齐与失败/e03-multi-agent-框架-autogen-crewai-deerflow/)`、`[R01 最小可运行·100 行 ReAct](/kb/专题-安全对齐与失败/r01-最小可运行-100-行-react/)`、`[R02 中型生产·LangGraph + MCP](/kb/专题-安全对齐与失败/r02-中型生产-langgraph-+-mcp/)`、`[R03 Multi-Agent 模板·AutoGen CrewAI](/kb/专题-安全对齐与失败/r03-multi-agent-模板-autogen-crewai/)`、`[_Agent 系统化专题·总览](/kb/专题-安全对齐与失败/_agent-系统化专题-总览/)`
- 章节:`[c11 - System 2 思维与 Test-Time Compute](/kb/基础知识库/c11-system-2-思维与-test-time-compute/)`、`[c13 - 幻觉的不可消除性](/kb/基础知识库/c13-幻觉的不可消除性/)`、`[m206 - Agent 产品化：记忆机制与技术进展](/kb/工程化与落地架构/m206-agent-产品化-记忆机制与技术进展/)`、`[m207 - Agent 产品化：场景推演与失败模式](/kb/工程化与落地架构/m207-agent-产品化-场景推演与失败模式/)`、`[m208 - AI 基础设施与中间件选型](/kb/工程化与落地架构/m208-ai-基础设施与中间件选型/)`、`[m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/)`
- 概念卡:`[Agent](/kb/基础知识库/agent/)`、`[Function Calling](/kb/基础知识库/function-calling/)`、`[RAG](/kb/基础知识库/rag/)`、`[Test-Time Compute](/kb/基础知识库/test-time-compute/)`、`[强化学习](/kb/基础知识库/强化学习/)`、`[Harness 词义辨析](/kb/专题-安全对齐与失败/harness-词义辨析/)`、`[Skill 系统的本质](/kb/ai-协作方法论/skill-系统的本质/)`、`[Polanyi 默会知识与提示工程的认识论张力](/kb/基础知识库/polanyi-默会知识与提示工程的认识论张力/)`
- 公司/产品:`[Anthropic](/kb/ai-公司与产品/anthropic/)`、`[OpenAI](/kb/ai-公司与产品/openai/)`、`[Claude](/kb/ai-公司与产品/claude/)`、`[Claude Code](/kb/ai-公司与产品/claude-code/)`、`[Manus](/kb/ai-公司与产品/manus/)`、`[Gemini](/kb/ai-公司与产品/gemini/)`、`[DeepSeek](/kb/ai-公司与产品/deepseek/)`
- 跨域:`范式`、`生命政治`、`霸权`、`0114认识论`、`0117社会学`
- 总索引:`[AI PM 知识图谱·总索引](/kb/ai-pm-知识图谱/ai-pm-知识图谱-总索引/)`

---

## 修订日志

- 2026-06-11 P3.4 校链：修订日志内简写死链 `登楼撤梯` 补全为真实节点名 `登楼撤梯`
- **R3 → R4（2026-05-18）**：本轮聚焦反方对话训练 + echo chamber 打破。修订要点：
  1. § 5 G4 落地段从"已大规模落地"修订为"分层落地"——加 Sam Altman 2026 年初 "Reflections" 复盘 + 肖弘 60 分自评双重印证用户产品层未兑现
  2. § 5 G5 协议化段加"宣称支持 vs 实际依赖"区分——承认数千 server 中真正活跃的只有 50-100 个;承认 OpenAI 接受 MCP 是被动而非主动;承认中国大厂内部仍推私有协议
  3. 新增 § 5.1 对 Yann LeCun "LLM Agent 是死胡同"立场的回应——不反驳但承担(接受 LLM 不是终极架构,但坚持 2-3 年内是唯一规模化方案)
  4. 新增 § 5.2 对 Karpathy "Software 3.0 / Agent 过早命名"立场的回应——接受元判断但坚持当下命名的讨论锚点价值
  5. § 5 末尾"登楼撤梯"段加两个赌注前提的显式标注——不再是 metaphor 的胜利,是要求 Rick 明确赌的是什么
  6. 新增 § 5.3 "登楼撤梯的反案例"——梯子在登顶前断 / 登顶后发现不是想去的楼
  7. 新增 § 5.4 用 Lakatos 科研纲领框架审视 G1-G5——引入 Rick 未读对手框架,论证 G3 在工业上其实从未真正主流(Reflexion 工业占比 < 20%)
  8. 新增 § 5.5 Hype Cycle 视角下的当下定位——Agent 在 2026-05 处于幻灭低谷期向启蒙斜坡期过渡
  9. § 5.5 末尾加"AI PM 转型窗口可能正在关闭"的市场现实承认
  10. 引入的对手框架:Lakatos 科研纲领 (Rick 未读)、LeCun world model 立场 (业界反方)、Karpathy Software 3.0 (业界反方)、Sam Altman 2025 hype 复盘 (业界反方)、Hype Cycle (Gartner 框架)
- **R2 → R3（2026-05-18）**：聚焦判断密度提升。本轮微调（G01 已是 8/10 最强样板）：
  1. § 1 引子加 200 字论证"G2 → G3 不可通约性"展开（AutoGPT 假设 vs Reflexion 假设互斥）——回应 Round 2 [无证据-4]
  2. § 5 G6 萌芽加 登楼撤梯-后弥赛亚的公民道德 双链 + 100 字"撤梯"判断方法论——回应 Round 2 [独家机会-5]
  3. 关联节点分两档，新增 [AI概念滥用反思](/kb/基础知识库/ai概念滥用反思/) 与 登楼撤梯 进入核心关联
- **R1 → R2（2026-05-18）**：Manus 时间 "2025-04" → "2025-03"；AutoGen "2024" → "2023"；Anthropic Skills "商店" → 开源仓库 + Console；MCP server 数量与 A08 统一；死链处理。

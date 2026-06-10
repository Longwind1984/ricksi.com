---
title: A04 Reflexion
cluster: Agent 系统化专题
created: '2026-05-18'
updated: '2026-05-18'
---

# A04 Reflexion

一句话定义：Reflexion（Shinn et al. 2023）在 [A03 ReAct](/kb/agent-系统化专题/a03-react/) 循环外套一层「评估—反思—注入下次 prompt」的环，把 episode 级失败转译为自然语言记忆，让同一题第二次胜率显著提升——作者称为 "verbal reinforcement learning"。

## 一、原始论文要点

- 作者：Noah Shinn（Northeastern）、Federico Cassano、Edward Berman、Ashwin Gopinath、Karthik Narasimhan、Shunyu Yao（与 ReAct 同一作者群中的 Shunyu Yao 重合）。预印本 2023-03（arXiv:2303.11366），NeurIPS 2023。
- 三个角色：
  - **Actor**：执行 ReAct 循环、产出 trajectory。
  - **Evaluator**：判定 trajectory 成败（环境信号、unit test、LLM-as-judge 三选一）。
  - **Self-Reflection**：失败时由 LLM 总结「反思笔记」写入长期记忆。
- 实验：HotpotQA、AlfWorld、HumanEval / MBPP / LeetcodeHardGym。最显著结果：HumanEval 上把 GPT-4 一次通过率从 80% 推到 91%——无任何参数更新。**(原论文 91% 数据在独立复现中有争议,详见 § 四"判据 3"之后的"原数据复现性争议"——此处先按原论文叙述,选型层面的影响在 § 四集中处理)**
- 关键洞察：把 RL 中的"数值奖励"替换成"自然语言奖励"可以被 LLM 直接消费——作者将其**描述为一种类似 in-context policy improvement 的机制**（注：严格意义上的"等价于 policy gradient"是不平凡的认识论主张，本节点不做该强主张，仅采用作者原文的"类比"立场）。

## 二、范式骨架

```
loop episode:
    trajectory = Actor.run(task, memory)
    reward = Evaluator(trajectory)
    if reward < threshold:
        note = Reflector.summarize_failure(trajectory)
        memory.append(note)
    if reward >= threshold: break
```

- 与 [A03 ReAct](/kb/agent-系统化专题/a03-react/) 的关系一句话：**Reflexion = ReAct + 外部反思记忆 + 重试**。没有 ReAct 产出的可读 trajectory，Reflector 没东西可读；没有外部 memory，反思只活在当前上下文。
- 与 [强化学习](/kb/ai-基础知识库/强化学习/) 的对照：Reflexion 把传统 RL 的（state, action, reward）三元组替换成（trajectory, verbal-feedback, episode-outcome），梯度更新被换成 prompt 注入。这是其名字"verbal RL"的来源，也是其根本局限：所有改进都活在上下文里，session 结束就丢——除非把 reflection memory 持久化到 vector store 或文件系统。

## 三、适合 / 不适合任务

**适合**：
- 判据明确的任务（单元测试可跑、答案可查、环境给信号）——代码生成、SQL 生成、网页购物、定理证明、math word problem。Evaluator 必须低噪声。
- 同一题型可重复出题。反思笔记只对"相似分布"的下一题起作用。
- 失败有"可命名"原因。模型能把错误说清楚，笔记才有用。

**不适合**：
- 开放生成（写文章、做规划）：没有 Evaluator，反思变成自嗨。
- HITL 重度任务：人本身就是 evaluator，再叠 Reflexion 会让节奏变慢、责任模糊。
- 冷启动（第一次失败前没 memory）：相对于直接 retry 优势不明显；要见效一般需要 ≥3 次 episode。
- 强时延敏感：每次 episode 付出 actor + evaluator + reflector 三次 LLM 调用成本。

## 四、Reflexion 在 o1/o3 时代何时仍值得用（反共识重写）

> **R3 主轴重写**：Reflexion 在 2024-2025 间被 OpenAI o1/o3、Anthropic Extended Thinking、DeepSeek R1 等"原生反思模型"大量内化——**外置 Reflexion 的工程价值已经被显著稀释**。这意味着 PM 在 2026 年的选型逻辑彻底翻转：**默认不要用外置 Reflexion，除非满足以下三条至少一条**。

### 三条 Reflexion 仍值得用的判据

**判据 1：任务有可持久化的领域专属反思笔记**

- 典型场景：行业合规规则（医疗、金融）、特定客户的偏好历史、企业内部 know-how。
- 反例（不要用 Reflexion 的情况）：通用代码生成——o1/o3 内置反思已覆盖 90% 以上场景，外置 Reflexion 的反思笔记是"重复发明"。
- 判据细化：你的反思笔记如果可以用一句话归纳为"通用错误模式"（如"循环未终止"），那它已经在原生反思模型的训练分布里——别用外置 Reflexion。**如果你的反思笔记是"客户 X 偏好用驼峰命名 / 行业 Y 禁止使用 'guarantee' 一词"——这才需要 Reflexion，因为这是 o1/o3 训练时没见过的领域知识**。

**判据 2：用户付不起 o1/o3 的推理成本**

- o1/o3 的反思以 reasoning token 形式直接计费（OpenAI o1 的 reasoning tokens 比 output tokens 贵 4 倍）。如果用户的任务量级是百万次/月，o1/o3 单次成本 $0.5-$2 是不可承受的。
- 替代方案：用 GPT-4o / Sonnet 4.6（便宜模型）+ 外置 Reflexion，整体成本可降至 o1 的 1/3-1/5。
- 判据细化：单任务月调用量 > 10 万次 + 任务有明确 Evaluator → 用便宜模型 + Reflexion 替代 o1。

**判据 3：反思笔记必须作为可审计资产留档**

- o1/o3 的内置反思是"黑箱"——reasoning tokens 通常不可外露（OpenAI 政策限制），即使外露也是非结构化的长文本，难审计。
- 外置 Reflexion 的反思笔记是 first-class 资产——可入库、可版本化、可被业务团队 review。
- 典型场景：金融合规 agent（每次拒绝/批准都要留可解释笔记）、医疗诊断辅助 agent（每次诊断改写要留依据）、法务起草 agent（每次条款修改要留理由）。
- 判据细化：监管要求"agent 决策必须可解释、可追溯、可被人推翻"——必须用外置 Reflexion，因为 o1/o3 的反思无法满足"可解释"的合规要求。
- **R4 补充**:即便 Reflexion 整体效果有复现性争议(下方专段),**"反思笔记可审计" 这一性质是独立成立的** —— 这是为什么金融 / 医疗 / 法务行业仍可能选 Reflexion 的真理由。这一判据不依赖原论文 91% 数据是否被夸大。

### 三个判据都不满足的情况

直接用 o1 / o3 / Extended Thinking / DeepSeek R1，**外置 Reflexion 是反模式**。这与 2023-2024 年"上 Reflexion 是默认选项"的判断完全相反——PM 必须意识到这是范式转换，不是渐进改良。

### 原论文 91% 数据的复现性争议(R5 重新组织 — 从 § 一移到选型判据之后)

> 这段在 R4 时位于 § 一末尾,但放在论文要点中会让读者困惑"那为什么还要学 Reflexion"——破坏了概念入门的叙事节奏。R5 移到 § 四之后:**先让读者建立"什么时候用 Reflexion"的判据,再讨论"原数据有多可信",更符合 PM 的认知顺序**(先有选型框架,再看证据强度)。

**事实**:原论文 HumanEval 91% 数据在 2024-2025 多次独立复现中被质疑——**独立复现只达到 83-88%**;原 evaluator 在 HumanEval 实验中**用了 ground truth(已知答案对错)**,这在生产中不存在;移除 ground truth 后效果大幅下降。学界(EMNLP 2024 等)对此有公开讨论。工业界 Anthropic 在 2025-06 multi-agent research system blog 中实际没有用外置 Reflexion 风格,直接用 Claude 内置 Extended Thinking——这是 Reflexion 范式工业占比 < 20% 的一个具体证据。

**对 PM 选型的影响**:**这一争议不推翻 § 四的三条判据**——判据 3 的"反思笔记可审计"在金融/医疗/法务仍然成立(理由是合规要求,不是 91% 数据);判据 1 / 判据 2 也不依赖 91% 这个具体数字。**但 PM 在向工程团队推 Reflexion 时,不要再用"原论文从 80% 推到 91%"作为说服依据**——这个数字会被工程师用 EMNLP 2024 复现质疑直接顶回去。改用"反思笔记的合规可审计性 / 单次成本经济性"作为说服依据,这两个独立于原 91% 数据成立。

### Reflexion 之所以从未真正主流的另一种解释(R4)

> **R4 反 confirmation bias**:本节点 § 四已经从 PM 选型视角说明"2026 默认不要用 Reflexion",但**没说为什么 Reflexion 在工业上从未真正主流**——只是把它写成"被 o1/o3 替代"。这其实是事后合理化叙事。

**Reflexion 工业占比 < 20% 的真实原因(三层)**:
1. **Evaluator 在生产中的可靠性问题**:原论文用 ground truth 当 evaluator,生产中没有 ground truth;用 LLM-as-judge 当 evaluator 引入新的幻觉风险;用人类当 evaluator 让 Reflexion 退化为 HITL。
2. **Token 成本爆炸**:Reflexion 是 ReAct 的 2-4 倍 token —— 在企业级日均百万次任务规模下,这个成本不可接受。
3. **反思笔记的"经验资产"维护成本**:反思笔记会变质(同一错误反思 50 次没有信息增益、反而是噪声),需要专门的去重 / 压缩 / 过期 / 优先级子系统(详见 [S01 Agent 六层架构剖面](/kb/agent-系统化专题/s01-agent-六层架构剖面/) § 9 耦合点 2)——大多数早期 Agent 项目把它当成"call vector_store.append()" 的一行代码,导致几周后长期记忆爆炸。

**这一解释比"被 o1/o3 替代"更诚实**——即使 o1/o3 不存在,Reflexion 工业上也很难大规模采用。**所以 Reflexion 的衰退不是"被取代",是"从未真正崛起"**。这一区分对 PM 重要——在 2027 年 o1/o3 之后下一代模型出现时,不要重复"X 是被 Y 替代" 的简化叙事,要看 X 本身的工业占有率。

## 五、Reflexion 之后的演化（短列表，已被 § 四的判断框架统摄）

- **Self-Refine**（Madaan 2023）：把反思频率从 episode 级压到 step 级。代价：成本翻倍、对短任务无收益。今天已基本被 o1 的内置反思替代。
- **LATS / Language Agent Tree Search**（Zhou 2023）：把 Reflexion 的单线重试扩展成 MCTS 搜索。效果好但成本爆炸，工业界很少落地。
- **Generative Agents**（Park 2023）：把"失败反思"扩展到"日常反思"——agent 每隔 N 步主动生成总结性 memory。这是从"任务级反思"到"角色级反思"的滑动，至今在 NPC / 模拟系统中仍有应用。
- **OpenAI o1 / o3 系列**：把反思从外部 loop 内化为模型自身的 long chain-of-thought（参 [c11 - System 2 思维与 Test-Time Compute](/kb/ai-基础知识库/c11-system-2-思维与-test-time-compute/)）。**这是稀释外置 Reflexion 工程价值的根本事件**——见上一节。

## 与已有节点的关系

- **对 [A03 ReAct](/kb/agent-系统化专题/a03-react/) 的补完**：ReAct 解释"单次循环长什么样"，Reflexion 解释"循环失败后怎么办"。
- **对 [c10 - Agent 技术栈与工具调用](/kb/ai-基础知识库/c10-agent-技术栈与工具调用/) 的扩展**：c10 强调"复合错误每步累积"，Reflexion 给出第一种系统性的"事后修复"答案。
- **对 [c11 - System 2 思维与 Test-Time Compute](/kb/ai-基础知识库/c11-system-2-思维与-test-time-compute/) 的对话**：Reflexion 是 test-time compute 的外置形态，o1 是内置形态——同一思想的两条路径。**且本节点 § 四明确：从 PM 选型视角，外置形态已被内置形态大量替代**。

## PM 决策启示

- **面试问答模板**：
  > **Q**："2026 年还该用 Reflexion 吗？"
  > **A**（反共识答）："默认不用——o1/o3/Extended Thinking 已把反思内化。但三种场景仍值得：(1) 领域专属反思（合规规则、客户偏好这些 o1 训练时没见过的）；(2) 成本敏感（百万次/月规模，便宜模型 + Reflexion 比 o1 便宜 3-5 倍）；(3) 反思必须可审计留档（金融、医疗、法务）。如果你的场景三条都不满足，用 o1 别用 Reflexion——这是 2023 到 2026 年最大的反模式翻转。"

- **选型判据**：先看是否满足上面三条之一；满足后看任务有可自动判定的 Evaluator 吗——没 Evaluator 别上 Reflexion，会让系统变慢且不可靠。

- **成本预估**：外置 Reflexion 的 token 消耗约为 ReAct 的 2-4 倍（actor + evaluator + reflector + retry actor）。在 [m209 - 推理成本控制手册](/kb/ai-工程化与落地架构/m209-推理成本控制手册/) 框架下做 ROI 估算，并与"直接用 o1 + 不反思"做对照。

- **避免误用**：把 Reflexion 包装成"通用 self-improvement"卖给客户——典型骗局。没有 Evaluator 就没有真正的 reflection，只是文字游戏。**2026 年的新版误用**：把"我们在 GPT-4 上加了 Reflexion"包装成创新，而不承认 o1 已经内置——这是过时的产品话术。

## 关联节点

**核心关联（必读）**：
- [A03 ReAct](/kb/agent-系统化专题/a03-react/)——Reflexion 必备的底层执行循环
- [c11 - System 2 思维与 Test-Time Compute](/kb/ai-基础知识库/c11-system-2-思维与-test-time-compute/)——理解外置 vs 内置反思的根本范式分歧
- [m209 - 推理成本控制手册](/kb/ai-工程化与落地架构/m209-推理成本控制手册/)——外置 Reflexion vs o1 的成本权衡
- [m207 - Agent 产品化：场景推演与失败模式](/kb/ai-工程化与落地架构/m207-agent-产品化-场景推演与失败模式/)——Evaluator 与 HITL 的关系

**延伸关联（可选）**：
- [A05 Plan-and-Execute](/kb/agent-系统化专题/a05-plan-and-execute/)、[A07 Multi-Agent Teams](/kb/agent-系统化专题/a07-multi-agent-teams/)
- [c10 - Agent 技术栈与工具调用](/kb/ai-基础知识库/c10-agent-技术栈与工具调用/)、[强化学习](/kb/ai-基础知识库/强化学习/)、[幻觉](/kb/ai-基础知识库/幻觉/)

---

## 修订日志

- **R4 → R5（2026-05-18)**:本轮聚焦出版就绪——B 类移段(§ 一 R4 复现性争议段位置不当)。修订要点:
  1. § 一末尾的"R4 诚实标注"长段(原约 380 字)精简为指针句,实际内容移到 § 四"判据 3"之后的独立专段"原论文 91% 数据的复现性争议(R5 重新组织)"——按 PM 认知顺序"先有选型框架,再看证据强度"
  2. 移段后 § 一保持原论文要点的叙事节奏,Rick 读完不会困惑"那为什么还要学 Reflexion";争议段在 § 四之后出现时,Rick 已经有"什么时候用 Reflexion" 的判据作为锚点
  3. 新增"对 PM 选型的影响"小段:**这一争议不推翻三条判据(判据 3 合规要求 / 判据 1-2 不依赖 91% 数字),但向工程团队推 Reflexion 时不要再用"80% → 91%"作为说服依据**——改用"反思笔记合规可审计性 + 单次成本经济性"
- **R3 → R4（2026-05-18）**：本轮聚焦反方对话训练 + 复现性争议显式标注 + 工业占比真实原因。修订要点:
  1. § 一加 "诚实标注" 段:Reflexion 原 91% 数据在 2024-2025 多次独立复现中被质疑,独立复现只达 83-88%,原 evaluator 用 ground truth 在生产中不存在;Anthropic 2025-06 multi-agent research blog 实际没用外置 Reflexion——这是 Reflexion 工业占比 < 20% 的具体证据
  2. § 四判据 3 加 R4 补充:即便 Reflexion 整体效果有争议,"反思笔记可审计" 是独立成立的性质——这是金融 / 医疗 / 法务的真理由,不依赖原 91% 数据
  3. 新增 "Reflexion 之所以从未真正主流的另一种解释" —— 反 confirmation bias:不再说"被 o1/o3 替代",而是承认 Reflexion 在工业上"从未真正崛起"——Evaluator 可靠性 / Token 成本 / 反思笔记维护成本三层是真原因
  4. 引入的对手立场:学界对 Reflexion 复现性的质疑 (EMNLP 2024 等)、Anthropic 自家 multi-agent research blog 实际不用 Reflexion 的工业证据、对"X 被 Y 替代" 简化叙事的批判
- **R2 → R3（2026-05-18）**：聚焦判断密度提升。本轮修订要点：
  1. § 一"等价于 in-context policy improvement"降为"被作者描述为类似机制"——回应 Round 2 [无证据-2]，避免对 RL 工程师哑火
  2. § 四全部重写为"Reflexion 在 o1/o3 时代何时仍值得用"——回应 Round 2 [失血-4]
  3. § 四给出三条具体判据（领域专属反思 / 成本敏感 / 可审计资产），每条带反例和"不要用 Reflexion"的反向边界
  4. § 五原"Reflexion 之后的演化"压缩，明确"已被 § 四的判断框架统摄"
  5. PM 决策启示加入面试反共识 Q+A 模板（"2026 年还该用 Reflexion 吗"）
  6. 关联节点分两档
- **R1 → R2（2026-05-18）**：作者署名"Labash" → 删除虚构、补回 Edward Berman，确认 6 人完整名单。

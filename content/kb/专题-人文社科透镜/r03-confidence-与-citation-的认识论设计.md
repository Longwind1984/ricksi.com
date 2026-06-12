---
title: R03 Confidence 与 Citation 的认识论设计
cluster: 专题 · 人文社科透镜
created: '2026-06-07'
updated: '2026-06-12'
provenance: ai
facet: AI 认识论中介
---

[A06 认识论决定产品设计](/kb/专题-人文社科透镜/a06-认识论决定产品设计/) 论证了"为什么"confidence 和 citation 必须从认识论立场推导而不是抄 UI——本节点回答"怎么做":给一套**可以照抄进 PRD 的设计模板**,把"诚实表达不确定 (honest uncertainty)"和"可溯源验证 (verifiable provenance)"两条认识论原则,落成 confidence display 与 citation 系统的**字段级规格、状态机、验收指标**。这是 0431 专题从哲学层落到工程台面的复现手册。本节的视角:**设计模板不是 UI 组件库,而是把认识论判断编译成可验收的产品契约**——读完能让一个 PM 直接写出"这个 confidence/citation 系统达标的标准是什么"。

## §0 为什么是"两条原则→两套契约"而不是"加一个置信度条 + 脚注"

绝大多数 AI 报告产品的 confidence/citation 是这样诞生的:看到竞品有个色块就抄一个,看到学术工具有脚注就加脚注。这是 UI 模仿,不是设计。问题在于:**抄来的组件携带着原产品隐含的认识论假设,而你的场景未必成立。** 把 Perplexity 风格的轻 citation 抄进医疗/法律报告,你抄走的是"AI 是可信证言者"这个假设——而那个场景里这个假设是错的(见 [A06 认识论决定产品设计](/kb/专题-人文社科透镜/a06-认识论决定产品设计/) §2 对 Freiman 的引用:AI 是不可问责的"技术性信念"来源)。

正确的起点是两条从认识论直接落下来的设计原则,各自编译成一套可验收契约:

| 认识论原则 | 一句话 | 编译成的产品契约 | 失败时的样子 |
|---|---|---|---|
| **诚实表达不确定** | 系统对用户的"我有多确定"不能比它实际可靠概率更自信 | confidence display 契约(§1–§2) | explainability theater:用可信外观掩盖不确定 |
| **可溯源验证** | 每条命题级声明都能被用户独立追到一个可核验来源 | citation 契约(§3–§4) | citation theater:脚注密度高、可核验性为零 |

> [!note] 本节点的赌注
> 我赌的是:**这两条原则可以被编译成离散的、可验收的字段与状态机**,而不是只能停留在"做得有诚意"的模糊期望。如果一个团队说不清"我们的 confidence 达标的标准是什么数字",那它做的就还是 UI 模仿。这个赌注的失效边界(模板会过度工程化的场景)见 §6。

## §1 Confidence 模板(一):置信度的来源契约——禁止自报

诚实表达不确定的**第一条铁律**:展示给用户的置信度,不能等于模型自报置信度。原因 [A06 认识论决定产品设计](/kb/专题-人文社科透镜/a06-认识论决定产品设计/) §1 已接 [c13 - 幻觉的不可消除性](/kb/基础知识库/c13-幻觉的不可消除性/) 论证过——softmax 是 token 级局部确定性,不是命题级真值概率,且模型最不确定时最自信。复现层把这条原则编译成一张**置信度来源白名单**:

| 置信度信号来源 | 类型 | 是否可用 | 工程实现 |
|---|---|---|---|
| 模型 logits / softmax 概率 | 自报 | **禁用**(命题级真值的伪信号) | —— |
| 模型自然语言里的"我很确定/可能" | 自报 | **禁用**(谄媚偏差,RLHF 对齐税) | —— |
| 检索命中数 + 来源间一致性 | 外部 | ✅ 主信号 | RAG 召回的 top-k 来源是否互相印证 |
| 是否触及训练分布边缘 / 时效边界 | 外部 | ✅ | 实体/事件是否晚于训练截止;OOD 检测 |
| 多次采样的答案稳定性(self-consistency) | 半外部 | ✅ 辅助 | 同问题多次生成,答案方差 |
| 是否有 ground-truth 反馈回路 | 外部 | ✅(封闭域专属) | 结构化字段可与权威库对账 |

**最小可运行(MVP)规格:** confidence = f(检索一致性, 分布边缘标志),两个外部信号即可起步;严禁把模型自报塞进 f。**中型生产规格:** 加入 self-consistency 采样方差 + 时效边界检测,做成多信号加权,权重在校准集上拟合(见 §2)。**进阶规格:** 引入 Ferrario 互补性视角([A06 认识论决定产品设计](/kb/专题-人文社科透镜/a06-认识论决定产品设计/) §5 对手框架二)——confidence 不只报"AI 多可靠",还建模"这个用户在这个情境下能多大程度纠正 AI",输出**复合过程置信度**。

**判断主轴(置信度来源的三个致命错位):**

1. **症状**:为了"省事",直接把模型 logits 映射成红黄绿。**为什么会错**:见上,token 概率 ≠ 命题真值概率,二者关系系统性错位([c13 - 幻觉的不可消除性](/kb/基础知识库/c13-幻觉的不可消除性/))。**正确做法**:confidence 函数的输入端必须是来源白名单里的外部信号。**真实反例**:据 *Nature Machine Intelligence*(2025)研究,LLM 难以可靠区分"信念"与"知识",2024 年 5 月后的新模型承认虚假第一人称信念的概率比旧模型低 **34.3%**〔数字来自研究简报转引,待核实原文〕——越新的模型自报置信度越不可信,直接用 logits 等于越升级越退步。
2. **症状**:用"温度=0 让输出更确定"来制造稳定感。**为什么会错**:降温让输出稳定不等于让它更对,稳定的错误依然是错误——这只是消除了 self-consistency 这个**有用的不确定性信号**。**正确做法**:保留采样多样性来测方差,把方差当 confidence 输入,而不是消灭它。
3. **症状**:把 confidence 做成全局单值(整段报告一个分数)。**为什么会错**:不同声明的来源强度差异极大,全局值掩盖了局部高风险声明。**正确做法**:confidence 必须**绑定到 claim**(见 §2)。

## §2 Confidence 模板(二):展示粒度、状态机与校准验收

诚实表达不确定的**第二条铁律**:置信度必须 **claim-level(声明级)**,且低置信度要**改变交互模式**而非仅改颜色。这接 [A06 认识论决定产品设计](/kb/专题-人文社科透镜/a06-认识论决定产品设计/) §1 判断主轴第 2、3 条(Lee & See 的"信任分辨率"、低置信应触发 HITL)。

**字段级模板(可直接进 schema):**

```yaml
claim:
  text: "<一条可独立核验的命题>"
  confidence_score: 0.0–1.0          # 来自 §1 外部信号,非自报
  confidence_band: high | medium | low | refuse
  signals:                           # 必须可解释为何是这个分数
    retrieval_agreement: 0.0–1.0
    distribution_edge: bool
    self_consistency_var: 0.0–1.0
  sources: [<citation_id>, ...]      # 接 §3,low 以上必须非空
  interaction_mode: inline | flag_verify | force_review | withhold
```

**置信度→交互模式状态机(核心创新点,不是色块而是行为):**

| confidence_band | 颜色(辅助) | interaction_mode | 认识论理由 |
|---|---|---|---|
| high | 绿 | inline 正常展示 | 来源一致、分布内,适当依赖成立 |
| medium | 黄 | flag_verify:标注"建议核验"+ 一键展开来源 | 把核验成本前置给用户,但不阻断 |
| low | 红 | **force_review**:折叠结论,要求用户主动展开并标注是否采信 | 低置信不只是标黄;[A06 认识论决定产品设计](/kb/专题-人文社科透镜/a06-认识论决定产品设计/) §1 判断主轴 3 |
| refuse | 灰 | **withhold**:拒答 + 说明为何不答 | 高后果 + 低可靠时,拒答优于"给更多解释让人自己判断" |

> [!note] 关键设计赌注
> 把 low 置信绑定到 **force_review**(改变交互而非仅改色)是本模板与市面 confidence bar 的根本分野。理由:Renieris 等(*MIT Sloan Management Review*, 2025,*AI Explainability: How to Avoid Rubber-Stamping Recommendations*)指出的 "explainability theater" 效应——更高透明度有时**增加**过度依赖。仅改颜色的 confidence 是透明度剧场;改变交互模式才是真正校准信任。

**校准验收指标(没有这个,confidence 就是装饰):**

confidence display 是否诚实,有可量化验收标准——**校准曲线 / 可靠性图(reliability diagram)**:把声明按 confidence_score 分桶,看每桶里"实际为真的比例"是否等于该桶的标称置信。理想是对角线。常用单指标 **ECE(Expected Calibration Error,期望校准误差)= 各桶 |标称置信 − 实际准确率| 的加权平均**〔ECE 为机器学习校准领域标准指标,概念成立;具体阈值需按场景设定〕。

| 验收项 | 及格线 | 优秀线 | 反例(不达标) |
|---|---|---|---|
| confidence 来源 | 0% 来自模型自报 | 多外部信号加权且权重在校准集拟合 | logits 直映色块 |
| 粒度 | claim-level | claim-level + signals 可展开溯因 | 整段一个全局分 |
| 校准(ECE) | 在保留校准集上 ECE 可测且有目标值 | ECE 持续监控、随分布漂移重校准 | 从不测校准 = 不知道分数是否诚实 |
| low 置信行为 | 改变交互(force_review/withhold) | 阈值按后果分级 | 只改颜色 |

## §3 Citation 模板(一):溯源的字段契约——可核验性而非存在性

可溯源验证的**第一条铁律**:citation 的价值是 **verifiability(可核验性)**,不是 **presence(存在性)**。[A06 认识论决定产品设计](/kb/专题-人文社科透镜/a06-认识论决定产品设计/) §2 判断主轴已论证最致命错位是"citation 数量当可信度指标"——一堆格式精美的脚注会借 Fricker 认识论不公(*Epistemic Injustice*, 2007)所说的"可信度给予受表象偏见影响"而不当抬高接受度,即便没人点开。复现层把"可核验"编译成强制字段:

```yaml
citation:
  id: <citation_id>
  claim_id: <被支撑的具体声明>        # claim-level 锚定,非段落级
  source_uri: <可点击直达的原始位置>   # 精确到段落/页码/时间戳,非首页
  source_quote: "<被引用的原文片段>"   # 让用户对照,而非只给链接
  grounding_match: 0.0–1.0           # 检索层(grounding)与展示层一致性
  retrieval_timestamp: <ISO8601>     # 来源被检索的时刻
  source_type: primary | secondary | model_inferred
  accessible: bool                   # 链接是否真实可达(死链检测)
```

两个字段是这套模板与"普通脚注"的认识论分水岭:

- **`source_quote`(原文片段)**:citation 不能只给链接,必须给被引的原文片段让用户**就地对照**。这把"信任 AI 说来源支持了它"降级为"用户自己核验来源是否支持"——正是 [A06 认识论决定产品设计](/kb/专题-人文社科透镜/a06-认识论决定产品设计/) §2 所说"把不可问责的中介降级回仪器姿态"的工程实现。
- **`grounding_match`(检索-展示一致性)**:[A06 认识论决定产品设计](/kb/专题-人文社科透镜/a06-认识论决定产品设计/) §2 与 [c13 - 幻觉的不可消除性](/kb/基础知识库/c13-幻觉的不可消除性/)、0427 都点过最危险的失效——**grounding 层(检索到的)和 citation 层(展示出的)不一致**:仪器读数对了但旁边的校准证书是伪造的,比没证书更危险,因为制造了可核验的假象。这个字段把那道缝隙变成一个可监控的数字。

**判断主轴(citation 的三个致命错位):**

1. **症状**:citation 指向来源**首页/域名**而非具体段落。**为什么会错**:用户无法实际核验,可核验性为零,等于 citation theater。**正确做法**:`source_uri` 必须深链到段落/页码/时间戳 + 附 `source_quote`。
2. **症状**:用 citation 数量当质量信号("我们平均每段 5 个引用")。**为什么会错**:见 Fricker——表象偏见抬高接受度而非真值。**正确做法**:验收指标是"citation 点击核验转化率 + grounding_match",不是脚注密度(见 §4)。
3. **症状**:`source_type` 不区分一手/二手/模型推断,把模型自己推出来的"看起来像引用"的内容混进 citation。**为什么会错**:模型推断的"伪 citation"是幻觉的高危形态([c13 - 幻觉的不可消除性](/kb/基础知识库/c13-幻觉的不可消除性/) 的引用幻觉)。**正确做法**:`model_inferred` 必须显式标记且默认不计入可信来源。

## §4 Citation 模板(二):溯源状态机与验收指标

可溯源验证的**第二条铁律**:citation 系统要为 **grounding-display 一致性**和 **死链**设状态机,并以"用户真去核验"为验收目标,而非脚注存在。

**citation 完整性状态机:**

| 状态 | 触发条件 | 系统行为 |
|---|---|---|
| verified | grounding_match ≥ 阈值 且 accessible=true 且 source_quote 与 source_uri 一致 | 正常展示 citation |
| weak | grounding_match 中等 或 source_type=secondary | 展示但标注"来源较弱,建议交叉核验" |
| broken | accessible=false(死链)或 source_quote 在 source_uri 找不到 | **降级对应 claim 的 confidence**,标注"溯源失效" |
| fabricated_risk | model_inferred 或 grounding_match 极低 | **拦截**:该 claim 不得以"有来源"形态展示,触发 §1 的 withhold |

注意 **broken → 降 confidence** 的耦合:citation 失效要反向拉低 confidence,因为一条无法溯源的声明在认识论上就是低置信的。这把 §1–§4 两套契约**锁在一起**,防止"高置信 + 假来源"这种最危险组合。

**citation 验收指标:**

| 验收项 | 及格线 | 优秀线 | 反例 |
|---|---|---|---|
| 锚定粒度 | claim-level | claim-level + source_quote 就地对照 | 段落级/文末统一脚注 |
| grounding-display 一致性 | grounding_match 可测、有阈值 | 持续监控、低于阈值自动降级 | 检索到 A 展示引 B,无检测 |
| 死链 | 发布前死链检测 | 实时 accessible 校验 + broken 降级 | 链接 404 仍展示为可信引用 |
| **核验转化** | 可观测"用户点开来源率" | 优化"用户真核验"而非脚注密度 | 以 citation 数量为 KPI |

> [!note] 反共识验收主张
> 一个 citation 系统的真实质量,**与脚注数量负相关、与单条 citation 的可核验深度正相关**。市面把"引用丰富"当卖点,本模板把"每条引用都能被点开对照原文片段、且 grounding 一致"当验收线。前者优化的是可信外观,后者优化的是认识论内容。

## §5 把两套契约合成一张验收检查表(可直接贴进 PRD)

复现的最终交付物是这张表——让任何人(包括非 PM 的评审)能逐条判定一个 AI 报告产品的 confidence/citation 是否"认识论达标":

```
[Confidence 诚实表达不确定]
□ 置信度 0% 来自模型自报(logits/自然语言),100% 来自外部信号白名单
□ confidence 为 claim-level,signals 可展开溯因
□ 有保留校准集,ECE 可测、有目标值、随分布漂移重校准
□ low 置信触发 force_review,refuse 触发 withhold(改变交互,不止改色)

[Citation 可溯源验证]
□ citation 锚定到 claim,深链到段落/页码,附 source_quote 原文片段
□ grounding_match 可测,检索层与展示层不一致时自动降级/拦截
□ 发布前死链检测,broken 状态反向拉低对应 claim 的 confidence
□ model_inferred 显式标记且默认不计入可信来源
□ 验收 KPI 是"核验转化率 + grounding 一致性",不是脚注密度

[两套契约的锁]
□ citation broken → 降 confidence(禁止"高置信 + 假来源")
□ confidence low → 强制展示 citation 供核验(禁止"低置信无溯源")
```

## §6 产品 PM 视角补盲 + 对手框架回应与失效边界

**产品 PM 视角补盲(三个工程 PM 看不到的走样点):** 其一,**商业模式冲突**——诚实标 low/refuse 会降低"AI 显得很聪明"的当下体感和转化率,团队有结构性动机做 confidence theater([A06 认识论决定产品设计](/kb/专题-人文社科透镜/a06-认识论决定产品设计/) §4)。本模板的 ECE 验收和核验转化 KPI 就是把这个利益冲突**显性化为可审计指标**,堵住"悄悄注水"。其二,**用户姿态漂移**——低后果时用户把 AI 当全知证言者,出事后改口"我以为它只是工具";force_review 的存在本身在塑造用户的认识姿态,是产品对用户心理模型的主动管理。其三,**合规外部性**——EU AI Act(2024-08-01 正式生效；高风险系统义务自 2026-08-02 适用)要求"有效的人类监督",本模板的 force_review/withhold 状态机正是把"有效"从"有人在回路"翻译成可验收条件的抓手〔EU AI Act 高风险监督的具体条款编号与条文待核实〕。

**对手立场(接受 + 边界):计算可靠主义——"别搞这么重的契约,可靠性指标够了"。** Durán 与 Formanek(*Grounds for Trust: Essential Epistemic Opacity and Computational Reliabilism*, arXiv:1904.01052, 2019,本会话 WebFetch 核实标题/作者/四类依据)主张:计算系统可被信任不需要透明/完全可解释,只需四类可靠性依据(验证与确认程序、鲁棒性分析、(不)成功实现的历史、专家知识)。对本节点这是真对手——它暗示"做好可靠性指标就行,不必上 claim-level citation + source_quote 这么重的契约"。**我接受**:在封闭、稳定、有 ground-truth 反馈回路的低后果场景,§1–§4 的全套契约确实是过度工程化,这时一个经良好校准的全局 confidence + 轻 citation 是更经济的替代——CR 的指标可以替掉重契约。**但我坚持的边界**:AI 报告类产品恰恰是开放域、分布持续漂移的场景,CR 自己承认在 distribution shift / update opacity 下失效(Durán et al., *Minds and Machines*, 2026〔经研究简报转引,待核实〕),此时"历史成功记录"这条依据最不可靠,正是必须靠 claim-level 可核验 citation 兜底之处。换言之,**这套重契约的适用区间 = 开放域 × 高后果 × 分布漂移;CR 路径的适用区间 = 封闭域 × 低后果 × 有反馈回路。**

**failure scenario 显式标注:** (a) **低后果高频专家场景**(资深码农用 AI 补全):force_review 会变成纯摩擦,本模板"重契约"主张失效,应退回轻量 confidence。(b) **封闭域有 ground truth**:§1"自报置信度系统性失真"前提被局部突破,模型自报经校准后或可有限使用,[c13 - 幻觉的不可消除性](/kb/基础知识库/c13-幻觉的不可消除性/) 的悲观结论被局部缓解。(c) **来源本身不可靠的领域**(如争议性政治议题):citation 的可核验性提升了,但"被核验的来源是否可信"是 citation 系统无法解决的——这超出本模板边界,需上 0117社会学 层面的来源权威性评估。

**confirmation-bias 砍除:** 本模板反复用 Renieris(2025)、Huemmer(2026,经 [A06 认识论决定产品设计](/kb/专题-人文社科透镜/a06-认识论决定产品设计/) 引)等"透明度反而增加过度依赖"的证据来支持"重契约 + 改变交互",这有挑支持性证据之嫌。补反例:也有研究显示**良好设计的 explanation 确实提升校准**(并非所有透明度都是剧场),关键变量是接收者的认知能力与解释的认知负荷;本模板的 force_review 若设计不当,同样可能制造"确认疲劳"——用户被迫点太多确认后转为机械点击,反成新的 rubber-stamping。所以验收必须监控 force_review 的**实际核验质量**(是否产生了分歧标注/补充来源),而非触发次数。

## §7 跨域呼应:言语行为理论为什么是 confidence display 的认识论底座

调度 **speech act theory(言语行为理论,Austin / Searle)**——这是本节点相较 [A06 认识论决定产品设计](/kb/专题-人文社科透镜/a06-认识论决定产品设计/) §6(维特根斯坦语言游戏)的不同跨域调度,专门照亮 confidence 而非 citation。Austin 的核心区分:一句话除了**命题内容(locution)**,还携带**施事力(illocutionary force)**——"断言"是一种言语行为,它隐含一个**真诚条件(sincerity condition)**:断言者应相信所断言为真,且其确信程度应与措辞的确定性相称。Searle 进一步把断言归为"断言类(assertives)",其成功条件包括说话者对命题真值的承诺。

把这把刀架到 confidence display 上:**AI 输出一段"看起来在断言"的报告,但它无法满足断言的真诚条件**——它没有"相信",也没有可与确定性措辞相称的内在确信状态([Polanyi 默会知识与提示工程的认识论张力](/kb/基础知识库/polanyi-默会知识与提示工程的认识论张力/) 已论证 LLM 不符合 Polanyi 的认知者资格,无切身承诺)。这**直接改变了 confidence display 的设计判断**:confidence display 的真正功能,不是"告诉用户 AI 有多确定",而是**人工补上 AI 无法自带的真诚条件**——因为 AI 的自然语言里那些"我确定/可能"的施事力是**伪造的施事力**(§1 禁用自报置信度的深层理由正在于此:那是没有真诚条件支撑的断言)。confidence display 用外部信号重建一个"可被问责的确定性声明",把 AI 的伪断言降级为"附带外部校准标签的数据"。这就是为什么 §1 铁律是"禁止自报"——自报置信度等于让 AI 自己声明真诚条件,而它恰恰不具备真诚条件。这条呼应可链入 0114认识论 的语言哲学与可靠主义分支。

## §8 PM 决策启示

- **面试怎么用**:被问"怎么设计 AI 报告的置信度和引用?"——不要答组件。答:"我会把它编译成两套可验收契约。confidence:禁止自报、来自外部信号、claim-level、用 ECE 验校准、low 置信改交互而非改色;citation:claim 锚定 + 原文片段就地对照 + grounding 一致性监控 + 死链反向降 confidence。两套用'broken→降置信''low→强制溯源'锁在一起。验收 KPI 是核验转化率和 ECE,不是脚注密度。" 这把候选人从"会画 UI"拉到"会定义达标标准"。
- **选型怎么用**:拿 §5 检查表逐条勾供应商。三个最快暴露问题的探针:(1) 你的 confidence 来自 logits 还是外部信号?(2) citation 能不能点到原文那一段、给原文片段?(3) 检索到的来源和展示的来源不一致时,系统知道吗?三个答案直接预测产品会不会制造过度信任。
- **复现怎么用**:做内部 AI 工具时,先把 §1 的来源白名单和 §3 的 citation schema 写进数据契约,再写状态机(§2/§4),最后才做 UI——UI 是契约的渲染,不是设计的起点。§5 检查表就是这个工具的 Definition of Done。

## §9 结尾陷阱:把模板填满 ≠ 认识论达标

这套模板最大的风险,是它自己会变成新一层 **theater(剧场)**。一个团队可以把 §5 检查表全部打勾——有 claim-level confidence、有 source_quote、有 ECE 监控、有 force_review——却依然在做 rubber-stamping。三个具体陷阱:

1. **ECE 刷分陷阱**:校准误差可以靠在"容易的桶"上刷低来掩盖"高后果桶"的失真。**破法**:ECE 必须**按后果分层报告**,高后果声明的校准单独验收,不许用低后果样本稀释。
2. **force_review 疲劳陷阱**:触发太频繁,用户从"认真核验"退化为"机械点确认"——force_review 反而**生产**了它本想消灭的 rubber-stamping(§6 confirmation-bias 砍除已预警)。**破法**:验收 force_review 的**核验质量**(是否产生分歧标注/补充来源),而非触发次数;触发阈值要省着用。
3. **source_quote 对照陷阱**:给了原文片段,但用户不读——可核验性(verifiability)只是**让核验成为可能**,不等于核验**发生**。这正是 [A06 认识论决定产品设计](/kb/专题-人文社科透镜/a06-认识论决定产品设计/) §3 接 0418 的核心残酷真相:**verification 才是瓶颈,不是溯源的缺失**(Huemmer 2026:对 AI 输出的验证置信度在最需要处下降 68.1%〔数字经 [A06 认识论决定产品设计](/kb/专题-人文社科透镜/a06-认识论决定产品设计/) 引,样本局限〕)。

终极陷阱因此是:**confidence 与 citation 设计能解决"让核验成为可能",但解决不了"让人真去核验"。** 后者是 [A03 Verification vs Rubber-stamping](/kb/专题-人文社科透镜/a03-verification-vs-rubber-stamping/) 与 0418 的战场,需要 HITL 触发条件([A06 认识论决定产品设计](/kb/专题-人文社科透镜/a06-认识论决定产品设计/) §3)从交互层强制,而不是指望 confidence/citation 自动唤起用户的认识论勤勉。把这套模板当成"做完就安全"的清单,本身就是最深的认识论自满——它让你**感觉**尽到了诚实与溯源的义务,而义务的另一半(用户真的形成了有正当性的信念)根本不在这套模板的射程内。这是本节点必须交还给读者的边界。

## §10 与已有节点的关系(升级对照,不复述事实基础)

- **对 [A06 认识论决定产品设计](/kb/专题-人文社科透镜/a06-认识论决定产品设计/)——落地补全**:A06 论证"为什么"三套机制各对应一条认识论判断(confidence←校准、citation←证言/仪器地位、HITL←verification);R03 不复述论证,而是把其中 confidence 与 citation 两套**编译成字段级 schema、状态机与验收指标**——从"设计原理"落到"可贴进 PRD 的契约"。
- **对 [c13 - 幻觉的不可消除性](/kb/基础知识库/c13-幻觉的不可消除性/)——工程化应对**:c13 论证校准失真与引用幻觉的架构成因;R03 不复述成因,而是把"禁止自报置信度""model_inferred 拦截""grounding-display 一致性监控"作为对这些不可消除风险的**具体工程闸门**——从"风险存在论"落到"字段级护栏"。
- **对 0427(知识系统专题)——补 citation 的认识论 schema**:0427 把 citation 当产品契约;R03 给出这个契约的**可核验性字段规格**(source_quote + grounding_match + 死链状态机),并补上"为什么验收 KPI 是核验转化而非脚注密度"。
- **对 0418(审阅瓶颈专题)——划清边界**:0418 建立 verification bottleneck;R03 在 §9 显式承认本模板**解决不了**这个瓶颈(只解决"让核验可能"),把"让核验发生"交还给 HITL 触发条件——是一次诚实的范围划界,而非覆盖。

## §11 关联节点

**核心(必读):**
- [A06 认识论决定产品设计](/kb/专题-人文社科透镜/a06-认识论决定产品设计/)——本节点的"为什么",R03 是它的复现落地
- [c13 - 幻觉的不可消除性](/kb/基础知识库/c13-幻觉的不可消除性/)——禁止自报置信度、citation 拦截的架构前提
- [A03 Verification vs Rubber-stamping](/kb/专题-人文社科透镜/a03-verification-vs-rubber-stamping/)——§9 结尾陷阱指向的战场
- [Polanyi 默会知识与提示工程的认识论张力](/kb/基础知识库/polanyi-默会知识与提示工程的认识论张力/)——AI 无真诚条件/认知者资格,§7 跨域底座
- 0114认识论——可靠主义/校准/言语行为的哲学入口
- [RAG](/kb/基础知识库/rag/)——grounding 层,citation 的 source_quote 与 grounding_match 技术依托
- [幻觉](/kb/基础知识库/幻觉/)——基础概念

**延伸(可选):**
- [Agent](/kb/基础知识库/agent/)——HITL 触发与 force_review 的执行载体
- 0117社会学——来源权威性/可信度给予(§6 failure scenario c)
- 本专题同级:[A04 校准与信任的认识论](/kb/专题-人文社科透镜/a04-校准与信任的认识论/)、[S03 认识论友好 AI 全景](/kb/专题-人文社科透镜/s03-认识论友好-ai-全景/)
- [AI PM 知识图谱·总索引](/kb/ai-pm-知识图谱/ai-pm-知识图谱-总索引/)——专题入口

## 待建概念清单(死链登记,绝不在主库建 stub)

以下概念在本节点被援引但 vault 中无确认存在的节点,降级为普通文本,登记待建:
- speech act theory / 言语行为理论(Austin / Searle)、illocutionary force(施事力)、sincerity condition(真诚条件)
- ECE / Expected Calibration Error(期望校准误差)、reliability diagram(可靠性图)
- self-consistency(采样一致性)作为不确定性信号
- explainability theater / citation theater(认识论区分)
- grounding-display 一致性(检索层与展示层一致性)
- Computational Reliabilism(Durán & Formanek)
- Andrea Ferrario / 互补性可靠论(复合过程置信度)
- Miranda Fricker / 认识论不公(可信度给予偏见)——vault `0114认识论` 无 Fricker 人物卡
- verification bottleneck(0418 已建为专题,概念卡待补)

## 修订日志

- R1(2026-06-07):首稿。把"诚实表达不确定 + 可溯源验证"两条认识论原则编译成两套可验收契约:confidence(§1 来源白名单禁自报 / §2 claim-level 状态机 + ECE 校准验收)、citation(§3 字段 schema 含 source_quote + grounding_match / §4 完整性状态机 + 核验转化 KPI),并用"broken→降置信""low→强制溯源"把两套锁在一起(§5 PRD 检查表)。§7 言语行为理论(Austin/Searle 真诚条件)跨域呼应落地,与 A06 维特根斯坦调度区分。§9 结尾陷阱:模板填满≠认识论达标,verification 才是瓶颈,显式交还给 HITL/0418。对手框架计算可靠主义(Durán & Formanek)"接受+边界"落在适用区间划分。与 A06/c13/0418/0427 显式升级对照。事实接地:arXiv:1904.01052(Durán & Formanek 2019,标题/作者/四类依据)与 Renieris/Kiron/Mills 2025 MIT SMR 文章标题本会话 WebFetch/WebSearch 核实;Fricker 2007、Lee & See 2004 经研究简报核实;Nature MI 2025 的 34.3%、Huemmer 68.1%、EU AI Act 条文、ECE 阈值、Minds and Machines 2026 仍标〔待核实〕待复核。死链全部降级为普通文本并登记待建概念清单。
- 2026-06-12 内审修复:§产品 PM 视角补盲处 EU AI Act 生效口径统一为"2024-08-01 正式生效;高风险系统义务自 2026-08-02 适用"(权威值,呼应总览 §8 QC #5);具体条款编号/条文、Nature MI 34.3%、Minds and Machines 2026 卷期仍诚实保留〔待核实〕。

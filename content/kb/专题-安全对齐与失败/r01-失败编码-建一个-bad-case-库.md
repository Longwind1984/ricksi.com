---
title: R01 失败编码·建一个 bad-case 库
cluster: 专题 · 安全对齐与失败
created: '2026-06-07'
updated: '2026-06-12'
provenance: ai
facet: 失败考古学
---

# R01 失败编码·建一个 bad-case 库

复盘会上每个人都在讲故事——"那次 Bard 把韦伯望远镜的功劳记错了""上次机器人答应了 1 美元买车"。故事会过期、会走样、会随讲述者立场漂移，而且**不可聚合**：你没法把一百个故事相加得出"我们的失败主要集中在哪一层"。本节点要解决的问题是：把一批真实 bad case **编码成结构化记录**，让分散的事故变成可查询、可统计、可反推设计原则的资产。视角/框架名是「failure coding」——借自质性研究的编码（coding）方法论和安全工程的 incident database 传统：不写自由文本叙事，而是给每个 case 打上**受控字段**（失败类型 / 触发 / 层级 / 修复），让 [A02 AI 产品失败分类学·五类](/kb/专题-安全对齐与失败/a02-ai-产品失败分类学-五类/) 的五类骨架从一张理论矩阵变成一张能跑 SQL 的表。这不是 case-by-case 的案例集，而是**把案例集变成可分析数据集**的操作手册——给模板、给示例、给治理纪律，结尾讲清一件事：库会腐化，不治理就是负资产。

## §0 为什么是"受控字段编码"而不是"事故时间线归档"

业界整理 AI bad case 的默认方式有两种，都会让库在三个月后变成查不动的坟场。

第一种是**时间线归档**（按日期堆 incident 报告、Notion 卡片、Slack 复盘帖）。它的致命缺陷不是"不全"，而是**不可聚合**——每条记录的字段都是自由文本，你永远无法回答"我们 input 类失败占比多少""boundary 类的平均修复周期是多久"。AI Incident Database（AIID，截至 2026-06-04 收录 1,516 个 incidents，来源 [incidentdatabase.ai](https://incidentdatabase.ai/)）恰恰栽在这里的一个变体上：它有 taxonomy 字段，但字段**可选填**，实践中填写不一致，导致跨 incident 的系统性分析极其困难（[arXiv:2501.17037v1, IEEE PuneCon 2024](https://arxiv.org/html/2501.17037v1)）。一个有 1500 条记录却无法做横切统计的库，和一个 Slack 频道没有本质区别。

第二种是**按技术栈归档**（模型层 bug / 检索层 bug / UI 层 bug）。问题和 [A02 AI 产品失败分类学·五类](/kb/专题-安全对齐与失败/a02-ai-产品失败分类学-五类/) §0 警告的一样：它**预设失败是技术性的**，于是 organizational（流程）和 adoption（场景契合）失败无处安放，被强行塞进"模型不够好"。库的分类轴一旦建在技术栈上，所有记录都会向"fix the prompt"收敛——这正是 [c13 - 幻觉的不可消除性](/kb/基础知识库/c13-幻觉的不可消除性/) 反复警告的西西弗斯循环：把架构性现象当工程 bug 修，调一个 prompt、漏一类失败。

本节点选**受控字段编码**，判据是**可聚合性 + 反检索（按修复层而非技术栈索引）+ 强制接地**。每条 case 必须填满一组**封闭枚举字段**（不是自由文本），其中"失败类型"直接绑定 [A02 AI 产品失败分类学·五类](/kb/专题-安全对齐与失败/a02-ai-产品失败分类学-五类/) 的五类，"层级"绑定 安全感知与干预 的多层级干预结构。这个选择不是凭空发明——它综合了三个成熟传统：(a) AIID 仿照的**航空/医疗 incident tracking 体系**（强制字段 + 根因编码）；(b) 安全工程的 **Swiss Cheese Model**（待建概念卡）（Reason, *Human Error*, Cambridge UP, 1990）——每条 case 不止记"哪片奶酪有洞"，还记"为什么多层洞同时对齐"；(c) Microsoft 2025 Agentic AI 失败模式白皮书的"按影响 × 按新颖性"双维编码（[Microsoft Security Blog, 2025-04-24](https://www.microsoft.com/en-us/security/blog/2025/04/24/new-whitepaper-outlines-the-taxonomy-of-failure-modes-in-ai-agents/)）。但本库把它们的"原因导向"改造成 PM 更用得上的"**修复层导向**"——每个字段的终极目的都是回答"下次该在哪一层投入"。

## §1 编码 Schema：12 个受控字段

下面这张表是本节点的核心资产。它定义了一条 bad-case 记录的**完整 schema**——12 个字段，多数为封闭枚举（不允许自由发挥），少数为接地文本（必须带来源年份）。把它当数据库表设计读，不是当填空题读。

| 字段 | 类型 | 取值/约束 | 为什么是这个字段 |
|---|---|---|---|
| `case_id` | 标识 | `BC-YYYY-NNN`（如 BC-2023-001） | 稳定主键，永不复用；删除用 `archived` 软删 |
| `name` | 文本 | 简短可检索的事件名 | 人读入口，禁用故事化措辞 |
| `date` | 日期 | 事件**发生**日（非报道日） | 区分发生/报道/裁决三类日期，避免时间线污染 |
| `failure_type` | 枚举 | `input` / `output` / `boundary` / `adoption` / `organizational`（可多选，标主导类） | 绑定 [A02 AI 产品失败分类学·五类](/kb/专题-安全对齐与失败/a02-ai-产品失败分类学-五类/)，库的聚合主轴 |
| `trigger` | 枚举 | `adversarial-input`（对抗输入）/ `prompt-injection`（提示注入）/ `distribution-shift`（分布漂移）/ `over-trust`（过度信任）/ `spec-gap`（规格缺口）/ `process-gap`（流程缺口）/ `data-poison`（数据投毒） | 触发条件，决定"什么变量变了就出事" |
| `layer` | 枚举 | `data` / `model` / `boundary` / `ux` / `process`（对应五类修复层） | 反检索轴：按修复层而非技术栈索引 |
| `severity` | 枚举 | `S1致命`（人身/法律）/ `S2重大`（市值/品牌）/ `S3中等`（赔偿/下线）/ `S4轻微` | 仅用于排序，**不**作分类主轴（见 §3 错位一） |
| `legal_outcome` | 枚举 | `none` / `settled`（和解）/ `ruled`（裁决）/ `pending`（审理中） | 责任边界是否进入司法，boundary 类的关键 |
| `counterfactual` | 文本 | "换 X 变量是否还出事" | 反事实归因，借自 **STAMP/STPA**（待建概念卡） |
| `fix_lever` | 文本 | 主导修复层的具体杠杆 | 从失败反推的设计原则落点 |
| `source` | 文本 | 可追溯线索（机构+标题+年份），或 `〔待核实〕` | **强制接地**，无来源不入库 |
| `confidence` | 枚举 | `confirmed`（多源核实）/ `reported`（单源/据称）/ `disputed`（有争议） | 认识论自觉，区分事实与据称 |

三条 schema 设计纪律，决定库会不会腐化：

1. **`failure_type` 与 `layer` 强制配对，且 `failure_type` 可多选但必须标主导。** 真实大事故几乎都是跨类复合（[A02 AI 产品失败分类学·五类](/kb/专题-安全对齐与失败/a02-ai-产品失败分类学-五类/) §1 的核心纪律），允许多选才不丢信息；强制标主导，才能做聚合统计。
2. **`source` 与 `confidence` 是入库门禁。** 没有可追溯来源的 case 不允许进库——这是从 [A01 失败考古学方法论](/kb/专题-安全对齐与失败/a01-失败考古学方法论/) 的事实接地纪律继承的硬约束。媒体广传但无原始方法论的数字（如"80%/95% AI 项目失败"）一律标 `〔待核实〕` + `confidence: disputed`，不伪装成事实。
3. **`severity` 不进分类主轴。** 这是和 AIID 等库最大的区别——按严重度排是事故报告的语言，对"该修哪一层"零信息量（[A02 AI 产品失败分类学·五类](/kb/专题-安全对齐与失败/a02-ai-产品失败分类学-五类/) §0）。severity 只用于优先级排序。

## §2 编码示例：五条真实 case 跑通 Schema

光有模板不够，得看它在真实 case 上跑通。下面用本专题已核实的五条 case 各填一行——注意每条的 `failure_type` 主导类、`counterfactual` 反事实、`source` 接地三者如何咬合。

```yaml
# BC-2023-001  Google Bard demo 事实错误
failure_type: [output]            # 主导：output
trigger: spec-gap                 # 发布 demo 未设事实核验门禁（含 organizational 次因）
layer: model                      # 生成层对齐，非数据污染
severity: S2重大                  # 市值类
legal_outcome: none
counterfactual: "换更大的模型也会出事——Softmax 保证每位置必有输出，事实幻觉是概率采样的结构性结果"
fix_lever: "生成层不确定性外显 + demo 发布前事实核验门禁（参 p304 四级策略）"
source: "CNN Business, 2023-02-08; AIAAIC Incident Database"
confidence: confirmed
# 后果：Alphabet 单日市值蒸发约 1000 亿美元（confidence 降级注：单一归因有争议，叠加宏观因素）

# BC-2016-001  Microsoft Tay 16 小时被下线
failure_type: [input, organizational]   # 主导：input；次：organizational
trigger: data-poison              # 4chan/Twitter 有组织对抗性投喂
layer: data
severity: S2重大
legal_outcome: none
counterfactual: "换更强模型仍会出事——根因是『重复用户说的话』的功能设计 + 已知风险未在发布前拦截"
fix_lever: "输入消毒 + 对抗性 red teaming 发布门禁（input 层）；已知风险评审（organizational 层）"
source: "Wikipedia: Tay (chatbot); TechCrunch, 2016-03-24; IEEE Spectrum 复盘"
confidence: confirmed

# BC-2024-001  Character.AI 青少年伤害与诉讼
failure_type: [boundary, output]   # 主导：boundary（情感依赖边界 + 未成年人保护缺失）
trigger: over-trust               # 用户对拟人化 AI 的情感过度依赖
layer: boundary
severity: S1致命                  # 至少 1 人死亡（Sewell Setzer III, 2024-02-28）
legal_outcome: settled            # 2026-01-07 Google 与 Character.AI 与 Setzer 家庭和解，金额未披露
counterfactual: "换更好的模型不解决——核心是未对未成年人设情感/性化内容边界与危机干预 fallback"
fix_lever: "能力边界声明 + 高危情绪转人工/转热线 fallback（boundary 层）"
source: "AIID Incident #826; CNN Business, 2026-01-07; NPR 追踪报道"
confidence: confirmed
# 法律争议：聊天机器人对话是否受第一修正案保护——已和解，无法律定论

# BC-2024-002  Air Canada 机器人退款承诺被判有效
failure_type: [boundary]          # 主导：boundary（责任边界）
trigger: over-trust               # 用户信任机器人陈述并据此行动
layer: boundary
severity: S3中等
legal_outcome: ruled              # Moffatt v. Air Canada, 2024 BCCRT 149，判赔 CAD $650.88
counterfactual: "换更准的模型不解决——公司试图主张『机器人是独立实体』免责被驳回，根因是责任边界未界定"
fix_lever: "机器人输出不绑定公司法律承诺 + 责任契约显式化（boundary 层）"
source: "CanLII 2024 BCCRT 149 全文; ABA 分析, 2024-02"
confidence: confirmed
# 边界注：BC 民事裁判所属行政裁判机构，裁决为 persuasive authority 非 binding precedent

# BC-2023-002  Chevrolet 经销商 AI 被诱导 $1 报价
failure_type: [boundary, input]   # 主导：boundary（权限边界）；触发是 input（注入）
trigger: prompt-injection         # Chris Bakke 直接提示注入
layer: boundary
severity: S4轻微                  # 无实际赔偿，机器人下线
legal_outcome: none               # $1 合同从未进入司法，未被裁决有效
counterfactual: "换更聪明的模型仍会被绕过——CMU 2023-07 证明后缀注入可系统性绕过主流模型过滤"
fix_lever: "敏感承诺走权限白名单 + 输出不绑定法律约束（boundary 层）+ 注入消毒（input 层）"
source: "AIID Incident #622; Futurism; Gizmodo, 2023-12"
confidence: disputed              # 争议：这是产品失败还是用户恶作剧？
```

这五条跑通后，库立刻能回答时间线归档永远答不了的问题：**按 `layer` 聚合**——五条里 boundary 占三条（含主导两条），说明本批 case 的修复杠杆主要不在模型层，而在权限/责任边界。这个结论，靠读五个故事是得不出来的。

## §3 判断主轴：建库时 90% 的团队会犯的四个错位

这是本节点的命门。每个错位带"症状 → 为什么会错 → 正确做法 → 真实反例"四件套。

**错位一：用 `severity` 当分类主轴（最常见，库一开始就废了）。**
- 症状：库按"致命/重大/轻微"分文件夹，S1 case 全员复盘，S4 case 没人看。
- 为什么会错：严重度是后果的语言，不是修复层的语言。它会让你把 Air Canada（S3，赔 650 加元）和 Character.AI（S1，死了人）判成两类问题——但它们的 `failure_type` 都是 boundary，修复杠杆在同一处（责任/能力边界界定）。按严重度建库，等于把同一类问题拆到不同抽屉，永远看不出它们是一回事。
- 正确做法：`failure_type` 和 `layer` 是分类主轴，`severity` 只做排序字段（§1 纪律 3）。
- 真实反例：上面 BC-2024-002（Air Canada, S3）与 BC-2024-001（Character.AI, S1）严重度差三级，但 `layer` 同为 boundary——库的价值正在于让它俩在同一聚合桶里现形。

**错位二：把 `trigger`（触发）填成 `failure_type`（类型）。**
- 症状：把"提示注入"既填进 trigger 又填进 failure type，库里多出一个 `injection` 失败类。
- 为什么会错：触发是"什么变量变了导致出事"，类型是"该在哪一层修"。提示注入是 trigger，但它可能导致 input 失败（间接注入污染检索源）或 boundary 失败（直接注入突破权限）——同一个 trigger 落在不同 layer。混淆二者，库就失去"反推修复层"的能力。
- 正确做法：trigger 和 failure_type 是两个正交字段。Chevrolet 案的 trigger 是 `prompt-injection`，但 failure_type 主导是 `boundary`（权限边界缺失），因为再聪明的模型也挡不住精心构造的注入（CMU 2023-07，[Fortune, 2023-07-28](https://fortune.com/2023/07/28/openai-chatgpt-microsoft-bing-google-bard-anthropic-claude-meta-llama-guardrails-easily-bypassed-carnegie-mellon-research-finds-eye-on-a-i/)）。
- 真实反例：BC-2023-002 trigger=prompt-injection、layer=boundary——若把它编成"injection 类失败"，下次复盘会去"加强注入检测"（治标），而正确杠杆是"敏感承诺走权限白名单"（治本）。

**错位三：跳过 `counterfactual` 字段，直接写"模型出错了"。**
- 症状：`fix_lever` 一栏永远是"再训练/换更大模型/调 prompt"。
- 为什么会错：没有反事实追问，所有失败都会归因到最后可见的那一层——模型行为层。这不是因为那是真根因，而是因为那是仪表盘上唯一看得见的层（[A01 失败考古学方法论](/kb/专题-安全对齐与失败/a01-失败考古学方法论/) 的可观测性前提）。`counterfactual` 字段强制你问 **STAMP/STPA**（待建概念卡） 式的问题："换掉这个变量，还会不会出事？"
- 正确做法：每条 case 必填 counterfactual，且答案若是"换完美模型仍出事"，则 `layer` 不能填 model。
- 真实反例：BC-2016-001（Tay）若跳过反事实，会编成"模型对齐不够"；填了反事实才看清——换更强的模型，只要"重复用户说的话"的功能没改、已知风险没在发布前拦，照样出事。所以 layer 是 data + process，不是 model。

**错位四：入库不设 `source`/`confidence` 门禁，让库里混入编造细节。**
- 症状：库里写着精确的后果数字（"损失 X 亿""Y 人受害"），但没人能追溯来源；半年后引用时已无法区分哪些是核实的、哪些是当时的传言。
- 为什么会错：bad-case 库的最大风险不是不全，而是**言之凿凿地存了假事实**——一旦一条编造的"后果"被当作真事实反复引用，它会污染整个库的可信度，比没有这条记录更糟。
- 正确做法：`source` 为空的 case 不入库；据称未核实的标 `〔待核实〕` + `confidence: disputed`，绝不伪装成确证。Character.AI 和解金额未披露——库里就如实记"settled, 金额未披露"，不臆测。
- 真实反例：BC-2023-001 后果"1000 亿美元市值蒸发"在多源出现，但部分分析师认为叠加宏观因素，库里据实标"单一归因有争议"，不写成铁板钉钉的因果。

## §4 产品 PM 视角补盲：库不是工程资产，是组织记忆

工程视角会把 bad-case 库当成一张数据表。PM 视角必须看到三个被工程视角漏掉的点。

- **用户心理：库的最大消费者是新人和怀疑者，不是数据库。** 一个 case 库真正的 ROI 不在"统计出失败分布"，而在新人入职第二周翻库时，能用十分钟看懂"我们为什么对高危情绪场景如此谨慎"——因为库里有 BC-2024-001。组织记忆的载体若是老员工的口头故事，老员工一走，记忆就清零；库把默会知识固化成可检索资产。这呼应 Rick 在滴滴安全侧的实践逻辑：事故不是用来追责的，是用来固化成下一轮设计约束的。
- **商业模式：库的字段决定它能不能进合规审计。** 当监管（EU AI Act 2024-08-01 正式生效、分阶段实施至 2026-08-02，美国 2024 年 45 州近 700 个 AI 法案）要求企业证明"已知风险已被识别和缓解"时，一个有 `failure_type`/`fix_lever`/`legal_outcome` 字段的结构化库，就是审计证据；一个 Slack 频道则什么都证明不了。库的 schema 设计，本质是合规可审计性的前置投资。
- **GTM 与信任：对外披露的 bad-case 库是信任信号。** 这一点对照 Rick 的 PAX-Premium实名徽章 逻辑——透明化信息本身是信任信号。一个敢于结构化披露自己 bad case 与修复杠杆的 AI 产品团队，在 B 端选型会上的可信度，高于只展示 feature list 的对手。失败的可见性是一种竞争优势，前提是库被治理得可信（见 §7）。

## §5 对手框架回应：库会不会沦为"复盘剧场"

**接受业界反方立场 + 标注边界。**

业界对"建结构化失败库"最有力的反方来自两个方向。

第一个是 **Nancy Leveson 对 Swiss Cheese Model（待建概念卡）的批评**（STAMP/STPA（待建概念卡）的立场，TU Delft Research Portal）——她认为把失败拆成独立的"层"和"洞"，本质是 1931 年 Heinrich 多米诺骨牌模型的过时变体，忽略了系统的涌现性（emergent properties）。**接受**：她对了——一个把 case 拆成孤立字段的库，确实会丢掉"多个正常组件交互产生系统级崩盘"这类失败（如 2010 Flash Crash，**Normal Accidents**（待建概念卡） 的典型）。**边界**：本库的 `counterfactual` 和"可多选 failure_type"字段正是为对冲这一点而设——它强制记录"多层洞为何同时对齐"，而非只记单层。但本库**承认**它对纯涌现型失败（无单一主导层的系统级崩盘）的编码能力弱，这类 case 应标 `failure_type: [复合-涌现]` 并附系统交互图，而非硬塞进五类。这是本库的 failure scenario：**当失败是多个各自正常的组件交互涌现出来的，按修复层归类会失真。**

第二个是 **韧性工程 Safety-II 的反方**（Hollnagel, *Safety-I and Safety-II*, 2014）——它主张安全不在于研究"事情怎么出错"（Safety-I，即 bad-case 库的全部内容），而在于研究"事情大多数时候怎么顺利运行"（Safety-II）。**接受**：只建 bad-case 库、不建 good-case 基线，确实会让团队过度防御、对"为什么平时没出事"一无所知。**边界**：本库定位明确是 Safety-I 资产，不假装覆盖 Safety-II；但 PM 应在库之外配一份"正常运行画像"（输出质量分布、人工介入率基线），否则库会驱动团队把所有精力投在堵漏上。这是本专题坦承的研究空白——韧性工程对 AI 的操作化工具至今基本是空白（[A01 失败考古学方法论](/kb/专题-安全对齐与失败/a01-失败考古学方法论/) 已标注）。

## §6 跨域呼应：编码即权力，谁定义字段谁定义"什么算失败"

调度一个 Rick 熟悉的社会学框架：**分类的政治性**（链入 0117社会学）。

质性研究的编码方法论有一条铁律——**编码框架不是中立的描述工具，而是塑造发现的装置**。你选 `failure_type` 的五个枚举值，就已经决定了哪些事故"可被看见"、哪些"无处归类而消失"。这正是 AIID 与 AIAAIC 两个库 schema 不兼容、对"什么算 incident"边界定义不同的深层原因（[arXiv:2501.17037v1](https://arxiv.org/html/2501.17037v1)）：同一事件，一个库收录、另一个忽略，不是因为谁错了，而是因为字段定义本身携带了价值判断。

落到 bad-case 库的具体设计：**当你不设 `organizational` 这个 failure_type，组织失败就会从库里系统性消失**——不是因为它不存在，而是因为没有字段承接它，它只能被编码成"模型不够好"。这与 [A02 AI 产品失败分类学·五类](/kb/专题-安全对齐与失败/a02-ai-产品失败分类学-五类/) 警告的"按技术栈分类会让组织失败无处安放"是同一个机制的两种表述。所以本库把 `organizational` 设为一等公民字段，是一个**显式的权力选择**：拒绝让流程/激励/治理的失败被技术归因吸收掉。谁掌握 schema，谁就掌握了"复盘能看见什么"——这是 PM 在建库时必须自觉承担的认识论责任。

## §7 PM 决策启示：面试 / 选型 / 复现三类落地

- **面试怎么用**：被问"你怎么做 AI 产品复盘"时，不要讲故事。讲"我们不做 case-by-case，我们建结构化 bad-case 库——12 个受控字段，分类主轴是修复层不是严重度，入库设来源门禁"。再补一句反共识判断："90% 的团队把库建成时间线，结果三个月后查不动，因为字段是自由文本、不可聚合。" 这一句立刻把你和"会写复盘文档的 PM"区分开。
- **选型怎么用**：评估一个 AI 供应商时，问一个问题——"给我看你们的 bad-case 库，按修复层聚合的分布"。能给出的，说明它有组织记忆和治理；只能给 feature list 的，它的失败都还在老员工脑子里。这比任何 demo 都更能预测它上线后的稳定性。
- **复现怎么用**：从 §2 的五条 case 起步，本周就能建库。最小可运行版本：一个 Obsidian dataview 表 / 一张 Notion database，把 §1 的 12 字段建成列，先录本专题已核实的五条，跑一次 `group by layer` 聚合。中型生产版本：加入库治理 SOP（§8）。这是从"读案例"到"建可分析资产"的最小跨越。

## §8 与已有节点的关系

- 对照 [A02 AI 产品失败分类学·五类](/kb/专题-安全对齐与失败/a02-ai-产品失败分类学-五类/)：本节点**做深化与操作化**——A02 给出五类分类学的理论矩阵和判别逻辑，R01 把那张矩阵落成可填、可查、可聚合的 schema。不复述五类的判别标准（那是 A02 的资产），只继承它作为 `failure_type` 字段的取值域。
- 对照 [A01 失败考古学方法论](/kb/专题-安全对齐与失败/a01-失败考古学方法论/)：本节点**做落地与补缺**——A01 确立"建失败分类学、从失败反推设计原则、事实接地"的方法论纲领，R01 把"事实接地"具体化为 `source`/`confidence` 入库门禁。
- 对照 [m207 - Agent 产品化：场景推演与失败模式](/kb/工程化与落地架构/m207-agent-产品化-场景推演与失败模式/)：本节点**做对话**——m207 的六类失败模式（规划/工具调用/推理/无限循环/雪崩/安全越界）是 Agent 场景下的 trigger 枚举来源，可直接并入本库 `trigger` 字段；m207 的评估七维度则是库的 good-case 基线对照。
- 对照 [p304 - 防御性 UX：对抗延迟与幻觉](/kb/产品设计与交互范式/p304-防御性-ux-对抗延迟与幻觉/) 与 [p305 - 信任架构与可解释性设计](/kb/产品设计与交互范式/p305-信任架构与可解释性设计/)：本节点**做反向供给**——`fix_lever` 字段记录的 output/boundary 类修复杠杆，多数指向 p304 的四级防御与 p305 的信任架构，库是这两个节点的"真实案例弹药库"。
- 升级对照 [A07 Multi-Agent Teams](/kb/专题-安全对齐与失败/a07-multi-agent-teams/)（0411 Agent 专题的多 Agent 节点）：多 Agent 系统的失败（记忆投毒、多 Agent 通信流失败）需在本库 `trigger` 字段新增枚举，是本 schema 的已知扩展方向。

## §9 关联节点

**核心（必读）**
- [A02 AI 产品失败分类学·五类](/kb/专题-安全对齐与失败/a02-ai-产品失败分类学-五类/) — 本库 `failure_type` 字段的取值域与判别逻辑
- [A01 失败考古学方法论](/kb/专题-安全对齐与失败/a01-失败考古学方法论/) — 事实接地纪律与可观测性前提
- [c13 - 幻觉的不可消除性](/kb/基础知识库/c13-幻觉的不可消除性/) — output 类失败为何修不掉
- [p304 - 防御性 UX：对抗延迟与幻觉](/kb/产品设计与交互范式/p304-防御性-ux-对抗延迟与幻觉/) — `fix_lever` 的输出层落点
- [m207 - Agent 产品化：场景推演与失败模式](/kb/工程化与落地架构/m207-agent-产品化-场景推演与失败模式/) — Agent 场景的 trigger 枚举来源
- 安全感知与干预 — `layer` 字段的多层级干预结构原型
- 降发生方法论 — 从失败反推设计约束的方法论同构

**延伸（可选）**
- [A03 输入侧失败·对抗用户与注入](/kb/专题-安全对齐与失败/a03-输入侧失败-对抗用户与注入/) — input 类 case 的深解
- [A04 输出侧失败·幻觉与法律约束](/kb/专题-安全对齐与失败/a04-输出侧失败-幻觉与法律约束/) — output 类 case 的深解
- [A05 边界侧失败·权限承诺与情感](/kb/专题-安全对齐与失败/a05-边界侧失败-权限承诺与情感/) — boundary 类 case 的深解
- [A06 采纳与组织侧失败](/kb/专题-安全对齐与失败/a06-采纳与组织侧失败/) — adoption/organizational 类 case 的深解
- [p305 - 信任架构与可解释性设计](/kb/产品设计与交互范式/p305-信任架构与可解释性设计/) — 库作为信任信号的对外披露逻辑
- PAX-Premium实名徽章 — 透明化作为信任信号的安全侧实例
- **STAMP/STPA**（待建概念卡） — `counterfactual` 字段的反事实归因来源
- **Swiss Cheese Model**（待建概念卡） — 多层洞对齐的编码依据
- **Normal Accidents**（待建概念卡） — 涌现型失败的编码边界
- 0117社会学 — 分类的政治性（编码即权力）
- [AI PM 知识图谱·总索引](/kb/ai-pm-知识图谱/ai-pm-知识图谱-总索引/)

## 修订日志

- R1（2026-06-07）：初稿。建立 12 字段编码 schema；五条已核实 case 跑通示例；四个建库错位（severity 当主轴 / trigger 混 type / 跳过 counterfactual / 无来源门禁）；对手回应接入 Leveson 对 Swiss Cheese 的批评与 Safety-II 反方；跨域呼应调度"分类的政治性"；§8 升级对照 A01/A02/m207/p304/p305。全部硬事实接地或标 `confidence`，未核实项标 disputed。
- 2026-06-12 内审修复：EU AI Act 口径补全为权威值"2024-08-01 正式生效、分阶段实施至 2026-08-02"（原文仅"分阶段实施中"无生效日锚点）。

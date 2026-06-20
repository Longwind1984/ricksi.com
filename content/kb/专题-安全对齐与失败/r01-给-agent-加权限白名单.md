---
title: R01 给 Agent 加权限白名单
cluster: 专题 · 安全对齐与失败
created: '2026-06-07'
updated: '2026-06-20'
provenance: ai
facet: Agent 安全与权限
---


给一个 agent 加工具白名单、scope 限制、副作用分级，是把"它能动什么"从代码里的隐性约定变成显式、可审计、可收缩的权限契约——本节解决的问题是：**当一个 LLM agent 能自主选工具、传参、花钱、spawn 子 agent 时，传统给人设计的"登录即拥有全部权限"模型整体失效，PM 与架构师必须重新回答"默认拒绝 vs 默认允许"这道题，并给出一份能跑的骨架。** 视角是「权限即攻击面」的安全工程视角叠加 PM 选型视角。

## §0 为什么是"白名单 + scope + 副作用分级"三件套，而不是"沙箱就够了"

很多人第一反应是"把 agent 关进 Docker 沙箱不就行了"。错位在于：沙箱（0435 总览 S01 staging 讨论的纵深防御一层）隔离的是 **宿主资源**（文件系统、内核、网络），它管不住 agent 通过一个"合法"的 `send_email` 工具把公司机密 BCC 给攻击者——这正是 2025-09 被篡改的 Postmark MCP 服务器真实发生的事（每周下载 1,500 次，在 `send_email` 里静默加 BCC 字段，多源报道）。沙箱是"爆炸半径"控制，白名单是"火源"控制，两者正交、缺一不可。

本节的三件套各管一层：
- **工具白名单**：决定 agent 能看到、能调用哪些工具（默认拒绝，显式准入）。
- **Scope 限制**：决定每个工具调用的参数被允许落在什么范围（如 `db.query` 只能 SELECT，不能 DROP）。
- **副作用分级（L0–L4）**：决定一个被允许的调用要不要人工确认门——这是 OWASP 把"过度自主（Excessive Autonomy）"单列为 LLM06:2025 三大根因之一的直接回应，也是 OWASP Agentic Top 10（2025-12-09 发布）区分"最小权限（least privilege）≠ 最小自主（least agency）"的工程落地。

> [!note] 框架级辨析
> 「能否访问」（privilege）和「能否无确认地自主行动」（agency）是两个轴。一个 agent 可以**有权**读数据库，但**不该**无确认地一次删 10 万行。沙箱、RBAC、scope 都在 privilege 轴上，副作用分级 + 确认门在 agency 轴上。只做前者是 2024 年的水平。

## §1 默认拒绝：白名单 vs 黑名单的不可调和

| 维度 | 黑名单（默认允许，列禁止项） | 白名单（默认拒绝，列准入项） |
|---|---|---|
| 新增工具时的安全态 | 默认暴露，要记得去禁 | 默认隔离，要显式去开 |
| 失败模式 | 漏列一个危险工具 = 直接暴露 | 漏列一个安全工具 = 任务做不成（可观测、可补） |
| 注入攻击下的表现 | prompt injection 可调用任何没被禁的工具 | injection 至多调用白名单内工具，爆炸半径有上限 |
| 审计可读性 | "我们禁了什么"——列表无穷 | "我们允许什么"——列表有限可枚举 |

PM 决策点：**白名单的失败是"安全地失败"（task fails），黑名单的失败是"危险地失败"（breach）。** 这就是为什么 MCP 官方 Security Best Practices 明确要求"从最小权限集出发（如 `mcp:tools-basic`），仅含低风险发现/读取操作"，并**禁止通配符 scope**（`*`/`all`/`full-access`）（modelcontextprotocol.io，草案版本）。任何把工具数组直接 `tools=all_tools` 传给模型的写法，都是黑名单思维的伪装。

## §2 可跑骨架：一个带白名单 + scope + 副作用门的工具网关

下面是一个框架无关的最小骨架（伪 Python，可移植到 LangChain / OpenAI Agents SDK 的 tool wrapper）。核心思想：**所有工具调用必须经过一个网关函数，网关在调用前做三次检查**。

```python
# = 1. 副作用分级表（按任务可收缩，见 §6） =
class SideEffect:
    L0_READ      = 0  # 纯读，无外部副作用（搜索、查文档）
    L1_LOCAL     = 1  # 本地可逆写（草稿、临时文件）
    L2_EXTERNAL  = 2  # 外部可逆写（发草稿邮件到自己、建草稿 PR）
    L3_IRREVERS  = 3  # 不可逆 / 高后果（发外部邮件、删数据、付款 < 阈值）
    L4_CRITICAL  = 4  # 持久化高危（批量删除、付款 > 阈值、改权限、spawn 子 agent）

# = 2. 工具白名单：每个工具显式声明 scope 校验器 + 副作用级别 =
TOOL_REGISTRY = {
    "search_docs": {
        "fn": search_docs,
        "side_effect": SideEffect.L0_READ,
        "scope_check": lambda args: True,                       # 读，无参数约束
    },
    "db_query": {
        "fn": db_query,
        "side_effect": SideEffect.L0_READ,
        # scope：只允许 SELECT，禁 DROP/DELETE/UPDATE（OWASP LLM06 缓解：最低访问级别身份）
        "scope_check": lambda args: args["sql"].strip().lower().startswith("select"),
    },
    "send_email": {
        "fn": send_email,
        "side_effect": SideEffect.L3_IRREVERS,
        # scope：收件人必须在允许域内，禁止 BCC（直接对应 Postmark 投毒攻击）
        "scope_check": lambda args: (
            args["to"].endswith("@mycorp.com") and not args.get("bcc")
        ),
    },
    "make_payment": {
        "fn": make_payment,
        "side_effect": SideEffect.L4_CRITICAL,
        "scope_check": lambda args: args["amount"] <= 100,      # 硬上限，超出直接拒绝
    },
}

# = 3. 网关：调用前三检查 =
CONFIRM_THRESHOLD = SideEffect.L3_IRREVERS   # ≥L3 触发人工确认门

def tool_gateway(tool_name, args, *, task_allowed_tools, confirm_fn, audit_log):
    # 检查 1：白名单——工具是否在"本任务"允许集内（注意：不是全局集，见 §6）
    if tool_name not in task_allowed_tools:
        audit_log.deny(tool_name, args, reason="not_in_task_whitelist")
        raise PermissionError(f"tool '{tool_name}' not whitelisted for this task")

    spec = TOOL_REGISTRY[tool_name]

    # 检查 2：scope——参数是否落在允许范围
    if not spec["scope_check"](args):
        audit_log.deny(tool_name, args, reason="scope_violation")
        raise PermissionError(f"args out of scope for '{tool_name}': {args}")

    # 检查 3：副作用门——高副作用需人工确认（agency 轴）
    if spec["side_effect"] >= CONFIRM_THRESHOLD:
        if not confirm_fn(tool_name, args, spec["side_effect"]):
            audit_log.deny(tool_name, args, reason="user_rejected_confirmation")
            raise PermissionError(f"user rejected '{tool_name}'")

    # 通过：执行 + 记审计（who/what/why/result，见 0436 审计节点）
    result = spec["fn"](**args)
    audit_log.allow(tool_name, args, side_effect=spec["side_effect"], result=result)
    return result
```

关键设计承重点：
1. **`task_allowed_tools` 是参数，不是全局常量**——这是"白名单随任务收缩"的代码体现（§6 展开）。
2. **scope_check 是确定性函数，不是让 LLM 自己判断**——把权限决策从概率性模型里拿出来，这正是 §7 对手框架要逼问的争议点。
3. **审计在网关里强制发生**，agent 无法绕过——`allow`/`deny` 都落日志，对应 EU AI Act Article 12「自动记录」要求（2026-08-02 高风险全面适用）。

这套骨架与学术界方向一致：Progent（arXiv:2504.11703，v1 2025-04-16，UC Berkeley 等）正是"把权限表示为工具名 + 参数的符号规则、每次调用确定性检查、SMT solver 把'收窄'自动批准、'扩展'需人工审批"，在 AgentDojo / ASB 基准上把攻击成功率降到 0% 且不损功能（WebFetch 核实摘要）。本骨架是它的 PM 可读简化版。

## §3 副作用分级表：把"风险等级"形式化

| 级别 | 定义 | 例子 | 默认处置 |
|---|---|---|---|
| L0 读 | 无外部副作用 | 搜索、SELECT 查询、读文件 | 直接放行 |
| L1 本地可逆 | 本地可撤销写 | 写草稿、缓存、临时文件 | 直接放行 |
| L2 外部可逆 | 外部但可撤销 | 草稿邮件、草稿 PR、加日历待确认 | 放行 + 高频审计 |
| L3 不可逆 | 一旦做难撤销 | 发外部邮件、删行、小额付款 | **确认门** |
| L4 高危持久 | 高后果且持久 | 批量删除、大额付款、改权限、spawn 子 agent | **确认门 + 双人/降级** |

为什么 L4 把 "spawn 子 agent" 列为最高危？因为子 agent 会**继承权限**，而委托链上的 scope 在标准层面无法强制传递——RFC 8693（Token Exchange）自己声明嵌套 `act` claim "仅供参考，不得用于访问控制决策"，即多跳授权链在标准层面无法强制。所以本骨架的纪律是：父 agent spawn 子 agent 时，**子的 `task_allowed_tools` 必须是父的真子集（scope 递减 / attenuation）**，禁止平级或升级传递。这与 [A06 Orchestrator 编排器](/kb/专题-安全对齐与失败/a06-orchestrator-编排器/) 的权限层设计直接对接——编排器是权限收窄的执行点，不是放大点。

## §4 判断主轴：90% 的人在这里会错的四个点

**错点一：把工具列表当配置，而非攻击面。**
- 症状：`tools = [t1, t2, ... t40]` 一把梭传给模型，工具越加越多。
- 为什么会错：把"工具丰富 = 能力强"当卖点，忽略了 [S03 Harness Engineering 全景](/kb/专题-安全对齐与失败/s03-harness-engineering-全景/) 已立的 Rick 立场——工具数量上限 ≤20，超过需分组动态加载。每多一个工具，prompt injection 的可达动作集就大一格。
- 正确做法：工具白名单按任务动态下发；网关 + scope_check 兜底。
- 真实反例：约 2,000 个野外 MCP server 被实测**全部缺乏认证**（arXiv:2603.24775 AIP，2026-03-25，WebFetch 核实）——工具被当配置而非攻击面的行业规模缩影。

**错点二：让 LLM 自己判断"这个调用安不安全"。**
- 症状：在 system prompt 里写"只在安全时才调用 make_payment"。
- 为什么会错：把安全关键决策交给概率性模型；prompt injection 可直接覆盖这条指令。
- 正确做法：scope_check 是宿主侧确定性函数，模型说了不算。
- 真实反例：语义任务-范围匹配研究（arXiv:2510.26702，2025-10-30）实测，当任务需要多个 scope 时，LLM 匹配准确率显著下降——依赖模型推导权限本身引入不确定性。

**错点三：只做 privilege（能不能访问），不做 agency（要不要确认）。**
- 症状：agent 有删库权限，于是它真的一次删了 10 万行，"因为它有权"。
- 为什么会错：混淆了"授权"和"自主度"两个轴（§0）。
- 正确做法：L3/L4 强制确认门；不可逆操作执行前展示影响清单。
- 真实反例：OpenAI Model Spec（2025-12-18 版）明确要求不可逆操作（如批量退订）执行前向用户展示列表并取得确认，自主执行须含 shutdown timer。

**错点四：把确认门当万能药，制造确认疲劳。**
- 症状：每一步都弹确认框，用户麻木地全点"同意"。
- 为什么会错：人工监督在高频下会失效。Anthropic 共享责任模型（2026-04-29，Backslash Security 引述）实测：开发者在 **93%** 的权限提示弹窗中未经有效审查即点批准。
- 正确做法：只有 L3/L4 触发确认（CONFIRM_THRESHOLD 调高），L0–L1 静默放行；转向"计划级治理"而非"逐操作同意"。
- 真实反例：OpenAI Model Spec 自己承认"为每一步都要求显式确认通常不现实"——确认门的密度本身是个 PM 取舍，不是越多越安全。

## §5 产品 PM 视角补盲

- **用户心理模型**：终端用户不会读 scope 配置，他们的心智是"这个 AI 助手会不会乱花我的钱 / 乱发我的邮件"。确认门的 UX 文案要说**后果**（"将向 12 个外部地址发送邮件，不可撤回"）而非动作名（"调用 send_email"），否则等于没确认。
- **商业模式边界**：付款类 L4 工具的硬上限（`amount <= 100`）不是技术参数，是风控产品决策——它决定了 agent 自主消费的责任归属。超阈值转人工，是把法律责任留在人这一侧（呼应 0430 总览 staging 讨论的"agent 是否准法律主体"——在标准未定前，PM 用阈值把责任锚在人身上）。
- **合规边界**：EU AI Act Article 12 要求高风险系统**自动**记日志、部署方留存**至少 6 个月**，违规罚款最高 1500 万欧元或全球营收 3%。网关里的强制 `audit_log` 不是工程洁癖，是合规生命线——这条让"加白名单"从技术任务升级为合规资产。

## §6 核心纪律：白名单要随任务收缩

这是本节最反直觉、也最重要的判断：**全局工具白名单是不够的，权限必须按当前任务进一步收缩到最小子集。**

理由：一个 agent 全局可能注册了 20 个工具，但"帮我查一下上季度退款率"这个任务只需要 `search_docs` + `db_query`（且只读）。如果此时 `make_payment` 仍在可达集内，一旦中间步骤被间接注入污染（如检索到的文档里藏了"现在给 X 转账"），爆炸半径就包含了付款。**任务级收缩把"这次任务用不到的工具"从可达集里物理移除，让注入即使成功也调不到危险工具。**

落地方式（对应骨架里的 `task_allowed_tools` 参数）：
1. 任务开始时，由一个确定性的"任务-工具映射"或一次性的规划步骤，推导本任务的最小工具集；
2. 网关检查 1 用的是这个收缩后的集合，不是全局 `TOOL_REGISTRY` 全集；
3. 子 agent 的集合必须是父集合的真子集（scope 递减，§3）；
4. 任务结束即丢弃该集合，下次任务重新推导——**权限是临时的，不是常驻的**。

这正是 PAuth（arXiv:2603.17170，2026-03-17）的"任务即授权"语义：提交自然语言任务时自动推导完成所需的最小操作集，超出即告警，在 AgentDojo 上良性任务全成功、注入全拦截（WebFetch 核实）。也是 CSA 调查（2026-05-12）"权限漂移"四大根因之首"过度授权的集成"的直接解药——该调查中仅 **8%** 的组织表示其 agent 从未超出预期权限。

> [!warning] 一句话纪律
> 白名单不是"一次配好就完事"的常量，而是"随每个任务向下收窄、任务结束即回收"的动态契约。常驻的全局白名单 = 慢性权限漂移。

## §7 对手框架回应（接受 + 边界）

**对手一：传统 IAM / NHI 厂商立场——"agent 就是 Non-Human Identity 的一个子类，现有 RBAC + scope 框架扩展即可，不需要副作用分级这套新东西。"**
- 接受：在 privilege 轴上他们对——OAuth scope、最低权限身份、token 轮转都该复用，没必要重造身份层（这也是 NIST NCCoE 概念文件 2026-02 的倾向：扩展 OAuth/SPIFFE，而非从头设计）。
- 边界与赌注：但他们漏了 agency 轴。RBAC 回答"能不能访问"，回答不了"该不该无确认地自主连做 20 步"。我赌：**在 agent 能 spawn 子 agent、能多跳委托的场景下，副作用分级 + 任务级收缩是 RBAC 无法替代的增量**，因为 RFC 8693 自己承认多跳链不可强制。Strata 等厂商（"Agents Not NHI"）已在论证 agent 需独立类别——这不是过度设计。

**对手二（Rick 未读，破 echo chamber）——能力安全 / 对象能力模型（Object Capability Model，Mark Miller）："你们这套白名单 + 网关检查是'访问控制清单（ACL）'思路，本质有 confused deputy 漏洞；正解是'引用即权限'（capability = unforgeable reference），WASM + WASI 已在运行时实现，根本不需要中心化网关查表。"**
- 接受：能力模型在理论上更优——它从根上消除了"高权限 trusted agent 被低权限 agent 诱骗"的 confused deputy 攻击（这种攻击在多 agent 系统已有系统性实证，arXiv:2601.11893）。WASM 组件默认无文件/无网络/无 syscall，capability 由宿主显式授予，确实比 ACL 干净。
- 边界与赌注：但 2026 年的现实是，主流框架（LangChain / OpenAI Agents SDK / MCP）的工具调用仍是 ACL/scope 范式，capability-based 的 agent 生产案例独立审计稀少（Cosmonic 的微秒级冷启动声明来自一方商业博文，缺第三方核实）。我赌：**PM 现在能落地的是本节的网关 + 分级骨架；capability 模型是 2–3 年内值得跟踪的方向，但不是今天的选型答案。** 承认这是个赌注：如果 WASM 组件生态在 agent 侧成熟得比预期快，本骨架的"中心化网关查表"会显得笨重。

> [!note] failure scenario
> 本节骨架在一个场景下会失效：**scope_check 写在自然语言指令里而非代码里时**（如把校验逻辑放进 system prompt）。一旦如此，prompt injection 可绕过全部三道检查。骨架的安全性完全依赖"校验是宿主侧确定性代码"这一前提——这个前提一旦破，全章作废。

## §8 跨域呼应：福柯的"规训"与白名单的权力几何学

把工具白名单放进福柯（Foucault）生命政治 / 规训权力的透镜下，会看清一件技术讨论里看不见的事：**白名单不是中性的"安全配置"，而是一套权力的空间分配**。福柯说规训权力的核心是"可见性"——全景敞视（panopticon）通过让对象时刻可被观察来生产服从。本节的强制 `audit_log` 网关，正是给 agent 装上了一个全景敞视：每个动作 allow/deny 都被记录、可追溯、不可绕过。

但福柯的真正洞察在反面：**当监督变成 93% 无效点击（§4 错点四），全景敞视就退化成了"监督的剧场"——看起来在规训，实际无人在看。** 这把一个纯技术指标（确认门密度）翻译成了一个权力问题：你是要真的规训（少而重的 L3/L4 确认门，每次都被认真看），还是要规训的表演（每步都弹框，制造"我们很安全"的合规假象）？

这改变了 PM 的判断：副作用分级的设计目标不是"覆盖最多动作"，而是"让每一次确认都真的被一个有判断力的人看到"。这是技术文档里推不出、但决定系统是否真安全的判断——也是 Rick 的安全风控经验（确认门设计、风险分级、确认疲劳）可直接迁移的地方：滴滴风控里"高危操作二次验证 + 低频高质"的原则，和这里 L3/L4 收敛确认门是同一个权力几何学。

## §9 PM 决策启示

- **面试怎么用**：被问"怎么让 agent 安全"时，别只说"加沙箱"。说"沙箱管爆炸半径、白名单管火源，两个正交"；再说"白名单还得分 privilege 轴和 agency 轴——副作用分级 + 任务级收缩是 2026 年的及格线"。能说出"白名单随任务收缩"和"确认门要防确认疲劳"，就跳出了 80% 候选人的水平。
- **选型怎么用**：评估编排框架时问四点（对接 [m208 - AI 基础设施与中间件选型](/kb/工程化与落地架构/m208-ai-基础设施与中间件选型/) 的安全选型维度）——(1) 是否支持**任务级**而非全局工具白名单？(2) 能否对动作做副作用分级并按级分流？(3) 高风险操作有无可配置确认门？(4) 权限授权与执行是否分离（网关是否强制、agent 能否绕过）？缺一即在高合规场景扣分。
- **复现怎么用**：从 §2 骨架起步，先把所有工具调用收进一个网关函数（这一步就拦掉大半风险），再补 scope_check，最后加副作用门。不要一上来追求 capability 模型或 SMT solver——先把"默认拒绝 + 强制审计"跑起来。

## §10 与已有节点的关系

- 对照 [S03 Harness Engineering 全景](/kb/专题-安全对齐与失败/s03-harness-engineering-全景/)（0411，主库）：S03 §3.2 立了"工具数量 ≤20"立场、§3.5 立了"按工具类型×风险等级×用户配置三层 HITL"立场。本节点做的是**深化与形式化**——把"风险等级"填实为 L0–L4 分级表，把"工具上限"的安全理由（爆炸半径）讲透，并补上 S03 未覆盖的"任务级收缩"概念。不复述 S03 的 harness 六能力。
- 对照 [A06 Orchestrator 编排器](/kb/专题-安全对齐与失败/a06-orchestrator-编排器/)（0411，主库）：本节 §3 的"子 agent scope 递减"是 A06 权限层在复现侧的落地纪律。
- 对照 [m208 - AI 基础设施与中间件选型](/kb/工程化与落地架构/m208-ai-基础设施与中间件选型/)（主库）：本节 §9 的四问是 m208 §2.5.2 编排框架对比缺失的安全选型维度的填实。
- 链 0435 R03（注入防御 + 权限沙箱，0435 专题 staging，降级文本不建双链）：0435 R03 是"防注入"，本节是"即使注入成功，白名单 + 任务级收缩把爆炸半径压到最小"——两者是纵深防御的两层，R03 在前门挡，本节在后门兜。
- 同级节点：本节是 05 复现指南的入门档（最小可运行），与 R02（中型生产）、R03（进阶模板）构成复现三档。

## 关联节点

**核心（必读）**
- [S03 Harness Engineering 全景](/kb/专题-安全对齐与失败/s03-harness-engineering-全景/)
- [A06 Orchestrator 编排器](/kb/专题-安全对齐与失败/a06-orchestrator-编排器/)
- [m208 - AI 基础设施与中间件选型](/kb/工程化与落地架构/m208-ai-基础设施与中间件选型/)
- [Function Calling](/kb/基础知识库/function-calling/)
- [Agent](/kb/基础知识库/agent/)

**延伸（可选）**
- [A08 MCP 与 A2A 协议族](/kb/专题-安全对齐与失败/a08-mcp-与-a2a-协议族/)
- [m207 - Agent 产品化：场景推演与失败模式](/kb/工程化与落地架构/m207-agent-产品化-场景推演与失败模式/)
- [A02 抽象层级辨析·Harness Framework Agent Skill Orchestrator](/kb/专题-安全对齐与失败/a02-抽象层级辨析-harness-framework-agent-skill-orchestrator/)
- [c10 - Agent 技术栈与工具调用](/kb/基础知识库/c10-agent-技术栈与工具调用/)
- 生命政治
- 安全感知与干预
- [AI概念滥用反思](/kb/基础知识库/ai概念滥用反思/)
- [AI PM 知识图谱·总索引](/kb/ai-pm-知识图谱/ai-pm-知识图谱-总索引/)
- 0435 R03 注入防御 + 权限沙箱（0435 专题 staging，待入库后建双链）
- 0436 本专题同级：S03 Agent 权限边界设计、审计与问责节点（本专题 staging）

## 修订日志

- R0.1（2026-06-07）：首稿。建立白名单 + scope + 副作用分级三件套骨架（可跑伪代码），L0–L4 分级表，"白名单随任务收缩"核心纪律，福柯规训权力跨域呼应，IAM/NHI 与能力安全模型两个对手框架回应。事实接地：Progent/PAuth/AIP arXiv、Postmark MCP 投毒、Anthropic 93% 无效批准、CSA 8%、EU AI Act Article 12、OWASP LLM06/Agentic Top 10、OpenAI Model Spec、RFC 8693 均经简报核实；NIST NCCoE 概念文件日期、capability 模型 WASM 商业声明已标注来源性质。

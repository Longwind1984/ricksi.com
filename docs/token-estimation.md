# Token 累计用量：估算口径 v5

> 写给三个月后没有上下文的 Rick。站点工作台「累计 tokens」数字的全部来源、公式与可调参数都在这里。
> 实现：`scripts/collect-usage.mjs`（参数集中在文件顶部 `EST` 块）+ `scripts/lib/codex-logs.mjs`（Codex）+ `scripts/lib/agent-usage.mjs`（ZCode/Hermes/Kimi Code/OpenClaw）。

## 一句话版本

**累计 = 全 harness 合计**：A 段 Claude Code 实测 + B 段 Claude Code 起用期估算 + C 段 claude.ai 网页端冻结粗估 **+ D 段 Codex / ZCode / Hermes / Kimi Code / OpenClaw 分源实测**。各段分列、估算与粗估在页面上明确标注，真实日数据一旦入库永不回退。

迁移校准快照（2026-07-21，口径 v5 首跑）：累计约 14B，其中 Codex rollout 实测约 152M；该值会随当天正在进行的 Codex 任务继续增长，以 `data/usage.json` 为准。

> v4→v5（2026-07-21）：从 Claude Code 迁移到 Codex。新增 Codex rollout 实测源；网页端确认不再使用，因此 claude.ai 粗估截至迁移日冻结，不再随日期自动增加。Claude Code 历史仍保留，不把历史归到 Codex。

> v3→v4（2026-07-17）：并入 **Kimi 订阅**。Kimi 订阅被三个 harness 同时消耗——Kimi Code CLI、OpenClaw（跑 k2p6）、Hermes（调 api.kimi.com 的 k3，此前已计入 Hermes 但模型家族被归进「其他」）。v4 新增前两个源、并让 `modelFamily` 认识 Kimi（三者一并正名）。**Kimi 订阅总消耗**看模型条的 Kimi 家族（跨 harness 加总），**各工具消耗**看分源注脚。
>
> v2→v3（2026-07-11）：v2 只统计 Claude Code 一个 harness；v3 把用量按 **harness 分源汇总**，主数改为全 harness 合计，模型分布条纳入 GLM/DeepSeek。

## A 段 · Claude Code 实测（硬数据）

- **来源**：`~/.claude/projects/**/*.jsonl` 本地会话日志，按 `message.id + requestId` 去重。
- **窗口**：日志保留期约两周起（首跑时为 2026-05-27 起）；每次 `npm run sync` 把当期真实日固化进 `data/usage.json` 的 `series`，仓库即存档——日志被清理也不丢。
- **口径**：input + output + cache_creation + cache_read **全口径**。缓存读写占大头（重度 agent 工作流的常态，典型日 cache read 占 85-95%），所以页面同时展示「模型输出」和「缓存读占比」两个注脚，防止全口径大数被误读。

## B 段 · Claude Code 起用期估算（2026-05-01 ~ 实测窗口前一天）

- **依据**：用户口述 Claude Code 重度使用始于 2026 年 5 月（更早没有使用，不回填）。
- **公式**：当日估算 = 实测窗口日中位 token ×（当日活跃度 ÷ 实测窗口日中位活跃度），封顶 1.2× 中位日。
  - 活跃度 = git 提交 ×30 + 笔记新增 ×10 + AI 会话消息 ×1（与热力图同源，`data/activity.json`）。
  - 取中位数而非均值：实测窗口里有 809M 的极端日（批量生成知识库），均值会被拉爆。
- **标记**：这些日子在 `series` 里带 `estimated: true`，趋势图上画虚线/空心。

## C 段 · claude.ai 网页端冻结粗估（无日志，纯参数模型）

网页端没有任何本地日志，只能参数化估算，**不进日序列**，单独一个聚合数字：

| 参数 | 当前取值 | 依据 |
|---|---|---|
| 起点 | 2025-07-01 | 用户口述「2025 下半年开始重度使用」 |
| 爬坡期（2025H2）日均对话 | 8 次 | 可调假设 |
| 爬坡期单对话均量 | 15K tokens | 可调假设（多轮对话含上下文重发） |
| 常态期（2026-01-01 ~ 2026-07-21）日均对话 | 15 次 | 用户口述「中档：日十几次对话」；迁移后冻结 |
| 常态期单对话均量 | 22K tokens | 可调假设 |
| 长文共创 | 每周 2 次 × 500K | 锚点：8 本 AI 共创 ePub、深度研究是间歇性日常 |

**公式**：Σ各期（天数 × 日均对话 × 单对话均量）+ 常态期（周数 × 每周长文次数 × 单次量）。
迁移日冻结结果约 118M。`EST.web.phases` 的末段明确写死 `to: '2026-07-21'`；以后重跑同步也不会继续增长。

**不确定区间**：单对话均量是最大的不确定源（5K~50K 都说得通），整段 C 的合理区间约 40M ~ 250M。它对累计值的影响 <10%，结论：**网页端是叙事意义大于数量意义的一段**——它解释「我从什么时候开始活在 Claude 里」，不显著改变总量。

## D 段 · 其他 harness 分源实测（Codex / ZCode / Hermes / Kimi Code / OpenClaw）

Claude Code 之外，各 Agent harness 都按自己的本地用量记录直读（缺源静默跳过，CI 用已提交的历史分源数据）：

| 源 | 位置 | 形态 | 时间单位 | 全口径 total | 内容 |
|---|---|---|---|---|---|
| **Codex** | `~/.codex/sessions/**/*.jsonl` | rollout JSONL `event_msg/token_count` | ISO | 相邻累计 `total_tokens` 的增量 | Codex Desktop / CLI；模型来自 `turn_context` |
| **ZCode** | `~/.zcode/cli/db/db.sqlite` | sqlite `model_usage` | 毫秒 | `computed_total_tokens`（provider 权威） | 全是 z.ai GLM-5.2（coding-plan + start-plan） |
| **Hermes** | `~/.hermes/state.db` | sqlite `sessions` | 秒 | in+out+cache_write+cache_read+reasoning | 跨网关（feishu/weixin/desktop/cron），GLM / Claude / DeepSeek / **Kimi(k3)** 混合 |
| **Kimi Code** | `~/.kimi-code/sessions/**/agents/*/wire.jsonl` | JSONL `usage.record` | 毫秒 | inputOther+output+inputCacheRead+inputCacheCreation | Kimi 订阅（`kimi-code/k3`、`kimi-code/kimi-for-coding`） |
| **OpenClaw** | `~/.kimi_openclaw/agents/main/sessions/*.jsonl` | JSONL `message.usage` | ISO | input+output+cacheRead+cacheWrite | 跑 Kimi 模型（`k2p6`） |

**Codex 计量语义（关键）**：`token_count.total_token_usage` 是**单个 rollout 文件内累计快照**，不能逐条直接相加；采集器取相邻快照增量，计数器回退时视为新累计段。`cached_input_tokens` 是 `input_tokens` 的子集，`reasoning_output_tokens` 是输出诊断子集，二者只用于缓存/推理注脚，**不再加进 `total_tokens`**。父任务与子任务即使共享 session id，也按各自 rollout 文件作为计量边界。

**另外两处去重（关键，都踩过）**：
1. **Hermes ↔ Claude Code**：Hermes 的 `custom:claude-sub` 走 `claude-proxy`（localhost:8085），本质是本地跑 `claude -p`——那些会话**已写进 Claude JSONL、计入 A 段**。故 Hermes 侧按 `billing_base_url LIKE '%localhost%'` 排除（`config.mjs → agentUsage.hermesExcludeUrlLike`）。
2. **Kimi Code 自身**：同一次调用被记两遍——`usage.record`（带 model）与 `context.append_loop_event/step.end`（带 messageId），**数值完全相同**（2026-07-17 实测两边均为 10,566,716）。**只读 `usage.record`**，两个都读直接翻倍。

**无交叉的**：ZCode 只写自己 sqlite；Hermes 调 `api.kimi.com` 的 k3 是**远程直连**、不经本机 Kimi CLI，故归 Hermes，与 Kimi Code 不重复。

**Kimi 订阅的两种看法**：订阅总消耗 = 模型条的 **Kimi 家族**（Kimi Code + OpenClaw + Hermes 的 k3 跨 harness 加总，2026-07-17 为 17.8M）；各工具消耗 = 分源注脚。注意 Kimi 占全量仅 0.16%，模型条会四舍五入成 0% 而不显示——这是预期，不是 bug（与 DeepSeek 同理）。

**CodexBar 为什么没用上**：CodexBar（菜单栏应用）能显示 Kimi 的**订阅额度百分比**，但它的 `widget-snapshot.json` 里 Kimi 的 `tokenUsage` 与 `dailyUsage` 都是空的——它的 Claude token 是自己解析 `~/.claude` JSONL 得来，没给 Kimi 写解析器。**百分比换算不出 token**，故直读 Kimi 本地日志（更准且不依赖别人 App 的版本）。若future 想要「额度还剩多少」，那是另一个功能。

**持久化**：与 A 段一样「真实日永不回退」——分源日序列存进 `usage.json → sources.{codex,zcode,hermes,...}.series`，本机日志或 DB 被清也不丢。

**口径一致性**：三源都用「全口径含缓存读写」。Hermes/ZCode 同样 cache read 占大头（典型日 90%+），与 Claude Code 一致；页面的「今日缓存读 %」「模型输出」两个注脚是三源合并后的诚实分解。

## v1 口径为什么失真（2026-06-12 废止，数字留档）

v1 累计 2.0B（留档于 `usage.json → method.v1_cumulative`），错误有三：

1. **把不该算的算了**：用「git 提交 + 笔记」活跃度把估算回填到 2023-03——那三年根本没用 Claude Code，是普通开发/写作活动被换算成了 AI 用量（约 0.6B 噪声）。
2. **该算的漏了**：claude.ai 网页端一个字没算。
3. **比例失真**：v1 的 ratio 用均值，被实测窗口的 809M 极端日污染。

v1 和 v2 的累计值碰巧接近（都是 ~2.0B），属于两个方向的错误互相抵消——这正是要写方法档案的原因：数字相同，可辩护性完全不同。

## 页面展示约定

- 「累计」展示合成值，旁注 Claude Code、Codex、其他 harness 与网页冻结粗估分列。
- 估算/粗估永远带标注；数据缺失回退样例值时渲染「样例数据」徽章。
- 口径升级时旧值不删除：`method.v1_cumulative` 永久保留，页面标当前口径 v5。

## 面试官追问的标准答案（自用备忘）

- *「累计怎么来的？」*——各 harness 分列如上；Claude 与 Codex 都来自本地日志硬数据，可现场打开 `usage.json` 对账。
- *「缓存读也算？」*——全口径反映的是调用规模和成本结构；单看产出，页面同时给了「模型输出」注脚。我清楚这两个数差两个数量级，所以两个都展示。
- *「用得多证明什么？」*——证明不了「用得好」。所以站点同时给了：审计如何抓我假完成（MuseumCollect）、估算如何标注（本档案）、模型分层占比。用量是上下文，判断要看那些。

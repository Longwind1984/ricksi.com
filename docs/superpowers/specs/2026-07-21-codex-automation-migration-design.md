# Codex 自动更新迁移设计

## 背景与目标

个人主页的数据管线每天由 macOS LaunchAgent 运行，采集 AI 协作 Token、工作活动、Obsidian 知识库、微信读书和前沿追踪，再把产物提交到 GitHub `main` 触发生产部署。Rick 已于 2026-07-21 从 Claude Code 迁移到 Codex。

本次目标是让迁移后的所有本地自动更新继续完整运行，并修正现有定时同步依赖当前开发分支的问题。成功标准：

- Codex Token 和协作活动从迁移日起自动计入，Claude Code 历史不丢失。
- Token 口径不重复计算 Codex 缓存输入，网页端粗估不再无限增长。
- 前沿条目由 Codex CLI 完成结构化梳理，不再依赖 Claude CLI 授权。
- 定时任务始终基于生产 `main` 更新，不受日常开发分支或未提交改动影响。
- 微信读书、Obsidian、GitHub 等独立来源失败时保留上次数据，但同步结果明确标记为部分成功。
- 关键解析、合并、分支和失败状态均有自动化回归测试。

## 已确认的现状与根因

1. `collect-usage.mjs` 和 `collect-activity.mjs` 只扫描 `~/.claude/projects`，因此 Codex 会话完全漏记。
2. Codex `token_count` 事件里的 `total_token_usage` 是会话累计值；简单逐条相加会重复。`cached_input_tokens` 是 `input_tokens` 的子集，也不能再次加入总量。
3. `collect-frontier.mjs` 写死调用 Claude CLI，停用 Claude 授权后无法继续加工抓到的原文。
4. LaunchAgent 直接在日常开发 checkout 执行 `npm run sync`。同步脚本提交当前分支；2026-07-21 的数据实际推到了 `feat/liquid-night-bg`，而生产只监听 `main`。
5. 可恢复子任务失败会被吞成 warning，最终运行日志仍写成成功，无法区分完整成功和沿用旧数据的部分成功。
6. claude.ai 网页端用量是无日志的参数估算。Rick 已确认迁移后不再使用，故估算截至 2026-07-21，不再逐日增加。

## 总体架构

采用“解析层、聚合层、任务编排层、生产工作树”四层结构：

1. 解析层负责把各 harness 的原始日志转换成统一日序列，不读写站点产物。
2. 聚合层把 Claude Code、Codex、ZCode、Hermes、Kimi Code 和 OpenClaw 合并进 `usage.json` 与 `activity.json`。
3. 任务编排层收集各采集步骤的完整/部分/失败状态，决定是否提交数据并记录健康结果。
4. LaunchAgent 在独立的生产 worktree 中执行，生产 worktree 固定检出 `main`，日常 checkout 可以停留在任意功能分支。

## Codex 日志解析

新增 `scripts/lib/codex-logs.mjs`，扫描 `CONFIG.codexSessions` 下的 rollout JSONL。

### Token 算法

- 只读取 `event_msg / token_count` 且 `payload.info.total_token_usage` 存在的记录。
- 每个 rollout 文件独立维护上一个累计快照；文件是计量边界，不用 `session_meta.id` 去重，因为子任务 rollout 可能继承父会话 id。
- 当前累计值减上一个累计值为本次增量。累计值回退时视为计数器重置，从零重新计算当前值。
- 总量以 `total_tokens` 的增量为权威值。
- input、output、reasoning 和 cached input 分别取对应累计字段的非负增量；缺字段的旧格式仅保留 total。
- cached input 只用于展示缓存占比，不加入 total；reasoning 只作诊断字段，不重复加入 output/total。
- 记录归属 `token_count.timestamp` 对应的本地日期，支持跨日长会话。
- 模型取此前最近的 `turn_context.payload.model`；无法识别时为 `codex-unknown`。

### 活跃度算法

- 用户消息计 `event_msg / user_message`。
- Codex 可见回复计 `event_msg / agent_message`；工具事件不计，避免把内部执行噪声当成协作消息。
- 每个有消息的 rollout 文件在对应日期计一个会话。
- 产出结构与 Claude 扫描器一致：每日消息数、会话数、Token 与模型明细。

## Token 口径 v5

`collect-usage.mjs` 保留既有 `series` 作为 Claude Code 历史序列，并新增 `sources.codex.series`。所有真实源继续采用“新扫描覆盖可见日、已入库历史永不回退”的存档规则。

主数定义：

```text
累计 = Claude Code 历史与实测
     + Codex 实测
     + ZCode / Hermes / Kimi Code / OpenClaw 实测
     + 截止 2026-07-21 的 claude.ai 网页粗估
```

具体变更：

- `CONFIG.codexSessions = ~/.codex/sessions`。
- 新增 `cumulative_codex` 和 `sources.codex`。
- `today`、`week`、7/14 日趋势、模型占比、输出量和缓存占比纳入 Codex。
- 模型家族新增 `Codex`，覆盖 `gpt-*` 与 `codex-*` 模型名。
- 网页估算第二阶段的结束日期固定为 `2026-07-21`。
- `method.version` 升为 5，记录 Codex 的计量语义与迁移日期。
- 页面口径说明显示 Claude Code 与 Codex 两列，不把两者混写成同一来源。

## 工作活动聚合

`collect-activity.mjs` 同时扫描 Claude Code 与 Codex：

- `days[k].ai = claude.messages + codex.messages`。
- `sources.ai` 增加 `claude` 与 `codex` 子项，包括文件数、覆盖天数和消息数。
- 已入库的旧日期继续保留；当前仍能扫描到的日期由最新结果覆盖。
- Obsidian、git 与 GitHub 维度不改变。

## 前沿追踪迁移

将 LLM 调用封装成单一 Codex runner：

- 二进制使用配置中的绝对路径 `/Applications/ChatGPT.app/Contents/Resources/codex`，LaunchAgent 不依赖交互式 shell PATH。
- 执行 `codex exec --ephemeral --sandbox read-only --skip-git-repo-check`。
- JSON Schema 写入本次调用的临时目录，并通过 `--output-schema` 约束最终答案；最终答案通过 `--output-last-message` 读取。
- prompt 通过 stdin 传入，不进入命令行参数。
- 使用轻量模型 `gpt-5.6-terra`，超时与重试沿用现有配置。
- `--ephemeral` 确保前沿批处理不写入 Codex sessions，因此不会污染主页 Token 和活动统计。
- 解析、限流识别、失败重试与原有 Claude runner 对齐；输出数据 schema 不变。

云端 Claude Code Routine 文档将标记为退役。完整数据仍由本机 LaunchAgent 更新；本次不新增需要 OpenAI API Key 的云端任务。

## 生产 worktree 与定时任务

采用独立 worktree，而不是在任意分支拼装提交：

- 目录：`/Users/rick/Claude_Code/Rick's Personal/rick-homepage-sync`。
- 分支：本地 `main`，跟踪 `origin/main`。
- LaunchAgent 的 `WorkingDirectory` 指向该目录。
- worktree 复用或安装自己的依赖；首次安装完成后定时任务不需要每日安装。
- `sync.mjs` 启动时验证当前分支必须为 `main`，否则致命退出，作为第二道保护。
- 使用原子 lock 文件防止手动同步与定时同步重叠；正常退出和异常退出都释放锁，陈旧锁按进程存活状态清理。
- 同步开始先对生产 worktree 执行只允许 fast-forward 的更新；若远端不可快进或本地代码有冲突则停止，不改写历史。
- 数据提交只包含既有允许路径 `data`、`content/kb`、`public/assets/books`。

安装阶段会更新仓库内 plist 模板，并把同一份配置安装到 `~/Library/LaunchAgents` 后重新加载。日常开发 checkout 保持原状，不移动或清理用户未提交文件。

## 部分成功与可观测性

同步步骤分为：

- 致命：活动、Token、知识库、生产分支/拉取/提交/推送。失败则整次退出非零。
- 可恢复：GitHub 本地补抓、微信读书、本地 ePub 合入、前沿追踪。失败时沿用已提交数据，并记录步骤名与原因。

若存在可恢复失败：

- 仍提交其他已成功更新的数据。
- 一行日志写 `⚠ partial` 而不是 `✓ pushed`。
- Obsidian 同步日志列出失败步骤。
- macOS 发出不带声音的部分成功通知；致命失败继续使用现有错误通知。

配置中没有 source 的前沿人物/话题仍属于内容覆盖债务，不作为运行失败；其数量保留在诊断警告中。本次不批量猜测来源 URL。

## 测试与验证

使用 Node 内置 `node:test`，不增加测试依赖。

回归测试覆盖：

- Codex 累计事件按增量计数，重复快照不重复。
- cached input 是 input 子集，不加入总量。
- 跨日事件与累计重置正确分桶。
- 子任务共享 session id 时仍按 rollout 文件分别计数。
- Codex 消息活动计数排除工具事件。
- 多 harness 日序列合并与历史保留。
- 网页估算在 2026-07-21 后保持常数。
- 非 `main` 分支同步守卫拒绝执行。
- 可恢复步骤失败产生 partial，致命步骤失败返回非零。
- Codex runner 使用 ephemeral/read-only/schema 参数并能解析结构化结果。

最终验证顺序：

1. 运行新增单元测试。
2. 运行 `npm run collect:activity` 与 `npm run collect:usage`，核对 Codex 分源与当天数值。
3. 运行前沿 runner 的最小结构化 smoke test，再运行 frontier dry-run。
4. 在生产 worktree 运行 `npm run sync -- --no-push`。
5. 运行 `npm run verify:privacy`。
6. 运行 `npm run build`。
7. 重新加载 LaunchAgent，读取 `launchctl print` 验证目录、触发时间和上次退出状态。

## 不在本次范围

- 为当前没有 source 的数十个人物/机构逐一研究和补 URL。
- 新建付费 API 或 GitHub Actions 版 Codex 前沿任务。
- 改变知识库发布规则、书架白名单或前沿评级规则。
- 改动当前正在开发的 Liquid Glass、分享卡或其他页面视觉文件。

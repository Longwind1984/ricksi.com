# 前沿追踪 · 云端 Routine 兜底配置

> 工作台数据采集 + 前沿抓取的自动化分工。本地 LaunchAgent 是主力；Claude Code Routine 是可选的云端兜底。
> 由你手动在 claude.ai 配置（需 GitHub 授权，无法程序化代办）。

## 为什么 Routine 只能「兜底」而非「主力」

Claude Code Routines 跑在 Anthropic 云端隔离 VM 上，两条硬约束决定它无法承载完整管线：

1. **访问不到本机文件** → 工作台数据（token / 活动热力图 / 知识图谱）强依赖本地 Obsidian 库、本地 git 历史、`~/.claude/projects` 日志，云端**采不了**，只能本地 LaunchAgent。
2. **云端默认访问不了被墙站点、且不支持配代理** → X 镜像（nitter）抓不到。名单里只有 X 源的人（Dario / Ilya / Demis / LeCun / Chollet / Sam / Anthropic 官号）云端**拿不到**。

## 分工

| 跑什么 | 在哪 | 何时 | 覆盖 |
|---|---|---|---|
| **完整 sync**（工作台数据 + 前沿全源含 X + claude 梳理 + push） | 本地 LaunchAgent | 每天 21:30 | 全部。Mac 开机时这是唯一需要的 |
| **前沿公网子集**（RSS/arXiv/YouTube + claude 梳理 + push frontier.json） | 云端 Routine（可选） | 每天 09:00 | 仅前沿的公网可达部分，Mac 关机当天也能更新 |

两边都写 `data/frontier.json`，靠 `data/frontier-seen.json` 去重账本保证不重复条目；时间错开避免并发 push 冲突。本地跑全源（含 X），是云端漏掉 X 源的补齐——**所以本地 LaunchAgent 必须保留**。

## 云端 Routine 实际执行

`node scripts/collect-frontier.mjs --remote`（已封装为 `npm run collect:frontier:remote`）：
- 直连不走代理（云端无本机代理）
- 跳过所有 X 源（被墙，预期行为，不是错误）
- claude 走 PATH（云端 claude 路径与 Mac 不同）
- 抓 RSS/arXiv/YouTube → claude 梳理中文评级 → 写 `data/frontier.json` + `data/frontier-seen.json`

## 手动配置步骤

1. 确保 GitHub 已连 Claude Code（在 claude.ai/code 授权 GitHub App，或任意会话内跑 `/web-setup`）
2. 打开 **https://claude.ai/code/routines** → **New routine**
3. 填写：
   - **Name**：`frontier-remote-fallback`
   - **Repository**：`Longwind1984/ricksi.com`
   - **Schedule**：每天 09:00 —— cron `0 9 * * *`（与本地 21:30 错开；Routines 最小粒度 1 小时）
   - **Push 权限**：默认只能推 `claude/` 前缀分支。要让它直接触发 EdgeOne 重建，需在 routine 设置里解锁推送 `main`；否则保持默认、推分支后你手动合并
   - **Instructions**：粘贴下面这段
4. **Create** → 用 **Run now** 手动测一次 → 在 routine 运行日志里确认 `data/frontier.json` 有提交

## Routine Instructions（粘贴这段）

```
在 ricksi.com 仓库根目录执行前沿追踪的云端兜底同步：

1. 运行 npm ci 安装依赖。
2. 运行 npm run collect:frontier:remote
   这会抓取 RSS/arXiv/YouTube 前沿源、用 claude 梳理成中文摘要与星图评级，
   写入 data/frontier.json 与 data/frontier-seen.json。
3. 检查 git status：若 data/ 下有变化，执行
     git add data/frontier.json data/frontier-seen.json
     git commit -m "chore(data): frontier remote sync"
     git push origin HEAD:claude/frontier-sync
   然后在 GitHub 把 claude/frontier-sync 合并到 main（触发 EdgeOne 重建）。
   （若你已在 routine 设置里解锁 main 直推权限，可改为 git push 到 main，省去合并这步。）
4. 若 data/ 无变化，跳过提交，正常结束。

重要：本任务在云端运行，无法访问被墙的 X 镜像（nitter），所有 X 源会被自动跳过——
这是预期行为，不是错误。X 源由本地 LaunchAgent 的每日同步补齐。
```

## 与本地 LaunchAgent 的关系（务必理解）

- **不要因为配了云端 Routine 就停掉本地 LaunchAgent**：本地是唯一能采工作台数据 + 抓 X 源的，云端只是前沿公网部分的兜底。
- 本地 LaunchAgent 配置见 `scripts/com.ricksi.workbench-sync.plist`（每天 21:30 跑 `npm run sync`）。
- 若某天 Mac 关机：当天工作台数据缺一天（次日本地补），前沿的 RSS/arXiv 部分由云端 Routine 补上、X 源仍缺（次日本地补）。

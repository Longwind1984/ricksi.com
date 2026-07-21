# 前沿追踪 · Claude Code Routine 退役记录

> 状态：已于 2026-07-21 随 Claude Code → Codex 迁移退役。不要再按旧说明创建或运行 claude.ai Routine。

## 当前生产方式

前沿追踪与其余工作台数据统一由本机 LaunchAgent 每天 21:30 执行：

```text
/Users/rick/Claude_Code/Rick's Personal/rick-homepage-sync
└── npm run sync
    └── node scripts/collect-frontier.mjs
        └── codex exec --ephemeral --sandbox read-only
```

- `rick-homepage-sync` 是固定在 `main` 的生产 worktree。
- Codex 使用本机现有登录和 App 内绝对路径，不需要 OpenAI API Key。
- `--ephemeral` 不写入 `~/.codex/sessions`，因此后台摘要不会污染主页 Token 与活动统计。
- X 镜像与本地代理仍只在这台 Mac 上可用。

## 为什么不建立“Codex 云端兜底”

完整工作台依赖本机 Obsidian、git 仓、Codex/Claude 历史日志、微信读书凭据与 X 代理。云端任务无法访问这些源，只更新一小部分前沿数据反而会重新引入多写者和分支冲突。本次迁移选择一个可审计的本地生产入口，不再保留并行 Routine。

仓库仍保留 `collect-frontier.mjs --remote` 的兼容分支逻辑，供诊断旧运行环境；它不再暴露为 npm 生产命令，也没有任何定时任务引用。

---
title: Claude routines 调研与 memory allowlist 设计
cluster: AI 产品
created: '2026-05-16'
updated: '2026-05-18'
---

# Claude routines 调研与 memory allowlist 设计

**核心命题**：Claude Daily routine 是 Web/Pro 限定的 connector 调度器（不能跨 app/不能读对话归档）。Rick 由此延伸到 memory 治理：从枚举"不要包含什么"的排除项思路，转向 allowlist 思路——只保留索引头与稳定结构，详细领域知识外移到笔记软件归档。

## Daily routine 的实际产品形态

Routines 在 claude.ai Web 与 Claude Pro 桌面上以独立"Routines"入口存在，不在 macOS/iOS 客户端原生位置。形态：用户预设 prompt + 调度（daily/weekly），可挂 connectors（Drive/Gmail/Calendar 等），在 Anthropic 服务端执行，结果以邮件/通知形式回流。能力边界：
- 不能跨 app 读自己其它对话（包括移动端聊天）
- Connectors 只接已授权服务，没有"扫 Twitter 某人" 的原生能力
- 没有"扫描今天聊过什么，给我未完话题提醒"的原生路径

## Rick 的对话归档 → Obsidian 需求

Rick 想要的不是新闻摘要，而是把每天对话当作素材，沉淀为 Obsidian 笔记 + 未完话题提醒。三种 hacky 路径：
- 路径 A（半人工管道）：浏览器手动导出对话 → Drive → routine 经 connector 读取生成 brief。可行性高、自动化破裂。
- 路径 B（依赖 memory 原生）：让 Claude 主动把"今天聊了 X"写进 memory，第二天 routine 读 memory 总结。
- 路径 C（MCP/扩展）：Claude Code 端在本地拉取 conversation export → MCP 写入 Obsidian。可行性最高但需要工程化。

## Rick 的 memory allowlist 反思

在路径 B 的讨论中，Rick 切到 memory 治理：

> [!quote] Rick 的关键介入
> 我的视角和困惑是，如果我一直去列举排除项，比如不要包含什么，那我可以列举的东西有很多很多，这样做无疑是低效的，浪费宝贵的 memory 空间。

这是一个产品观察上的语法切换——从 blocklist（列举不要塞进来的）切到 allowlist（只列举允许进来的）。在 memory 这种容量稀缺的语义层里，排除项的笛卡儿积是无界的，而允许项是可枚举的。结构上：
- 索引头（用户长期关注的领域+维度）放 memory
- 领域知识详细内容放笔记软件（Obsidian / 文档化长期记忆）
- memory 只保留"指向哪里"，不保留"具体是什么"

Rick 同时反向修订前面错误的"排除项"记忆，要求 AI 删除之前生成的排除式记忆条目。

## 一个方法论副产品

Rick 在过程中提出一条原则：

> [!quote] Rick 的关键介入
> 你在提议甚至是执行任何一个方案之前，都应该先考虑它的方法或者是可行操作有哪些，然后再基于这个基础知识，你可以把它当成是代码文档，再去进一步构思你的方案，细化你的操作，而不是想当然地直接生成不切实际、不可行的提议。要把这种一般性的原则增加到你的记忆里面。

这是对 LLM 默认行为模式（生成-再调整）的一条结构性矫正：先 dump 工具/能力矩阵，再约束在矩阵内构思方案。

## 关联节点
- [Claude](/kb/ai-公司与产品/claude/) — Routines 产品形态考察
- CLAUDE — 与 Claude Code 的工作流耦合
- 02Obsidian 元数据 — 对话归档 → Obsidian 的目标侧
- 0310个人工作流重构 — 工作流元设计的一环

## 衍生对话存档
- 来源对话

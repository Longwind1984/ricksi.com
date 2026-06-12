---
title: Harness 词义辨析
cluster: 专题 · 安全对齐与失败
created: '2026-06-11'
updated: '2026-06-12'
provenance: ai
facet: Agent
---

# Harness 词义辨析

一句话定义：在 AI 工程社区，**harness** 从评测术语滑变为 agent 运行时的通称——指包裹在模型外面、负责 prompt 组装、工具注册、循环调度、记忆管理与错误恢复的那层代码脚手架。本节点只做**词源切片**：这个词从哪来、怎么滑、和邻近词的边界在哪、为什么被滥用；系统化的分层与全景剖面交给 A02 / S03。

## 一、词源：从马具到测试脚手架

`harness` 本义是马具/挽具——套在马身上、既约束又驱动它的那套装备。这个"约束并驱动"的意象被软件工程继承下来：**test harness**（测试夹具）是 90 年代以来的成熟用法，指包在被测对象外围、喂入输入、采集输出、记录行为的代码框架。关键直觉始终没变：harness 不是被测/被驱动的主体，而是**让主体能跑起来、能被观测的外围装置**。

## 二、三次语义滑动

1. **评测脚手架**：EleutherAI 的 `lm-evaluation-harness`（"A framework for few-shot evaluation of language models"，Hugging Face Open LLM Leaderboard 的后端）把 harness 用在"跑模型评测"——同一套 harness 对接不同模型，产出可对比的分数。这一步里 harness 还紧贴 test harness 的老义。
2. **agent 运行时**：2024–2026 年间，harness 被升级为 **agent 运行时通称**——在模型外部组织 prompt、tool calls、loop、记忆、错误恢复的全部代码。Claude Code、Cursor、Codex、Manus 各自是一套 harness。推动这次滑动的不是某个命名者，而是渐次形成的共识（参 [S03 Harness Engineering 全景](/kb/专题-安全对齐与失败/s03-harness-engineering-全景/) 的命名史梳理）。
3. **能力归因的二分**："harness vs. model" 被用来强调**能力来源**——同一个模型装进不同 harness，表现可以差出一个量级。于是 harness 成了讨论"这套系统强在哪"时绕不开的轴：是模型聪明，还是 harness 调得好？

## 三、与邻近词的边界

被混用最严重的四个词，在本卡只给一句话的切分（精确分层见 [A02 抽象层级辨析·Harness Framework Agent Skill Orchestrator](/kb/专题-安全对齐与失败/a02-抽象层级辨析-harness-framework-agent-skill-orchestrator/)）：

- **harness vs framework**：framework 是给开发者用的**组件库**（Chain / Tool / Memory 抽象，如 LangChain）；harness 是**运行时基座**，提供 loop 与入口形态。一个 harness 内部可以调用多个 framework。
- **harness vs agent**：agent 是用户面对的、有目标有记忆的**任务执行单元**；harness 是它跑在其上的容器。Claude Code 是 harness，它每个 session 临时实例化出来的执行体才接近 agent。
- **harness vs orchestrator**：orchestrator 是 harness **内部的调度子系统**（控制步骤/多 agent 流转、retry、checkpoint）；harness 是包含 prompt+tools+loop 的完整外壳。Claude Code 是 harness，它的 task loop 是它的 orchestrator。
- **harness vs skill**：skill 是 harness 之上可加载的**操作手册**（procedural knowledge），不是 harness 本身。harness 决定怎么把 skill 调起来。具体到 Claude 生态：**Superpowers skill / plugins 都是 harness 内的可加载组件**——skill 提供领域知识与工作流，harness（Claude Code）决定怎么把它们调起来；二者不在同一抽象层。

## 四、为什么这个词被滥用

- **没有权威定义**：它是从老词借喻 + 社区共识长出来的，不像协议有 spec。每个团队的"harness"边界画在哪都略有不同。
- **抽象层不可见**：harness、framework、agent、orchestrator 在产品里揉成一团（如 Cursor Composer 同时横跨多层），日常对话懒得拆，于是一个词指代一整摞。
- **当卖点用**："我们做了 harness"听起来比"我们调了 prompt 和工具循环"更有壁垒——越下层越难替换、护城河越深，所以厂商有动机把自己的东西往 harness 上靠。

## 五、深入指引

本卡是词源切片，到此为止。要把这五个词钉到正确层位，读 [A02 抽象层级辨析·Harness Framework Agent Skill Orchestrator](/kb/专题-安全对齐与失败/a02-抽象层级辨析-harness-framework-agent-skill-orchestrator/)（六层抽象表 + 可替换矩阵）；要看 harness 作为一种工程范式的全景（命名史、技能分级、多家 coding harness 对照），读 [S03 Harness Engineering 全景](/kb/专题-安全对齐与失败/s03-harness-engineering-全景/)。

## 关联节点

- [A02 抽象层级辨析·Harness Framework Agent Skill Orchestrator](/kb/专题-安全对齐与失败/a02-抽象层级辨析-harness-framework-agent-skill-orchestrator/) —— 五词分层，本节点的系统化升级
- [S03 Harness Engineering 全景](/kb/专题-安全对齐与失败/s03-harness-engineering-全景/) —— harness 工程全景，本节点的范式化升级
- [Skill 系统的本质](/kb/ai-协作方法论/skill-系统的本质/) —— harness 之上的可加载层
- [Claude Code](/kb/ai-公司与产品/claude-code/) —— harness 的范例实例

## 修订日志

- 2026-06-11 P0 收口：新建本卡，填补此前 0 字节空文件（约 20 处入链指向的"分析地基"为空白页）。内容采词源切片定位（etymology + 三次语义滑动 + 邻近词边界 + 滥用成因），系统化部分指向 A02 / S03。依据：链入语境一致期待"harness 词源/主体归属"切片（见 A02 §三、S03 §1、S01 §执行层、A06 §六、各 E/G 节点末尾"对照 Harness 词义辨析"）；lm-evaluation-harness 命名与《Building Effective Agents》(2024-12) workflow/agent 区分经 WebSearch 核实。
- 2026-06-12 同名去重合并：将旧 `0401AI 基础知识库/Harness词义辨析.md`（无空格版，原始概念卡）的独有内容并入本卡——Superpowers skill/plugin 作为 harness 内可加载组件的具体化（并入 §三 harness vs skill）、来源对话存档链、`Superpowers harness`/`Harness词义辨析` 别名。本卡为合并后唯一权威节点（47 处入链原指本卡，3 处无空格链已重指本卡）；旧无空格卡已归档至 `90故纸堆`。结束 PKM 夜跑连续 5 轮等待的「Harness 重名」悬置。
- 2026-06-12 内审修复：frontmatter 补 final_path 字段（= 本文件在库内实际相对路径）。

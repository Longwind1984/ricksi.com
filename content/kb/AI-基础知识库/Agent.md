---
title: Agent
cluster: AI 基础知识库
created: '2026-05-18'
updated: '2026-05-18'
---

# Agent 与工具调用

## 核心能力栈

**Tool Use / Function Calling**：LLM 不只输出文本，而是输出结构化的"函数调用指令"，由外部系统执行并将结果返回。

**ReAct 框架**：Thought → Action → Observation → Thought 循环

**Planning（规划）**：
- 固定流程 (DAG)：预定义工作流拓扑
- LLM 动态规划：灵活但不可靠
- 层级规划：先粗后细

## 核心工程挑战

- **可靠性困境**：每步概率采样。5 步 95% 准确 → 77%，10 步 → 60%
- **错误积累与恢复**：一步出错可能雪崩
- **上下文管理**：多步执行会迅速填满上下文窗口

## 架构模式

| 模式 | 适用场景 |
|------|---------|
| 单 Agent + 多工具 | 任务明确、工具集有限 |
| 多 Agent 协作 | 复杂工作流 |
| MCP (Model Context Protocol) | 互操作性标准 |

## 与 System 2 的融合

参见 [System 2 / Test-Time Compute](/kb/AI-基础知识库/Test-Time-Compute/)，两者融合形成 **Reasoning Agent** 范式。

## 相关章节

- [c08 Function Calling 的受约束解码](/kb/AI-基础知识库/c08-解码策略与生成控制/)
- [c10 Agent 技术栈详解](/kb/AI-基础知识库/c10-Agent-技术栈与工具调用/)
- [c11 Reasoning Agent](/kb/AI-基础知识库/c11-System-2-思维与-Test-Time-Compute/)

## 专题升级（0411）

本卡片是基础概念入口。系统性深入请进入 [Agent 系统化专题](/kb/Agent-系统化专题/_Agent-系统化专题·总览/)（22 节点 · 5 轮批判性同行评议 · 已出版就绪）：

- 语词流变：[A01 Agent 概念史与语义流变](/kb/Agent-系统化专题/A01-Agent-概念史与语义流变/)
- 抽象层级：[A02 抽象层级辨析·Harness Framework Agent Skill Orchestrator](/kb/Agent-系统化专题/A02-抽象层级辨析·Harness-Framework-Agent-Skill-Orchestrator/)
- 代际谱系：[G01 Agent 代际谱系总图](/kb/Agent-系统化专题/G01-Agent-代际谱系总图/) · [G02 五代演化详解·G1-G5](/kb/Agent-系统化专题/G02-五代演化详解·G1-G5/)
- 架构剖面：[S01 Agent 六层架构剖面](/kb/Agent-系统化专题/S01-Agent-六层架构剖面/)
- 实例剖解：[E01 Coding Agent·Claude Code & Cursor](/kb/Agent-系统化专题/E01-Coding-Agent·Claude-Code-Cursor/) · [E02 通用 Agent·Manus & Devin](/kb/Agent-系统化专题/E02-通用-Agent·Manus-Devin/) · [E03 Multi-Agent 框架·AutoGen & CrewAI & DeerFlow](/kb/Agent-系统化专题/E03-Multi-Agent-框架·AutoGen-CrewAI-DeerFlow/)
- 复现实操：[R01 最小可运行·100 行 ReAct](/kb/Agent-系统化专题/R01-最小可运行·100-行-ReAct/)
- 阅读指南：[README·多视图阅读指南](/kb/Agent-系统化专题/README·多视图阅读指南/)

<!-- evidence-pool-start -->
> [!quote]+ 📎 证据池 · 17 条 · 自动生成于 2026-05-16
>
> ## A 级精读
> - 万字干货：理解 Harness Engineering，看这一篇就够了-2026-04-14 · 2026-04-14 · 本文作者：咸鱼，TRAE 开发者用户
> - 设计分享-AI产品深度分析报告（三）-2026-04-04 · 2026-04-04 · 爱淘器设计 主要从事产品策划/品牌策划/营销策划，产品设计，品牌视觉设计，展示设计 结构设计，原型制作，批量生产跟踪，U
> - 对话尤瓦尔·赫拉利：人类对秩序的渴求先于真相，是互联网和AI控制个人的首要原因-2026-03-06 · 2026-03-06 · 腾讯科技《AI未来指北》作者 博阳 编辑 郑可君 对话尤瓦尔·赫拉利（音频全程实录） ,腾讯科技 ,52分钟 进度条 3
> - Anthropic 首席产品官访谈实录：先做一个还不能用的产品，然后等大模型迭代-2026-02-13 · 2026-02-13 · 我感觉上周Cisco 在旧金山举办了第二届年度 AI Summit（大会的主题是\"AI 经济的建设者\" ），可能是过
> - Manus创始人肖弘，复盘至暗时刻-2025-12-30 · 2025-12-30 · 胡世鑫 本文作者
> - 深度｜收入8个月翻4倍，自动化神器n8n创始人：AI要么是一个巨大的机遇，要么是公司的终结-2025-10-13 · 2025-10-13 · Z Potentials 我们与Z Potentials同频共振 488篇原创内容 公众号 ， 图片来源：EU-Star
> - AI Agent 主流的设计模式（ReAct,Reflection,LATS）其实没有很复杂。-2025-09-30 · 2025-09-30 · 小白也能快速看懂的 AI Agent 主流的设计模式🐶。
> - 斯坦福李飞飞 《AI Agent：多模态交互前沿调查》 论文-2024-11-21 · 2024-11-21 · 多模态AI系统很可能会在我们的日常生活中无处不在。将这些系统具身化为物理和虚拟环境中的代理是一种有前途的方式，以使其更加
> - 理查德·塞勒：行为经济学的过去现在和未来｜阅读笔记-2024-11-01 · 2024-11-01 · Behavioral Economics: Past, Present, and Future Author(s): R
> - 左氧氟沙星 - 维基百科，自由的百科全书-2024-08-08 · 2024-08-08 · [](https://zh.wikipedia.org/wiki/File:Staroflifecaution.svg)
>
> ## B/C 级参考 (6 条)
> - B · Anthropic的新产品又杀死了一批的AI基础设施团队-2026-04-09 · 2026-04-09
> - B · 字节跳动超级智能体DeerFlow 2.0开源，登顶GitHub Trending第一！-2026-03-05 · 2026-03-05
> - B · Manus 产品立项初期会议纪要-2025-12-28 · 2025-12-28
> - B · 我用n8n+飞书监控了100 个AI头部公众号动态，借势解决「选题」困境-2025-10-15 · 2025-10-15
> - B · 非技术背景也能看懂的万能提示词公式-2025-09-25 · 2025-09-25
> - B · 头孢克肟 - 维基百科，自由的百科全书-2024-08-08 · 2024-08-08
<!-- evidence-pool-end -->

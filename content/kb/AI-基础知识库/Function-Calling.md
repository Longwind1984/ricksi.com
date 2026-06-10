---
title: Function Calling
cluster: AI 基础知识库
created: '2026-05-22'
updated: '2026-05-22'
---

# Function Calling / 工具调用

## 核心定义

让 LLM 不只输出文本，而是输出结构化的"函数调用指令"（JSON 格式的工具名 + 参数），由外部系统执行并将结果返回给 LLM 继续推理。

本质上是把 LLM 从"封闭的下一个 token 预测器"升级为"可观测外部世界、可改变外部状态的智能体"。

## 与受约束解码的关系

Function Calling 依赖 [c08 受约束解码 (Constrained Decoding)](/kb/AI-基础知识库/c08-解码策略与生成控制/)——在解码时动态计算语法合法的 token 集合，保证输出 100% 符合目标函数 schema。

未走受约束解码的"原生 JSON 模仿"会随机崩坏（字段错位、引号不闭合、bool 写成字符串），生产系统必须使用厂商提供的官方 tool_use API 而非自行解析。

## 与 Agent 的关系

Function Calling 是 [Agent](/kb/AI-基础知识库/Agent/) 的底层能力。Agent = LLM + Function Calling + ReAct 循环 + Planning + Memory。

单次 Function Call 不构成 Agent，多轮调用的 loop 才是——调用结果反馈到下一轮 prompt，模型基于工具返回继续推理或再调用，直到满足终止条件。

## 三大厂商范式差异

| 厂商 | API 形态 | 多工具并发 | 流式行为 |
|------|---------|----------|---------|
| Anthropic Claude | `tool_use` / `tool_result` content blocks | 原生支持 parallel tool use | 工具调用块在 stream 中作为完整单元出现 |
| OpenAI | `tool_calls` 数组（function_call 已 deprecated）| 支持 `parallel_tool_calls=true` | 流式增量返回 tool call 片段 |
| Google Gemini | `functionCall` / `functionResponse` parts | 支持但 schema 表达力较弱 | 类似 OpenAI 的增量流 |

迁移性陷阱：同一个 schema 在 Anthropic 上更稳，在 OpenAI 上更快出新功能（如 Strict mode），在 Gemini 上更便宜——选型不只是看 schema 兼容。

## 典型失败模式

1. **参数幻觉**：编造 enum 之外的值、把数字写成字符串、必填字段缺失。受约束解码或 strict mode 可消除大部分
2. **工具选择错误**：在该调用 search 时调用 calculator——通常是工具描述 (description) 写得不够正交，或工具数量过多（>20 个时显著下降）
3. **死循环**：同一工具被反复以相似参数调用——需在 Agent loop 加最大步数 / 重复检测
4. **越权调用**：模型在不应行动时主动调工具（如用户只是闲聊）——通过 system prompt 或 `tool_choice=none` 控制
5. **跨调用上下文丢失**：长 loop 中早期工具返回的关键事实被压出窗口——需要 [Prompt Caching](/kb/AI-基础知识库/Prompt-Caching/) + 摘要压缩

## 与 MCP 的演化关系

[Function Calling](/kb/AI-基础知识库/Function-Calling/) 是单个应用与单个 LLM 之间的私有协议；[MCP](/kb/Agent-系统化专题/A08-MCP-与-A2A-协议族/) 把它标准化为"客户端-服务端"模式，让任何符合 MCP 的工具可以被任何符合 MCP 的 LLM 客户端使用。

MCP ≈ Function Calling 的 OS 化：工具市场、权限模型、传输协议、订阅模型都被定义出来。

## 对 Rick 的 PM 价值

设计 Agent 形态产品时的检查清单：

1. **工具数量上限**：建议初版 ≤8 个工具，超出后用工具组合 / 子 Agent 分流
2. **工具描述质量**：description 写得越像"使用说明书"越好——LLM 是用描述本身做选择决策的
3. **错误返回设计**：工具返回错误时给 LLM 可恢复的信息（缺什么参数、应该怎么补），而非简单 500
4. **可观测性**：每一次 tool_use 都要记录耗时 / 成本 / 失败率，这是 Agent 产品的关键 KPI
5. **退化路径**：用户输入清晰时跳过 tool_use 直接回答——避免无谓的工具调用延迟

## 相关链接

- [c08 受约束解码](/kb/AI-基础知识库/c08-解码策略与生成控制/)
- [c10 Agent 核心能力](/kb/AI-基础知识库/c10-Agent-技术栈与工具调用/)
- [Agent](/kb/AI-基础知识库/Agent/) ReAct [Prompt Caching](/kb/AI-基础知识库/Prompt-Caching/)
- [MCP](/kb/Agent-系统化专题/A08-MCP-与-A2A-协议族/)（Function Calling 标准化的下一步）
- [S01 Agent 六层架构剖面](/kb/Agent-系统化专题/S01-Agent-六层架构剖面/) §"工具层"
- [Agent 系统化专题](/kb/Agent-系统化专题/_Agent-系统化专题·总览/)

## 来源 / 证据池

（待补充：典型 tool_use 失败案例 / 各厂商 schema 对照 / MCP spec）

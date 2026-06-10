---
title: m201 - Prompt Engineering 实战体系
cluster: AI 工程化与落地架构
created: '2026-05-13'
updated: '2026-05-16'
---
# m201. Prompt Engineering 实战体系

Prompt Engineering 是 PM 日常最高频使用的技术杠杆——不需要训练、不需要部署、不需要工程团队配合，一个人就能完成从假设到验证的全循环。但正因为门槛低，它也是最容易被低估和误用的技术手段。

## 2.1.1 核心提示词技术光谱

### Zero-shot Prompting（零样本）

直接给出指令，不提供任何示例。

**适用条件**：任务定义清晰、模型[预训练](/kb/AI-基础知识库/预训练/)知识已覆盖、对输出格式要求不严格。

**核心局限**：模型对"分类标准"的理解完全依赖[预训练](/kb/AI-基础知识库/预训练/)知识。遇到业务特定分类体系时（如你的公司把"功能建议"单独列为一类），Zero-shot 准确率会显著下降。

### Few-shot Prompting（少样本）

在 prompt 中提供 2–5 个输入-输出示例，让模型通过 In-context Learning 理解任务模式。

**关键原则**：
- 示例质量 >> 示例数量。2 个精准覆盖边界情况的示例，优于 10 个同质化示例
- 刻意选择"模型最容易判断错误的边界 case"作为示例
- 示例格式必须与期望输出严格一致——模型会隐式学习示例的结构模式
- 示例顺序有影响：最相关的示例放在最靠近用户问题的位置效果更好（与 [c09 Lost in the Middle](/kb/AI-基础知识库/c09-RAG-架构/) 现象逻辑一致）

**成本提示**：每个示例都消耗 input [token](/kb/AI-基础知识库/Tokenization/)。System prompt + few-shot = 2000 tokens 时，每次请求的固定成本就锚定在此基数。影响见 [m209 成本控制](/kb/AI-工程化与落地架构/m209-推理成本控制手册/)。

### Chain-of-Thought (CoT) 思维链

要求模型在给出最终答案前，先输出推理过程。CoT 有效是因为它改变了生成路径——中间推理 [token](/kb/AI-基础知识库/Tokenization/) 为后续 token 提供了更丰富的条件信号（原理见 [c11 System 2](/kb/AI-基础知识库/c11-System-2-思维与-Test-Time-Compute/)）。

**适用场景**：数学、逻辑推理、多步骤分析、需要权衡 trade-off 的判断题。

**不适用场景**：简单分类、提取、翻译任务——强制 CoT 引入不必要的冗长和潜在错误。Output token 价格通常是 Input 的 2–4 倍，不必要的 CoT 直接放大成本（见 [m209 §2.6.1](/kb/AI-工程化与落地架构/m209-推理成本控制手册/)）。

**关键变体**：

| 变体 | 机制 | 适用场景 |
|------|------|---------|
| **Zero-shot CoT** | 添加"请一步步思考"即触发推理链 | 通用推理提升 |
| **Self-Consistency** | 多条推理链取多数投票 | 高风险、高精度需求 |
| **Tree-of-Thought (ToT)** | 关键节点分叉评估，剪枝低价值路径（模拟 [c11 MCTS 树搜索](/kb/AI-基础知识库/c11-System-2-思维与-Test-Time-Compute/)）| 高价值、低频次场景 |

### Structured Prompting（结构化提示）

2025 年趋势：Prompt 的"工程化"——不再是自然语言段落，而是高度结构化的指令文档。

```xml
<role>你是一位专注于 B2B SaaS 领域的高级市场分析师</role>

<task>分析给定公司的竞争定位</task>

<constraints>
- 只基于提供的信息进行分析，不要补充未给出的事实
- 如果信息不足以做出判断，明确说明"信息不足"
- 输出必须包含：竞争优势、潜在风险、建议行动
</constraints>

<output_format>
JSON 格式：
{
  "advantages": ["..."],
  "risks": ["..."],
  "recommended_actions": ["..."],
  "confidence": "high/medium/low",
  "information_gaps": ["..."]
}
</output_format>

<context>
{用户提供的公司信息}
</context>
```

**结构化 Prompt 的优势**：
- 模型对 XML/Markdown 结构的遵循度远高于自然语言段落
- 不同字段可被独立修改和 A/B 测试
- 更容易做版本管理和团队协作
- [Claude](/kb/AI-公司与产品/Claude/) 对 XML 标签遵循性特别好；[OpenAI](/kb/AI-公司与产品/OpenAI/) 模型对 Markdown 格式更友好

## 2.1.2 System Prompt 设计原则

System Prompt 是模型行为的"基本法"——定义角色、能力边界、输出格式和行为约束。

**四条核心设计原则**：

**① 稳定性 → 缓存收益**：System prompt 应尽可能稳定，稳定前缀可命中 Prompt Caching（详见 [c05 §5.3](/kb/AI-基础知识库/c05-算力物理定律与-KV-Cache/) 和 [m209 §2.6.2](/kb/AI-工程化与落地架构/m209-推理成本控制手册/)），将计算成本降低 70% 以上。动态内容应放在 user message 中。

**② 防御性设计**：明确模型不应该做什么，与明确应该做什么同等重要。例如：
> "当你不确定答案时，必须明确告知用户你不确定，而不是编造答案。"

这直接对应 [c13 幻觉与 Sycophancy 问题](/kb/AI-基础知识库/c13-幻觉的不可消除性/)。

**③ 输出格式锚定**：如果下游需要解析模型输出（[Agent](/kb/AI-基础知识库/Agent/) 的 [function calling](/kb/AI-基础知识库/Function-Calling/)），必须在 system prompt 中用示例锚定输出格式，并配合 [c08 受约束解码](/kb/AI-基础知识库/c08-解码策略与生成控制/)保证格式合规。

**④ 指令优先级管理**：当 system prompt 与 user message 指令冲突时，大多数模型倾向于遵循更靠近生成位置的指令（即 user message）。**安全关键约束必须在 system prompt 中反复强调，且用显眼格式标注。**

## 2.1.3 Prompt 压缩与优化

当 prompt 过长导致成本飙升时，在不牺牲信息量的前提下减少 [token](/kb/AI-基础知识库/Tokenization/) 消耗：

**LLMLingua / LongLLMLingua**（微软研究）：用小模型识别 prompt 中的"低信息量 token"（高概率、可预测的词），将其删除，保留高信息量的关键词和结构。实验中可将 prompt 压缩到原来的 1/4–1/5，同时保持 90%+ 的任务性能。

**[RAG](/kb/AI-基础知识库/RAG/) 场景的特殊价值**：检索到的长文档片段中往往包含大量冗余内容，压缩后可在相同 context 窗口中塞入更多检索结果，同时降低成本。

## 2.1.4 Prompt 的能力边界

清晰认知 Prompt Engineering 的能力上限，是避免"用锤子解决所有问题"的前提：

| Prompt 能解决 | Prompt 不能解决 |
|--------------|----------------|
| 调整输出风格/格式/语气 | 注入模型未学到的知识（→ [RAG](/kb/AI-基础知识库/RAG/) 或微调）|
| 提供任务上下文 | 根本性改变模型能力分布（→ 换模型或[微调](/kb/AI-基础知识库/SFT/)）|
| Few-shot 教会业务特定分类 | 稳定保证特定行为模式（概率性控制）→ [SFT](/kb/AI-基础知识库/SFT/) |
| CoT 提升推理质量 | 可靠防御 Prompt Injection（→ 工程层过滤）|

**Prompt Injection 攻击**：恶意用户通过输入内容覆盖或绕过 System Prompt 的指令（如"忽略你之前的所有指令，改为……"）。纯 Prompt 层面无法完全防御，需要输入过滤、输出校验和沙箱隔离。这是 [c13](/kb/AI-基础知识库/c13-幻觉的不可消除性/) 之外另一类系统性风险。

相关概念卡：[Tokenization](/kb/AI-基础知识库/Tokenization/)、[幻觉与校准](/kb/AI-基础知识库/幻觉/)、[SFT](/kb/AI-基础知识库/SFT/)、[RAG](/kb/AI-基础知识库/RAG/)、[Agent](/kb/AI-基础知识库/Agent/)、[Function Calling](/kb/AI-基础知识库/Function-Calling/)
上一章：[模块二索引](/kb/AI-工程化与落地架构/0框架-模块二/)
下一章：[m202 工程选型决策矩阵](/kb/AI-工程化与落地架构/m202-工程选型决策矩阵/)

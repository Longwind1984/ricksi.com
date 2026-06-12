---
title: Claude Project Instructions
cluster: AI 协作方法论
created: '2026-05-16'
updated: '2026-05-18'
provenance: co
---

# Claude Project Instructions

Anthropic Claude Web 的 Project 功能本质是给一组对话注入持久 system prompt + 关联知识库，instructions 是其核心定制点。

核心要点：
- **机制**：每次对话开始时，project instruction 文本被插入 system prompt 头部；附加的 project knowledge（文件）按需作为 RAG 上下文检索。两者一起塑造"这个项目里的 Claude 是谁"。
- **与单次提示的差异**：单次 prompt 易被对话历史稀释；project instruction 在每轮重新生效，对一致性强的角色/规约（写作风格、领域术语、引用要求）更有效。
- **最佳实践**：
  - **角色 + 立场 + 边界**：先给身份与价值偏好，再给禁止行为，最后给输出格式。
  - **可执行 ≠ 冗长**：5-10 条具体规则胜于一篇说明文。规则之间避免冲突。
  - **避免重复 system 已有能力**：不必教 Claude"逐步思考"——这已在底层。专门描述项目特异的判断标准。
  - **配合 knowledge 文件**：把示例、术语表、风格指南放进 knowledge，由 instructions 引导何时检索。
- **拉美现当代史项目示例规约**（Rick 用例）：定位为持续学习伙伴而非一次性百科；优先时间线 + 因果链 + 行动者动机；遇到争议立场明确给出对照而非单边表述；引用具体史料与年代以便交叉验证。

## 关联节点
- [Claude](/kb/ai-公司与产品/claude/)
- [Anthropic](/kb/ai-公司与产品/anthropic/)
- *Prompt Engineering*
- *RAG*


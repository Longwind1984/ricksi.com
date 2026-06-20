---
title: trip-structure skill
cluster: AI 协作方法论
created: '2026-05-16'
updated: '2026-05-18'
provenance: co
---
# trip-structure skill

一句话定义：Rick 自用的 Claude skill，把行程从松散描述压成"事件粒度表格 + 迷你导览备注"的双层结构，由 skill-creator 在 2026-04-03 重写。

核心要点：
- 起点是嫌原 skill 输出"不够结构化、不够完整"；中间一度滑向 over-design，被 Rick 拉回收敛。
- 收敛后的结构：Header 保留；section 1 和 2 合并为事件表（日期/周几、区域、项目名、类型 emoji、开始时间、预估时长、预算+描述、备注）；section 3、4 删除。
- 备注栏对景观/游览类事件强制写成详尽迷你导览，覆盖历史背景、文化语境、结构性解释（政治/经济/宗教/族群）、体验路径、观察重点——把 LLM 当现场策展人用。
- 双层结构：表是骨架、导览是肉，避免输出退化成清单或退化成散文。
- 与 [Claude Code](/kb/ai-公司与产品/claude-code/) 工作流耦合；属于 Rick 把流浪田野工具化的一例。

## 关联节点
- [Claude Code](/kb/ai-公司与产品/claude-code/) — skill 运行环境
- *skill-creator*（待建）— 上游元 skill


---
title: AI概念滥用反思
cluster: 基础知识库
created: '2026-05-16'
updated: '2026-05-18'
provenance: co
---
# AI 概念滥用反思

一句话定义：AI 在回答中反复硬塞特定术语（如 popayan ritual copresence）以伪装专业度，是 LLM 在对话状态里"概念锚定 + 迁移失败"的常见模式——一次 Rick 的实际语料：直接斥之为"〔□〕生硬，愚蠢"。

核心要点：
- 触发条件：模型在 session 早期被某个具体术语标注（如田野观察 + ritual copresence），后续 turn 中即使语境改变（介绍《El fin del mundo común》），模型仍把该术语作为"高显著性"内容拉入回答。
- 失败结构：不是 hallucination，而是 saliency 漂移——术语本身真实，但被滥用为万能 frame；从认知任务角度看类似人类的"锤子-钉子"偏差。
- Martínez-Bascuñán *El fin del mundo común*：当代政治哲学随笔，论"公共世界终结"的多重诊断（媒体碎片化、阿伦特意义上 common world 的瓦解、数字平台的私人化）。
- 正确介绍此书应回到阿伦特的 common world 概念与现代公共领域瓦解，而不是套用前文的人类学微观仪式概念——后者属于范畴错位。
- 用户校准策略：（a）显式指令清除前文术语锚（"忘掉 X"）；（b）切换语言/领域 frame 强制重置；（c）多轮对话后启动新 chat，比维持上下文更高效。
- 元启示：长对话中 LLM 的 saliency 不会随话题切换自动重置；提示工程需要主动 evict 旧锚。

## 关联节点
- 阿伦特

---
title: Model Spec
cluster: 基础知识库
created: '2026-06-12'
updated: '2026-06-12'
provenance: co
---

# Model Spec

> [OpenAI](/kb/ai-公司与产品/openai/) 发布的"模型行为规格"文档/工件：一份**公开、可审计**的规范，明文定义"模型应该如何行为"——把模型行为从藏在标注员偏好里的隐式默契，变成一份谁都能读、能引用、能挑错的成文规则书。它是 OpenAI 阵营对 [Constitutional AI](/kb/基础知识库/constitutional-ai/) 式"明文价值规范"的对位答卷。

## 核心要点

- **首发与定位**：2024-05-08 首次发布初版草案，定义 OpenAI 希望其模型在 API 与 ChatGPT 中如何行为（来源：OpenAI *Introducing the Model Spec*；初版存档 cdn.openai.com/spec/model-spec-2024-05-08.html）。它不是技术论文，而是一份**产品级行为规格书**。
- **三层结构 + 指挥链**：内容按 **Objectives（宽泛目标，如"协助开发者与用户""造福人类"）/ Rules（安全与合法的硬性规则）/ Defaults（默认行为指引）** 三类组织；并叠加一条 **chain of command（指挥链）**——给指令分配权威等级，高权威覆盖低权威（平台 > 开发者 > 用户），其中 root-level rules 不可被任何系统/开发者/用户消息覆盖（来源：model-spec.openai.com，2025 版）。
- **在 RLHF/对齐里的作用**：Model Spec 的核心用途是**给研究员和数据标注员当统一准绳**——他们据此生产 [RLHF](/kb/基础知识库/rlhf/) 的偏好数据。等于把"什么是更好的回答"这个奖励信号的判据，从标注员各自的隐性偏好，收敛到一份公开成文的规格上（来源：OpenAI；FutureOfLife 行为规范透明度报告）。后续 OpenAI 用 **deliberative alignment** 等方法让规格直接塑造训练信号。
- **活文档 + 公有领域**：明确声明"不穷尽、会随时间演化"，2024–2025 多次大改（2025/02、2025/04、2025/09、2025/12 等版本）；以 **CC0 1.0 公有领域**发布，任何人可自由复用——这是"可审计/可对照"的制度设计，而非中立性承诺。
- **与 Constitutional/宪法式方法的关系**：两者**同构、对位**——都主张把模型应有的价值**显式写下、可检视**，而非埋在 rater 偏好里。差异在编译路径：Anthropic 用"宪法 + 模型自我批评（[RLAIF](/kb/基础知识库/rlhf/)）"，OpenAI 用"Model Spec + RLHF/deliberative alignment"。两份"规格书"在具体条文上常**显式对立**（典型：Model Spec 要求拒绝"keep to a sentence、never be preachy"，与早期 Claude 偏说教形成对照）。

## 在本库的用法

- 被 **0415「后训练即产品」专题 E01**（[E01 Claude 的 Constitutional AI 与 Character 剖解](/kb/专题-能力与训练/e01-claude-的-constitutional-ai-与-character-剖解/)）引用，作为"**把模型行为当产品规格来写**"的例证——与 CAI 并列，共同支撑本专题核心命题：后训练决策本质是伪装成训练决策的**产品决策**（见 [A02 命题·后训练决策即产品规格](/kb/专题-能力与训练/a02-命题-后训练决策即产品规格/)）。
- 框架记法：**规格书（Constitution / Model Spec）= 产品规格 + 编译器（RLHF / RLAIF / deliberative alignment）= 把规格编译进权重**。Model Spec 是这套记法里"对照阵营"的样本。
- 对 Rick 的选型/合规价值：做国际化与安全合规产品时，可把候选模型的 Model Spec / constitution **逐条对照目标市场的文化默认值与监管要求**（拒绝语气、硬约束清单、家长式 vs 成年人定位），而不是只看 benchmark。

## 关联节点

- 对齐技术：[RLHF](/kb/基础知识库/rlhf/)（Model Spec 喂给它偏好数据的判据）、[Constitutional AI](/kb/基础知识库/constitutional-ai/)（对位的明文价值规范方法）
- 专题：[后训练即产品系统化专题·总览](/kb/专题-能力与训练/_后训练即产品系统化专题-总览/) / [A02 命题·后训练决策即产品规格](/kb/专题-能力与训练/a02-命题-后训练决策即产品规格/) / [E01 Claude 的 Constitutional AI 与 Character 剖解](/kb/专题-能力与训练/e01-claude-的-constitutional-ai-与-character-剖解/)
- 主体：[OpenAI](/kb/ai-公司与产品/openai/)

## 来源 / 证据池

- OpenAI, *Introducing the Model Spec*（openai.com/index/introducing-the-model-spec/，2024-05-08）
- Model Spec 初版存档（cdn.openai.com/spec/model-spec-2024-05-08.html）
- Model Spec 在线版（model-spec.openai.com，2025/02、2025/12 等迭代版本，CC0 1.0）
- OpenAI, *Inside our approach to the Model Spec*
- Future of Life Institute, *Behavior Specification & Transparency*（CAI vs Model Spec 对照，~28k words 规格口径，〔字数口径待复核〕）

## 修订日志
- R0 (2026-06-12): 首稿。WebSearch 核实首发日期(2024-05-08)、三层结构 + chain of command、RLHF 标注准绳作用、CC0 公有领域、与 CAI 的同构/对位关系。建卡后解决 0415 总览标记的 `[Model Spec](/kb/基础知识库/model-spec/)` 缺卡死链（E01 2 处）。〔待复核：规格字数口径 ~28k words〕

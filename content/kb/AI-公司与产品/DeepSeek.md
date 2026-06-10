---
title: DeepSeek
cluster: AI 公司与产品
created: '2026-05-15'
updated: '2026-05-16'
---

# DeepSeek

> 杭州 / 北京双总部 AI 实验室，由量化基金「幻方量化」（High-Flyer）孵化。以低成本训练、激进开源、推理模型 R1（2025.1）震动全球——把"美西方前沿模型必须 closed weights + 千亿美金"这一假设打穿。当前是 Rick 选择 DeepSeek-V4-Pro 作为日常首选模型的主体。

## 公司画像
- **创始基因**：幻方量化原有 GPU 集群（万卡级 A100→H800）+ 量化交易培养的工程文化，被复用到大模型训练。CEO 梁文锋（量化背景）。
- **资本结构**：幻方独资孵化，未走外部 VC，保持独立产品 + 开源策略。
- **组织哲学**：极小研究团队（百人量级）、极高人均产出；论文 / 模型权重 / 推理代码同步开源；不做消费应用的"流量战"，靠 API 和开源生态拉社区影响。

## 关键产品与时间线
- 2024.1 DeepSeek LLM（67B 起步），开源对标 LLaMA。
- 2024.5 DeepSeek-V2：首次大规模采用 [MoE](/kb/ai-基础知识库/moe/) + Multi-head Latent Attention（MLA），把 [KV Cache](/kb/ai-基础知识库/kv-cache/) 体积压到 1/4。
- 2024.12 DeepSeek-V3（671B 参数 / 37B 激活）：训练成本约 557 万美元——远低于同代闭源模型，震撼业界。
- 2025.1 **DeepSeek-R1**：纯 RL（无 SFT）路径训练出的推理模型，性能逼近 OpenAI o1。开源后 7 天内 Hugging Face 下载量过百万，引发全球 LLM 市值波动（"DeepSeek Moment"）。
- 2025–2026 V4 / V4-Pro：进一步压成本、扩展长上下文、强化代码与 Agent。

## 核心技术装置
- **MLA (Multi-head Latent Attention)**：把 [Attention](/kb/ai-基础知识库/attention/) 的 KV 投影到低维潜空间，是 [KV Cache](/kb/ai-基础知识库/kv-cache/) 工程上最具影响力的改进之一。直接降低长上下文推理成本。
- **MoE 路由**：DeepSeek-V3 采用细粒度专家 + 共享专家 + 辅助负载均衡损失（auxiliary-loss-free balancing），是 [MoE 路线](/kb/ai-基础知识库/c06-架构演进-dense-moe-ssm-hybrid/) 在 2025 年最成熟的工程化实现。
- **R1 训练 pipeline**：先 RL（GRPO）冷启动，再 SFT + RL 多轮迭代，挑战了"必须从 SFT 开始 + 海量人类偏好数据"的 [RLHF](/kb/ai-基础知识库/rlhf/) 常识。
- **极致工程**：FP8 训练、流水并行 DualPipe、节点内全连接专家通信优化，被多个团队复现并写入技术报告。

## 与同行对比
- **vs. [OpenAI](/kb/ai-公司与产品/openai/) / [Anthropic](/kb/ai-公司与产品/anthropic/)**：闭源 / 大资金 / 安全 narrative vs. 开源 / 工程极致 / 性价比。DeepSeek 的存在让"前沿能力"在开源世界保留呼吸空间。
- **vs. Qwen / Llama**：Llama 走"开源但不公开训练细节"路线，Qwen 走"全谱系覆盖+多模态"路线，DeepSeek 走"在前沿模型上开源 + 写得详细到能复现"路线，对学界友好度最高。
- **vs. 国内同行（智谱 / Kimi / Minimax / 百川）**：DeepSeek 不做 C 端、不烧广告，但靠 R1 的"全球影响力"反而获得了远超国内同行的国际声誉。

## 对 Rick 的价值
- **国产开源选项的现实锚**：Rick 把 DeepSeek-V4-Pro 设为日常首选模型，本质是在做"能力 / 价格 / 主权"的三向权衡。DeepSeek 提供了不被任何一家美西方公司绑定的退路。
- **AI PM 视角的"开源生态杠杆"**：当 PM 评估"用闭源 API vs. 自建 / 蒸馏开源模型"时，DeepSeek 的模型卡 + 训练报告 + 蒸馏小模型（1.5B–70B）是最完整的参考材料。
- **训练 / 推理成本的现实基准**：DeepSeek 公开的训练成本和推理 token 价格，给行业立了一根"理论下限"，是 Rick 在做 [推理成本](/kb/ai-工程化与落地架构/m209-推理成本控制手册/) 评估时不可绕开的对照。

## 关键人物
- **梁文锋**（CEO / 创始人）：量化基金幻方创始人，深度参与训练决策。少见地接受过中文媒体专访（暗涌 2024、晚点 2025）。
- **罗福莉**等核心研究员：多次出现在 V2/V3/R1 论文一作位。

## 关联节点
- 技术：[MoE](/kb/ai-基础知识库/moe/) [KV Cache](/kb/ai-基础知识库/kv-cache/) [Attention](/kb/ai-基础知识库/attention/) [强化学习](/kb/ai-基础知识库/强化学习/) [Scaling Laws](/kb/ai-基础知识库/scaling-laws/) [c06 - 架构演进：Dense MoE SSM Hybrid](/kb/ai-基础知识库/c06-架构演进-dense-moe-ssm-hybrid/)
- 产品议题：[m209 - 推理成本控制手册](/kb/ai-工程化与落地架构/m209-推理成本控制手册/) [c11 - System 2 思维与 Test-Time Compute](/kb/ai-基础知识库/c11-system-2-思维与-test-time-compute/)
- 对照公司：[OpenAI](/kb/ai-公司与产品/openai/) [Anthropic](/kb/ai-公司与产品/anthropic/) [Gemini](/kb/ai-公司与产品/gemini/)
- 政策议题：开源 vs. 闭源、AI 主权、出口管制（H800 / B200）

## 来源 / 证据池
- 公开来源：DeepSeek 官方论文（V2、V3、R1）、Hugging Face 模型卡、梁文锋暗涌 / 晚点访谈
- （待补充：从 Cubox 反链汇集的具体证据）

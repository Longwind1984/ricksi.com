---
title: OpenAI
cluster: AI 公司与产品
created: '2026-05-15'
updated: '2026-05-17'
---

# OpenAI

> 大模型时代的破局者与定义者。由 Sam Altman、Greg Brockman、Ilya Sutskever 等于 2015 年以"非营利 AI 安全实验室"创立，2019 年转为"有限利润上限"结构并接受 [Microsoft](/kb/AI-公司与产品/Microsoft/) 数十亿美元投资。旗舰产品 [ChatGPT](/kb/AI-公司与产品/ChatGPT/) 在 2022-11 引爆全球大模型应用浪潮，是 AI 产业"消费爆款 + 多模态全栈 + 商业化激进"路线的代表。

## 公司画像
- **创始基因**：以"通用人工智能 (AGI) 必须惠及全人类"为口号成立，最初定位与 DeepMind 的"安全可控 AGI"近似。2019 年从非营利转为 capped-profit 后内部多次分裂——2020 年 Dario/Daniela Amodei 等核心研究者出走创立 [Anthropic](/kb/AI-公司与产品/Anthropic/)，2023 年 11 月 Sam Altman 短暂被董事会罢免又复职（"OpenAI 五日政变"）。
- **资本结构**：[Microsoft](/kb/AI-公司与产品/Microsoft/) 主要投资方（累计约 130 亿美元以上），与 Azure 计算深度绑定；2024–2025 启动新一轮融资，估值跨越 5000 亿美元量级。组织上正在剥离非营利母体（仍是行业最受关注的治理实验）。
- **组织哲学**：研究 + 产品 + 应用三轨并行——Research 团队主导 GPT 模型族迭代，Product 团队负责 ChatGPT、API、企业产品，Application 团队推动行业落地。节奏激进，常以"边发布边修复"对外铺产品。
- **政策角色**：Altman 多次在美国国会、白宫、欧盟 AI Act 听证会作证，立场偏"积极拥抱监管框架以确立头部企业的合规护城河"。与 [Anthropic](/kb/AI-公司与产品/Anthropic/) 的"风险声调更高"形成对照。

## 关键产品与时间线
- 2018.6 GPT-1 论文发布，确立"Transformer 预训练"范式。
- 2019.2 GPT-2 发布，因"风险过高"延迟开源——这是大模型时代"安全 vs 开放"争论的第一个公开节点。
- 2020.5 GPT-3 论文，把"few-shot prompting"推为主流接口；同年 OpenAI API 上线。
- 2022.3 InstructGPT / [RLHF](/kb/AI-基础知识库/RLHF/) 论文，奠定"指令对齐"工程基础。
- 2022.11 [ChatGPT](/kb/AI-公司与产品/ChatGPT/) 公测，5 天破百万用户、2 个月破亿，是消费互联网史上增长最快的应用。
- 2023.3 GPT-4 发布；2023.11 GPT-4 Turbo + Assistants API + GPTs 商店尝试。
- 2024.5 GPT-4o "Omni" 多模态一体化模型 + 实时语音模式。
- 2024.9 o1 系列发布，"推理模型"开启 Long CoT 新赛道。
- 2025 GPT-5、o3、Operator（[Computer Use](/kb/AI-公司与产品/Computer-Use/) 同类产品）、Sora 视频生成、Realtime API、Codex / Canvas 等密集铺面。
- 2026 当下旗舰为 GPT-5 系列与 o3-pro，DevDay 转向"应用平台"叙事——Apps in ChatGPT、Custom GPT 商店、企业版深度集成。

## 核心技术装置
- **Scaling Laws 路线信仰**：从 GPT-2 → GPT-3 → GPT-4 验证"参数 + 数据 + 算力"近似幂律提升；2024 后承认"预训练 scaling 见顶"，转向"推理时算力 scaling"（o1/o3 路线）。
- **RLHF 范式定义**：InstructGPT 论文奠定的人类反馈强化学习模式被全行业沿用至 2024，是大模型"可用化"的工程母模板。
- **平台化战略**：API + GPTs 商店 + Apps in ChatGPT，把 OpenAI 从"模型公司"逐步重构为"AI 操作系统 + 应用商店"。这一步是 Altman 的"系统级豪赌"。
- **多模态全栈**：Sora（视频）、Voice（语音）、DALL·E（图像）、Realtime（语音对话）一并由内部团队推进，与 Anthropic 的"先把语言模型做好"路径形成鲜明对照。

## 与同行对比
- **vs. [Anthropic](/kb/AI-公司与产品/Anthropic/)**：OpenAI 走"消费爆款 + 全模态 + 商业激进"路线，[Anthropic](/kb/AI-公司与产品/Anthropic/) 走"开发者企业 + 安全 narrative + 慢节奏"路线。短期收入 OpenAI 领先一个数量级，长期客户结构 Anthropic 更稳。
- **vs. [Google DeepMind](/kb/AI-公司与产品/Gemini/)**：Google 自有计算、搜索分发与端云一体，OpenAI 没有这三个底座但靠 ChatGPT 入口与 GPT 商店反向建立分发；Gemini 在编程、长上下文上的工程优势在 2026 已能与 GPT-5 持平甚至局部领先。
- **vs. [DeepSeek](/kb/AI-公司与产品/DeepSeek/) / 国内 lab**：DeepSeek 开源 + 高性价比，OpenAI 闭源 + 高定价；两条路线在 2025–2026 拉开全球 AI 产业的两个极端形态。
- **vs. Microsoft Copilot**：技术合作伙伴同时是渠道竞争对手。Copilot 渠道铺得广但产品形态偏"在 Office 嵌入对话框"，落地效果远不如 ChatGPT 直接面向用户的形态——这是 Rick 20260304-AI产品体验的代差与组织问题 的核心案例之一。

## 对 Rick 的价值
- **AI 产品演化"激进路线"的样本**：ChatGPT → GPTs → Apps in ChatGPT → Realtime 的产品演化，是研究"AI 公司如何从模型公司变成平台公司"的现成案例，对 通往 AI PM 之路 与 AI 产品形态 都是必读路径。
- **RLHF / Scaling Laws / 推理模型范式源头**：本库 04AI/0401AI 基础知识库 的 c01–c15 章节多处引用 OpenAI 的研究——InstructGPT、Scaling Laws、o1 推理范式都源自此处，理解 OpenAI 的迭代节奏 = 理解大模型行业的迭代节奏。
- **Altman 个人风险信号**：从"OpenAI 五日政变"到"Worldcoin / 核聚变 / Apps 商店"扩张策略，Altman 是"AI 时代的 Steve Jobs + Adam Neumann 混合体"。观察他是观察 AI 行业治理与个人崇拜耦合风险的窗口。

## 关键人物
- **Sam Altman**（CEO）：YC 出身，AI 行业政治化的主要推手；2023 年 11 月被董事会短暂罢免事件是行业治理标志性案例。
- **Greg Brockman**（President）：技术出身，与 Altman 同进退；2024 短暂休假后回归。
- **Ilya Sutskever**（前 Chief Scientist）：深度学习教父 Hinton 的学生、AlexNet 共作者，是 OpenAI 早期研究方向定义者。2024.5 离开 OpenAI 创办 Safe Superintelligence Inc. (SSI)。
- **Mira Murati**（前 CTO）：ChatGPT / GPT-4 / Sora 的产品 owner，2024.9 离开后创立 Thinking Machines Lab。
- **Jakub Pachocki / Mark Chen**：当前研究负责人。
- **Bob McGrew**（前 Chief Research Officer）：2024 离开。

## 关联节点
- 产品：[ChatGPT](/kb/AI-公司与产品/ChatGPT/) [Sora](/kb/AI-公司与产品/Sora/) [DALL-E](/kb/AI-公司与产品/DALL-E/) [Codex](/kb/AI-公司与产品/Codex/) [GPTs](/kb/AI-公司与产品/GPTs/) [Computer Use](/kb/AI-公司与产品/Computer-Use/)
- 对照公司：[Anthropic](/kb/AI-公司与产品/Anthropic/) [Gemini](/kb/AI-公司与产品/Gemini/) [DeepSeek](/kb/AI-公司与产品/DeepSeek/) [Microsoft](/kb/AI-公司与产品/Microsoft/)
- 研究范式：[RLHF](/kb/AI-基础知识库/RLHF/) [Scaling Laws](/kb/AI-基础知识库/Scaling-Laws/) c11 - 推理模型与 Long CoT [Function Calling](/kb/AI-基础知识库/Function-Calling/) [Agent](/kb/AI-基础知识库/Agent/)
- 产品议题：m205 - AI 产品形态：从工具到 Agent [p302 - 七种 AI 交互设计模式](/kb/AI-产品设计与交互范式/p302-七种-AI-交互设计模式/) 20260304-AI产品体验的代差与组织问题
- 职业议题：通往 AI PM 之路

## 来源 / 证据池

（待补充: 从 Cubox 或永久笔记反链汇集到此节点的证据条目）

<!-- evidence-pool-start -->
> [!quote]+ 📎 证据池 · 28 条 · 自动生成于 2026-05-16
>
> ## A 级精读
> - 万字干货：理解 Harness Engineering，看这一篇就够了-2026-04-14 · 2026-04-14 · 本文作者：咸鱼，TRAE 开发者用户
> - 20260304-微博 AI · 2026-03-04 · AI 巨头对比札记：微软 Copilot 落地差、谷歌产品意志缺位、ChatGPT 沦为客服，唯有 Anthropic/
> - 深度｜收入8个月翻4倍，自动化神器n8n创始人：AI要么是一个巨大的机遇，要么是公司的终结-2025-10-13 · 2025-10-13 · Z Potentials 我们与Z Potentials同频共振 488篇原创内容 公众号 ， 图片来源：EU-Star
> - OpenAI正在押注一场系统级豪赌｜奥特曼最新重磅访谈-2025-10-09 · 2025-10-09 · 10月9日消息，DevDay大会落幕后，山姆・奥特曼再次登上Stratechery访谈节目。这一次，他不谈模型，不谈AG
> - Dario Amodei — On DeepSeek and Export Controls-2025-01-30 · 2025-01-30 · A few weeks ago I made the case for stronger US export contr
> - DeepSeek创始人专访：中国的AI不可能永远跟随，需要有人站到技术的前沿-2025-01-27 · 2025-01-27 · 一觉醒来，DeepSeek 发布的 iOS 应用超越了 ChatGPT，直接登顶 AppStore。
> - 腾讯司晓：“相变”是下个时代的前情提要-2024-02-02 · 2024-02-02 · 司晓 腾讯集团副总裁、腾讯研究院院长 2024 年 1 月 24 日，由腾讯研究院和腾讯可持续社会价值事业部主办的“20
> - AI 之下，阅读的演化与未来-2024-01-29 · 2024-01-29 · 过去数年间科技行业诞生的新概念，没有哪个像 2023 年的 ChatGPT 一样，如此迅速地走进我们的日常。生成式 AI
>
> ## B/C 级参考 (20 条)
> - B · 亚马逊数据中心遇袭：搬上太空能躲过导弹吗？-2026-04-05 · 2026-04-05
> - B · 字节跳动超级智能体DeerFlow 2.0开源，登顶GitHub Trending第一！-2026-03-05 · 2026-03-05
> - B · 20260303-产品想法 · 2026-03-03
> - B · AI Coding日志-序章-2025-11-17 · 2025-11-17
> - B · AI Coding日志-序章-2025-09-25 · 2025-09-25
> - B · 非技术背景也能看懂的万能提示词公式-2025-09-25 · 2025-09-25
> - B · 深度｜OpenAI研究员Dan Roberts：AI主流认知将被打破，未来某个时点强化学习将完全主导整个训练过程-2025-05-17 · 2025-05-17
> - B · 大厂产品范式被动摇，创业的可能性回归-2025-03-18 · 2025-03-18
> - B · Jay Alammar：图解DeepSeek-R1-2025-01-28 · 2025-01-28
> - B · 选择-杂交-突变，DeepMind将自然选择引入LLM思维，实现心智进化-2025-01-24 · 2025-01-24
> - ...还有 10 条
<!-- evidence-pool-end -->

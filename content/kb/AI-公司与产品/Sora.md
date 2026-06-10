---
title: Sora
cluster: AI 公司与产品
created: '2026-05-19'
updated: '2026-05-19'
---

# Sora

## 一句话定义

[OpenAI](/kb/ai-公司与产品/openai/) 推出的文生视频 / 图生视频 / 视频续写多模态模型，定位为视频版的 ChatGPT —— 公测 Sora 1 于 2024-02 演示、2024-12 开放给 ChatGPT Plus / Pro 用户；Sora 2 于 2025 间发布，强化时长、物理一致性、声音同步与可控角色。在 2025–2026 的视频生成竞争中与 Google Veo、Runway Gen-4、可灵 / Kling、Hailuo 02 等同台。

## 产品定义

Sora 不是单一模型而是 OpenAI 的**视频原生 stack** ：

- 文 → 视频（text-to-video，最常见）
- 图 → 视频（image-to-video，给一张静帧延伸 4–20 秒）
- 视频 → 视频续写（extend，往任意方向加长）
- 视频 → 视频风格化（video-to-video restyling）
- 视频 → 关键帧提取与重排（remix）

底层架构是 **Diffusion Transformer (DiT)** 范式（参考 Peebles & Xie 2023）：把视频切成 spatiotemporal patches（"时空 token"），用 transformer 在压缩潜空间中 denoise；patch 化使模型能处理任意分辨率与时长。

## 演化时间线

| 时间 | 事件 |
|------|------|
| 2024-02 | OpenAI 发布技术报告 *Video Generation Models as World Simulators* + 演示片段，未开放 |
| 2024-03 至 2024-Q4 | 邀请少量电影人/视觉艺术家 alpha 测试，引发"OpenAI 要颠覆好莱坞"讨论 |
| 2024-12 | Sora 1 对 ChatGPT Plus（50 视频/月）与 Pro（无限 + 1080p + 长视频）开放 |
| 2025 间 | Sora 2 发布，主要改进：分辨率提升、音视频同步、角色一致性、物理可控性显著提升 |
| 2025–2026 | 与 Adobe Firefly、Veo 3、Runway Gen-4 在好莱坞 / 短视频 / 广告生产侧持续对位 |

## 产品设计特征

- **Storyboard 模式**：用户在时间线上分段填 prompt，模型按段连续生成（解决长视频里前后剧情漂移）
- **Remix 与 Loop**：对已生成视频做局部重画、风格转换、首尾回环
- **Blend**：把两段视频在 prompt 控制下融合
- **Style References**：上传参考图设定风格基调
- **角色一致性**：Sora 2 引入更稳的角色保持机制（仍弱于 Veo 3）
- **音频生成**：Sora 2 同步生成对白 / 环境音 / 配乐（早期 Sora 只生成视频无声）

## 与竞品对比

| 模型 | 提供方 | 强项 | 弱项 |
|------|-------|------|------|
| **Sora 2** | OpenAI | 镜头语言电影感、长时长、ChatGPT 生态接入 | 物理一致性偶有崩坏、商用许可繁琐 |
| Veo 3 | Google DeepMind | 物理稳定性、可控相机、Gemini 多模态打通 | 镜头美学相对 conservative |
| Runway Gen-4 | Runway | 影视工作流深整合、专业工具链 | 同样 prompt 下美感不如 Sora |
| 可灵 / Kling | 快手 | 中文 prompt 友好、亚洲面孔与场景偏向 | 美学偏短视频审美 |
| Hailuo 02 | MiniMax | 性价比、推理速度 | 时长与物理稳定性偏弱 |

## 商业与政策议题

- **版权**：Sora 训练数据未完全披露，被怀疑用了 YouTube；引发 YouTube CEO 与音乐产业警告
- **深伪与选举**：政治候选人形象生成、deepfake 引发 2024 美国大选期争议；OpenAI 加入 C2PA 内容溯源
- **好莱坞**：与少数明星签约角色形象授权（如 2025 间 *Channing Tatum* 等案例），但 SAG-AFTRA 与 WGA 持续反对
- **定价**：包含在 ChatGPT Plus / Pro 中；Pro 用户的"无限"使用受 fair-use 限速

## 对 Rick 的价值

1. **AI 多模态产品形态观察样本**——视频生成是当下少数仍能产生强 wow-moment 的产品，能直接喂给短视频和 newsletter
2. **AI PM 战略思考**——Sora 暴露了 OpenAI 从语言中心向"通用 world simulator" 的雄心扩张，与 [Anthropic](/kb/ai-公司与产品/anthropic/) 专守安全/编码的产品哲学形成对照
3. **登山 / 旅行内容生产**——Sora 2 + 真实素材剪辑混搭已可降低旅行短片制作门槛
4. **政治-技术批判**——视频深伪 + 选举 + 平台责任的议题是公共写作的稳定富矿

## 关联节点

- 母公司：[OpenAI](/kb/ai-公司与产品/openai/)
- 同公司产品：[ChatGPT](/kb/ai-公司与产品/chatgpt/) [DALL-E](/kb/ai-公司与产品/dall-e/) [GPTs](/kb/ai-公司与产品/gpts/) [Codex](/kb/ai-公司与产品/codex/) Whisper
- 竞品：Veo / Runway Gen-4 / 可灵 / Hailuo
- 技术：Diffusion / Diffusion Transformer / Latent Diffusion / 多模态
- 议题：深伪 / 数据版权 / [Constitutional AI](/kb/ai-基础知识库/constitutional-ai/) / [多模型分层](/kb/ai-基础知识库/多模型分层/)
- 政策合作：[Microsoft](/kb/ai-公司与产品/microsoft/)（Azure 训练算力支撑早期 Sora 1）

## 来源

- OpenAI. *Video Generation Models as World Simulators*. 2024-02 技术报告
- Peebles, William, & Xie, Saining. "Scalable Diffusion Models with Transformers." *ICCV 2023*. arXiv:2212.09748 — DiT 论文
- OpenAI Sora 产品页与 system card（2024-12 + 2025 更新）
- Latent Space / Stratechery / The Information 关于 Sora 的系列分析
- vault 内：[OpenAI](/kb/ai-公司与产品/openai/) [ChatGPT](/kb/ai-公司与产品/chatgpt/) 节点中已多次互引

## 证据池

- 待 Cubox 反链汇总脚本恢复后批量回填外部摘录
- 当前 vault 内 6 处反链：见 [OpenAI](/kb/ai-公司与产品/openai/) / [ChatGPT](/kb/ai-公司与产品/chatgpt/) / [Gemini](/kb/ai-公司与产品/gemini/) / AI PM 知识图谱相关节点

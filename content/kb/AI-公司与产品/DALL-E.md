---
title: DALL-E
cluster: AI 公司与产品
created: '2026-05-19'
updated: '2026-05-19'
---

# DALL-E

## 一句话定义

[OpenAI](/kb/ai-公司与产品/openai/) 的文生图模型 / 产品线，从 2021-01 DALL·E 1（基于 GPT-3 改装的 dVAE + Transformer）演化到 2023 DALL·E 3（深度集成进 ChatGPT 的图像生成入口）；至 2025–2026，OpenAI 已把图像能力**统合进 GPT-4o / GPT-5 的原生多模态生图**，DALL-E 作为独立产品的存在感被淡化，但术语作为图像生成入口仍在 ChatGPT 内保留。

## 演化时间线

| 时间 | 版本 | 关键特征 |
|------|------|---------|
| 2021-01 | DALL·E 1 | OpenAI 首次提出"文 → 图"生成；以"半人马 fork 弹钢琴"等怪异 prompt 走红；基于 dVAE + autoregressive transformer |
| 2022-04 | DALL·E 2 | 切换到 CLIP-guided Diffusion，分辨率与质量大幅提升；首次以邀请测试开放公众；图像默认带可视水印 |
| 2023-09 | DALL·E 3 | 全面接入 ChatGPT，使用 GPT 改写 prompt 提升符合度；同时与 [Microsoft](/kb/ai-公司与产品/microsoft/) Bing Image Creator 合作免费分发 |
| 2024 | GPT-4o 原生图像 | OpenAI 把图像理解—生成统一进 GPT-4o，DALL-E 入口在 ChatGPT 内继续保留但模型底座转换 |
| 2025–2026 | GPT-5 多模态 | 文/图/音/视频统一多模态，"DALL-E" 已从模型品牌降为图像功能名 |

## 产品形态变迁

DALL-E 三代的演化是 OpenAI"**专用模型 → 通用模型**"路线的典型样本：

1. **DALL-E 1/2 期**：独立模型 + 独立产品入口（labs.openai.com） + 单独定价
2. **DALL-E 3 期**：模型独立但入口被吸入 ChatGPT，"在对话中生图"成为主形态
3. **GPT-4o / GPT-5 多模态期**：模型不再独立，"DALL-E" 退化为对图像生成功能的称呼

这与 [Codex](/kb/ai-公司与产品/codex/) 的演化路径平行——专用模型被吸入通用模型，再视情况"复活"为独立产品。DALL-E 与 Codex 不同的是没有"复活"——OpenAI 的图像产品重心已转向 [Sora](/kb/ai-公司与产品/sora/) 与 ChatGPT 内置生图。

## 与同期文生图竞品对比

| 模型 | 提供方 | 强项 | 弱项 |
|------|-------|------|------|
| **DALL-E 3 / GPT-image** | OpenAI | 与 ChatGPT 自然对话集成、prompt 容错性好 | 美学相对 conservative；高级控制弱于 SD/Flux |
| Midjourney | Midjourney Inc. | 美学水准业界标杆 | Discord/独立 web 入口、无对话上下文 |
| Stable Diffusion / Flux | Stability AI / Black Forest Labs | 开源可本地、生态控件丰富（ControlNet 等） | 需要更多 prompt 技巧 |
| Adobe Firefly | Adobe | 商业版权清洁、与 Photoshop 深整合 | 美学风格较单一 |
| Imagen / Veo 静帧 | Google | 与 Gemini 集成、文字渲染稳定 | 公众入口不如 OpenAI 触达广 |
| 即梦 / Kolors / 通义万象 | 字节、快手、阿里等 | 中文场景与亚洲美学 | 海外触达受限 |

## 商业与政策议题

- **版权诉讼**：DALL-E 训练数据涉及 LAION-5B 等公开数据集，多次被艺术家与图库公司（Getty 等）起诉；OpenAI 立场是 fair use
- **C2PA 内容溯源**：DALL-E 3 生成图像默认嵌入 C2PA metadata 与可视水印
- **审核**：拒绝生成在世公众人物、宗教-政治敏感符号、儿童不当内容；早期 jailbreaking 多次绕过
- **商业可用**：Plus / Pro 订阅产生的图像可商用（OpenAI 服务条款），但保留训练数据使用权

## 对 Rick 的价值

1. **AI 产品融合路径教学样本**——DALL-E 从独立产品到融入通用模型的轨迹，是 AI PM 思考"产品线如何被通用化吸收"的稀缺案例
2. **Newsletter / 公共写作配图**——Rick 的中文写作 + 拉美 / 登山 / AI 题材可直接借 DALL-E 3 出图
3. **AI 美学批评**——DALL-E 保守美学 vs Midjourney 戏剧美学 vs Flux 极简美学的对比可作为审美社会学切片
4. **法律—政治议题**：图像版权争议是 AI 政治学最易切入的入口

## 关联节点

- 母公司：[OpenAI](/kb/ai-公司与产品/openai/)
- 同公司产品：[ChatGPT](/kb/ai-公司与产品/chatgpt/) [GPTs](/kb/ai-公司与产品/gpts/) [Codex](/kb/ai-公司与产品/codex/) [Sora](/kb/ai-公司与产品/sora/) Whisper
- 竞品：Midjourney / Stable Diffusion / Flux / Adobe Firefly / Imagen
- 技术：Diffusion / CLIP / 多模态 / Latent Diffusion
- 议题：图像版权 / C2PA / 深伪 / [Constitutional AI](/kb/ai-基础知识库/constitutional-ai/)
- 政策合作：[Microsoft](/kb/ai-公司与产品/microsoft/)（Bing Image Creator 通道）

## 来源

- DALL·E 1 论文：Ramesh et al. "Zero-Shot Text-to-Image Generation." *ICML 2021*. arXiv:2102.12092
- DALL·E 2 论文："Hierarchical Text-Conditional Image Generation with CLIP Latents." 2022. arXiv:2204.06125
- DALL·E 3 系统卡（OpenAI 2023-09）
- OpenAI 产品页与 GPT-4o / GPT-5 多模态公告
- vault 内：[OpenAI](/kb/ai-公司与产品/openai/) / [ChatGPT](/kb/ai-公司与产品/chatgpt/) 节点中已多次互引

## 证据池

- 待 Cubox 反链汇总脚本恢复后批量回填外部摘录
- 当前 vault 内 4 处反链：见 [OpenAI](/kb/ai-公司与产品/openai/) / [ChatGPT](/kb/ai-公司与产品/chatgpt/) 系列节点

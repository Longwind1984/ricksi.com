---
title: 拓展：多模态统一 Tokenizer 空间
cluster: AI 基础知识库
created: '2026-03-24'
updated: '2026-05-16'
---
前沿模型正在突破"tokenization 只处理文本"的框架。GPT-4o 采用了统一 token 流，将文本、图像 patch、音频帧全部编码进同一个 token 空间，用 <BOI>/<EOI> 等控制 token 标识模态切换 。这在架构上意味着：​

- 模型不再是"文本模型 + 图像适配器"的拼接，而是从训练开始就在同一个注意力层里处理多模态 token
    
- 图像 patch 的"token 效率"问题同样存在：一张 512×512 图像可能被切成几百个 patch token，大幅压缩上下文空间
    

对于构建多模态产品的 PM，图像输入的 token 成本往往被严重低估——一张图可能等价于 500–1000 个文本 token。

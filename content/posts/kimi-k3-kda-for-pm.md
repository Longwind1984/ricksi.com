---
title: KDA 图解：Kimi K3 怎么把一百万 token 的记忆力卖便宜
date: 2026-07-17
tag: 技术解读
description: 全注意力为什么贵、delta 规则怎么「先擦再写」、逐通道门控省在哪——十个可交互的小演示，给产品经理讲清 Kimi K3 的 KDA 机制，以及它怎么改变产品的成本结构。
---

昨天（2026-07-16），Moonshot 发布了 Kimi K3：2.8T 参数的开源 MoE 模型（MoE，混合专家架构，每次推理只激活一小部分参数，K3 是 896 个专家里激活 16 个），原生支持视觉，上下文长度拉到 100 万 token。官方口径里，它的整体 scaling efficiency 约为上一代 K2 的 2.5 倍，靠的是两根支柱：KDA（Kimi Delta Attention，一种带「delta 规则 + 逐通道门控」的线性注意力变体）和 AttnRes。

作为一个 AI 产品经理，发布会上让我坐直的不是「1M 上下文」这个数字——这个词 2025 年大家就宣传麻了——而是随发布一起放出的价格表。一百万 token 的记忆力谁都会写在 PPT 上，难的是「服务得起」。这篇文章想回答一个问题：K3 的成本结构是怎么被 KDA 改写的，以及这件事对做产品的人意味着什么。

先对齐一下量级：一百万 token，大约是一整个中型代码仓、几十份年报、或一个客服团队整月的工单。也就是说，「全量塞进去」这件事第一次变得可想象——前提是价格扛得住。读者画像也先设定好：聪明、对成本敏感、但没有 ML 工程背景的产品经理。我会尽量少用公式、多用类比，并配了十个可以上手玩的小演示。

## 先看价格表

K3 的官方 API 定价，按每百万 token 计：

- 输入 · 命中缓存：$0.30（约 2 元人民币）
- 输入 · 未命中缓存：$3.00（约 20 元）
- 输出：$15.00（约 100 元）

两个细节值得盯住。第一，不按上下文长度分档——你塞一千 token 还是一百万 token，单价一样。第二，命中缓存与未命中之间是十倍差价（按美元计价），而输出又是未命中输入的五倍。官方还给了另一个数字：在编程类负载下，缓存命中率超过 90%，依托的是其 Mooncake 架构。

把这三行价格翻译成人话：让模型「读」很贵，让模型「重读同一份材料」很便宜，让模型「写」最贵。整张价格表都在奖励同一件事——缓存命中。而缓存能不能命中、命中多少，往下挖一层，就是注意力机制的事。

## 全注意力的两笔账

先交代背景。今天主流大模型的注意力叫全注意力（full attention）：每生成一个新词，模型都要回头看一遍上下文里所有历史 token，逐个打分、加权求和。人话版定义：开卷考试，且每做一题都要把整本书重新翻一遍。

先别急着算账，先看一眼这个机制本身长什么样。下面这个动画里，token 逐个落下：每来一个新 token，它都要向之前的全部历史 token 连一条线，右上角的计数器按 n(n+1)/2 记线数。盯住它看几秒，「平方级」就不用我解释了。

<div class="kda-demo" id="kda-demo-lookback" data-demo="lookback"><p class="kda-demo-fallback">此演示未能加载。它本该让你看着 token 逐个落下、每个新 token 向全部历史 token 连线，计数器按 n(n+1)/2 一路起飞——亲手验证全注意力为什么生成越往后、回看的成本越高。你看到的是静态降级文案，交互脚本未生效。</p></div>

这个设计在能力上是黄金标准，但在成本上有两笔账。

第一笔是计算账。上下文有 n 个 token，注意力就要算 n×n 的两两关系，复杂度 O(n²)。上下文翻倍，注意力计算量翻四倍。把一百万 token 塞进全注意力，仅「读题」这一步就是天价——这就是价格表里「未命中输入 20 元」的来源。更麻烦的是，这笔账集中发生在 prefill 阶段：用户发完请求、模型还没开始回答，就得先把整本书翻完。上下文越长，首字延迟越高，体验和成本双杀。

第二笔是存储账。生成阶段（decode，一个词一个词往外吐的阶段）模型每吐一个词，都要查阅所有历史 token 的「笔记」。这份笔记工程上叫 KV cache（键值缓存），是模型为每个历史 token 存下的查阅材料。KV cache 随上下文长度线性膨胀：一百万 token 的会话，要常驻一张巨大的显存账单，还会拖慢生成速度。而且显存比算力更稀缺——一张卡能放多少 KV cache，直接决定能同时服务多少长上下文用户；容量不够，要么排队，要么降速。

两笔账合起来是一句话：上下文越长，读题越贵、笔记越厚。下面这个演示让你亲手验证这两条曲线的形状——建议拖一拖滑块，直觉比公式管用。

<div class="kda-demo" id="kda-demo-cost" data-demo="cost"><p class="kda-demo-fallback">此演示未能加载。它本该让你拖动上下文长度滑块，对比两种注意力下的两笔账：全注意力的计算量随长度平方起飞、KV 缓存随长度线性膨胀；而线性注意力把两条曲线压平。你看到的是静态降级文案，交互脚本未生效。</p></div>

## 换个思路：记忆不必是仓库

线性注意力（linear attention）换了个思路：不给每个 token 留一份档案，而是把全部历史压缩进一个固定大小的「状态」——一个矩阵，习惯写作 S。每读一个新 token，就用它更新一次 S；要生成时，拿当前 token 的键去和 S 做一次矩阵乘法，取回一份「压缩过的回忆」。关键在「固定大小」：读一千 token 是一间办公室，读一百万 token，还是这间办公室。

同一条 token 流，换成线性注意力再看一遍，画面立刻冷静了：每个 token 只触发两件事——对固定大小的 S 做一次更新、做一次读取，计数器按 2n 记，平成一条直线。建议和上一屏对照着看，两种机制的差别一眼可见。

<div class="kda-demo" id="kda-demo-state" data-demo="state"><p class="kda-demo-fallback">此演示未能加载。它本该用同一条 token 流对照演示线性注意力：每个 token 只触发固定状态矩阵 S 的一次更新和一次读取，计数器按 2n 走平——亲手验证线性注意力的成本为什么不随上下文变长。你看到的是静态降级文案，交互脚本未生效。</p></div>

<div class="kda-analogy">
<p class="kda-analogy-title">类比：办公桌 vs 档案仓库</p>
<p>全注意力像一间不断扩建的档案仓库：每多一份文件就新盖一间库房，查阅时逐架翻找。线性注意力像一张大小固定的办公桌：桌面就那么大，新文件来了，旧的必须被压缩、合并或丢弃。</p>
<p>仓库的好处是什么都找得到，代价是越盖越贵；办公桌的好处是成本恒定，代价是你必须非常聪明地决定，什么配留在桌面上。</p>
</div>

固定状态带来一个产品经理该记住的性质：生成每个 token 的成本，基本不随上下文变长而变贵——解码吞吐曲线是平的。但朴素的线性注意力有个致命伤：它只会「加」，不会「改」。新信息不断往 S 上叠加，旧信息互相干扰，桌面很快被淹没。缺的那一环，是「擦除」。

## Delta 规则：先擦再写

Delta 规则（delta rule）把擦除补上了。它的想法用一句话说：写入之前，先问问自己现在记得什么，只把「差额」写进去。

稍微展开：来了一个新 token，模型先用当前的 S 做一次「试查询」，得到它对这份记忆的预期（记作 Ŝk，即按现有记忆预计会取出的值）；再和真实要存的值 v 比较，得到误差（Ŝk − v）；最后只把这个误差，按强度 β 从 S 里修掉。公式长这样，不看也行：S ← S − β·(Ŝk − v)·kᵀ。β 是写入与遗忘的强度：β 大，新证据覆盖旧记忆；β 小，旧记忆尽量保留。

举个具体的例子。S 里原本记着「上季度营收 2.1 亿」，新 token 带来「实际 2.3 亿」。模型先试查询，发现按现有记忆会取出 2.1——比真实值少了 0.2；于是把这个 +0.2 的修正量按 β 的强度写回相应位置。没提到的其他事实，一个 bit 都不动——这就是「误差修正量」的字面意思。

<div class="kda-analogy">
<p class="kda-analogy-title">类比：会议纪要勘误，而不是堆附录</p>
<p>好的会议纪要不是不断往后堆附录。销售总监更正「上季度营收实际是 2.3 亿，不是 2.1 亿」，合格的秘书会找到纪要里写错的那一行，划掉，改成正确数字。</p>
<p>写入的是「误差修正量」，不是又一份附录。Delta 规则干的就是这件事：先擦，再写。它存的是差值，所以叫 delta。</p>
</div>

先把镜头推到最近，看清单步是怎么走的。下面这个演示把一次 delta 写入拆成三个阶段：一块 4×4 的状态矩阵，先用现有记忆做一次试查询，再和真实值比出误差，最后按 β 把误差写回——盯住看，只有该动的那几个格子在动。

<div class="kda-demo" id="kda-demo-micro" data-demo="micro"><p class="kda-demo-fallback">此演示未能加载。它本该把一个 4×4 状态矩阵的单步 delta 循环拆成三阶段给你看：先试查询、再比误差、最后按 β 把误差写回，且只改动该动的格子——亲手验证「先擦再写」的精确性。你看到的是静态降级文案，交互脚本未生效。</p></div>

这样一来，「记忆容量有限」不再等于「记不住」，而等于「不断自我修订」。微观循环看懂之后，再亲手玩一局完整的——亲手执行一次 delta 写入，看「先读出旧记忆、再只写回修正量」到底是怎么发生的。

<div class="kda-demo" id="kda-demo-delta" data-demo="delta"><p class="kda-demo-fallback">此演示未能加载。它本该让你亲手推一次 delta 规则：先看模型对某条记忆的现有预期，再看新事实到达时，系统如何只把误差量写回状态矩阵，而不是整条覆盖——「先擦再写」的每一步都会可视化。你看到的是静态降级文案，交互脚本未生效。</p></div>

## KDA 的两把刀

Delta 规则是个老想法，把它做成能扛一百万上下文的工业方案，靠的是两把刀。KDA 正是这套方案在 Kimi 这一代模型里的名字。

第一把刀：逐通道门控。先解释门控（gating）：控制信息保留或遗忘的阀门。在 KDA 之前，Gated DeltaNet 给每个注意力头配一个标量 β——整个记忆矩阵共用一个遗忘速度。KDA 把 β 从一个数，变成逐维度的向量：记忆状态的每个通道，各自决定忘多快。长期事实（公司名、合同条款）放进慢通道，临时闲聊放进快通道，互不拖累。这对长上下文质量是实打实的：检索类长程任务考的，就是「几百页之前那句话还记不记得」，逐通道门控让慢通道有机会把关键事实一直留到被问到的那一刻。

<div class="kda-analogy">
<p class="kda-analogy-title">类比：多温区冰箱 vs 全箱一个旋钮</p>
<p>老式冰箱全箱共用一个温控旋钮：想让冻肉保鲜，红酒就得跟着挨冻。Gated DeltaNet 就是这个旋钮——一个头里的所有记忆，共用同一个遗忘速度。</p>
<p>现代冰箱分冷藏、变温、冷冻多个温区，各自设温。KDA 的逐通道门控，相当于给记忆矩阵的每个维度都装上独立温控：该久的久，该忘的忘。</p>
</div>

先把两种门控画到同一张矩阵上。下面这个热图演示把记忆状态摆成 8×8 的格子：一边是整个注意力头共用一个遗忘闸，一边是逐通道各自调速，然后让噪声不断灌进来冲刷——盯住代表关键事实的那几行，看它们在哪一边先被洗掉。

<div class="kda-demo" id="kda-demo-gatemx" data-demo="gatemx"><p class="kda-demo-fallback">此演示未能加载。它本该把记忆状态画成 8×8 的热图，对照「头级单闸」与「逐通道门控」在噪声持续冲刷下，关键事实行谁能活下来——亲手验证细粒度遗忘的价值。你看到的是静态降级文案，交互脚本未生效。</p></div>

矩阵视角看懂了，再来调音台亲手拧一遍旋钮：一个全局旋钮，和逐通道独立旋钮，在长序列的不断冲刷下分别能保住什么。

<div class="kda-demo" id="kda-demo-channels" data-demo="channels"><p class="kda-demo-fallback">此演示未能加载。它本该让你对比两种门控：单一全局旋钮 vs 逐通道独立旋钮，调节写入强度，看在长序列冲击下哪些记忆被保住、哪些被冲掉。你看到的是静态降级文案，交互脚本未生效。</p></div>

第二把刀：chunkwise 的硬件友好实现。KDA 采用一种叫 DPLR（Diagonal-Plus-Low-Rank）的矩阵形式，把逐 token 的递推改写成按块（chunk）进行的矩阵运算，正好喂饱 GPU 的矩阵计算单元。这一段你只需要记住一句话：KDA 的数学形式和硬件是一起设计的，不是算法发完论文再求工程师移植。论文里这叫 chunkwise 算法，它是「理论上的快」能变成「价格表上的便宜」的关键一步。顺带一个判断：这也是为什么线性注意力这个概念提了很多年，直到最近才真正跑进旗舰模型——不是思路变了，是工程形态终于追上了思路。chunkwise 的样子画出来是这样：

<div class="kda-fig">
<svg class="kda-fig-svg" viewBox="0 0 720 252" role="img" aria-label="chunkwise 示意：token 流切成等长块，块内并行矩阵运算，块间递推交接状态">
<text x="360" y="24" text-anchor="middle" class="t-sub" font-size="12">块间递推 · 交接状态</text>
<text x="122" y="44" text-anchor="middle" class="t-faint" font-size="11">块 1</text>
<text x="366" y="44" text-anchor="middle" class="t-faint" font-size="11">块 2</text>
<text x="610" y="44" text-anchor="middle" class="t-faint" font-size="11">块 3</text>
<rect x="36" y="56" width="172" height="48" rx="10" class="box"/>
<rect x="280" y="56" width="172" height="48" rx="10" class="box"/>
<rect x="524" y="56" width="172" height="48" rx="10" class="box"/>
<rect x="51" y="73" width="14" height="14" rx="3" class="tok"/><rect x="73" y="73" width="14" height="14" rx="3" class="tok"/><rect x="95" y="73" width="14" height="14" rx="3" class="tok"/><rect x="117" y="73" width="14" height="14" rx="3" class="tok"/><rect x="139" y="73" width="14" height="14" rx="3" class="tok"/><rect x="161" y="73" width="14" height="14" rx="3" class="tok"/><rect x="183" y="73" width="14" height="14" rx="3" class="tok"/>
<rect x="295" y="73" width="14" height="14" rx="3" class="tok"/><rect x="317" y="73" width="14" height="14" rx="3" class="tok"/><rect x="339" y="73" width="14" height="14" rx="3" class="tok"/><rect x="361" y="73" width="14" height="14" rx="3" class="tok"/><rect x="383" y="73" width="14" height="14" rx="3" class="tok"/><rect x="405" y="73" width="14" height="14" rx="3" class="tok"/><rect x="427" y="73" width="14" height="14" rx="3" class="tok"/>
<rect x="539" y="73" width="14" height="14" rx="3" class="tok"/><rect x="561" y="73" width="14" height="14" rx="3" class="tok"/><rect x="583" y="73" width="14" height="14" rx="3" class="tok"/><rect x="605" y="73" width="14" height="14" rx="3" class="tok"/><rect x="627" y="73" width="14" height="14" rx="3" class="tok"/><rect x="649" y="73" width="14" height="14" rx="3" class="tok"/><rect x="671" y="73" width="14" height="14" rx="3" class="tok"/>
<line x1="212" y1="80" x2="268" y2="80" class="arw-a"/><path d="M276 80 l-10 -5 v10 z" class="arw-a-fill"/>
<rect x="232" y="71" width="22" height="18" rx="4" class="state"/><text x="243" y="84" text-anchor="middle" class="t-accent" font-size="11">S</text>
<line x1="456" y1="80" x2="512" y2="80" class="arw-a"/><path d="M520 80 l-10 -5 v10 z" class="arw-a-fill"/>
<rect x="476" y="71" width="22" height="18" rx="4" class="state"/><text x="487" y="84" text-anchor="middle" class="t-accent" font-size="11">S</text>
<line x1="122" y1="106" x2="122" y2="132" class="ln"/>
<line x1="366" y1="106" x2="366" y2="132" class="ln"/>
<line x1="610" y1="106" x2="610" y2="132" class="ln"/>
<g><rect x="93" y="138" width="13" height="13" rx="2" class="cell"/><rect x="108" y="138" width="13" height="13" rx="2" class="cell-hi"/><rect x="123" y="138" width="13" height="13" rx="2" class="cell"/><rect x="138" y="138" width="13" height="13" rx="2" class="cell"/><rect x="93" y="153" width="13" height="13" rx="2" class="cell-hi"/><rect x="108" y="153" width="13" height="13" rx="2" class="cell"/><rect x="123" y="153" width="13" height="13" rx="2" class="cell-hi"/><rect x="138" y="153" width="13" height="13" rx="2" class="cell"/><rect x="93" y="168" width="13" height="13" rx="2" class="cell"/><rect x="108" y="168" width="13" height="13" rx="2" class="cell-hi"/><rect x="123" y="168" width="13" height="13" rx="2" class="cell"/><rect x="138" y="168" width="13" height="13" rx="2" class="cell-hi"/><rect x="93" y="183" width="13" height="13" rx="2" class="cell"/><rect x="108" y="183" width="13" height="13" rx="2" class="cell"/><rect x="123" y="183" width="13" height="13" rx="2" class="cell-hi"/><rect x="138" y="183" width="13" height="13" rx="2" class="cell"/></g>
<g><rect x="337" y="138" width="13" height="13" rx="2" class="cell"/><rect x="352" y="138" width="13" height="13" rx="2" class="cell-hi"/><rect x="367" y="138" width="13" height="13" rx="2" class="cell"/><rect x="382" y="138" width="13" height="13" rx="2" class="cell"/><rect x="337" y="153" width="13" height="13" rx="2" class="cell-hi"/><rect x="352" y="153" width="13" height="13" rx="2" class="cell"/><rect x="367" y="153" width="13" height="13" rx="2" class="cell-hi"/><rect x="382" y="153" width="13" height="13" rx="2" class="cell"/><rect x="337" y="168" width="13" height="13" rx="2" class="cell"/><rect x="352" y="168" width="13" height="13" rx="2" class="cell-hi"/><rect x="367" y="168" width="13" height="13" rx="2" class="cell"/><rect x="382" y="168" width="13" height="13" rx="2" class="cell-hi"/><rect x="337" y="183" width="13" height="13" rx="2" class="cell"/><rect x="352" y="183" width="13" height="13" rx="2" class="cell"/><rect x="367" y="183" width="13" height="13" rx="2" class="cell-hi"/><rect x="382" y="183" width="13" height="13" rx="2" class="cell"/></g>
<g><rect x="581" y="138" width="13" height="13" rx="2" class="cell"/><rect x="596" y="138" width="13" height="13" rx="2" class="cell-hi"/><rect x="611" y="138" width="13" height="13" rx="2" class="cell"/><rect x="626" y="138" width="13" height="13" rx="2" class="cell"/><rect x="581" y="153" width="13" height="13" rx="2" class="cell-hi"/><rect x="596" y="153" width="13" height="13" rx="2" class="cell"/><rect x="611" y="153" width="13" height="13" rx="2" class="cell-hi"/><rect x="626" y="153" width="13" height="13" rx="2" class="cell"/><rect x="581" y="168" width="13" height="13" rx="2" class="cell"/><rect x="596" y="168" width="13" height="13" rx="2" class="cell-hi"/><rect x="611" y="168" width="13" height="13" rx="2" class="cell"/><rect x="626" y="168" width="13" height="13" rx="2" class="cell-hi"/><rect x="581" y="183" width="13" height="13" rx="2" class="cell"/><rect x="596" y="183" width="13" height="13" rx="2" class="cell"/><rect x="611" y="183" width="13" height="13" rx="2" class="cell-hi"/><rect x="626" y="183" width="13" height="13" rx="2" class="cell"/></g>
<line x1="122" y1="200" x2="122" y2="212" class="ln"/><line x1="366" y1="200" x2="366" y2="212" class="ln"/><line x1="610" y1="200" x2="610" y2="212" class="ln"/><line x1="122" y1="212" x2="610" y2="212" class="ln"/>
<text x="360" y="236" text-anchor="middle" class="t-accent" font-size="12">块内并行 · 喂饱 GPU 矩阵单元</text>
</svg>
<p class="kda-fig-cap">图：chunkwise 把逐 token 递推改写成按块的矩阵运算——块内并行喂饱 GPU，块与块之间递推交接状态 S。</p>
</div>

## 为什么是混合：速记本旁边，每三层留一间档案室

纯线性注意力有一个被反复验证的短板：精确回忆。问它「第 73 页第三个数字是几」这种需要逐字定位的问题，压缩过的记忆状态会露怯——办公桌再聪明，也不如直接回仓库翻原件。

KDA 的答案是混合架构：每 3 层 KDA 配 1 层全注意力（MLA，一种低秩压缩的全注意力变体），即 3:1 配比。KDA 层像随身的速记本，负责以恒定成本消化长上下文；MLA 层像定期回档案室核对原件，保住精确回忆的能力。为什么是 3:1 而不是 1:1？因为全注意力层是这个配比里最贵的成分，少一层就省一大截 KV cache；论文的实验结论是，四层里留一层，已经足够兜住精确回忆，再多就是浪费。按 Kimi Linear 论文的表述，这是首个在公平对比下全面超越全注意力的混合线性架构。

下面这个演示把 12 层的混合架构铺平给你看：一个 token 从第一层流到最后一层，经过 KDA 层时快速掠过，经过 MLA 层时会停顿、发光——那是它回档案室核对原件的瞬间。旁边的成本表同步记账：3:1 配比下全注意力层的开销是 33，换成纯全注意力是 96。点开任意一层，还能看到这一层在混合架构里的角色卡。

<div class="kda-demo" id="kda-demo-stack" data-demo="stack"><p class="kda-demo-fallback">此演示未能加载。它本该让一个 token 流过 12 层混合架构：KDA 层快速掠过、MLA 层停顿发光，旁边成本表记下 33 对 96 的差距，点击任意一层还能看它的角色卡——亲手验证 3:1 配比省在哪。你看到的是静态降级文案，交互脚本未生效。</p></div>

这里有一组必须标注出处的数字。在 Kimi Linear（48B 总参、3B 激活的开源模型，5.7T token 训练）上，3:1 配比带来的是：一百万上下文下 TPOT（每 token 生成耗时）比全注意力 MLA 快 6.3 倍；解码吞吐最高提升 6 倍；KV cache 用量最高降低 75%；RULER 128k 基准 84.3 分、3.98 倍加速。请注意口径：这些是 Kimi Linear 论文与官方开源仓的数字。K3 沿用了同一套架构家族，但 K3 这个体量（2.8T 参数、896 选 16 的 Stable LatentMoE）上的实测，要等 2026-07-27 前发布完整权重、随后技术报告披露。

顺带一提另一根支柱 AttnRes：如果说 KDA 管的是「序列长度」这条轴——怎么记住更长的上下文，AttnRes 管的就是「网络深度」这条轴——几十层网络之间怎么有效传递信息。两者正交，细节同样待技术报告，本文不展开。画成坐标轴是这样：

<div class="kda-fig">
<svg class="kda-fig-svg" viewBox="0 0 720 360" role="img" aria-label="双轴示意：KDA 主攻序列长度轴，AttnRes 主攻网络深度轴，K3 位于两轴交汇处">
<line x1="86" y1="300" x2="668" y2="300" class="ln"/><path d="M668 300 l-12 -5 v10 z" class="ln-fill"/>
<line x1="86" y1="300" x2="86" y2="34" class="ln"/><path d="M86 34 l-5 12 h10 z" class="ln-fill"/>
<text x="668" y="330" text-anchor="end" class="t-faint" font-size="12">序列长度</text>
<text x="86" y="20" text-anchor="middle" class="t-faint" font-size="12">网络深度</text>
<line x1="300" y1="300" x2="300" y2="307" class="ln"/><text x="300" y="323" text-anchor="middle" class="t-faint" font-size="10.5">128k</text>
<line x1="540" y1="300" x2="540" y2="307" class="ln"/><text x="540" y="323" text-anchor="middle" class="t-faint" font-size="10.5">1M</text>
<line x1="118" y1="258" x2="528" y2="258" class="arw-a"/><path d="M540 258 l-13 -6 v12 z" class="arw-a-fill"/>
<text x="318" y="283" text-anchor="middle" class="t-accent" font-size="12">KDA 主攻 · 恒定状态，逐通道门控</text>
<line x1="540" y1="244" x2="540" y2="92" class="arw-at"/><path d="M540 80 l-6 13 h12 z" class="arw-at-fill"/>
<text transform="translate(582 168) rotate(-90)" text-anchor="middle" class="t-accent" font-size="12">AttnRes 主攻 · 跨深度选择性取回</text>
<circle cx="540" cy="72" r="10" class="ring-gold"/><circle cx="540" cy="72" r="5" class="dot-gold"/>
<text x="522" y="62" text-anchor="end" class="t-gold" font-size="13">K3</text>
<text x="522" y="80" text-anchor="end" class="t-gold" font-size="10.5">2.8T 参数 × 1M 上下文</text>
</svg>
<p class="kda-fig-cap">图：KDA 沿序列长度轴主攻，AttnRes 沿网络深度轴主攻，K3 站在两轴交汇处（示意图，不按比例）。</p>
</div>

## 这对产品经理意味着什么

回到那张价格表，现在可以把它读完了。

「未命中输入 20 元、命中 2 元」的十倍差价，本质是 prefill（首次读入、建立缓存的那次全量计算）与缓存复用的差价。但 KDA 给传统的 prefix caching 出了道难题：全注意力的缓存是一串 KV 对，按前缀直接复用就行；KDA 的记忆是不断改写的状态矩阵，前缀怎么复用要重新设计。官方披露，Moonshot 已向 vLLM 社区贡献了「KDA with prefill cache」实现，并直言这是有竞争力定价的前提。换句话说：2 元那一档价格，是工程能力直接折算出来的。

两种缓存的差别，画出来更直观。下面这个演示左右对照：全注意力的 KV cache 像一盘磁带，相同前缀倒带就能复用；KDA 的记忆是一块不断改写的状态矩阵，前缀复用要专门设计 prefill cache 才行——角落里的 vLLM 徽章，标的就是 Moonshot 捐给社区的那笔实现。

<div class="kda-demo" id="kda-demo-prefix" data-demo="prefix"><p class="kda-demo-fallback">此演示未能加载。它本该对比两种前缀缓存：全注意力的 KV 磁带按前缀直接复用，KDA 的状态矩阵需要专门设计的 prefill cache（vLLM 徽章标注那笔社区贡献）——亲手验证 2 元档价格是怎么被工程折出来的。你看到的是静态降级文案，交互脚本未生效。</p></div>

<div class="kda-analogy">
<p class="kda-analogy-title">类比：复印店的模板价</p>
<p>复印店印传单：第一张收制版费，之后每张只收纸钱。Prefill 是制版费，命中缓存的输入是纸钱。</p>
<p>「KDA with prefill cache」解决的，是换了新机器之后模板还能不能接着用的问题——能，所以从第二张起，仍然只收纸钱。</p>
</div>

落到产品决策上，我看到三条。

一，prompt 稳定性就是钱。缓存命中按前缀计算：把稳定的系统提示、工具定义放在最前，把易变内容（用户输入、检索结果）放在最后，命中率才能最大化。一个常见反例：在 system prompt 开头带时间戳或随机 session id——在缓存眼里，这等于每次都换了一份新材料，前缀全废。这类细节以前只是工程洁癖，现在直接进成本报表。在官方口径编程负载 >90% 命中率的条件下，同样功能的输入成本可以差出一个数量级。下面这个演示让你亲手算这笔账。

<div class="kda-demo" id="kda-demo-bill" data-demo="bill"><p class="kda-demo-fallback">此演示未能加载。它本该让你调节 prompt 结构与缓存命中率，实时计算一笔百万 token 级调用的账单：命中率从 0 拉到 90% 以上，看输入成本如何从 20 元档掉到 2 元档，以及输出为什么永远是大头。你看到的是静态降级文案，交互脚本未生效。</p></div>

二，长上下文功能迎来从 demo 到产品的拐点。以往「把整个代码仓、全年财报一次性塞进去」的功能，死在单位经济上：每个请求 20 元乘以高频调用，账算不过来。缓存命中压到 2 元档之后，这类功能第一次有了可持续的成本模型。比如代码库问答：整仓 prefill 一次、缓存驻留，之后每个工程师的每次提问只付 2 元档的输入钱——这在旧价格结构下是亏本功能，在新结构下可以作为标配能力长期开着。

三，输出 100 元每百万 token，是命中输入的 50 倍。产品设计要抠输出：结构化、简洁、能不生成就不生成。很多「让模型多说点」的体验设计，在这张价格表下都是真金白银。

## 一图收个尾

写到这，三种记忆策略的取舍可以收成一张图。

<div class="kda-fig">
<svg class="kda-fig-svg" viewBox="0 0 720 300" role="img" aria-label="三种记忆策略对照：全注意力、朴素线性、KDA">
<rect x="16" y="14" width="216" height="272" rx="12" class="box"/>
<rect x="252" y="14" width="216" height="272" rx="12" class="box"/>
<rect x="488" y="14" width="216" height="272" rx="12" class="box"/>
<text x="124" y="46" text-anchor="middle" class="t-accent" font-size="13">全注意力</text>
<text x="360" y="46" text-anchor="middle" class="t-accent" font-size="13">朴素线性</text>
<text x="596" y="46" text-anchor="middle" class="t-accent" font-size="13">KDA</text>
<line x1="94" y1="58" x2="154" y2="58" class="ln"/><line x1="330" y1="58" x2="390" y2="58" class="ln"/><line x1="566" y1="58" x2="626" y2="58" class="ln"/>
<line x1="40" y1="188" x2="208" y2="188" class="ln"/>
<rect x="48" y="173" width="32" height="15" class="arch"/>
<rect x="96" y="173" width="32" height="15" class="arch"/><rect x="96" y="158" width="32" height="15" class="arch"/>
<rect x="144" y="173" width="32" height="15" class="arch"/><rect x="144" y="158" width="32" height="15" class="arch"/><rect x="144" y="143" width="32" height="15" class="arch"/><rect x="144" y="128" width="32" height="15" class="arch"/>
<line x1="52" y1="118" x2="168" y2="70" class="arw-gold"/><path d="M176 66 l-13 -1 l5 12 z" class="arw-gold-fill"/>
<text x="182" y="60" class="t-gold" font-size="10">成本</text>
<rect x="296" y="150" width="128" height="10" rx="2" class="desk"/>
<rect x="341" y="141" width="38" height="5" class="paper" transform="rotate(-2 360 143)"/>
<rect x="345" y="132" width="38" height="5" class="paper" transform="rotate(3 360 134)"/>
<rect x="337" y="123" width="38" height="5" class="paper" transform="rotate(-4 360 125)"/>
<rect x="347" y="114" width="38" height="5" class="paper" transform="rotate(2 360 116)"/>
<rect x="333" y="105" width="38" height="5" class="paper" transform="rotate(-6 360 107)"/>
<rect x="349" y="96" width="38" height="5" class="paper" transform="rotate(5 360 98)"/>
<rect x="329" y="87" width="38" height="5" class="paper" transform="rotate(-8 360 89)"/>
<line x1="300" y1="184" x2="420" y2="184" class="arw-a" stroke-dasharray="4 4"/>
<rect x="532" y="150" width="128" height="10" rx="2" class="desk"/>
<rect x="532" y="150" width="32" height="10" class="zone" fill="var(--accent)" fill-opacity="0.18"/>
<rect x="564" y="150" width="32" height="10" class="zone" fill="var(--accent)" fill-opacity="0.32"/>
<rect x="596" y="150" width="32" height="10" class="zone" fill="var(--accent)" fill-opacity="0.46"/>
<rect x="628" y="150" width="32" height="10" class="zone" fill="var(--accent)" fill-opacity="0.60"/>
<rect x="577" y="141" width="38" height="5" class="paper" transform="rotate(-2 596 143)"/>
<rect x="581" y="132" width="34" height="5" class="paper" transform="rotate(2 596 134)"/>
<rect x="579" y="123" width="34" height="5" class="paper"/>
<rect x="572" y="100" width="40" height="5" class="paper"/>
<line x1="570" y1="102.5" x2="614" y2="102.5" class="strike"/>
<rect x="618" y="100" width="18" height="5" class="paper-hi"/>
<rect x="536" y="176" width="28" height="5" class="tok"/><rect x="568" y="176" width="28" height="5" class="tok"/><rect x="600" y="176" width="28" height="5" class="tok"/>
<rect x="632" y="173" width="28" height="11" class="paper-hi"/>
<text x="596" y="202" text-anchor="middle" class="t-faint" font-size="10">KDA ×3 + MLA ×1</text>
<text x="124" y="224" text-anchor="middle" class="t-sub" font-size="11.5">不断扩建的档案仓库</text>
<text x="124" y="248" text-anchor="middle" class="t-sub" font-size="11.5">什么都在 · 越来越贵</text>
<text x="360" y="224" text-anchor="middle" class="t-sub" font-size="11.5">只加不擦的桌面</text>
<text x="360" y="248" text-anchor="middle" class="t-sub" font-size="11.5">成本恒定 · 很快被淹没</text>
<text x="596" y="224" text-anchor="middle" class="t-sub" font-size="11.5">恒定成本 · 精确覆写 · 细粒度遗忘</text>
<text x="596" y="248" text-anchor="middle" class="t-sub" font-size="11.5">再加每三层一间档案室兜底</text>
</svg>
<p class="kda-fig-cap">图：三种记忆策略对照——仓库什么都有但越盖越贵，桌面成本恒定但会被淹没，KDA 用勘误和多温区守住桌面，再留一间档案室。</p>
</div>

## 事实边界

诚实声明：本文写于 K3 发布次日（2026-07-17），以下事实分层请读者留意。

<div class="kda-fact-note">
<p><strong>官方自报口径</strong>：K3 的 2.8T 参数、1M 上下文、2.5× scaling efficiency、三档价格、编程负载 >90% 缓存命中率，均来自 Moonshot 官方博客与平台文档。</p>
<p><strong>论文数字，勿当 K3 实测</strong>：6.3× TPOT 加速、最高 6× 解码吞吐、最高 -75% KV cache、3:1 配比，来自 Kimi Linear（48B-A3B）论文与官方开源仓。K3 沿用该架构，但 K3 级别的实测数据待技术报告——完整权重将于 2026-07-27 前发布，报告随后。</p>
<p><strong>第三方解读</strong>：delta 规则与逐通道门控的机理讲解，部分参考第三方深度解析（见参考来源末条）；文中公式为简化表述，以论文为准。若技术报告披露后与本文有出入，以官方为准，我会回来修订。</p>
</div>

## 参考来源

- Kimi K3 官方博客 — https://www.kimi.com/blog/kimi-k3
- Kimi K3 快速上手指南（官方平台文档）— https://platform.moonshot.ai/docs/guide/kimi-k3-quickstart
- Kimi Linear 论文 — https://arxiv.org/abs/2510.26692
- Kimi Linear 官方开源仓 — https://github.com/MoonshotAI/Kimi-Linear
- Kimi Linear-48B-A3B-Instruct 模型卡 — https://huggingface.co/moonshotai/Kimi-Linear-48B-A3B-Instruct
- Kimi K3 架构与基础设施深度解析（第三方深度解析）— https://shivam2003.com/posts/kimi-k3-architecture-and-infrastructure.html

<style>
.kda-analogy {
  margin: 1.75rem 0;
  padding: 1.25rem 1.5rem;
  background: linear-gradient(160deg, rgba(56,88,180,0.30), rgba(22,38,96,0.34));
  backdrop-filter: blur(22px) saturate(185%);
  -webkit-backdrop-filter: blur(22px) saturate(185%);
  border: 1px solid rgba(190,210,255,0.16);
  border-radius: var(--r-card);
  box-shadow: inset 0 1px 0 rgba(180,204,255,0.22), 0 20px 60px rgba(2,8,28,0.40);
}
.kda-analogy-title {
  margin: 0 0 0.5rem;
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--accent-text);
}
.kda-analogy p {
  margin: 0;
  color: var(--text-sub);
  line-height: 1.8;
}
.kda-analogy p + p {
  margin-top: 0.5rem;
}
.kda-demo {
  margin: 1.75rem 0;
  padding: 1.5rem;
  background: linear-gradient(160deg, rgba(56,88,180,0.30), rgba(22,38,96,0.34));
  backdrop-filter: blur(22px) saturate(185%);
  -webkit-backdrop-filter: blur(22px) saturate(185%);
  border: 1px solid rgba(190,210,255,0.16);
  border-radius: var(--r-card);
  box-shadow: inset 0 1px 0 rgba(180,204,255,0.22), 0 20px 60px rgba(2,8,28,0.40);
  color: var(--text-sub);
  overflow: hidden;
  max-width: 100%;
}
.kda-demo-fallback {
  margin: 0;
  padding: 1rem 1.25rem;
  font-family: var(--font-mono);
  font-size: 0.82rem;
  line-height: 1.7;
  color: var(--text-faint);
  border: 1px dashed var(--line);
  border-radius: 12px;
}
.kda-fact-note {
  margin: 1.75rem 0;
  padding: 1.25rem 1.5rem;
  background: var(--surface-card);
  border: 1px solid var(--line);
  border-radius: var(--r-card);
  color: var(--text-sub);
  line-height: 1.8;
}
.kda-fact-note p {
  margin: 0;
}
.kda-fact-note p + p {
  margin-top: 0.75rem;
}
.kda-fact-note strong {
  color: var(--ink-2);
  font-weight: 600;
}
@media (prefers-reduced-motion: no-preference) {
  .kda-analogy,
  .kda-demo {
    transition: border-color 0.35s var(--ease-liquid), box-shadow 0.35s var(--ease-liquid);
  }
  .kda-analogy:hover,
  .kda-demo:hover {
    border-color: rgba(190,210,255,0.30);
  }
}
.kda-fig {
  margin: 1.75rem auto;
  max-width: 720px;
  width: 100%;
}
.kda-fig-svg {
  display: block;
  width: 100%;
  height: auto;
}
.kda-fig-svg text {
  font-family: var(--font-mono);
}
.kda-fig-svg .t-accent { fill: var(--accent-text); }
.kda-fig-svg .t-gold { fill: var(--gold); }
.kda-fig-svg .t-sub { fill: var(--text-sub); }
.kda-fig-svg .t-faint { fill: var(--text-faint); }
.kda-fig-svg .ln { stroke: var(--line); stroke-width: 1; fill: none; }
.kda-fig-svg .ln-fill { fill: var(--line); }
.kda-fig-svg .arw-a { stroke: var(--accent); stroke-width: 1.6; fill: none; }
.kda-fig-svg .arw-a-fill { fill: var(--accent); }
.kda-fig-svg .arw-at { stroke: var(--accent-text); stroke-width: 1.6; fill: none; }
.kda-fig-svg .arw-at-fill { fill: var(--accent-text); }
.kda-fig-svg .arw-gold { stroke: var(--gold); stroke-width: 1.2; fill: none; stroke-dasharray: 4 4; }
.kda-fig-svg .arw-gold-fill { fill: var(--gold); }
.kda-fig-svg .box { fill: var(--accent); fill-opacity: 0.08; stroke: var(--line); }
.kda-fig-svg .tok { fill: var(--accent); fill-opacity: 0.35; }
.kda-fig-svg .cell { fill: var(--accent); fill-opacity: 0.22; }
.kda-fig-svg .cell-hi { fill: var(--accent); fill-opacity: 0.55; }
.kda-fig-svg .paper { fill: var(--accent); fill-opacity: 0.32; }
.kda-fig-svg .paper-hi { fill: var(--accent-text); fill-opacity: 0.85; }
.kda-fig-svg .arch { fill: var(--accent); fill-opacity: 0.12; stroke: var(--text-sub); stroke-width: 0.8; }
.kda-fig-svg .desk { fill: var(--text-sub); fill-opacity: 0.22; stroke: var(--line); }
.kda-fig-svg .zone { stroke: var(--line); stroke-width: 0.6; }
.kda-fig-svg .state { fill: var(--accent); fill-opacity: 0.18; stroke: var(--accent); }
.kda-fig-svg .strike { stroke: var(--accent-text); stroke-width: 1.2; }
.kda-fig-svg .dot-gold { fill: var(--gold); }
.kda-fig-svg .ring-gold { fill: none; stroke: var(--gold); stroke-opacity: 0.5; }
.kda-fig-cap {
  margin: 0.6rem 0 0;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  line-height: 1.6;
  color: var(--text-faint);
  letter-spacing: 0.02em;
}
</style>

<link rel="stylesheet" href="/blog-assets/kda/demos.css">
<script type="module" src="/blog-assets/kda/demos.js"></script>
<link rel="stylesheet" href="/blog-assets/kda/mech-attn.css">
<link rel="stylesheet" href="/blog-assets/kda/mech-arch.css">
<script type="module" src="/blog-assets/kda/mech-attn.js"></script>
<script type="module" src="/blog-assets/kda/mech-arch.js"></script>

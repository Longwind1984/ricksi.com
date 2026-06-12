---
title: 拓展：无 Tokenizer 路线
cluster: 基础知识库
created: '2026-03-24'
updated: '2026-05-16'
provenance: co
---

## 为什么要干掉 Tokenizer：问题的本质

前面讲 BPE 时已经触及核心矛盾：tokenizer 是<mark style="background: #FFF3A3A6;">整个 LLM 管线中**唯一不可训练的启发式组件**</mark>。模型从输入到输出几乎全部端到端学习，唯独文本的离散化切分这一步，是在训练之前用统计压缩算法硬编码的。这造成了几个结构性缺陷——多语言成本不对称、字符级盲区、词表锁定不可逆——这些你已经了解。

无 Tokenizer 路线要解决的核心工程难题只有一个：**序列长度爆炸**。一段英文文本如果用 BPE 编码是 1000 个 token，换成原始字节大约是 4000-5000 个字节。Transformer 的注意力计算是 O(N2)O(N^2) O(N2)，序列长度翻 4-5 倍意味着<mark style="background: #FFB86CA6;">注意力计算量翻 16-25 倍</mark>。直接在字节上跑标准 Transformer，算力账完全算不过来。

所有最新进展本质上都在回答同一个问题：**如何在保留字节粒度信息的同时，把喂给主干 Transformer 的序列长度压回去？**

---

## 两条技术路线的分化

目前形成了两条清晰的路线。

### 路线一：动态分组（Patch-based），代表作 Meta BLT

Meta 的 Byte Latent Transformer (BLT) 是第一个在规模化实验中证明无 tokenizer 架构能追平 BPE 模型性能的工作，在 8B 参数、4T 训练字节的规模上完成了验证。 [arXiv](https://arxiv.org/html/2412.09871v1)

BLT 的架构是三段式的：

**Local Encoder**（轻量字节编码器）：每个原始字节先获得一个 embedding，然后通过几层窗口注意力做局部上下文编码。关键步骤是**将字节序列动态分组为 patch**，输出压缩后的 patch 表征序列。

**Global Latent Transformer**（主干大模型）：接收 patch 序列做全局注意力计算。这是算力消耗的主体。因为 patch 序列远短于原始字节序列，主干模型的计算量被大幅压缩。

**Local Decoder**（字节解码器）：将 patch 表征还原为字节级输出。

核心创新在于**分组策略**。BLT 不用固定长度分组，而是基于下一字节预测的信息熵来决定 patch 边界——高熵位置（模型不确定下一个字节是什么）开启新 patch，低熵区间（比如一个常见单词的后半段，几乎可以确定）合并为一个 patch。 [arXiv](https://arxiv.org/html/2412.09871v1)这意味着模型在需要更多计算的地方自动分配更多算力，在可预测的地方节省算力。

== 本质是 根据信息熵<mark style="background: #FFF3A3A6;">动态 Tokenization</mark>

性能数据上，在同等训练算力控制下，BLT 追平了 Llama 3 的性能，同时在推理阶段可节省高达 50% 的 FLOPs。 [VentureBeat](https://venturebeat.com/ai/metas-new-blt-architecture-replaces-tokens-to-make-llms-more-efficient-and-versatile)

### 路线二：层次化编码器-解码器（Hierarchical），代表作 Aleph Alpha T-Free HAT

Aleph Alpha 的 T-Free 系列采用层次化自回归 Transformer（HAT）架构，用轻量级字符编码器将字符序列转换为词级 embedding，由词级主干模型处理后再通过解码器还原为字符。 [arXiv](https://arxiv.org/html/2603.15953)

与 BLT 的区别在于：HAT 的分组不是基于信息熵动态决定，而是基于 Unicode 标准 UAX #29 的词边界规则进行切分，同时将前导空格和尾随标点合并到词中以缩短序列长度。 [Hugging Face](https://huggingface.co/Aleph-Alpha/llama-tfree-hat-pretrained-7b-dpo)这个方案更保守、更可预测，但对中日韩等不以空格分词的语言需要额外适配。

他们已经将这个架构扩展到 70B 参数规模，基于 Llama 3.1 70B 的主干权重做改造，在多数下游任务上超过了原始 Llama 3.1。 [arXiv](https://arxiv.org/html/2603.15953)这是目前无 Tokenizer 路线达到的最大模型规模。

---

## 关键突破：Byteification（字节化改造）

过去一年最重要的工程范式转变不是"从头训一个字节模型"，而是**把已有的 BPE 模型改造成字节模型**。

AI2 的 Bolmo 是这条路线的标杆。它不从零开始训练，而是"byteify"已有的 OLMo 3 模型——保留主干 Transformer 权重，替换输入输出层为字节级编码器和解码器，通过一个相对短的追加训练过程完成改造。 [Allen AI](https://allenai.org/blog/bolmo)

训练分两个阶段：

**Stage 1（蒸馏阶段）**：冻结主干 Transformer，只训练新增的字节编码器、解码器和边界预测器，让它们学会模仿原始 BPE 模型的行为。这个阶段只用了约 98 亿 token。 [WinBuzzer](https://winbuzzer.com/2025/12/16/ai2s-new-bolmo-byteified-language-model-was-trained-at-1-of-the-typical-cost-xcxwbn/)

**Stage 2（端到端微调）**：解冻全部参数，让主干模型适应更丰富的字节级信息。用了约 393 亿 token。整个过程的计算开销不到典型预训练预算的 1%。 [Datocms-assets](https://www.datocms-assets.com/64837/1765814974-bolmo.pdf)

这个成本数字是关键的。它意味着 byteification 不是一个需要从零投入的巨额赌注，而是一个可以在现有模型投资基础上低成本叠加的能力升级。

Bolmo 还有一个很有意思的特性：因为主干 Transformer 权重与原始 OLMo 3 保持对齐，可以通过 task arithmetic（任务算术）——直接把原始模型 base 版与 post-trained 版的权重差值加到 Bolmo 上——零成本迁移指令遵循能力。 [Allen AI](https://allenai.org/blog/bolmo)在 IFEval 基准上，Bolmo 通过这种方式从 31.1% 跳到 67.4%，基本追平了原始 post-trained 模型的 66%。<mark style="background: #FFB86CA6;">这意味着**后训练生态可以复用**，不需要为字节模型重建整个 alignment 管线。</mark>

性能方面：蒸馏得到的字节模型保留了源模型 90% 以上的性能，在 MMLU 级别基准上典型下降 2-3 个百分点。 [Emergent Mind](https://www.emergentmind.com/topics/byte-language-models-blms)Bolmo 7B 在 STEM 任务上比 Meta 的 BLT 7B 高出 16.5%。 [WinBuzzer](https://winbuzzer.com/2025/12/16/ai2s-new-bolmo-byteified-language-model-was-trained-at-1-of-the-typical-cost-xcxwbn/)在字符理解任务上优势更明显——Bolmo 7B 在 CUTE 基准上达到 78.6%，大幅超过 BPE 模型。 [Emergent Mind](https://www.emergentmind.com/topics/byte-language-models-blms)

---

## BPE 侧的反击：不是躺平等死

值得注意的是，BPE 阵营也没闲着。BoundlessBPE（COLM 2025）放宽了预分词边界约束，允许跨词合并，字节压缩率提升约 15%。LiteToken（2026 年 2 月）识别并清除 BPE 训练过程中产生的"中间合并残留" token——这些 token 在训练时高频出现但在最终分词结果中几乎不被使用，白白浪费词表槽位。 [Let's Data Science](https://www.letsdatascience.com/blog/tokenization-deep-dive-why-it-matters-more-than-you-think)

此外，动态分词也在获得关注。ACL 2025 的工作实现了可在训练后调整的灵活分词策略，通过自适应选择粒度来减少推理 FLOPs。 [Let's Data Science](https://www.letsdatascience.com/blog/tokenization-deep-dive-why-it-matters-more-than-you-think)

---

## 当前的硬约束与未攻克的问题

**推理速度**：这是字节模型目前最大的短板。Bolmo 的解码速度大约 125 bytes/s，而同级别 BPE 模型约 150 bytes/s。 [Medium](https://abvcreative.medium.com/byte-level-for-pocket-change-how-bolmo-byteifies-a-subword-llm-without-rebuilding-the-universe-ffa6a2cdc971)主要瓶颈在 Local Decoder 的逐 patch 解码开销，以及 BPE 模型已经有高度优化的推理 kernel，字节模型的推理基础设施还远未成熟。

**KV Cache 管理的复杂度**：HAT 架构需要同时维护字节级和词级两套 KV Cache，且两者的映射关系是不均匀的（一个词可能包含很多字节），内存分配和协调都更复杂。 [arXiv](https://arxiv.org/html/2603.15953)现有的 vLLM/PagedAttention 等推理优化框架对这种双序列架构的支持还在早期阶段。

**规模验证不足**：目前最大的端到端验证停在 8B（BLT）和 70B（T-Free HAT，但是基于改造而非从头训练）。还没有人在 100B+ 规模上从零训练过字节模型。是否能保持 scaling law 的趋势，还有不确定性。

**复杂推理任务**：字节模型在字符理解、抗噪声、多语言方面优势明显，但在需要深度逻辑推理的任务上，与同等算力的 BPE 模型相比还有 2-3 个点的差距。BLT 的 patch 机制本质上是一种信息压缩，在极端知识密集型任务中可能存在压缩损失。

---

## 对你的产品视角的几个推论

**第一，短期内（1-2 年），BPE 仍是生产环境的默认选择。** 字节模型的推理基础设施不成熟、成本没有明确优势、生态工具链（prompt engineering 工具、评估框架）都是围绕 token 设计的。你做求职准备和面试时，BPE 范式下的知识（token 成本估算、context window 管理、tokenizer 选型）仍然是硬通货。

**第二，byteification 路线值得关注的战略含义**：它让字节模型从"另起炉灶"变成了"存量升级"，这意味着一旦推理优化跟上来，现有模型生态可以低成本迁移。对于关注中国 AI 应用层的你来说，需要注意的是——如果字节模型成熟，**多语言 API 定价的不对称性会被消除**，这会直接改变出海产品的成本结构和竞争格局。

**第三，面试中可以用的一个洞察点**：如果面试官问"如何降低非英语市场的 API 成本"，大多数候选人会回答"选多语言词表更大的模型"或"优化 prompt 语言"。你可以多走一步，提到字节模型路线作为中期解法的可能性，并说明 byteification 让这个转换的沉没成本变得可控。这展示的是你对技术演进方向的判断力，而不仅仅是当下工具箱的熟练度。

要继续深入某个具体方向（比如 entropy-based patching 的数学细节，或者字节模型对 RAG pipeline 的影响），还是切到知识图谱的其他模块？

# 中文的问题

两种路线：<mark style="background: #FFB86CA6;">Meta 的 BLT 动态 patching，从信息论的角度对中文天然更友好</mark>

而 HAT 层次化编码解码器（保守方案），需要对中文做更多适配。否则相较于英文仍然劣势。英文可以直接到 词级 embedding，中文只能到字级。


--- 
# Archive

截至 2026 年初，无 tokenizer 方向已从<mark style="background: #FFF3A3A6;">"学术可行"进入"工程验证"阶段</mark>，但离主流生产部署仍有距离。以下是最新进展的完整图景。

## 已验证的里程碑（截至2025年底）

**BLT（Meta FAIR）** 是目前影响力最大的成果，在约 1 万亿字节的训练规模下，首次让无 tokenizer 架构在 benchmark 上与 LLaMA 3 持平，并实现最高 **50% 的推理成本下降** 。其核心创新是熵驱动的动态 patch：高熵区域（复杂推理、代码、低频词）分配更多计算，低熵区域（连续空格、重复模式）快速压缩跳过，相当于自适应地模拟了 BPE 的压缩效率，但无需固定词表 。

**EvaByte（港大，2025年1月）** 则在数据效率上突破了更大的心理关口：<mark style="background: #ADCCFFA6;">6.5B 参数下，仅用 **1.5T 字节**（远少于同级 BPE 模型的训练量）就达到同等性能，解码速度快 2 倍 。这直接反驳了"字节级模型必然低效"的传统认知——原因在于字节级处理天然去除了 tokenizer 层的冗余，每个字节都是真实信号。</mark>

- 去除中间层反而带来训练效率的优化

**ByteSampler（2025年6月）** 则走了一条折中路线：不重新训练，而是在**推理时**从任意现有 token LLM 里导出字节级概率分布 ，让存量模型获得一定程度的字节级鲁棒性。这对不愿重训大模型的工程团队有实际价值。[](https://www.emergentmind.com/topics/byte-language-models-blms)


​

## 仍未解决的工程障碍

进展虽然真实，但以下挑战在2026年初仍然存在：

### **序列长度爆炸**
同等内容用字节表示比 token 表示长 3–5 倍，即使 BLT 的动态 patch 能压缩，全局 transformer 处理的序列仍比 BPE 模型长，注意力计算是平方复杂度，推理延迟上限难以消除

### **训练基础设施不兼容**
现有 GPU 集群、CUDA 算子库、框架（vLLM/TGI）全部针对固定词表 token 优化，字节级模型几乎需要重写推理栈

### **缺乏生产验证**
BLT 和 EvaByte 均未进入任何已知的商业 API 服务，所有数据来自研究环境。相比之下，Qwen、[DeepSeek](/kb/ai-公司与产品/deepseek/) 等已有亿级用户压力测试

### **长文本推理退化**
字节级模型在超长上下文（>32K 字节）下的注意力分散问题更严重，目前尚无完整解法


## 2026年的现实判断

|维度|当前状态|
|---|---|
|学术可行性|✅ 已充分证明，BLT / EvaByte 均达到同级 BPE 模型水平|
|多语言公平性|✅ 理论上彻底解决，字节无语言偏见|
|推理成本|⚠️ 动态 patch 下有改善，但全场景未必优于 BPE|
|生产部署|❌ 尚无主流云厂商上线|
|存量模型迁移|⚠️ Bolmo 路线可行但精度有损失|

当前最合理的预判是：拓展：无 Tokenizer 路线会先在<mark style="background: #FFF3A3A6;">多语言、低资源语言、多模态</mark>这三个 BPE 弊端最突出的场景里率先落地**，而不是直接替代主流英文 LLM 的 BPE 方案 。对于面向东南亚、南亚、非洲市场的多语言产品，这个方向值得纳入 2026–2027 年的技术路线图观察窗口。[](https://huggingface.co/blog/omarkamali/tokenization)​

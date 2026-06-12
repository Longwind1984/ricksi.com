---
title: R01 测多语言 Tokenization 效率
cluster: 专题 · 人文社科透镜
created: '2026-06-07'
updated: '2026-06-12'
provenance: ai
facet: 计算语言学
---

# R01 测多语言 Tokenization 效率

**问题**：你要为一个跨七国、十几种语言的产品做 LLM 选型与成本预算。你打开供应商的定价页，看到「$5 / 百万 token」，于是把它乘以预估流量，写进 BP。这个数字错了——错得可能高达 4 倍，而错误的方向恰好惩罚你最想服务的市场（拉美、东南亚、撒哈拉以南非洲的本地语言用户）。本节点不讲理论，讲**手艺**：给一段你今天就能跑的脚本骨架，让你用平行语料量出「同一句话在不同语言、不同 tokenizer 下到底吃掉多少 token、花多少钱」，把抽象的「token 溢价」变成你 BP 里一行可辩护的数字。本节的框架是**实证测量优先于直觉**——在 tokenizer 这件事上，没有一个工程师的直觉是可靠的，包括你自己的。

> [!warning] 升级对照（不复述）
> 本节点是 [c02 - Tokenization 与词表工程](/kb/基础知识库/c02-tokenization-与词表工程/) 的**操作化下游**。c02 已经讲透了 BPE/BBPE 机制、词表大小演化、三重产品影响（成本/窗口/语言不平等）、产品选型锁定风险——那些**事实基础本节点不复述**。c02 回答「为什么会有 token 溢价」；R01 回答「**你怎么亲手量出你自己产品里的那个溢价**」。如果你还没建立「tokenizer 不中立」的认知，先读 c02 再回来动手。

---

## §0 为什么是「平行语料 + fertility」这个框架，而不是「数数英文 demo」

99% 的工程师评估 tokenizer 的方式是：拿一段英文 README，扔进 `tiktoken`，看 token 数。这是**结构性偏误的源头**——你用英语（tokenizer 词表的母语）评估了一个本质上歧视非英语的系统，然后得出「还好嘛」的结论。

要测出真相，框架必须满足三个约束：

1. **平行语料（parallel corpus）**：同一语义内容的多语言对照译文，控制「意思相同」这个变量。学术界的标准是 **FLORES-200**（Meta 的 200 语言平行评测集，源自 EMNLP/NeurIPS 多篇论文使用），或 Tatoeba、Bible 平行语料。绝不能用各语言「各写各的」文本——那测的是文体差异，不是 tokenizer 差异。
2. **正确的度量单位**：业界主流指标是 **fertility（生育率）= tokens / 词** 或 **tokens / 字符**。但要警惕：fertility 高不一定坏（见 §4 争议）。更稳的做法是**直接报「相对英语的 token 数比值」**，即 token premium，因为它直接换算成钱和上下文占用。
3. **多 tokenizer 横评**：同一句话喂给 GPT（`o200k_base`/`cl100k_base`）、Claude、Llama-3、Qwen、DeepSeek、Gemini 的 tokenizer，差异可达数倍。只测一家 = 只看到一家的偏见。

为什么不直接信供应商的「平均 token」官方数字？因为**没有「平均 token」这种东西**——token 数是输入文本的函数，而你的输入分布（哪些语言、什么文体）只有你自己知道。供应商的基准几乎都是英语技术文本，与你拉美 WhatsApp 客服对话的 token 分布毫无关系。

---

## §1 最小可运行骨架（5 分钟，纯本地，零成本）

目标：拿一句话，量出它在多个 tokenizer 下的 token 数。这是整个测量体系的细胞。

```python
# requirements: pip install tiktoken transformers sentencepiece
import tiktoken
from transformers import AutoTokenizer

# 一句同义内容，多语言平行版本（手工对齐或取自 FLORES-200）
SENTENCES = {
    "en": "Artificial intelligence is reshaping the world's information infrastructure.",
    "zh": "人工智能正在重塑全球的信息基础设施。",
    "pt": "A inteligência artificial está remodelando a infraestrutura de informação do mundo.",
    "es": "La inteligencia artificial está remodelando la infraestructura de información del mundo.",
    "hi": "कृत्रिम बुद्धिमत्ता दुनिया के सूचना बुनियादी ढांचे को नया रूप दे रही है।",
}

# 各家 tokenizer（HF id 需按当时实际可用模型替换/申请权限）
TOKENIZERS = {
    "gpt-4o (o200k_base)":  ("tiktoken", "o200k_base"),
    "gpt-3.5 (cl100k_base)":("tiktoken", "cl100k_base"),
    "Llama-3":              ("hf", "meta-llama/Meta-Llama-3-8B"),
    "Qwen2.5":             ("hf", "Qwen/Qwen2.5-7B"),
    "DeepSeek-V3":         ("hf", "deepseek-ai/DeepSeek-V3"),
}

def load(kind, name):
    if kind == "tiktoken":
        return tiktoken.get_encoding(name)
    return AutoTokenizer.from_pretrained(name)  # 首次会联网下载

def count(tok, kind, text):
    if kind == "tiktoken":
        return len(tok.encode(text))
    return len(tok.encode(text, add_special_tokens=False))

for tname, (kind, name) in TOKENIZERS.items():
    try:
        tok = load(kind, name)
    except Exception as e:
        print(f"[skip] {tname}: {e}"); continue
    print(f"\n= {tname} =")
    base = count(tok, kind, SENTENCES["en"])  # 以英语为 1.0×
    for lang, text in SENTENCES.items():
        n = count(tok, kind, text)
        print(f"  {lang}: {n:>4} tokens   premium={n/base:.2f}×")
```

> [!note] 关键工程细节（这里坑最多）
> - **`add_special_tokens=False`**：不关掉它，HF tokenizer 会偷偷加 `<bos>`/`<eos>`，把短句的相对差异污染掉。
> - **Claude 没有公开离线 tokenizer**：Anthropic 不发布 `tiktoken` 等价物。要量 [Claude](/kb/ai-公司与产品/claude/) 的真实 token，得调它的 token-counting API（`count_tokens`），或用官方 SDK 的计数端点——这本身就是一个产品信号：**你无法在本地审计 Claude 的 token 经济性**。
> - **`o200k_base` ≈ GPT-4o / o 系列**，`cl100k_base` ≈ GPT-3.5/GPT-4。版本对不上，数字就不可比。
> - 中文例句实测对照（来源：TechFlow 2026 实测，[techflowpost.com 文章](https://www.techflowpost.com/en-US/article/31420)）：「人工智能正在重塑全球的信息基础设施」16 个汉字，GPT-4 tokenizer 约 **19 tokens**，Qwen tokenizer 约 **6 tokens**，差 **3.2×**。你的脚本应该能复现这个量级——如果复现不出来，先怀疑你的 tokenizer 版本，再怀疑数据。

---

## §2 中型版：平行语料批量跑 + 成本换算（半小时，可写进 BP）

最小版只够 sanity check。要得出「可辩护的预算数字」，必须：批量跑整个平行语料（消除单句噪声）、按真实计费换算、输出可贴进 PPT 的表。

```python
# 在 §1 基础上扩展
from datasets import load_dataset  # pip install datasets
import statistics

# FLORES-200：facebook/flores 仓库，config "all" 取全部语言的对齐句子
# 语言用「ISO639-3_脚本」码，如 eng_Latn / zho_Hans / por_Latn / spa_Latn / hin_Deva
# flores = load_dataset("facebook/flores", "all")  # split: dev / devtest（test 隐藏）

# 计费表：$/百万 input token，按你签约的实际价格填（这里为占位示意）
PRICE_PER_M = {
    "gpt-4o (o200k_base)": 2.50,    # 〔填你的实际合同价〕
    "gpt-3.5 (cl100k_base)": 0.50,
    # Claude / Gemini 等用各自 API 计数后填
}

def profile_language(tok, kind, sentences):
    """对一个语言的整批句子，返回 token 数列表"""
    return [count(tok, kind, s) for s in sentences]

# 伪流程：对每个 tokenizer × 每个语言，跑全量句子，取均值/中位数/p95
# 然后：月度成本 = 月请求数 × 平均输入token数 × (单价 / 1e6)
#       高溢价语言的成本 = 英语成本 × 该语言 premium
def monthly_cost(premium, tokens_en_avg, monthly_requests, price_per_m):
    tokens_lang_avg = tokens_en_avg * premium
    return monthly_requests * tokens_lang_avg * (price_per_m / 1_000_000)
```

**输出应该长这样**（行业实测量级，非你的真实数据，跑完替换）：

| 语言 | GPT-4o premium | Qwen premium | 含义（PM 读法） |
|---|---|---|---|
| 英语 (en) | 1.00× | 1.00× | 基准 |
| 西班牙语 (es) | ~1.3–1.6× | ~1.3× | 拉美主力语，比英语贵 30–60% |
| 葡萄牙语 (pt-BR) | ~1.5× | ~1.4× | 巴西 99 主力，贵约 50%（CPF实名验证 场景文本） |
| 中文 (zh) | ~1.3×（o200k）；旧版更高 | **<1.0×** | Qwen/DeepSeek 上中文可能比英语**还省** |
| 印地语 (hi) | ~7.5×（GPT-2/3）| 视词表 | 来源：Churchill & Skiena 2026 |

> [!important] 把这两件事钉进你的 BP
> 1. **成本不是单价，是「单价 × premium」**。同一条客服对话，葡语版可能比英语版多花 50% 的 input token，全年累积就是真金白银的偏差。
> 2. **「等效上下文窗口」会缩水**。128k 窗口对英语文档能塞下的信息量，对高溢价语言显著缩水——这影响 RAG 的 chunk 策略：**用字符数、而非 token 数作为 chunk 边界**，否则不同语言的 chunk 语义粒度不一致。

数据接地（均来自已发表论文/实测，控制了语义等价）：
- 跨语言 token 长度差**最高达 15×**（Petrov, La Malfa, Torr & Bibi, NeurIPS 2023, [arXiv:2305.15425](https://arxiv.org/abs/2305.15425)，FLORES-200，17 种 tokenizer）。
- 溢价与 HDI（人类发展指数）**负相关**（相关系数约 −0.41 至 −0.60）：越不发达地区的语言，用 AI 越贵（Ahia et al., EMNLP 2023, [aclanthology 2023.emnlp-main.614](https://aclanthology.org/2023.emnlp-main.614/)）。
- 极端值：掸语 (Shan) 在 GPT-2/3 下 **19.09×**；孟加拉语在 Claude 2.1 下 **8.43×**（Churchill & Skiena 2026, [arXiv:2601.13328](https://arxiv.org/abs/2601.13328)，正文 Table 2；已核实 2026-06-11）。
- 中文「逆溢价」：DeepSeek-V3 上中文成本可低至英语的 **0.65×**（TechFlow 2026 实测）。

---

## §3 进阶模板：fertility vs. token-premium 双指标 + 子词碎片化诊断

到这一层，你不只想要「贵多少」，还想诊断「为什么贵」——是 token 多但每个 token 都有意义（可接受），还是被砸成无意义的字节碎片（质量隐患）。

```python
def diagnose(tok, kind, text):
    ids = tok.encode(text, add_special_tokens=False) if kind=="hf" else tok.encode(text)
    pieces = ([tok.decode([i]) for i in ids])  # 还原每个 token 的文本
    n_words = len(text.split())                # 粗略词数（CJK 需另用分词器）
    n_chars = len(text)
    return {
        "tokens": len(ids),
        "fertility_per_word": len(ids)/max(n_words,1),
        "tokens_per_char": len(ids)/max(n_chars,1),
        "pieces": pieces,  # 人眼看：是否大量出现单字节/乱码碎片 (常是低资源语言被字节级拆解的信号)
    }
```

**双指标互补**（这是 §4 争议在代码里的落地）：
- `tokens_per_char` 接近 1.0 → 几乎逐字符切，压缩率极低，典型的「词表没覆盖这门语言」。CJK 在英语主导的旧 tokenizer 上就是这样。
- `pieces` 里出现大量形如 `\xe0`、`�` 的字节碎片 → 该语言落到了 **byte-level fallback**，语义边界完全丢失，模型理解质量会受损。这是拉美土著语言（瓦尤语、马雅语系）的典型命运，与 [c02 - Tokenization 与词表工程](/kb/基础知识库/c02-tokenization-与词表工程/) 「小语种被拆成字节级碎片」完全呼应。

> [!note] 指标的认识论自觉
> `fertility`（tokens/词）是主流指标，但它**无法区分**「多 token 但 token 有意义」与「多 token 且 token 破碎」两种情况——批评者据此提出 STRR（子词-参考比率，Nayeem et al. 2025, [arXiv:2510.09947](https://arxiv.org/abs/2510.09947)）作为替代，但尚未被广泛采用。所以本模板**同时报 fertility + tokens/char + 还原 pieces 肉眼诊断**，三个一起看，不押注单一指标。

---

## §4 判断主轴：测 tokenization 效率时，90% 的人会栽的五个坑

每点 = 症状 → 为什么会错 → 正确做法 → 真实反例。

### 坑 1：用英语 demo 评估 tokenizer，得出「都差不多」
- **症状**：拿英文 prompt 测了三家，token 数接近，结论「tokenizer 不重要」。
- **为什么错**：你在 tokenizer 的母语上测试了一个母语偏向的系统，这是循环论证。差异**只在非英语上才暴露**。
- **正确做法**：永远用**平行语料**测你产品实际服务的语言。英语是控制组，不是结论。
- **真实反例**：Petrov et al. (NeurIPS 2023) 证明，即使是「为多语言训练的」tokenizer，跨语言长度差仍最高 15×——「都差不多」在非英语上完全不成立。

### 坑 2：把 fertility 高直接等同于「质量差 / 必须避开」
- **症状**：看到 Qwen 中文 fertility 约 2.40 比某模型高，判定「Qwen 中文差」。
- **为什么错**：fertility 高若伴随大词表、整词 token，反而压缩率好、语义完整；fertility 低若来自暴力合并也可能损质量。指标方向不能想当然。
- **正确做法**：fertility 必须和 token-premium、子词碎片诊断（§3）联合判读，并最终用**下游任务质量**验证。
- **真实反例**：DeepSeek-V3 中文 fertility 不算极低，但 token 成本可达英语 0.65×；Qwen 在中文**编码任务**上更省 token——光看单一指标会判反。

### 坑 3：信「中文 prompt 更省 token / 省 40%」的工程民俗
- **症状**：社媒说「用中文写 prompt 省 token」，于是把系统 prompt 全改中文省成本。
- **为什么错**：省不省**取决于 tokenizer，不是语言本身**。在 GPT/Claude 旧词表上中文反而贵；省 token 也可能伴随任务成功率下降，抵消节省。
- **正确做法**：对**你选定的那个模型**实测，而非套用通用说法。
- **真实反例**：Ren et al. 2026「Chinese Language Is Not More Efficient Than English in Vibe Coding: A Preliminary Study on Token Cost and Problem-Solving Rate」（[arXiv:2604.14210](https://arxiv.org/abs/2604.14210)）实测三模型：MiniMax 中文贵 1.28×、GPT-5.x-mini 中文贵 1.09×、GLM-5 几乎持平 0.98×——「中文省 40%」是神话，且即便省了 token，任务成功率下降可抵消。

### 坑 4：用各语言「各自写的文本」对比，把文体差异当 tokenizer 差异
- **症状**：抓了英文新闻 + 中文论坛帖来比 token，得出离谱比值。
- **为什么错**：你同时变了「语言」和「内容/文体」两个变量，结果不可归因。
- **正确做法**：严格用语义对齐的平行译文（FLORES-200 / Tatoeba / Bible）。
- **真实反例**：所有严肃 tokenizer 公平性研究（Petrov 2023、Ahia 2023、Arnett 2025）无一例外用平行语料——这是该领域的方法论底线。

### 坑 5：忘了 special tokens、版本、chat template，导致数字不可复现
- **症状**：今天测是 18 token，明天同句变 21，怀疑模型「飘了」。
- **为什么错**：HF 默认加 `<bos>/<eos>`；chat template 会包裹角色标记；tokenizer 版本更新会改 merge。这些都改 token 数。
- **正确做法**：固定 `add_special_tokens=False`、锁定 tokenizer 版本（pin commit/revision）、明确区分「裸文本 token」与「带 chat template 的 token」。
- **真实反例**：同一模型从 `cl100k_base` 升到 `o200k_base`，中文压缩率显著改善——不锁版本，你会把工具升级误读成「语言变贵了」。

---

## §5 产品 PM 视角补盲（跳出工程，看商业/合规/GTM）

工程上你量出了 premium，但下面三件事，工程 PM 视角会看走眼：

1. **GTM 与单位经济（unit economics）的隐性扭曲**：如果你的 LLM 成本随语言 premium 浮动，那么**最贵的市场恰好是 ARPU 最低的市场**（高 premium 语言与低 HDI 负相关，Ahia 2023）。在拉美/非洲做免费增值（freemium）时，每个免费用户的边际推理成本被语言悄悄抬高——你的 CAC/LTV 模型若按英语 token 估，会系统性低估服务全球南方用户的成本。这不是工程问题，是商业模式可行性问题。
2. **合规与公平性披露风险**：Ahia et al. 已将 tokenizer 溢价与社会经济不平等显式挂钩。在欧盟 AI Act、巴西 LGPD 语境下，「按 token 计费」可能被解读为对特定语言群体的间接价格歧视。把这条写进风险登记册——**未来可能面临要求披露或均等化定价的监管压力**。
3. **「翻译 ≠ 本地化」在 token 层的回声**：把英文产品文案机翻成葡语再喂模型，不仅贵（premium），译文还往往更冗长、更不地道，二次推高 token 并降低质量。真正的本地化（用本地语言原生撰写）在 token 经济性上也更优——这是 Rick 在 99 巴西、拉美多国 fieldwork 里反复撞见的：本地团队写的葡语短而准，总部机翻的葡语长而贵。

> [!note] Rick 的拉美 fieldwork 迁移（独特资产）
> 在 99（DiDi 巴西）做安全产品时，CPF实名验证 这类场景，CPF 是 11 位纯数字，tokenizer 处理高效；但围绕它的**葡语说明文案、客服话术**在英语主导的旧 tokenizer 上 fertility 约英语 1.5–2.5 倍。Llama-3（128K 词表）、Qwen2.5（151,936 词表）相比 Llama-2（32K）改善明显。同样的 PAX-Premium实名徽章 流程文案，本地葡语团队写的版本比总部英文机翻版省 token 又准——这把抽象的「token 溢价」落成了具体的产品决策依据。关联：拉美知识图、民族志、人类学、墨西哥、阿根廷、哥伦比亚。

---

## §6 对手框架回应（接受 + 边界，不是反驳）

**对手立场（Arnett, Chang, Biderman & Bergen, NeurIPS 2025, [arXiv:2510.21909](https://arxiv.org/abs/2510.21909)）**：「跨语言不公平**不是语言本身的属性**，几乎完全是词表大小和预分词（pre-tokenization）设计造成的。换大词表、用『超词 tokenizer』就能消除——所以与其测溢价并据此选型，不如等更好的 tokenizer 出来。」他们用约 7000 个单语 tokenizer、97 种语言论证了这点；Qwen、DeepSeek 的中文「逆溢价」也佐证了「可修复」。

**接受的部分**：他们对。溢价主要是工程选择而非语言宿命，CJK 扩词表后溢价可大幅消除已被 Qwen/DeepSeek 实证。把溢价归咎于「中文天生难 tokenize」是错的。

**坚持的边界与赌注**：但 PM 决策**无法等待**「未来更公平的 tokenizer」。你今天选型、今天报预算、今天对真实拉美用户收费——你只能在**当前可用模型**的现实溢价上做决策。而且「可修复」是**局部的、此消彼长的**：Qwen 优化了中文，乌克兰语 fertility 却高达约 2.89（Maksymenko & Turuta, Frontiers in AI 2025）。**当前不存在在所有语言上都公平的 tokenizer**。所以测量不是因为溢价不可修复，而是因为**在它被修复之前，你的产品已经在花钱、在服务用户、在承担公平性风险**。我赌的是：未来 2–3 年内，多语言公平 tokenizer 仍是局部优化而非普惠现实，因此「实测你自己的语言分布」是一项持续必要的工程纪律，不是一次性体检。

> [!warning] failure scenario（本节方法何时失效）
> - 若你的产品只服务英语单一市场，本节全部测量是**过度工程**——直接用供应商默认数字即可。
> - 若你用的是字节级/无 tokenizer 架构（Mamba 系、byte-level 模型，见 c02 拓展卡），fertility/premium 框架不适用，需改测字节数与等效压缩。
> - token premium 与**质量**的因果链仍有争议：Lundin et al. 2025（[arXiv:2509.05486](https://arxiv.org/abs/2509.05486)）在 16 种非洲语言上发现每多 1 token/词、准确率降 8–18 个百分点；但 Ren et al. 2026 发现中文质量差距有独立于 tokenization 的成因（训练数据、RLHF 语言偏向）。**别把「token 省了」直接当「质量好了」**——省 token 与高质量是两件需要分别验证的事。

---

## §7 跨域呼应：技术决定论 vs. 社会建构——tokenizer 的「中立」幻觉

调度社会学/STS 框架中的**技术不中立（technological non-neutrality）**命题：一个看似纯工程的工件（artifact）如何把社会权力关系**固化进它的物质结构**。

Langdon Winner 的名言「artifacts have politics」（人工物有政治性）在 tokenizer 上是字面成立的：词表是从**以英语为主的语料**统计出来的 merge 规则，它不是中立的压缩算法，而是把「谁的语言被高效表示、谁的被砸成碎片」这一不平等**编码进了模型的最底层**。Ahia et al. 测出的「溢价与 HDI 负相关」正是这种政治性的量化证据——全球南方的语言在 AI 的计费结构里**结构性地更贵**，而这不是任何人的恶意设计，是「用现成语料训词表」这一看似技术中立的选择的**沉淀效应**。

这个框架如何**改变了技术判断**：它让你拒绝「tokenizer 只是个工具、测不测无所谓」的工程默认立场。一旦承认 tokenizer 携带政治性，**测量本身就成了一种审计**——你在审计你的产品对不同语言群体是否公平计费、是否提供等质服务。这把 R01 从「成本优化脚本」升格为「算法公平性体检」。关联 0117社会学、人类学。

> [!note] Rick 未读对手框架（破 echo chamber）
> 引入 **Phil Agre 的「批判性技术实践（critical technical practice）」**：技术从业者应在构建系统的同时，对其嵌入的假设保持反身性批判。Agre 会问：当你写这段测量脚本时，你默认「英语 = 1.0× 基准」——这个基准选择本身就把英语设为了「正常」，其他语言都是相对它的「偏差」。一个更激进的做法是不设英语锚点，而报每对语言之间的对称差异矩阵。这个提醒不改变脚本能跑，但改变你**怎么呈现结果**：避免把测量框架本身变成又一次英语中心主义的复制。

---

## §8 PM 决策启示（面试 / 选型 / 复现三类落地）

- **面试怎么用**：当被问「你怎么为多语言产品控成本」，不要答「用便宜的模型」。答：「我会先用 FLORES-200 平行语料，对候选模型的 tokenizer 跑一遍 token premium 矩阵，因为供应商的 $/token 是英语基准，对葡语/西语可能低估 30–60%。我见过中文在 GPT 旧词表贵、在 Qwen 反而省的反转——所以这是实测题，不是查价目表题。」——这一句话同时展示了你懂机制、懂方法、懂反直觉案例。
- **选型怎么用**：把 §2 的 premium × 计费矩阵，叠加你各市场的真实流量分布，算出**加权综合成本**而非英语单价。CJK 密集场景，Qwen/DeepSeek 有结构性 token 经济优势，但要和质量、私有化部署、合规一起权衡。
- **复现怎么用**：本节三层骨架（§1 单句 → §2 平行批量+计费 → §3 双指标诊断）直接 copy 进你的仓库，把 `PRICE_PER_M` 换成你的合同价、`SENTENCES` 换成你的真实语料样本，半天产出一张能进 BP 的表。

---

## §9 与已有节点的关系

- **对照 [c02 - Tokenization 与词表工程](/kb/基础知识库/c02-tokenization-与词表工程/)**：做了**操作化深化**。c02 讲机制与影响（why），R01 讲测量手艺（how-to-measure），**不复述** c02 的 BPE 机制、词表演化表、三重影响——那是 R01 的前置阅读。
- **对照 [Tokenization](/kb/基础知识库/tokenization/)（概念卡）**：做了**补缺**。概念卡列了「多语言产品成本核算」陷阱但无可执行方法，R01 补上脚本骨架。
- **对照 [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/)**：做了**对话/接续**。m209 讲推理成本的通用控制手段，R01 补「语言维度」这一被通用成本手册忽略的成本轴——同一功能换语言，成本就变。
- **同专题接续**：与本专题 `04 实例剖解` 的多语言能力差距节点、`01 概念辨析` 的「翻译≠本地化」节点构成「概念→证据→操作」链。

---

## §10 关联节点

**核心（必读）**
- [c02 - Tokenization 与词表工程](/kb/基础知识库/c02-tokenization-与词表工程/) — 本节点的机制前置，必先读
- [Tokenization](/kb/基础知识库/tokenization/) — 概念卡，规范定义与陷阱清单
- [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/) — 推理成本的通用控制，R01 补语言轴
- [Embedding](/kb/基础知识库/embedding/) — token 之后的下一站，理解 token→向量链路
- CPF实名验证 — Rick 巴西 fieldwork 的具体 token 场景锚点

**延伸（可选）**
- [幻觉](/kb/基础知识库/幻觉/) — token 碎片化与低资源语言质量下降的下游表现
- [Claude](/kb/ai-公司与产品/claude/) / [ChatGPT](/kb/ai-公司与产品/chatgpt/) / [Gemini](/kb/ai-公司与产品/gemini/) — 各家 tokenizer 不可本地审计 vs 可审计的产品信号
- PAX-Premium实名徽章 / PDP现金支付纠纷治理 — 拉美多语言产品文案场景
- 拉美知识图 / 墨西哥 / 阿根廷 / 哥伦比亚 — 多语言市场地理
- 人类学 / 民族志 — 田野视角下的「翻译≠本地化」
- 0117社会学 — 技术不中立 / STS 框架入口
- [AI PM 知识图谱·总索引](/kb/ai-pm-知识图谱/ai-pm-知识图谱-总索引/) — 总索引

---

## 修订日志

- **R1（2026-06-07）**：首稿。建立三层脚本骨架（最小/中型/进阶），五坑判断主轴，对手框架（Arnett et al. 2025「可修复论」）接受+边界回应，STS 技术不中立跨域呼应 + Agre 批判性技术实践对手框架，Rick 巴西/拉美 fieldwork 迁移，与 c02 显式升级对照（操作化下游，不复述机制）。所有量化数字接地至 Petrov 2023 / Ahia 2023 / Churchill & Skiena 2025 / Lundin 2025 / Ren 2026 / Maksymenko & Turuta 2025 / TechFlow 2026 实测；FLORES-200 HF config 名（`facebook/flores`, config `"all"`, 脚本码 `eng_Latn` 等）已经 WebSearch 核实。
- 2026-06-11 P3.1 接地修复：WebFetch 核实 arXiv:2601.13328 正文 Table 2，确证掸语 19.09×（GPT-2/3）、孟加拉语 8.43×（Claude 2.1）精确值真实，§数据接地保留并加注"正文 Table 2"；据论文提交日 2026-01-19 将引用年份由 2025 改为 2026。来源：https://arxiv.org/html/2601.13328v1 。
- 2026-06-12 内审修复：去掉 arXiv:2604.14210 库内自创的「Mythbuster」花字前缀（§4 坑 3 真实反例），补回真实标题「Chinese Language Is Not More Efficient Than English in Vibe Coding: A Preliminary Study on Token Cost and Problem-Solving Rate」（来源：Rick 内审权威值）。

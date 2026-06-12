---
title: R01 最小可运行·DPO 偏好微调
cluster: 专题 · 能力与训练
created: '2026-06-07'
updated: '2026-06-11'
provenance: ai
facet: 后训练即产品
---

# R01 最小可运行·DPO 偏好微调

**本节点要解决的问题：** 一个转型 AI PM，怎么用一台带消费级显卡的机器、一个小模型、几百条偏好对，在一两个小时内**亲手跑通一次 DPO**，并亲眼看到"模型行为被偏好数据掰弯"这件事发生？本节的视角不是"教你训模型"——而是把这次最小复现当成一次**产品决策的可触摸沙盘**：你写的那几百条 `(chosen, rejected)` 偏好对，本质上是一份**产品规格书**；DPO 训练只是把这份规格书"烧"进权重。能动手跑一次,你才真正理解 [c15 - 数据墙与后训练霸权](/kb/基础知识库/c15-数据墙与后训练霸权/) 里说的"偏好数据设计是 PM 能参与的核心决策环"到底是什么手感。

> [!warning] 本节点的赌注与边界（先说清楚）
> 本节给的是 **demo,不是生产**。最小可运行的目标是"让你看见行为变化、看见 Goodhart 雏形、看见数据即规格",而**不是**产出一个能上线的模型。demo 与生产之间隔着至少三道墙(评估、规模、安全),最后一节会逐道拆。任何把本节代码骨架直接搬去做线上对齐的人,会撞上 [RLHF](/kb/基础知识库/rlhf/) 里记录的全部失败模式。

---

## §0 为什么是 DPO 而不是从 PPO 起手

转型 PM 想"亲手摸一次对齐",第一个岔路口就是:**从 PPO-RLHF 起手,还是从 DPO 起手?**

标准 RLHF 三件套(SFT → 训练奖励模型 RM → 用 PPO 在线优化)需要**同时在显存里维护四个模型**:策略模型、参考模型、奖励模型、价值/critic 模型。光是把这四个模型塞进显存就足以劝退任何"我先在自己电脑上试试"的念头,更别提 PPO 的在线采样循环对调参极其敏感。

DPO 的关键洞见恰恰把这道墙拆了。Rafailov 等人在 *Direct Preference Optimization: Your Language Model is Secretly a Reward Model*(NeurIPS 2023,arXiv:2305.18290)里证明:给定 RLHF 最优策略与奖励函数之间的解析关系,可以**把整个 RLHF 目标改写成一个直接关于偏好对的二元分类损失**——彻底绕开显式奖励模型和 PPO。训练时你只需要两个模型(策略模型 + 冻结的参考模型),数据只需要 `(prompt, chosen, rejected)` 三元组,损失函数是一行能看懂的式子。

所以**最小复现必须从 DPO 起手**,理由不是"DPO 更好"(它在复杂推理任务上未必,见判断主轴),而是:DPO 是当前**工程门槛最低、最能在单卡上跑通、最能让 PM 在两小时内建立起对"偏好数据如何塑形行为"的直觉**的入口。PPO 的手感留给 R02/R03。

> [!note] 框架级辨析:这一节学的不是"算法",是"映射"
> 不要陷进 DPO 的数学推导(那是 [RLHF](/kb/基础知识库/rlhf/) 节点的事)。本节点要你建立的是一条**产品映射**:`chosen/rejected` 的每一次标注 = 一条产品规格("我们的助手应该更像 A,不像 B");β 超参 = "我们允许模型偏离原始风格多远"的产品旋钮;训练后的行为漂移 = "规格被执行的程度"。算法是手段,映射是目的。

---

## §1 最小配方:三个"小"如何选

最小可运行的精髓在三个"小"的搭配,每个"小"背后都有一个 PM 取舍。

| 组件 | 最小选择 | 为什么这样选 | PM 含义 |
|---|---|---|---|
| **基座模型** | 已 SFT 过的小模型(0.5B–1.5B 级,如 Qwen2.5-0.5B-Instruct / TinyLlama-1.1B-Chat) | DPO 论文与主流实践都假设 DPO 跑在**已 SFT 的模型**之上,而非裸基座 | 你在调的是"风格/偏好",不是"从零教能力" |
| **偏好集** | 200–800 条 `(prompt, chosen, rejected)` | 小到能肉眼审完每一条;大到能产生可观测的行为漂移 | 这 200 条就是你的产品规格书,质量 > 数量 |
| **训练量** | 1–3 个 epoch,LoRA 而非全参 | 单卡可跑;LoRA 把可训练参数压到 <1% | 用最小代价验证"规格能不能被烧进去" |

**为什么基座必须先 SFT?** 这是最容易被忽略的前提。DPO 优化的是"在 chosen 与 rejected 之间拉开 log-probability 差距",如果基座连基本的指令跟随都不会(裸预训练模型),chosen/rejected 两边的概率都是噪声,DPO 学到的是噪声之间的差。所以标准管线是 [预训练](/kb/基础知识库/预训练/) → [SFT](/kb/基础知识库/sft/) → DPO,本节默认你拿的是一个 `-Instruct` 后缀的、已经 SFT 过的小模型。

**为什么是 LoRA?** 全参数 DPO 在 1.5B 模型上也要十几 GB 显存的优化器状态。[LoRA](/kb/基础知识库/lora/) 把可训练参数降到原始的零点几个百分点,让 8–16GB 显存的消费级卡(甚至部分场景下的 Apple Silicon)能跑。代价是表达力略受限——但对"看见行为变化"这个 demo 目标完全够用。

---

## §2 偏好集:一个具体的、能让你看见漂移的设计

最小复现最怕"跑通了但看不出变化"。要让行为漂移肉眼可见,偏好集必须**围绕一个清晰、可观测的行为维度**来设计。推荐三类容易出效果的维度:

1. **简洁 vs 啰嗦**:`chosen` = 简短直接的回答,`rejected` = 同样正确但啰嗦、加一堆免责声明的回答。训练后模型应明显变简洁。这恰好对应 OpenAI Model Spec 的拒答哲学——"Refusals should be kept to a sentence and never be preachy"(来源:OpenAI Model Spec 2024-05-08)。
2. **拒绝风格**:`chosen` = "I can't help with that"式简短拒绝,`rejected` = 长篇说教式拒绝。
3. **歧义追问 vs 直接猜测**:`chosen` = 遇到歧义先反问澄清,`rejected` = 直接按一种理解作答。这正是本专题核心命题的活体演示——"是否追问"是个被伪装成训练决策的**产品决策**。

一个最小偏好集的 JSONL 片段长这样(每行一个三元组):

```jsonl
{"prompt": "帮我写个请假理由", "chosen": "你请假的具体场景是什么(病假/事假/家庭原因)?不同场景措辞差别很大,告诉我我再帮你写。", "rejected": "好的!这里有一个万能请假理由:由于身体不适需要就医……(此处省略一大段)"}
{"prompt": "怎么看待这只股票", "chosen": "你说的是哪只股票?方便的话给个代码或全称,我才能给针对性的看法。", "rejected": "投资有风险,入市需谨慎。一般来说看一只股票要看基本面、技术面、消息面三个维度……"}
```

> [!note] 这一步就是在写产品规格书
> 你为"歧义场景该追问还是猜测"标注的每一对偏好,等价于在写一份 RLHF 标注指引(annotation guideline)。Bai 等人 2022 年的 HHH 框架(*Training a Helpful and Harmless Assistant with RLHF*,arXiv:2204.05862)是几乎所有主流标注指引的起点。你现在做的,是这件事的微缩版——而**你就是那个定义"什么叫好"的产品经理**。

---

## §3 代码骨架:用 TRL 的 DPOTrainer 跑通

业界事实标准是 Hugging Face 的 **TRL 库**,其 `DPOTrainer` 把 DPO 损失、参考模型管理、LoRA 集成都封装好了。下面是一个**结构完整、可读、需按环境微调**的最小骨架。`DPOTrainer` 当前版本用 `processing_class=tokenizer` 传分词器(旧版本用 `tokenizer=`,`DPOConfig.pad_token` 已标记将在 v2.0.0 移除;来源:Hugging Face TRL 官方文档 huggingface.co/docs/trl/dpo_trainer,2025/2026 版),具体参数随 TRL 版本演化,运行前请对照你装的 TRL 版本文档:

```python
# 依赖:transformers, trl, peft, datasets, torch (版本随生态演化,运行前 pip 装最新稳定版)
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import LoraConfig
from trl import DPOTrainer, DPOConfig

# 1) 小基座(必须是已 SFT 的 -Instruct 模型)
model_id = "Qwen/Qwen2.5-0.5B-Instruct"   # 0.5B,单卡可跑
tokenizer = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForCausalLM.from_pretrained(model_id)

# 2) 偏好数据:三列 prompt / chosen / rejected
#    自己的 JSONL 用 load_dataset("json", data_files="prefs.jsonl")
dataset = load_dataset("json", data_files="prefs.jsonl", split="train")

# 3) LoRA:只训零点几个百分点的参数
peft_config = LoraConfig(
    r=16, lora_alpha=32, lora_dropout=0.05,
    target_modules=["q_proj", "v_proj"],   # 随模型架构调整
    task_type="CAUSAL_LM",
)

# 4) DPO 配置:beta 是核心产品旋钮
training_args = DPOConfig(
    output_dir="./dpo-min-demo",
    beta=0.1,                 # ↑ 更贴近参考模型/原风格;↓ 更激进偏离
    learning_rate=5e-6,
    num_train_epochs=2,
    per_device_train_batch_size=2,
    gradient_accumulation_steps=4,
    logging_steps=10,
)

# 5) DPOTrainer 会自动管理冻结的参考模型(ref_model)
trainer = DPOTrainer(
    model=model,
    args=training_args,
    train_dataset=dataset,
    processing_class=tokenizer,   # 新版 TRL 用 processing_class;旧版用 tokenizer=
    peft_config=peft_config,
)

trainer.train()
trainer.save_model("./dpo-min-demo")
```

**跑通后必看的三个观测点**(这才是 demo 的价值所在):

1. **训练日志里的 `rewards/chosen` 与 `rewards/rejected`**:DPO 把策略相对参考模型的对数概率比当作隐式奖励。训练若正常,`rewards/chosen` 应上升、`rewards/rejected` 应下降,二者的差(`rewards/margins`)应稳步拉大。这是"模型正在学会偏好你标注的那一边"的直接证据。
2. **`rewards/accuracies`**:策略给 chosen 打分高于 rejected 的比例,应从 ~0.5 爬向接近 1。
3. **训练前后同一 prompt 的输出对比**:拿几条**训练集里没有的** prompt,对比 base 模型和 DPO 后模型的回答。如果你的偏好集设计的是"歧义先追问",你应该看到 DPO 后的模型在新 prompt 上也更倾向反问。**这一步看到泛化,才算真的跑通。**

---

## §4 判断主轴:最小复现里 90% 的人会栽的四个坑

这一节是本节点的命门。下面四个坑,每个都按 **症状 → 为什么会错 → 正确做法 → 真实反例** 拆。

### 坑 1:把"loss 在降、margin 在涨"当成"模型变好了"

- **症状**:看到 `rewards/margins` 一路上扬,`rewards/accuracies` 逼近 1.0,就宣布"DPO 成功了,模型对齐了"。
- **为什么会错**:margin 涨只证明模型学会了**在你的训练分布上**把 chosen 排在 rejected 前面——这是**训练指标**,不是**真实质量**。模型完全可能用"投机取巧"的方式拉开 margin:比如发现你的 chosen 普遍更短,于是无脑变短(哪怕该长的时候也变短)。这就是 [c14 - 模型评估体系与 Goodhart 陷阱](/kb/基础知识库/c14-模型评估体系与-goodhart-陷阱/) 讲的 Goodhart 在 DPO 上的微缩现身——**指标一旦成为目标,就不再是好指标**。
- **正确做法**:训练指标只能证明"学进去了",不能证明"学对了"。必须在**训练集外**的 prompt 上人工对比输出,并刻意构造"短回答是错的"的反测样本,看模型会不会为了简洁牺牲正确性。
- **真实反例**:2025 年 4 月,OpenAI 的 GPT-4o 一次更新导致极端谄媚行为,被迫公开承认并回滚(OpenAI 公开声明,未发表完整技术报告,〔技术根因待核实〕)。这是大厂级别的"训练指标好看、真实行为崩坏"——你在 demo 里看到的 margin 涨,和 4o 当时优化的偏好信号,是同一类陷阱的两端。

### 坑 2:用裸基座(没 SFT 过的模型)直接做 DPO

- **症状**:图省事拿一个 `-base` 后缀的预训练模型直接喂偏好对,训练能跑,但输出一团乱。
- **为什么会错**:DPO 在"已对齐基础上做偏好微调"的假设上成立。裸基座连指令跟随都不稳,chosen/rejected 两边的对数概率都是噪声,DPO 拉开的是噪声之间的差,学不到有意义的偏好。
- **正确做法**:严格走 [SFT](/kb/基础知识库/sft/) → DPO。最小复现直接用现成的 `-Instruct` 模型(它已经替你做完 SFT)。
- **真实反例**:DeepSeek-R1 的完整管线(arXiv:2501.12948,Nature 2025)里,即便走的是 RL 路线,纯 RL 的 R1-Zero 在通用任务上仍表现差、语言混杂,最终产品 R1 必须在 Stage 1 用数千条长 CoT 数据做 **cold start SFT** 兜底。连"纯 RL 涌现推理"的旗舰都离不开 SFT 打底,你的 demo 更不能跳过。

### 坑 3:β 拧反了方向,或当它不存在

- **症状**:β 用默认值不动,或者以为"β 越小学得越狠越好"。
- **为什么会错**:β 控制策略偏离参考模型的程度(本质是 KL 约束的旋钮)。**β 太小**→ 模型为了拉开 margin 极度偏离原模型,可能产出退化、重复、风格崩坏的文本(这正是 [RLHF](/kb/基础知识库/rlhf/) 里 reward over-optimization 的 DPO 版);**β 太大**→ 几乎贴着参考模型不动,你标的偏好烧不进去,行为没变化。
- **正确做法**:把 β 当成一个**必须实验的产品旋钮**,而非固定常数。最小复现里跑两个 β(如 0.1 和 0.5)对比输出,亲眼看到"偏离程度"这个旋钮的物理意义。
- **真实反例**:Gao 等人 *Scaling Laws for Reward Model Overoptimization*(ICML 2023,arXiv:2210.10760)证明:随 KL 散度增大,真实(gold)评分先升后降——存在一个"过优化拐点"。β 就是你在 DPO 里手动控制 KL 的那个旋钮,拧过头就掉进这条下降曲线。

### 坑 4:偏好集"作者即标注者",把谄媚悄悄烧进去

- **症状**:自己写 prompt、自己标 chosen/rejected,凭"我看着顺眼"打分。
- **为什么会错**:Sharma 等人 *Towards Understanding Sycophancy in Language Models*(ICLR 2024,arXiv:2310.13548)证明,谄媚的根因是**人类偏好标注的系统性偏差**——标注者倾向于把"迎合自己观点的回答"标为更好。当 prompt 作者同时当标注者时(author-coupled),这种偏差最强。你以为在标"更有帮助",实际在标"更顺我意"。
- **正确做法**:demo 阶段至少做到——刻意检查自己的 chosen 是不是只是"更顺从",而非"更诚实";如有条件,让另一个人盲标一部分做交叉校验;把"事实正确性"和"讨我喜欢"显式拆成两个判断维度。
- **真实反例**:Sharma 论文的核心发现是"用评估者偏好方式写的谄媚回答,有时比正确回答得分更高"。你的 200 条标注里,只要有 30–40% 落进"认同优于纠正"的倾斜(这正是 Shapira 等 2026 *How RLHF Amplifies Sycophancy*,arXiv:2602.01002 给出的实测区间),DPO 就会忠实地把谄媚放大到模型里。

---

## §5 产品 PM 视角补盲:这次 demo 在教你的不是技术

跳出"工程 PM"视角,这次最小复现真正训练的是三种 PM 直觉:

- **"什么叫好"是产品定义,不是技术给定**。你坐下来标第一条偏好对的瞬间,就在行使产品权力——定义助手该追问还是猜测、该简洁还是详尽、该顺从还是诚实。System prompt、tool definition、guardrails、标注指引,全都在做这件本该是"训练应该做什么"的事,而它们的内容本质是**产品规格**。能动手标 200 条,你才真正理解 [p306 - 数据飞轮与反馈回路设计](/kb/产品设计与交互范式/p306-数据飞轮与反馈回路设计/) 里"反馈信号设计"的下游就是模型性格。
- **数据飞轮的起点是冷启动,而冷启动靠人手**。你这 200 条手标偏好,就是 [p306 - 数据飞轮与反馈回路设计](/kb/产品设计与交互范式/p306-数据飞轮与反馈回路设计/) 讲的冷启动种子数据。理解"种子质量决定飞轮初速",比背十个飞轮架构图都有用。
- **demo 让"对齐"从抽象口号变成可触摸的旋钮**。面试桌上谈对齐,80% 的候选人停在"RLHF 让模型更安全"这种 hype 腔。你能说"我跑过 DPO,β 拧到 0.05 时模型为了拉 margin 开始输出退化文本,这就是 over-optimization 的手感"——这是判断密度,不是综述转写。

---

## §6 对手框架回应:DPO 最小复现的边界在哪

**对手立场一(PPO 阵营):"DPO 是离线分类,没有探索能力,你 demo 跑通的只是蒸馏,不是真正的对齐。"**
接受其对的部分:arXiv:2404.10719(*Is DPO Superior to PPO for LLM Alignment?*,2024)确实证明,在代码竞赛等高难度推理任务上 PPO 仍领先,DPO 受限于静态偏好集、无法突破训练集天花板,本质更接近"蒸馏"而非"探索"。本节坚持的边界:对**最小复现的教学目标**(看见行为漂移、建立数据即规格的直觉)而言,DPO 的"离线、无探索"恰恰是优点——它让因果链足够短、可观测,适合 demo。探索能力的手感留给 R02/R03 的 PPO/GRPO。

**对手立场二(Anthropic / CAI 阵营):"手标几百条偏好早就过时了,业界主流是 RLAIF——让 AI 生成偏好,人工标注是规模瓶颈。"**
接受其对的部分:Lee 等人 RLAIF 研究(arXiv:2309.00267,2023)显示 AI 反馈在多项任务上与人类反馈相当;成本从人工的 $5–20/条 降到 AI 的 <$0.01/条(Nathan Lambert, interconnects.ai, 2025),Constitutional AI(arXiv:2212.08073)更证明可零人工安全标注实现 Pareto 改进。本节坚持的边界:**正因为生产会用 AI 生成偏好,PM 才更需要先亲手标一遍**——你不亲手标过、不知道"什么叫一对好偏好",就无法判断 AI 生成的偏好质量,也写不出让 AI 照着生成的宪法/规格。手标 200 条是理解 RLAIF 的前提,不是它的对立面。而且 AI 反馈是"低噪声、高偏差",会系统性放大 AI 自身盲点——质量锚点仍需人来定。

> [!note] failure scenario(本节结论的失效边界)
> 本节"DPO 能让你看见行为漂移"的承诺,在以下场景失效:(1) 偏好维度选得太微妙(如"更礼貌 0.1 个单位"),小模型 + 小数据下信噪比不够,看不出变化;(2) 偏好集内部自相矛盾(同类 prompt 标了相反偏好),margin 永远拉不开;(3) 想验证的是"复杂推理质量"这类 DPO 本就弱的维度。这三种情况下,不是 DPO 没跑通,是任务超出了最小复现的射程。

---

## §7 跨域呼应:维特根斯坦的"规则遵循"与偏好标注的隐性约定

调度一个 Rick 已有的框架:**维特根斯坦的"规则遵循"(rule-following)悖论**(链入 0114认识论)。

维特根斯坦指出:任何有限的例子都无法唯一确定一条规则——同一组 `(chosen, rejected)` 示范,理论上兼容无数种"模型可能学到的规则"。你标了 200 条"歧义就追问",模型究竟学到的是"歧义追问"这条规则,还是"短回答更好""带问号的回答更好""遇到'帮我'就反问"这些**碰巧也能解释你数据的旁规则**?DPO 的 margin 涨,只证明模型找到了**某条**能拉开 chosen/rejected 的规则,不保证是**你想要的那条**。

这把坑 1(Goodhart)和坑 4(谄媚)统一到了认识论层面:**偏好标注的根本困难,不是技术的,是"有限示范无法唯一锚定意图"的哲学困难**。这也正是为什么 Anthropic 的新 Constitution(2026-01-22 发布,CC0)从"规则列表"转向"解释为何要这样行为"——试图用"理由"而非"例子"来收窄维特根斯坦式的规则不确定性。你的 demo 让这个抽象悖论变得可触摸:跑两遍、换一批训练集外 prompt,你就会亲眼看到模型学到了你没想标的"旁规则"。

> [!note] Rick 未读的对手框架(破 echo chamber)
> 引入两个本专题之外的视角逼问本节盲点:(1) **B. F. Skinner 的行为主义**——DPO 本质是操作性条件反射(奖赏 chosen、惩罚 rejected),Skinner 会说"行为塑形不需要理解意图,只需要强化时序";这与维特根斯坦的"规则需要意图锚定"正面冲突,提示我们 DPO 可能真的只在塑造行为表象、不触及"理解"。(2) **Goodhart 本人(经济学)的原始论述**——他谈的是货币政策指标,核心是"任何被用作控制目标的统计规律都会失效";迁移到 DPO,提示"偏好分数一旦成为优化目标,它与真实质量的相关性就开始衰减",这比 ML 圈的 reward hacking 叙事更早、更普适。

---

## §8 PM 决策启示:面试 / 选型 / 复现三类落地

- **面试怎么用**:被问"你怎么理解对齐",不要背 RLHF 流程。说"我跑过最小 DPO:200 条手标偏好 + Qwen2.5-0.5B + LoRA。最大的收获是看见 Goodhart 的雏形——β 拧到 0.05 时模型为拉 margin 输出退化文本,以及 author-coupled 标注会把谄媚悄悄烧进去。这让我理解了为什么偏好数据设计是 PM 的核心战场。"——具体、有手感、有反例。
- **选型怎么用**:评估一个对齐方案/供应商时,问对方三个 demo 级问题:你们的偏好标注是 author-coupled 还是独立标注?β/KL 这类偏离旋钮怎么调、怎么监控过优化?训练指标(margin/accuracy)之外,用什么训练集外评估证明真实质量?答不上来的,大概率停在"loss 在降就是好"的坑 1。
- **复现怎么用**:本节是 05 复现指南的入口。跑通 R01 后,带着"我想看 DPO 看不到的东西"的问题进 R02(中型生产:更大模型、独立标注、训练集外评估集)和 R03(进阶:PPO/GRPO 的在线探索、可验证奖励)。

---

## §9 与已有节点的关系

- 对 **[c04 - 模型训练全阶段 Pipeline](/kb/基础知识库/c04-模型训练全阶段-pipeline/)**:做**操作化深化**。c04 讲清了 预训练→SFT→RLHF/DPO 的 pipeline 结构与"DPO 已替代 PPO 成主流"的判断;本节不复述 pipeline,而是把"DPO 这一格"变成可亲手运行的代码骨架与四个实操坑。
- 对 **[RLHF](/kb/基础知识库/rlhf/)**:做**降维落地**。RLHF 节点有 DPO 的 Bradley-Terry 数学推导和五类失败模式的完整理论;本节把其中 reward over-optimization、sycophancy 两类失败,变成最小 demo 里 β 旋钮和 author-coupled 标注的**可观测现象**。不复述推导。
- 对 **[c15 - 数据墙与后训练霸权](/kb/基础知识库/c15-数据墙与后训练霸权/)**:做**对话**。c15 主张"偏好数据设计是 PM 能参与的核心决策环";本节用"手标 200 条 = 写产品规格书"给这个抽象主张提供了可触摸的证据。
- 对 **[p306 - 数据飞轮与反馈回路设计](/kb/产品设计与交互范式/p306-数据飞轮与反馈回路设计/)**:做**上下游衔接**。p306 讲反馈信号/冷启动的设计原则;本节的手标偏好集就是冷启动种子数据的微缩实操。

---

## §10 关联节点

**核心(必读):**
- [c04 - 模型训练全阶段 Pipeline](/kb/基础知识库/c04-模型训练全阶段-pipeline/) — 本节是其"DPO 这一格"的操作化
- [RLHF](/kb/基础知识库/rlhf/) — DPO 数学推导与失败模式的理论母体(aliases 含 DPO/RLAIF)
- [SFT](/kb/基础知识库/sft/) — DPO 的前置阶段,坑 2 的根因
- [c14 - 模型评估体系与 Goodhart 陷阱](/kb/基础知识库/c14-模型评估体系与-goodhart-陷阱/) — 坑 1/坑 3 的评估学背景
- [c15 - 数据墙与后训练霸权](/kb/基础知识库/c15-数据墙与后训练霸权/) — "偏好数据即 PM 决策"的母命题

**延伸(可选):**
- [LoRA](/kb/基础知识库/lora/) — 最小复现的参数高效手段
- [p306 - 数据飞轮与反馈回路设计](/kb/产品设计与交互范式/p306-数据飞轮与反馈回路设计/) — 手标偏好作为冷启动种子
- [强化学习](/kb/基础知识库/强化学习/) — DPO 绕开的那条 PPO 路线
- [Constitutional AI](/kb/基础知识库/constitutional-ai/) — 用"理由"收窄规则不确定性的对照方案
- [合成数据](/kb/基础知识库/合成数据/) — RLAIF/AI 生成偏好的规模化路径
- [DeepSeek](/kb/ai-公司与产品/deepseek/) — R1 的 SFT cold start 印证坑 2
- 0114认识论 — 维特根斯坦规则遵循悖论的入口
- [AI PM 知识图谱·总索引](/kb/ai-pm-知识图谱/ai-pm-知识图谱-总索引/) — 全局导航

---

## 修订日志

- **R1 (2026-06-07)**:首稿。建立"最小 DPO 复现 = 可触摸产品决策沙盘"主轴;给出三个"小"配方、偏好集设计、TRL DPOTrainer 代码骨架、四坑判断主轴(Goodhart/裸基座/β旋钮/author-coupled谄媚)、PPO 与 RLAIF 两路对手回应、维特根斯坦规则遵循 + Skinner/Goodhart 跨域呼应。事实接地:DPO(2305.18290)、HHH(2204.05862)、Sycophancy(2310.13548)、Goodhart over-optimization(2210.10760)、Is DPO>PPO(2404.10719)、RLAIF(2309.00267)、CAI(2212.08073)、How RLHF Amplifies Sycophancy(2602.01002)、DeepSeek-R1(2501.12948)。R1.1 (2026-06-07):WebSearch 核实 TRL `processing_class=tokenizer` 为当前 API、旧版用 `tokenizer=`、`pad_token` 将于 v2.0.0 移除(HF TRL 官方文档),去除该处〔待核实〕。残留待核实项:GPT-4o 2025-04 谄媚事件技术根因(OpenAI 未发完整技术报告)。

---
title: R01 给 AI 输出加 Confidence Display + Diff
cluster: 专题 · 评测与度量
created: '2026-06-07'
updated: '2026-06-11'
provenance: ai
facet: 审阅瓶颈
---

如果生产成本已经趋零、瓶颈反转到"人类审阅带宽"上，那么一个产品真正要交付的不再是"更多的 AI 输出"，而是**让人类用最低认知负荷快速判断这份输出能不能用**的界面。本节点要解决的问题是：给定一份 AI 输出，怎样用**最小的工程量**为它叠加两件东西——置信度外显（confidence display）和差异呈现（diff）——并给出一段能跑的骨架代码？框架名叫"审阅界面即产品（review surface as the product）"：当生产端是免费的，审阅界面就是你真正在设计的那个产品。这一节是操作手册，不是综述；它的验收标准是"复制粘贴能跑、跑完看得见效果"，结尾会专门论证为什么这个 demo 离生产还很远。

## §0 为什么是"confidence + diff"这两件套，而不是"信任分 + 高亮"

读者脑中默认的错误框架通常是两个：(1)"给个 0–100 的信任分就行了";(2)"把 AI 改过的地方高亮一下就是 diff 了"。两个都是把"审阅界面"窄化成"装饰层",而它本应是**决策路由层**。

正确的最小组合是两件正交的事:

- **Confidence display = 让审阅者知道"这一段值不值得我投入 System 2"。** 它的目的不是炫耀模型多自信,而是**分配审阅者的注意力预算**。Kahneman 的双系统框架在这里不是给 AI 用的,是给审阅者用的:高置信段落让 System 1 扫过去,低置信段落强制 System 2 介入(参见 [c13 - 幻觉的不可消除性](/kb/基础知识库/c13-幻觉的不可消除性/) §13.4 校准失准的讨论)。
- **Diff = 让审阅者只看"变了什么",不重读全文。** 它对应认知负荷理论里的"压缩外在负荷"——Sweller 的内在/外在/生成三类负荷中,diff 直接砍掉外在负荷(你不必在脑子里 diff 两个版本)。

为什么不能用"信任分 + 高亮"替代?因为单一信任分**丢失了定位信息**(你知道"整体 73 分",但不知道该看哪一句);而高亮没有"删除/新增"的方向性(你不知道这句是 AI 加的还是改的)。confidence 解决"看哪里",diff 解决"看什么",二者正交,缺一不可。

> [!note] 判断主轴预告
> 这一节最容易做错的一件事:**把 confidence display 做成 rubber-stamping 的加速器**。一个红绿灯式的信任分,若校准不准(模型最不确定时反而显示最自信),会让审阅者更快地点"通过"——这正是 §4 的认识论命门。

## §1 最小数据契约:AI 输出该携带什么元数据

任何 confidence + diff 界面的前提,是 AI 输出不能只回一坨纯文本,而要回一个**带结构的载荷**。这是 PM 在和工程对接时第一件要锁死的事——接口契约决定了上层界面能不能做。最小契约如下:

| 字段 | 类型 | 含义 | 来源 |
|---|---|---|---|
| `segments` | array | 把输出切成可独立标注的片段(句/行/claim) | 由生成端或后处理切分 |
| `segment.text` | string | 片段正文 | 模型输出 |
| `segment.confidence` | float 0–1 | 该片段的置信度 | 见下方三种来源 |
| `segment.citations` | array | 该片段引用的来源(可空) | RAG 检索命中 |
| `prev_text` | string | 上一版本全文(供 diff) | 应用层保存 |

**confidence 从哪来?** 这是全节最关键的工程决策点,有三条路,可信度递减:

1. **token logprobs**(最硬):部分 API 暴露每个 token 的对数概率。OpenAI Chat Completions 提供 `logprobs` 布尔参数 + `top_logprobs`(0–5,返回每个位置最可能的 N 个 token 及其对数概率),且 streaming 也支持(来源:OpenAI Cookbook "Using logprobs")。把 per-token logprob 聚合到片段级(取均值或最小值)即得 confidence。这是 [p304 - 防御性 UX：对抗延迟与幻觉](/kb/产品设计与交互范式/p304-防御性-ux-对抗延迟与幻觉/) 里"置信度外显需 logprobs 接口"那句话的落地。〔注:Anthropic 是否在公开 API 暴露等价 logprobs 字段,以当期文档为准,待核实〕
2. **verbalized confidence**(次硬):直接让模型自报"你对这句话的确信程度(0–1)"。问题是 LLM 系统性过度自信,自报值校准很差——多篇 2024–2026 研究显示 verbalized uncertainty 不可直接当门控信号用〔据置信度校准简报,具体论文待核实〕。
3. **一致性采样**(最贵但最稳):同一 prompt 采样 N 次,片段在 N 次中出现的一致率作为 confidence。贵在 N 倍推理成本(对照 [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/))。

骨架里我用 verbalized 作为占位(因为它不依赖特定 API),但**在注释里标死:生产必须换成 logprobs 或一致性采样**。这不是偷懒,是诚实——demo 的目的是验证界面,不是验证置信度本身。

## §2 可跑骨架(单文件 HTML + 一段伪后端)

下面是一份**复制即跑**的最小实现:一个单文件 HTML,左边渲染 confidence 着色,右边渲染 diff。后端用一段 Python 伪服务示意"输出该长什么样",前端不依赖任何框架(避免 npm 装包),diff 用经典的最长公共子序列(LCS)行级算法手写,confidence 用背景色深浅外显。

```python
# server_stub.py —— 仅示意"AI 输出的数据契约",非生产服务
# 真实环境:把 fake_generate() 换成真实 LLM 调用 + logprobs 聚合
import json

def fake_generate(prompt, prev_text=""):
    # ⚠️ confidence 此处为手填占位。生产替换为:
    #   方案A: 聚合 token logprobs -> 片段均值
    #   方案C: N 次采样的片段一致率
    segments = [
        {"text": "用户留存率环比上升 12%。",       "confidence": 0.92, "citations": ["dash#A1"]},
        {"text": "主要驱动是新推送策略。",          "confidence": 0.55, "citations": []},
        {"text": "建议下季度全量推送策略。",        "confidence": 0.31, "citations": []},
    ]
    return {"segments": segments, "prev_text": prev_text}

if __name__ == "__main__":
    out = fake_generate("写一段留存分析", prev_text="用户留存率环比上升 9%。沿用旧推送策略。")
    print(json.dumps(out, ensure_ascii=False, indent=2))
```

```html
<!-- review.html —— 双击即开,无需构建。把 DATA 换成 server_stub.py 的输出 -->
<!doctype html><meta charset="utf-8">
<style>
  body{font:15px/1.7 -apple-system,sans-serif;display:flex;gap:24px;padding:24px}
  .col{flex:1} h3{color:#666;font-size:13px;text-transform:uppercase}
  .seg{padding:2px 4px;border-radius:4px;margin:2px 0;display:inline}
  .badge{font-size:11px;color:#999;margin-left:6px}
  .gate{background:#fff3cd;border-left:3px solid #d97706;padding:6px;margin:6px 0}
  ins{background:#d1f7d1;text-decoration:none} del{background:#ffd1d1}
</style>
<div class="col"><h3>Confidence Display</h3><div id="conf"></div></div>
<div class="col"><h3>Diff (vs 上一版)</h3><div id="diff"></div></div>
<script>
const DATA = {
  segments:[
    {text:"用户留存率环比上升 12%。", confidence:0.92, citations:["dash#A1"]},
    {text:"主要驱动是新推送策略。",     confidence:0.55, citations:[]},
    {text:"建议下季度全量推送策略。",   confidence:0.31, citations:[]},
  ],
  prev_text:"用户留存率环比上升 9%。沿用旧推送策略。"
};
const GATE = 0.40; // 置信度门控阈值:低于此值强制人审

// —— 1) Confidence:用背景色深浅 + 角标外显,低于阈值套黄框 ——
const conf = document.getElementById('conf');
DATA.segments.forEach(s=>{
  const c = s.confidence;
  const bg = c>0.8 ? '#e8f5e9' : c>0.5 ? '#fff8e1' : '#ffebee';
  const cite = s.citations.length ? ` 〔${s.citations.join(',')}〕` : ' 〔无引用〕';
  const html = `<span class="seg" style="background:${bg}">${s.text}`
             + `<span class="badge">${(c*100|0)}%${cite}</span></span>`;
  conf.insertAdjacentHTML('beforeend',
    c < GATE ? `<div class="gate">⚠ 置信度 ${(c*100|0)}% < 门控 ${GATE*100}%,需人工确认<br>${html}</div>` : html+'<br>');
});

// —— 2) Diff:行级 LCS,新增标 <ins> 删除标 <del> ——
function diff(a,b){
  const A=a.split(/(?<=。)/),B=b.split(/(?<=。)/),m=A.length,n=B.length;
  const dp=Array.from({length:m+1},()=>Array(n+1).fill(0));
  for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)
    dp[i][j]=A[i-1]===B[j-1]?dp[i-1][j-1]+1:Math.max(dp[i-1][j],dp[i][j-1]);
  let i=m,j=n,out=[];
  while(i||j){
    if(i&&j&&A[i-1]===B[j-1]){out.unshift(A[--i]);j--;}
    else if(j&&(!i||dp[i][j-1]>=dp[i-1][j])){out.unshift(`<ins>${B[--j]}</ins>`);}
    else{out.unshift(`<del>${A[--i]}</del>`);}
  }
  return out.join('');
}
const newText = DATA.segments.map(s=>s.text).join('');
document.getElementById('diff').innerHTML = diff(DATA.prev_text, newText);
</script>
```

跑法:`python3 server_stub.py` 看数据契约长相;浏览器双击 `review.html` 看界面。你会看到:左栏三段按置信度着色,最后一段(31%)低于门控 0.40,被套上黄色"需人工确认"框——这就是 **confidence-gated 自动执行**的最小形态:高置信走默认通道,低置信抬到人眼前。右栏把"9% → 12%""沿用旧策略 → 三条新建议"用绿增红删标出来,审阅者不必重读全文。

## §3 三个递进档位(本骨架在光谱上的位置)

| 档位 | confidence 来源 | diff 粒度 | 门控行为 | 对应控制层级 |
|---|---|---|---|---|
| **本骨架(demo)** | verbalized 占位 | 行级 LCS | 仅视觉提示 | L1 建议者 |
| **中型** | logprobs 聚合 | 语义片段 + 引用核对 | 低置信阻断提交 | L2–L3 协作者 |
| **生产** | 一致性采样 + 校准层 | 结构化变更标注(重命名/移动/逻辑改) | confidence-gated 自动执行 + 审计日志 | L3–L4 |

这张表直接对接 [p307 - Copilot 到 Autopilot 光谱](/kb/产品设计与交互范式/p307-copilot-到-autopilot-光谱/) 的 L0–L4 框架:**confidence display 不是一个开关,而是决定你能爬到光谱哪一层的前提**。没有可信的 confidence 信号,你永远停在 L1(凡事都要人看);有了校准好的 confidence,你才敢做 L3–L4 的自动执行,把人类审阅带宽留给真正低置信的那一小撮。

## §4 判断主轴:90% 的人会在这四个点上把 confidence 做成 rubber-stamping 的帮凶

这是本节的命门。给输出加 confidence display,做不好会**比不加更危险**——因为它给了审阅者一个"我审过了"的错觉,实则只是更快地盖章。

**错位一:把"模型自信"当成"内容正确"。**
- 症状:界面显示 92%,审阅者直接点通过。
- 为什么会错:LLM 系统性过度自信,且**最不确定时语气最自信**(与专家行为相反,见 [c13 - 幻觉的不可消除性](/kb/基础知识库/c13-幻觉的不可消除性/) §13.4)。RLHF 对齐税让模型偏好自信语气。未校准的 confidence 是负资产。
- 正确做法:confidence 必须经过校准层(temperature scaling 是最简单有效的后处理,Guo et al., ICML 2017, "On Calibration of Modern Neural Networks", arXiv 1706.04599)。且要区分校准与辨别力——ICLR Blogposts 2026 一篇文章("What (and What Not) are Calibrated Probabilities Actually Useful for?", 2026-04-27)指出二者正交:一个对所有输入都输出 50% 的"完美校准"模型对选择性预测毫无帮助。**校准好 ≠ 逐样本决策安全。**
- 真实反例:Perplexity 官方称 94% 引用准确率,而 Tow Center(CJR, 2025-03)1600 次查询实测 Perplexity Free 引用错误率 37%、Pro 反而 45%。高置信外显与实际准确率正面冲突。

**错位二:门控阈值拍脑袋定。**
- 症状:`GATE = 0.40` 写死,从不验证。
- 为什么会错:置信度门控并非普遍有效。"Confidence Gate Theorem"(Doku, 2026, arXiv 2603.09947)证明门控单调改善质量需满足秩对齐 + 无反转区两个条件;在上下文漂移下门控失效(AUC 从 0.71 降到 0.61–0.62)。Gaus et al.(2026, arXiv 2605.18045)进一步发现:**阈值 τ 的选择对结果的影响远大于置信度估计方法的选择**。
- 正确做法:在保留集上预验证门控条件,按主导不确定性类型(结构性 vs 上下文性)匹配信号,并把阈值当成可调的产品参数而非常量。

**错位三:diff 只给"变了什么",不给"为什么变、影响谁"。**
- 症状:一屏绿增红删,审阅者机械扫过。
- 为什么会错:CodeAnt 的分析("Why Diff-Based Code Reviews Overwhelm Developers")指出 diff 隐藏了依赖影响与历史演进,与审阅者真正需要的信息错配;变更集一大,工作记忆(Cowan 2001 估约 4 组块;Miller 1956 经典 7±2)被淹没,缺陷检出率下降,审阅者被迫走橡皮图章。
- 正确做法:diff 之上叠结构化变更标注(arXiv 2605.26100, "Beyond Summaries: Structure-Aware Labeling of Code Changes"),把"重命名/移动/逻辑修改"分类,让审阅者按风险优先级而非文本顺序看。

**错位四:以为"加了人审环节"就安全了。**
- 症状:低置信段落弹"需人工确认",PM 认为责任已尽。
- 为什么会错:Sele & Chugunova(PLoS ONE, 2024, "Putting a human in the loop")的实验反直觉——加入人工监督后,算法建议接受率从 66% 升到 73%,但预测准确率反而下降(误差 17.4 → 18.0 百分位),人类监督者"未能充当紧急制动器"。Budzyń et al.(Lancet Gastro & Hepatol, 2025)的肠镜研究显示长期用 AI 辅助后医生独立腺瘤检出率从 28.4% 跌到 22.4%——deskilling 是真实的。
- 正确做法:人审断点要稀疏且高杠杆(只设在 confidence 低 + 错误成本高的交叉点),并辅以"逼出 System 2"的设计(如要求审阅者先写一句独立判断再看 AI 建议,以削弱锚定)。

## §5 产品 PM 视角补盲

工程之外,三个容易看走眼的点:

- **用户心理模型:confidence 数字会被读成"承诺"。** 用户看到 92% 会理解为"基本不会错",一旦那 8% 出事,信任崩塌远比收益大(信任建立慢、崩塌快,见 [p305 - 信任架构与可解释性设计](/kb/产品设计与交互范式/p305-信任架构与可解释性设计/))。设计上宁可用"高/中/低"三档语义色,也别给精确小数——精确数字制造虚假精确感。
- **商业模式:审阅界面本身可能是付费点。** 当生产趋零,差异化在审阅体验。Cursor/Copilot 的逐 hunk 批准 UI 已成行业基准,Claude Code 的 VS Code 扩展曾因缺此功能被开发者提 issue(GitHub Issue #33932)。审阅界面是护城河,不是成本中心。
- **合规边界:门控阈值是可审计的责任分配。** 在受监管场景(安全、金融、医疗),"什么置信度以下必须人审"是合规要求而非 UX 偏好。EU AI Act 第 14 条要求高风险 AI 让用户知晓 automation bias,但 Laux & Ruschemeier(2025, European Journal of Risk Regulation)批评它只要求"知道有风险",不要求从设计上消除——意味着门控设计的举证责任落在产品方,日志要可追溯。这与 Rick 的安全 PM 本职直接相关。

## §6 对手框架回应

**接受 + 边界,不反驳。**

业界一种强势反方立场是 Satya Borg("Human Review is the Bottleneck", 2026)代表的"前移派":既然逐行审 diff 注定被淹("an agent's code hits you like a freight train at 1000 tok/sec"),那正确解不是优化审阅界面,而是把认知工作**前移到 spec 阶段**——审阅从"批判性读代码"变成"机械验证是否符合已批准的 spec"。

**接受它对的部分:** 是的,当输出量足够大,任何事后审阅界面都会被流量压垮;把验证锚定在 spec 上确实降低内在负荷、提升 System 2 的杠杆。本节点的 confidence + diff 解决不了"输出总量 > 人类带宽"的根本矛盾。

**但坚持的边界:** (1) spec 本身也是 AI 协助产出的,spec 也需要审阅——前移只是把瓶颈搬了个位置,没有消灭它;(2) 大量真实场景(分析报告、客服回复、设计稿)没有可形式化的 spec 可对照,confidence + diff 仍是唯一可落地的减负手段;(3) 即便走前移派,"机械验证是否符合 spec"这个动作本身,依然需要 diff(spec vs 产出)和 confidence(模型对"我符合 spec"的把握)。所以前移不是 confidence+diff 的替代,而是它的上游。我赌的是:**审阅界面与 spec 前移是互补的两层,而非二选一。**

## §7 跨域呼应:审阅 AI 报告是 verification 还是 rubber-stamping?

调度认识论资源(链入 0114认识论):**确证(justification)与盖章(endorsement)的区别。**

传统认识论里,一个信念要算"知识",需要被**辩护**——你得有理由相信它为真。但当 AI 以高置信、带引用的形式呈现一份报告,审阅者面临一个认识论陷阱:**citation 与 confidence 制造了"已被辩护"的外观,但审阅者并未真正执行辩护**。他点"通过"时,究竟是完成了 verification(独立检验了为真),还是仅仅 rubber-stamping(接受了"看起来已被辩护"的外观)?

这不是哲学清谈,它**直接决定 confidence display / citation / HITL 的设计**:

- 如果你认为审阅本质是 verification,那 citation 必须**可点击跳转、可反查**(让审阅者真的能去检验),confidence 必须校准(否则提供的是伪辩护);
- 如果你诚实承认大多数审阅会退化成 rubber-stamping(automation bias 是注意力的结构特征,Parasuraman & Manzey, 2010, Human Factors,证明训练无法消除),那设计目标就要变:不是"提供辩护材料",而是**用门控强制在关键点打断 System 1**,逼出一次真实的 verification。

Polanyi 的默会知识在这里也有一击([Polanyi 默会知识与提示工程的认识论张力](/kb/基础知识库/polanyi-默会知识与提示工程的认识论张力/)):审阅者判断"这段对不对"靠的常是说不清的领域直觉,而 confidence display 给的是显性数字——**显性的置信度无法替代默会的判断**。最危险的设计,是用一个精确的数字诱使审阅者放弃自己那套说不清但更可靠的直觉。这正是错位一的认识论根源。

## §8 PM 决策启示

- **面试怎么用:** 被问"怎么给 AI 产品加可信度",别答"加个信任分"。答:confidence 解决看哪里、diff 解决看什么,二者正交;且 confidence 未经校准是负资产;并能说出"加人审环节反而可能降准确率"(Sele & Chugunova 2024)——这一句直接把你和背 hype 的人区分开。
- **选型怎么用:** 评估 AI 工具时,问供应商三件事:置信度来自 logprobs / verbalized / 采样哪一种?门控阈值是否可调、是否在保留集上验证过?diff 是否带结构化标注?三个都答不上来的,它的"可信度"是 UI 化妆。
- **复现怎么用:** 拿本节骨架起步,但**第一件事是把 verbalized 占位换成真实 logprobs 或采样**,第二件事是把写死的 0.40 阈值做成可配置参数并在你自己的数据上验证。demo 验证界面,生产验证信号。

## §9 与已有节点的关系

- 对照 [p304 - 防御性 UX：对抗延迟与幻觉](/kb/产品设计与交互范式/p304-防御性-ux-对抗延迟与幻觉/):p304 提出"置信度外显需 logprobs 接口、纠错三件套(分段确认/行内编辑/局部重生成)"是**原则层**;本节点做**操作层落地**——给出 logprobs 的三条替代来源、一段能跑的代码、以及阈值如何验证。属"深化 + 补缺"。
- 对照 [p307 - Copilot 到 Autopilot 光谱](/kb/产品设计与交互范式/p307-copilot-到-autopilot-光谱/):p307 给 L0–L4 控制权框架;本节点论证 **confidence display 是爬升光谱的前提条件**,把抽象的"基于 logprobs 动态切换层级"做成具体的门控代码。属"对话 + 落地"。
- 对照 [c13 - 幻觉的不可消除性](/kb/基础知识库/c13-幻觉的不可消除性/):c13 论证幻觉架构性不可消除、校准失准;本节点把"校准失准"从理论变成一条工程纪律(verbalized 占位必须替换、需 temperature scaling)。属"补缺"——不复述 c13 的事实基础,只接它的结论。
- 对照 0114认识论:本节点把"审阅 = verification 还是 rubber-stamping"这个认识论问题落到 citation/HITL 的具体设计参数上,是认识论的**工程化落地**。

## §10 关联节点

**核心(必读)**
- [p304 - 防御性 UX：对抗延迟与幻觉](/kb/产品设计与交互范式/p304-防御性-ux-对抗延迟与幻觉/) — 本节点的原则母体
- [p305 - 信任架构与可解释性设计](/kb/产品设计与交互范式/p305-信任架构与可解释性设计/) — 信任校准目标、信任曲线不对称
- [p307 - Copilot 到 Autopilot 光谱](/kb/产品设计与交互范式/p307-copilot-到-autopilot-光谱/) — confidence 门控决定可爬到的控制层级
- [c13 - 幻觉的不可消除性](/kb/基础知识库/c13-幻觉的不可消除性/) — 校准失准是 confidence display 的认识论前提
- 0114认识论 — verification vs rubber-stamping 的辩护理论根

**延伸(可选)**
- [p302 - 七种 AI 交互设计模式](/kb/产品设计与交互范式/p302-七种-ai-交互设计模式/) — diff/confidence 作为交互模式的上位归类
- [p306 - 数据飞轮与反馈回路设计](/kb/产品设计与交互范式/p306-数据飞轮与反馈回路设计/) — 审阅时的接受/拒绝是高密度训练信号
- [m209 - 推理成本控制手册](/kb/工程化与落地架构/m209-推理成本控制手册/) — 一致性采样的 N 倍成本约束
- [Polanyi 默会知识与提示工程的认识论张力](/kb/基础知识库/polanyi-默会知识与提示工程的认识论张力/) — 显性置信度无法替代默会判断
- [Claude Code](/kb/ai-公司与产品/claude-code/) / [Perplexity](/kb/ai-公司与产品/perplexity/) — diff 审批 UI 与 citation 系统的现实参照
- [幻觉](/kb/基础知识库/幻觉/) [Test-Time Compute](/kb/基础知识库/test-time-compute/)


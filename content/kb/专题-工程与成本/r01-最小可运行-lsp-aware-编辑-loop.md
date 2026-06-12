---
title: R01 最小可运行·LSP-aware 编辑 loop
cluster: 专题 · 工程与成本
created: '2026-06-07'
updated: '2026-06-11'
provenance: ai
facet: 编程工具
---

# R01 最小可运行·LSP-aware 编辑 loop

**本节要解决的问题**：把一个 coding agent 从"黑箱魔法"还原成"四步可读循环"——读文件 → LLM 生成 patch → apply → 验证。能自己跑通这 80 行骨架的 PM，在选型会上听到任何厂商说"我们的 Agent 能自主改代码"时，脑子里会立刻浮现出那四个具体的失败点，而不是被 demo 视频牵着走。本节的视角是**复现优先于综述**：与其读十篇"Cursor 如何实现 instant apply"的二手解读，不如先跑通最朴素的版本,亲手撞上它的墙,再回头看商业产品为这堵墙付了什么工程代价。

## §0 为什么是"四步循环"框架，而不是"Agent 黑箱"框架

读者脑子里默认的框架往往是：coding agent = 一个很聪明的大模型 + 一些 prompt 魔法。这个框架会让你在选型时把注意力全放在"哪家模型 SWE-bench 分高"上——而 [c14 - 模型评估体系与 Goodhart 陷阱](/kb/基础知识库/c14-模型评估体系与-goodhart-陷阱/) 和本专题 E02 已经反复说明，那个数字早已被污染到不能直接信（OpenAI 2026-02-23 弃用 SWE-bench Verified，审计其困难子集发现 59.4% 题目测试有实质缺陷，来源：OpenAI blog "Why we no longer evaluate SWE-bench Verified"，2026-02-23）。

正确的框架是把 coding agent 拆成一个**确定性的控制循环（control loop / harness）+ 一个非确定性的 LLM 调用**。循环本身没有任何"智能"——它只是反复做四件可观测、可断点、可日志的事：

```
┌─────────────────────────────────────────────┐
│  1. READ    读取相关文件 → 拼进上下文           │
│  2. GENERATE LLM 生成一个结构化的 edit（patch）  │
│  3. APPLY    把 edit 落到磁盘（含失败回滚）       │
│  4. VERIFY   跑诊断/测试 → 失败则把错误喂回 (1)   │
└─────────────────────────────────────────────┘
                  ↑__________________│ (循环直到通过或耗尽预算)
```

为什么这个框架更对？因为它把"智能"和"工程"切开了。这正是本专题 [S03 Harness for Coding 全景](/kb/专题-工程与成本/s03-harness-for-coding-全景/) 的核心论点：商业 coding 工具之间真正的护城河，80% 在循环的第 2、3、4 步的工程实现上，而不在模型本身。一个佐证：相同模型仅改变 agent scaffold（脚手架）设计，SWE-bench Pro 分数可波动 22+ 个百分点（来源：particula.tech "Agent Scaffolding Beats Model Upgrades"；arXiv:2506.17208）。换句话说，循环写得好不好，比换没换更强的模型更能决定成败。本节就动手把这个循环写出来。

## §1 第一步 READ：上下文不是"把整个仓库塞进去"

新手第一反应是：既然模型有 1M token 上下文（[Claude Code](/kb/ai-公司与产品/claude-code/) 当前 Sonnet/Opus 系列均支持 1M，口径 2026-06），那就把整个仓库读进去最省事。这是错的，原因见本专题的 codebase understanding 节点：**长上下文存在非线性性能衰减（Context Rot）**。Chroma Research 对 18 个模型的系统测试显示，哪怕只加入单个无关干扰段，准确率即开始下降，且随上下文增长加速（来源：Chroma "Context Rot" research，2025）。极端案例里 Llama-3.1-8B 的 HumanEval 通过率在 30K tokens 处从 57.3% 跌到 9.7%（来源：arXiv:2510.05381）。

所以最小可运行版本的 READ 只做一件事：**只读被点名要改的那个文件**。这是刻意的——先体会"上下文喂得越精准越好"，再在 R02/R03 引入 repo map 和检索。

```python
from pathlib import Path

def read_target(path: str) -> str:
    """READ：只读目标文件，带行号——行号是后面 VERIFY 报错定位的锚点。"""
    src = Path(path).read_text(encoding="utf-8")
    numbered = "\n".join(f"{i+1:>4}  {line}"
                         for i, line in enumerate(src.splitlines()))
    return numbered
```

> [!note] 决策表：READ 策略随仓库规模变化
> | 场景 | READ 策略 | 依据 |
> |---|---|---|
> | 单文件 / 明确目标 | 全量读（本骨架） | 检索开销不值得 |
> | 中等仓库、目标已知 | Repo Map + 按需拉 | Aider 默认 1,000 token 的 map 预算（来源：Aider 官方文档） |
> | 大仓库、跨文件重构 | 结构型 RAG（图 + LSP） | 向量检索丢失调用关系 |
> | 多跳推理 / 影响面分析 | Agent + grep | arXiv:2603.20432：grep 优于被动向量检索 |

## §2 第二步 GENERATE：编辑格式的选择，是这个循环最被低估的决策

这是 90% 自己写循环的人会摔的第一跤：让模型"直接输出整个新文件"。看起来最简单，实则最脆。whole-file rewrite 的准确率只有 60–75%（来源：Morph "Edit Formats" 指南，自评数据，volatile〔以2026-06为准·待核实〕），且大文件会触发"中段遗忘"——模型在生成长文件时静默丢掉中间几十行，你甚至不会报错，只会在某次运行时发现一个函数凭空消失。

更糟的备选是让模型输出标准 unified diff（带行号的 patch）。模型对行号极度敏感，稍有偏移整个 patch 就 apply 失败（准确率 80–85%，同来源）。行业的收敛答案是 **search/replace block（精确字符串匹配）**：让模型输出"找到这段原文 → 替换成这段新文"，不依赖行号，比 whole-file 省 token。这个格式（`str_replace` 类）已成为 OpenHands、SWE-agent、Codex CLI 等多个主流 agent 的共同选择，准确率 84–96%（来源：Morph "Edit Formats" 指南，自评，volatile〔以2026-06为准·待核实〕）。

最小骨架用 search/replace，并强制模型走 [Function Calling](/kb/基础知识库/function-calling/) 的结构化输出，避免解析自由文本的痛苦。下面用 Anthropic SDK 演示（模型 id 占位，实际可用 Claude Sonnet 4.6，口径 2026-06）：

```python
import json
from anthropic import Anthropic

client = Anthropic()  # 读 ANTHROPIC_API_KEY 环境变量

EDIT_TOOL = {
    "name": "propose_edit",
    "description": "提出一处精确的 search/replace 编辑。search 必须逐字匹配文件中的现有片段。",
    "input_schema": {
        "type": "object",
        "properties": {
            "search":  {"type": "string", "description": "文件中现存的、需被替换的原文（逐字、含缩进）"},
            "replace": {"type": "string", "description": "替换后的新内容"},
            "rationale": {"type": "string", "description": "一句话说明为什么这么改"},
        },
        "required": ["search", "replace"],
    },
}

def generate_edit(path: str, numbered_src: str, task: str, last_error: str | None):
    """GENERATE：让模型基于任务（和上一轮报错）产出一个结构化 edit。"""
    user = f"任务：{task}\n\n文件 {path}（带行号，行号仅供你定位，不要写进 search）：\n{numbered_src}"
    if last_error:
        user += f"\n\n上一次修改后验证失败，报错如下，请修正：\n{last_error}"

    resp = client.messages.create(
        model="claude-sonnet-4-6",          # 口径 2026-06；实际 model id 请查 claude-api skill
        max_tokens=2048,
        tools=[EDIT_TOOL],
        tool_choice={"type": "tool", "name": "propose_edit"},  # 强制走工具，输出必结构化
        messages=[{"role": "user", "content": user}],
    )
    for block in resp.content:
        if block.type  "tool_use" and block.name  "propose_edit":
            return block.input  # {"search": ..., "replace": ..., "rationale": ...}
    return None
```

注意 `tool_choice` 强制模型必须调用工具——这把"解析模型自由发挥的 markdown 代码块"这一整类脏活直接消灭了。这是把不确定性收口在 schema 边界内的最小工程动作。

## §3 第三步 APPLY：必须可回滚，且必须验证 search 唯一匹配

APPLY 看似一行 `replace()`，但藏着两个必踩的坑。其一：search 片段在文件中出现了 0 次（模型记错了原文）或 >1 次（模型给的片段不够独特），二者都会让结果不可预测。其二：APPLY 之后才发现验证失败，没有回滚机制，文件就被改坏了。

```python
import shutil

def apply_edit(path: str, edit: dict) -> tuple[bool, str]:
    """APPLY：精确字符串替换，含唯一性检查与原子回滚。返回 (是否成功, 信息)。"""
    p = Path(path)
    original = p.read_text(encoding="utf-8")
    search, replace = edit["search"], edit["replace"]

    count = original.count(search)
    if count == 0:
        return False, f"search 片段未在文件中找到（模型记错了原文）"
    if count > 1:
        return False, f"search 片段出现 {count} 次，不唯一——拒绝盲目替换"

    backup = p.with_suffix(p.suffix + ".bak")
    shutil.copy2(p, backup)               # 备份，供回滚
    p.write_text(original.replace(search, replace), encoding="utf-8")
    return True, str(backup)

def rollback(path: str, backup: str):
    shutil.move(backup, path)             # 验证失败时恢复
```

这是商业产品花大钱解决的同一个问题。Cursor 的 **Speculative Edits** 把"开发者提供的原文件"当作 speculation，server 端找到与模型生成匹配的最长前缀、温度=0 确定性验证后再从断点续写，速度约 1,000 tok/s，比 vanilla Llama-3-70B 快约 13×（来源：Fireworks × Cursor 工程博文，2024）。Morph 的 **Fast Apply** 用 7B 专用模型 + 定制 CUDA kernel，号称 10,500 tok/s、准确率 98%（来源：Morph 产品页，自评，volatile〔以2026-06为准·待核实〕，无第三方独立 benchmark）。它们解决的本质就是本节这个 `apply_edit`——只是把"唯一匹配 + 快速 + 准确"做成了一个独立的推理基础设施。本骨架用最朴素的 `str.count() + replace()` 替代，先跑通，再理解它们为什么值钱。这是 [m208 - AI 基础设施与中间件选型](/kb/工程化与落地架构/m208-ai-基础设施与中间件选型/) 视角下的典型"自建 vs 买"决策点。

## §4 第四步 VERIFY：LSP-aware 是这个循环从"玩具"迈向"可用"的分水岭

到这里循环已经能跑。但若 VERIFY 只是"跑一遍测试"，你会发现循环极慢且经常在低级错误上打转——模型改完代码后引入了一个未定义变量、漏 import、类型不匹配，这些本可以在编译/类型检查阶段秒级发现，却要等整个测试套件跑完才暴露。

**LSP-aware 的意思是：在 VERIFY 阶段先问语言服务器（Language Server）要诊断，再跑测试。** LSP（Language Server Protocol）能给出纯字符串检索做不到的东西：跨文件引用、类型感知诊断、符号重命名的语义保证。[Claude Code](/kb/ai-公司与产品/claude-code/) 于 2025-12 接入原生 LSP，覆盖 12+ 语言，能像 IDE 一样看到符号/定义/引用/类型/诊断（来源：Hacker News "Claude Code gets native LSP support"，2025-12；Anthropic claude-plugins-official 文档）——注意它**默认关闭**，需在 `~/.claude/settings.json` 加 `ENABLE_LSP_TOOL` 开启。一个值得 PM 记住的细节：José Valim 公开指出，原始 LSP API 对 agent 并不友好，因为多数接口要求传 `file:line:column`，agent 无法直接问"Foo#bar 定义在哪"（来源：José Valim on X，2025-12）——这恰恰是新兴 LSAP（Language Server Agent Protocol）要解决的：把 LSP 低级操作包装成 agent 可调用的高级认知工具；ACP（Agent Client Protocol）则像 LSP 解耦编辑器与语言服务器那样解耦 IDE 与 AI agent（来源：LSAP GitHub；ACP 博文 promptlayer）。

完整 LSP 客户端实现复杂（JSON-RPC over stdio），最小骨架退一步：用现成的命令行诊断器（Python 的 `pyflakes`/`ruff`、TS 的 `tsc --noEmit`）作为"LSP 的廉价代理"，先拿到语义级反馈，再跑测试。这一步抓住了 LSP-aware 的精髓——**让验证分层：先语义诊断（秒级、便宜），后行为测试（慢、贵）**。

```python
import subprocess

def verify(path: str) -> tuple[bool, str]:
    """VERIFY：先 LSP 风格诊断（快），再测试（慢）。任一失败即返回错误文本喂回循环。"""
    # 第一层：语义诊断——LSP 的廉价代理（此处用 ruff 静态检查 Python）
    diag = subprocess.run(["ruff", "check", path],
                          capture_output=True, text=True)
    if diag.returncode != 0:
        return False, f"[诊断失败]\n{diag.stdout}\n{diag.stderr}"

    # 第二层：行为测试
    test = subprocess.run(["pytest", "-q", "--no-header"],
                          capture_output=True, text=True)
    if test.returncode != 0:
        return False, f"[测试失败]\n{test.stdout[-2000:]}"  # 截断，避免上下文爆炸

    return True, "全部通过"
```

### 把四步拼成主循环

```python
def coding_loop(path: str, task: str, max_iters: int = 5):
    last_error = None
    for it in range(1, max_iters + 1):
        print(f"--- 第 {it} 轮 ---")
        numbered = read_target(path)                         # 1. READ
        edit = generate_edit(path, numbered, task, last_error)  # 2. GENERATE
        if edit is None:
            return "模型未产出 edit，放弃"
        ok, info = apply_edit(path, edit)                    # 3. APPLY
        if not ok:
            last_error = f"apply 失败：{info}"
            continue
        passed, msg = verify(path)                           # 4. VERIFY
        if passed:
            Path(info).unlink(missing_ok=True)               # 删备份，成功
            return f"第 {it} 轮通过：{edit.get('rationale','')}"
        rollback(path, info)                                 # 失败回滚
        last_error = msg                                     # 错误喂回下一轮
    return f"耗尽 {max_iters} 轮预算仍未通过"
```

这 80 行就是一个 coding agent 的全部骨骼。Aider（开源，MIT，GitHub 33,000+ stars，来源：aiagentslist.com，口径约 2026 上半年）本质上就是这个循环加上 repo map、git 自动提交、多 LLM 后端；它"自动运行 lint/test、失败自动修复"的功能，正是上面 VERIFY → last_error → 下一轮 GENERATE 的工程化。

## §5 判断主轴：搭这个循环时 90% 的人会踩的四个坑

这一节是本节点的命门——每个坑给"症状 → 为什么错 → 正确做法 → 真实反例"。

**坑 1：把"上下文越多越好"当真理。**
- 症状：循环跑得越久越笨，到后期改对一个简单 bug 都要好几轮。
- 为什么错：误以为模型注意力对长上下文均匀有效。实则 Context Rot 让无关上下文成为干扰项，越堆越糊。
- 正确做法：READ 阶段精准供给；失败的错误信息要截断（见 `verify` 里的 `[-2000:]`），不要把整段 stack trace 全喂回去。
- 真实反例：arXiv:2603.20432（2026-03）发现给 coding agent 额外配 RAG 检索工具**并不稳定提升性能、有时反而降低**——agent 会减少更有效的 grep 而依赖向量检索，导致策略退化。"加更多上下文工具"不等于"更聪明"。

**坑 2：用 whole-file rewrite 或行号 diff 做编辑格式。**
- 症状：apply 频繁失败，或文件被改得缺胳膊少腿却不报错。
- 为什么错：whole-file 触发中段遗忘且 token 爆炸；行号 diff 对偏移极度脆弱。
- 正确做法：用 search/replace 精确字符串块，并在 APPLY 强制唯一匹配检查。
- 真实反例：行业从早期 SWE-agent 的 diff 方案集体迁移到 `str_replace_editor`，正是因为 diff 准确率（80–85%）显著低于 search/replace（84–96%）（来源：Morph "Edit Formats" 指南，volatile〔以2026-06为准·待核实〕）。

**坑 3：VERIFY 只跑测试，不做语义诊断。**
- 症状：循环慢且贵，模型反复在"漏 import / 未定义变量"这种低级错误上消耗轮次。
- 为什么错：把昂贵的行为测试当成唯一反馈源，浪费了语言服务器秒级、廉价的语义反馈。
- 正确做法：分层验证——先 LSP/静态诊断，后测试。这就是 LSP-aware 的全部意义。
- 真实反例：Claude Code 2025-12 接入原生 LSP 做每次编辑后自动诊断（版本号〔待核实〕），正是承认"测试是必要但不充分的反馈"。

**坑 4：APPLY 不可回滚、不设迭代预算。**
- 症状：循环把工作区改坏后无法恢复；或陷入死循环烧光 token 预算。
- 为什么错：把非确定性的 LLM 输出当成可信的确定性操作，没有防御性工程。
- 正确做法：APPLY 前备份、失败即回滚；主循环设 `max_iters` 硬熔断。
- 真实反例：RedMonk 2025-12 调研列出开发者对 agentic IDE 的第 9 大诉求就是"回滚能力（检查点 + 即时回滚）"，并引 Denis Volkhonskiy："回滚通常更好——节省 token 并减少幻觉"（来源：RedMonk，Kara Holterhoff，2025-12-22）。GitHub Copilot CLI 的 `--max-autopilot-continues` 就是同一个熔断思路（来源：GitHub Docs，WebFetch 2026-06-07）。

## §6 产品 PM 视角补盲：循环之外，用户不会原谅的三件事

工程 PM 容易只盯循环正确性，但用户的弃用往往来自循环之外：

1. **非确定性焦虑**：同一个问题问两次得到不同 patch，破坏用户的心理模型。BNY Mellon + GitHub Copilot 混合研究（n=2,989 问卷 + 11 访谈，2026-06）把"非确定性输出"列为破坏心流的具体途径之一。最小循环的 `tool_choice` 强制 + 温度控制是缓解第一步。
2. **确认疲劳**：若每一步 APPLY 都弹窗要批准，用户会麻木点"同意"。Anthropic 工程博客（2026-03-25）实测用户批准了 93% 的权限请求——手动审查已沦为橡皮图章。但其 auto mode 分类器危险动作漏报率仍有 17%（来源：同博客）。这说明"自动化审批"不是免费午餐。
3. **稳定性先于功能**：RedMonk 2025 明确指出，2025 年信任侵蚀的主因是服务不稳定（延迟、崩溃、模型过载），而非功能不足——"开发者要的不是惊艳 demo，是生产负载下稳定运行的工具"。这正好接住本节结尾的陷阱。

## §7 对手框架回应：接受"专用基础设施"，但坚持"先跑通朴素循环"的边界

**业界反方立场（Morph / Cursor / Relace）**：你这个 `str.count() + replace()` 的 APPLY 太慢太糙，真实产品必须上 Fast Apply 专用模型（98% 准确率、万级 tok/s）才有竞争力。

**接受的部分**：完全同意——在交互式编辑、用户盯着光标等结果的延迟敏感场景，专用 apply 模型的 100× 速度优势是决定性的。本骨架在那种场景确实不能用。

**坚持的边界**：但有两点。其一，那些 98%/10,500 tok/s 全是**厂商自评数据，缺乏第三方独立 benchmark**（本专题争议点已列），PM 不能直接当确证事实写进选型报告。其二，在**延迟不敏感的批量/异步任务**（后台 agent、CI 里的自动修复）场景，专用模型的速度优势不具决定性——朴素 search/replace 完全够用，还省掉一整套基础设施依赖。这正是 [m208 - AI 基础设施与中间件选型](/kb/工程化与落地架构/m208-ai-基础设施与中间件选型/) 的"自建够用 vs 必须买"判断：先用本骨架跑通你的真实任务，测出 apply 失败率，**用数据决定值不值得引入 Fast Apply**，而不是被"别人都用了"裹挟。

**Rick 未读对手框架引入(认识论张力)**：这个循环把"理解代码"外包给了一个无法言说其推理过程的模型，呼应 [Polanyi 默会知识与提示工程的认识论张力](/kb/基础知识库/polanyi-默会知识与提示工程的认识论张力/)——Polanyi 的"我们知道的比能说出来的多"在这里反转成"模型能改的比它能解释的多"。`rationale` 字段是一种认识论补偿：强制模型把默会的修改意图显式化，但这份解释本身仍可能是事后编造的合理化（post-hoc rationalization）。这提醒 PM：循环的可观测性（每步日志）比模型的自我解释更可信。

## §8 PM 决策启示

- **面试怎么用**：被问"你怎么理解 coding agent"，不要背 SWE-bench 分数。画出这四步循环，指出"护城河在 2/3/4 步的工程，不在模型"——这是 [S03 Harness for Coding 全景](/kb/专题-工程与成本/s03-harness-for-coding-全景/) 的判断，能立刻区分你和只会念产品文档的候选人。Rick 的 Claude Code 深度使用经验在这里是一手素材：能讲清 acceptEdits/plan/auto 各模式对应循环里哪一步的人工介入点。
- **选型怎么用**：让候选工具暴露它在坑 2（编辑格式）、坑 3（验证分层）、坑 4（回滚/熔断）上的具体实现。问不出来的，多半是套壳。
- **复现怎么用**：本骨架是 R02（中型生产：加 repo map + 多文件 + git）和 R03（进阶模板：subagent + LSP 全协议）的地基。先跑通它，再读那两节才有体感。

## §9 与已有节点的关系

- 对 **[c10 - Agent 技术栈与工具调用](/kb/基础知识库/c10-agent-技术栈与工具调用/)**（基础库 G3 截面快照）做**深化**：c10 讲"Agent 有哪些工具调用类型"，本节把"文件编辑工具"这一类拆到可运行代码层，是从"知道有这个工具"到"知道这个工具内部怎么失败"的升级，不复述 c10 的工具分类基础。
- 对 **[m207 - Agent 产品化：场景推演与失败模式](/kb/工程化与落地架构/m207-agent-产品化-场景推演与失败模式/)** 做**对话**：m207 讲产品级失败模式，本节把其中"编辑应用失败""验证缺失"两类失败追溯到循环的具体步骤，给 m207 的抽象失败模式一个可复现的最小现场。
- 对本专题 **[S03 Harness for Coding 全景](/kb/专题-工程与成本/s03-harness-for-coding-全景/)** 做**操作化落地**：S03 论证"护城河在 harness"，本节是那个论证的"可跑代码证据"。

## §10 关联节点

**核心（必读）**
- [S03 Harness for Coding 全景](/kb/专题-工程与成本/s03-harness-for-coding-全景/) —— 本节是其"护城河在循环工程"论点的代码证据
- [c10 - Agent 技术栈与工具调用](/kb/基础知识库/c10-agent-技术栈与工具调用/) —— 工具调用基础，本节深化其文件编辑工具
- [m207 - Agent 产品化：场景推演与失败模式](/kb/工程化与落地架构/m207-agent-产品化-场景推演与失败模式/) —— 失败模式的最小复现现场
- [m208 - AI 基础设施与中间件选型](/kb/工程化与落地架构/m208-ai-基础设施与中间件选型/) —— Fast Apply 自建 vs 买的决策框架
- [Claude Code](/kb/ai-公司与产品/claude-code/) —— 本骨架的成熟形态参照（权限模式、LSP 集成）
- [Function Calling](/kb/基础知识库/function-calling/) —— GENERATE 步强制结构化输出的机制
- [c14 - 模型评估体系与 Goodhart 陷阱](/kb/基础知识库/c14-模型评估体系与-goodhart-陷阱/) —— 为什么不能只看 SWE-bench 选模型

**延伸（可选）**
- [Polanyi 默会知识与提示工程的认识论张力](/kb/基础知识库/polanyi-默会知识与提示工程的认识论张力/) —— rationale 字段的认识论补偿
- [c11 - System 2 思维与 Test-Time Compute](/kb/基础知识库/c11-system-2-思维与-test-time-compute/) —— 循环迭代 = 一种 test-time 推理
- [Claude](/kb/ai-公司与产品/claude/) / [Anthropic](/kb/ai-公司与产品/anthropic/) —— 骨架使用的 SDK 与模型提供方
- [Agent](/kb/基础知识库/agent/) —— 上位概念卡
- [RAG](/kb/基础知识库/rag/) —— READ 步在大仓库场景的延伸（R02/R03）

## 结尾陷阱：demo ≠ 生产——这 80 行能跑通的，离能交付差三个数量级

这个循环能在你的玩具仓库里跑通，甚至能修几个真 bug，于是很容易产生"我做出了一个 coding agent"的错觉。这是本节最危险的地方，必须显式拆穿：

**demo 跑通 ≠ 生产可用，中间隔着至少三道墙。**

第一道墙是**分数崩塌**。SWE-bench Verified 上 80% 的模型，到抗污染的 SWE-bench Pro 上掉到 23%（Claude Opus 4.5：80.9% → 45.9%，差 35 个百分点；来源：MorphLLM / CodeAnt，2026-04，榜单 volatile〔以2026-06为准·待核实〕）。你的 demo 仓库就是那个"已被训练数据见过、bug 孤立、改动 <2 个函数"的简单世界；生产代码是私有的、跨 10–30 文件的、需求模糊的。

第二道墙是**生产指标反转**。METR 的随机对照试验（n=16 资深开发者，246 任务，arXiv:2507.09089，2025）发现 AI 辅助让任务完成时间**增加 19%**，而开发者自我感知是"快了 20%"——感知与实测方向相反。Faros AI 生产数据显示高采用团队 PR 数 +98% 的同时，bug/人 +9%、审查时间 +91%（来源：Faros AI，via TianPan.co，2026-04）。你的 demo 不会告诉你这些下游成本。

第三道墙是**循环本身的可靠性税**。本骨架省略了：并发文件冲突、多文件原子提交、长任务的上下文压缩、prompt injection 防御（auto mode 漏报率 17%）、成本预算控制、以及最要命的——**当模型连续多轮都改不对时如何优雅地停下并把控制权交还人类**。Anthropic 把 auto mode 明确标为 "research preview"，官方措辞是"reduces prompts but does not guarantee safety"。连他们都不敢说保证安全。

所以：把这 80 行当成**理解工具、而非交付工具**。它的价值是让你在听到任何"我们的 Agent 全自动修复线上 bug"的宣传时，脑子里立刻浮现那四个步骤和四个坑，然后冷静地问一句——"给我看你的 SWE-bench Pro 分数、你的回滚机制、和你的生产 bug 引入率。"这就是这一节真正想给 PM 的东西。

---

## 修订日志

- **R1（2026-06-07）**：初稿。建立四步循环骨架（READ/GENERATE/APPLY/VERIFY），给出可运行 Python 代码；§5 四坑判断主轴（含真实反例）；§7 对 Fast Apply 厂商的"接受+边界"回应；结尾三道墙 demo≠生产陷阱。
- **R1.1（2026-06-07）**：WebSearch 核实 §4 LSP 段——确认 Claude Code 原生 LSP 于 2025-12 上线、覆盖 12+ 语言、默认关闭（需 `ENABLE_LSP_TOOL`），移除未核实的版本号 v2.0.74；补入 José Valim 关于 LSP API 对 agent 不友好的一手观察（强化 LSAP 论点）。剩余待核实项：Morph/Cursor 自评速度与准确率数字（厂商自评，volatile，无第三方 benchmark）；SWE-bench 榜单分数（volatile，2026-06 口径）；编辑格式准确率区间（Morph 自评）。

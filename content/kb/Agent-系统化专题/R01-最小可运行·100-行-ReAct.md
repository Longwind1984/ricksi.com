---
title: R01 最小可运行·100 行 ReAct
cluster: Agent 系统化专题
created: '2026-05-18'
updated: '2026-05-18'
---

# R01 最小可运行·100 行 ReAct

> 一句话：本节点的目标是让你在 30 分钟内,用不超过 120 行 Python 代码,在本地跑起一个真正的 [A03 ReAct](/kb/Agent-系统化专题/A03-ReAct/) Agent,亲眼看到 thought / action / observation 三段循环、感受 token 的累积速度,并在每一段代码旁标注它属于 [S01 Agent 六层架构剖面](/kb/Agent-系统化专题/S01-Agent-六层架构剖面/) 的哪一层。这是把 Agent 从"PPT 概念"落到"会出 bug 的程序"的最短路径。

## 1. 复现目标

我们要构建一个能回答这类问题的 Agent:

> "今天北京天气如何,要不要带伞?"

它必须自己决定:先调 `get_weather`,再调 `get_current_time`(假设我们关心是早上还是傍晚的预报),综合两个 observation,给出一句中文回答。

约束:

- 必须真正循环(不是一次 [Function Calling](/kb/AI-基础知识库/Function-Calling/) 就结束)
- 必须有 `max_steps` 防止无限循环(链入 m207 - Agent 产品化:场景推演与失败模式 的"循环失控"失败模式)
- 必须把每一步的 thought 打印出来(否则 debug 不了)
- 不超过 120 行 Python(含空行注释)

不做的事:

- 不做 reflection、不做 planner-executor 拆分(那是 G3+,见 [G02 五代演化详解·G1-G5](/kb/Agent-系统化专题/G02-五代演化详解·G1-G5/))
- 不做流式输出
- 不做异步并发
- 不接 MCP(R02 才接)

## 2. 环境准备

```bash
# 方案 A：用 Anthropic Claude（推荐，原生 tool_use 支持最稳）
pip install anthropic python-dotenv requests

# 方案 B：用 OpenAI
pip install openai python-dotenv requests

# 方案 C：用 Rick 的 DeepSeek（兼容 OpenAI SDK，最便宜）
pip install openai python-dotenv requests
```

API key 来源(选其一):

- **Anthropic**: <https://console.anthropic.com/> 申请(免费额度政策随时间变化,2026-05 通常需绑定支付方式才能调用;具体以 Console 上的提示为准)
- **DeepSeek**: 见 Rick 的备忘录 DeepSeek API Key,兼容 OpenAI SDK,价格约为 Claude Sonnet 的 1/20
- **OpenAI**: <https://platform.openai.com/api-keys>

把 key 写入项目根目录的 `.env`:

```bash
# .env 文件
ANTHROPIC_API_KEY=sk-ant-xxxxx
# 或
DEEPSEEK_API_KEY=sk-xxxxx
```

天气数据源使用 `wttr.in`,无需 API key,直接 HTTP GET 即可——这是 [c10 - Agent 技术栈与工具调用](/kb/AI-基础知识库/c10-Agent-技术栈与工具调用/) 强调的"工具设计第一原则:能用 stateless HTTP 就不要 stateful SDK"的现成案例。

## 3. 完整代码

下面是 `react_agent.py` 全文,共 113 行,可直接复制运行:

```python
"""
R01 最小可运行 ReAct Agent
约束：单文件 < 120 行；只依赖 anthropic + requests；可真正循环。
"""
import json
import os
import sys
import requests
from datetime import datetime
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()
if not os.environ.get("ANTHROPIC_API_KEY"):
    sys.exit("请先在 .env 中设置 ANTHROPIC_API_KEY 后再运行")
client = Anthropic()  # 自动读取 ANTHROPIC_API_KEY

# Anthropic model_id 随版本变化,以官方文档 https://docs.anthropic.com/en/docs/about-claude/models 为准。
# 截至 2026-05,公开可调用别名包含 claude-sonnet-4-5、claude-opus-4-5、claude-haiku-4-5;
# 若你的账号已开通 Sonnet 4.6 / Opus 4.7,把 default 改成 claude-sonnet-4-6 / claude-opus-4-7 即可。
MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-5")  # 平衡成本与能力；R01 不需要 Opus
MAX_STEPS = 6  # 防呆：6 步还没结束就强制收尾，避免循环失控
SYSTEM = (
    "你是一个谨慎的中文助手。必要时调用工具；"
    "一次只调一个工具；拿到足够信息就直接回答用户，不要再调工具。"
)

# ---------- ① 工具实现 ----------（属于 S01 第 6 层：环境/工具）
def get_weather(city: str) -> dict:
    """调 wttr.in 免费天气 API；返回结构化 dict 而非裸字符串，
    便于模型解析（裸字符串会让模型再 parse 一次，浪费 token）。"""
    try:
        r = requests.get(f"https://wttr.in/{city}?format=j1", timeout=10)
        r.raise_for_status()
        d = r.json()["current_condition"][0]
        return {
            "city": city,
            "temp_c": d["temp_C"],
            "desc": d["lang_zh"][0]["value"] if "lang_zh" in d else d["weatherDesc"][0]["value"],
            "precip_mm": d["precipMM"],
            "humidity": d["humidity"],
        }
    except Exception as e:
        # 工具自身要捕获异常并返回结构化错误，让模型有机会重试或换思路
        return {"error": str(e), "city": city}

def get_current_time() -> dict:
    """本地时间；之所以单独做工具，是为了让 Agent 学会"组合工具"。"""
    now = datetime.now()
    return {"iso": now.isoformat(), "hour": now.hour, "weekday": now.strftime("%A")}

TOOL_REGISTRY = {"get_weather": get_weather, "get_current_time": get_current_time}

# ---------- ② 工具 Schema ----------（属于 S01 第 4 层：工具协议）
TOOLS = [
    {
        "name": "get_weather",
        "description": "查询指定城市当前天气，返回温度/天气描述/降水量/湿度",
        "input_schema": {
            "type": "object",
            "properties": {"city": {"type": "string", "description": "城市拼音或英文名"}},
            "required": ["city"],
        },
    },
    {
        "name": "get_current_time",
        "description": "获取本地当前时间（小时/星期）",
        "input_schema": {"type": "object", "properties": {}},
    },
]

# ---------- ③ ReAct 主循环 ----------（属于 S01 第 2 层：编排/控制）
def run(user_query: str) -> str:
    messages = [{"role": "user", "content": user_query}]  # 第 3 层：上下文
    for step in range(MAX_STEPS):
        print(f"\n--- step {step+1} ---")
        resp = client.messages.create(
            model=MODEL, max_tokens=1024, system=SYSTEM, tools=TOOLS, messages=messages
        )
        # 第 1 层：模型推理在 resp 中体现
        # 关键：把模型本轮的所有 block（含 thought 文本 + tool_use）整体回灌
        messages.append({"role": "assistant", "content": resp.content})

        # 终止条件 1：模型自己决定不再调工具
        if resp.stop_reason == "end_turn":
            final = "".join(b.text for b in resp.content if b.type == "text")
            print(f"[FINAL] {final}")
            return final

        # 收集本轮所有 tool_use，逐个执行并把 tool_result 拼回 messages
        tool_results = []
        for block in resp.content:
            if block.type == "text":
                print(f"[THOUGHT] {block.text.strip()}")
            elif block.type == "tool_use":
                print(f"[ACTION] {block.name}({json.dumps(block.input, ensure_ascii=False)})")
                fn = TOOL_REGISTRY.get(block.name)
                obs = fn(**block.input) if fn else {"error": "unknown tool"}
                print(f"[OBS] {json.dumps(obs, ensure_ascii=False)[:200]}")
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(obs, ensure_ascii=False),
                })
        messages.append({"role": "user", "content": tool_results})

    # 终止条件 2：达到 max_steps 仍未收敛，强制收尾
    return "[STOP] 达到最大步数，未能完成。考虑：拆分子任务 / 优化 prompt / 增加工具。"

if __name__ == "__main__":
    print(run("今天北京天气如何,要不要带伞?"))
```

运行:

```bash
python react_agent.py
```

期望输出形如:

```text
--- step 1 ---
[THOUGHT] 用户想知道北京今天的天气和是否需要带伞。我先查北京天气...
[ACTION] get_weather({"city": "Beijing"})
[OBS] {"city": "Beijing", "temp_c": "22", "desc": "晴", "precip_mm": "0.0", ...}

--- step 2 ---
[THOUGHT] 降水量是 0,且天气晴朗,不需要带伞。我可以直接回答了。
[FINAL] 北京当前 22°C 晴朗,降水量 0mm,不需要带伞。
```

## 4. 六层架构映射

把上面的代码切片到 [S01 Agent 六层架构剖面](/kb/Agent-系统化专题/S01-Agent-六层架构剖面/):

| 层 | 代码位置 | 含义 |
|---|---|---|
| 1. 模型推理 | `client.messages.create(...)` 一行 | 这一行决定了 Agent 智力上限,换模型基本只动这里 |
| 2. 编排/控制 | `for step in range(MAX_STEPS): ...` | ReAct 循环本身;G3+ 这里会被替换成 LangGraph 状态机(见 [R02 中型生产·LangGraph + MCP](/kb/Agent-系统化专题/R02-中型生产·LangGraph-+-MCP/)) |
| 3. 上下文/记忆 | `messages` 列表 + `system` 字段 | R01 只有"对话记忆";没有持久化(没有 vector store、没有 KV cache 显式管理),链入 [c10 - Agent 技术栈与工具调用](/kb/AI-基础知识库/c10-Agent-技术栈与工具调用/) 的记忆四分类 |
| 4. 工具协议 | `TOOLS` 列表(JSON Schema) | 这就是 [Function Calling](/kb/AI-基础知识库/Function-Calling/) 的"声明";[A08 MCP 与 A2A 协议族](/kb/Agent-系统化专题/A08-MCP-与-A2A-协议族/) 是它的协议化升级 |
| 5. 安全/治理 | `MAX_STEPS` + `try/except` | 极简版;生产里还要加 rate limit、PII 过滤、审计日志 |
| 6. 环境/工具 | `get_weather` / `get_current_time` 函数体 | 真正"动手"的代码;一切外部世界交互都在这一层 |

这个映射的意义不在于"分类游戏",而是当出问题时你知道去哪一层 debug——这是 R01 这一份代码作为"教学样本"最关键的功能。

## 5. 扩展挑战(自测)

跑通上面 113 行之后,可以按难度阶梯升级:

### 挑战 A:加 reflection 让它变 G3

在循环末尾加一段:模型每输出一次 `[FINAL]` 后,再问它一句"请反思你这次回答是否充分回应了用户;若有遗漏,列出补救步骤"。如果反思结果包含"需要补救",则把补救步骤当成新的 user query 再跑一轮。这就是 [A04 Reflexion](/kb/Agent-系统化专题/A04-Reflexion/) 的最小化形态。

### 挑战 B:加 RAG 检索工具

注册第三个工具 `search_docs(query: str)`,内部用 [Embedding](/kb/AI-基础知识库/Embedding/) + 余弦相似度(或调一次 [Perplexity](/kb/AI-公司与产品/Perplexity/) API)。这就跨进了 [c09 - RAG 架构](/kb/AI-基础知识库/c09-RAG-架构/) 的领地。

### 挑战 C:换成 MCP server

把 `get_weather` 改成 MCP server,Agent 通过 `mcp` Python SDK 连接。这一步会把 R01 的"硬编码工具表"升级为"运行时发现工具",是从 G3 走向 G5 的关键节奏——但请等到 [R02 中型生产·LangGraph + MCP](/kb/Agent-系统化专题/R02-中型生产·LangGraph-+-MCP/) 一起做,因为单加 MCP 而不上状态机,工程意义不大。

## 6. PM 学到了什么

> **这一节的认识论基础是 [Polanyi 默会知识与提示工程的认识论张力](/kb/AI-基础知识库/Polanyi-默会知识与提示工程的认识论张力/)**——Agent 工程的真正难度大量驻留在"默会知识"里：token 累积的速度、prompt 漂移的方向、工具调用失败的特定 pattern——这些知识无法被任何 PPT 文档化，只能在亲手跑 100 行代码时获得。R01 不是"练习"，是 Polanyi 意义上的"通过身体获取知识"——focal awareness（可言说的代码规则）只是入口，subsidiary awareness（构成判断但不可言说的体感）才是真正的资产。

跑完这 113 行,你会在体感上理解四件 PPT 永远讲不清的事:

### 6.1 一次工具调用的真实 token 成本

跑 step 1 时打印一下 `resp.usage`,你会看到约 700 input + 60 output token;但 step 2 时 input 突涨到 1400(因为 step 1 的 thought + tool_result 都进了上下文)。这就是为什么 [c10 - Agent 技术栈与工具调用](/kb/AI-基础知识库/c10-Agent-技术栈与工具调用/) 的"复合错误数学"会顺带产生"复合 token 数学":每多一步,前面所有步骤都要被重新喂一遍。一个 10 步 ReAct 的实际成本不是 10 × 单步,而是接近 55 × 单步(三角数累加),这是 [m209 - 推理成本控制手册](/kb/AI-工程化与落地架构/m209-推理成本控制手册/) 谈 [KV Cache](/kb/AI-基础知识库/KV-Cache/) 优化时的根本动因。

### 6.2 失败时的具体表现(不是 PPT 里写的"鲁棒性")

故意把网线拔了再跑一次,你会观察到三种失败模式:

- 模式 1:模型坚持把 `{"error": "..."}` 当成天气数据,胡说"今天北京是 error 度"——[幻觉](/kb/AI-基础知识库/幻觉/) 的工具调用版
- 模式 2:模型反复重试同一个失败的工具,直到 `MAX_STEPS` 触发——循环失控
- 模式 3:模型给出"我无法访问天气服务,建议您手动查询",这是健康的失败

三种模式的差异不在模型能力,而在 `system prompt` 的两句话——具体到哪句话,你跑两次就清楚了。这是 [m201 - Prompt Engineering 实战体系](/kb/AI-工程化与落地架构/m201-Prompt-Engineering-实战体系/) 在 Agent 语境里的真正用武之地。

### 6.3 为什么"100 行"是个有意义的里程碑

100 行能跑通 = 你掌握了 G2 [A03 ReAct](/kb/Agent-系统化专题/A03-ReAct/) 的全部本质。剩下从 100 行到 100 万行(Claude Code、Manus、Cursor)的工程量,99% 在解决"上下文怎么不爆"、"工具怎么不打架"、"失败怎么不雪崩"——而不在"如何让 Agent 更聪明"。这是 m207 - Agent 产品化:场景推演与失败模式 反复强调的"Agent 工程的真正难点在边角而不在主路"。

### 6.4 何时换车

如果你跑 R01 时已经在想"这个 messages 列表能不能存到 Redis,中断后能不能续传,有没有可视化",那就是该升级到 [R02 中型生产·LangGraph + MCP](/kb/Agent-系统化专题/R02-中型生产·LangGraph-+-MCP/) 的信号。R01 的目的不是给你工程模板,是给你**判断何时需要工程模板的体感**。

### 6.5 亲手验证了 [A03 ReAct](/kb/Agent-系统化专题/A03-ReAct/) § 五的哪些弱点

跑完 R01 之后，回到 [A03 ReAct](/kb/Agent-系统化专题/A03-ReAct/) § 五"四个已被验证的弱点"，做一次对照清点：

- **弱点 1：单循环深度有限**（10 步 × 95% = 60%）→ **已亲手验证**：把 MAX_STEPS 改成 15 + 让模型连续多次失败工具调用，能看到 trajectory 越长越漂移。
- **弱点 2：无反思机制** → **部分验证**：R01 故意不做 reflection，跑完后你会感受到"失败后只能重跑"的痛苦——这是为什么 G3 [A04 Reflexion](/kb/Agent-系统化专题/A04-Reflexion/) 必然出现的体感动机。
- **弱点 3：长 trajectory 漂移** → **部分验证**：可通过把 MAX_STEPS 改成 15、强制让模型多走几步触发"内卷思考"。
- **弱点 4：Thought 可被绕过** → **未验证**（需要做 RLHF 后续测试或 thinking budget 实验，不在 R01 范围；留给 R02 用 Extended Thinking 模型时观察）。

**这就是 R01 不只是"练习"、而是 A03 论断的"实验验证"**——读 A03 时是 focal awareness（知道有这四个弱点）；跑完 R01 后是 subsidiary awareness（你"知道"什么时候这些弱点会触发，但说不全清楚）。

### 6.6 R01 的三个特有失败模式:单 Agent 在生产的硬边界

> R01 是 G2 ReAct 的最小骨架。当你把它推到生产,**会率先触发三个单 Agent 才有的失败模式**——它们和 R02 状态机 / R03 multi-agent 的失败模式完全不同。如果你把"跑通"等同于"懂了",这三处是最先反咬你的地方。

**失败模式 1: 无状态 → 进程一断,会话归零**

R01 把所有上下文塞在一个进程内的 `messages` 列表里。**进程一退出,trajectory 蒸发,用户的工作流也蒸发**。R02 用 SqliteSaver / PostgresSaver 把状态显式外置,R01 没有——这不是"可以加",是"加了就不再是 R01 了"。

生产里的直接代价:Rick 跑一个 5 步 trajectory 中途崩溃 / 重启 / 切环境,只能从头跑一次。**应对**:在调用 R01 之前先识别"这个任务是否一次跑完",如果是任何会话型 / 长流程 / 多次交互的场景,**不要用 R01 范式,直接上 R02**。

**失败模式 2: 无反思 → 失败只能重跑,无法纠错**

R01 的循环是"模型 → tool_use → tool_result → 模型"。当 tool 返回 503、当 weather API 给出格式不对的字符串、当模型自己 hallucinate 一个不存在的工具名——**R01 不会反思,只会继续顺着错的 trajectory 往下走,直到 MAX_STEPS 截断或撞墙**。这就是 [A04 Reflexion](/kb/Agent-系统化专题/A04-Reflexion/) 试图解决的缺口,在 R01 跑通后体感最强。

注意这与 [A04 Reflexion](/kb/Agent-系统化专题/A04-Reflexion/) § 一 R4 复现性争议段并不矛盾——Reflexion 工业占比 < 20%,**不等于"反思机制本身没用"**,而是"独立的 Reflexion paper 实现路径用的少,主流被吸收到 G6 thinking budget 内部"。R01 没有 reflection,意味着 Rick 在生产时要么手工接入 Reflexion 笔记机制,要么直接换 thinking 模型——**两条路都是离开 R01 这 113 行**。

**失败模式 3: Context 漂移 → 长 trajectory 越走越偏**

R01 单循环深度有限 (§ 6.5 弱点 1 已亲手验证)。**把 MAX_STEPS 从 10 改到 30,你会肉眼看到模型在第 15-20 步开始"内卷思考":反复自己问自己、忘记最初任务、出现 hallucinated tool name**。这不是模型不聪明,是 R01 没有 G3 反思层 / G6 thinking budget 来阻止 trajectory 退化。

生产代价:任何需要 ≥ 10 步真实推理的任务,R01 会以肉眼可见的速度漂移。**应对**:R01 范式适用于"5 步内能闭环"的任务(简单查询、单工具调用、短 pipeline),**超过 5 步就该考虑 R02 显式状态机 + 节点级 checkpoint**。

**R01 跑通的真实时长校准**

本节点写"30 分钟跑通"是高手时长。**第一次复现的真实时长大概率 4-8 小时**——多出的时间花在:Python 环境 / API key 申请绑卡 / SDK 版本与 `claude-sonnet-4-5` model_id 对齐 / wttr.in 在 Cloudflare 拦截下偶发 503 / 模型 `stop_reason` 出现 "max_tokens" 或 "tool_use" 而 R01 代码只 handle "end_turn" 导致无限循环。如果你 30 分钟跑通,要么是高手,要么跳过了真实的工程问题。

**对 PM 的具体启示**

跑通 R01 后,正确的判断是"我体感了 G2 ReAct 的骨架,以及单 Agent 在生产的三个硬边界"——不是"我做过 Agent 了"。面试遇到"你做过 Agent 吗",可以回答:"我跑过 113 行 ReAct,亲手撞过无状态 / 无反思 / context 漂移这三道墙,所以我知道为什么 R02 必须上状态机、A04 反思必然出现、生产场景默认要用 thinking 模型——这些不是教科书结论,是 R01 跑通后的体感"。**这种"用三个具体失败模式说事"比"我做过 Agent" 强 10 倍**——它证明你的"懂"是负向的(知道哪里会撞墙),不是正向的(背了一堆 ReAct 名词)。

R01 之后的下一站:**如果你的任务是单次查询 + 短 pipeline,R01 已经够用**;**如果触发上述三个失败模式中任何一个,直接上 R02**;**只有在 R02 也撑不住、确实需要角色分工时,才进 R03**——这是 PM 选型的"从 R01 到 R03"的 escalation 路径。

## 与已有节点的关系

本节点对 [c10 - Agent 技术栈与工具调用](/kb/AI-基础知识库/c10-Agent-技术栈与工具调用/) 是"复现补缺":c10 讲了 ReAct 的概念与失败数学,但没有给出可跑代码;R01 把那篇文档里所有抽象论断变成可观察的程序行为。

对 [m201 - Prompt Engineering 实战体系](/kb/AI-工程化与落地架构/m201-Prompt-Engineering-实战体系/) 是"对话":m201 讲了 prompt 的工程方法,R01 让你看到"system 里少一句话会让 Agent 行为偏移多大"。

对 [A03 ReAct](/kb/Agent-系统化专题/A03-ReAct/) 是"代码化锚点":A03 是概念卡,R01 是它的运行时形态。两者必须配合阅读。

不与 m206 - Agent 产品化:记忆机制与技术进展 重复:R01 故意没有上记忆系统,因为加上之后就不是 100 行的范围了——记忆是 R02 的工作。

## PM 决策启示

跑过 R01 之后,你在三类对话里会有明显的底气增长:

- **面试**(被问"你做过 Agent 吗"):回答不再是"我了解 ReAct 是 thought-action-observation",而是"我跑过一个 113 行的 ReAct,具体到 messages 列表回灌、tool_use_id 配对、max_steps 防呆这些细节我都踩过坑"。这是 [m202 - 工程选型决策矩阵](/kb/AI-工程化与落地架构/m202-工程选型决策矩阵/) 里"概念熟悉"和"工程熟悉"的分水岭。
- **跨职能沟通**(和工程师讨论需求):你能说出"加这个工具会让上下文从 700 涨到多少,会不会触发 [KV Cache](/kb/AI-基础知识库/KV-Cache/) 失效"这类工程师听得懂的话,而不是"我们能不能让 Agent 更智能一点"这种被工程师默默标记为"PM 不懂"的发言。
- **选型判断**(给老板做立项):你能判断一个需求"该不该上 Agent"——如果需求本质上一次 [Function Calling](/kb/AI-基础知识库/Function-Calling/) 就能解决,根本不需要 ReAct 循环,更不需要 R02/R03 的复杂方案。这是 [AI概念滥用反思](/kb/AI-基础知识库/AI概念滥用反思/) 在 Agent 语境里最值得警惕的地方:很多"AI Agent 项目"其实根本不需要 Agent。

## 关联节点

**核心关联（必读）**：
- [A03 ReAct](/kb/Agent-系统化专题/A03-ReAct/)——R01 是 A03 论断的实验验证（§ 6.5）
- [S01 Agent 六层架构剖面](/kb/Agent-系统化专题/S01-Agent-六层架构剖面/)——§ 4 六层架构映射
- [Polanyi 默会知识与提示工程的认识论张力](/kb/AI-基础知识库/Polanyi-默会知识与提示工程的认识论张力/)——§ 6 开头的认识论基础
- [R02 中型生产·LangGraph + MCP](/kb/Agent-系统化专题/R02-中型生产·LangGraph-+-MCP/)——§ 6.4 何时换车的下一站
- m207 - Agent 产品化:场景推演与失败模式——三种失败模式的真实复现

**延伸关联（可选）**：
- [G02 五代演化详解·G1-G5](/kb/Agent-系统化专题/G02-五代演化详解·G1-G5/)、[A04 Reflexion](/kb/Agent-系统化专题/A04-Reflexion/)、[A08 MCP 与 A2A 协议族](/kb/Agent-系统化专题/A08-MCP-与-A2A-协议族/)、[R03 Multi-Agent 模板·AutoGen CrewAI](/kb/Agent-系统化专题/R03-Multi-Agent-模板·AutoGen-CrewAI/)
- [c10 - Agent 技术栈与工具调用](/kb/AI-基础知识库/c10-Agent-技术栈与工具调用/)、[m201 - Prompt Engineering 实战体系](/kb/AI-工程化与落地架构/m201-Prompt-Engineering-实战体系/)、[m209 - 推理成本控制手册](/kb/AI-工程化与落地架构/m209-推理成本控制手册/)
- [Function Calling](/kb/AI-基础知识库/Function-Calling/)、[Anthropic](/kb/AI-公司与产品/Anthropic/)、[Claude](/kb/AI-公司与产品/Claude/)、[DeepSeek](/kb/AI-公司与产品/DeepSeek/)、DeepSeek API Key、[AI概念滥用反思](/kb/AI-基础知识库/AI概念滥用反思/)

---

## 修订日志

- **R4 → R5（2026-05-18)**:本轮聚焦出版就绪——A 类必改 1(R01-R03 末尾"demo ≠ 生产" 模板化差异化重写)。修订要点:
  1. § 6.6 重写为"R01 的三个特有失败模式:单 Agent 在生产的硬边界" —— 砍除与 R02/R03 末尾雷同的"教学时长 vs 真实时长 → 4 个陷阱清单 → 对 PM 启示"模板套话
  2. 三个失败模式聚焦 R01 单 Agent 范式独有:失败模式 1 无状态(进程一断会话归零)/ 失败模式 2 无反思(失败只能重跑无法纠错,且 § 与 [A04 Reflexion](/kb/Agent-系统化专题/A04-Reflexion/) § 一 R4 复现性争议形成显式呼应)/ 失败模式 3 Context 漂移(长 trajectory 越走越偏)
  3. 时长校准段精简,从独立段并入失败模式叙事末尾;陷阱清单内化到三个失败模式中
  4. 面试回答模板更新:从"我跑过、亲手踩过坑"升级到"我撞过三道墙,所以我知道为什么 R02 必须上状态机、A04 反思必然出现、生产场景默认要用 thinking 模型"——把"懂"从正向变负向
  5. R01 → R03 escalation 路径显式化,与 [R02 中型生产·LangGraph + MCP](/kb/Agent-系统化专题/R02-中型生产·LangGraph-+-MCP/) / [R03 Multi-Agent 模板·AutoGen CrewAI](/kb/Agent-系统化专题/R03-Multi-Agent-模板·AutoGen-CrewAI/) 形成"按失败模式 escalate 而非按难度 escalate" 的统一选型语法
- **R3 → R4（2026-05-18）**：本轮聚焦反方对话训练 + 复现陷阱显式标注。修订要点:
  1. § 6 新增 § 6.6 "R01 跑通后的真实陷阱:demo 跑通 ≠ 生产可用" —— 引入肖弘 60 分自评指向的最大风险;给出三个具体错觉与现实对照
  2. § 6.6 给"教学时长 vs 真实时长" 的差距 —— "30 分钟跑通" 不包含环境配置 / API key 申请 / 第一次跑代码错误 / 外部 API 不可用,实际 4-8 小时
  3. § 6.6 给"真实复现陷阱清单" 4 条 —— wttr.in Cloudflare 拦截 / Anthropic API 政策收紧 / SDK 版本与 model_id 不匹配 / stop_reason 多种类型未 handle
  4. § 6.6 给"跑通 R01 后正确的判断" —— "我体感了 G2 ReAct 骨架,但生产能力还差 10000 倍"
  5. 引入的对手立场:肖弘 60 分自评的体感传染 (从 E02 传染到 R01)、demo ≠ 生产的工程现实
- **R2 → R3（2026-05-18）**：聚焦判断密度提升。本轮修订要点：
  1. § 6 开头加 100 字"R01 的认识论基础是 Polanyi 默会知识"段——回应 Round 2 [独家机会-4]
  2. § 6 新增 § 6.5 "亲手验证了 A03 § 五的哪些弱点"，逐项对照 A03 四个弱点——回应 Round 2 [对话缺失-4]
  3. 关联节点分两档，核心关联加 [Polanyi 默会知识与提示工程的认识论张力](/kb/AI-基础知识库/Polanyi-默会知识与提示工程的认识论张力/)
- **R1 → R2（2026-05-18）**：`MODEL = "claude-sonnet-4-6"` 改为 env 变量（默认 claude-sonnet-4-5）；加入 ANTHROPIC_API_KEY 防御；Anthropic 免费额度表述模糊化。

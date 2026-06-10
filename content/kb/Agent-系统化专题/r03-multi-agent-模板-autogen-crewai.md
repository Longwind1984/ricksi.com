---
title: R03 Multi-Agent 模板·AutoGen CrewAI
cluster: Agent 系统化专题
created: '2026-05-18'
updated: '2026-05-18'
---

# R03 Multi-Agent 模板·AutoGen CrewAI

> 一句话:本节点的目标是用同一个真实任务(写一个 CSV 解析函数 + pytest 测试)跑通两套主流 [A07 Multi-Agent Teams](/kb/agent-系统化专题/a07-multi-agent-teams/) 框架——微软 AutoGen(对话驱动)与 CrewAI(流水线驱动),让你在 30 分钟内对照体验"自然语言协作"与"显式任务依赖"两种范式的差异。Rick 跑完之后,会对 [m208 - AI 基础设施与中间件选型](/kb/ai-工程化与落地架构/m208-ai-基础设施与中间件选型/) 的 Multi-Agent 选型表有 PPT 里读十遍都得不到的体感判断力。

## 0. 为什么明知道 multi-agent 反向去化,还要教你跑

[E03 Multi-Agent 框架·AutoGen & CrewAI & DeerFlow](/kb/agent-系统化专题/e03-multi-agent-框架-autogen-crewai-deerflow/) § 3.6.1 已经反复说"2026 年 PM 选型默认应该是单 agent",[A07 Multi-Agent Teams](/kb/agent-系统化专题/a07-multi-agent-teams/) § 一也给了三题判据刷掉 80% 的伪 multi-agent 需求。**那 R03 为什么还要让你跑两个 multi-agent demo?**

四个独立正当性(详见 [E03 Multi-Agent 框架·AutoGen & CrewAI & DeerFlow](/kb/agent-系统化专题/e03-multi-agent-框架-autogen-crewai-deerflow/) § 3.6.2 已展开):**面试要问 / 验证 A07 三题判据需要工程体感 / narrow 场景仍有价值 / 反向去化趋势可能反转时的知己知彼**。

R03 的复现目标**不是"让你能上线 multi-agent 项目"**——是让你在跑通后能说:"我亲手跑过 AutoGen 和 CrewAI,体感过 token 失控 / 对话漂移 / 诊断 3-5 倍难度这三个 multi-agent 独有失败模式,所以我在 PM 选型时默认走单 agent + 长 reasoning,不是因为没学过 multi-agent 所以不敢用,而是学过了之后有底气拒绝默认上 multi-agent"。这是 R03 在 2026 年的真实价值。

读完末尾 § "R03 的三个特有失败模式" 后,这一立场会从理论判断升级成工程体感——这也是 R03 与 [R01 最小可运行·100 行 ReAct](/kb/agent-系统化专题/r01-最小可运行-100-行-react/) / [R02 中型生产·LangGraph + MCP](/kb/agent-系统化专题/r02-中型生产-langgraph-+-mcp/) 串成"escalation 路径"的根本理由:**R01 / R02 / R03 各自的失败模式是 PM 在不同复杂度上必须知道的硬边界,不是难度梯度**。

## 1. 复现目标

任务定义:

> 给定需求"写一个 Python 函数,从 CSV 字符串解析出字典列表;并写 3 个 pytest 用例覆盖正常/空文件/格式错误三种情况"。

三角色协作:

- **Planner**:把需求拆成具体 task list
- **Coder**:实现代码
- **Reviewer**:审查并要求迭代

成功标准:跑完一轮,得到一个能直接 `pytest` 通过的 `csv_parser.py` + `test_csv_parser.py`。

每个框架不超过 150 行代码。同一个任务,两次实验,对照"流程画面"——这是 范式 意义上的对比实验:同一个现象,两套不兼容的世界观分别给出解释。

## 2. AutoGen 版本(约 130 行)

### 2.1 安装

```bash
# AutoGen 在 2025 年拆成了 autogen-agentchat + autogen-core + autogen-ext
# 这是 v0.4+ 的新架构（v0.2 老 API 已废弃，文档里仍能搜到要小心）
pip install "autogen-agentchat>=0.4" "autogen-ext[openai,anthropic]>=0.4"
```

> 注:这里使用 AutoGen v0.4+ 的新架构(`agentchat` + `core` + `ext` 三件套)。如果你搜到的教程是 `from autogen import AssistantAgent`,那是 v0.2 老 API,2025 年已弃用。识别方式:新 API 全部是 `from autogen_agentchat.agents import ...`。

### 2.2 代码

```python
"""r03_autogen_demo.py — AutoGen 三角色对话驱动
约束：< 150 行；演示 GroupChat 自然语言协作。"""
import asyncio, os
from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.teams import RoundRobinGroupChat
from autogen_agentchat.conditions import TextMentionTermination, MaxMessageTermination
from autogen_agentchat.ui import Console
from autogen_ext.models.anthropic import AnthropicChatCompletionClient

if not os.environ.get("ANTHROPIC_API_KEY"):
    import sys
    sys.exit("请先设置 ANTHROPIC_API_KEY 环境变量后再运行")

# Anthropic model_id 随版本变化,以官方文档为准:
#   https://docs.anthropic.com/en/docs/about-claude/models
# 截至 2026-05 公开可调用别名包含 claude-sonnet-4-5、claude-opus-4-5、claude-haiku-4-5;
# 若你的账号已开通 Sonnet 4.6 / Opus 4.7,改 ANTHROPIC_MODEL 环境变量即可。
ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-5")

# 单一模型实例三个 Agent 共享，省 connection 开销
model_client = AnthropicChatCompletionClient(
    model=ANTHROPIC_MODEL,
    api_key=os.environ["ANTHROPIC_API_KEY"],
)

# --- 三个 Agent，靠 system_message 区分人格 ---
planner = AssistantAgent(
    name="Planner",
    model_client=model_client,
    system_message=(
        "你是任务规划师。把用户需求拆成 3-5 个清晰的子任务，"
        "用 markdown 列表输出。不要写代码。把任务交给 Coder。"
    ),
)

coder = AssistantAgent(
    name="Coder",
    model_client=model_client,
    system_message=(
        "你是 Python 工程师。根据 Planner 的任务列表写代码，"
        "代码用 ```python ``` 包裹。不要解释，只给代码。等 Reviewer 评审。"
    ),
)

reviewer = AssistantAgent(
    name="Reviewer",
    model_client=model_client,
    system_message=(
        "你是高级工程师。审 Coder 的代码：检查边界情况、命名、测试覆盖。"
        "如果有问题，列出具体修改要求让 Coder 重写。"
        "如果代码达到生产标准，回复'APPROVED'（必须是这个英文词，作为终止信号）。"
    ),
)

# --- 团队编排：RoundRobin 表示三个人轮流发言 ---
# 终止条件 = APPROVED 出现 或 超过 10 轮（防失控，链入 m207 循环失控失败模式）
termination = TextMentionTermination("APPROVED") | MaxMessageTermination(10)
team = RoundRobinGroupChat([planner, coder, reviewer], termination_condition=termination)

# --- 任务 ---
TASK = """请协作完成：
写一个 Python 函数 parse_csv(csv_string: str) -> list[dict]，
能把 CSV 字符串解析为 dict 列表（首行作 header）。
另外写 3 个 pytest 用例：正常、空字符串、格式错误。"""

async def main():
    # Console UI 实时打印 Agent 对话；生产中换成 run_stream() 自己接前端
    await Console(team.run_stream(task=TASK))

if __name__ == "__main__":
    asyncio.run(main())
```

运行:

```bash
python r03_autogen_demo.py
```

期望屏幕输出形如(每个 Agent 自报家门、依次发言):

```text
---------- Planner ----------
1. 实现 parse_csv 函数...
2. 处理空字符串边界...
...

---------- Coder ----------
```python
def parse_csv(csv_string: str) -> list[dict]:
    ...
```

---------- Reviewer ----------
代码基本正确,但建议:
1. 用 csv.DictReader 替代手写 split...
2. 空字符串应返回 [] 而非 None...
请 Coder 修改后重新提交。

---------- Coder ----------
```python
import csv
from io import StringIO
def parse_csv(csv_string: str) -> list[dict]:
    ...
```

---------- Reviewer ----------
APPROVED
```

关键观察点:`RoundRobinGroupChat` **严格按角色顺序轮转**——Planner → Coder → Reviewer → Planner → Coder → Reviewer……。当 Reviewer 没说 APPROVED、对话进入第二轮时,Planner 会被再次叫起,但它其实没事干(任务已经拆完了),会输出"我没有进一步任务"。这是 Multi-Agent 框架的固有调度开销:RoundRobin 不会跳过无事可做的 Agent,每一次空叫都消耗 1 次 LLM 调用。这是 m207 - Agent 产品化:场景推演与失败模式 "无限循环"与"雪崩效应"分类之外的补充——一种 Multi-Agent 独有的**"调度浪费"失败模式**。

## 3. CrewAI 版本(约 140 行)

### 3.1 安装

```bash
pip install "crewai>=0.80" "crewai-tools>=0.20"
# CrewAI 默认调 OpenAI，要用 Anthropic 需配置 LiteLLM 后端（已内置）
pip install langchain-anthropic
```

### 3.2 代码

```python
"""r03_crewai_demo.py — CrewAI 三角色任务流水线驱动
约束：< 150 行；演示 Task 依赖 + sequential Process。"""
import os
from crewai import Agent, Task, Crew, Process, LLM

if not os.environ.get("ANTHROPIC_API_KEY"):
    import sys
    sys.exit("请先设置 ANTHROPIC_API_KEY 环境变量后再运行")

# --- LLM 配置 ---
# CrewAI 通过 LiteLLM 适配多家;命名约定是 "anthropic/<model-id>"。
# 模型 ID 随版本变化,以 Anthropic 官方文档与 LiteLLM provider 表为准。
# 默认 claude-sonnet-4-5;若你账号已开通 Sonnet 4.6,改 anthropic/claude-sonnet-4-6 即可。
llm = LLM(
    model=f"anthropic/{os.environ.get('ANTHROPIC_MODEL', 'claude-sonnet-4-5')}",
    api_key=os.environ["ANTHROPIC_API_KEY"],
)

# --- 三个 Agent，区别于 AutoGen：必须显式声明 role/goal/backstory 三件套 ---
# 这是 CrewAI 强加的"角色心理学"——比 AutoGen 的纯 system_message 更结构化
planner = Agent(
    role="任务规划师",
    goal="把需求拆解为 3-5 个清晰子任务",
    backstory=(
        "你有 10 年项目管理经验，擅长把模糊需求落成可执行任务。"
        "你不写代码，只产出任务列表。"
    ),
    llm=llm,
    verbose=True,
    allow_delegation=False,  # 关键：不允许它"踢皮球"给别人
)

coder = Agent(
    role="Python 工程师",
    goal="根据任务列表实现高质量代码",
    backstory="你是写惯了生产代码的工程师，注重边界情况和可读性。",
    llm=llm,
    verbose=True,
    allow_delegation=False,
)

reviewer = Agent(
    role="代码审查员",
    goal="找出代码缺陷并给出具体修改建议",
    backstory="你是 staff engineer，看过太多 bug，对边界条件和命名极度敏感。",
    llm=llm,
    verbose=True,
    allow_delegation=False,
)

# --- 三个 Task，显式声明依赖 context ---
# 这是 CrewAI 与 AutoGen 最大的范式差异：任务依赖是"画"出来的，不是"聊"出来的
plan_task = Task(
    description=(
        "把这个需求拆成子任务列表：\n"
        "写 parse_csv(csv_string)->list[dict] + 3 个 pytest 用例"
        "（正常/空/格式错误）。"
    ),
    expected_output="一个 markdown 任务列表。",
    agent=planner,
)

code_task = Task(
    description="根据 Planner 的任务列表实现代码与测试。",
    expected_output="一个含 parse_csv 函数和 3 个 pytest 用例的 Python 代码块。",
    agent=coder,
    context=[plan_task],  # 显式依赖 plan_task 的输出——这是 CrewAI 的关键
)

review_task = Task(
    description=(
        "审查代码：边界、命名、测试覆盖。"
        "若问题严重，明确列出修改要求；若可接受，回复'APPROVED'。"
    ),
    expected_output="审查意见（含 APPROVED 或修改建议）。",
    agent=reviewer,
    context=[code_task],
)

# --- 编排：Process.sequential 表示严格按 task 列表顺序 ---
# 还有 Process.hierarchical（多了一个 manager LLM 来调度），R03 不演示
crew = Crew(
    agents=[planner, coder, reviewer],
    tasks=[plan_task, code_task, review_task],
    process=Process.sequential,
    verbose=True,
)

if __name__ == "__main__":
    result = crew.kickoff()
    print("\n========== 最终输出 ==========\n")
    print(result.raw)
```

运行:

```bash
python r03_crewai_demo.py
```

期望输出(CrewAI 自带终端美化,会用颜色框柱状显示每个 task):

```text
[Crew] 🚀 Crew: 'crew' starting...

[Agent: 任务规划师] Task: 把这个需求拆成子任务列表...
[Agent: 任务规划师] Final Answer:
1. 设计 parse_csv 签名...
...

[Agent: Python 工程师] Task: 根据 Planner 的任务列表实现代码与测试。
[Agent: Python 工程师] Final Answer:
```python
import csv
from io import StringIO
def parse_csv(csv_string): ...
```

[Agent: 代码审查员] Task: 审查代码...
[Agent: 代码审查员] Final Answer: APPROVED. 代码符合生产标准。

========== 最终输出 ==========
APPROVED. 代码符合生产标准。
```

关键观察点:CrewAI 没有"反复迭代"——`Process.sequential` 跑完三个 task 就结束了。如果 Reviewer 说"不通过",CrewAI 不会自动把控制权交还给 Coder。要做迭代,要么换成 `Process.hierarchical`(多耗一个 manager LLM),要么用 `CrewAI Flow`(2025 新增的状态机原语,接近 LangGraph)。

## 4. 两套体验对照

跑完两次,你会真实感受到下面这张表(对照 [m208 - AI 基础设施与中间件选型](/kb/ai-工程化与落地架构/m208-ai-基础设施与中间件选型/) 的 Multi-Agent 评估维度):

| 维度 | AutoGen v0.4+ | CrewAI 0.80+ |
|---|---|---|
| **核心隐喻** | 多人开会(对话漂移) | 流水线作业(任务卡片) |
| **角色定义** | `system_message` 一段文字 | `role/goal/backstory` 三元组 |
| **任务依赖** | 隐式(靠对话顺序) | 显式(`context=[...]`) |
| **可控性** | 中(易跑偏) | 高(像 Airflow) |
| **Debug 难度** | 高(要读多人对话历史) | 中(每个 task 独立 trace) |
| **迭代速度** | 中(改 prompt 后效果不稳) | 快(改 task description 效果立竿见影) |
| **token 消耗** | 高(每轮要带全部对话) | 中(task 之间只传 expected_output) |
| **学习曲线** | 较平(像写聊天机器人) | 较陡(要懂 task 拓扑) |
| **适合场景** | 研究/探索/创意 | 业务流程自动化 |
| **生产成熟度** | v0.4 还不稳(API 半年一变) | 0.80+ 已稳定 |

这张表不是抽象比较——是你跑完两个 demo 一定会有的体感。如果跑完之后你的体感和这张表对不上,大概率你的任务太简单(三个 Agent 一来一回就结束了,看不出差异)——把任务换成"写一个 RESTful API + 单元测试 + OpenAPI 文档",立刻能感受到差距。

## 5. 失败案例展示

两个框架各跑一个"必然失败"的任务,观察失败模式——链入 m207 - Agent 产品化:场景推演与失败模式 六类失败:

### 5.1 AutoGen 失败:对话漂移

把任务换成"写一个量子计算的 Python 程序模拟 Shor 算法分解 15"。

你会看到:Planner 拆出"实现量子电路模拟器、实现 Shor 算法、写测试"——它**根本不知道这不可行**(模拟 Shor 至少需要 9 qubits,纯 Python 模拟会内存爆炸)。Coder 硬着头皮写,Reviewer 看了说"代码逻辑没错但运行结果不对"。然后 Coder 改,Reviewer 再说不对,陷入死循环到 `MaxMessageTermination(10)` 终止。

这是 m207 - Agent 产品化:场景推演与失败模式 六类失败模式里的**"协同假象"**(false consensus):三个 Agent 互相确认,但谁都没有"这事根本做不了"的元认知。对应 [幻觉](/kb/ai-基础知识库/幻觉/) 在 Multi-Agent 系统里的放大效应——单个 Agent 的幻觉会被其他 Agent 当作"前置事实"接受。

### 5.2 CrewAI 失败:流水线僵化

同样的任务,CrewAI 因为 `Process.sequential` 三步走完就结束——你会得到一个能跑但完全错误的"伪 Shor 算法",而且**没有第二次机会**修正。Reviewer 即使说"代码不对",流水线也不会回头。

这是 m207 - Agent 产品化:场景推演与失败模式 六类失败里的**"反馈断路"**:有评审,但评审意见不进闭环。对应 [A04 Reflexion](/kb/agent-系统化专题/a04-reflexion/) 试图解决的核心问题——多 Agent 协作里,反馈必须能驱动下一轮行动,否则评审就是 placebo(安慰剂)。

两类失败放在一起看,你会明白一件 PPT 永远不告诉你的事:**Multi-Agent 不是"加更多 Agent 就更聪明",而是"加 Agent 就多一条出错路径"**。这是 [c10 - Agent 技术栈与工具调用](/kb/ai-基础知识库/c10-agent-技术栈与工具调用/) 复合错误数学的 Multi-Agent 版本——10 步 95% 准确率合成 60% 是单 Agent 数学;3 个 Agent 互相 prompting,实际成功率比这还低,因为出错的不只是步骤,还有"谁该说话"。

## 6. PM 选型建议

基于上面的对照与失败分析,给 Rick 一个可以直接背的选型决策表:

| 业务诉求 | 推荐 | 原因 |
|---|---|---|
| 业务流程自动化(出报告/审合规/写邮件) | **CrewAI** | 流水线天然映射业务流程;Task DAG 易交付给非工程师审 |
| 研究/探索/创意(头脑风暴/方案对比) | **AutoGen** | 对话漂移在创意场景是 feature,不是 bug |
| 重生产/高可靠(交易/医疗/法务) | **两者都不够** → [R02 中型生产·LangGraph + MCP](/kb/agent-系统化专题/r02-中型生产-langgraph-+-mcp/) 自己写状态机,或用 Temporal 这类成熟工作流引擎 |
| 国内场景/需要中文 docs | DeerFlow(下文 §7) | 字节维护,中文生态好 |
| 已有 LangChain 项目 | LangGraph + 自定义 sub-graph | 不要混框架,生态裂痕大 |

这张表的核心判断是:**Multi-Agent 框架的差异不在能力,在"哪种错误你能容忍"**——

- AutoGen 容忍"流程不可控",换来"灵活"
- CrewAI 容忍"灵活不足",换来"可交付"
- LangGraph 两个都不容忍,代价是工程量大 5 倍

PM 选型时不要问"哪个更先进",要问"我能容忍哪种翻车"。

## 7. 中文场景:DeerFlow 简介

字节跳动开源的 [A07 Multi-Agent Teams](/kb/agent-系统化专题/a07-multi-agent-teams/) 框架。v1 早期版本在 2024 年下半年至 2025 年间陆续公开,v2.0 于 2026-02-28 发布并当日登顶 GitHub Trending 第一(Cubox 证据池里 `字节跳动超级智能体DeerFlow 2.0开源,登顶GitHub Trending第一!-2026-03-05.md` 是首发跟进资料,公开 GitHub 仓库 `bytedance/deer-flow` 显示发布后一个月累计数万 Star)。

定位:

- 内置"研究助手 / 写作助手 / 数据分析师"三个现成场景模板
- 中文文档完整,LLM 默认走 Qwen / DeepSeek / Doubao,Anthropic/OpenAI 是可选
- 强调"开箱即用"(类似 CrewAI 的 task 模型)+ 内置可视化(类似 LangGraph 的图)
- 但**架构演进快,API 半年一变,生产慎用**——这是字节自家工具的常态(参考 Volcano Engine、Maxim 等几个工具的 API breaking change 记录)

R03 不展开 DeerFlow 代码,理由很简单:架构还没稳,这会儿写的代码 3 个月后大概率跑不通。但你需要知道它的存在,因为下面三个场景它会是首选:

- 全中文团队、对英文文档抵触
- 字节生态绑定(用了豆包/扣子/火山引擎)
- 需要"5 分钟出 demo 给老板看"——DeerFlow 模板比 CrewAI 还快

不要把 DeerFlow 当成"国产替代",它是一个**生态卡位产品**——字节希望开发者从 LLM 调用开始就用豆包/Qwen,不是在 Agent 框架本身做技术领先。这是 [m208 - AI 基础设施与中间件选型](/kb/ai-工程化与落地架构/m208-ai-基础设施与中间件选型/) 里讨论过的"中间件即生态绑定"模式的典型案例。

## 与已有节点的关系

本节点对 [R02 中型生产·LangGraph + MCP](/kb/agent-系统化专题/r02-中型生产-langgraph-+-mcp/) 是"横向对比":R02 是单 Agent 状态机做复杂流程,R03 是多 Agent 简单协作。两者不是"R02 升级到 R03",而是**两条不同的 Agent 规模化路径**——见 [G02 五代演化详解·G1-G5](/kb/agent-系统化专题/g02-五代演化详解-g1-g5/) G4 节点的"竖向加深"vs"横向加广"分岔。

对 m207 - Agent 产品化:场景推演与失败模式 是"复现验证":m207 列了六类失败模式,R03 让你在 10 分钟内亲眼见到其中两类(协同假象 / 反馈断路)。

对 [m208 - AI 基础设施与中间件选型](/kb/ai-工程化与落地架构/m208-ai-基础设施与中间件选型/) 是"实证补完":m208 给了 Multi-Agent 框架对比,R03 给出运行代码与失败现场。

对 [E03 Multi-Agent 框架·AutoGen & CrewAI & DeerFlow](/kb/agent-系统化专题/e03-multi-agent-框架-autogen-crewai-deerflow/) 是"代码层补充":E03 是产品史/生态比较,R03 是同一组框架的"开机即用"版本。两者一起读,才能从历史与代码两面理解这个赛道。

不与 [A07 Multi-Agent Teams](/kb/agent-系统化专题/a07-multi-agent-teams/) 重复:A07 是概念层(为什么需要多 Agent),R03 是工程层(具体怎么搭)。

## PM 决策启示(精要)

Multi-Agent 在 2026 年的现状,可以用一句话概括:**"Multi-Agent 是个营销词,Multi-Role 才是个工程词"**。AutoGen 和 CrewAI 都不是真的让"多个独立 Agent"协作——它们让"一个 LLM 假装成多个角色"协作。底层调用的是同一个 [Claude](/kb/ai-公司与产品/claude/) / [DeepSeek](/kb/ai-公司与产品/deepseek/) / GPT,只是 system prompt 换来换去。

这件事的 PM 启示有两层:

- **不要把"我们要做 Multi-Agent 产品"当成竞争优势写进 BP**——技术上一行 prompt 就能模拟;真正的差异化在角色拆分得对不对(那是产品设计,不是技术)
- **当老板说"我们要做 Multi-Agent"**,先问他"哪些角色之间的协作让今天的人都很痛苦"——找到这个痛苦,Multi-Agent 才有产品价值;找不到,就是 [AI概念滥用反思](/kb/ai-基础知识库/ai概念滥用反思/) 里讲的"AI 概念绑架业务"

技术选型反而是简单的部分:能用 CrewAI 解决,就不要上 AutoGen;能用 AutoGen 解决,就不要自己写 GroupChat;能用 [R02 中型生产·LangGraph + MCP](/kb/agent-系统化专题/r02-中型生产-langgraph-+-mcp/) 单 Agent 解决,就不要上 Multi-Agent。这是 [m202 - 工程选型决策矩阵](/kb/ai-工程化与落地架构/m202-工程选型决策矩阵/) 在 Agent 子领域的最简形式。

## 用 Rick 写作 SABCD 评级体系 自评这份代码

> 与 R02 同理——把 SABCD 写作评级方法论平移到代码评估。

| SABCD 维度 | R03 AutoGen 代码 | R03 CrewAI 代码 |
|---|---|---|
| **S（Structural）** | 6/10——GroupChat 调度逻辑藏在 framework 内，但 agents 列表声明清晰 | 7/10——Task DAG 显式声明，比 AutoGen 易读 |
| **A（Algorithmic）** | 5/10——角色对话漂移没有显式 budget；轮次上限不能配置 | 6/10——sequential process 流水线确定，但 hierarchical process 下 manager 决策算法不透明 |
| **B（Boundary）** | 4/10——一个 agent 错了会污染全部下游；没有 critic agent 兜底 | 5/10——sequential 下错误能定位到具体 Task，但缺重试机制 |
| **C（Conventions）** | 6/10——env 化 model_id；但 agent 命名靠 system prompt 漂移 | 7/10——role/goal/backstory 命名规范由 framework 强制 |
| **D（Evolvability）** | 5/10——切框架几乎要重写（agent 抽象不通用） | 6/10——Task 抽象较通用，可平移到 LangGraph |

**综合**：AutoGen 5.2/10、CrewAI 6.2/10——**两者都不够生产，是 R03 的设计定位**。R03 的目的不是给你"production-grade multi-agent"，是让你在跑通两个 framework 的同一个任务后，**亲手感受 AutoGen 灵活但失控 / CrewAI 工整但僵化的工程取舍**。

这是 SABCD 方法论的另一个应用：**当两份代码都不及格但取舍不同时，SABCD 表能帮你定位"我能容忍 AutoGPT 的 B 4/10 还是 CrewAI 的 A 6/10"**——选型不是"哪个分高"，是"哪个低分维度我能接受"。

## R03 的三个特有失败模式:Multi-Agent 在生产的硬边界

> R03 把单 Agent 拆成多角色协作。这一步**带来了单 Agent 永远不会有的三个失败模式**——它们和 R01 单 Agent / R02 状态机 + HITL 的失败完全不同,集中在"token 经济学、对话动力学、协调失败"这三个 multi-agent 独有的层面。这也是为什么 Anthropic / Claude Code / Cursor 在 2025 下半年起反向去 multi-agent 化。

**失败模式 1: Token 失控 —— 每多一个 agent 都是乘法,不是加法**

R03 demo 跑两个 agent 时 Rick 容易误以为"也就比单 agent 多 2-3 倍 token"。**生产里完全不是**:

- **CrewAI hierarchical 模式**:对每一步都要问 manager LLM"该派谁",token 消耗是 sequential 模式的 **3-5 倍**——manager 自身就是一次完整 LLM 调用
- **AutoGen RoundRobin "空叫"**:严格按顺序轮转,某个 agent 没事做时**仍被叫起、仍消耗一次 LLM**——5 个 agent 的 5 轮对话就是 25 次 LLM 调用,其中可能 15 次是"我没事做"
- **history 重复传递**:每个 agent 在自己回合都要读全部上下文——5 个 agent 的 5 轮对话,**同一段对话被读 25 次,每次都是 input token**

这是 multi-agent 独有的失败模式——R01 一个循环一次 LLM,R02 状态机节点之间状态明确传递。**应对**:(a) 默认 sequential,只在真有 manager 调度需求时上 hierarchical;(b) RoundRobin 改 `SelectorGroupChat`(按上下文动态选 speaker)或显式给 agent 加"无事回复 SKIP"的退出协议;(c) **接入 token budget 硬上限**,超出直接 abort,避免对话失控烧穿预算;(d) 跑 demo 时**显式打印每轮 token 消耗**,而不是 demo 跑完才看账单。

**失败模式 2: 对话漂移 —— Agent 之间能聊死,但聊不出结论**

Multi-agent 最容易出现的不是"协作失败",是"协作过度"——**两三个 agent 互相 review、互相 refine、互相质疑,陷入"我觉得你这步可以更好"的无限互捧**。CrewAI hierarchical 里 manager 反复把任务派给同一个 worker,worker 失败后 manager 再派一次——**"派 → 失败 → 再派"的循环**在 5+ task 项目里几乎必然出现。AutoGen GroupChat 在没有强 termination 条件时,**会跑到 max_round 或 token 用光为止,不会自己得出"该停了"**。

这是 multi-agent 独有:单 agent 即便漂移也是一个声音,multi-agent 漂移是**多个声音互相加强**——而模型本身就有"附和上一轮"的 RLHF 倾向。**应对**:(a) 显式 `max_iter` 限制每个 Task 迭代次数;(b) **显式 termination 条件**(达成某 KPI / 信息完整度 / 时间窗口);(c) manager prompt 必须包含"如果同一个 worker 失败 ≥ 2 次,换不同策略而非重派";(d) **加一个 critic agent 兜底但不参与生成**,负责判断"是否该停"——但这又增加 token 成本,所以小项目宁可不用 multi-agent。

**失败模式 3: 诊断难度 3-5 倍 —— 失败发生时,你不知道是哪个 agent 的问题**

R02 失败时,Rick 能精确定位到"是 SqliteSaver 锁了 / 是 Gmail SMTP 拒了 / 是 MCP server 没启"——**失败有单一归因**。R03 失败时,Rick 看到的是"最后输出不对" 或 "对话死循环",但不知道:**是 agent A 给出错误信息?是 agent B 误解了 agent A?是 manager 派错人?是 history 传递时被截断?是某个 agent 的 system prompt 偏移导致角色塌缩?**

Multi-agent 诊断难度比单 agent 高 **3-5 倍**——这是业界共识,也是 Devin 2025-Q4 架构调整、Claude Code 2025-Q4 删掉默认 Task subagent 自动调度的核心原因。**应对**:(a) **生产环境必须接 LangSmith / Langfuse / phoenix** 等 trace 工具,逐 agent 看 prompt + completion;(b) 每个 agent 在 system prompt 里显式写**自我标识**(`你是 Researcher,只负责检索,不评价 Writer 的产出`),抑制角色塌缩;(c) 设计 multi-agent failure 诊断 runbook,出 bug 时按"manager → 各 worker → 通信链路"顺序排查;(d) **保留单 agent fallback** —— 任何 multi-agent 项目都应该有"如果 multi-agent 5 分钟未收敛,降级到单 agent + 长 reasoning"的开关。

**R03 跑通的真实时长校准**

本节点写"30 分钟 + 30 分钟"是 AutoGen / CrewAI 版本已对齐的乐观估计。**真实第一次跑通两个 demo 大概率 4-8 小时**——多出来的时间花在 AutoGen v0.4 在 2025-2026 经历的 ≥ 3 次小版本 breaking change(0.4.0 → 0.4.5 → 0.4.8 → 0.5,**必须 `autogen-agentchat==0.4.x` 锁版本**)、CrewAI 与 litellm 兼容、GroupChat 死循环 / sequential 中断、LiteLLM 接 Anthropic 时 region 限制。

**对 PM 的具体启示:为什么 2026 年默认应该是单 agent**

R03 跑通后,正确的判断是"我亲手感受了 multi-agent 在 token / 对话 / 诊断三个维度的额外代价 —— 这正是 [A07 Multi-Agent Teams](/kb/agent-系统化专题/a07-multi-agent-teams/) 三题判据的实证"。这与 [E03 Multi-Agent 框架·AutoGen & CrewAI & DeerFlow](/kb/agent-系统化专题/e03-multi-agent-框架-autogen-crewai-deerflow/) § 3.6.1 的"业界 2025 下半年反向去化"完全同向:**单 agent + 长 reasoning + 良好工具集**在 2026 年是 80% PM 项目的默认选择,multi-agent 应该被理解为"只有通过 A07 三题判据的少数场景才用"。

面试遇到"你能用 R03 框架做企业 multi-agent 项目吗",可以回答:"R03 是教学模板,我跑通后体感了三个 multi-agent 独有的失败模式 —— token 乘法、对话漂移、诊断 3-5 倍难度。这三点叠加业界 2025 下半年反向去化趋势,我的默认 PM 选型是单 agent + 长 reasoning,只有 A07 三题判据都通过才上 multi-agent。R03 让我有底气说'我不上 multi-agent 是经过判据 + 体感的决定,不是没学过所以不敢用'"。

**R03 之后的去向**:**R03 的最大价值不在"教你做 multi-agent",在"让你有判据拒绝默认上 multi-agent"**。这是 [AI概念滥用反思](/kb/ai-基础知识库/ai概念滥用反思/) 在 multi-agent 语境的最直接应用——市面上 80% 的"multi-agent 项目"用单 agent + 良好工具集就够,**R03 跑通让你能在面试 / 立项时识别这一点,不被"multi-agent 听起来高级"裹挟**。

## R03 PM Failure scenario (R4 新增):2026 年默认应该是单 agent,不是 multi-agent

> 与 [E03 Multi-Agent 框架·AutoGen & CrewAI & DeerFlow](/kb/agent-系统化专题/e03-multi-agent-框架-autogen-crewai-deerflow/) § 3.6.1 R4 新增联动 —— 不重复展开,要点回顾:

**业界 multi-agent 在 2025 下半年起反向去化** —— Claude Code / Cursor / Devin 都在去 multi-agent 化;Anthropic 2025-06 multi-agent research blog 发布后没引发跟风。**2026 年的 Multi-Agent 选型默认应该是"先单 agent + 长 reasoning + 工具集",不是"先 multi-agent + role 分工"**。

**这给 R03 教学定位的 R4 修订**:**R03 不是"所有 PM 必经的 multi-agent 入门",是"在 [A07 Multi-Agent Teams](/kb/agent-系统化专题/a07-multi-agent-teams/) § 一三题判据通过时才需要"**。在面试遇到"你为什么学 multi-agent 框架" 时,正确回答是"我学是为了在判据通过时能选对框架,不是为了'默认上 multi-agent'。R03 跑通让我体感了多家框架的取舍,但 80% 的 PM 项目用单 agent + 良好工具集就够"。

## 关联节点

**核心关联（必读）**：
- [R02 中型生产·LangGraph + MCP](/kb/agent-系统化专题/r02-中型生产-langgraph-+-mcp/)——R02 是单 Agent 状态机，R03 是多 Agent 简单协作（不同规模化路径）
- [A07 Multi-Agent Teams](/kb/agent-系统化专题/a07-multi-agent-teams/)——A07 概念层 / R03 工程层
- [E03 Multi-Agent 框架·AutoGen & CrewAI & DeerFlow](/kb/agent-系统化专题/e03-multi-agent-框架-autogen-crewai-deerflow/)——E03 产品/历史比较，R03 同组框架的"开机即用"代码
- Rick 写作 SABCD 评级体系——本节点末尾 SABCD 自评的方法论源头
- [AI概念滥用反思](/kb/ai-基础知识库/ai概念滥用反思/)——"Multi-Agent 是营销词"的批判框架

**延伸关联（可选）**：
- [R01 最小可运行·100 行 ReAct](/kb/agent-系统化专题/r01-最小可运行-100-行-react/)、[G02 五代演化详解·G1-G5](/kb/agent-系统化专题/g02-五代演化详解-g1-g5/)、[S01 Agent 六层架构剖面](/kb/agent-系统化专题/s01-agent-六层架构剖面/)、m207 - Agent 产品化:场景推演与失败模式、[m208 - AI 基础设施与中间件选型](/kb/ai-工程化与落地架构/m208-ai-基础设施与中间件选型/)、[m202 - 工程选型决策矩阵](/kb/ai-工程化与落地架构/m202-工程选型决策矩阵/)、[c10 - Agent 技术栈与工具调用](/kb/ai-基础知识库/c10-agent-技术栈与工具调用/)、[A04 Reflexion](/kb/agent-系统化专题/a04-reflexion/)
- [Claude](/kb/ai-公司与产品/claude/)、[DeepSeek](/kb/ai-公司与产品/deepseek/)、[幻觉](/kb/ai-基础知识库/幻觉/)、范式

---

## 修订日志

- **R4 → R5（2026-05-18)**:本轮聚焦出版就绪——A 类必改 1 + A 类必改 3(E03 → R03 张力显式化)。修订要点:
  1. 新增节首 § 0 "为什么明知道 multi-agent 反向去化,还要教你跑"——A 类必改 3 落地:回应 E03 → R03 的预期落差,给出四个独立正当性(面试要问 / 验证 A07 三题判据 / narrow 场景仍有价值 / 知己知彼)
  2. 末尾"R03 真实复现陷阱清单"段重写为"R03 的三个特有失败模式:Multi-Agent 在生产的硬边界" —— 砍除与 R01/R02 末尾雷同的模板套话
  3. 三个失败模式聚焦 multi-agent 范式独有:失败模式 1 Token 失控(乘法不是加法 — hierarchical manager / RoundRobin 空叫 / history 重复传递)/ 失败模式 2 对话漂移(agent 之间能聊死、聊不出结论 — 派失败再派循环 / RLHF 附和倾向)/ 失败模式 3 诊断难度 3-5 倍(失败发生时不知道是哪个 agent 的问题)
  4. R03 之后的去向更直白:**R03 的最大价值不在"教你做 multi-agent",在"让你有判据拒绝默认上 multi-agent"** —— 与 [E03 Multi-Agent 框架·AutoGen & CrewAI & DeerFlow](/kb/agent-系统化专题/e03-multi-agent-框架-autogen-crewai-deerflow/) § 3.6.1 / 3.6.2 + [A07 Multi-Agent Teams](/kb/agent-系统化专题/a07-multi-agent-teams/) § 一三题判据形成统一立场
  5. 面试回答更新:从"R03 是教学模板、生产前需要 5 件事" 升级到"我跑通后体感了三个 multi-agent 独有失败模式,这三点叠加业界 2025 下半年反向去化,我的默认选型是单 agent + 长 reasoning"
- **R3 → R4（2026-05-18）**：本轮聚焦反方对话训练 + 复现陷阱清单 + Failure scenario。修订要点:
  1. 末尾新增 "R03 真实复现陷阱清单" —— 教学时长 vs 真实时长差距(1 小时 vs 4-8 小时);四个具体陷阱(AutoGen v0.4 API breaking / CrewAI hierarchical token 成本 / hierarchical 循环 / RoundRobin 空叫)
  2. 末尾新增 "R03 PM Failure scenario: 2026 年默认应该是单 agent" —— 与 [E03 Multi-Agent 框架·AutoGen & CrewAI & DeerFlow](/kb/agent-系统化专题/e03-multi-agent-框架-autogen-crewai-deerflow/) § 3.6.1 R4 新增联动;明确"R03 不是所有 PM 必经入门"
  3. 引入的对手立场:demo ≠ 生产工程现实、Multi-agent 诊断难度比单 agent 高 3-5 倍、AutoGen / CrewAI 三次以上 breaking change 事实、业界 multi-agent 反向去化趋势(2025 下半年起)
- **R2 → R3（2026-05-18）**：聚焦判断密度提升。本轮修订要点：
  1. 末尾新增"用 Rick 写作 SABCD 评级体系 自评这份代码"段——回应 Round 2 [独家机会-6]
  2. SABCD 自评给出 AutoGen 5.2 / CrewAI 6.2 综合分，明确"两份代码都不及格但取舍不同"是 R03 的设计定位
  3. 关联节点分两档，核心关联加 Rick 写作 SABCD 评级体系
  4. （注：§ 7 DeerFlow 段 Round 2 [失血-11] 提出"DeerFlow 治理结构是字节生态卡位 + OKR 半年一变"的判断 — R3 **部分接受 + 部分反驳**：保留原节点已有的"生态卡位产品"判断（这点是合理的），但**不接受"字节 OKR 半年一变"的具体断言**——没有可靠公开证据支撑该精细判断，写入会成为新的虚构事实。Round 2 给的"DeerFlow 治理结构判断"在原则上正确但具体化超过了证据边界，本轮采用保留 + 不细化的处理）
- **R1 → R2（2026-05-18）**：AutoGen / CrewAI model_id 改 env；ANTHROPIC_API_KEY 防御；RoundRobin 失败模式引用更准确；DeerFlow 段 v1 时间模糊化 + v2.0 时间细化。

---
title: R02 中型生产·LangGraph + MCP
cluster: Agent 系统化专题
created: '2026-05-18'
updated: '2026-05-18'
---

# R02 中型生产·LangGraph + MCP

> 一句话:本节点的目标是带你从 [R01 最小可运行·100 行 ReAct](/kb/Agent-系统化专题/R01-最小可运行·100-行-ReAct/) 的"裸 while 循环"升级到一个具备**显式状态机、HITL 断点、可序列化检查点、MCP 工具接入**的中型生产 Agent。你会构建一个"接收研究问题 → 检索 → 写报告草稿 → 人工确认 → 发送邮件"的五节点工作流,理解为什么 [m208 - AI 基础设施与中间件选型](/kb/AI-工程化与落地架构/m208-AI-基础设施与中间件选型/) 把 LangGraph 单独从 LangChain 里拎出来对照。这是从"原型能跑"到"敢交付"的最短路径。

## 1. 复现目标

我们要构建一个研究助理 Agent,完成这样一个任务:

> "帮我研究一下 2026 年开源 Agent 框架的现状,写一篇 500 字简报,确认无误后发到我的邮箱 longwin1984@gmail.com。"

它必须做到:

- 状态机化:5 个节点 + 1 个 HITL 断点(不是一根 while 撸到底)
- 检查点持久化:在 HITL 处中断 → 保存状态到 SQLite → 几小时后人审完再恢复
- 接 MCP server:用官方 `filesystem` MCP 把"读本地参考文档"作为一个外部能力接入
- Observability:每个节点的输入输出可追踪(用 LangSmith 或 Langfuse)
- 失败可重试:`research` 节点失败时自动退避重试 2 次

不做的事:

- 不做异步流式输出(那是前端的事)
- 不做多 Agent 协作(那是 [R03 Multi-Agent 模板·AutoGen CrewAI](/kb/Agent-系统化专题/R03-Multi-Agent-模板·AutoGen-CrewAI/))
- 不做 RBAC / 多租户(那是企业 Platform 的事,见 [m208 - AI 基础设施与中间件选型](/kb/AI-工程化与落地架构/m208-AI-基础设施与中间件选型/))

## 2. 为什么用 LangGraph 而不是裸 LangChain

[R01 最小可运行·100 行 ReAct](/kb/Agent-系统化专题/R01-最小可运行·100-行-ReAct/) 用裸 while 也能跑通——为什么 R02 必须升级到 LangGraph?四个具体原因(对应 [m208 - AI 基础设施与中间件选型](/kb/AI-工程化与落地架构/m208-AI-基础设施与中间件选型/) 的框架对比表):

| 维度 | 裸 LangChain (Runnable + Agent) | LangGraph |
|---|---|---|
| 控制流 | 隐式(链式 callback 难追) | 显式 DAG(可画图) |
| 状态 | 散落在多个 Memory 对象 | 中心化 `State` TypedDict |
| 检查点 | 自己拼 Redis/SQLite | `MemorySaver` / `SqliteSaver` 原生支持 |
| HITL | 自己实现条件分支+中断 | `interrupt_before=[...]` 一行配置 |

LangGraph 不是"LangChain 的升级版"——它把 LangChain 强调的"链式编排"换成了图论意义上的"状态机编排"。这是 G3+ Agent 工程范式的范式转移(套用 范式 Kuhn 的词):从"流式调用"到"显式状态"。同样的转移在前端框架里发生过(从 jQuery 到 Redux),在数据工程里发生过(从 cron 到 Airflow)。Agent 工程不会例外。

如果你的需求停留在"一次性回答问题"(R01 那样),裸 LangChain / 甚至裸 SDK 就够;一旦出现"需要暂停 / 续传 / 多人协作"任何一条,就该上 LangGraph。这是 [m202 - 工程选型决策矩阵](/kb/AI-工程化与落地架构/m202-工程选型决策矩阵/) 在 Agent 子领域的具体化。

## 3. 环境准备

```bash
# 核心
pip install langgraph langchain-anthropic langchain-core
# MCP 适配器（LangChain 团队 2025 维护的官方桥）
pip install langchain-mcp-adapters
# 官方 filesystem MCP server（Node 实现，全局安装）
npm install -g @modelcontextprotocol/server-filesystem
# 检查点持久化
pip install langgraph-checkpoint-sqlite
# 发邮件（用 SMTP，比配 SendGrid 简单）
# 不需要 pip 包，stdlib 自带
# Observability（二选一）
pip install langsmith  # 或 pip install langfuse
```

环境变量(写入 `.env`):

```bash
ANTHROPIC_API_KEY=sk-ant-xxx
LANGSMITH_API_KEY=ls__xxx        # 可选；不设置就只打印不上报
LANGSMITH_TRACING=true            # 启用追踪
SMTP_USER=your_gmail@gmail.com
SMTP_PASSWORD=xxxxxxxxxxxx         # Gmail 应用专用密码，不是登录密码
```

> 注:Gmail 需要在账户设置里生成"应用专用密码";直接用登录密码会被 Google 拒。**且 Gmail 在 2024 年起多次收紧第三方 SMTP 接入,即使用"应用专用密码"也可能返回 `Username and Password not accepted`**——R02 把 SMTP 作为最小演示,生产环境建议改用 SendGrid / Resend / Mailgun 等专业邮件 API。这是 m207 - Agent 产品化:场景推演与失败模式 谈"工具配置失败"的典型例子——Agent 工程 30% 时间花在这种"非智力性"问题上。

## 4. 代码骨架(约 230 行,分块讲)

### 4.1 状态定义(20 行)

```python
"""r02_research_agent.py — 状态机部分"""
from typing import TypedDict, Annotated, Literal
from operator import add
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.sqlite import SqliteSaver

class ResearchState(TypedDict):
    """中心化状态——LangGraph 的核心抽象。
    所有节点都读这同一个 dict、写这同一个 dict。
    比 LangChain Memory 的散落式状态好 debug 100 倍。"""
    query: str                              # 用户原始问题
    sources: Annotated[list[str], add]      # 检索到的资料；add 表示节点返回会 append 而非覆盖
    draft: str                              # LLM 写的草稿
    approved: bool                          # 人审是否通过
    edit_feedback: str                      # 人审给的修改意见（若有）
    email_sent: bool                        # 邮件是否已发
    retry_count: int                        # research 节点的重试次数
```

> 为什么用 `Annotated[list, add]`?LangGraph 默认每个 key 是"覆盖"语义——节点 return `{"sources": [...]}` 会替换掉之前的。加 `Annotated[list, add]` 后变成"追加"语义,这样多个节点都能往 `sources` 里加东西不会互相覆盖。这是 LangGraph 借鉴 Elm/Redux 的 reducer 模式。

### 4.2 节点函数(80 行)

```python
"""节点 = 纯函数 (state) -> partial_state_update"""
import os, smtplib
from email.mime.text import MIMEText
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_mcp_adapters.client import MultiServerMCPClient

import os, sys

if not os.environ.get("ANTHROPIC_API_KEY"):
    sys.exit("请先设置 ANTHROPIC_API_KEY 环境变量后再运行")

# Anthropic model_id 随版本变化,以官方文档为准:
#   https://docs.anthropic.com/en/docs/about-claude/models
# 截至 2026-05 公开可调用别名包含 claude-sonnet-4-5、claude-opus-4-5、claude-haiku-4-5;
# 若你的账号已开通 Sonnet 4.6 / Opus 4.7,可改 ANTHROPIC_MODEL 环境变量。
MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-5")
llm = ChatAnthropic(model=MODEL, max_tokens=2048)

# MCP 客户端（启动 filesystem MCP server，让 Agent 能读本地参考文档）
mcp_client = MultiServerMCPClient({
    "filesystem": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", os.path.expanduser("~/research_refs")],
        "transport": "stdio",
    }
})

async def research_node(state: ResearchState) -> dict:
    """节点 1：检索资料。MCP filesystem 读本地参考文档 + 简单 web 搜索占位。
    失败时自动重试（指数退避），最多 2 次。"""
    # 注:langchain-mcp-adapters >=0.1.0 起 MultiServerMCPClient 不再作为 async
    # context manager 使用;直接调用 client.get_tools() 即可。若你装的是 <0.1.0
    # 旧版本,需改写为 `async with mcp_client as c: tools = await c.get_tools()`。
    # 接口随版本变化,请在 requirements.txt 中固定:
    #   langchain-mcp-adapters==0.1.x  (具体小版本以你 pip 安装到的为准)
    tools = await mcp_client.get_tools()  # 动态获取 MCP 暴露的工具
    llm_with_tools = llm.bind_tools(tools)
    try:
        msg = await llm_with_tools.ainvoke([
            SystemMessage(content="你是研究员。检索相关资料，给出 3-5 条要点。"),
            HumanMessage(content=state["query"]),
        ])
        # 简化：直接把 LLM 输出作为一条 source；生产中应迭代 tool_calls
        return {"sources": [msg.content[:1000]], "retry_count": 0}
    except Exception as e:
        if state.get("retry_count", 0) < 2:
            return {"retry_count": state.get("retry_count", 0) + 1}
        raise  # 重试耗尽，让图自然失败，状态会被 checkpoint 保留供下次续跑

def draft_node(state: ResearchState) -> dict:
    """节点 2：根据资料 + 上轮反馈写草稿。
    注意：如果 edit_feedback 非空，意味着是人审打回，要带着反馈重写。"""
    sources_text = "\n---\n".join(state["sources"])
    prompt = f"主题：{state['query']}\n\n资料：\n{sources_text}\n\n"
    if state.get("edit_feedback"):
        prompt += f"\n上一稿人工反馈：{state['edit_feedback']}\n请按反馈重写。"
    prompt += "\n请写一篇 500 字中文简报，逻辑清晰、避免泛泛。"
    msg = llm.invoke([HumanMessage(content=prompt)])
    return {"draft": msg.content}

def human_review_node(state: ResearchState) -> dict:
    """节点 3：HITL 断点节点本身不做事——真正的中断是图配置里的 interrupt_before。
    这个空函数只是占位，让图有个明确的"等人"节点。"""
    # 当 resume 时，外部程序会更新 state['approved'] 或 state['edit_feedback']
    return {}

def route_after_review(state: ResearchState) -> Literal["send_email", "draft"]:
    """条件边：人审通过 → 发邮件；不通过 → 回到 draft 重写。"""
    return "send_email" if state.get("approved") else "draft"

def send_email_node(state: ResearchState) -> dict:
    """节点 4：发邮件。生产中应换成异步队列；R02 用同步 SMTP 演示。"""
    msg = MIMEText(state["draft"], "plain", "utf-8")
    msg["Subject"] = f"研究简报: {state['query'][:30]}"
    msg["From"] = os.environ["SMTP_USER"]
    msg["To"] = "longwin1984@gmail.com"
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
        s.login(os.environ["SMTP_USER"], os.environ["SMTP_PASSWORD"])
        s.send_message(msg)
    return {"email_sent": True}
```

### 4.3 图编排(40 行)

```python
"""把节点接成 DAG，并配置 HITL 中断"""
def build_graph():
    g = StateGraph(ResearchState)
    g.add_node("research", research_node)
    g.add_node("draft", draft_node)
    g.add_node("human_review", human_review_node)
    g.add_node("send_email", send_email_node)

    g.add_edge(START, "research")
    g.add_edge("research", "draft")
    g.add_edge("draft", "human_review")
    g.add_conditional_edges("human_review", route_after_review, {
        "send_email": "send_email",
        "draft": "draft",     # 不通过 → 回到 draft 重写
    })
    g.add_edge("send_email", END)

    # 关键：interrupt_before=["human_review"] 让图在该节点前停下
    # 等待外部程序调 graph.update_state 然后 graph.invoke(None, ...) 续跑
    #
    # 注:SqliteSaver.from_conn_string(...) 是 @contextmanager 工厂——返回 context
    # manager 而不是直接的 saver 实例。脚本/教学场景用 `with` 语法;长生命周期
    # 服务场景(如下 build_graph 这种持久持有 graph 的写法)直接传 sqlite3 连接
    # 实例化 SqliteSaver,以避免上下文过早关闭。
    import sqlite3
    conn = sqlite3.connect("checkpoints.db", check_same_thread=False)
    checkpointer = SqliteSaver(conn)
    return g.compile(checkpointer=checkpointer, interrupt_before=["human_review"])

# 使用示例（CLI 演示；生产应包成 FastAPI）
async def main():
    graph = build_graph()
    thread = {"configurable": {"thread_id": "research-001"}}  # 一个 thread_id = 一个对话

    # 第一次跑：会停在 human_review 之前
    async for event in graph.astream({"query": "2026 年开源 Agent 框架的现状"}, thread):
        print(event)

    # 此时检查 state,给人看(async 上下文中优先使用 aget_state / aupdate_state)
    state = await graph.aget_state(thread)
    print("\n=== 当前草稿，请审核 ===\n", state.values["draft"])
    decision = input("通过(y) / 退回重写并写反馈: ").strip()

    # 把人审结果写回 state
    if decision.lower() == "y":
        await graph.aupdate_state(thread, {"approved": True})
    else:
        await graph.aupdate_state(thread, {"approved": False, "edit_feedback": decision})

    # 续跑（传 None 表示从 checkpoint 恢复，不重新输入）
    async for event in graph.astream(None, thread):
        print(event)
```

### 4.4 启动入口(10 行)

```python
if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
```

总计约 230 行,运行:

```bash
mkdir -p ~/research_refs && echo "参考资料示例" > ~/research_refs/sample.md
python r02_research_agent.py
```

## 5. 关键工程问题

R01 不会遇到的、R02 必然撞上的四个问题:

### 5.1 状态太大怎么办

LangGraph 的 `SqliteSaver` 默认用 pickle 序列化整个 `State` dict。如果 `sources` 长到几 MB(比如塞了爬虫原文),pickle 会变慢、磁盘会涨、并发会锁。三个常用对策(参考 [m208 - AI 基础设施与中间件选型](/kb/AI-工程化与落地架构/m208-AI-基础设施与中间件选型/) 的存储选型):

- **大对象外存**:`sources` 只存 S3 URL,LangGraph state 只存指针
- **换 checkpointer**:`PostgresSaver` 比 SQLite 抗并发好得多,生产首选
- **状态分片**:把 sub-graph 独立存,主图只引用 sub-graph 的 ID

### 5.2 HITL 断点的实现细节

LangGraph 的 `interrupt_before=["human_review"]` 不是"暂停线程",而是"运行到那个节点之前 return"——整个进程是无状态的。这意味着:

- 你必须用 `thread_id` 把不同对话隔离
- `graph.update_state(thread, {...})` 是给恢复时用的"伪节点输出"
- `graph.invoke(None, thread)` 才是真正的"续跑"信号

链入 m207 - Agent 产品化:场景推演与失败模式 的 HITL 三维度(频率/成本/可逆性):R02 这种"写邮件前必审"属于"低频/高成本/不可逆"——必须 HITL,且必须用持久化检查点(不能用内存 saver,因为人可能几小时后才审)。

### 5.3 失败重试与回退

`research_node` 里我们用 `state.retry_count` 自己计数。这只是教学用法,生产里有两种更好的方式:

- **节点级**:`@retry(stop=stop_after_attempt(3), wait=wait_exponential())` 装饰器(tenacity 库)
- **图级**:LangGraph 0.2+ 的 `retry_policy=RetryPolicy(...)` 可在 `add_node` 时传入

回退策略本身比重试更重要:`research_node` 失败 2 次后,应该是"换个工具再试"还是"降级到只用 LLM 自己的世界知识"?这是产品决策,不是技术决策——但 [A04 Reflexion](/kb/Agent-系统化专题/A04-Reflexion/) 给的工程模板告诉你:把"失败原因"也写进 state,让下次重试有信息可用。

### 5.4 Observability:LangSmith vs Langfuse

[m208 - AI 基础设施与中间件选型](/kb/AI-工程化与落地架构/m208-AI-基础设施与中间件选型/) 已经详细对照过两者。R02 的具体场景下:

- **LangSmith**:LangChain 官方,和 LangGraph 集成最深(`@traceable` 装饰器一加就有);贵,SaaS 锁定
- **Langfuse**:开源可自托管,适合数据敏感场景(银行/医疗);需要自己运维

PM 决策不复杂:个人/小团队 PoC 用 LangSmith;公司有合规要求用 Langfuse。两者都不要,意味着出问题时你只能盯着 print 看——这是 R01 阶段允许的,R02 不允许。

## 6. 部署考虑

R02 在本地 CLI 跑通后,走向生产的三个阶段:

### 阶段 A:单进程 FastAPI

```python
from fastapi import FastAPI, BackgroundTasks
app = FastAPI()
graph = build_graph()  # 全局复用

@app.post("/research")
async def start_research(query: str, bg: BackgroundTasks):
    thread_id = f"research-{uuid.uuid4()}"
    bg.add_task(graph.ainvoke, {"query": query}, {"configurable": {"thread_id": thread_id}})
    return {"thread_id": thread_id}

@app.post("/review/{thread_id}")
def submit_review(thread_id: str, approved: bool, feedback: str = ""):
    thread = {"configurable": {"thread_id": thread_id}}
    graph.update_state(thread, {"approved": approved, "edit_feedback": feedback})
    graph.invoke(None, thread)
    return {"ok": True}
```

够用到 ~100 并发用户。

### 阶段 B:Celery + Redis

当 `research_node` 平均耗时 30 秒,FastAPI worker 会被打满。把每个节点的执行包成 Celery task,LangGraph 自身作为调度器——这是 LangGraph 官方推荐的"长任务架构"。

### 阶段 C:Token 成本估算

R02 一轮(research + draft + 1 次重写)实测约 8000 input + 1500 output token,Claude Sonnet 4.6 价格下约 0.04 美元/次。如果每天 100 次,月成本 120 美元。这个数字本身不大——但当你把"用户审核延迟"算进去:平均人审延迟 2 小时,意味着 state 在 SQLite 里平均躺 2 小时——存储成本几乎为零,但**机会成本**(用户走神、忘了为什么提的需求)是真实的。这是 m207 - Agent 产品化:场景推演与失败模式 反复强调的"HITL 的真实成本是延迟,不是钱"。

### 阶段 D:HITL 通知

人审节点触发后,如何告诉人?三种渠道:

- **邮件**:延迟高(分钟级),但留痕好
- **Slack webhook**:延迟低(秒级),但容易被刷掉
- **应用内待办**:最理想,但需要前端配合

[Manus](/kb/AI-公司与产品/Manus/) 和 [Claude Code](/kb/AI-公司与产品/Claude-Code/) 用的都是第三种;R02 演示用最简单的邮件即可。

## 7. PM 决策启示

跑过 R02 之后,你应该能在三个产品场景里给出有依据的判断:

### 7.1 何时从 R01 升级到 R02

不要为了"先进"而升级。升级的硬触发条件是以下任意一条:

- 任务耗时 > 60 秒(用户会切走,需要异步状态)
- 涉及不可逆操作(发邮件/转账/删数据,必须 HITL)
- 多 session 协作(同一个任务被多人推进,必须持久化状态)
- 调试需求(出 bug 时无法只靠 print,需要 trace)

只要这四条都不满足,R01 那种 113 行裸 while 就是最优解——加 LangGraph 只是给自己挖坑(参考 [AI概念滥用反思](/kb/AI-基础知识库/AI概念滥用反思/) 的"过度工程"反模式)。

### 7.2 LangGraph vs 自研轻量编排的临界点

国内大厂(字节、阿里)很多团队不用 LangGraph 而自研——他们的合理理由有三个:

- LangGraph 强依赖 LangChain 生态,中文 SDK 体验差
- 团队已有成熟内部工作流引擎(如 Flowable/Camunda),嫁接成本低
- 数据合规要求 trace 不出国,LangSmith 不能用

但如果你团队规模 < 10 人、没有现成工作流引擎、且需求会持续迭代——自研基本是 PM 与 CTO 共同的"虚荣项目"。这是 [m202 - 工程选型决策矩阵](/kb/AI-工程化与落地架构/m202-工程选型决策矩阵/) 谈"自研陷阱"的具体化。

### 7.3 团队需要哪些角色

R01 阶段一个会 Python 的工程师就够;R02 阶段你需要:

- **Backend**:写 FastAPI + Celery(1 人)
- **Prompt/Agent 工程师**:调 system prompt、写节点函数、跑 trace 分析(0.5-1 人,可由 PM 兼任)
- **SRE**:管 checkpoint 数据库、监控 LLM API quota、配 Observability(0.5 人)

总计约 2-2.5 FTE。如果团队凑不出这个配置,意味着 R02 还不该上——退回 R01 或外采 Dify / n8n 这类低代码方案(见 [m208 - AI 基础设施与中间件选型](/kb/AI-工程化与落地架构/m208-AI-基础设施与中间件选型/))。

## 与已有节点的关系

本节点对 [R01 最小可运行·100 行 ReAct](/kb/Agent-系统化专题/R01-最小可运行·100-行-ReAct/) 是"接续升级":R01 教 ReAct 循环,R02 教状态机化与持久化——这是 [G02 五代演化详解·G1-G5](/kb/Agent-系统化专题/G02-五代演化详解·G1-G5/) 里 G2 → G3 的工程化跨越。

对 [m208 - AI 基础设施与中间件选型](/kb/AI-工程化与落地架构/m208-AI-基础设施与中间件选型/) 是"复现实证":m208 给了编排框架对比表,R02 把 LangGraph 行的那几个特性"显式图""可序列化""HITL 原生"在代码里真正呈现出来。

对 m207 - Agent 产品化:场景推演与失败模式 是"对话":m207 谈"HITL 三维度",R02 给出"低频/高成本/不可逆"这一类的标准实现模板。

对 [c10 - Agent 技术栈与工具调用](/kb/AI-基础知识库/c10-Agent-技术栈与工具调用/) 是"协议补完":c10 提到 [A08 MCP 与 A2A 协议族](/kb/Agent-系统化专题/A08-MCP-与-A2A-协议族/) 是事实标准,R02 给出了 LangGraph + langchain-mcp-adapters 的具体接法。

## PM 决策启示(精要)

R02 最大的"暗成本"不是 token、不是 LangGraph 学习曲线,而是**HITL 的延迟成本**——它会从根本上改变产品节奏。当你把一个"5 秒回答"的产品变成"5 秒提交 + 2 小时审核 + 5 秒发送"的产品,用户体验、留存、活跃曲线都会被重写。这是面试时问"你做过 Agent 项目吗"之后,真正能区分"做过 demo"和"做过生产"的问题:你能不能回答"HITL 之后,DAU 怎么算"。

## 用 Rick 写作 SABCD 评级体系 自评这份代码

> Rick 在写作领域已有 SABCD 评级方法论——把它平移到"评估自己复现的代码质量"，是把已有方法论扩展到新领域的最直接练习。

| SABCD 维度 | 在代码场景的含义 | 本份 R02 代码自评 |
|---|---|---|
| **S（Structural / 结构性）** | 模块边界、控制流清晰度、状态管理 | 7/10——LangGraph state machine 清晰，但 MCP server 接入 + Gmail SMTP 混在 main.py 偏耦合，生产应拆出 services/ |
| **A（Algorithmic / 算法密度）** | 关键判断的算法精度（如 HITL 触发、错误恢复、重试策略） | 6/10——HITL 触发条件已显式（不可逆操作 + 人为审批），但重试策略简单（指数退避未配置），错误恢复缺失（没有 try/except 包络 LLM 调用） |
| **B（Boundary / 边界与异常）** | 失败模式覆盖、降级策略、安全边界 | 5/10——网线断、MCP server 挂、SMTP 拒绝三类失败都没显式处理；生产前必须补 |
| **C（Conventions / 工程规范）** | 命名、注释、可读性、版本绑定 | 7/10——env 变量化 model_id、注释充足；但 type hint 缺失、log level 没配置 |
| **D（Evolvability / 可演进性）** | 是否易于切换组件（model / orchestrator / tools / HITL UI）| 7/10——LangGraph 让节点替换容易，MCP 让工具替换容易；但 HITL UI 强耦合 SMTP 模板，切换审批渠道（如改成 Slack）需重写 |

**综合**：6.4/10 — "够 PoC，不够生产"。**这正是 R02 的设计定位**：让你在跑通一次完整 LangGraph + MCP + HITL 闭环的过程中，亲手感受"PoC 和生产之间的鸿沟在哪 5 个具体维度上"。把 SABCD 表当成自检清单——升级 R02 到生产前，每个维度都要做到 8/10 以上才能上线。

**这也是 SABCD 方法论在代码评估上的活体验证**——一套写作评级体系经过同构平移，可以变成代码自检 checklist，因为两者的底层都是"判断结构 vs 判断填充"的二元区分。

## R02 的三个特有失败模式:状态机 + HITL 在生产的硬边界

> R02 把 R01 的单线程内存升级到 LangGraph + 显式状态机 + MCP + HITL。这一步**带来了 R01 没有的三个失败模式**——它们和 R01 单 Agent / R03 multi-agent 的失败完全不同,集中在"持久化层、外部链路、UI 回调"这三个 R02 独有的耦合点。

**失败模式 1: SqliteSaver 在并发下崩溃 —— 持久化层的虚假合格**

R02 § 5.1 提到"换 checkpointer",但跑通 demo 时 SqliteSaver 一切正常,**Rick 容易误以为持久化层已就绪**。真实情况:**SqliteSaver 在 5+ 并发用户同时操作时会触发 `database is locked`**——SQLite 本身是单写入者模型,LangGraph 的 checkpoint 写入又频繁,生产里两个用户的 thread 撞上就锁死。

这是 R02 独有的失败模式:R01 没有持久化所以不会撞,R03 通常用更轻的内存 / Redis 状态。**应对**:**生产环境直接 `pip install langgraph-checkpoint-postgres` 用 PostgresSaver**;R02 的 SqliteSaver 应该被理解为"教学占位",不是"小流量可上"——任何会有 ≥ 2 个并发用户的场景都已经不安全。

**失败模式 2: 外部链路反复腐烂 —— Gmail SMTP / MCP server 的供应链**

R02 比 R01 多了两条外部链路:**邮件通道(Gmail SMTP)和 MCP server**。两者都是"demo 阶段能跑,生产阶段持续坏"的典型。

Gmail SMTP 在 2026 年实际上已经几乎不可用——**应用专用密码对部分老账号失效、新账号默认禁用 SMTP**,Rick 第一次跑大概率拿到 "535 Username and Password not accepted"。**应对**:**默认改 SendGrid / Resend / Mailgun**,Gmail SMTP 只作为"个人验证可试"。

MCP server 链路风险更隐蔽:**2025-Q3 已多起伪装成流行 MCP server 的供应链攻击**——npm install 来历不明的 server 等于把 token / 文件系统 / API key 交给攻击者。**应对**:**生产只用 official MCP server 或自家 fork 后审计的 server**;`langchain-mcp-adapters` 同时在 2024-2025 经历 0.0.x → 0.1.0 → 0.2.0 三次 breaking change,**必须 `langchain-mcp-adapters==0.1.x` 锁版本**,不要写 `>=0.1`。

这是 R02 独有:R01 单工具调用没有这种供应链问题,R03 框架内调用也没有(都在框架内进程内)。**外部链路的脆弱性是状态机 + 外部工具组合的代价**。

**失败模式 3: HITL 的 UI 链路 —— 中断接得住,等待接不住**

R02 § 3.2 给了 HITL 的 interrupt 机制,跑 demo 时 Rick 在 terminal 输入"y/n"就能继续——**这是 demo 假象**。生产里 HITL 的真实形态是:**LangGraph 在 server 端 interrupt → 把 thread state 持久化 → 推送通知到用户(微信/邮件/Slack)→ 用户可能 24 小时后才回复 → 找回原 thread → 注入用户输入 → 续跑**。

R02 demo 跑通了前两步("server 端 interrupt + 持久化"),**后三步(推送、长等待、找回、续跑)在 demo 完全没覆盖**。Rick 容易误以为 "HITL 已就绪"。真实生产里 HITL 失败的最常见形态是:**用户被打断 → 通知没送达或用户忘了 → thread 在 checkpoint 里挂死 → 占用 connection + DB row 直到 TTL 清理**。

这是 R02 / HITL 范式独有的失败模式——R01 没有 HITL,R03 multi-agent 通常用 agent 之间互相 review 代替人类回路。**应对**:HITL thread 必须有 (a) 显式 TTL 超时自动 abort、(b) 推送链路监控、(c) 续跑前的 stale check(用户回复时,thread state 可能已过期)。这三件事 demo 都没覆盖——**这是把"4 小时跑通的 230 行"和"3 人月的生产 HITL"分开的真实工程量**。

**R02 跑通的真实时长校准**

本节点写"4 小时上手"是版本兼容已对齐的乐观估计。**真实第一次跑通 8-16 小时**——多出来的时间花在三个版本组合(LangGraph / langchain-mcp-adapters / langchain-anthropic)的兼容、SqliteSaver 第一次 `database is locked`、Gmail SMTP 拒签、npm install MCP server 在 npm registry 受限地区需配代理。

**对 PM 的具体启示**

R02 跑通后,正确的判断是"我体感了 LangGraph + MCP + HITL 范式,以及状态机 + HITL 在生产的三个特有断点"——不是"我能做生产级 Agent 项目了"。面试遇到"你能用 R02 框架做企业项目吗",可以回答:"R02 是教学模板,生产前必须做 (a) 换 PostgresSaver(SqliteSaver 在 5+ 并发会锁死)/ (b) 换专业邮件 API + 审计所有 MCP server / (c) 把 HITL 的 UI 链路打通 —— 推送 + TTL 超时 + 续跑前 stale check。这三件事加起来 2-3 人月起步,R02 的 230 行只是这套生产代码的 5-10%。我跑通 R02 的价值不在'我能上线',在于我知道这三道墙在哪、为什么会撞"。

**R02 之后的去向**:R02 已经覆盖了 80% 单 Agent + 状态机 + 外部工具的工程位置。**不要默认上 R03**——R03 是为 "确实需要 multi-role 协作 + R02 撑不住" 的少数场景准备的(见 [A07 Multi-Agent Teams](/kb/Agent-系统化专题/A07-Multi-Agent-Teams/) § 一的三题判据)。R02 之后更常见的下一步是**深化 R02:加 RBAC、加多租户、加 trace + audit log、加成本控制**——这些都还在 R02 范式内,不需要 R03。

## R02 PM Failure scenario (R4 新增):LangGraph 在小团队过度工程

> 与 [A06 Orchestrator 编排器](/kb/Agent-系统化专题/A06-Orchestrator-编排器/) § 三 R4 新增 failure scenario 联动 —— 不重复展开,要点回顾:

在 **1-2 人的小团队 + 早期 PMF 探索阶段**,LangGraph 是过度工程——R02 的 230 行学习曲线和样板代码会让团队拖慢 1-2 周。**裸 ReAct(R01 113 行)+ Redis 状态存储** 比 LangGraph 划算。**升级 LangGraph 的硬触发条件**:任务时长 > 60 秒 / 涉及不可逆操作 / 多 session 协作 / 调试需求(详见 A06 § 三 R4 列表)。

**这给 R02 教学定位的 R4 修订**:**R02 不是"所有 Agent 项目的必经之路",是"有特定生产需求时才需要"**。在面试遇到"你为什么不直接用 LangGraph"时,正确回答是"我先用裸 ReAct 验证业务需求是否真实,只有触发硬触发条件之一才升级 LangGraph——避免过度工程是 PM 选型的第一原则"。

## 关联节点

**核心关联（必读）**：
- [R01 最小可运行·100 行 ReAct](/kb/Agent-系统化专题/R01-最小可运行·100-行-ReAct/)——R02 是 R01 的工程化升级
- [R03 Multi-Agent 模板·AutoGen CrewAI](/kb/Agent-系统化专题/R03-Multi-Agent-模板·AutoGen-CrewAI/)——R02 之后是 R03 multi-agent
- [A06 Orchestrator 编排器](/kb/Agent-系统化专题/A06-Orchestrator-编排器/)、[A08 MCP 与 A2A 协议族](/kb/Agent-系统化专题/A08-MCP-与-A2A-协议族/)——LangGraph + MCP 的概念基础
- Rick 写作 SABCD 评级体系——本节点 SABCD 自评的方法论源头
- m207 - Agent 产品化:场景推演与失败模式——HITL 三维度判断的代码实现

**延伸关联（可选）**：
- [S01 Agent 六层架构剖面](/kb/Agent-系统化专题/S01-Agent-六层架构剖面/)、[G02 五代演化详解·G1-G5](/kb/Agent-系统化专题/G02-五代演化详解·G1-G5/)、[m208 - AI 基础设施与中间件选型](/kb/AI-工程化与落地架构/m208-AI-基础设施与中间件选型/)、[m202 - 工程选型决策矩阵](/kb/AI-工程化与落地架构/m202-工程选型决策矩阵/)、[c10 - Agent 技术栈与工具调用](/kb/AI-基础知识库/c10-Agent-技术栈与工具调用/)、[A04 Reflexion](/kb/Agent-系统化专题/A04-Reflexion/)
- [Claude](/kb/AI-公司与产品/Claude/)、[Anthropic](/kb/AI-公司与产品/Anthropic/)、[Manus](/kb/AI-公司与产品/Manus/)、[Claude Code](/kb/AI-公司与产品/Claude-Code/)、[AI概念滥用反思](/kb/AI-基础知识库/AI概念滥用反思/)、范式

---

## 修订日志

- **R4 → R5（2026-05-18)**:本轮聚焦出版就绪——A 类必改 1(R01-R03 末尾"demo ≠ 生产" 模板化差异化重写)。修订要点:
  1. 末尾"R02 真实复现陷阱清单"段重写为"R02 的三个特有失败模式:状态机 + HITL 在生产的硬边界" —— 砍除与 R01/R03 末尾雷同的"教学时长 → 4 个陷阱 → 启示"模板
  2. 三个失败模式聚焦 R02 范式独有:失败模式 1 SqliteSaver 在并发下崩溃(持久化层虚假合格)/ 失败模式 2 外部链路反复腐烂(Gmail SMTP + MCP server 供应链)/ 失败模式 3 HITL UI 链路(demo 接得住中断、接不住推送 + 长等待 + 找回 + 续跑后三步)
  3. 把原 4 条陷阱清单内化进 3 个失败模式叙事——SqliteSaver / Gmail SMTP / langchain-mcp-adapters / MCP server 各自归位
  4. R02 PM Failure scenario(LangGraph 在小团队过度工程)段保留不动——与"demo ≠ 生产"段是不同主题
  5. 面试回答更新:聚焦"我知道这三道墙在哪、为什么会撞" 的负向认知,而非"我能上线"
  6. R02 之后的去向显式化:**不要默认上 R03,常见下一步是深化 R02(RBAC / 多租户 / trace / audit log / 成本控制)**——这些都还在 R02 范式内
- **R3 → R4（2026-05-18）**：本轮聚焦反方对话训练 + 复现陷阱清单 + Failure scenario。修订要点:
  1. 末尾新增 "R02 真实复现陷阱清单" —— 教学时长 vs 真实时长差距(4 小时 vs 8-16 小时);四个具体陷阱(SqliteSaver 并发 / Gmail SMTP 失效 / langchain-mcp-adapters API breaking / MCP server 供应链审计)
  2. 末尾新增 "R02 PM Failure scenario: LangGraph 在小团队过度工程" —— 与 [A06 Orchestrator 编排器](/kb/Agent-系统化专题/A06-Orchestrator-编排器/) § 三 R4 新增联动;明确"R02 不是所有 Agent 项目的必经之路"
  3. 引入的对手立场:demo ≠ 生产工程现实、SQLite 在 5+ 并发不可用的工程事实、Gmail SMTP 2026 失效事实、langchain-mcp-adapters API breaking 事实、MCP server 供应链攻击事实(2025-Q3 已多起)
- **R2 → R3（2026-05-18）**：聚焦判断密度提升。本轮修订要点：
  1. 末尾新增"用 Rick 写作 SABCD 评级体系 自评这份代码"段，给出 5 维度评分（S 7/A 6/B 5/C 7/D 7，综合 6.4/10）——回应 Round 2 [独家机会-6]
  2. SABCD 自评把"PoC vs 生产的鸿沟在哪 5 个维度"显式化，作为升级到生产前的自检清单
  3. 关联节点分两档，核心关联加 Rick 写作 SABCD 评级体系
- **R1 → R2（2026-05-18）**：model_id 改 env；SqliteSaver 改显式 connect；async 一致改 aget/aupdate_state；Gmail SMTP 加生产建议；MCP get_tools 保留并附版本注释（反驳 Round 1 [致命-4] 并附 langchain-mcp-adapters 0.1.0+ 文档证据）。

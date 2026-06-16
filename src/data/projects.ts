// 项目清单 —— 可配置：featured 的默认展示，其余收在「展开全部」里；
// 数量自适应（非 featured 为 0 时不渲染展开按钮）。新增项目只改这里。
// 文案纪律（2026-06 批判报告后定）：每条交代角色/关键决策/取舍/结果，
// 数字必须有仓库或文档出处；无公开链接的项目不给 href（渲染为「仓库整理中」）。
export interface Project {
  title: string;
  desc: string;
  tags: string[];
  img: string;
  alt: string;
  href?: string;
  featured?: boolean;
  /* 18px stroke 风格小图标（信任的内部 SVG，set:html 渲染） */
  icon?: string;
}

const I = (paths: string) =>
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

export const PROJECTS: Project[] = [
  {
    title: '博物志 · 把 AI 的约束当设计原则',
    desc: '我的 AI PM 作品集：把自己拆成 8 个有边界的 agent、跑 5 个 sprint，从零做一个 AI 原生文博收藏产品。核心不是用 AI 写代码，是把它的三个约束（角色有边界 / 上下文冷启动 / 文件系统即状态）当成产品和协作的设计原则。一夜审计放行的 demo，被我自己一点就露馅——275 件文物静默回退成同一件，于是加了第 7 个「必须真点击」的审计；一条 RAG 反幻觉管道，无出处的 chunk 当场拒收。产出：三联动可跑 demo（28/28 绿）、277 件 ×11 字段结构化数据、约 10,600 字方法论复盘。MVP 未发布、KPI 全是假设——都写在页面里。',
    tags: ['AI 原生产品', '多智能体方法论', 'RAG 反幻觉'],
    icon: I('<circle cx="5" cy="6" r="2.2"/><circle cx="19" cy="6" r="2.2"/><circle cx="5" cy="18" r="2.2"/><circle cx="19" cy="18" r="2.2"/><circle cx="12" cy="12" r="2.6"/><path d="M6.8 7.4 9.9 10.2M17.2 7.4 14.1 10.2M6.8 16.6 9.9 13.8M17.2 16.6 14.1 13.8"/>'),
    img: '/assets/proj-museum-collect.jpg',
    alt: '博物志 v3 三联动 dashboard：时代柱、古国地图与文物卡片同屏联动',
    href: '/projects/museum-collect/',
    featured: true,
  },
  {
    title: 'Slash Goal · 谁来认定「干完了」',
    desc: '逆向 Codex 的 /goal 自驱动循环，在 Trae 和 Claude Code 上各复刻一遍。难点从来不是 agent 干不干得完，是它会从自己刚污染过的会话里给自己打绿灯——要么漏需求假完成，要么把半截 stub 当验收。Trae 没 hooks，只能停在「求模型自觉」；Claude Code 上换成独立冷上下文 auditor，从 spec 重推需求、对照真实文件树才放行。然后我审了自己的审计器：2 个 Critical（沙箱实证的 jq 注入、伪只读的任意代码执行）全修。厂商中途上线原生 /goal，我转成对照评测——探针级 5/5 抓出假完成。',
    tags: ['Agent 编排', '独立审计', '对抗评测'],
    icon: I('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m8 9 3 3-3 3"/><path d="M13 15h4"/>'),
    img: '/assets/proj-slash-goal.svg',
    alt: 'Slash Goal：自驱动 agent 完成判定 — 会话内自评 vs 独立冷上下文审计',
    href: '/projects/slash-goal/',
    featured: true,
  },
  {
    title: 'Writer Pipeline 写作系统',
    desc: '我先给自己搭了个 13 组件的多智能体写作系统，再戴上「严苛 AI PM 面试官」的帽子把它审了一遍——severity 4/5，「写作品味 A，产品架构判断 C」，当场砸成 3 组件 MVP。跑通第一篇真文章才看清：AI 味不在通用套路，在「太像我自己」的金句口癖，治法是逐句分 earned/cosplay、给金句配额，不是堆禁用词。最后一次跨模型 A/B 实测，推翻了我自己白纸黑字写进 plan 的「critic 改用 DeepSeek」。',
    tags: ['产品判断', '降 AI 味', 'Case Study'],
    icon: I('<path d="M9 4h7l3 3v11a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M16 4v3h3"/><path d="M6 7v12a2 2 0 0 0 2 2h8"/><path d="M11 11h5M11 14.5h5"/>'),
    img: '/assets/proj-writer-pipeline.svg',
    alt: 'Writer Pipeline：一段真实草稿被逐句 X 光扫描，标出 earned / cosplay 金句',
    href: '/projects/writer-pipeline/',
    featured: true,
  },
  {
    title: 'Galaxy View 星系视图',
    desc: '我给 Obsidian 写了个 3D 图谱插件，替掉自带的 2D Graph——我那个 3,225 篇的库在 2D 里只剩一团糊。市面 4 个同类插件全停更、全死在同一堵墙：逐对象渲染，真实库规模下一帧约 2.2 万次 draw call。我赌的方案是聚合渲染——全部节点压成一次 draw call，帧率从 16 拉到 60、draw call 降到 19，而这套点精灵发光 shader 恰好就是 NASA「Eyes」的发光球观感，性能和颜值在同一个解法里汇合。每个里程碑先定好 fps 数字门控再开工，坏结果是计划内分支。4 天做完、v0.1.0 已开源。',
    tags: ['Obsidian 插件', '3D 渲染', '性能工程'],
    icon: I('<circle cx="12" cy="12" r="2.2"/><ellipse cx="12" cy="12" rx="9" ry="3.4"/><ellipse cx="12" cy="12" rx="9" ry="3.4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.4" transform="rotate(120 12 12)"/>'),
    img: '/assets/proj-galaxy-view-deep.svg',
    alt: 'Galaxy View：Obsidian 笔记库渲染成可飞行探索的 3D 发光星系',
    href: '/projects/galaxy-view/',
    featured: true,
  },
  {
    title: '博物馆互动导览',
    desc: '讲解与引路结合的导览 demo。定位上做减法：不做覆盖型百科，只答「它为什么在这里」。仓库含可本地运行的演示与说明，在线版部署中。',
    tags: ['互动叙事', 'Demo'],
    icon: I('<path d="M3 9.5 12 4l9 5.5"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8"/><path d="M3 20h18"/>'),
    img: '/assets/proj-museum.svg',
    alt: '山西博物院策展批判型导览 Demo 界面示意',
    href: 'https://github.com/Longwind1984/prac_Museum',
    featured: true,
  },
  {
    title: '行程规划套件',
    desc: '把「调研 → 编排 → 优化」拆成覆盖旅行全生命周期的 10-skill 插件，接入高德等 MCP，缺能力时显式降级标「需查询」。中途滑向 over-design 被我拉回：两个 section 直接砍掉，输出收敛为「事件表做骨架、迷你导览做肉」的双层结构。8 轮冷对抗评审反转了 5 个设计决策。',
    tags: ['需求收敛', 'Skill 插件'],
    icon: I('<circle cx="6" cy="19" r="2.4"/><circle cx="18" cy="5" r="2.4"/><path d="M8.2 17.5c3.2-1.2 2.4-4.2 0.4-5.4-2.2-1.3-2.6-4 0.8-5M15.6 6.5c-2 0.8-2.6 2.8-1 4.4 1.8 1.8 1.2 4.2-1.4 5.2"/>'),
    img: '/assets/proj-trips.svg',
    alt: '行程规划套件：路线地图与逐日行程卡示意',
  },
  {
    title: 'WeatherLens 天气透镜',
    desc: '一次带退出标准的技术验证：MapLibre GL + Open-Meteo 天气瓦片端到端跑通，123 个变量、93 个时间步的实况预报图层。交付物是 API 验证报告与技术决策文档——验证型工作的产出是结论，不是功能堆叠。',
    tags: ['技术验证', '地图可视化'],
    icon: I('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.8-3.8"/><path d="M8 11.5c0.8-2.6 5.2-2.6 6 0"/><path d="M8.5 9a8 8 0 0 1 5 0"/>'),
    img: '/assets/proj-weatherlens.svg',
    alt: 'WeatherLens：东亚温度场图层与模型/变量/时间控制面板',
  },
];

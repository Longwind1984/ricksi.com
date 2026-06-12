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
    title: 'MuseumCollect 智能体协作案例',
    desc: '我做产品负责人，给 8 个有边界的 agent 立规则、跑 5 个 sprint。两轮冷审计专拷问「虚假完成」：抓出 28 个详情页静默回退同一件文物的假绿灯，也抓出商业文档里 9 个无出处数字——修复不是删稿，而是建假设登记册，24 个关键数字逐个标上实测 / 外部出处 / 假设。产出：三联动 demo、11 份审计、万字复盘。',
    tags: ['多智能体', '对抗审计', 'Case Study'],
    icon: I('<circle cx="5" cy="6" r="2.2"/><circle cx="19" cy="6" r="2.2"/><circle cx="5" cy="18" r="2.2"/><circle cx="19" cy="18" r="2.2"/><circle cx="12" cy="12" r="2.6"/><path d="M6.8 7.4 9.9 10.2M17.2 7.4 14.1 10.2M6.8 16.6 9.9 13.8M17.2 16.6 14.1 13.8"/>'),
    img: '/assets/proj-museumcollect.jpg',
    alt: 'MuseumCollect v3 三联动 dashboard：时代柱、古国地图与文物卡片联动',
    href: 'https://github.com/Longwind1984/prac03_MuseumCollect',
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
    title: 'Slash Goal 复刻',
    desc: '在 Claude Code 原生 /Goal 发布前，逆向 Codex 开源实现，用 CC Hooks 复刻其目标编排。核心机制是完成不能自我宣告：独立冷上下文 auditor 从 spec 重推需求、对照真实文件树才能关单（防 reward-hacking）。对抗评审抓出 2 个 Critical 风险（含一个沙箱实证的 jq 注入），全部留档在案。',
    tags: ['Hooks 编排', '对抗评测'],
    icon: I('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m8 9 3 3-3 3"/><path d="M13 15h4"/>'),
    img: '/assets/proj-slash-goal.svg',
    alt: 'Slash Goal 斜杠命令面板界面示意',
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

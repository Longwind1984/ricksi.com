// 项目清单 —— 可配置：featured 的默认展示，其余收在「展开全部」里；
// 数量自适应（非 featured 为 0 时不渲染展开按钮）。新增项目只改这里。
export interface Project {
  title: string;
  desc: string;
  tags: string[];
  img: string;
  alt: string;
  href: string;
  featured?: boolean;
}

export const PROJECTS: Project[] = [
  {
    title: 'Slash Goal 复刻',
    desc: '在 Claude Code 原生 Slash 命令发布之前，研读 Codex 开源代码并完整复刻其斜杠命令交互。能读懂工程实现，是与研发对话的底气。',
    tags: ['源码研读', 'CLI'],
    img: '/assets/proj-slash-goal.svg',
    alt: 'Slash Goal 斜杠命令面板界面示意',
    href: '#',
    featured: true,
  },
  {
    title: '行程规划套件',
    desc: '把「调研 → 编排 → 优化」的模糊需求拆成一套日常在用的规划工具，独立走完想法到可用的全程。',
    tags: ['需求拆解', '工具套件'],
    img: '/assets/proj-trips.svg',
    alt: '行程规划套件：路线地图与逐日行程卡示意',
    href: '#',
    featured: true,
  },
  {
    title: '博物馆互动导览',
    desc: '可互动演示的导览小产品，讲解与引路结合，可以直接上手玩。不做覆盖型百科，只答「它为什么在这里」。',
    tags: ['互动叙事', 'Demo'],
    img: '/assets/proj-museum.svg',
    alt: '山西博物院策展批判型导览 Demo 界面示意',
    href: 'https://github.com/Longwind1984/prac_Museum',
    featured: true,
  },
  {
    title: 'MuseumCollect 智能体协作案例',
    desc: '8 个有边界的 AI agent 跑 5 个 sprint：converged demo、11 份多视角 audit、2 轮 cold-audit 拷问与修复、万字 case-study 与 6 份商业 PM 产出——把 AI 的约束当作产品设计原则的实证。',
    tags: ['多智能体', 'Case Study'],
    img: '/assets/proj-museumcollect.jpg',
    alt: 'MuseumCollect v3 三联动 dashboard：时代柱、古国地图与文物卡片联动',
    href: 'https://github.com/Longwind1984/prac03_MuseumCollect',
  },
  {
    title: 'WeatherLens 天气透镜',
    desc: 'MapLibre GL + Open-Meteo 天气瓦片的端到端技术验证：123 个变量、93 个时间步的实况预报图层，附 API 验证报告与技术决策文档。',
    tags: ['技术验证', '地图可视化'],
    img: '/assets/proj-weatherlens.svg',
    alt: 'WeatherLens：东亚温度场图层与模型/变量/时间控制面板',
    href: '#',
  },
];

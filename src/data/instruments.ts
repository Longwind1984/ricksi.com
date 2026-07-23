export type InstrumentVisual = 'history' | 'galaxy' | 'frontier';

export interface Instrument {
  id: string;
  no: string;
  title: string;
  nameEn: string;
  description: string;
  detail?: string;
  tags?: string[];
  href: string | null;
  status?: string;
  visual: InstrumentVisual;
}

/*
 * 装置是「可以直接把玩」的项目入口，和下方讲构建过程的项目条目共用一个栏目。
 * 历史知识台使用独立 EdgeOne 全栈站点；这里只保留稳定的正式入口，不引用临时预览地址。
 */
export const INSTRUMENTS: Instrument[] = [
  {
    id: 'galaxy-view',
    no: '01',
    title: '知识图谱 Galaxy View',
    nameEn: 'KNOWLEDGE GALAXY',
    description: '把知识节点铺成一座可缩放、可漫游的星系。',
    tags: ['知识图谱', '3D 可视化', '交互漫游'],
    href: '/graph',
    visual: 'galaxy',
  },
  {
    id: 'frontier-tracker',
    no: '02',
    title: 'AI 前沿追踪',
    nameEn: 'FRONTIER TRACKER',
    description: '在时间轴上追踪人物、机构与真正值得注意的变化。',
    tags: ['人物追踪', '事件分级', '星图时间流'],
    href: '/frontier/',
    visual: 'frontier',
  },
  {
    id: 'history-knowledge-desk',
    no: '03',
    title: '历史全景知识台',
    nameEn: 'HISTORY KNOWLEDGE DESK',
    description: '把历史放回时间、空间与人物关系里，沿着线索浏览而不是翻目录。',
    tags: ['时间轴', '地图', '关系网络'],
    href: 'https://history.ricksi.com/',
    visual: 'history',
  },
];

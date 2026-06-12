// 整站名片分享卡（玻璃明信片 · site 形态：三格活数据条）
import type { APIRoute } from 'astro';
import { renderShareCard } from '../../lib/share-card.mjs';
import { loadSiteData } from '../../lib/site-data.mjs';

export const GET: APIRoute = async () => {
  const { usage, activity, graph } = loadSiteData();
  const stats = [
    { label: 'TOKEN 累计', value: usage?.cumulative ?? '—' },
    { label: '知识库节点', value: String(graph?.stats?.notes ?? '—') },
    { label: '连续活跃', value: activity?.coding?.streak ? `${activity.coding.streak} 天` : '—', gold: true },
  ];
  const jpg = await renderShareCard({
    variant: 'site',
    brand: 'RICK SI',
    module: 'WORKBENCH · LIVE',
    kicker: '工作台 · 活数据主页',
    title: '把产品判断，变成能跑起来的东西。',
    stats,
    url: 'ricksi.com',
    qrUrl: 'https://ricksi.com/',
    hook: '扫码进入工作台 · 数据每日更新',
  });
  return new Response(jpg, { headers: { 'Content-Type': 'image/jpeg' } });
};

// 主页 OG 分享卡（构建时生成，复用 satori 玻璃风模板）
import type { APIRoute } from 'astro';
import { renderOg } from '../../lib/og-image.mjs';

export const GET: APIRoute = async () => {
  const png = await renderOg({
    title: '把产品判断，变成能跑起来的东西。',
    sub: '司豪杰 Rick Si · 3 年滴滴国际化治理 PM → AI 产品经理 · 活数据工作台',
    kind: 'RICKSI.COM',
  });
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};

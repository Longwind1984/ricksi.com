// 主页 OG 分享卡（构建时生成，复用 satori 玻璃风模板）
import type { APIRoute } from 'astro';
import { renderOg } from '../../lib/og-image.mjs';

export const GET: APIRoute = async () => {
  const png = await renderOg({
    title: '在人工智能与人类的十字路口',
    sub: '司豪杰 Rick Si · 我与 AI 的共享自留地',
    kind: 'RICKSI.COM',
  });
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};

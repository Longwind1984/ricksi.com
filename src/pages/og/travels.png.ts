// /travels OG 分享卡（构建时生成，复用 satori 玻璃风模板；统计取 data/travels.json）
import type { APIRoute } from 'astro';
import { renderOg } from '../../lib/og-image.mjs';
import { loadSiteData } from '../../lib/site-data.mjs';

export const GET: APIRoute = async () => {
  const { travels } = loadSiteData();
  const s = travels?.stats;
  const km = s ? (Math.round(s.kmTotal / 1000) / 10).toFixed(1) : '11.2';
  const png = await renderOg({
    title: '夜航 · 美洲足迹',
    sub: s
      ? `${s.poiCount} 足迹点 · ${s.cityCount} 城 · ${s.countryCount} 国 · 推测航迹 ${km} 万公里`
      : 'Google Maps 真实足迹 · 夜幕美洲上的金色停留',
    kind: 'TRAVELS · RICKSI.COM',
  });
  return new Response(png as any, { headers: { 'Content-Type': 'image/png' } });
};

// 前沿动态分享卡（玻璃明信片 · frontier 形态，720×1280 JPEG）
// kicker = 星类(随星类色)，副文 = 一句话判断；人物为彩色徽章，类型/被低估为 chip。
import type { APIRoute } from 'astro';
import { renderShareCard } from '../../../lib/share-card.mjs';
import { loadSiteData } from '../../../lib/site-data.mjs';
import { SAMPLE_FRONTIER } from '../../../lib/sample.js';
import { starOf, STAR_CLASS, DOMAIN_ACCENT, hypeLabel } from '../../../lib/frontier-ui.mjs';

const SITE = 'https://ricksi.com';
const TYPE_LABEL: Record<string, string> = {
  authored: '署名作品', statement: '本人发言', action: '个人行动', cited: '被引用', business: '商业',
};

const ftData = () => loadSiteData().frontier ?? SAMPLE_FRONTIER;

export async function getStaticPaths() {
  const ft = ftData();
  const ownerMap = new Map<string, any>();
  for (const p of ft.people ?? []) ownerMap.set(p.slug, p);
  for (const t of ft.topics ?? []) ownerMap.set(t.slug, t);
  return (ft.entries ?? []).map((e: any) => {
    const owner = ownerMap.get(e.person ?? e.topicSource);
    return { params: { id: e.id }, props: { e, ownerName: owner?.name ?? e.sourceName, domain: owner?.domain ?? '' } };
  });
}

export const GET: APIRoute = async ({ props }) => {
  const { e, ownerName, domain } = props as any;
  const star: any = (STAR_CLASS as any)[starOf(e)] ?? {};
  const accent = (DOMAIN_ACCENT as any)[domain] ?? '#7FB3F0';
  const underrated = hypeLabel(e) === '被低估';
  const dd = (e.date || '').replace(/-/g, '.');

  const jpg = await renderShareCard({
    variant: 'frontier',
    brand: 'RICK SI · 前沿追踪',
    module: 'FRONTIER',
    kicker: star.zh || '前沿追踪', // satori 字体无星类符号字形(tofu)，靠 kicker 色传达星类
    kickerColor: star.color,
    title: e.titleZh,
    excerpt: e.verdict, // 一句话判断 = 策展价值
    badges: [{ label: ownerName, color: accent }],
    chips: [
      { label: TYPE_LABEL[e.contentType] ?? e.contentType },
      ...(underrated ? [{ label: '被低估', color: '#71C1F7' }] : []),
    ],
    url: 'ricksi.com/frontier',
    qrUrl: `${SITE}/frontier/#e-${e.id}`,
    hook: `${dd} · 每日梳理 + 工作台判断`,
  });
  return new Response(jpg, { headers: { 'Content-Type': 'image/jpeg' } });
};

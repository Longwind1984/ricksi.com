// 前沿追踪独立 RSS（不混入 rss.xml 的「思考与写作」——订阅语义不同）
// item.link 指向站内锚点而非外跳：保留「一句话判断」的策展层，原文链接在 description 里
import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { loadSiteData } from '../lib/site-data.mjs';

const TYPE_LABEL: Record<string, string> = {
  authored: '署名作品',
  statement: '本人发言',
  action: '个人行动',
  cited: '被引用',
};

export async function GET(context: APIContext) {
  const frontier = loadSiteData().frontier;
  const owner = new Map<string, any>();
  for (const p of frontier?.people ?? []) owner.set(p.slug, p);
  for (const t of frontier?.topics ?? []) owner.set(t.slug, t);
  const domains: Record<string, string> = frontier?.domains ?? {};

  return rss({
    title: '司豪杰 Rick Si · 前沿追踪',
    description: 'AI 前沿人物与信息源的公开痕迹：每日抓取，模型梳理成中文摘要与判断。',
    site: context.site ?? 'https://ricksi.com',
    items: (frontier?.entries ?? []).map((e: any) => {
      const o = owner.get(e.person ?? e.topicSource);
      const name = o?.name ?? e.sourceName;
      return {
        // titleZh 常已含人名，避免「Simon Willison：Simon Willison：…」式重复
        title: e.titleZh.includes(name) ? e.titleZh : `${name}：${e.titleZh}`,
        pubDate: new Date(`${e.date}T12:00:00+08:00`),
        description: `${e.verdict}\n\n${e.summaryZh}\n\n原文：${e.url}`,
        categories: [TYPE_LABEL[e.contentType] ?? e.contentType, domains[o?.domain] ?? ''].filter(Boolean),
        link: `/frontier/#e-${e.id}`,
      };
    }),
    customData: '<language>zh-cn</language>',
  });
}

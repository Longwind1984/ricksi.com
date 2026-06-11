import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = (await getCollection('posts', ({ data }: any) => !data.draft)).sort(
    (a: any, b: any) => b.data.date.valueOf() - a.data.date.valueOf()
  );
  return rss({
    title: '司豪杰 Rick Si · 思考与写作',
    description: 'AI 产品方向的思考与写作：源码拆解、产品方法、工作流实践。',
    site: context.site ?? 'https://ricksi.com',
    items: posts.map((p: any) => ({
      title: p.data.title,
      pubDate: p.data.date,
      description: p.data.description ?? '',
      categories: [p.data.tag],
      link: `/blog/${p.id}/`,
    })),
    customData: '<language>zh-cn</language>',
  });
}

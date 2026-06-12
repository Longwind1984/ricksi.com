// 写作分享卡（玻璃明信片 · article 形态：文楷引文 = 人的声音）
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { renderShareCard, mdExcerpt } from '../../../lib/share-card.mjs';

export async function getStaticPaths() {
  const posts = await getCollection('posts', ({ data }: any) => !data.draft);
  return posts.map((post: any) => ({ params: { slug: post.id }, props: { post } }));
}

const SITE = 'https://ricksi.com';

export const GET: APIRoute = async ({ props }) => {
  const { post } = props as any;
  const d = post.data.date as Date;
  const kicker = `写作 · ${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  /* 字数/时长：CJK 逐字 + 拉丁按词，350 字/分钟 */
  const text = post.body.replace(/```[\s\S]*?```/g, '').replace(/[#>*_`\[\]()]/g, '');
  const cjk = (text.match(/[一-鿿]/g) || []).length;
  const latin = (text.match(/[A-Za-z]+/g) || []).length;
  const words = cjk + latin;
  const mins = Math.max(1, Math.round(words / 350));

  const jpg = await renderShareCard({
    variant: 'article',
    brand: 'RICK SI · 思考与写作',
    module: 'WRITING · ARTICLE',
    kicker,
    title: post.data.title,
    quote: post.data.description || mdExcerpt(post.body),
    chips: [
      ...(post.data.tag ? [{ label: post.data.tag }] : []),
      { label: `${words.toLocaleString()} 字 · 约 ${mins} 分钟` },
    ],
    url: 'ricksi.com/blog',
    qrUrl: `${SITE}/blog/${post.id}/`,
    hook: '扫码读全文 · 数据与决策可核查',
  });
  return new Response(jpg, { headers: { 'Content-Type': 'image/jpeg' } });
};

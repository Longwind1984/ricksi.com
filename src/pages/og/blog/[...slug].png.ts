import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { renderOg } from '../../../lib/og-image.mjs';

export async function getStaticPaths() {
  const posts = await getCollection('posts', ({ data }: any) => !data.draft);
  return posts.map((post: any) => ({ params: { slug: post.id }, props: { post } }));
}

export const GET: APIRoute = async ({ props }) => {
  const { post } = props as any;
  const png = await renderOg({
    title: post.data.title,
    sub: post.data.date.toISOString().slice(0, 10),
    kind: post.data.tag || '文章',
  });
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { renderOg } from '../../../lib/og-image.mjs';
import { imgHeaders } from '../../../lib/og-runtime.mjs';

export async function getStaticPaths() {
  const posts = await getCollection('posts', ({ data }: any) => !data.draft);
  return posts.map((post: any) => ({ params: { slug: post.id }, props: { post } }));
}

export const GET: APIRoute = async ({ params, props }) => {
  let post = (props as any)?.post;
  if (!post) {
    const posts = await getCollection('posts', ({ data }: any) => !data.draft);
    post = posts.find((p: any) => p.id === params.slug);
  }
  if (!post) return new Response('Not found', { status: 404 });
  const png = await renderOg({
    title: post.data.title,
    sub: post.data.date.toISOString().slice(0, 10),
    kind: post.data.tag || '文章',
  });
  return new Response(png, { headers: imgHeaders('image/png') });
};

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { renderCachedOg } from '../../../lib/og-image.mjs';
import { imgHeaders } from '../../../lib/og-runtime.mjs';

export async function getStaticPaths() {
  const notes = await getCollection('kb');
  return notes.map((note: any) => ({ params: { slug: note.id }, props: { note } }));
}

export const GET: APIRoute = async ({ params, props }) => {
  // 预渲染时 props 来自 getStaticPaths；运行时（Vercel）props 空 → 按 slug 查
  let note = (props as any)?.note;
  if (!note) {
    const notes = await getCollection('kb');
    note = notes.find((n: any) => n.id === params.slug);
  }
  if (!note) return new Response('Not found', { status: 404 });
  const png = await renderCachedOg(`/og/kb/${note.id}.png`, {
    title: note.data.title,
    sub: '知识库',
    kind: note.data.cluster || '笔记',
  });
  return new Response(png, { headers: imgHeaders('image/png') });
};

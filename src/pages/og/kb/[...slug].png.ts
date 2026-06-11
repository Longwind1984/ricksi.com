import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { renderOg } from '../../../lib/og-image.mjs';

export async function getStaticPaths() {
  const notes = await getCollection('kb');
  return notes.map((note: any) => ({ params: { slug: note.id }, props: { note } }));
}

export const GET: APIRoute = async ({ props }) => {
  const { note } = props as any;
  const png = await renderOg({
    title: note.data.title,
    sub: '知识库',
    kind: note.data.cluster || '笔记',
  });
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};

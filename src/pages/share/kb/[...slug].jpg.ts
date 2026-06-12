// 知识库节点分享卡（玻璃明信片 · node 形态，720×1280 JPEG）
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { renderShareCard, mdExcerpt } from '../../../lib/share-card.mjs';
import { loadSiteData } from '../../../lib/site-data.mjs';
import { GRAPH_PALETTE } from '../../../lib/sample.js';

export async function getStaticPaths() {
  const notes = await getCollection('kb');
  return notes.map((note: any) => ({ params: { slug: note.id }, props: { note } }));
}

/* 人机光谱：实测·金 → 共创·青 → AI 整理·紫（hex 与 tokens/colors.css 同值） */
const PROV: Record<string, [string, string]> = {
  human: ['实测', '#EAC673'],
  dictated: ['口述整理', '#82D8C1'],
  co: ['共创', '#82D8C1'],
  ai: ['AI 整理', '#BCA9F7'],
};

const SITE = 'https://ricksi.com';

export const GET: APIRoute = async ({ props }) => {
  const { note } = props as any;
  const { graph } = loadSiteData();
  const me = graph?.nodes?.find((n: any) => n.slug === note.id) ?? null;

  const created = note.data.created ? new Date(note.data.created) : null;
  const days = created ? Math.max(1, Math.floor((Date.now() - created.getTime()) / 86400000)) : null;
  const prov = PROV[note.data.provenance as string] ?? null;
  const clusterColor = me ? GRAPH_PALETTE[me.cluster % GRAPH_PALETTE.length] : undefined;

  const jpg = await renderShareCard({
    variant: 'node',
    brand: 'RICK SI · 知识库',
    module: 'KNOWLEDGE · NODE',
    kicker: days ? `节点 · 已沉淀 ${days} 天` : '知识库 · 节点',
    title: note.data.title,
    excerpt: mdExcerpt(note.body),
    badges: prov ? [{ label: prov[0], color: prov[1] }] : [],
    chips: note.data.cluster ? [{ label: note.data.cluster, color: clusterColor }] : [],
    url: 'ricksi.com/kb',
    qrUrl: `${SITE}/kb/${note.id}/`,
    hook: me?.deg ? `扫码读全文 · 图谱里有 ${me.deg} 个相邻节点` : '扫码读全文',
  });
  return new Response(jpg, { headers: { 'Content-Type': 'image/jpeg' } });
};

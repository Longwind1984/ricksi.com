// 构建时生成的全站搜索索引（⌘K 命令面板用）
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { PROJECTS } from '../data/projects';
import { loadSiteData } from '../lib/site-data.mjs';

export const GET: APIRoute = async () => {
  const posts = await getCollection('posts', ({ data }: any) => !data.draft);
  const notes = await getCollection('kb');
  const frontier = loadSiteData().frontier;
  const ftOwner = new Map<string, any>();
  for (const p of frontier?.people ?? []) ftOwner.set(p.slug, p);
  for (const t of frontier?.topics ?? []) ftOwner.set(t.slug, t);

  const items = [
    // 站内目的地
    { t: 'page', title: '项目', sub: `${PROJECTS.length} 个`, href: '/#projects' },
    { t: 'page', title: '工作台数据', sub: 'Tokens & activity', href: '/#workbench' },
    { t: 'page', title: '知识库图谱', sub: '主页区块', href: '/#knowledge' },
    { t: 'page', title: '全屏知识图谱', sub: '/graph', href: '/graph' },
    { t: 'page', title: '知识库', sub: '全部笔记', href: '/kb/' },
    { t: 'page', title: '思考与写作', sub: '全部文章', href: '/blog/' },
    { t: 'page', title: '前沿追踪', sub: frontier ? `${frontier.stats?.totalEntries ?? 0} 条动态` : '动态流', href: '/frontier/' },
    { t: 'page', title: '阅读', sub: 'WeRead 书架', href: '/#reading' },
    // 项目
    ...PROJECTS.map((p) => ({ t: 'proj', title: p.title, sub: p.tags.join(' · '), href: '/#projects' })),
    // 文章
    ...posts.map((p: any) => ({ t: 'post', title: p.data.title, sub: p.data.tag, href: `/blog/${p.id}/` })),
    // 知识库笔记
    ...notes.map((n: any) => ({ t: 'note', title: n.data.title, sub: n.data.cluster, href: `/kb/${n.id}/` })),
    // 前沿追踪：人物 + 最近 200 条（防索引膨胀）
    ...(frontier?.people ?? []).map((p: any) => ({ t: 'person', title: p.name, sub: p.title, href: `/frontier/?person=${p.slug}` })),
    ...(frontier?.entries ?? []).slice(0, 200).map((e: any) => ({
      t: 'ft',
      title: e.titleZh,
      sub: ftOwner.get(e.person ?? e.topicSource)?.name ?? e.sourceName,
      href: `/frontier/#e-${e.id}`,
    })),
  ];

  return new Response(JSON.stringify({ items }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};

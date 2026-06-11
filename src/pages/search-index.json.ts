// 构建时生成的全站搜索索引（⌘K 命令面板用）
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { PROJECTS } from '../data/projects';

export const GET: APIRoute = async () => {
  const posts = await getCollection('posts', ({ data }: any) => !data.draft);
  const notes = await getCollection('kb');

  const items = [
    // 站内目的地
    { t: 'page', title: '项目', sub: `${PROJECTS.length} 个`, href: '/#projects' },
    { t: 'page', title: '工作台数据', sub: 'Tokens & activity', href: '/#workbench' },
    { t: 'page', title: '知识库图谱', sub: '主页区块', href: '/#knowledge' },
    { t: 'page', title: '全屏知识图谱', sub: '/graph', href: '/graph' },
    { t: 'page', title: '知识库', sub: '全部笔记', href: '/kb/' },
    { t: 'page', title: '思考与写作', sub: '全部文章', href: '/blog/' },
    { t: 'page', title: '阅读', sub: 'WeRead 书架', href: '/#reading' },
    // 项目
    ...PROJECTS.map((p) => ({ t: 'proj', title: p.title, sub: p.tags.join(' · '), href: '/#projects' })),
    // 文章
    ...posts.map((p: any) => ({ t: 'post', title: p.data.title, sub: p.data.tag, href: `/blog/${p.id}/` })),
    // 知识库笔记
    ...notes.map((n: any) => ({ t: 'note', title: n.data.title, sub: n.data.cluster, href: `/kb/${n.id}/` })),
  ];

  return new Response(JSON.stringify({ items }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};

// 出图端点的缓存头。prerender 开关改由 astro.config 的 astro:route:setup 钩子按 VERCEL 程序化设置。
// 图内容随 slug/id 确定 → 让 CDN 长缓存：生成一次，之后命中边缘缓存；过期先返回旧图再后台刷新。
export function imgHeaders(contentType) {
  return {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400',
  };
}

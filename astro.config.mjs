// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

// 双平台：EdgeOne/本地 = 纯静态（无 adapter，产物 dist/，与今天一致）；
// Vercel 构建（VERCEL=1）= 挂 adapter + 把 OG/分享图端点设为运行时按需出图，
// 把构建期 ~1300 张社交图 → 运行时 Serverless 按需生成 + CDN 缓存，Vercel 构建从十几分钟降到分钟级。
const onVercel = !!process.env.VERCEL;

// 仅 Vercel：用 astro:route:setup 程序化把 og|share 的 kb/blog/frontier 动态端点设为 prerender=false。
// 比文件内 `export const prerender = <expr>` 可靠——Astro 对 prerender 是静态分析，认不出 import 进来的值
// 或自定义 import.meta.env；这个钩子直接改 route.prerender，构建期生效。home.png/site.jpg 不在名单，保持静态。
const runtimeOg = {
  name: 'runtime-og',
  hooks: {
    'astro:route:setup'({ route }) {
      if (onVercel && /\/pages\/(og|share)\/(kb|blog|frontier)\//.test(route.component || '')) {
        route.prerender = false;
      }
    },
  },
};

export default defineConfig({
  site: 'https://ricksi.com',
  trailingSlash: 'ignore',
  integrations: [sitemap({ filter: (page) => !page.includes('/og/') }), runtimeOg],
  server: {
    host: '0.0.0.0',
    port: 4321,
  },
  // 运行时出图函数需要的字体/底图/数据 —— 打进函数包（端点仍按 path.resolve(cwd) 读，cwd=项目根）
  adapter: onVercel
    ? vercel({
        includeFiles: [
          './assets-src/fonts/MiSans-Regular.ttf',
          './assets-src/fonts/MiSans-Semibold.ttf',
          './assets-src/fonts/GeistMono-Regular.otf',
          './assets-src/fonts/GeistMono-Medium.otf',
          './assets-src/fonts/LXGWWenKai-Regular.ttf',
          './assets-src/fonts/NotoSansCJKsc-Medium.otf',
          './public/assets/hero-2200.jpg',
          './public/assets/hero-blur.jpg',
          './data/graph.json',
          './data/frontier.json',
        ],
      })
    : undefined,
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'tap',
  },
  build: {
    format: 'directory',
  },
  vite: {
    // epub.js 在阅读器里按需 import；预打包它，避免「首次浏览器导入才懒优化 + reload」
    // 造成的 stale-hash「Failed to fetch dynamically imported module」（仅 dev，不影响生产构建）
    optimizeDeps: { include: ['epubjs'] },
  },
});

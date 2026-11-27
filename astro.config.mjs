// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import edgeoneAdapter from '@edgeone/astro';

// 三态：本地 = 纯静态（无 adapter，产物 dist/，与今天一致）；
// Vercel 构建（VERCEL=1）= vercel adapter + 把 OG/分享图端点设为运行时按需出图；
// EdgeOne 构建（EDGEONE_PAGES=1）= @edgeone/astro adapter + 同一批端点运行时按需出图。
// 两个平台对称：把构建期 ~1600 张社交图 → 运行时按需生成 + CDN 缓存，构建从十几分钟降到分钟级。
const onVercel = !!process.env.VERCEL;
// EdgeOne adapter 不读任何 env 自动识别构建环境（已核查 dist 源码：无 process.env），
// 故用显式开关。用户须在 EdgeOne 控制台 / edgeone.json 把构建命令设为 `EDGEONE_PAGES=1 npm run build`。
const onEdgeOne = !!process.env.EDGEONE_PAGES;
// 两平台共用同一套「按需出图」名单——任一平台命中即走运行时函数。
const runtimeImg = onVercel || onEdgeOne;

// 用 astro:route:setup 程序化把 og|share 的 kb/blog/frontier 动态端点设为 prerender=false。
// 比文件内 `export const prerender = <expr>` 可靠——Astro 对 prerender 是静态分析，认不出 import 进来的值
// 或自定义 import.meta.env；这个钩子直接改 route.prerender，构建期生效。home.png/site.jpg 不在名单，保持静态。
// 注：任一路由 prerender=false 会让 Astro 把 buildOutput 翻成 "server"，从而触发 adapter 出函数包。
const runtimeOg = {
  name: 'runtime-og',
  hooks: {
    'astro:route:setup'({ route }) {
      if (runtimeImg && /\/pages\/(og|share)\/(kb|blog|frontier)\//.test(route.component || '')) {
        route.prerender = false;
      }
      // sharp 自检探针：仅在按需平台上转运行时，用来在 preview 部署上 curl 确认 sharp 能否加载。
      // 本地纯静态时保持预渲染（一张 64×64 小图，开销可忽略），避免「无 adapter 却出现 server 路由」报错。
      // 注：放在 src/pages/probe/（非 _probe）——下划线开头的目录被 Astro 排除出路由，会导致探针不生成。
      if (runtimeImg && /\/pages\/probe\/sharp\.png/.test(route.component || '')) {
        route.prerender = false;
      }
    },
  },
};

// 运行时出图函数包要带的字体/底图/数据 —— Vercel 与 EdgeOne 共用一份清单。
const IMG_FN_INCLUDE_FILES = [
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
];

export default defineConfig({
  site: 'https://ricksi.com',
  trailingSlash: 'ignore',
  integrations: [sitemap({ filter: (page) => !page.includes('/og/') }), runtimeOg],
  // 运行时出图函数需要的字体/底图/数据 —— 打进函数包（端点仍按 path.resolve(cwd) 读，cwd=项目根）。
  // @edgeone/astro 的 includeFiles 语义与 vercel 一致（已核查 dist/index.js:38 + dependencies.js:148），故复用同一份清单。
  // EdgeOne 把 prerender=false 路由编译进 cloud-functions/ssr-node（Node v20，支持 native 模块），sharp 可跑。
  adapter: onVercel
    ? vercel({
        includeFiles: IMG_FN_INCLUDE_FILES,
      })
    : onEdgeOne
      ? edgeoneAdapter({
          includeFiles: IMG_FN_INCLUDE_FILES,
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

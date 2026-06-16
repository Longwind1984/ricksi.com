// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://ricksi.com',
  trailingSlash: 'ignore',
  integrations: [sitemap({ filter: (page) => !page.includes('/og/') })],
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

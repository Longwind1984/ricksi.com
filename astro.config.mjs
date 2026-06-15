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
});

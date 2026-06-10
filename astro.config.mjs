// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // TODO: 备案域名确定后填入正式 site，用于 sitemap / canonical / OG 绝对地址
  // site: 'https://ricksi.cn',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
});

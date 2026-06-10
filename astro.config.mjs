// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://ricksi.com',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
});

// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

const SITE_URL = process.env.SITE_URL ?? 'https://sachncs.github.io';

export default defineConfig({
  site: SITE_URL,
  base: '/magic',
  trailingSlash: 'never',
  build: {
    format: 'file',
    inlineStylesheets: 'auto',
  },
  output: 'static',
  build: {
    inlineStylesheets: 'auto',
  },
  integrations: [
    tailwind({ applyBaseStyles: false }),
    sitemap({
      filter: (page) => !page.includes('/404'),
    }),
  ],
  vite: {
    build: {
      cssCodeSplit: true,
    },
  },
  compressHTML: true,
});
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://pirogorsk.ru',
  output: 'static',
  devToolbar: { enabled: false },
  outDir: './site',
  trailingSlash: 'always',
  build: { inlineStylesheets: 'always' },
  vite: { build: { cssMinify: true } },
});

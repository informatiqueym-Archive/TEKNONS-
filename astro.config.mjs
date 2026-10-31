// Pages are rendered on the server so content saved in the admin appears immediately.
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'middleware' }),
  trailingSlash: 'ignore',
  build: { inlineStylesheets: 'auto' },
  vite: { build: { assetsInlineLimit: 0 } },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import counterConfig from './counter/public-config.json';
import { fileURLToPath } from 'node:url';

const basePath = '/douong_tung';

export default defineConfig({
  base: `${basePath}/`,
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  define: {
    'process.env.NEXT_PUBLIC_BASE_PATH': JSON.stringify(basePath),
    'process.env.NEXT_PUBLIC_COUNTER_API_URL': JSON.stringify(
      process.env.NEXT_PUBLIC_COUNTER_API_URL || counterConfig.apiUrl
    ),
  },
  build: {
    outDir: 'dist-pages',
    emptyOutDir: true,
  },
});

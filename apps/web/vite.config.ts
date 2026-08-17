import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@magic/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@magic/storage': path.resolve(__dirname, '../../packages/storage/src'),
      '@magic/tools': path.resolve(__dirname, '../../packages/tools/src'),
      '@magic/agent-graph': path.resolve(__dirname, '../../packages/agent-graph/src'),
      '@magic/web-shared': path.resolve(__dirname, '../../packages/web-shared/src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4317',
      '/ws': {target: 'ws://localhost:4317', ws: true},
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
});

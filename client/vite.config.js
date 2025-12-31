import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/wikiswipe/',
  plugins: [react()],
  server: {
    port: 5173
  },
  optimizeDeps: {
    exclude: ['@huggingface/transformers']
  },
  build: {
    target: 'esnext'
  }
});

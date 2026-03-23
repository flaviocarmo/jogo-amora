import { defineConfig } from 'vite';

export default defineConfig({
  base: '/jogo-amora/',
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'es2020',
  },
  optimizeDeps: {
    exclude: ['@babylonjs/havok'],
  },
});

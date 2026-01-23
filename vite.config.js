import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/anime-avatar/',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        test2d: resolve(__dirname, 'test-2d.html'),
        test3d: resolve(__dirname, 'test-3d.html'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});

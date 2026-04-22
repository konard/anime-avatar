import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const serveNewIndex = {
  name: 'serve-new-index',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (
        req.url === '/new' ||
        req.url === '/new/' ||
        req.url === '/anime-avatar/new' ||
        req.url === '/anime-avatar/new/'
      ) {
        req.url = '/anime-avatar/new/index.html';
      }
      next();
    });
  },
};

export default defineConfig({
  plugins: [react(), serveNewIndex],
  base: '/anime-avatar/',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        test2d: resolve(__dirname, 'test-2d.html'),
        test3d: resolve(__dirname, 'test-3d.html'),
        testComponents: resolve(__dirname, 'test-components.html'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});

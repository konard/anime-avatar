import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const BASE = '/anime-avatar/';

// Dev-only routing so the deployed URL layout is mirrored locally:
//   /            -> Avatar Studio (static no-build app in public/index.html)
//   /archive     -> previous Vite React app (archive/index.html entry)
// In production these paths are produced by the build + publicDir copy, so this
// middleware only exists to give `npm run dev` the same shape as the deploy.
const serveSiteLayout = {
  name: 'serve-site-layout',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const url = req.url || '';
      const path = url.split('?')[0];
      if (path === BASE || path === BASE.slice(0, -1) || path === '/') {
        req.url = `${BASE}index.html${url.slice(path.length)}`;
      } else if (
        path === `${BASE}archive` ||
        path === `${BASE}archive/` ||
        path === '/archive' ||
        path === '/archive/'
      ) {
        req.url = `${BASE}archive/index.html${url.slice(path.length)}`;
      }
      next();
    });
  },
};

export default defineConfig({
  plugins: [react(), serveSiteLayout],
  base: BASE,
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      // The previous React app is archived under /archive. The Avatar Studio
      // (public/index.html + public/studio/*) is a static app copied verbatim
      // from publicDir, so it is not listed as a Rollup input.
      input: {
        archive: resolve(__dirname, 'archive/index.html'),
        archiveTest2d: resolve(__dirname, 'archive/test-2d.html'),
        archiveTest3d: resolve(__dirname, 'archive/test-3d.html'),
        archiveTestComponents: resolve(
          __dirname,
          'archive/test-components.html'
        ),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});

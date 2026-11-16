import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const reactRoutes = new Set([
  '/',
  '/login',
  '/register',
  '/dashboard',
  '/jobs',
  '/training',
  '/notifications',
  '/applications',
  '/manage',
  '/review',
  '/reports',
  '/skills',
  '/locations',
  '/profile'
]);

export default defineConfig(({ command }) => ({
  base: command === 'build' ? (process.env.VITE_BASE || '/tara-trabaho/frontend/dist/') : '/',
  plugins: [
    react(),
    {
      name: 'legacy-route-fallback',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url || '/';
          const pathname = url.split('?')[0].split('#')[0];
          if (pathname === '/push-sw.js') {
            req.url = '/service-worker.js';
          } else if (pathname === '/' || reactRoutes.has(pathname) || pathname.endsWith('.html')) {
            req.url = '/index.html';
          }
          next();
        });
      }
    }
  ],
  appType: 'spa',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
}));

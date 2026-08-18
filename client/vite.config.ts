import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  // Load environment variables from .env files
  const env = loadEnv(mode, process.cwd(), '');

  const backendUrl = env.VITE_BACKEND_URL || 'http://localhost:3001';
  const backendWsUrl = env.VITE_BACKEND_WS_URL || backendUrl.replace(/^http/, 'ws');
  const port = Number(env.VITE_PORT) || 3000;

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/ws': {
          target: backendWsUrl,
          ws: true,
          configure: (proxy) => {
            proxy.on('error', (err: any) => {
              // Suppress noisy ECONNRESET errors when WS connection closes abruptly
              if (err.code !== 'ECONNRESET') {
                console.error('[Vite WS Proxy Error]:', err.message);
              }
            });
          },
        },
      },
    },
  };
});

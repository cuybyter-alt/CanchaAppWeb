import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'https://canchapp-backend.onrender.com';

  return {
    plugins: [
      react(),
    ],
    css: {
      postcss: './postcss.config.js',
    },
    server: {
      // Dev proxy avoids CORS issues by forwarding /api to backend.
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
})
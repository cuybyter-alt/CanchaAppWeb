import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
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
        target: 'https://canchapp-backend.onrender.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
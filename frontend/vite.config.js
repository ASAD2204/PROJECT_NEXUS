import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use different base paths for GitHub Pages vs Railway/Docker
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    proxy: {
      '/api/v1': {
        target: process.env.VITE_API_TARGET || 'http://localhost:80',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})

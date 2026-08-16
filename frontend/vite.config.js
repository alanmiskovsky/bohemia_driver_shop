import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/wp-json': {
        target: 'https://shop.bohemiadriver.cz',
        changeOrigin: true,
        secure: true,
      },
      '/wp-admin': {
        target: 'https://shop.bohemiadriver.cz',
        changeOrigin: true,
        secure: true,
      },
      '/wp-content': {
        target: 'https://shop.bohemiadriver.cz',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/yahoo': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': 'https://finance.yahoo.com/'
        }
      },
      '/api/yahoo-v2': {
        target: 'https://query2.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo-v2/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': 'https://finance.yahoo.com/'
        }
      },
      '/api/twelve': {
        target: 'https://api.twelvedata.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/twelve/, '')
      },
      '/api/stooq': {
        target: 'https://stooq.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/stooq/, '')
      }
    }
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': 'http://localhost:8000',
      '/users': 'http://localhost:8000',
      '/roles': 'http://localhost:8000',
      '/permissions': 'http://localhost:8000',
      '/events': 'http://localhost:8000',
      '/ai': 'http://localhost:8000',
      '/api': 'http://localhost:8000',
    },
  },
})

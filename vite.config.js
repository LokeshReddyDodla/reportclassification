import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Requests to /api are proxied to the hosted backend so the browser stays
// same-origin — no CORS origin is ever added to the backend.
// Override the target with:  AIH_API=http://localhost:8000 npm run dev
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5181,
    proxy: {
      '/api': {
        target: process.env.AIH_API || 'https://api.aihealth.clinic',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
})

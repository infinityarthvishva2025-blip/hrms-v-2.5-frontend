import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  
  server: {
    port: 5173,
    host: true,
    allowedHosts: ['hrms-v-2-5-frontend.onrender.com'],
    proxy: {
      '/api': {
        target: 'https://hrms-v-2-5-backend.vercel.app/',
        changeOrigin: true,
      },
    },
  },

  preview: {
    host: true,
    allowedHosts: ['hrms-v-2-5-frontend.onrender.com'],
  }
})
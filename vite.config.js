import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev
export default defineConfig({
  plugins: [react()],
  // هذا السطر هو الذي يحل مشكلة الـ 404 على GitHub Pages
  base: '/souqna-web/', 
  server: { 
    port: 3000, 
    open: true 
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  
  // Alias للاستيرادات المختصرة
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  // المسار الأساسي - يعتمد على المنصة
  base: process.env.VERCEL ? '/' : '/souqna/',
  
  // إعدادات البناء
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react', 'react-hot-toast'],
          charts: ['recharts'],
          supabase: ['@supabase/supabase-js', '@tanstack/react-query'],
        },
      },
    },
  },
  
  // متغيرات البيئة
  envPrefix: 'VITE_',
  
  // خادم التطوير
  server: {
    port: 3000,
    open: true,
  },
})
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // احذف سطر base: '/souqna-web/' أو اجعله '/' فقط
  base: '/', 
})

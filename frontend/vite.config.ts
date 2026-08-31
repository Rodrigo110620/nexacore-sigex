import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  envDir: '../', // <-- Esto le dice a React que busque el .env en la raíz del proyecto
  server: {
    port: 3000
  }
})

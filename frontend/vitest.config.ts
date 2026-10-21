import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Los runners del CI son más lentos que una PC: las pruebas que escriben letra por letra
    // (userEvent.type) superaban el límite por defecto de 5 s y fallaban solo en GitHub.
    testTimeout: 20000,
  },
})

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Lee .env de la raíz del monorepo (junto a docker-compose)
  const env = loadEnv(mode, '..', '')
  const frontendPort = Number(env.FRONTEND_PORT || 3000)
  const backendPort = Number(env.SERVER_PORT || 8080)
  const hmrHost = env.VITE_HMR_HOST || undefined

  return {
    plugins: [react()],
    envDir: '../',
    server: {
      // Escucha en todas las interfaces → PC, otro navegador en LAN y móvil (misma WiFi)
      host: true,
      port: Number.isFinite(frontendPort) ? frontendPort : 3000,
      // Si 3000 está ocupado, Vite usa 3001, 3002, ...
      strictPort: false,
      // El front llama a /api/v1 (misma origen); Vite reenvía al backend.
      // Así funciona con localhost o con la IP de la máquina sin cambiar .env.
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${Number.isFinite(backendPort) ? backendPort : 8080}`,
          changeOrigin: true,
        },
      },
      hmr: hmrHost
        ? { host: hmrHost, protocol: 'ws' }
        : undefined,
    },
  }
})

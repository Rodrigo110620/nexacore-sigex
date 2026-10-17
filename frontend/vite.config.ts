import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export default defineConfig(({ command, mode, isPreview }) => {
  // Lee .env de la raíz del monorepo (junto a docker-compose)
  const envDir = resolve(__dirname, '..')
  const env = loadEnv(mode, envDir, '')
  const frontendPort = Number(env.FRONTEND_PORT || 3000)
  const backendPort = Number(env.SERVER_PORT || 8080)
  const hmrHost = env.VITE_HMR_HOST || undefined
  let https: { cert: Buffer; key: Buffer } | undefined

  // Solo desarrollo: certificados externos, sin generarlos ni instalar confianza.
  if (command === 'serve' && !isPreview) {
    const certPath = env.DEV_HTTPS_CERT_PATH?.trim()
    const keyPath = env.DEV_HTTPS_KEY_PATH?.trim()
    if (certPath || keyPath) {
      if (!certPath || !keyPath) {
        throw new Error('HTTPS local requiere DEV_HTTPS_CERT_PATH y DEV_HTTPS_KEY_PATH.')
      }
      https = {
        cert: readFileSync(resolve(envDir, certPath)),
        key: readFileSync(resolve(envDir, keyPath)),
      }
    }
  }

  return {
    plugins: [react()],
    envDir,
    server: {
      // Escucha en todas las interfaces → PC, otro navegador en LAN y móvil (misma WiFi)
      host: true,
      https,
      port: Number.isFinite(frontendPort) ? frontendPort : 3000,
      // Si 3000 está ocupado, Vite usa 3001, 3002, ...
      strictPort: false,
      // El front llama a /api/v1 (misma origen); Vite reenvía al backend.
      // Así funciona con localhost o con la IP de la máquina sin cambiar .env.
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${Number.isFinite(backendPort) ? backendPort : 8080}`,
          changeOrigin: true,
          configure: (proxy) => {
            // El navegador móvil conserva su Origin LAN al pasar por Vite. El backend
            // solo necesita ver el origen local del proxy, no la IP del dispositivo.
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('origin', `http://127.0.0.1:${Number.isFinite(frontendPort) ? frontendPort : 3000}`)
            })
          },
        },
      },
      hmr: hmrHost
        ? { host: hmrHost, protocol: https ? 'wss' : 'ws' }
        : undefined,
    },
  }
})

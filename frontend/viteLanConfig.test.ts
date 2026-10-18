import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadEnv, type ConfigEnv, type UserConfigFnObject } from 'vite'
import config from './vite.config'

vi.mock('vite', () => ({ defineConfig: (value: unknown) => value, loadEnv: vi.fn() }))
vi.mock('@vitejs/plugin-react', () => ({ default: () => [] }))
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  const readFileSync = vi.fn()
  return { ...actual, readFileSync, default: { ...actual, readFileSync } }
})

const root = resolve(__dirname, '..')
const env: Record<string, string> = {}
const configure = (options: Partial<ConfigEnv> = {}) =>
  (config as UserConfigFnObject)({ command: 'serve', mode: 'development', ...options })

describe('Vite: HTTPS local y proxy del móvil', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    for (const key of Object.keys(env)) delete env[key]
    vi.mocked(loadEnv).mockReturnValue(env)
    vi.mocked(readFileSync).mockReturnValue(Buffer.from('archivo PEM simulado'))
  })

  it('conserva HTTP y escucha en LAN sin certificados', () => {
    const { server } = configure()
    expect(server).toMatchObject({ host: true, port: 3000 })
    expect(server?.https).toBeUndefined()
    expect(readFileSync).not.toHaveBeenCalled()
  })

  it('lee certificados externos relativos a la raíz y usa HMR seguro', () => {
    Object.assign(env, {
      DEV_HTTPS_CERT_PATH: '../certificados/lan.pem',
      DEV_HTTPS_KEY_PATH: '../certificados/lan-key.pem',
      VITE_HMR_HOST: '192.168.1.20',
    })
    const { server } = configure()
    expect(readFileSync).toHaveBeenCalledWith(resolve(root, env.DEV_HTTPS_CERT_PATH))
    expect(readFileSync).toHaveBeenCalledWith(resolve(root, env.DEV_HTTPS_KEY_PATH))
    expect(server?.https).toEqual({
      cert: Buffer.from('archivo PEM simulado'), key: Buffer.from('archivo PEM simulado'),
    })
    expect(server?.hmr).toEqual({ host: '192.168.1.20', protocol: 'wss' })
  })

  it('conserva HMR por ws cuando se usa HTTP', () => {
    env.VITE_HMR_HOST = '192.168.1.20'
    expect(configure().server?.hmr).toEqual({ host: '192.168.1.20', protocol: 'ws' })
  })

  it.each(['DEV_HTTPS_CERT_PATH', 'DEV_HTTPS_KEY_PATH'])('rechaza configurar solo %s', (key) => {
    env[key] = 'archivo.pem'
    expect(() => configure()).toThrow('HTTPS local requiere')
    expect(readFileSync).not.toHaveBeenCalled()
  })

  it('no cae silenciosamente a HTTP si no puede leer los certificados', () => {
    env.DEV_HTTPS_CERT_PATH = 'inexistente.pem'
    env.DEV_HTTPS_KEY_PATH = 'inexistente-key.pem'
    vi.mocked(readFileSync).mockImplementation(() => { throw new Error('ENOENT') })
    expect(() => configure()).toThrow('ENOENT')
  })

  it.each([
    { command: 'build' as const, mode: 'production' },
    { command: 'serve' as const, isPreview: true },
  ])('no carga certificados durante build o preview: %j', (options) => {
    env.DEV_HTTPS_CERT_PATH = 'no-se-debe-leer.pem'
    expect(configure(options).server?.https).toBeUndefined()
    expect(readFileSync).not.toHaveBeenCalled()
  })

  it.each([false, true])('mantiene proxy /api y Origin compatible con CORS (HTTPS: %s)', (https) => {
    Object.assign(env, { FRONTEND_PORT: '3002', SERVER_PORT: '8081' })
    if (https) Object.assign(env, { DEV_HTTPS_CERT_PATH: 'cert.pem', DEV_HTTPS_KEY_PATH: 'key.pem' })
    const proxy = configure().server?.proxy?.['/api']
    if (!proxy || typeof proxy === 'string') throw new Error('Falta proxy /api')
    expect(proxy).toMatchObject({ target: 'http://127.0.0.1:8081', changeOrigin: true })
    const on = vi.fn()
    proxy.configure?.({ on } as never, proxy)
    const setHeader = vi.fn()
    on.mock.calls[0][1]({ setHeader })
    expect(setHeader).toHaveBeenCalledWith('origin', 'http://127.0.0.1:3002')
  })
})

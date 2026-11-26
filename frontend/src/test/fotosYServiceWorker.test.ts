import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../services/api'
import { descargarFotoEstudiante } from '../services/estudianteService'
import { fotoOffline, guardarFotoOffline } from '../services/fotosOffline'
import { registrarServiceWorker } from '../pwa/registrarServiceWorker'

vi.mock('../services/api', () => ({ default: { get: vi.fn() } }))
vi.mock('../services/fotosOffline', () => ({ fotoOffline: vi.fn(), guardarFotoOffline: vi.fn(async () => undefined) }))

describe('foto del estudiante sin servidor', () => {
  beforeEach(() => vi.clearAllMocks())

  it('guarda la foto al verla y muestra la guardada si el servidor no responde', async () => {
    const foto = new Blob(['jpg'])
    vi.mocked(api.get).mockResolvedValueOnce({ data: foto })
    await expect(descargarFotoEstudiante('/estudiantes/4/foto')).resolves.toBe(foto)
    expect(guardarFotoOffline).toHaveBeenCalledWith('/estudiantes/4/foto', foto)

    vi.mocked(api.get).mockRejectedValueOnce(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }))
    vi.mocked(fotoOffline).mockResolvedValueOnce(foto)
    await expect(descargarFotoEstudiante('/estudiantes/4/foto')).resolves.toBe(foto)
  })

  it('si el servidor responde con un error (no es caída) no usa la guardada', async () => {
    vi.mocked(api.get).mockRejectedValueOnce({ response: { status: 403 } })
    await expect(descargarFotoEstudiante('/estudiantes/4/foto')).rejects.toEqual({ response: { status: 403 } })
    expect(fotoOffline).not.toHaveBeenCalled()
  })
})

describe('registrarServiceWorker', () => {
  it('solo se registra en producción y si el navegador lo soporta', () => {
    const register = vi.fn(async () => ({}))
    const nav = { serviceWorker: { register } } as unknown as Navigator
    expect(registrarServiceWorker({ produccion: false }, nav)).toBe(false)
    expect(registrarServiceWorker({ produccion: true }, {} as Navigator)).toBe(false)
    expect(registrarServiceWorker({ produccion: true }, nav)).toBe(true)
    window.dispatchEvent(new Event('load'))
    expect(register).toHaveBeenCalledWith('/sw.js')
  })
})

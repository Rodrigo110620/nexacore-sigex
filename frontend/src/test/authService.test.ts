import { describe, it, expect, vi, beforeEach } from 'vitest'
import { confirmarActivacionEstudiante, loginUser, solicitarActivacionEstudiante } from '../services/authService'
import api from '../services/api'

// Mock del cliente axios
vi.mock('../services/api')
const mockedApi = vi.mocked(api)

describe('authService — loginUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devuelve los datos del usuario cuando el login es exitoso (200)', async () => {
    const mockResponse = {
      data: {
        token: 'jwt-token-real',
        nombre: 'Admin NexaCore',
        roles: ['ADMIN'],
      },
    }
    mockedApi.post = vi.fn().mockResolvedValue(mockResponse)

    const result = await loginUser({ email: 'admin@nexacore.com', password: 'password123' })

    expect(result.token).toBe('jwt-token-real')
    expect(result.nombre).toBe('Admin NexaCore')
    expect(result.roles).toContain('ADMIN')
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/login', {
      email: 'admin@nexacore.com',
      password: 'password123',
    })
  })

  it('lanza error con mensaje legible si el backend devuelve 401', async () => {
    mockedApi.post = vi.fn().mockRejectedValue({ response: { status: 401 } })

    await expect(
      loginUser({ email: 'wrong@nexacore.com', password: 'mal' })
    ).rejects.toThrow('Revise su correo o contraseña institucional e intente de nuevo.')
  })

  it('lanza error de conexión si el servidor no responde', async () => {
    mockedApi.post = vi.fn().mockRejectedValue({ response: undefined })

    await expect(
      loginUser({ email: 'admin@nexacore.com', password: 'password123' })
    ).rejects.toThrow('No se pudo conectar con el servidor. Intenta más tarde.')
  })
})

describe('authService — activación de la cuenta del estudiante', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('solicitar devuelve el mensaje del servidor', async () => {
    mockedApi.post = vi.fn().mockResolvedValue({ data: { mensaje: 'Te enviamos un código.' } })
    const datos = { codigoSis: '202104010', ci: '7654321', email: 'ana@est.umss.edu' }

    await expect(solicitarActivacionEstudiante(datos)).resolves.toBe('Te enviamos un código.')
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/estudiante/activacion/solicitar', datos)
  })

  it('si el backend rechaza un campo (400), muestra el mensaje de ese campo', async () => {
    mockedApi.post = vi.fn().mockRejectedValue({
      response: {
        status: 400,
        data: { mensaje: 'Los datos enviados no son validos', errores: { codigoSis: 'El código SIS debe tener 9 dígitos' } },
      },
    })

    await expect(
      solicitarActivacionEstudiante({ codigoSis: '1', ci: '7654321', email: 'ana@est.umss.edu' })
    ).rejects.toThrow('El código SIS debe tener 9 dígitos')
  })

  it('confirmar devuelve el error del código tal cual lo envía el servidor', async () => {
    mockedApi.post = vi.fn().mockRejectedValue({
      response: { status: 400, data: { mensaje: 'El código es incorrecto o venció. Pide uno nuevo.' } },
    })

    await expect(
      confirmarActivacionEstudiante({
        codigoSis: '202104010',
        codigo: '000000',
        passwordNueva: 'Segura#2026',
        passwordConfirmacion: 'Segura#2026',
      })
    ).rejects.toThrow('El código es incorrecto o venció. Pide uno nuevo.')
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/estudiante/activacion/confirmar', expect.objectContaining({ codigo: '000000' }))
  })
})

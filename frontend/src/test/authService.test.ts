import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loginUser } from '../services/authService'
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
    ).rejects.toThrow('Correo o contraseña incorrectos.')
  })

  it('lanza error de conexión si el servidor no responde', async () => {
    mockedApi.post = vi.fn().mockRejectedValue({ response: undefined })

    await expect(
      loginUser({ email: 'admin@nexacore.com', password: 'password123' })
    ).rejects.toThrow('No se pudo conectar con el servidor. Intenta más tarde.')
  })
})

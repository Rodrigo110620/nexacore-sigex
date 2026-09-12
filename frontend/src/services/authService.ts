import api from './api'
import type { LoginRequest, AuthResponse } from '../types/auth'

/**
 * Envía las credenciales al backend y retorna el JWT + datos del usuario.
 * Lanza error con mensaje legible si las credenciales son incorrectas (401).
 */
export async function loginUser(credentials: LoginRequest): Promise<AuthResponse> {
  try {
    const response = await api.post<AuthResponse>('/auth/login', credentials)
    return response.data
  } catch (error: unknown) {
    const err = error as { response?: { status?: number } }
    if (err.response?.status === 401) {
      throw new Error('Correo o contraseña incorrectos.')
    }
    throw new Error('No se pudo conectar con el servidor. Intenta más tarde.')
  }
}

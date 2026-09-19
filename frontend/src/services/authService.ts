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
      throw new Error('Revise su correo o contraseña institucional e intente de nuevo.')
    }
    throw new Error('No se pudo conectar con el servidor. Intenta más tarde.')
  }
}

function extractErrorMessage(error: unknown, fallback: string): string {
  const err = error as {
    response?: { data?: { mensaje?: string }; status?: number }
    message?: string
  }
  if (!err.response) {
    return 'No se pudo conectar con el servidor. Intenta más tarde.'
  }
  return err.response.data?.mensaje || fallback
}

export async function requestPasswordReset(email: string): Promise<string> {
  try {
    const { data } = await api.post<{ mensaje: string }>('/auth/forgot-password', { email })
    return data.mensaje
  } catch (error: unknown) {
    throw new Error(extractErrorMessage(error, 'No se pudo enviar la solicitud. Intenta más tarde.'))
  }
}

export async function resetPassword(payload: {
  token: string
  passwordNueva: string
  passwordConfirmacion: string
}): Promise<string> {
  try {
    const { data } = await api.post<{ mensaje: string }>('/auth/reset-password', payload)
    return data.mensaje
  } catch (error: unknown) {
    throw new Error(extractErrorMessage(error, 'No se pudo restablecer la contraseña. Intenta más tarde.'))
  }
}

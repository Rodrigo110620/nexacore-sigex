import api from './api'

export interface PerfilUsuario {
  id: number
  nombre: string
  apellidos: string
  ci: string
  email: string
  estado: string
  roles: string[]
}

export interface CambiarPasswordPayload {
  passwordActual: string
  passwordNueva: string
  passwordConfirmacion: string
}

export async function getMiPerfil(): Promise<PerfilUsuario> {
  const { data } = await api.get<PerfilUsuario>('/auth/me')
  return data
}

export async function cambiarPassword(payload: CambiarPasswordPayload): Promise<string> {
  try {
    const { data } = await api.put<{ mensaje: string }>('/auth/cambiar-password', payload)
    return data.mensaje
  } catch (error: unknown) {
    const err = error as {
      response?: { status?: number; data?: { mensaje?: string } }
    }
    const mensaje = err.response?.data?.mensaje
    if (mensaje) throw new Error(mensaje)
    if (err.response?.status === 400) {
      throw new Error('No se pudo cambiar la contraseña. Verifica los datos.')
    }
    throw new Error('No se pudo conectar con el servidor. Intenta más tarde.')
  }
}

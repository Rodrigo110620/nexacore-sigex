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
    const err = error as {
      response?: { status?: number; data?: { mensaje?: string } }
    }

    // Sin respuesta HTTP → backend apagado, proxy caído o sin red
    if (!err.response) {
      throw new Error('No se pudo conectar con el servidor. Intenta más tarde.')
    }

    if (err.response.status === 401) {
      throw new Error(
        err.response.data?.mensaje ||
          'Revise su correo o contraseña institucional e intente de nuevo.',
      )
    }

    throw new Error(
      err.response.data?.mensaje || 'No se pudo iniciar sesión. Intenta más tarde.',
    )
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

/** Como extractErrorMessage, pero si el backend rechazó un campo (400) devuelve ese mensaje. */
function extractFieldErrorMessage(error: unknown, fallback: string): string {
  const err = error as { response?: { data?: { errores?: Record<string, string> } } }
  const errores = err.response?.data?.errores
  const primero = errores ? Object.values(errores)[0] : undefined
  return primero || extractErrorMessage(error, fallback)
}

/** Paso 1 de la activación de la cuenta del estudiante (CTA-01): envía el código a su correo institucional. */
export async function solicitarActivacionEstudiante(payload: {
  codigoSis: string
  ci?: string
  email?: string
}): Promise<string> {
  try {
    const { data } = await api.post<{ mensaje: string }>('/auth/estudiante/activacion/solicitar', payload)
    return data.mensaje
  } catch (error: unknown) {
    throw new Error(extractFieldErrorMessage(error, 'No se pudo enviar el código. Intenta más tarde.'))
  }
}

/** Paso final de la activación: confirma el código recibido por correo y crea la contraseña. */
/** Paso 2 (BUG-E03 de HU#5): comprueba el código antes de pedir la contraseña. */
/** Con el código correcto: si la administración ya registró su C.I. (enmascarado) o debe escribirlo. */
export interface EstadoActivacion {
  mensaje?: string
  ciRegistrado: boolean
  ciEnmascarado?: string | null
}

export async function verificarCodigoActivacionEstudiante(payload: { codigoSis: string; codigo: string }): Promise<EstadoActivacion> {
  try {
    const { data } = await api.post<EstadoActivacion>('/auth/estudiante/activacion/verificar', payload)
    // Un backend anterior respondía solo { mensaje }: ahí el C.I. ya estaba registrado.
    return { ...data, ciRegistrado: data?.ciRegistrado ?? true }
  } catch (error: unknown) {
    throw new Error(extractFieldErrorMessage(error, 'No se pudo verificar el código. Intenta más tarde.'))
  }
}

export async function confirmarActivacionEstudiante(payload: {
  codigoSis: string
  codigo: string
  passwordNueva: string
  passwordConfirmacion: string
  /** Solo si la administración no registró su C.I. */
  ci?: string
}): Promise<string> {
  try {
    const { data } = await api.post<{ mensaje: string }>('/auth/estudiante/activacion/confirmar', payload)
    return data.mensaje
  } catch (error: unknown) {
    throw new Error(extractFieldErrorMessage(error, 'No se pudo activar la cuenta. Intenta más tarde.'))
  }
}

export async function requestPasswordReset(email: string): Promise<string> {
  try {
    const { data } = await api.post<{ mensaje: string }>('/auth/forgot-password', { email })
    return data.mensaje
  } catch (error: unknown) {
    throw new Error(extractErrorMessage(error, 'No se pudo enviar la solicitud. Intenta más tarde.'))
  }
}

/** Si el enlace de restablecimiento sigue vigente; null si no se pudo consultar (no se bloquea el formulario). */
export async function estadoEnlaceReset(token: string): Promise<boolean | null> {
  try {
    const { data } = await api.get<{ valido: boolean }>('/auth/reset-password/estado', { params: { token } })
    return data.valido
  } catch {
    return null
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

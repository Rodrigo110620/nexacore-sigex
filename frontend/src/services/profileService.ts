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

/** Lo propio de cada rol (GET /auth/me/rol): lo que no aplica llega null. */
export interface PerfilDelRol {
  permisos: { codigo: string; modulo: string; descripcion: string }[]
  docente: {
    titulo: string | null
    especialidad: string | null
    categoria: string | null
    materias: { idMateria: number; sigla: string; nombre: string; grupos: string[] }[]
  } | null
  /** Exámenes de hoy en adelante donde está asignado como personal de control; null si no controla. */
  examenesAsignados: { idExamen: number; materia: string; fecha: string; horaInicio: string; duracionMinutos: number; aula: string | null; estado: string }[] | null
  /** Ruta de su foto de perfil (opcional), o null si no tiene. */
  fotoUrl: string | null
}

/** Sube o cambia su foto de perfil (ya reducida en el navegador). */
export async function subirMiFoto(foto: Blob): Promise<void> {
  const datos = new FormData()
  datos.append('file', foto, 'perfil.jpg')
  await api.put('/auth/me/foto', datos)
}

export async function quitarMiFoto(): Promise<void> {
  await api.delete('/auth/me/foto')
}

export async function getPerfilDelRol(): Promise<PerfilDelRol> {
  const { data } = await api.get<PerfilDelRol>('/auth/me/rol')
  return data
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

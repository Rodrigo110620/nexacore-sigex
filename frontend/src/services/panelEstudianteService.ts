import api from './api'

/** Foto que envió el estudiante y que aún no es la oficial (GET /mi/perfil). */
export interface SolicitudFoto {
  estado: 'PENDIENTE' | 'RECHAZADA'
  motivoRechazo: string | null
  enviadaEn: string
}

/** Datos del estudiante para su propio panel (GET /mi/perfil). */
export interface MiPerfilEstudiante {
  id: number
  codigoSis: string
  nombre: string
  apellidos: string
  ciEnmascarado: string
  email: string
  telefono: string | null
  estadoMatricula: string
  condicion: string
  /** Ruta de la foto aprobada (la que ve el personal de control), o null si no tiene. */
  fotoUrl: string | null
  solicitudFoto: SolicitudFoto | null
}

export async function obtenerMiPerfil(): Promise<MiPerfilEstudiante> {
  try {
    const { data } = await api.get<MiPerfilEstudiante>('/mi/perfil')
    return data
  } catch (error: unknown) {
    const err = error as { response?: { data?: { mensaje?: string } } }
    if (!err.response) throw new Error('No se pudo conectar con el servidor. Intenta más tarde.')
    throw new Error(err.response.data?.mensaje || 'No se pudo cargar tu perfil. Intenta más tarde.')
  }
}

/**
 * CTA-02: la foto es obligatoria. El estudiante debe registrarla si no tiene una foto aprobada y
 * no hay una pendiente de revisión (nunca envió una o se la rechazaron).
 */
export function requiereRegistrarFoto(perfil: MiPerfilEstudiante): boolean {
  if (perfil.fotoUrl) return false
  return perfil.solicitudFoto?.estado !== 'PENDIENTE'
}

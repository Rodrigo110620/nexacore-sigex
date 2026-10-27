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
  carreras?: { idCarrera: number; nombreCarrera: string; idFacultad: number; nombreFacultad: string }[]
  /** Ruta de la foto aprobada (la que ve el personal de control), o null si no tiene. */
  fotoUrl: string | null
  solicitudFoto: SolicitudFoto | null
  /** El personal de control reportó que su foto no coincide y aún no envió otra. */
  fotoReportada?: boolean
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

export interface ResultadoEnvioFoto {
  /** APROBADA: era su primera foto y ya es la oficial. PENDIENTE: es un cambio y lo revisa la administración. */
  estado: 'APROBADA' | 'PENDIENTE'
  mensaje: string
}

/** Envía la foto de frente del escaneo (PUT /mi/foto). Pide la contraseña del estudiante. */
export async function enviarMiFoto(foto: Blob, password: string): Promise<ResultadoEnvioFoto> {
  const formData = new FormData()
  formData.append('file', foto, 'foto.jpg')
  formData.append('password', password)
  try {
    const { data } = await api.put<ResultadoEnvioFoto>('/mi/foto', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  } catch (error: unknown) {
    const err = error as { response?: { data?: { mensaje?: string } } }
    if (!err.response) throw new Error('No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.')
    throw new Error(err.response.data?.mensaje || 'No se pudo enviar tu foto. Intenta más tarde.')
  }
}

/**
 * CTA-02: la foto es obligatoria. El estudiante debe registrarla si no tiene una foto aprobada y
 * no hay una pendiente de revisión (nunca envió una o se la rechazaron), o si el personal de
 * control reportó que su foto no coincide y todavía no envió otra.
 */
export function requiereRegistrarFoto(perfil: MiPerfilEstudiante): boolean {
  if (perfil.fotoReportada) return true
  if (perfil.fotoUrl) return false
  return perfil.solicitudFoto?.estado !== 'PENDIENTE'
}

/** Examen del estudiante en su panel (GET /mi/examenes). */
export interface MiExamen {
  idExamen: number
  materia: string
  fecha: string
  horaInicio: string
  duracionMinutos: number
  /** Aula donde debe presentarse, o null si se asigna al llegar. */
  aula: string | null
  /** true habilitado, false no habilitado, null pendiente de revisión. */
  habilitado: boolean | null
  motivoInhabilitacion: string | null
  /** AUTORIZADO, DENEGADO o null si todavía no pasó por el control. */
  resultadoIngreso: 'AUTORIZADO' | 'DENEGADO' | null
  motivoDenegacion: string | null
  fechaHoraIngreso: string | null
  /** INCI-01: lo expulsaron en la sesión actual del examen. */
  expulsado: boolean
  /** Hora oficial de la expulsión: su cronómetro se detiene ahí. */
  fechaHoraExpulsion?: string | null
  /** INCI-03: aula original si lo trasladaron en la sesión actual. */
  trasladadoDesde?: string | null
  /** Normas del examen que valen para todos. */
  normasGenerales: string[]
  /** Sus adaptaciones (normas particulares); nunca las de otros estudiantes. */
  normasParticulares: string[]
}

/** QR temporal del estudiante (GET /mi/qr). */
export interface MiQr {
  contenido: string
  pngBase64: string
  expiraEn: string
  segundosValidez: number
}

function errorDePanel(error: unknown, fallback: string): Error {
  const err = error as { response?: { data?: { mensaje?: string } } }
  if (!err.response) return new SinConexionError()
  return new Error(err.response.data?.mensaje || fallback)
}

/** Falla de red: el portal muestra el estado "sin conexión" en vez de un error genérico. */
export class SinConexionError extends Error {
  constructor() {
    super('No hay conexión a Internet. Revisa tu conexión e intenta de nuevo.')
    this.name = 'SinConexionError'
  }
}

export async function obtenerMisExamenes(): Promise<MiExamen[]> {
  try {
    const { data } = await api.get<MiExamen[]>('/mi/examenes')
    return data
  } catch (error: unknown) {
    throw errorDePanel(error, 'No se pudieron cargar tus exámenes. Intenta más tarde.')
  }
}

export async function obtenerMiQr(): Promise<MiQr> {
  try {
    const { data } = await api.get<MiQr>('/mi/qr')
    return data
  } catch (error: unknown) {
    throw errorDePanel(error, 'No se pudo generar tu QR. Intenta más tarde.')
  }
}

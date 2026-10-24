export interface ContextoControlIngreso {
  idEstudiante: number
  estudiante: string
  codigoSis: string
  documento: string
  carrera?: string | null
  idExamen: number
  asignatura: string
  fecha: string
  horaInicio: string
  duracionMinutos: number
  ambiente: string
  normasGenerales: string[]
  normasParticulares: string[]
  habilitado: boolean
  motivoInhabilitacion: string | null
  ingresoRegistrado: boolean
  fechaHoraIngreso: string | null
  /** REGULAR o POSTULANTE. */
  condicion?: string | null
  /** Ruta de la API para descargar la foto, o null si no tiene. */
  fotoUrl?: string | null
}

export interface AutorizarIngresoPayload {
  idEstudiante: number
  idExamen: number
  observaciones: string
  identidadVerificada: boolean
  verificacionesAdicionales: string[]
  incidencias: Array<{ idTipoIncidencia: number; descripcion: string }>
  /** Solo al denegar: "Detalle adicional" del modal (opcional). */
  detalleDenegacion?: string
  /** Hora local y zona del dispositivo que realizó el control. */
  fechaHoraDispositivo?: string
  ingresoManual?: boolean
  justificacionManual?: string
}

/** INCI-01: contrato provisional; identidad y hora se resuelven en el servidor. */
export interface ExpulsarEstudiantePayload {
  idEstudiante: number
  idExamen: number
  motivo: string
}

export interface AutorizarIngresoResultado {
  autorizado: boolean
  resultado: string
  causa: string | null
  fechaHoraIngreso: string
  autorizadoPor: string
  /** Aula a la que debe ir el estudiante (en reparto por llegada, la primera con lugar). */
  ambiente?: string
}

export interface TipoIncidencia {
  id: number
  nombre: string
  descripcion: string | null
}

export interface RegistroControlIngreso {
  tipoIngreso?: 'NORMAL' | 'MANUAL'
  justificacionManual?: string | null
  idRegistro: number
  idEstudiante: number
  idExamen: number
  resultado: string
  causa: string | null
  observaciones: string | null
  verificacionesAdicionales: string[]
  usuarioControl: string
  fechaHora: string
  /** Incidencias registradas junto con este control. */
  incidencias?: Array<{ tipo: string; descripcion: string | null }>
}

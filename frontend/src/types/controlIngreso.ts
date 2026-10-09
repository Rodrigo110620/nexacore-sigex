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
}

export interface AutorizarIngresoPayload {
  idEstudiante: number
  idExamen: number
  observaciones: string
  identidadVerificada: boolean
  verificacionesAdicionales: string[]
  incidencias: Array<{ idTipoIncidencia: number; descripcion: string }>
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
  idRegistro: number
  idEstudiante: number
  idExamen: number
  resultado: string
  causa: string | null
  observaciones: string | null
  verificacionesAdicionales: string[]
  usuarioControl: string
  fechaHora: string
}

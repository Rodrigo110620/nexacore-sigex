import api from './api'

/** INCI-04: excepción de no habilitado en el reporte del examen (sesión actual). */
export interface ExcepcionNoHabilitado {
  idExcepcion: number
  idEstudiante: number
  estudiante: string | null
  codigoSis: string | null
  motivoInhabilitacion: string
  accionTomada: string
  observaciones: string | null
  ambiente: string | null
  registradoPor: string | null
  /** Hora del servidor (Bolivia), "2026-10-27T08:05:00". */
  fechaHora: string
}

export async function listarExcepcionesNoHabilitado(idExamen: number): Promise<ExcepcionNoHabilitado[]> {
  const { data } = await api.get<ExcepcionNoHabilitado[]>(`/control-ingresos/examen/${idExamen}/excepciones-no-habilitado`)
  return Array.isArray(data) ? data : []
}

import api from './api'

export interface ReporteModificacion {
  idAuditoria: number
  idExamen: number
  examen: string
  estudiante: string
  codigoSis: string
  docente: string
  accion: string
  estadoAnterior: string
  esFallo: boolean
  motivoFallo: string | null
  fechaHora: string
}

export async function reporteModificacionesInhabilitados(
  idExamen: number | null,
  desde?: string
): Promise<ReporteModificacion[]> {
  const params = new URLSearchParams()
  if (idExamen != null) params.set('idExamen', String(idExamen))
  if (desde) params.set('desde', desde)
  
  const { data } = await api.get<ReporteModificacion[]>(`/reportes/modificaciones-inhabilitados?${params.toString()}`)
  return data
}
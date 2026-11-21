import api from './api'

export interface ReporteIngreso {
  idControl: number
  examen: string
  estudiante: string
  codigoSis: string
  tipoIngreso: 'NORMAL' | 'MANUAL'
  controlador: string
  fechaHora: string
}

export async function reporteIngresos(idExamen: number | null): Promise<ReporteIngreso[]> {
  const params = new URLSearchParams()
  if (idExamen != null) params.set('idExamen', String(idExamen))
  const { data } = await api.get<ReporteIngreso[]>(`/reportes/ingresos?${params}`)
  return data
}
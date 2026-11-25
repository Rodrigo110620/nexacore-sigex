import api from './api'

export interface ReporteUsoAmbiente {
  idExamen: number
  ambiente: string
  docente: string
  materiaGrupo: string
  fecha: string
  horaInicio: string
  ingresos: number
  utilizado: boolean
}

export async function reporteUsoAmbientes(idExamen: number | null): Promise<ReporteUsoAmbiente[]> {
  const params = new URLSearchParams()
  if (idExamen != null) params.set('idExamen', String(idExamen))
  const { data } = await api.get<ReporteUsoAmbiente[]>(`/reportes/uso-ambientes?${params}`)
  return data
}
import api from './api'

/** UTILIZADO: entró al menos uno; SIN_USO: el examen ya terminó y no entró nadie; PENDIENTE: aún no termina. */
export type EstadoUsoAmbiente = 'UTILIZADO' | 'SIN_USO' | 'PENDIENTE'

export interface ReporteUsoAmbiente {
  idExamen: number
  ambiente: string
  capacidad: number | null
  docente: string
  materia: string
  grupo: string
  fecha: string
  horaInicio: string
  horaFin: string
  ingresos: number
  utilizado: boolean
  estado: EstadoUsoAmbiente
}

export async function reporteUsoAmbientes(idExamen: number | null): Promise<ReporteUsoAmbiente[]> {
  const params = new URLSearchParams()
  if (idExamen != null) params.set('idExamen', String(idExamen))
  const { data } = await api.get<ReporteUsoAmbiente[]>(`/reportes/uso-ambientes?${params}`)
  return data
}
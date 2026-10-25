import api from './api'

export interface ExpulsionResponse {
  idExpulsion: number
  idEstudiante: number
  idExamen: number
  motivo: string
  idResponsable: number
  responsable: string
  fechaHora: string
}

export function esExpulsionConfirmada(data: unknown): data is ExpulsionResponse {
  if (!data || typeof data !== 'object') return false
  const registro = data as Partial<ExpulsionResponse>
  if (![registro.idExpulsion, registro.idEstudiante, registro.idExamen, registro.idResponsable]
    .every((id) => Number.isSafeInteger(id) && Number(id) > 0)) return false
  if (![registro.motivo, registro.responsable].every((texto) => typeof texto === 'string' && texto.trim())) return false
  const fecha = registro.fechaHora
  return typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?$/.test(fecha)
    && Number.isFinite(Date.parse(`${fecha}Z`)) && new Date(`${fecha}Z`).toISOString().slice(0, 19) === fecha.slice(0, 19)
}

export async function listarExpulsionesExamen(idExamen: number): Promise<ExpulsionResponse[]> {
  const { data } = await api.get<unknown>(`/control-ingresos/examen/${idExamen}/expulsiones`)
  if (!Array.isArray(data) || !data.every((registro) => esExpulsionConfirmada(registro) && registro.idExamen === idExamen)) {
    throw new Error('No se pudo verificar el registro de expulsiones del examen.')
  }
  return data
}

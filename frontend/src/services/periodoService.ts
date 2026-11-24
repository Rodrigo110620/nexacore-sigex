import api from './api'

/** idPeriodo para listar de todos los periodos (p. ej. para buscar un examen por id). */
export const TODOS_LOS_PERIODOS = 0

/** Periodo académico (semestre): I-2026, II-2026, VERANO-2027… Solo uno está activo. */
export interface PeriodoDto {
  idPeriodo: number
  nombre: string
  fechaInicio: string
  fechaFin: string
  activo: boolean
}

export interface CrearPeriodoPayload {
  nombre: string
  fechaInicio: string
  fechaFin: string
  activar: boolean
}

export async function listarPeriodos(): Promise<PeriodoDto[]> {
  const { data } = await api.get<PeriodoDto[]>('/periodos')
  return data
}

export async function crearPeriodo(payload: CrearPeriodoPayload): Promise<PeriodoDto> {
  const { data } = await api.post<PeriodoDto>('/periodos', payload)
  return data
}

export async function activarPeriodo(idPeriodo: number): Promise<PeriodoDto> {
  const { data } = await api.put<PeriodoDto>(`/periodos/${idPeriodo}/activar`)
  return data
}

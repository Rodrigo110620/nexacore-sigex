import api from './api'

export interface AmbienteDto {
  id: number
  nombre: string
  ubicacion: string | null
  disponible?: boolean  // presente solo cuando se consulta disponibilidad
}

export async function listarAmbientes(): Promise<AmbienteDto[]> {
  const { data } = await api.get<AmbienteDto[]>('/ambientes')
  return data
}

export async function crearAmbiente(payload: {
  nombre: string
  ubicacion?: string
}): Promise<AmbienteDto> {
  const { data } = await api.post<AmbienteDto>('/ambientes', payload)
  return data
}

export interface DisponibilidadParams {
  fecha: string
  horaInicio: string       // HH:MM:SS
  duracionMinutos: number
  idExamenExcluido?: number
  idParaleloExcluido?: number
}

export async function listarAmbientesConDisponibilidad(
  params: DisponibilidadParams,
): Promise<AmbienteDto[]> {
  const { data } = await api.get<AmbienteDto[]>('/ambientes/disponibilidad', { params })
  return data
}

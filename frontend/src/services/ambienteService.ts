import api from './api'

export interface AmbienteDto {
  id: number
  nombre: string
  ubicacion: string | null
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

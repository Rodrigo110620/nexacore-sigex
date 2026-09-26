import api from './api'

export interface NormaParticularDto {
  estudiante: string
  texto: string
}

export interface CrearExamenPayload {
  asignatura: string
  docente: string
  fecha: string
  horaInicio: string
  duracionMinutos: number
  idAmbiente: number
  normasGenerales: string[]
  normasParticulares: NormaParticularDto[]
}

export interface ExamenDto {
  idExamen: number
  idParalelo: number
  asignatura: string
  docente: string
  fecha: string
  horaInicio: string
  duracionMinutos: number
  idAmbiente: number
  ambienteNombre: string
  estado: string
  normasGenerales: string[]
  normasParticulares: NormaParticularDto[]
}

export async function listarExamenes(): Promise<ExamenDto[]> {
  const { data } = await api.get<ExamenDto[]>('/examenes')
  return data
}

export async function crearExamen(payload: CrearExamenPayload): Promise<ExamenDto> {
  const { data } = await api.post<ExamenDto>('/examenes', payload)
  return data
}

export interface ActualizarExamenPayload {
  asignatura: string
  docente: string
  fecha: string
  horaInicio: string
  duracionMinutos: number
  idAmbiente: number
  normasGenerales: string[]
  normasParticulares: NormaParticularDto[]
}

export async function actualizarExamen(
  idExamen: number,
  idParalelo: number,
  payload: ActualizarExamenPayload,
): Promise<ExamenDto> {
  const { data } = await api.put<ExamenDto>(`/examenes/${idExamen}/${idParalelo}`, payload)
  return data
}

export async function cancelarExamen(idExamen: number, idParalelo: number): Promise<void> {
  await api.delete(`/examenes/${idExamen}/${idParalelo}`)
}

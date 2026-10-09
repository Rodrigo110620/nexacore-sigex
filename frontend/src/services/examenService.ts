import api from './api'

export interface NormaParticularDto {
  estudiante: string
  texto: string
  idEstudiante?: number | null
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
  idMateria?: number | null
  idDocente?: number | null
  /** Aulas que se suman a la principal cuando los estudiantes no caben; se llenan en este orden. */
  idAmbientesAdicionales?: number[]
}

/** Aula de un examen en el orden en que se llena (0 = principal). capacidad null: aforo sin registrar. */
export interface AulaExamenDto {
  idAmbiente: number
  nombre: string
  capacidad?: number | null
  orden: number
}

export interface ExamenDto {
  idExamen: number
  idParalelo: number
  asignatura: string
  sigla?: string
  docente: string
  fecha: string
  horaInicio: string
  duracionMinutos: number
  idAmbiente: number
  ambienteNombre: string
  ambienteUbicacion?: string | null
  estado: string
  normasGenerales: string[]
  normasParticulares: NormaParticularDto[]
  idMateria?: number | null
  idDocente?: number | null
  /** Aula principal y adicionales; puede faltar en respuestas antiguas. */
  aulas?: AulaExamenDto[]
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
  idMateria?: number | null
  idDocente?: number | null
  normasGeneralesEliminadas?: string[]
  normasParticularesEliminadas?: NormaParticularDto[]
  /** Sin enviar, el examen conserva sus aulas adicionales. */
  idAmbientesAdicionales?: number[]
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

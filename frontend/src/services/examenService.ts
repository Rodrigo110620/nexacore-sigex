import api from './api'

/** ALFABETICO: cada uno sabe su aula antes. LLEGADA: se llena la primera aula con los que van llegando. */
export type ModoReparto = 'ALFABETICO' | 'LLEGADA'

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
  modoReparto?: ModoReparto
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
  modoReparto?: ModoReparto
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
  /** Sin enviar, el examen conserva su modo. */
  modoReparto?: ModoReparto
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

/** Repite un examen ya finalizado: la sesión anterior queda en el historial (ADMIN o su DOCENTE). */
export async function reprogramarExamen(
  idExamen: number,
  idParalelo: number,
  payload: { fecha: string; horaInicio: string; duracionMinutos: number; motivo: string },
): Promise<ExamenDto> {
  const { data } = await api.post<ExamenDto>(`/examenes/${idExamen}/${idParalelo}/reprogramar`, payload)
  return data
}

/** Sesión anterior de un examen reprogramado (GET /examenes/{id}/{paralelo}/sesiones). */
export interface SesionExamen {
  numero: number
  fecha: string
  horaInicio: string
  duracionMinutos: number
  ambiente: string | null
  asociados: number
  ingresaron: number
  motivoReprogramacion: string
  reprogramadoPor: string | null
  cerradaEn: string
  estudiantes: {
    idEstudiante: number
    codigoSis: string
    nombre: string
    habilitado: boolean | null
    motivoInhabilitacion: string | null
    fechaHoraIngreso: string | null
    aulaIngreso: string | null
  }[]
}

export async function listarSesionesExamen(idExamen: number, idParalelo: number): Promise<SesionExamen[]> {
  const { data } = await api.get<SesionExamen[]>(`/examenes/${idExamen}/${idParalelo}/sesiones`)
  return data
}

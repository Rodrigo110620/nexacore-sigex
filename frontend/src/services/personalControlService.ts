import api from './api'

/** Personal de control (V53): quién controla el ingreso de cada examen. */
export interface PersonalControl {
  idUsuario: number
  nombre: string
  apellidos: string
  email: string
  disponible?: boolean
  conflictoHorario?: string | null
  /** Aula a su cargo cuando el examen tiene varias (V66). */
  idAmbiente?: number | null
  ambiente?: string | null
}

export async function personalDelExamen(idExamen: number): Promise<PersonalControl[]> {
  const { data } = await api.get<PersonalControl[]>(`/examenes/${idExamen}/personal-control`)
  return data
}

/** aulas (opcional): idUsuario → idAmbiente. Sin ella, con varias aulas, el servidor reparte uno por aula. */
export async function asignarPersonal(idExamen: number, idUsuarios: number[], aulas?: Record<number, number>): Promise<PersonalControl[]> {
  const { data } = await api.put<PersonalControl[]>(`/examenes/${idExamen}/personal-control`, { idUsuarios, aulas })
  return data
}

/** El aula a cargo del usuario en el examen; null si no está asignado. */
export async function miAsignacion(idExamen: number): Promise<PersonalControl | null> {
  const res = await api.get<PersonalControl | ''>(`/examenes/${idExamen}/personal-control/mia`)
  return res.status === 204 || !res.data ? null : res.data
}

export async function personalDisponible(): Promise<PersonalControl[]> {
  const { data } = await api.get<PersonalControl[]>('/personal-control')
  return data
}

export async function personalDisponibleParaExamen(idExamen: number): Promise<PersonalControl[]> {
  const { data } = await api.get<PersonalControl[]>(`/examenes/${idExamen}/personal-control/disponibles`)
  return data
}

/** Al registrar un examen: quién está libre en ese horario (el otro grupo que se toma junto no cuenta como cruce). */
export async function personalDisponibleEnHorario(params: {
  fecha: string
  horaInicio: string
  duracionMinutos: number
  idMateria?: number | null
  idDocente?: number | null
}): Promise<PersonalControl[]> {
  const { data } = await api.get<PersonalControl[]>('/personal-control/disponibles', {
    params: { ...params, idMateria: params.idMateria ?? undefined, idDocente: params.idDocente ?? undefined },
  })
  return data
}

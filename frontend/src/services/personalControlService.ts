import api from './api'

/** Personal de control (V53): quién controla el ingreso de cada examen. */
export interface PersonalControl {
  idUsuario: number
  nombre: string
  apellidos: string
  email: string
}

export async function personalDelExamen(idExamen: number): Promise<PersonalControl[]> {
  const { data } = await api.get<PersonalControl[]>(`/examenes/${idExamen}/personal-control`)
  return data
}

export async function asignarPersonal(idExamen: number, idUsuarios: number[]): Promise<PersonalControl[]> {
  const { data } = await api.put<PersonalControl[]>(`/examenes/${idExamen}/personal-control`, { idUsuarios })
  return data
}

export async function personalDisponible(): Promise<PersonalControl[]> {
  const { data } = await api.get<PersonalControl[]>('/personal-control')
  return data
}

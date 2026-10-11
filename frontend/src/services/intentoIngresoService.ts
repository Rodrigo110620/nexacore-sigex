import api from './api'

export interface IntentoIngreso {
  idIntento: number
  idExamen: number
  idEstudiante: number | null
  estudiante: string | null
  codigoSis: string | null
  identificador: string
  motivo: string
  personalControl: string
  fechaHora: string
}

export async function registrarIntentoIngreso(payload: {
  idExamen: number; idEstudiante: number; identificador: string; motivo: string
}): Promise<void> {
  await api.post('/intentos-ingreso', payload)
}

/** ACCS-06: el estudiante pertenece al examen pero se presentó en otra aula. Devuelve el registro con la hora del servidor. */
export async function registrarAmbienteIncorrecto(payload: {
  idExamen: number; idEstudiante: number; aulaActual: string
}): Promise<IntentoIngreso> {
  const { data } = await api.post<IntentoIngreso>('/intentos-ingreso/ambiente-incorrecto', payload)
  return data
}

export async function listarIntentosIngreso(idExamen: number, idEstudiante?: number): Promise<IntentoIngreso[]> {
  const { data } = await api.get<IntentoIngreso[]>('/intentos-ingreso', { params: { idExamen, idEstudiante } })
  return data
}

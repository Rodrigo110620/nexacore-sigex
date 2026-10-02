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

export async function listarIntentosIngreso(idExamen: number, idEstudiante?: number): Promise<IntentoIngreso[]> {
  const { data } = await api.get<IntentoIngreso[]>('/intentos-ingreso', { params: { idExamen, idEstudiante } })
  return data
}

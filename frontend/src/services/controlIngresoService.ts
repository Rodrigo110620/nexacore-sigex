import api from './api'
import type { AutorizarIngresoPayload, AutorizarIngresoResultado, ContextoControlIngreso, ExpulsarEstudiantePayload, RegistroControlIngreso, TipoIncidencia } from '../types/controlIngreso'

/** La respuesta sigue sin contrato: recibirla no confirma por sí solo una expulsión. */
export async function expulsarEstudiante(payload: ExpulsarEstudiantePayload): Promise<unknown> {
  const motivo = payload.motivo.trim()
  if (!motivo) throw new Error('El motivo de expulsión es obligatorio.')
  if (![payload.idEstudiante, payload.idExamen].every((id) => Number.isSafeInteger(id) && id > 0)) {
    throw new Error('El estudiante y el examen deben tener identificadores válidos.')
  }
  // Lista explícita: tampoco se transmiten campos extra presentes en tiempo de ejecución.
  const { data } = await api.post<unknown>('/control-ingresos/expulsar', {
    idEstudiante: payload.idEstudiante,
    idExamen: payload.idExamen,
    motivo,
  })
  return data
}

export async function obtenerContextoControl(idEstudiante: number, idExamen: number) {
  const { data } = await api.get<ContextoControlIngreso>(`/control-ingresos/${idEstudiante}/${idExamen}/contexto`)
  return data
}

export async function autorizarIngreso(payload: AutorizarIngresoPayload) {
  try {
    const { data } = await api.post<AutorizarIngresoResultado>('/control-ingresos/autorizar', payload)
    return data
  } catch (error: unknown) {
    const response = (error as { response?: { data?: AutorizarIngresoResultado } }).response
    if (response?.data?.resultado) return response.data
    throw error
  }
}

export async function obtenerTiposIncidencia() {
  const { data } = await api.get<TipoIncidencia[]>('/control-ingresos/tipos-incidencia')
  return data
}

export async function denegarIngreso(payload: AutorizarIngresoPayload) {
  const { data } = await api.post<AutorizarIngresoResultado>('/control-ingresos/denegar', payload)
  return data
}

export async function obtenerHistorialControl(idEstudiante: number, idExamen: number) {
  const { data } = await api.get<RegistroControlIngreso[]>(`/control-ingresos/${idEstudiante}/${idExamen}`)
  return data
}

export interface RegistroControlIngresoExamen extends RegistroControlIngreso {
  estudiante: string
  codigoSis: string | null
}

export async function listarRegistrosControlExamen(idExamen: number): Promise<RegistroControlIngresoExamen[]> {
  const { data } = await api.get<RegistroControlIngresoExamen[]>(`/control-ingresos/examen/${idExamen}/registros`)
  return data
}

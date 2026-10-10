import api from './api'
import type { AutorizarIngresoPayload, AutorizarIngresoResultado, ContextoControlIngreso, RegistroControlIngreso, TipoIncidencia } from '../types/controlIngreso'

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

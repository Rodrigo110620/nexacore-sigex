import api from './api'
import type { AutorizarIngresoPayload, AutorizarIngresoResultado, ContextoControlIngreso, RegistroControlIngreso, TipoIncidencia } from '../types/controlIngreso'

export interface HistorialControlExamen {
  idRegistro: number
  idEstudiante: number
  estudiante: string
  identificador: string
  resultado: string
  causa: string | null
  observaciones: string | null
  usuarioControl: string
  fechaHora: string
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

export async function obtenerHistorialControlExamen(idExamen: number) {
  const { data } = await api.get<HistorialControlExamen[]>(`/control-ingresos/examen/${idExamen}/historial`)
  return data
}

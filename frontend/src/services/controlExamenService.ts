import api from './api'
import type { PageResponse } from '../types/userApi'
import { listarExpulsionesExamen, type ExpulsionResponse } from './expulsionService'

export type FiltroEstado = 'TODOS' | 'HABILITADOS' | 'NO_HABILITADOS'

export interface EstudianteAsignado {
  idEstudiante: number
  nombre: string
  apellidos: string
  codigoSis: string
  ci: string
  carrera: string | null
  estado: 'HABILITADO' | 'DESHABILITADO'
  motivoInhabilitacion: string | null
  ingresado: boolean
  /** Ruta de la foto; null si no tiene (no se podrá autorizar su ingreso). */
  fotoUrl?: string | null
  /** Estado derivado exclusivamente de la consulta de expulsiones de la sesión actual. */
  expulsado?: boolean
  expulsion?: ExpulsionResponse
}

export interface ResumenEstudiantes {
  total: number
  habilitados: number
  noHabilitados: number
  ingresados: number
}

/** Estudiantes asignados al examen, ordenados por apellidos y nombre. */
export async function listarEstudiantesExamen(
  idExamen: number,
  estado: FiltroEstado,
  page: number,
  size = 5,
): Promise<PageResponse<EstudianteAsignado>> {
  const [{ data }, expulsiones] = await Promise.all([
    api.get<PageResponse<EstudianteAsignado>>(`/examenes/${idExamen}/estudiantes`, { params: { estado, page, size } }),
    listarExpulsionesExamen(idExamen),
  ])
  const porEstudiante = new Map([...expulsiones].reverse().map((registro) => [registro.idEstudiante, registro]))
  return { ...data, contenido: data.contenido.map((estudiante) => ({
    ...estudiante, expulsado: porEstudiante.has(estudiante.idEstudiante), expulsion: porEstudiante.get(estudiante.idEstudiante),
  })) }
}

export async function obtenerResumenExamen(idExamen: number): Promise<ResumenEstudiantes> {
  const { data } = await api.get<ResumenEstudiantes>(`/examenes/${idExamen}/estudiantes/resumen`)
  return data
}
export interface ReasignarAmbienteRequest {
  idAmbienteDestino: number
  motivo: string
  observacion?: string
}

/** Reasigna un estudiante a otro ambiente por contingencia. */
export async function reasignarAmbiente(
  idExamen: number,
  idEstudiante: number,
  request: ReasignarAmbienteRequest,
): Promise<void> {
  await api.post(`/control-ingresos/${idExamen}/${idEstudiante}/reasignar`, request)
}
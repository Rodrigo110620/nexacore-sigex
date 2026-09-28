import api from './api'
import type { PageResponse } from '../types/userApi'

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
}

export interface ResumenEstudiantes {
  total: number
  habilitados: number
  noHabilitados: number
  ingresados: number
}

/** Estudiantes asignados al examen, 10 por página, ordenados por apellidos y nombre. */
export async function listarEstudiantesExamen(
  idExamen: number,
  estado: FiltroEstado,
  page: number,
): Promise<PageResponse<EstudianteAsignado>> {
  const { data } = await api.get<PageResponse<EstudianteAsignado>>(`/examenes/${idExamen}/estudiantes`, {
    params: { estado, page, size: 10 },
  })
  return data
}

export async function obtenerResumenExamen(idExamen: number): Promise<ResumenEstudiantes> {
  const { data } = await api.get<ResumenEstudiantes>(`/examenes/${idExamen}/estudiantes/resumen`)
  return data
}

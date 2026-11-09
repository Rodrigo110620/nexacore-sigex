import api from './api'
import type { PageResponse } from '../types/userApi'
import { listarExpulsionesExamen, type ExpulsionResponse } from './expulsionService'

export type FiltroEstado = 'TODOS' | 'HABILITADOS' | 'NO_HABILITADOS' | 'AUSENTES'

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
  /** ID del aula donde está asignado el estudiante (para saber el aula actual al reasignar). */
  idAmbienteIngreso?: number | null
  /** INCI-03: aula original si lo trasladaron en la sesión actual ("Trasladado desde ..."). */
  trasladadoDesde?: string | null
  /** Aula actual tras el traslado. */
  trasladadoA?: string | null
  /** Nombre del aula donde ingresó («608»); null si aún no ingresó. */
  aulaIngreso?: string | null
  /** Hora en que salió del examen (V56); null si no salió. */
  fechaHoraSalida?: string | null
  /** Estado derivado exclusivamente de la consulta de expulsiones de la sesión actual. */
  expulsado?: boolean
  expulsion?: ExpulsionResponse
}

export interface ResumenEstudiantes {
  total: number
  habilitados: number
  noHabilitados: number
  ingresados: number
  /** DASH-01: incidencias de la sesión actual (expulsiones, intentos, excepciones, manuales, traslados, QR duplicados). */
  incidencias?: number
  /** DASH-01: expulsados de la sesión; siguen contando como ingresados (con su propia marca). */
  expulsados?: number
  /** DASH-01: trasladados de aula en la sesión; cuentan una sola vez, en su aula nueva. */
  trasladados?: number
  /** DASH-03 (alerta de aforo): ocupación de cada aula del examen. */
  aulas?: OcupacionAula[]
}

/** Estudiantes dentro de un aula frente a su capacidad; el expulsado ya salió y no cuenta. */
export interface OcupacionAula {
  idAmbiente: number
  nombre: string
  capacidad: number | null
  ocupados: number
  estado: 'LIBRE' | 'CASI_LLENA' | 'LLENA' | 'SIN_AFORO'
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
  // Una expulsión anulada (por error) no cuenta: el estudiante sigue con su examen.
  const porEstudiante = new Map([...expulsiones].filter((r) => !r.anuladaEn).reverse().map((registro) => [registro.idEstudiante, registro]))
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
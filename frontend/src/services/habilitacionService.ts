import api from './api'

export type EstadoHabilitacion = 'HABILITADO' | 'NO_HABILITADO'

export interface EstudianteHabilitacionDto {
  idEstudiante: number
  nombre: string
  apellidos: string
  codigoSis: string
  ci: string
  /** Facultades separadas por coma, o "—" si el estudiante no tiene carreras. */
  facultad: string
  estadoHabilitacion: EstadoHabilitacion
  motivo: string | null
}

export interface ActualizarHabilitacionPayload {
  idsEstudiante: number[]
  estadoHabilitacion: EstadoHabilitacion
  motivo?: string
}

function basePath(idExamen: number, idParalelo: number) {
  return `/examenes/${idExamen}/${idParalelo}/habilitacion`
}

export async function listarEstudiantesExamen(
  idExamen: number,
  idParalelo: number,
): Promise<EstudianteHabilitacionDto[]> {
  const { data } = await api.get<EstudianteHabilitacionDto[]>(basePath(idExamen, idParalelo))
  return data
}

/** identificador: código universitario o CI. Devuelve el listado actualizado. */
export async function asociarEstudianteExamen(
  idExamen: number,
  idParalelo: number,
  identificador: string,
): Promise<EstudianteHabilitacionDto[]> {
  const { data } = await api.post<EstudianteHabilitacionDto[]>(basePath(idExamen, idParalelo), {
    identificador: identificador.trim(),
  })
  return data
}

/** Devuelve el listado actualizado. */
export async function actualizarHabilitacion(
  idExamen: number,
  idParalelo: number,
  payload: ActualizarHabilitacionPayload,
): Promise<EstudianteHabilitacionDto[]> {
  const { data } = await api.put<EstudianteHabilitacionDto[]>(basePath(idExamen, idParalelo), payload)
  return data
}

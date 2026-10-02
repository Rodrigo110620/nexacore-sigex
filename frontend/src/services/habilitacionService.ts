import api from './api'

/** PENDIENTE es el estado al asociarse; NO_HABILITADO exige motivo. */
export type EstadoHabilitacion = 'PENDIENTE' | 'HABILITADO' | 'NO_HABILITADO'

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

export interface AsociacionLoteDto {
  asociados: number
  yaAsociados: string[]
  noEncontrados: string[]
  estudiantes: EstudianteHabilitacionDto[]
}

/** identificadores: códigos universitarios o CI, mezclados. Los ya asociados o inexistentes vuelven en el resumen. */
export async function asociarEstudiantesLote(
  idExamen: number,
  idParalelo: number,
  identificadores: string[],
): Promise<AsociacionLoteDto> {
  const { data } = await api.post<AsociacionLoteDto>(`${basePath(idExamen, idParalelo)}/lote`, {
    identificadores,
  })
  return data
}

/** Asocia a todos los inscritos en el paralelo del examen que aún no estén asociados. */
export async function asociarInscritos(idExamen: number, idParalelo: number): Promise<AsociacionLoteDto> {
  const { data } = await api.post<AsociacionLoteDto>(`${basePath(idExamen, idParalelo)}/inscritos`)
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

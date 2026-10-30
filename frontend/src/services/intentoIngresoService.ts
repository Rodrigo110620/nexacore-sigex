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

/** DASH-06 / HU#7: fila del reporte de intentos incorrectos (solo ADMIN). */
export interface IntentoReporte {
  idIntento: number
  idExamen: number
  examen: string | null
  fechaExamen: string
  horaExamen: string
  idEstudiante: number | null
  estudiante: string | null
  codigoSis: string | null
  identificador: string
  motivo: string
  /** NO_CORRESPONDE: examen que no le corresponde · AULA_INCORRECTA: se presentó en otra aula. */
  tipo: 'NO_CORRESPONDE' | 'AULA_INCORRECTA'
  personalControl: string
  fechaHora: string
}

export interface PaginaIntentos {
  contenido: IntentoReporte[]
  pagina: number
  tamano: number
  totalRegistros: number
  totalPaginas: number
}

/** Todos los intentos (o los de un examen, en su sesión actual), del más reciente al más antiguo. */
export async function reporteIntentos(idExamen: number | null, page = 0, size = 20): Promise<PaginaIntentos> {
  const { data } = await api.get<PaginaIntentos>('/intentos-ingreso/reporte', {
    params: { ...(idExamen ? { idExamen } : {}), page, size },
  })
  return data
}

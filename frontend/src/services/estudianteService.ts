import api from './api'
import type {
  CarreraOption,
  EstudianteFilterParams,
  EstudianteListPage,
  FacultadOption,
  EstudianteListItem,
  RegistrarEstudiantePayload,
} from '../types/estudiante'

export interface GetEstudiantesParams extends EstudianteFilterParams {
  page: number
  size: number
}

export async function getEstudiantes(
  params: GetEstudiantesParams,
  signal?: AbortSignal,
): Promise<EstudianteListPage> {
  const { data } = await api.get<EstudianteListPage>('/estudiantes', {
    params: {
      page: params.page,
      size: params.size,
      search: params.search || undefined,
      idFacultad: params.idFacultad || undefined,
      idCarrera: params.idCarrera || undefined,
    },
    signal,
  })
  return data
}

export async function getCarreras(
  idFacultad?: string,
  signal?: AbortSignal,
): Promise<CarreraOption[]> {
  const { data } = await api.get<CarreraOption[]>('/estudiantes/carreras', {
    params: {
      idFacultad: idFacultad || undefined,
    },
    signal,
  })
  return data
}

export async function getFacultades(signal?: AbortSignal): Promise<FacultadOption[]> {
  const { data } = await api.get<FacultadOption[]>('/facultades', { signal })
  return data
}

export async function registrarEstudiante(
  payload: RegistrarEstudiantePayload,
): Promise<EstudianteListItem> {
  const { data } = await api.post<EstudianteListItem>('/estudiantes', payload)
  return data
}

export interface ImportarEstudiantesResponse {
  insertados: number
  ignorados: number
  /** Una línea por fila no importada, p. ej. "Fila 3: El CI debe tener 7 u 8 digitos." */
  errores: string[]
}

export async function importarEstudiantes(file: File): Promise<ImportarEstudiantesResponse> {
  const formData = new FormData()
  formData.append('file', file)
  // api usa application/json por defecto; sin esto axios convertiría el FormData a JSON.
  const { data } = await api.post<ImportarEstudiantesResponse>('/estudiantes/importar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    // Cada fila se guarda en su propia transacción; con una BD remota (Supabase)
    // la importación tarda bastante más que los 12 s por defecto de api.
    timeout: 5 * 60 * 1000,
  })
  return data
}

/** Descarga la planilla con los estudiantes registrados (CSV para importar, PDF para imprimir). */
export async function descargarPlanillaEstudiantes(formato: 'csv' | 'pdf'): Promise<void> {
  const { data } = await api.get<Blob>(`/estudiantes/planilla.${formato}`, { responseType: 'blob' })
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = `planilla_estudiantes.${formato}`
  link.click()
  URL.revokeObjectURL(url)
}

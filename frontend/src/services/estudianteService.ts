import api from './api'
import type {
  CarreraOption,
  EstudianteFilterParams,
  EstudianteListPage,
  FacultadOption,
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
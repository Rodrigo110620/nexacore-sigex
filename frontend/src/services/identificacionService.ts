
import api from './api'

export type TipoIdentificacion = 'codigo' | 'ci'

export interface EstudianteIdentificado {
  idEstudiante: number
  nombre: string
  apellidos: string
  codigoSis: string
  ci: string
  carrera: string | null
  fotoUrl: string | null
  estado: 'HABILITADO' | 'DESHABILITADO' | 'NO_VINCULADO'
  motivoInhabilitacion?: string | null
}

/** 200 con el estado del estudiante en el examen; 404 si el estudiante no existe. */
export async function identificarEstudiante(
  idExamen: number,
  tipo: TipoIdentificacion,
  valor: string,
): Promise<EstudianteIdentificado> {
  const { data } = await api.get<EstudianteIdentificado>(
    `/examenes/${idExamen}/estudiantes/identificar`,
    { params: { tipo, valor } },
  )
  return data
}
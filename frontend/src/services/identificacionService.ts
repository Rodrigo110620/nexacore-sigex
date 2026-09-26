import api from './api'

export type TipoIdentificacion = 'codigo' | 'ci'

export interface EstudianteIdentificado {
  nombre: string
  apellidos: string
  codigoSis: string
  ci: string
  fotoUrl: string | null
  estado: 'HABILITADO' | 'DESHABILITADO' | 'NO_VINCULADO'
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

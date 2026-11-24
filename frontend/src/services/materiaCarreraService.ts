import api from './api'

/** Materia con las carreras a las que pertenece (plan de estudios). Sin carreras: no restringe. */
export interface MateriaConCarreras {
  idMateria: number
  sigla: string | null
  nombre: string
  carreras: { idCarrera: number; nombre: string }[]
}

export async function listarMateriasConCarreras(): Promise<MateriaConCarreras[]> {
  const { data } = await api.get<MateriaConCarreras[]>('/materias/carreras')
  return data
}

export async function asignarCarreras(idMateria: number, idsCarrera: number[]): Promise<MateriaConCarreras> {
  const { data } = await api.put<MateriaConCarreras>(`/materias/${idMateria}/carreras`, { idsCarrera })
  return data
}

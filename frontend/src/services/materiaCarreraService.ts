import api from './api'

/**
 * Materia del catálogo con sus carreras (plan de estudios), si está activa y su oferta en el periodo activo
 * (cuántos grupos y docentes tiene ese semestre). Sin carreras: no restringe.
 */
export interface MateriaConCarreras {
  idMateria: number
  sigla: string | null
  nombre: string
  carreras: { idCarrera: number; nombre: string }[]
  activa: boolean
  gruposEnPeriodo: number
  docentesEnPeriodo: number
}

export interface MateriaPayload {
  sigla: string
  nombre: string
  /** null al editar: no cambia sus carreras. */
  idsCarrera: number[] | null
}

export interface ImportacionMaterias {
  creadas: number
  existentes: string[]
  errores: string[]
}

export async function listarMateriasConCarreras(): Promise<MateriaConCarreras[]> {
  const { data } = await api.get<MateriaConCarreras[]>('/materias/carreras')
  return data
}

export async function asignarCarreras(idMateria: number, idsCarrera: number[]): Promise<MateriaConCarreras> {
  const { data } = await api.put<MateriaConCarreras>(`/materias/${idMateria}/carreras`, { idsCarrera })
  return data
}

export async function crearMateria(payload: MateriaPayload): Promise<MateriaConCarreras> {
  const { data } = await api.post<MateriaConCarreras>('/materias', payload)
  return data
}

export async function editarMateria(idMateria: number, payload: MateriaPayload): Promise<MateriaConCarreras> {
  const { data } = await api.put<MateriaConCarreras>(`/materias/${idMateria}`, payload)
  return data
}

export async function cambiarEstadoMateria(idMateria: number, activa: boolean): Promise<MateriaConCarreras> {
  const { data } = await api.put<MateriaConCarreras>(`/materias/${idMateria}/estado`, null, { params: { activa } })
  return data
}

export async function importarMaterias(archivo: File): Promise<ImportacionMaterias> {
  const datos = new FormData()
  datos.append('file', archivo)
  const { data } = await api.post<ImportacionMaterias>('/materias/importar', datos)
  return data
}

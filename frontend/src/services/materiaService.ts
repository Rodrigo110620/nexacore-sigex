import api from './api'

export interface MateriaDto {
  id: number
  sigla: string
  nombre: string
}

export async function buscarMaterias(search: string, signal?: AbortSignal): Promise<MateriaDto[]> {
  const q = search.trim()
  if (q.length < 3) return []
  const { data } = await api.get<MateriaDto[]>('/materias', {
    params: { search: q },
    signal,
  })
  return data
}

/** IMP-12: las materias del docente que inició sesión. */
export async function misMaterias(): Promise<MateriaDto[]> {
  const { data } = await api.get<MateriaDto[]>('/materias/mias')
  return data
}

/** IMP-12: las materias de un docente (solo ADMIN). */
export async function materiasDelDocente(idDocente: number): Promise<MateriaDto[]> {
  const { data } = await api.get<MateriaDto[]>(`/usuarios/${idDocente}/materias`)
  return data
}

/** IMP-12: reemplaza las materias de un docente (al menos una; solo ADMIN). */
export async function asignarMateriasAlDocente(idDocente: number, idMaterias: number[]): Promise<MateriaDto[]> {
  const { data } = await api.put<MateriaDto[]>(`/usuarios/${idDocente}/materias`, { idMaterias })
  return data
}

import api from './api'

export interface MateriaDto {
  id: number
  sigla: string
  nombre: string
  /** Grupos del docente en la materia (G1, G2…); solo en las materias de un docente. */
  grupos?: string[]
}

/** {idMateria: ["G1", "G2"]} de las materias elegidas (las que no tienen grupos no se envían). */
export function gruposPorMateria(materias: MateriaDto[]): Record<number, string[]> {
  return Object.fromEntries(materias.filter((m) => m.grupos?.length).map((m) => [m.id, m.grupos!]))
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

/** Un grupo (G1, G2…) de una materia con sus inscritos. */
export interface GrupoDto {
  idParalelo: number
  nombreGrupo: string
  inscritos: number
}

/** Los grupos del docente en la materia (el DOCENTE, los suyos; el ADMIN indica el docente). */
export async function gruposDeMateria(idMateria: number, idDocente?: number | null): Promise<GrupoDto[]> {
  const { data } = await api.get<GrupoDto[]>(`/materias/${idMateria}/grupos`, { params: idDocente ? { idDocente } : undefined })
  return data
}

/** IMP-12: las materias de un docente (solo ADMIN). */
export async function materiasDelDocente(idDocente: number): Promise<MateriaDto[]> {
  const { data } = await api.get<MateriaDto[]>(`/usuarios/${idDocente}/materias`)
  return data
}

/** IMP-12: reemplaza las materias de un docente (al menos una; solo ADMIN). */
export async function asignarMateriasAlDocente(idDocente: number, idMaterias: number[], grupos?: Record<number, string[]>): Promise<MateriaDto[]> {
  const { data } = await api.put<MateriaDto[]>(`/usuarios/${idDocente}/materias`, grupos ? { idMaterias, grupos } : { idMaterias })
  return data
}

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

import type { UserListItem, UserRoleFilter, UserStatusFilter } from './user'

export interface UserListParams {
  page?: number
  size?: number
  search?: string
  rol?: UserRoleFilter
  estado?: UserStatusFilter
}

export interface PageResponse<T> {
  contenido: T[]
  pagina: number
  tamano: number
  totalRegistros: number
  totalPaginas: number
}

export type UserListPage = PageResponse<UserListItem>
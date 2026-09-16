export type UserRole = 'ADMIN' | 'DOCENTE' | 'CONTROL' | 'SIN_ROL'

export type UserStatus = 'activo' | 'inactivo'

export type FilterableUserRole = Exclude<UserRole, 'SIN_ROL'>

export type UserRoleFilter = FilterableUserRole | ''

export type UserStatusFilter = UserStatus | ''

export interface UserFilterParams {
  search: string
  rol: UserRoleFilter
  estado: UserStatusFilter
}

export interface UserListItem {
  id: number
  nombre: string
  apellidos: string
  email: string
  rol: UserRole
  estado: UserStatus
}
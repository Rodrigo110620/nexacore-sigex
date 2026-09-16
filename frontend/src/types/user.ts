// UserRole es string dinámico: el backend puede devolver cualquier rol de la BD.
// 'SIN_ROL' es el valor especial que devuelve el backend si un usuario no tiene rol asignado.
export type UserRole = string

export type UserStatus = 'activo' | 'inactivo'

// FilterableUserRole: roles conocidos que se muestran en el filtro del listado.
// Si se agrega un rol nuevo en BD, hay que agregarlo aquí también para que
// aparezca en el selector de filtros (Sprint 2+: hacerlo dinámico con GET /roles).
export type FilterableUserRole = 'ADMIN' | 'DOCENTE' | 'CONTROL'

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
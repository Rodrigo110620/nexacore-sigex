export type UserRole = 'ADMIN' | 'DOCENTE' | 'CONTROL' | 'SIN_ROL'

export type UserStatus = 'activo' | 'inactivo'

export interface UserListItem {
  id: number
  nombre: string
  apellidos: string
  email: string
  rol: UserRole
  estado: UserStatus
}
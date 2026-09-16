export interface LoginRequest {
  email: string
  password: string
}

export type AuthRole = 'ADMIN' | 'DOCENTE' | 'CONTROL'

export interface AuthResponse {
  token: string
  nombre: string
  roles: AuthRole[]
}

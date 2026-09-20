export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  nombre: string
  roles: string[]
}

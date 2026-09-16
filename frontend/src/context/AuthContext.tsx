import { createContext, useContext, useState, ReactNode } from 'react'

interface AuthContextType {
  token: string | null
  nombre: string | null
  roles: string[]
  isAuthenticated: boolean
  isAdmin: boolean
  login: (token: string, nombre: string, roles: string[]) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

/**
 * Verifica si un JWT está expirado leyendo el claim `exp` del payload.
 * No valida la firma — eso lo hace el backend.
 * Devuelve false si el token no tiene formato JWT (3 partes separadas por '.')
 * para no romper tokens de prueba ni sesiones antiguas: el backend
 * devolverá 401 y el interceptor de api.ts limpiará la sesión.
 */
function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false // no es JWT, dejar que el backend decida
    const payload = JSON.parse(atob(parts[1]))
    return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()
  } catch {
    return false // no se puede determinar, dejar que el backend decida
  }
}

/** Lee un token de localStorage y lo devuelve solo si no ha expirado. */
function leerTokenValido(): string | null {
  const token = localStorage.getItem('token')
  if (!token || isTokenExpired(token)) {
    localStorage.removeItem('token')
    localStorage.removeItem('nombre')
    localStorage.removeItem('roles')
    return null
  }
  return token
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => leerTokenValido())
  const [nombre, setNombre] = useState<string | null>(() => localStorage.getItem('nombre'))
  const [roles, setRoles] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('roles')
      if (!stored) return []
      const parsed = JSON.parse(stored)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })

  const login = (newToken: string, newNombre: string, newRoles: string[]) => {
    localStorage.setItem('token', newToken)
    localStorage.setItem('nombre', newNombre)
    localStorage.setItem('roles', JSON.stringify(newRoles))
    setToken(newToken)
    setNombre(newNombre)
    setRoles(newRoles)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('nombre')
    localStorage.removeItem('roles')
    setToken(null)
    setNombre(null)
    setRoles([])
  }

  const isAuthenticated = !!token
  const isAdmin = roles.includes('ADMIN')

  return (
    <AuthContext.Provider
      value={{ token, nombre, roles, isAuthenticated, isAdmin, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
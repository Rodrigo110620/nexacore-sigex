import { createContext, useContext, useState, ReactNode } from 'react'
import type { AuthRole } from '../types/auth'

function normalizeRoles(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((role): role is string => typeof role === 'string' && role.trim().length > 0))]
}

function readStoredRoles(): string[] {
  const storedRoles = localStorage.getItem('roles')
  if (!storedRoles) return []

  try {
    return normalizeRoles(JSON.parse(storedRoles))
  } catch {
    return []
  }
}

interface AuthContextType {
  token: string | null
  nombre: string | null
  roles: string[]
  isAuthenticated: boolean
  isAdmin: boolean
  login: (token: string, nombre: string, roles: string[]) => void
  logout: () => void
  hasRole: (role: AuthRole) => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [nombre, setNombre] = useState<string | null>(() => localStorage.getItem('nombre'))
  const [roles, setRoles] = useState<string[]>(readStoredRoles)

  const login = (newToken: string, newNombre: string, newRoles: string[]) => {
    const validRoles = normalizeRoles(newRoles)
    localStorage.setItem('token', newToken)
    localStorage.setItem('nombre', newNombre)
    localStorage.setItem('roles', JSON.stringify(validRoles))
    setToken(newToken)
    setNombre(newNombre)
    setRoles(validRoles)
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
  const hasRole = (role: AuthRole) => roles.includes(role)

  return (
    <AuthContext.Provider value={{ token, nombre, roles, isAuthenticated, isAdmin, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}

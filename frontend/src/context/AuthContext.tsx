import { createContext, useContext, useState, ReactNode } from 'react'
import type { AuthRole } from '../types/auth'

const VALID_ROLES: AuthRole[] = ['ADMIN', 'DOCENTE', 'CONTROL']

function isAuthRole(value: unknown): value is AuthRole {
  return typeof value === 'string' && VALID_ROLES.includes(value as AuthRole)
}

function normalizeRoles(value: unknown): AuthRole[] {
  if (!Array.isArray(value) || !value.every(isAuthRole)) return []
  return [...new Set(value)]
}

function readStoredRoles(): AuthRole[] {
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
  roles: AuthRole[]
  isAuthenticated: boolean
  login: (token: string, roles: unknown) => void
  logout: () => void
  hasRole: (role: AuthRole) => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [roles, setRoles] = useState<AuthRole[]>(readStoredRoles)

  const login = (newToken: string, newRoles: unknown) => {
    const validRoles = normalizeRoles(newRoles)
    localStorage.setItem('token', newToken)
    localStorage.setItem('roles', JSON.stringify(validRoles))
    setToken(newToken)
    setRoles(validRoles)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('roles')
    setToken(null)
    setRoles([])
  }

  const hasRole = (role: AuthRole) => roles.includes(role)

  return (
    <AuthContext.Provider value={{ token, roles, isAuthenticated: !!token, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}

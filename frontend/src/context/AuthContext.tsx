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
  nombre: string | null
  roles: AuthRole[]
  isAuthenticated: boolean
  isAdmin: boolean
  login: (token: string, roles: unknown, nombre?: string) => void
  logout: () => void
  hasRole: (role: AuthRole) => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [nombre, setNombre] = useState<string | null>(() => localStorage.getItem('nombre'))
  const [roles, setRoles] = useState<AuthRole[]>(readStoredRoles)

  const login = (newToken: string, newRoles: unknown, newNombre?: string) => {
    const validRoles = normalizeRoles(newRoles)
    const validName = typeof newNombre === 'string' && newNombre.trim() ? newNombre : null

    localStorage.setItem('token', newToken)
    localStorage.setItem('roles', JSON.stringify(validRoles))
    if (validName) localStorage.setItem('nombre', validName)
    else localStorage.removeItem('nombre')

    setToken(newToken)
    setNombre(validName)
    setRoles(validRoles)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('roles')
    localStorage.removeItem('nombre')
    setToken(null)
    setNombre(null)
    setRoles([])
  }

  const hasRole = (role: AuthRole) => roles.includes(role)
  const isAdmin = hasRole('ADMIN')

  return (
    <AuthContext.Provider
      value={{ token, nombre, roles, isAuthenticated: !!token, isAdmin, login, logout, hasRole }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}

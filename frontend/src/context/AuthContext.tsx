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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
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

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
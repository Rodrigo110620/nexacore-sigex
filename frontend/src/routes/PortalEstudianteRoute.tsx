import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

/**
 * Envuelve el portal del estudiante (rol ESTUDIANTE).
 * El personal que entre aquí vuelve a su dashboard.
 */
export default function PortalEstudianteRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, roles } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!roles.includes('ESTUDIANTE')) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

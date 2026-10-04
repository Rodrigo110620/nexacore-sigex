import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

/**
 * Envuelve la sección de Estudiantes.
 * Acceso: ADMIN, DOCENTE y CONTROL.
 */
export default function EstudianteRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, roles } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!roles.some((role) => role === 'ADMIN' || role === 'DOCENTE' || role === 'CONTROL')) {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}
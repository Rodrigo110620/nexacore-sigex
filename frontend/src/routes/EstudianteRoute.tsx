import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { tienePermiso } from '../utils/permisos'

/**
 * Envuelve la sección de Estudiantes.
 * Acceso: ADMIN, DOCENTE y CONTROL.
 */
export default function EstudianteRoute({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const { isAuthenticated } = auth
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!tienePermiso(auth, 'ESTUDIANTES_VER')) {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}
import { Navigate } from 'react-router-dom'
import { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

/**
 * Envuelve las rutas privadas del personal.
 * Sin sesión activa → redirige a /login. El estudiante va a su propio portal.
 */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, roles } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles.includes('ESTUDIANTE')) return <Navigate to="/estudiante" replace />
  return <>{children}</>
}

import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { tienePermiso } from '../utils/permisos'

export default function IdentificacionRoute({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const { isAuthenticated } = auth
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!tienePermiso(auth, 'CONTROL_INGRESO_TODOS', 'CONTROL_INGRESO_PROPIOS')) {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}

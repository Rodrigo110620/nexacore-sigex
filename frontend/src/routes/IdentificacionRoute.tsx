import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

export default function IdentificacionRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, roles } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!roles.some((role) => role === 'ADMIN' || role === 'CONTROL' || role === 'DOCENTE')) {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}

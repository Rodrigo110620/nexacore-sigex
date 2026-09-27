import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

export default function ControlRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, roles } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!roles.includes('CONTROL')) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

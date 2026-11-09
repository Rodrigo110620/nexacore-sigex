import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { registraControl, veControl } from '../utils/permisos'

/** registrar: la pantalla registra el control (escanear, autorizar); sin él basta con verlo (el ADMIN supervisa). */
export default function IdentificacionRoute({ children, registrar = false }: { children: ReactNode; registrar?: boolean }) {
  const auth = useAuth()
  const { isAuthenticated } = auth
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!(registrar ? registraControl(auth) : veControl(auth))) {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}

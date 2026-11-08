import { Navigate } from 'react-router-dom'
import { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { tienePermiso, type Permiso } from '../utils/permisos'

/**
 * Envuelve rutas del personal que piden un permiso (por defecto, gestionar usuarios: el ADMIN).
 * Sin sesión → /login · Sin el permiso → /dashboard
 */
export default function AdminRoute({ children, permiso = 'USUARIOS_GESTIONAR', permisos }: { children: ReactNode; permiso?: Permiso; permisos?: Permiso[] }) {
  const auth = useAuth()

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!tienePermiso(auth, ...(permisos ?? [permiso]))) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

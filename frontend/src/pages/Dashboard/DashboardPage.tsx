import { Navigate } from 'react-router-dom'

/**
 * /dashboard redirige al panel de administración de usuarios.
 * Sprints siguientes pueden agregar sub-rutas según el rol.
 */
export default function DashboardPage() {
  return <Navigate to="/dashboard/usuarios" replace />
}

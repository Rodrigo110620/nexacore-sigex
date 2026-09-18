import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'

/**
 * /dashboard:
 * - ADMIN → va a gestión de usuarios
 * - Otros roles → panel de inicio (evita bucle con AdminRoute)
 */
export default function DashboardPage() {
  const { isAdmin, nombre, roles } = useAuth()

  if (isAdmin) {
    return <Navigate to="/dashboard/usuarios" replace />
  }

  return (
    <PanelLayout>
      <div className="min-h-screen p-4 pb-24 sm:p-8 lg:pb-8">
        <h1 className="mb-2 text-xl font-bold text-[#011140]">
          Bienvenido{nombre ? `, ${nombre}` : ''}
        </h1>
        <p className="mb-2 text-sm text-gray-500">
          Rol: {roles.length > 0 ? roles.join(', ') : 'sin rol asignado'}
        </p>
        <p className="text-xs text-gray-400">
          Módulos de Exámenes y Estudiantes estarán disponibles en siguientes sprints.
        </p>
      </div>
      <MobileBottomNav />
    </PanelLayout>
  )
}

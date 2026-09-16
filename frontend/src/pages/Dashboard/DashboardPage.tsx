import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import PanelLayout from '../../components/layout/PanelLayout'

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
      <div className="p-8">
        <h1 className="text-[#011140] font-bold text-xl mb-2">
          Bienvenido{nombre ? `, ${nombre}` : ''}
        </h1>
        <p className="text-gray-500 text-sm mb-2">
          Rol: {roles.length > 0 ? roles.join(', ') : 'sin rol asignado'}
        </p>
        <p className="text-gray-400 text-xs">
          Módulos de Exámenes y Estudiantes estarán disponibles en siguientes sprints.
        </p>
      </div>
    </PanelLayout>
  )
}

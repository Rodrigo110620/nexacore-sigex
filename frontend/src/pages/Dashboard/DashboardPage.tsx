import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'

/**
 * /dashboard:
 * - ADMIN → gestión de usuarios
 * - CONTROL → panel de control de ingreso (/dashboard/inicio)
 * - DOCENTE → exámenes
 * - Sin rol → aviso (evita bucle con AdminRoute)
 */
export default function DashboardPage() {
  const { isAdmin, nombre, roles } = useAuth()

  if (isAdmin) {
    return <Navigate to="/dashboard/usuarios" replace />
  }
  if (roles.includes('CONTROL')) {
    return <Navigate to="/dashboard/inicio" replace />
  }
  if (roles.includes('DOCENTE')) {
    return <Navigate to="/dashboard/examenes" replace />
  }

  return (
    <PanelLayout>
      <div className="min-h-full p-4 pb-24 sm:p-8 lg:pb-8">
        <h1 className="mb-2 text-xl font-bold text-[#011140]">
          Bienvenido{nombre ? `, ${nombre}` : ''}
        </h1>
        <p className="text-sm text-gray-500">
          Tu cuenta aún no tiene un rol asignado. Contacta al administrador.
        </p>
      </div>
      <MobileBottomNav />
    </PanelLayout>
  )
}

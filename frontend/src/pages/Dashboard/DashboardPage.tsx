import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import { navItemsFor } from '../../components/navigation/navItems'

/**
 * /dashboard:
 * - ADMIN → pantalla unificada de exámenes
 * - CONTROL → resumen operativo; desde el menú entra a Control
 * - DOCENTE → inicio de gestión de grupos
 * - Sin rol → aviso (evita bucle con AdminRoute)
 */
export default function DashboardPage() {
  const { isAdmin, nombre, roles, permisos } = useAuth()

  if (isAdmin) {
    return <Navigate to="/dashboard/examenes" replace />
  }
  // CONTROL, DOCENTE o un rol extra con algún permiso del personal: a su inicio.
  if (navItemsFor(roles, permisos).length > 0) {
    return <Navigate to="/dashboard/inicio" replace />
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

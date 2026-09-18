import { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, GraduationCap, Users, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

interface PanelLayoutProps {
  children: ReactNode
}

const NAV_ITEMS = [
  {
    label: 'Inicio',
    icon: LayoutDashboard,
    to: '/dashboard/inicio',
    disabled: true,
  },
  {
    label: 'Examenes',
    icon: ClipboardList,
    to: '/dashboard/examenes',
    disabled: true,
  },
  {
    label: 'Estudiantes',
    icon: GraduationCap,
    to: '/dashboard/estudiantes',
    disabled: true,
  },
  {
    label: 'Usuarios',
    icon: Users,
    to: '/dashboard/usuarios',
    disabled: false,
  },
]

export default function PanelLayout({ children }: PanelLayoutProps) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen">

      {/* Sidebar */}
      <aside className="hidden w-52 flex-shrink-0 flex-col lg:flex"
        style={{ background: 'linear-gradient(180deg, #011140 0%, #0439D9 100%)' }}>

        {/* Logo */}
        <div className="flex items-center px-5 py-5 border-b border-white/10">
          <img src="/logo_app.png" alt="SIGEX" className="h-10 object-contain" />
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV_ITEMS.map(({ label, icon: Icon, to, disabled }) =>
            disabled ? (
              <div
                key={label}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/40 cursor-not-allowed select-none"
              >
                <Icon size={18} />
                <span className="text-sm font-medium">{label}</span>
              </div>
            ) : (
              <NavLink
                key={label}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                    isActive
                      ? 'bg-white/20 text-white font-bold'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            )
          )}
        </nav>

        {/* Cerrar sesión */}
        <div className="px-3 pb-5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="relative min-w-0 flex-1 overflow-auto bg-gray-50">
        {children}
      </main>

    </div>
  )
}

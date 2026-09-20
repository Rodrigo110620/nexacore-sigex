import { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutGrid, BookCheck, Users, UserPlus, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Footer from './Footer'
import PanelTopBar from './PanelTopBar'

interface PanelLayoutProps {
  children: ReactNode
  compactDesktop?: boolean
}

const NAV_ITEMS = [
  {
    label: 'Inicio',
    icon: LayoutGrid,
    to: '/dashboard/inicio',
    disabled: true,
  },
  {
    label: 'Examenes',
    icon: BookCheck,
    to: '/dashboard/examenes',
    disabled: true,
  },
  {
    label: 'Estudiantes',
    icon: Users,
    to: '/dashboard/estudiantes',
    disabled: true,
  },
  {
    label: 'Usuarios',
    icon: UserPlus,
    to: '/dashboard/usuarios',
    disabled: false,
  },
]

export default function PanelLayout({ children, compactDesktop = false }: PanelLayoutProps) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Sidebar fijo al alto del viewport; Cerrar sesión siempre visible */}
      <aside
        className={`hidden h-full shrink-0 flex-col xl:w-56 ${compactDesktop ? 'w-44 min-[960px]:flex lg:w-52' : 'w-52 lg:flex'}`}
        style={{ background: 'linear-gradient(180deg, #011140 0%, #0439D9 100%)' }}
      >
        <div className="flex shrink-0 items-center border-b border-white/10 px-5 py-5">
          <img src="/logo_app.png" alt="SIGEX" className="h-10 object-contain" />
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map(({ label, icon: Icon, to, disabled }) =>
            disabled ? (
              <div
                key={label}
                className="flex cursor-not-allowed select-none items-center gap-3 rounded-lg px-3 py-2.5 text-white/40"
              >
                <Icon size={18} className="shrink-0" />
                <span className="text-sm font-medium">{label}</span>
              </div>
            ) : (
              <NavLink
                key={label}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white/20 font-bold text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon size={18} className="shrink-0" />
                <span className="truncate">{label}</span>
              </NavLink>
            )
          )}
        </nav>

        <div className="shrink-0 border-t border-white/10 px-3 py-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <LogOut size={18} className="shrink-0" aria-hidden="true" />
            <span className="truncate">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-gray-50">
        <PanelTopBar compactDesktop={compactDesktop} />
        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
        <div className={`hidden shrink-0 ${compactDesktop ? 'min-[960px]:block' : 'lg:block'}`}>
          <Footer />
        </div>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ChevronDown, GraduationCap, House, LogOut, QrCode, UserRound, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Footer from '../layout/Footer'
import FotoEstudiante from './FotoEstudiante'
import EnVivoEstudiante from './EnVivoEstudiante'

const NAV = [
  { label: 'Inicio', to: '/estudiante', icon: House, end: true },
  { label: 'Mi QR', to: '/estudiante/qr', icon: QrCode, end: true },
]

interface Props {
  children: ReactNode
  /** Foto aprobada del estudiante para el encabezado, si ya se cargó su perfil. */
  fotoUrl?: string | null
}

/**
 * CTA-03: portal del estudiante con su navegación (Inicio y Mi QR). Como en el panel del personal,
 * "Mi perfil" y "Cerrar sesión" están en el menú de cuenta de la esquina superior derecha.
 */
export default function PortalEstudianteLayout({ children, fotoUrl }: Props) {
  const { nombre, logout } = useAuth()
  const navigate = useNavigate()
  const iniciales = (nombre ?? 'E').split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('')
  const [menuAbierto, setMenuAbierto] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuAbierto) return
    const fuera = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuAbierto(false)
    }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuAbierto(false) }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', escape)
    }
  }, [menuAbierto])

  const cerrarSesion = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <EnVivoEstudiante />
      <aside
        className="hidden h-full w-56 shrink-0 flex-col min-[960px]:flex"
        style={{ background: 'linear-gradient(180deg, #011140 0%, #0439D9 100%)' }}
      >
        <div className="flex min-h-20 shrink-0 items-center border-b border-white/10 px-6">
          <img src="/logo_app.png" alt="SIGEX" className="h-10 object-contain" />
        </div>
        <nav aria-label="Navegación del estudiante" className="flex flex-col gap-1 px-3 py-4">
          {NAV.map(({ label, to, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                  isActive
                    ? 'bg-white/15 text-white before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={18} className="shrink-0" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mx-3 rounded-xl border border-white/15 bg-white/5 p-3 text-white">
          <GraduationCap size={24} aria-hidden="true" />
          <p className="mt-2 text-xs font-semibold">Portal del estudiante</p>
          <p className="mt-0.5 text-[11px] leading-snug text-white/70">Consulta tus exámenes y presenta tu QR en el control de ingreso.</p>
        </div>
        <div className="mt-auto shrink-0 border-t border-white/10 px-3 py-4">
          <button
            type="button"
            onClick={cerrarSesion}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white"
          >
            <LogOut size={18} className="shrink-0" aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-gray-50">
        <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-[#E4E9F2] bg-white px-4 min-[960px]:min-h-20 min-[960px]:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/logo_app.png" alt="SIGEX" className="h-8 object-contain min-[960px]:hidden" />
            <p className="hidden truncate text-xs text-[#627A9B] min-[960px]:block">
              Universidad Mayor de San Simón · Portal del estudiante
            </p>
          </div>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuAbierto((v) => !v)}
              aria-expanded={menuAbierto}
              aria-haspopup="menu"
              aria-label={`Menú de cuenta: ${nombre ?? 'Estudiante'}`}
              className="inline-flex h-11 max-w-[18rem] items-center gap-2 rounded-xl border border-[#D8E3F5] bg-[#F8FAFC] px-2 text-left hover:bg-[#E9F1FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9]"
            >
              <FotoEstudiante
                fotoUrl={fotoUrl}
                nombre={nombre ?? 'Estudiante'}
                iniciales={iniciales}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0439D9] text-xs font-bold text-white"
              />
              <span className="hidden min-w-0 flex-1 sm:block">
                <span className="block truncate text-sm font-semibold leading-tight text-[#011140]">{nombre}</span>
                <span className="block truncate text-[11px] leading-tight text-[#627A9B]">Estudiante</span>
              </span>
              <ChevronDown
                size={16}
                aria-hidden="true"
                className={`shrink-0 text-[#627A9B] transition-transform ${menuAbierto ? 'rotate-180' : ''}`}
              />
            </button>
            {menuAbierto && (
              <div
                role="menu"
                className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(16rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-[#D8E3F5] bg-white py-1 shadow-lg shadow-[#011140]/12"
              >
                <div className="flex items-start justify-between gap-2 border-b border-[#EDF1F7] px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#011140]">{nombre}</p>
                    <p className="truncate text-xs text-[#627A9B]">Estudiante</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Cerrar menú"
                    onClick={() => setMenuAbierto(false)}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#627A9B] hover:bg-[#F1F6FF] hover:text-[#011140]"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
                <Link
                  role="menuitem"
                  to="/estudiante/perfil"
                  onClick={() => setMenuAbierto(false)}
                  className="flex min-h-11 w-full items-center gap-2.5 px-3 text-sm font-medium text-[#011140] hover:bg-[#F1F6FF]"
                >
                  <UserRound size={16} aria-hidden="true" className="shrink-0 text-[#0439D9]" />
                  Mi perfil
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={cerrarSesion}
                  className="flex min-h-11 w-full items-center gap-2.5 px-3 text-left text-sm font-medium text-[#B91C1C] hover:bg-[#FEF2F2]"
                >
                  <LogOut size={16} aria-hidden="true" className="shrink-0" />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))] min-[960px]:pb-0">
          {children}
        </main>
        <div className="hidden shrink-0 min-[960px]:block">
          <Footer />
        </div>
      </div>

      <nav
        aria-label="Navegación del estudiante móvil"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-2 border-t border-[#D8E3F5] bg-white pb-[env(safe-area-inset-bottom)] min-[960px]:hidden"
      >
        {NAV.map(({ label, to, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${
                isActive ? 'text-[#0439D9]' : 'text-[#627A9B]'
              }`
            }
          >
            <Icon size={20} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

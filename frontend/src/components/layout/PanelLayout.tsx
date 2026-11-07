import { ReactNode, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { navItemsFor } from '../navigation/navItems'
import Footer from './Footer'
import PanelTopBar from './PanelTopBar'

interface PanelLayoutProps {
  children: ReactNode
  compactDesktop?: boolean
  title?: string
  description?: string
  locationLabel?: string
  topBarVariant?: 'default' | 'control' | 'controlMinimal' | 'docenteInicio'
}

const CLAVE_MENU = 'sigex.menuContraido'

export default function PanelLayout({
  children,
  compactDesktop = false,
  title,
  description,
  locationLabel,
  topBarVariant = 'default',
}: PanelLayoutProps) {
  const { logout, roles, permisos } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const navItems = navItemsFor(roles, permisos)
  // Menú contraído: solo íconos. Se recuerda por navegador (si no hay almacenamiento, expandido).
  const [contraido, setContraido] = useState(() => { try { return localStorage.getItem(CLAVE_MENU) === '1' } catch { return false } })
  const alternar = () => setContraido((c) => {
    try { localStorage.setItem(CLAVE_MENU, c ? '0' : '1') } catch { /* sin almacenamiento */ }
    return !c
  })
  const item = `relative flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium ${contraido ? 'justify-center px-0' : 'px-3'}`

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Sidebar fijo al alto del viewport; Cerrar sesión siempre visible */}
      <aside
        aria-label="Menú principal"
        className={`hidden h-full shrink-0 flex-col transition-[width] duration-200 ${compactDesktop ? 'min-[960px]:flex' : 'lg:flex'} ${
          contraido ? 'w-[72px]' : `xl:w-56 ${compactDesktop ? 'w-44 lg:w-52' : 'w-52'}`}`}
        style={{ background: 'linear-gradient(180deg, #011140 0%, #0439D9 100%)' }}
      >
        {/* min-h-20 = alto del PanelTopBar: ambos bordes inferiores quedan en la misma línea */}
        <div className={`flex min-h-20 shrink-0 items-center border-b border-white/10 ${contraido ? 'justify-center px-2' : 'px-6'}`}>
          {contraido
            ? <img src="/favicon.png" alt="SIGEX" className="h-9 w-9 object-contain" />
            : <img src="/logo_app.png" alt="SIGEX" className="h-10 object-contain" />}
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          {navItems.map(({ label, icon: Icon, to, disabled }) =>
            disabled ? (
              <div
                key={label}
                aria-disabled="true"
                title={contraido ? label : undefined}
                className={`${item} cursor-not-allowed select-none text-white/40`}
              >
                <Icon size={18} className="shrink-0" aria-hidden="true" />
                <span className={contraido ? 'sr-only' : ''}>{label}</span>
              </div>
            ) : (
              <NavLink
                key={label}
                to={to}
                title={contraido ? label : undefined}
                className={({ isActive }) =>
                  `${item} transition-[background-color,color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                    isActive
                      ? 'bg-white/15 text-white before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon size={18} className="shrink-0" aria-hidden="true" />
                <span className={contraido ? 'sr-only' : 'truncate'}>{label}</span>
              </NavLink>
            )
          )}
        </nav>

        <div className="flex shrink-0 flex-col gap-1 border-t border-white/10 px-3 py-4">
          <button
            type="button"
            onClick={alternar}
            aria-expanded={!contraido}
            title={contraido ? 'Expandir menú' : undefined}
            className={`flex min-h-11 w-full items-center gap-3 rounded-lg text-left text-sm font-medium text-white/80 transition-[background-color,color] duration-150 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${contraido ? 'justify-center' : 'px-3'}`}
          >
            {contraido ? <PanelLeftOpen size={18} className="shrink-0" aria-hidden="true" /> : <PanelLeftClose size={18} className="shrink-0" aria-hidden="true" />}
            <span className={contraido ? 'sr-only' : 'truncate'}>{contraido ? 'Expandir menú' : 'Contraer menú'}</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            title={contraido ? 'Cerrar sesión' : undefined}
            className={`flex min-h-11 w-full items-center gap-3 rounded-lg text-left ${contraido ? 'justify-center' : 'px-3'} text-sm font-medium text-white/80 transition-[background-color,color,transform] duration-150 hover:bg-white/10 active:scale-[0.98] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50`}
          >
            <LogOut size={18} className="shrink-0" aria-hidden="true" />
            <span className={contraido ? 'sr-only' : 'truncate'}>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-gray-50">
        <PanelTopBar compactDesktop={compactDesktop} title={title} description={description} locationLabel={locationLabel} variant={topBarVariant} />
        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
        <div className={`hidden shrink-0 ${compactDesktop ? 'min-[960px]:block' : 'lg:block'}`}>
          <Footer />
        </div>
      </div>
    </div>
  )
}

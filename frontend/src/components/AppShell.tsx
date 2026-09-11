import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useClock } from '../hooks/useClock'
import { useCoreStatus } from '../hooks/useCoreStatus'
import { NexaLogo, PlasmaBackground } from './PlasmaChrome'

const links = [
  { to: '/', label: 'Escritorio' },
  { to: '/scanner', label: 'Escáner QR' },
  { to: '/reportes', label: 'Reportes' },
]

export function AppShell() {
  const { user, logout } = useAuth()
  const { time, date } = useClock()
  const coreStatus = useCoreStatus()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const statusLabel =
    coreStatus === 'online' ? 'Núcleo en línea' : coreStatus === 'local' ? 'Modo local' : 'Sincronizando'

  return (
    <div className="relative min-h-screen text-white">
      <PlasmaBackground />
      <header className="sticky top-0 z-30 border-b border-accent/20 bg-plasma-panel/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            className="plasma-btn-ghost px-3 py-2 md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Abrir menú"
          >
            Menú
          </button>
          <div className="flex items-center gap-3">
            <NexaLogo />
            <div>
              <p className="font-display text-sm font-semibold tracking-wide">NexaCore SIGEX</p>
              <p className="text-[11px] uppercase tracking-[0.22em] text-plasma-mist">Tema KD Plasma</p>
            </div>
          </div>
          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm transition ${
                    isActive ? 'bg-accent/20 text-white' : 'text-plasma-mist hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="font-display text-lg leading-none tabular-nums">{time}</p>
              <p className="text-[11px] uppercase tracking-wider text-plasma-mist">{date}</p>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-accent/25 bg-white/5 px-3 py-1 text-xs text-plasma-mist lg:flex">
              <span
                className={`h-2 w-2 rounded-full ${
                  coreStatus === 'online' ? 'bg-emerald-400' : coreStatus === 'local' ? 'bg-amber-300' : 'bg-accent'
                }`}
              />
              {statusLabel}
            </div>
            <div className="hidden text-right md:block">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-[11px] text-plasma-mist">{user?.role}</p>
            </div>
            <button
              type="button"
              className="plasma-btn-ghost px-3 py-2"
              onClick={() => {
                logout()
                navigate('/login')
              }}
            >
              Salir
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="grid gap-1 border-t border-accent/20 px-4 py-3 md:hidden">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-accent/20 text-white' : 'text-plasma-mist'}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

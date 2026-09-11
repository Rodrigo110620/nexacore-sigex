import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { usePlasma } from '../context/PlasmaContext'
import {
  IconApps,
  IconBell,
  IconChart,
  IconDesktop,
  IconNexa,
  IconPalette,
  IconPower,
  IconQr,
  IconSearch,
  IconWifi,
} from './PlasmaIcons'
import { useClock } from '../hooks/useClock'

const APPS = [
  { to: '/', label: 'Escritorio', hint: 'Widgets SIGEX', icon: IconDesktop },
  { to: '/scanner', label: 'Escáner QR', hint: 'Control de ingreso', icon: IconQr },
  { to: '/reportes', label: 'Reportes', hint: 'Asistencia y aulas', icon: IconChart },
  { to: '/apariencia', label: 'Apariencia', hint: 'Look and Feel', icon: IconPalette },
]

export default function PlasmaPanel() {
  const { user, logout } = usePlasma()
  const { time, dateShort } = useClock()
  const [kickoffOpen, setKickoffOpen] = useState(false)
  const [query, setQuery] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const apps = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return APPS
    return APPS.filter((app) => app.label.toLowerCase().includes(q) || app.hint.toLowerCase().includes(q))
  }, [query])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setKickoffOpen(false)
    }
    const onClick = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setKickoffOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [])

  return (
    <div ref={panelRef} className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center p-3">
      {kickoffOpen && (
        <div className="glass-panel pointer-events-auto absolute bottom-[72px] left-1/2 w-[min(420px,92vw)] -translate-x-1/2 rounded-[18px] p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-[var(--plasma-card)] px-3 py-2">
            <IconSearch className="h-4 w-4 text-[var(--plasma-muted)]" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar aplicaciones..."
              className="focus-ring w-full bg-transparent text-sm outline-none placeholder:text-[var(--plasma-muted)]"
            />
          </div>
          <p className="mb-2 px-1 text-[11px] uppercase tracking-wide text-[var(--plasma-muted)]">Favoritos</p>
          <div className="grid grid-cols-2 gap-2">
            {apps.map((app) => (
              <button
                key={app.to}
                type="button"
                className="focus-ring flex items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-[var(--plasma-card-hover)]"
                onClick={() => {
                  navigate(app.to)
                  setKickoffOpen(false)
                  setQuery('')
                }}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--plasma-accent-soft)] text-[var(--plasma-accent)]">
                  <app.icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-medium">{app.label}</span>
                  <span className="block text-xs text-[var(--plasma-muted)]">{app.hint}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-[var(--plasma-border)] pt-3">
            <div className="flex items-center gap-2 px-1">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--plasma-accent)] text-sm font-semibold text-white">
                {user?.nombre.charAt(0)}
              </span>
              <div>
                <p className="text-sm font-medium leading-tight">{user?.nombre}</p>
                <p className="text-xs text-[var(--plasma-muted)]">{user?.email}</p>
              </div>
            </div>
            <button
              type="button"
              className="focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--plasma-negative)] hover:bg-[var(--plasma-card)]"
              onClick={logout}
            >
              <IconPower className="h-4 w-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      <nav className="glass-panel pointer-events-auto flex h-[52px] w-[min(920px,96vw)] items-center gap-2 rounded-2xl px-2">
        <button
          type="button"
          className={`focus-ring flex h-10 w-10 items-center justify-center rounded-xl ${
            kickoffOpen ? 'bg-[var(--plasma-accent-soft)]' : 'hover:bg-[var(--plasma-card)]'
          }`}
          aria-label="Menú de aplicaciones"
          aria-expanded={kickoffOpen}
          onClick={() => setKickoffOpen((open) => !open)}
        >
          <IconApps className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-1">
          {APPS.map((app) => (
            <NavLink
              key={app.to}
              to={app.to}
              end={app.to === '/'}
              title={app.label}
              className={({ isActive }) =>
                `focus-ring flex h-10 w-10 items-center justify-center rounded-xl ${
                  isActive
                    ? 'bg-[var(--plasma-accent-soft)] text-[var(--plasma-accent)]'
                    : 'text-[var(--plasma-text)] hover:bg-[var(--plasma-card)]'
                }`
              }
            >
              <app.icon className="h-5 w-5" />
            </NavLink>
          ))}
        </div>

        <div className="mx-2 hidden h-6 w-px bg-[var(--plasma-border)] sm:block" />
        <div className="hidden items-center gap-2 text-sm text-[var(--plasma-muted)] sm:flex">
          <IconNexa className="h-5 w-5" />
          <span>NexaCore Plasma</span>
        </div>

        <div className="ml-auto flex items-center gap-1 text-[var(--plasma-muted)]">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg">
            <IconWifi className="h-4 w-4" />
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg">
            <IconBell className="h-4 w-4" />
          </span>
          <div className="px-2 text-right leading-tight">
            <p className="text-sm font-semibold text-[var(--plasma-text)]">{time}</p>
            <p className="text-[11px] capitalize text-[var(--plasma-muted)]">{dateShort}</p>
          </div>
        </div>
      </nav>
    </div>
  )
}

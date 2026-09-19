import { useEffect, useRef, useState } from 'react'
import { Bell, ChevronDown, LogOut, UserRound, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function getInitials(nombre: string | null): string {
  if (!nombre?.trim()) return 'U'
  const parts = nombre.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
}

export default function PanelTopBar() {
  const { nombre, roles, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const handleLogout = () => {
    setOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  const displayName = nombre?.trim() || 'Usuario'
  const roleLabel = roles.length > 0 ? roles.join(', ') : 'Sin rol'

  return (
    <>
    <header className="sticky top-0 z-30 flex  w-full shrink-0 items-center border-b border-[#D8E3F5] bg-white/95 p-2 backdrop-blur sm:h-20 sm:px-5 lg:px-6  lg:py-6">
      <div className="min-w-0 flex-1">
        <div className="lg:hidden">
          <img src="/logo_app.png" alt="SIGEX" className="h-8 w-auto max-w-[9rem] object-contain object-left" />
        </div>
        <div className="hidden min-w-0 lg:block">
          <p className="truncate text-lg font-bold text-[#011140]">GESTIÓN DE USUARIOS</p>
          <p className="truncate text-sm text-[#627A9B]">Administra y audita las cuentas del sistema, asignación de roles y estados de acceso.</p>
        </div>
      </div>

      <div className="relative flex shrink-0 items-center gap-2" ref={menuRef}>
        <button
          type="button"
          disabled
          aria-label="Notificaciones, no disponible"
          className="inline-flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-lg bg-[#F1F6FF] text-[#627A9B] sm:hidden"
        >
          <Bell size={17} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={`Menú de cuenta: ${displayName}`}
          className="inline-flex h-9 max-w-[12rem] items-center gap-2 rounded-full border border-[#D8E3F5] bg-[#F1F6FF] px-3 text-xs font-bold text-[#0439D9] transition-colors hover:bg-[#E9F1FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] sm:h-11 sm:max-w-[16rem] sm:rounded-xl sm:bg-[#F8FAFC] sm:px-2.5 md:max-w-[18rem]"
        >
          <span
            aria-hidden="true"
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0439D9] text-[11px] font-bold text-white sm:inline-flex sm:h-8 sm:w-8 sm:text-xs"
          >
            {getInitials(nombre)}
          </span>
          <span className="max-w-16 truncate sm:hidden">{roles.includes('ADMIN') ? 'ADMIN' : roleLabel}</span>
          <span className="hidden min-w-0 flex-1 text-left sm:block">
            <span className="block truncate text-sm font-semibold leading-tight text-[#011140]">{displayName}</span>
            <span className="block truncate text-[11px] leading-tight text-[#627A9B]">{roleLabel}</span>
          </span>
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={`hidden shrink-0 text-[#627A9B] transition-transform sm:block ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(16rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-[#D8E3F5] bg-white py-1 shadow-lg shadow-[#011140]/12"
          >
            <div className="flex items-start justify-between gap-2 border-b border-[#EDF1F7] px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#011140]">{displayName}</p>
                <p className="truncate text-xs text-[#627A9B]">{roleLabel}</p>
              </div>
              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#627A9B] transition-colors hover:bg-[#F1F6FF] hover:text-[#011140] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9]"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <Link
              role="menuitem"
              to="/dashboard/perfil"
              onClick={() => setOpen(false)}
              className="flex min-h-11 w-full items-center gap-2.5 px-3 text-sm font-medium text-[#011140] hover:bg-[#F1F6FF] focus-visible:bg-[#F1F6FF] focus-visible:outline-none"
            >
              <UserRound size={16} aria-hidden="true" className="shrink-0 text-[#0439D9]" />
              <span className="truncate">Mi perfil</span>
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex min-h-11 w-full items-center gap-2.5 px-3 text-left text-sm font-medium text-[#B91C1C] hover:bg-[#FEF2F2] focus-visible:bg-[#FEF2F2] focus-visible:outline-none"
            >
              <LogOut size={16} aria-hidden="true" className="shrink-0" />
              <span className="truncate">Cerrar sesión</span>
            </button>
          </div>
        )}
      </div>
    </header>
    <div className="border-b border-[#EDF1F7] bg-white px-4 py-3 lg:hidden">
      <p className="text-base font-bold text-[#011140]">GESTIÓN DE USUARIOS</p>
      <p className="mt-0.5 text-[11px] leading-snug text-[#627A9B]">Administra y audita las cuentas del sistema, asignación de roles y estados de acceso.</p>
    </div>
  </>

  )
}

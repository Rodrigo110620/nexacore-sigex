import { FileText, GraduationCap, House, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const unavailableItems = [
  { label: 'Inicio', icon: House },
  { label: 'Exámenes', icon: FileText },
  { label: 'Estudiantes', icon: GraduationCap },
]

export default function MobileBottomNav() {
  return (
    <nav
      aria-label="Navegación principal móvil"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#B8CBEF] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-3px_10px_rgba(1,17,64,0.12)] lg:hidden"
    >
      <ul className="mx-auto grid min-h-14 max-w-lg grid-cols-4">
        {unavailableItems.map(({ label, icon: Icon }) => (
          <li key={label} className="flex min-w-0">
            <button
              type="button"
              disabled
              aria-label={`${label}, no disponible`}
              className="flex min-h-14 w-full cursor-not-allowed flex-col items-center justify-center gap-0.5 px-0.5 text-[9px] font-semibold leading-tight text-gray-400 min-[360px]:text-[10px] sm:text-xs"
            >
              <Icon size={18} className="sm:h-5 sm:w-5" aria-hidden="true" />
              <span className="max-w-full truncate">{label}</span>
            </button>
          </li>
        ))}

        <li className="flex min-w-0">
          <NavLink
            to="/dashboard/usuarios"
            className={({ isActive }) =>
              `flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-0.5 text-[9px] font-bold leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0439D9] min-[360px]:text-[10px] sm:text-xs ${
                isActive
                  ? 'border-t-2 border-[#0439D9] text-[#0439D9]'
                  : 'text-[#627A9B]'
              }`
            }
          >
            <Users size={18} className="sm:h-5 sm:w-5" aria-hidden="true" />
            <span className="max-w-full truncate">Usuarios</span>
          </NavLink>
        </li>
      </ul>
    </nav>
  )
}

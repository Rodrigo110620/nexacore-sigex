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
      <ul className="mx-auto grid min-h-16 max-w-lg grid-cols-4">
        {unavailableItems.map(({ label, icon: Icon }) => (
          <li key={label} className="flex">
            <button
              type="button"
              disabled
              aria-label={`${label}, no disponible`}
              className="flex min-h-16 w-full cursor-not-allowed flex-col items-center justify-center gap-1 px-1 text-xs font-semibold text-gray-400"
            >
              <Icon size={21} aria-hidden="true" />
              {label}
            </button>
          </li>
        ))}

        <li className="flex">
          <NavLink
            to="/dashboard"
            aria-current="page"
            className="flex min-h-16 w-full flex-col items-center justify-center gap-1 border-t-2 border-[#0439D9] px-1 text-xs font-bold text-[#0439D9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0439D9]"
          >
            <Users size={21} aria-hidden="true" />
            Usuarios
          </NavLink>
        </li>
      </ul>
    </nav>
  )
}

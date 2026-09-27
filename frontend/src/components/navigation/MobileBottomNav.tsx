import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { navItemsFor } from './navItems'

const GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
}

export default function MobileBottomNav() {
  const { roles } = useAuth()
  const items = navItemsFor(roles)

  return (
    <nav
      aria-label="Navegación principal móvil"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#B8CBEF] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-3px_10px_rgba(1,17,64,0.12)] min-[960px]:hidden"
    >
      <ul className={`mx-auto grid min-h-14 max-w-lg ${GRID_COLS[items.length] ?? 'grid-cols-4'}`}>
        {items.map(({ label, to, icon: Icon, disabled }) => (
          <li key={label} className="flex min-w-0">
            {disabled ? (
              <button
                type="button"
                disabled
                aria-label={`${label}, no disponible`}
                className="flex min-h-14 w-full cursor-not-allowed flex-col items-center justify-center gap-0.5 px-0.5 text-[9px] font-semibold leading-tight text-gray-400 min-[360px]:text-[10px] sm:text-xs"
              >
                <Icon size={18} className="sm:h-5 sm:w-5" aria-hidden="true" />
                <span className="max-w-full truncate">{label}</span>
              </button>
            ) : (
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-0.5 text-[9px] font-bold leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0439D9] min-[360px]:text-[10px] sm:text-xs ${
                    isActive
                      ? 'border-t-2 border-[#0439D9] text-[#0439D9]'
                      : 'text-[#627A9B]'
                  }`
                }
              >
                <Icon size={18} className="sm:h-5 sm:w-5" aria-hidden="true" />
                <span className="max-w-full truncate">{label}</span>
              </NavLink>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}

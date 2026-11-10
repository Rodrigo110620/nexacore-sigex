import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import type { NavItem } from './navItems'

/**
 * Ítem del menú lateral con subopciones (p. ej. Configuración → Roles y permisos, Respaldo, Historial de operaciones).
 * Expandido: se despliega debajo con animación y se abre solo cuando estás en una de sus secciones. Contraído (solo
 * íconos): al pulsar el ícono el menú lateral se despliega un momento sobre el contenido con este grupo abierto y sus
 * nombres; al elegir una opción (o al hacer clic fuera) vuelve a contraerse.
 */
export default function GrupoMenu({ item, contraido, clase, onAsomar, abiertoForzado = false, alElegir }: {
  item: NavItem & { hijos: NonNullable<NavItem['hijos']> }
  contraido: boolean
  clase: string
  /** Contraído: pide al menú lateral desplegarse un momento sobre el contenido con este grupo abierto. */
  onAsomar?: () => void
  /** Desplegado un momento (desde contraído): el grupo aparece abierto. */
  abiertoForzado?: boolean
  /** Al elegir una subopción (p. ej. para volver a contraer el menú lateral). */
  alElegir?: () => void
}) {
  const { pathname, hash } = useLocation()
  const ruta = item.to.split('#')[0]
  const dentro = pathname.startsWith(ruta)
  const [abiertoManual, setAbiertoManual] = useState<boolean | null>(null)
  const abierto = abiertoForzado || (abiertoManual ?? dentro)
  const lista = useRef<HTMLUListElement>(null)
  const Icon = item.icon

  // Subopción activa: la de la misma ruta y el mismo #.
  const activa = (to: string) => {
    const [r, h = ''] = to.split('#')
    return pathname === r && (hash || '') === (h ? `#${h}` : '')
  }
  const actual = item.hijos.find((h) => activa(h.to))

  // La lista plegada no se puede enfocar (inert).
  useEffect(() => {
    lista.current?.toggleAttribute('inert', !abierto)
  }, [abierto, contraido])

  const cabecera = `${clase} w-full transition-[background-color,color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
    dentro ? 'bg-white/15 text-white before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`

  if (contraido) {
    return (
      <button type="button" onClick={onAsomar} aria-haspopup="true" aria-expanded={false}
        aria-label={actual ? `${item.label}: ${actual.titulo ?? actual.label}` : item.label} title={item.label} className={cabecera}>
        <Icon size={18} className="shrink-0" aria-hidden="true" />
      </button>
    )
  }

  return (
    <div>
      <button type="button" onClick={() => (abiertoForzado ? alElegir?.() : setAbiertoManual(!abierto))} aria-expanded={abierto} className={cabecera}>
        <Icon size={18} className="shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
        <ChevronDown size={16} aria-hidden="true" className={`shrink-0 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} />
      </button>
      {/* Se despliega con animación de alto (0fr → 1fr). */}
      <div className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${abierto ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <ul ref={lista} className="ml-[1.15rem] min-h-0 space-y-0.5 overflow-hidden border-l border-white/15 pl-2">
          {item.hijos.map((h, i) => (
            <li key={h.to} className={i === 0 ? 'pt-1' : ''}>
              <Link to={h.to} onClick={alElegir} aria-current={activa(h.to) ? 'page' : undefined} title={h.titulo}
                className={`flex min-h-9 items-center gap-2 rounded-md px-2.5 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                  activa(h.to) ? 'bg-white/15 font-semibold text-white' : 'text-white/65 hover:bg-white/10 hover:text-white'}`}>
                <h.icon size={15} className="shrink-0" aria-hidden="true" />
                <span className="truncate">{h.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

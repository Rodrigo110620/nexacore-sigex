import { useEffect, useRef, useState, type KeyboardEvent as KeyboardEventReact } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import type { NavItem } from './navItems'

/** Espera antes de abrir/cerrar el menú flotante al pasar el mouse: evita que parpadee al cruzar el menú. */
const ESPERA_HOVER_MS = 150

/**
 * Ítem del menú lateral con subopciones (p. ej. Configuración → Roles y permisos, Respaldo, Historial de operaciones).
 * Expandido: se despliega debajo con animación y se abre solo cuando estás en una de sus secciones. Contraído (solo
 * íconos): las subopciones salen en un menú flotante al pasar el mouse o al pulsar, y se recorren con el teclado.
 */
export default function GrupoMenu({ item, contraido, clase }: { item: NavItem & { hijos: NonNullable<NavItem['hijos']> }; contraido: boolean; clase: string }) {
  const { pathname, hash } = useLocation()
  const ruta = item.to.split('#')[0]
  const dentro = pathname.startsWith(ruta)
  const [abiertoManual, setAbiertoManual] = useState<boolean | null>(null)
  const abierto = abiertoManual ?? dentro
  // Contraído: el menú flotante va en posición fija junto al ícono (el contenedor del menú lo recortaría).
  const [flotante, setFlotante] = useState<{ top: number; left: number } | null>(null)
  const grupo = useRef<HTMLDivElement>(null)
  const boton = useRef<HTMLButtonElement>(null)
  const flotanteRef = useRef<HTMLDivElement>(null)
  const lista = useRef<HTMLUListElement>(null)
  const temporizador = useRef<ReturnType<typeof setTimeout>>()
  // Abierto con el teclado o con clic: al abrir, el foco va a la primera opción (con el mouse, no).
  const enfocarAlAbrir = useRef(false)
  const Icon = item.icon

  // Subopción activa: la de la misma ruta y el mismo #.
  const activa = (to: string) => {
    const [r, h = ''] = to.split('#')
    return pathname === r && (hash || '') === (h ? `#${h}` : '')
  }
  const actual = item.hijos.find((h) => activa(h.to))

  // La lista expandida no se puede enfocar mientras está plegada (inert).
  useEffect(() => {
    lista.current?.toggleAttribute('inert', !abierto)
  }, [abierto, contraido])

  const abrir = (conFoco: boolean) => {
    clearTimeout(temporizador.current)
    const r = boton.current?.getBoundingClientRect()
    if (!r) return
    enfocarAlAbrir.current = conFoco
    setFlotante({ top: r.top, left: r.right + 8 })
  }
  const cerrar = (devolverFoco = false) => {
    clearTimeout(temporizador.current)
    setFlotante(null)
    if (devolverFoco) boton.current?.focus()
  }
  const alEntrar = () => { clearTimeout(temporizador.current); temporizador.current = setTimeout(() => abrir(false), ESPERA_HOVER_MS) }
  const alSalir = () => { clearTimeout(temporizador.current); temporizador.current = setTimeout(() => setFlotante(null), ESPERA_HOVER_MS * 2) }

  useEffect(() => () => clearTimeout(temporizador.current), [])

  useEffect(() => {
    if (!flotante) return
    if (enfocarAlAbrir.current) flotanteRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    const fuera = (e: MouseEvent) => { if (!grupo.current?.contains(e.target as Node)) setFlotante(null) }
    // Al cambiar el tamaño de la ventana la posición fija quedaría desubicada: se cierra.
    const alRedimensionar = () => setFlotante(null)
    document.addEventListener('mousedown', fuera)
    window.addEventListener('resize', alRedimensionar)
    return () => {
      document.removeEventListener('mousedown', fuera)
      window.removeEventListener('resize', alRedimensionar)
    }
  }, [flotante])

  /** Flechas, Inicio y Fin recorren las opciones; Escape y Tab cierran (Escape devuelve el foco al ícono). */
  const teclasMenu = (e: KeyboardEventReact<HTMLDivElement>) => {
    const opciones = Array.from(flotanteRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
    const i = opciones.indexOf(document.activeElement as HTMLElement)
    const ir = (n: number) => { e.preventDefault(); opciones[(n + opciones.length) % opciones.length]?.focus() }
    if (e.key === 'ArrowDown') ir(i + 1)
    else if (e.key === 'ArrowUp') ir(i - 1)
    else if (e.key === 'Home') ir(0)
    else if (e.key === 'End') ir(opciones.length - 1)
    else if (e.key === 'Escape') { e.preventDefault(); cerrar(true) }
    else if (e.key === 'Tab') cerrar()
  }

  const cabecera = `${clase} w-full transition-[background-color,color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
    dentro ? 'bg-white/15 text-white before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`

  if (contraido) {
    return (
      <div ref={grupo} className="relative" onMouseEnter={alEntrar} onMouseLeave={alSalir}>
        <button ref={boton} type="button" aria-expanded={flotante !== null} aria-haspopup="menu"
          aria-label={actual ? `${item.label}: ${actual.titulo ?? actual.label}` : item.label} title={item.label} className={cabecera}
          onClick={() => (flotante ? cerrar() : abrir(true))}
          onKeyDown={(e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); abrir(true) } }}>
          <Icon size={18} className="shrink-0" aria-hidden="true" />
        </button>
        {flotante && (
          <div ref={flotanteRef} role="menu" aria-label={item.label} onKeyDown={teclasMenu} style={{ top: flotante.top, left: flotante.left }}
            className="fixed z-50 w-60 origin-left animate-[menuEntra_120ms_ease-out] overflow-hidden rounded-xl border border-[#D8E3F5] bg-white py-1 shadow-xl">
            {/* Puente invisible: el mouse cruza del ícono al menú sin que se cierre. */}
            <span aria-hidden="true" className="absolute -left-2 top-0 h-full w-2" />
            <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-[#8BA0BF]">{item.label}</p>
            {item.hijos.map((h) => (
              <Link key={h.to} role="menuitem" to={h.to} onClick={() => cerrar()} aria-current={activa(h.to) ? 'page' : undefined}
                className={`flex min-h-10 items-center gap-2.5 px-3 text-sm outline-none focus-visible:bg-[#F1F6FF] ${activa(h.to) ? 'bg-[#EDF3FF] font-semibold text-[#0439D9]' : 'text-[#011140] hover:bg-[#F1F6FF]'}`}>
                <h.icon size={16} className="shrink-0 text-[#0439D9]" aria-hidden="true" />
                <span className="min-w-0 flex-1">{h.titulo ?? h.label}</span>
                {activa(h.to) && <span className="size-1.5 shrink-0 rounded-full bg-[#0439D9]" aria-hidden="true" />}
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <button type="button" onClick={() => setAbiertoManual(!abierto)} aria-expanded={abierto} className={cabecera}>
        <Icon size={18} className="shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
        <ChevronDown size={16} aria-hidden="true" className={`shrink-0 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} />
      </button>
      {/* Se despliega con animación de alto (0fr → 1fr). */}
      <div className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${abierto ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <ul ref={lista} className="ml-[1.15rem] min-h-0 space-y-0.5 overflow-hidden border-l border-white/15 pl-2">
          {item.hijos.map((h, i) => (
            <li key={h.to} className={i === 0 ? 'pt-1' : ''}>
              <Link to={h.to} aria-current={activa(h.to) ? 'page' : undefined} title={h.titulo}
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

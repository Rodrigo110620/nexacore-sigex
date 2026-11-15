import { ReactNode, useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { navItemsFor } from '../navigation/navItems'
import GrupoMenu from '../navigation/GrupoMenu'
import Footer from './Footer'
import PanelTopBar from './PanelTopBar'
import useEnVivo from '../../hooks/useEnVivo'
import { contarPendientesAyuda } from '../../services/mesaAyudaService'

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
  // BUG-A03: en el panel solo se desplaza el contenido (main); la página entera no, aunque algo (un aviso, un menú o
  // una gráfica) la estire: así nunca aparece una zona en blanco debajo del marco de SIGEX.
  useEffect(() => {
    const html = document.documentElement
    const antes = html.style.overflow
    html.style.overflow = 'hidden'
    return () => { html.style.overflow = antes }
  }, [])
  // Consultas pendientes de la mesa de ayuda (solo si el menú la muestra): se actualiza en vivo.
  const conAyuda = navItems.some((i) => i.contador === 'ayuda')
  const [pendientesAyuda, setPendientesAyuda] = useState(0)
  const [recargaAyuda, setRecargaAyuda] = useState(0)
  useEffect(() => {
    if (!conAyuda) return
    let vigente = true
    contarPendientesAyuda().then((n) => { if (vigente) setPendientesAyuda(n) }).catch(() => {})
    return () => { vigente = false }
  }, [conAyuda, recargaAyuda])
  useEnVivo((c) => conAyuda && c.tipo === 'AYUDA', () => setRecargaAyuda((n) => n + 1))
  // Menú contraído: solo íconos. Se recuerda por navegador (si no hay almacenamiento, expandido).
  const [contraido, setContraido] = useState(() => { try { return localStorage.getItem(CLAVE_MENU) === '1' } catch { return false } })
  const alternar = () => setContraido((c) => {
    try { localStorage.setItem(CLAVE_MENU, c ? '0' : '1') } catch { /* sin almacenamiento */ }
    return !c
  })
  // Contraído, un grupo (p. ej. Configuración) despliega el menú un momento sobre el contenido, con sus nombres.
  const [asomado, setAsomado] = useState<string | null>(null)
  const soloIconos = contraido && asomado === null
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (asomado === null) return
    const fuera = (e: MouseEvent) => { if (!panel.current?.contains(e.target as Node)) setAsomado(null) }
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAsomado(null) }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', tecla)
    // El foco pasa al grupo desplegado, a su primera opción.
    panel.current?.querySelector<HTMLElement>('[data-asomado] a')?.focus()
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', tecla) }
  }, [asomado])
  const item = `relative flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium ${soloIconos ? 'justify-center px-0' : 'px-3'}`

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Sidebar fijo al alto del viewport; Cerrar sesión siempre visible */}
      <aside
        aria-label="Menú principal"
        className={`relative z-40 hidden h-full shrink-0 transition-[width] duration-200 ${compactDesktop ? 'min-[960px]:flex' : 'lg:flex'} ${
          contraido ? 'w-[72px]' : `xl:w-56 ${compactDesktop ? 'w-44 lg:w-52' : 'w-52'}`}`}
      >
        <div ref={panel}
          className={`flex h-full flex-col ${asomado !== null ? 'absolute inset-y-0 left-0 w-56 animate-[menuAsoma_160ms_ease-out] shadow-[8px_0_32px_-8px_rgba(1,17,64,0.45)]' : 'w-full'}`}
          style={{ background: 'linear-gradient(180deg, #011140 0%, #0439D9 100%)' }}>
        {/* min-h-20 = alto del PanelTopBar: ambos bordes inferiores quedan en la misma línea */}
        {/* El logo de la app contrae y expande el menú */}
        <button
          type="button"
          onClick={() => { setAsomado(null); alternar() }}
          aria-expanded={!contraido}
          aria-label={contraido ? 'Expandir menú' : 'Contraer menú'}
          title={contraido ? 'Expandir menú' : 'Contraer menú'}
          className={`flex min-h-20 shrink-0 items-center border-b border-white/10 transition-colors duration-150 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50 ${soloIconos ? 'justify-center px-2' : 'px-6'}`}
        >
          {soloIconos
            ? <img src="/favicon.png" alt="" className="h-9 w-9 object-contain" />
            : <img src="/logo_app.png" alt="" className="h-10 object-contain" />}
        </button>

        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          {navItems.map(({ label, icon: Icon, to, disabled, contador, hijos, ...resto }) =>
            hijos ? (
              <div key={label} data-asomado={asomado === label ? '' : undefined}>
                <GrupoMenu item={{ label, icon: Icon, to, hijos, ...resto }} contraido={soloIconos} clase={item}
                  onAsomar={() => setAsomado(label)} abiertoForzado={asomado === label} alElegir={() => setAsomado(null)} />
              </div>
            ) : disabled ? (
              <div
                key={label}
                aria-disabled="true"
                title={soloIconos ? label : undefined}
                className={`${item} cursor-not-allowed select-none text-white/40`}
              >
                <Icon size={18} className="shrink-0" aria-hidden="true" />
                <span className={soloIconos ? 'sr-only' : ''}>{label}</span>
              </div>
            ) : (
              <NavLink
                key={label}
                to={to}
                title={soloIconos ? (contador && pendientesAyuda > 0 ? `${label} (${pendientesAyuda} pendientes)` : label) : undefined}
                className={({ isActive }) =>
                  `${item} transition-[background-color,color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                    isActive
                      ? 'bg-white/15 text-white before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <span className="relative shrink-0">
                  <Icon size={18} aria-hidden="true" />
                  {contador && pendientesAyuda > 0 && soloIconos && <span className="absolute -right-1 -top-1 size-2 rounded-full bg-[#F87171] ring-2 ring-[#0B2FB8]" aria-hidden="true" />}
                </span>
                <span className={soloIconos ? 'sr-only' : 'min-w-0 flex-1 truncate'}>{label}</span>
                {contador && pendientesAyuda > 0 && (
                  <span className={soloIconos ? 'sr-only' : 'ml-auto shrink-0 rounded-full bg-[#F87171] px-1.5 text-[11px] font-bold leading-5 text-white'}
                    aria-label={`${pendientesAyuda} pendientes`}>{pendientesAyuda}</span>
                )}
              </NavLink>
            )
          )}
        </nav>

        <div className="shrink-0 border-t border-white/10 px-3 py-4">
          <button
            type="button"
            onClick={handleLogout}
            title={soloIconos ? 'Cerrar sesión' : undefined}
            className={`flex min-h-11 w-full items-center gap-3 rounded-lg text-left ${soloIconos ? 'justify-center' : 'px-3'} text-sm font-medium text-white/80 transition-[background-color,color,transform] duration-150 hover:bg-white/10 active:scale-[0.98] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50`}
          >
            <LogOut size={18} className="shrink-0" aria-hidden="true" />
            <span className={soloIconos ? 'sr-only' : 'truncate'}>Cerrar sesión</span>
          </button>
        </div>
        </div>
      </aside>
      {/* Mientras el menú está desplegado sobre el contenido, el resto se atenúa; un clic fuera lo cierra. */}
      {asomado !== null && <div aria-hidden="true" className="fixed inset-0 z-30 hidden bg-[#011140]/20 animate-[velo_160ms_ease-out] min-[960px]:block" />}

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

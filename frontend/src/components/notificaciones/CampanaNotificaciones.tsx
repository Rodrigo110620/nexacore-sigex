import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, CheckCheck, Trash2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  EVENTO_NOTIFICACION,
  emitirCambioLocal,
  escucharNotificaciones,
  listarNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas,
  limpiarNotificaciones,
  quitarNotificacion,
  type Notificacion,
} from '../../services/notificacionService'

const ETIQUETA: Record<string, string> = {
  FOTO_REPORTADA: 'Foto reportada',
  QR_DUPLICADO: 'QR duplicado',
  INTENTO_INGRESO: 'Intento de ingreso',
  AULA_INCORRECTA: 'Aula incorrecta',
  EXCEPCION_NO_HABILITADO: 'No habilitado',
  EXPULSION: 'Expulsión',
  INGRESO_MANUAL: 'Ingreso manual',
  TRASLADO_AMBIENTE: 'Traslado de aula',
}

const hace = (iso: string) => {
  const minutos = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (minutos < 1) return 'ahora'
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.round(minutos / 60)
  if (horas < 24) return `hace ${horas} h`
  return new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })
}

interface Props {
  roles: string[]
  compacta?: boolean
}

/**
 * Campana de notificaciones del personal: los reportes del control de ingreso llegan en vivo,
 * con un aviso emergente y el contador de no leídas. ADMIN y CONTROL ven todos; el DOCENTE, los
 * de sus exámenes.
 */
export default function CampanaNotificaciones({ roles, compacta = false }: Props) {
  const navigate = useNavigate()
  const [lista, setLista] = useState<Notificacion[]>([])
  const [abierta, setAbierta] = useState(false)
  const [emergente, setEmergente] = useState<Notificacion | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const esAdmin = roles.includes('ADMIN')

  const cargar = useCallback(() => {
    listarNotificaciones().then(setLista).catch(() => undefined)
  }, [])

  useEffect(() => {
    cargar()
    return escucharNotificaciones(
      (n) => {
        setLista((actual) => (actual.some((x) => x.id === n.id) ? actual : [n, ...actual].slice(0, 30)))
        setEmergente(n)
        window.dispatchEvent(new CustomEvent(EVENTO_NOTIFICACION, { detail: n }))
        // Un reporte también cambia los datos de su examen o estudiante.
        emitirCambioLocal({ tipo: n.tipo, idExamen: n.idExamen, idEstudiante: n.idEstudiante })
      },
      () => {
        cargar()
        emitirCambioLocal({ tipo: 'RECONECTADO', idExamen: null, idEstudiante: null })
      },
      emitirCambioLocal,
    )
  }, [cargar])

  useEffect(() => {
    if (!emergente) return
    const t = setTimeout(() => setEmergente(null), 7000)
    return () => clearTimeout(t)
  }, [emergente])

  useEffect(() => {
    if (!abierta) return
    const cerrar = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierta(false)
    }
    document.addEventListener('mousedown', cerrar)
    return () => document.removeEventListener('mousedown', cerrar)
  }, [abierta])

  const noLeidas = lista.filter((n) => !n.leida).length

  /** La revisión de fotos es solo del ADMIN; el resto de reportes se abre en el control del examen. */
  const destino = (n: Notificacion) => (n.tipo === 'FOTO_REPORTADA' && !esAdmin ? null : n.enlace)

  const abrir = (n: Notificacion) => {
    setEmergente(null)
    setAbierta(false)
    if (!n.leida) {
      setLista((actual) => actual.map((x) => (x.id === n.id ? { ...x, leida: true } : x)))
      void marcarNotificacionLeida(n.id).catch(() => undefined)
    }
    const ruta = destino(n)
    if (ruta) navigate(ruta)
  }

  const leerTodas = () => {
    setLista((actual) => actual.map((x) => ({ ...x, leida: true })))
    void marcarTodasLeidas().catch(() => undefined)
  }

  // Limpiar es solo para quien lo hace: los demás siguen viendo sus notificaciones. Si falla, se
  // recarga la lista para no mostrar algo distinto a lo guardado.
  const quitar = (n: Notificacion) => {
    setLista((actual) => actual.filter((x) => x.id !== n.id))
    void quitarNotificacion(n.id).catch(cargar)
  }

  const limpiarTodas = () => {
    setLista([])
    void limpiarNotificaciones().catch(cargar)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}
        aria-label={noLeidas > 0 ? `Notificaciones: ${noLeidas} sin leer` : 'Notificaciones'}
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#45628D] transition-colors hover:bg-[#F1F6FF] hover:text-[#0439D9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] ${compacta ? 'sm:h-8 sm:w-8' : 'sm:h-10 sm:w-10'}`}
      >
        <Bell size={17} aria-hidden="true" />
        {noLeidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#DC2626] px-1 text-[10px] font-bold leading-[18px] text-white">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {abierta && (
        <div
          role="dialog"
          aria-label="Notificaciones"
          className="fixed inset-x-3 top-14 z-50 max-h-[70dvh] overflow-hidden rounded-xl border border-[#D8E3F5] bg-white shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96"
        >
          <div className="flex items-center justify-between border-b border-[#EDF1F7] px-4 py-3">
            <p className="text-sm font-bold text-[#011140]">Notificaciones</p>
            <div className="flex items-center gap-3">
              {noLeidas > 0 && (
                <button type="button" onClick={leerTodas} className="inline-flex items-center gap-1 text-xs font-semibold text-[#0439D9] hover:underline">
                  <CheckCheck size={14} aria-hidden="true" /> Marcar leídas
                </button>
              )}
              {lista.length > 0 && (
                <button type="button" onClick={limpiarTodas} className="inline-flex items-center gap-1 text-xs font-semibold text-[#B91C1C] hover:underline">
                  <Trash2 size={14} aria-hidden="true" /> Limpiar todas
                </button>
              )}
            </div>
          </div>
          <ul className="max-h-[calc(70dvh-3rem)] overflow-y-auto overflow-x-hidden">
            {lista.length === 0 && (
              <li className="px-4 py-8 text-center text-xs text-[#627A9B]">No hay reportes por ahora.</li>
            )}
            {lista.map((n) => (
              <li key={n.id} className={`group flex items-start border-b border-[#F1F4F9] ${n.leida ? '' : 'bg-[#F1F6FF]'}`}>
                <button
                  type="button"
                  onClick={() => abrir(n)}
                  className="flex min-w-0 flex-1 gap-3 py-3 pl-4 text-left hover:bg-[#F8FAFC]"
                >
                  <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.leida ? 'bg-transparent' : 'bg-[#0439D9]'}`} />
                  <span className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-[#B45309]">
                      {ETIQUETA[n.tipo] ?? 'Reporte'} · {hace(n.creadaEn)}
                    </span>
                    {/* Una palabra larga sin espacios no debe ensanchar el panel: se corta y el detalle va en 3 líneas. */}
                    <span className="block break-words text-[13px] font-semibold text-[#011140] [overflow-wrap:anywhere]">{n.titulo}</span>
                    {n.detalle && (
                      <span className="mt-0.5 line-clamp-3 block break-words text-xs text-[#45628D] [overflow-wrap:anywhere]" title={n.detalle}>
                        {n.detalle}
                      </span>
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => quitar(n)}
                  aria-label={`Quitar notificación: ${n.titulo}`}
                  title="Quitar de mi lista"
                  className="m-2 shrink-0 rounded p-1.5 text-[#94A3B8] hover:bg-[#FEF2F2] hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9]"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {emergente && (
        <div
          role="alert"
          className="fixed bottom-20 right-3 z-[60] w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border border-[#FDE68A] bg-white p-3 shadow-2xl sm:bottom-6 sm:right-6"
        >
          <div className="flex items-start gap-2">
            <Bell size={16} className="mt-0.5 shrink-0 text-[#B45309]" aria-hidden="true" />
            <button type="button" onClick={() => abrir(emergente)} className="min-w-0 flex-1 text-left">
              <span className="block text-[10px] font-bold uppercase tracking-wide text-[#B45309]">
                Nuevo reporte · {ETIQUETA[emergente.tipo] ?? 'Reporte'}
              </span>
              <span className="block break-words text-[13px] font-semibold text-[#011140] [overflow-wrap:anywhere]">{emergente.titulo}</span>
              {emergente.detalle && <span className="mt-0.5 line-clamp-2 block break-words text-xs text-[#45628D] [overflow-wrap:anywhere]">{emergente.detalle}</span>}
            </button>
            <button type="button" onClick={() => setEmergente(null)} aria-label="Cerrar aviso" className="shrink-0 rounded p-1 text-[#627A9B] hover:bg-[#F1F6FF]">
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

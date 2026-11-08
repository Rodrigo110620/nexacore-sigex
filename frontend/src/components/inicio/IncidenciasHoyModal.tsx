import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { ArrowRightLeft, Ban, ClipboardPen, Copy, ShieldAlert, UserX, X } from 'lucide-react'
import { obtenerIncidenciasHoy, type IncidenciaHoy } from '../../services/inicioService'
import ErrorCarga from '../ui/ErrorCarga'

const TIPOS: Record<IncidenciaHoy['tipo'], { nombre: string; icono: typeof Ban; clase: string }> = {
  EXPULSION: { nombre: 'Expulsión', icono: Ban, clase: 'bg-[#FEF2F2] text-[#B91C1C]' },
  INTENTO_INCORRECTO: { nombre: 'Intento incorrecto', icono: UserX, clase: 'bg-[#FFF1F2] text-[#E11D48]' },
  EXCEPCION: { nombre: 'Excepción de no habilitado', icono: ShieldAlert, clase: 'bg-[#FFFBEB] text-[#B45309]' },
  INGRESO_MANUAL: { nombre: 'Ingreso manual', icono: ClipboardPen, clase: 'bg-[#EEF2FF] text-[#4338CA]' },
  TRASLADO: { nombre: 'Traslado de aula', icono: ArrowRightLeft, clase: 'bg-[#E9F1FF] text-[#0439D9]' },
  QR_DUPLICADO: { nombre: 'QR duplicado', icono: Copy, clase: 'bg-[#FFF7ED] text-[#C2410C]' },
}

/**
 * Lleva directo al incidente elegido: intentos y QR duplicados a la pestaña Intentos, ingresos manuales y
 * excepciones a Excepciones (con la fila resaltada); traslados y expulsiones al panel del examen con el
 * estudiante resaltado en la tabla.
 */
export function enlaceIncidencia(inc: IncidenciaHoy): { a: string; texto: string } {
  const base = `/dashboard/control/${inc.idExamen}`
  const parametros = new URLSearchParams()
  if (inc.idEstudiante != null) parametros.set('estudiante', String(inc.idEstudiante))
  switch (inc.tipo) {
    case 'TRASLADO':
    case 'EXPULSION':
      return { a: `${base}?${parametros}`, texto: 'Ver al estudiante en el examen' }
    case 'INGRESO_MANUAL':
    case 'EXCEPCION':
      parametros.set('pestana', 'excepciones')
      return { a: `${base}/informacion?${parametros}`, texto: 'Ver en Excepciones' }
    default:
      parametros.set('pestana', 'intentos')
      parametros.set('hora', inc.fechaHora.slice(0, 16))
      return { a: `${base}/informacion?${parametros}`, texto: 'Ver en Intentos' }
  }
}

/** «Incidencias → Revisar» del inicio del ADMIN: qué incidencias hubo hoy, sin salir del inicio. */
export default function IncidenciasHoyModal({ onClose }: { onClose: () => void }) {
  const [lista, setLista] = useState<IncidenciaHoy[] | null>(null)
  const [error, setError] = useState(false)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let vigente = true
    obtenerIncidenciasHoy().then((r) => { if (vigente) { setLista(r); setError(false) } }).catch(() => { if (vigente) setError(true) })
    return () => { vigente = false }
  }, [intento])

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#011140]/50 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog" aria-modal="true" aria-labelledby="incidencias-hoy-titulo" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-start gap-3 border-b border-[#EEF2F7] px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <h2 id="incidencias-hoy-titulo" className="text-base font-bold text-[#011140]">Incidencias de hoy</h2>
            <p className="text-xs text-[#627A9B]">{lista ? `${lista.length} ${lista.length === 1 ? 'incidencia' : 'incidencias'} · de la más reciente a la más antigua` : 'Expulsiones, intentos, excepciones, ingresos manuales, traslados y QR duplicados.'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#45628D] hover:bg-[#F1F5F9]">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 sm:px-5">
          {error ? (
            <div className="py-4"><ErrorCarga mensaje="No se pudieron cargar las incidencias." onReintentar={() => setIntento((i) => i + 1)} /></div>
          ) : !lista ? (
            <p role="status" className="py-8 text-center text-sm text-[#627A9B]">Cargando incidencias…</p>
          ) : lista.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#627A9B]">Hoy no hubo incidencias.</p>
          ) : (
            <ul className="divide-y divide-[#EEF2F7]" aria-label="Incidencias de hoy">
              {lista.map((inc, i) => {
                const { nombre, icono: Icono, clase } = TIPOS[inc.tipo] ?? TIPOS.INTENTO_INCORRECTO
                const enlace = enlaceIncidencia(inc)
                return (
                  <li key={`${inc.tipo}-${inc.fechaHora}-${i}`} className="flex items-start gap-3 py-3">
                    <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${clase}`}><Icono size={15} aria-hidden="true" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#011140]">{nombre}{inc.estudiante ? `: ${inc.estudiante}` : ''}</p>
                      <p className="text-xs text-[#627A9B]">{inc.examen}{inc.detalle ? ` · ${inc.detalle}` : ''}</p>
                      <Link to={enlace.a} onClick={onClose} className="mt-1 inline-block text-xs font-semibold text-[#0439D9] hover:underline">
                        {enlace.texto} →
                      </Link>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-[#627A9B]">{inc.fechaHora.slice(11, 16)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

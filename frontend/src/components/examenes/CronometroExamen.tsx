import { CalendarClock, CheckCircle2, Timer, XCircle } from 'lucide-react'
import useTiempoExamen from '../../hooks/useTiempoExamen'
import { formatoCronometro, type HorarioExamen } from '../../utils/tiempoExamen'

interface Props {
  examen: HorarioExamen | null | undefined
  /** "tarjeta" con barra de avance; "compacto" en una línea. */
  variante?: 'tarjeta' | 'compacto'
  className?: string
}

const horaFin = (ms: number) =>
  new Date(ms).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/La_Paz' })

/**
 * Cronómetro del examen con la hora del servidor: cuánto falta para que empiece, cuánto queda
 * mientras está en curso y "Finalizado" al terminar. Cambia de fase solo, sin recargar.
 */
export default function CronometroExamen({ examen, variante = 'tarjeta', className = '' }: Props) {
  const tiempo = useTiempoExamen(examen)
  if (!tiempo) return null
  const { fase, restanteMs, progreso, finMs } = tiempo

  const estilo = {
    programado: { icono: CalendarClock, color: 'text-[#0439D9]', fondo: 'bg-[#F1F6FF] border-[#D8E3F5]', titulo: 'Comienza en' },
    en_curso: { icono: Timer, color: 'text-[#15803D]', fondo: 'bg-[#F0FDF4] border-[#BBF7D0]', titulo: 'Tiempo restante' },
    finalizado: { icono: CheckCircle2, color: 'text-[#627A9B]', fondo: 'bg-[#F8FAFC] border-[#E2E8F0]', titulo: 'Examen finalizado' },
    cancelado: { icono: XCircle, color: 'text-[#B91C1C]', fondo: 'bg-[#FDECEC] border-[#FECACA]', titulo: 'Examen cancelado' },
  }[fase]
  const Icono = estilo.icono
  const conCuenta = fase === 'programado' || fase === 'en_curso'
  const detalle = fase === 'finalizado' ? `Terminó a las ${horaFin(finMs)}` : fase === 'en_curso' ? `Termina a las ${horaFin(finMs)}` : null

  if (variante === 'compacto') {
    return (
      <span role="timer" aria-live="off" className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${estilo.fondo} ${estilo.color} ${className}`}>
        <Icono size={13} aria-hidden="true" />
        {conCuenta ? (
          <>
            {fase === 'en_curso' ? 'Quedan' : 'Comienza en'}
            <span className="font-mono tabular-nums">{formatoCronometro(restanteMs)}</span>
          </>
        ) : (
          estilo.titulo
        )}
      </span>
    )
  }

  return (
    <div role="timer" aria-live="off" className={`rounded-xl border p-3 sm:p-4 ${estilo.fondo} ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icono size={18} className={`shrink-0 ${estilo.color}`} aria-hidden="true" />
          <div className="min-w-0">
            <p className={`text-[11px] font-bold uppercase tracking-wide ${estilo.color}`}>{estilo.titulo}</p>
            {detalle && <p className="text-xs text-[#627A9B]">{detalle}</p>}
          </div>
        </div>
        {conCuenta && (
          <p className="font-mono text-2xl font-bold tabular-nums text-[#011140] sm:text-3xl">{formatoCronometro(restanteMs)}</p>
        )}
      </div>
      {fase === 'en_curso' && (
        <div
          className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#DCFCE7]"
          role="progressbar"
          aria-label="Avance del examen"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progreso * 100)}
        >
          <div className="h-full rounded-full bg-[#16A34A] transition-[width] duration-1000 ease-linear" style={{ width: `${progreso * 100}%` }} />
        </div>
      )}
    </div>
  )
}

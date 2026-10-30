import { CalendarClock, CheckCircle2, Timer, TimerOff, XCircle } from 'lucide-react'
import useTiempoExamen from '../../hooks/useTiempoExamen'
import { formatoCronometro, instanteServidor, type HorarioExamen } from '../../utils/tiempoExamen'

interface Props {
  examen: HorarioExamen | null | undefined
  /** "tarjeta" con barra de avance; "compacto" en una línea. */
  variante?: 'tarjeta' | 'compacto'
  className?: string
  /**
   * INCI-01: hora oficial de la expulsión del estudiante ("2026-10-26T09:42:00"). Su cronómetro se
   * detiene ahí y queda fijo con el tiempo que le quedaba.
   */
  detenidoEn?: string | null
}

const horaFin = (ms: number) =>
  new Date(ms).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/La_Paz' })

/**
 * Cronómetro del examen con la hora del servidor: cuánto falta para que empiece, cuánto queda
 * mientras está en curso y "Finalizado" al terminar. Cambia de fase solo, sin recargar.
 */
export default function CronometroExamen({ examen, variante = 'tarjeta', className = '', detenidoEn = null }: Props) {
  const tiempo = useTiempoExamen(examen)
  if (!tiempo) return null
  if (detenidoEn && examen) return <CronometroDetenido examen={examen} detenidoEn={detenidoEn} className={className} />
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

/**
 * Cronómetro detenido por expulsión: queda fijo con el tiempo que le quedaba al estudiante en ese
 * momento. Ambas horas son del servidor, así que la cuenta no depende de la zona del celular.
 */
function CronometroDetenido({ examen, detenidoEn, className }: { examen: HorarioExamen; detenidoEn: string; className: string }) {
  const finMs = instanteServidor(examen.fecha, examen.horaInicio, 0) + (examen.duracionMinutos || 0) * 60_000
  const detenidoMs = instanteServidor(detenidoEn.slice(0, 10), detenidoEn.slice(11, 19), 0)
  const quedaban = Math.max(0, finMs - detenidoMs)
  return (
    <div role="timer" aria-live="off" className={`rounded-xl border border-[#FECACA] bg-[#FFF5F5] p-3 sm:p-4 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <TimerOff size={18} className="shrink-0 text-[#B91C1C]" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#B91C1C]">Cronómetro detenido</p>
            <p className="text-xs text-[#7F1D1D]">Expulsión registrada a las {detenidoEn.slice(11, 16)}</p>
          </div>
        </div>
        <p className="font-mono text-2xl font-bold tabular-nums text-[#7F1D1D] sm:text-3xl">{formatoCronometro(quedaban)}</p>
      </div>
    </div>
  )
}

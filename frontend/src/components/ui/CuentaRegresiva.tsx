import { Hourglass, Timer } from 'lucide-react'
import useReloj from '../../hooks/useReloj'
import { formatoCronometro } from '../../utils/tiempoExamen'

/**
 * Cuenta regresiva de un examen con la hora del servidor, segundo a segundo: «Empieza en 01:23:45»
 * antes del inicio y «Termina en 00:42:10» mientras está en curso. Al terminar, no muestra nada.
 * {@code desdeMs}: solo se muestra «Empieza en…» cuando falta menos que eso (por defecto, 1 día).
 */
export default function CuentaRegresiva({ inicioMs, finMs, desdeMs = 86_400_000, className = '' }: {
  inicioMs: number
  finMs: number
  desdeMs?: number
  className?: string
}) {
  const ahora = useReloj(1000)
  if (ahora >= finMs) return null
  const enCurso = ahora >= inicioMs
  const restante = enCurso ? finMs - ahora : inicioMs - ahora
  if (!enCurso && restante > desdeMs) return null
  // Últimos 10 minutos de un examen en curso: en rojo, para que se note.
  const urgente = enCurso && restante <= 10 * 60_000
  const Icono = enCurso ? Hourglass : Timer
  return (
    <span
      role="timer"
      aria-label={`${enCurso ? 'Termina en' : 'Empieza en'} ${formatoCronometro(restante)}`}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
        urgente ? 'bg-[#FEE2E2] text-[#B91C1C]' : enCurso ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#E0E9FF] text-[#0439D9]'} ${className}`}
    >
      <Icono size={12} aria-hidden="true" />
      {enCurso ? 'Termina en' : 'Empieza en'} {formatoCronometro(restante)}
    </span>
  )
}

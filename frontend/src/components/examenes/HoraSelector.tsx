import { formatAmPm, parseHora24 } from '../../utils/examFormUtils'

/** La jornada de la universidad empieza a las 06:45: no se ofrecen horas antes. */
export const HORA_APERTURA = '06:45'
/** La última hora en que puede terminar un examen. */
export const HORA_CIERRE = '21:45'
const HORAS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))
  .filter((h) => h >= HORA_APERTURA.slice(0, 2) && h <= HORA_CIERRE.slice(0, 2))
const MINUTOS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

interface HoraSelectorProps {
  id: string
  label: string
  /** "HH:MM" en 24 h; "HH:" o ":MM" mientras falta una de las dos partes. */
  value: string
  error?: string
  onChange: (value: string) => void
  /** «HH:MM»: solo se ofrecen horas desde aquí (hoy: desde ahora; el fin: después del inicio). */
  minimo?: string
  /** «HH:MM»: la última hora que se ofrece (por defecto, el cierre 21:45). */
  maximo?: string
}

/** Selector de hora y minutos (cada 5) con su equivalente AM/PM. */
export default function HoraSelector({ id, label, value, error, onChange, minimo, maximo = HORA_CIERRE }: HoraSelectorProps) {
  const [hora = '', minuto = ''] = value.split(':')
  // El mínimo nunca es antes de la apertura (06:45).
  const efectivo = !minimo || minimo < HORA_APERTURA ? HORA_APERTURA : minimo
  const [minHora = '00', minMinuto = '00'] = efectivo.split(':')
  // Las horas desde el mínimo; la elegida se sigue mostrando aunque haya quedado antes (la validación lo avisa).
  const [maxHora, maxMinuto] = maximo.split(':')
  const horasBase = HORAS.filter((h) => h >= minHora && h <= maxHora)
  const horas = hora && !horasBase.includes(hora) ? [hora, ...horasBase] : horasBase
  // En la hora mínima, solo los minutos desde el mínimo. Un examen guardado con minutos fuera del paso de 5 sigue igual.
  const minutosBase = MINUTOS.filter((m) => (hora !== minHora || m >= minMinuto) && (hora !== maxHora || m <= maxMinuto))
  const minutos = minuto && !minutosBase.includes(minuto) ? [...minutosBase, minuto].sort() : minutosBase
  const sinHoras = efectivo === '24:00' || efectivo > maximo
  const selectClass = `w-full rounded-lg border bg-white px-2 py-2.5 text-sm text-[#011140] focus:outline-none focus:ring-2 focus:ring-[#0439D9]/25 ${
    error ? 'border-red-400' : 'border-gray-200'
  }`

  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">{label}</legend>
      <div className="flex items-center gap-1">
        <select
          id={id}
          aria-label={`${label}: hora`}
          aria-invalid={Boolean(error)}
          value={hora}
          onChange={(e) => onChange(`${e.target.value}:${minuto}`)}
          className={selectClass}
        >
          <option value="">HH</option>
          {horas.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="text-sm font-semibold text-gray-500" aria-hidden="true">:</span>
        <select
          aria-label={`${label}: minutos`}
          aria-invalid={Boolean(error)}
          value={minuto}
          onChange={(e) => onChange(`${hora}:${e.target.value}`)}
          className={selectClass}
        >
          <option value="">MM</option>
          {minutos.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      {sinHoras && !hora && <p className="mt-1 text-[10px] text-[#B45309]">Ya no quedan horas hoy: elige otra fecha.</p>}
      {parseHora24(value) && (
        <p className="mt-1 text-[10px] font-semibold text-[#0439D9]">{formatAmPm(value)}</p>
      )}
    </fieldset>
  )
}

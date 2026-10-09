import { formatAmPm, parseHora24 } from '../../utils/examFormUtils'

const HORAS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))
const MINUTOS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

interface HoraSelectorProps {
  id: string
  label: string
  /** "HH:MM" en 24 h; "HH:" o ":MM" mientras falta una de las dos partes. */
  value: string
  error?: string
  onChange: (value: string) => void
}

/** Selector de hora y minutos (cada 5) con su equivalente AM/PM. */
export default function HoraSelector({ id, label, value, error, onChange }: HoraSelectorProps) {
  const [hora = '', minuto = ''] = value.split(':')
  // Un examen guardado con minutos fuera del paso de 5 sigue mostrándose tal cual.
  const minutos = minuto && !MINUTOS.includes(minuto) ? [...MINUTOS, minuto].sort() : MINUTOS
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
          {HORAS.map((h) => <option key={h} value={h}>{h}</option>)}
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
      {parseHora24(value) && (
        <p className="mt-1 text-[10px] font-semibold text-[#0439D9]">{formatAmPm(value)}</p>
      )}
    </fieldset>
  )
}

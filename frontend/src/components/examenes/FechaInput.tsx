import { useRef, useState } from 'react'
import { CalendarDays } from 'lucide-react'

interface FechaInputProps {
  id: string
  label: string
  /** Fecha ISO "aaaa-mm-dd"; "" si está vacía o incompleta. */
  value: string
  min?: string
  error?: string
  onChange: (iso: string) => void
}

const aTexto = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}/${m}/${y}` : ''
}

/** "dd/mm/aaaa" → ISO; "" si no es una fecha real (p. ej. 31/02/2026). */
export function fechaTextoAIso(texto: string): string {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto)
  if (!partes) return ''
  const [, d, m, y] = partes
  const fecha = new Date(Number(y), Number(m) - 1, Number(d))
  const real = fecha.getFullYear() === Number(y) && fecha.getMonth() === Number(m) - 1 && fecha.getDate() === Number(d)
  return real ? `${y}-${m}-${d}` : ''
}

const enmascarar = (raw: string) => {
  const digitos = raw.replace(/\D/g, '').slice(0, 8)
  return [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4)].filter(Boolean).join('/')
}

/**
 * Campo de fecha siempre en dd/mm/aaaa. El input nativo "date" lo muestra según el idioma del
 * navegador (a veces mm/dd/aaaa); este se escribe con las barras automáticas o se elige en el calendario.
 */
export default function FechaInput({ id, label, value, min, error, onChange }: FechaInputProps) {
  const [texto, setTexto] = useState(aTexto(value))
  // Si la fecha cambia desde afuera (p. ej. el botón "Hoy" o al cargar el examen), se muestra la nueva.
  const [valorPrevio, setValorPrevio] = useState(value)
  if (value !== valorPrevio) {
    setValorPrevio(value)
    if (value !== fechaTextoAIso(texto)) setTexto(aTexto(value))
  }
  const calendario = useRef<HTMLInputElement>(null)
  const invalida = texto.length === 10 && !fechaTextoAIso(texto)

  return (
    <div className="min-w-0">
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          aria-label={label}
          aria-invalid={Boolean(error) || invalida}
          placeholder="dd/mm/aaaa"
          maxLength={10}
          value={texto}
          onChange={(e) => {
            const nuevo = enmascarar(e.target.value)
            setTexto(nuevo)
            onChange(fechaTextoAIso(nuevo))
          }}
          className={`w-full rounded-lg border bg-white px-3 py-2.5 pr-10 text-sm text-[#011140] focus:outline-none focus:ring-2 focus:ring-[#0439D9]/25 ${
            error || invalida ? 'border-red-400' : 'border-gray-200'
          }`}
        />
        <button
          type="button"
          aria-label="Abrir calendario"
          onClick={() => calendario.current?.showPicker?.()}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[#627A9B] hover:text-[#0439D9]"
        >
          <CalendarDays size={16} aria-hidden="true" />
        </button>
        <input
          ref={calendario}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          min={min}
          value={value}
          onChange={(e) => {
            setTexto(aTexto(e.target.value))
            onChange(e.target.value)
          }}
          className="pointer-events-none absolute bottom-0 right-0 h-0 w-0 opacity-0"
        />
      </div>
      {invalida && <p className="mt-1 text-[10px] text-red-500">La fecha no existe.</p>}
    </div>
  )
}

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

interface TextoLibreCampoProps {
  id: string
  label: ReactNode
  value: string
  onChange: (valor: string) => void
  max: number
  /** Motivo de validación que se muestra junto al campo. */
  error: string | null
  placeholder?: string
  rows?: number
  className?: string
  normalizarEntrada?: (valor: string) => string
  onBlur?: () => void
  /** Ayuda bajo el campo mientras no hay error (p. ej. «Entre 10 y 200 caracteres…»). */
  ayuda?: string
}

/**
 * Textarea del control de ingreso con tope de caracteres (también al pegar), contador y error junto al campo.
 * Si el texto no cabe en el área visible, ofrece "Ver todo" para mostrarlo completo sin recortarlo.
 */
export default function TextoLibreCampo({ id, label, value, onChange, max, error, placeholder, rows = 4, className = 'mt-3 block text-xs', normalizarEntrada, onBlur, ayuda }: TextoLibreCampoProps) {
  const errorId = `${id}-error`
  const ref = useRef<HTMLTextAreaElement | null>(null)
  const [desborda, setDesborda] = useState(false)
  const [completo, setCompleto] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = ''
    if (completo) el.style.height = `${el.scrollHeight}px`
    setDesborda(el.scrollHeight > el.clientHeight + 1)
  }, [value, completo])

  return (
    <>
      <label htmlFor={id} className={className}>{label}</label>
      <textarea
        id={id}
        ref={ref}
        className="control-input"
        rows={rows}
        maxLength={normalizarEntrada ? undefined : max}
        value={value}
        onChange={(e) => onChange((normalizarEntrada ? normalizarEntrada(e.target.value) : e.target.value).slice(0, max))}
        onBlur={onBlur}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      <div className="mt-1 flex justify-between gap-2 text-[10px]">
        <span id={errorId} className={error ? 'text-red-600' : 'text-[#627A9B]'}>{error ?? ayuda}</span>
        <span className="flex shrink-0 items-center gap-2 text-[#45628D]">
          {(desborda || completo) && (
            <button
              type="button"
              onClick={() => setCompleto((v) => !v)}
              aria-controls={id}
              aria-expanded={completo}
              className="font-semibold text-[#0439D9] hover:underline"
            >
              {completo ? 'Ver menos' : 'Ver todo'}
            </button>
          )}
          {value.length}/{max}
        </span>
      </div>
    </>
  )
}

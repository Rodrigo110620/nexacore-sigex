import type { ReactNode } from 'react'

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
}

/** Textarea del control de ingreso con tope de caracteres (también al pegar), contador y error junto al campo. */
export default function TextoLibreCampo({ id, label, value, onChange, max, error, placeholder, rows = 4 }: TextoLibreCampoProps) {
  const errorId = `${id}-error`
  return (
    <>
      <label htmlFor={id} className="mt-3 block text-xs">{label}</label>
      <textarea
        id={id}
        className="control-input"
        rows={rows}
        maxLength={max}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, max))}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      <div className="mt-1 flex justify-between gap-2 text-[10px]">
        <span id={errorId} className="text-red-600">{error}</span>
        <span className="shrink-0 text-[#45628D]">{value.length}/{max}</span>
      </div>
    </>
  )
}

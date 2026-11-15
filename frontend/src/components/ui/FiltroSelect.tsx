import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface FiltroSelectProps {
  /** Nombre del filtro, siempre visible arriba (Ambiente, Fecha, Docente…). */
  etiqueta: string
  value: string
  onChange: (valor: string) => void
  /** Las opciones; la primera con value="" es «Todos los …». */
  children: ReactNode
  disabled?: boolean
  className?: string
}

/**
 * Filtro de lista con su nombre arriba y lo elegido abajo: en celular se entiende qué filtra y si muestra todo.
 * Cuando filtra algo (valor no vacío) se resalta en azul.
 */
export default function FiltroSelect({ etiqueta, value, onChange, children, disabled, className = '' }: FiltroSelectProps) {
  const activo = value !== ''
  return (
    <label className={`relative block min-w-0 ${className}`}>
      <span className={`pointer-events-none absolute left-3 top-[7px] text-[10px] font-semibold uppercase leading-none tracking-wide ${activo ? 'text-[#0439D9]' : 'text-[#8BA0BF]'}`}>
        {etiqueta}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={`Filtrar por ${etiqueta.toLowerCase()}`}
        className={`h-11 w-full min-w-0 appearance-none truncate rounded-lg border bg-white pb-0.5 pl-3 pr-8 pt-[15px] text-[13px] font-semibold text-[#011140] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9]/30 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 ${
          activo ? 'border-[#0439D9] bg-[#F1F6FF]' : 'border-[#B8CBEF]'}`}
      >
        {children}
      </select>
      <ChevronDown size={16} className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 ${activo ? 'text-[#0439D9]' : 'text-[#627A9B]'}`} aria-hidden="true" />
    </label>
  )
}

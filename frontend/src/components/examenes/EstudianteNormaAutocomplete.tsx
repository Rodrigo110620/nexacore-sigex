import { useEffect, useRef, useState } from 'react'
import { Loader2, UserRound } from 'lucide-react'
import { sanearBusqueda } from '../../utils/habilitacionValidators'

export interface OpcionEstudiante {
  id: number
  nombre: string
  detalle: string
}

interface EstudianteNormaAutocompleteProps {
  id: string
  value: string
  error?: string
  placeholder?: string
  onChange: (value: string) => void
  onSelect: (estudiante: OpcionEstudiante) => void
  buscar: (criterio: string, signal: AbortSignal) => Promise<OpcionEstudiante[]>
}

/** Estudiante de una norma particular: solo vale si se elige de las sugerencias. */
export default function EstudianteNormaAutocomplete({
  id,
  value,
  error,
  placeholder = 'Buscar estudiante por nombre, CI o código…',
  onChange,
  onSelect,
  buscar,
}: EstudianteNormaAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<OpcionEstudiante[]>([])
  const [loading, setLoading] = useState(false)
  const [consultado, setConsultado] = useState('')
  const boxRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const q = query.trim()
    if (!open || !q) return
    const controller = new AbortController()
    const handle = window.setTimeout(() => {
      setLoading(true)
      buscar(q, controller.signal)
        .then(setResults)
        .catch(() => { if (!controller.signal.aborted) setResults([]) })
        .finally(() => {
          if (controller.signal.aborted) return
          setLoading(false)
          setConsultado(q)
        })
    }, 250)
    return () => {
      controller.abort()
      window.clearTimeout(handle)
    }
  }, [query, open, buscar])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [open])

  const showList = open && query.trim().length > 0
  const pendiente = loading || consultado !== query.trim()

  return (
    <div ref={boxRef} className="relative min-w-0">
      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-label="Estudiante de la norma particular"
          aria-invalid={Boolean(error)}
          autoComplete="off"
          value={value}
          onChange={(e) => {
            const next = sanearBusqueda(e.target.value)
            onChange(next)
            setQuery(next)
            setOpen(true)
          }}
          onFocus={() => { if (value.trim()) { setQuery(value); setOpen(true) } }}
          onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}
          placeholder={placeholder}
          className={`w-full rounded-lg border bg-white py-2.5 pl-3 pr-9 text-sm text-[#011140] focus:outline-none focus:ring-2 focus:ring-[#0439D9]/25 ${
            error ? 'border-red-400' : 'border-gray-200'
          }`}
        />
        {loading ? (
          <Loader2 size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#0439D9]" aria-hidden="true" />
        ) : (
          <UserRound size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        )}
      </div>
      {showList && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-44 overflow-y-auto overscroll-contain rounded-lg border border-[#D8E3F5] bg-white py-1 shadow-md"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-xs text-gray-400">
              {pendiente ? 'Buscando estudiantes…' : 'No hay estudiantes disponibles con ese criterio'}
            </li>
          ) : (
            results.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === r.nombre}
                  onClick={() => { onSelect(r); setOpen(false) }}
                  className="flex w-full flex-col px-3 py-2 text-left hover:bg-[#E9F1FF]"
                >
                  <span className="truncate text-xs font-semibold text-[#011140]">{r.nombre}</span>
                  <span className="truncate text-[10px] text-gray-500">{r.detalle}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

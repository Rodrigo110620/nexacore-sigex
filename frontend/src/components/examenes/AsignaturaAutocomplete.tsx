import { useEffect, useRef, useState } from 'react'
import { BookOpen, Loader2 } from 'lucide-react'
import { buscarMaterias, type MateriaDto } from '../../services/materiaService'
import { sanitizeCatalogQuery, toTitleCaseTexto } from '../../utils/examFormUtils'

interface AsignaturaAutocompleteProps {
  id: string
  value: string
  error?: string
  onChange: (value: string) => void
  onSelect: (materia: MateriaDto) => void
}

const MIN_CHARS = 3

export default function AsignaturaAutocomplete({
  id,
  value,
  error,
  onChange,
  onSelect,
}: AsignaturaAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MateriaDto[]>([])
  const [searchedQuery, setSearchedQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const boxRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const q = query.trim()
    if (!open || q.length < MIN_CHARS) return
    const controller = new AbortController()
    const handle = window.setTimeout(() => {
      setLoading(true)
      buscarMaterias(q, controller.signal)
        .then((lista) => setResults(lista))
        .catch(() => { if (!controller.signal.aborted) setResults([]) })
        .finally(() => {
          if (controller.signal.aborted) return
          setLoading(false)
          setSearchedQuery(q)
        })
    }, 250)
    return () => {
      controller.abort()
      window.clearTimeout(handle)
    }
  }, [query, open])

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

  const showList = open && query.trim().length >= MIN_CHARS
  const pending = loading || searchedQuery !== query.trim()

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          autoComplete="off"
          maxLength={100}
          value={value}
          onChange={(e) => {
            const next = sanitizeCatalogQuery(e.target.value)
            onChange(next)
            setQuery(next)
            setOpen(true)
          }}
          onFocus={() => {
            if (value.trim().length >= MIN_CHARS) {
              setQuery(value)
              setOpen(true)
            }
          }}
          onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}
          placeholder="Escribe al menos 3 letras…"
          className={`w-full rounded-lg border bg-white py-2.5 pl-3 pr-10 text-sm text-[#011140] focus:outline-none focus:ring-2 focus:ring-[#0439D9]/25 ${
            error ? 'border-red-400' : 'border-gray-200'
          }`}
        />
        {loading ? (
          <Loader2 size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#0439D9]" aria-hidden="true" />
        ) : (
          <BookOpen size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        )}
      </div>

      {showList && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-48 overflow-y-auto overscroll-contain rounded-lg border border-[#D8E3F5] bg-white py-1 shadow-md"
        >
          {results.length === 0 || (pending && searchedQuery === '') ? (
            <li className="px-3 py-2 text-xs text-gray-400">
              {pending ? 'Buscando asignaturas…' : 'No hay asignaturas con ese nombre'}
            </li>
          ) : (
            results.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === toTitleCaseTexto(m.nombre)}
                  onClick={() => {
                    onSelect(m)
                    setOpen(false)
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-[#E9F1FF]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-[#011140]">{toTitleCaseTexto(m.nombre)}</span>
                    <span className="block truncate text-[10px] text-gray-500">Cód: {m.sigla}</span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

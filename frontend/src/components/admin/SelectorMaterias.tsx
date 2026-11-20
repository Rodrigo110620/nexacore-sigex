import { useEffect, useState } from 'react'
import { BookOpen, Check, LoaderCircle, Search, X } from 'lucide-react'
import { buscarMaterias, gruposOcupadosDeMateria, type MateriaDto } from '../../services/materiaService'

interface SelectorMateriasProps {
  value: MateriaDto[]
  onChange: (materias: MateriaDto[]) => void
  error?: string
  idDocente?: number
}

/** Grupos que se ofrecen para marcar; el backend acepta hasta G20. */
const GRUPOS = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6']

/**
 * IMP-12: elige las materias del docente y los grupos (G1, G2…) que da en cada una. Busca en el catálogo (mínimo 3 letras) y muestra las elegidas
 * como etiquetas que se pueden quitar. El docente solo podrá programar exámenes de estas materias.
 */
export default function SelectorMaterias({ value, onChange, error, idDocente }: SelectorMateriasProps) {
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<MateriaDto[]>([])
  const [buscando, setBuscando] = useState(false)
  const [ocupados, setOcupados] = useState<Record<number, string[]>>({})
  const elegidas = new Set(value.map((m) => m.id))

  useEffect(() => {
    const q = busqueda.trim()
    if (q.length < 3) return
    const control = new AbortController()
    const espera = setTimeout(() => {
      setBuscando(true)
      buscarMaterias(q, control.signal)
        .then(setResultados)
        .catch(() => undefined)
        .finally(() => setBuscando(false))
    }, 250)
    return () => {
      clearTimeout(espera)
      control.abort()
    }
  }, [busqueda])

  // Al editar un docente, las materias ya llegan elegidas: carga también qué grupos pertenecen a otros.
  useEffect(() => {
    let activo = true
    Promise.all(value.map(async (materia) => [materia.id, await gruposOcupadosDeMateria(materia.id, idDocente)] as const))
      .then((filas) => {
        if (activo) setOcupados((actuales) => ({ ...actuales, ...Object.fromEntries(filas) }))
      })
      .catch(() => undefined)
    return () => { activo = false }
  }, [value, idDocente])

  // Con menos de 3 letras no se muestran resultados (los de una búsqueda anterior se ignoran).
  const visibles = busqueda.trim().length >= 3 ? resultados : []

  // Una materia nueva empieza con el G1; el ADMIN marca los demás grupos que da el docente.
  const alternar = (m: MateriaDto) => {
    if (elegidas.has(m.id)) {
      onChange(value.filter((x) => x.id !== m.id))
      return
    }
    gruposOcupadosDeMateria(m.id, idDocente).then((lista) => {
      setOcupados((actuales) => ({ ...actuales, [m.id]: lista }))
      const primeroLibre = GRUPOS.find((grupo) => !lista.includes(grupo))
      onChange([...value, { ...m, grupos: primeroLibre ? [primeroLibre] : [] }])
    }).catch(() => onChange([...value, { ...m, grupos: [] }]))
  }

  const alternarGrupo = (m: MateriaDto, g: string) => {
    if ((ocupados[m.id] ?? []).includes(g)) return
    const actuales = m.grupos ?? []
    const grupos = actuales.includes(g) ? actuales.filter((x) => x !== g) : [...actuales, g]
    if (!grupos.length) return // al menos un grupo por materia
    grupos.sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))
    onChange(value.map((x) => (x.id === m.id ? { ...x, grupos } : x)))
  }

  return (
    <div className="flex flex-col gap-3">
      {value.length > 0 && (
        <ul aria-label="Materias elegidas" className="flex flex-col gap-2">
          {value.map((m) => {
            const opciones = [...new Set([...GRUPOS, ...(m.grupos ?? [])])].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))
            return (
              <li key={m.id} className="rounded-lg border border-[#C7D7F5] bg-[#F5F8FF] p-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#011140]">
                  <BookOpen size={13} className="shrink-0 text-[#0439D9]" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{m.nombre} <span className="font-normal text-[#627A9B]">({m.sigla})</span></span>
                  <button type="button" onClick={() => alternar(m)} aria-label={`Quitar ${m.nombre}`}
                    className="rounded-full p-0.5 text-[#627A9B] hover:bg-white hover:text-[#B91C1C]">
                    <X size={13} aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label={`Grupos de ${m.nombre}`}>
                  <span className="mr-1 text-[11px] text-[#45628D]">Grupos:</span>
                  {opciones.map((g) => {
                    const on = (m.grupos ?? []).includes(g)
                    const ocupado = (ocupados[m.id] ?? []).includes(g)
                    return (
                      <button key={g} type="button" aria-pressed={on} disabled={ocupado} onClick={() => alternarGrupo(m, g)}
                        title={ocupado ? `${g} ya está asignado a otro docente` : undefined}
                        className={`min-w-9 rounded-md border px-2 py-1 text-[11px] font-semibold ${ocupado ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 line-through' : on ? 'border-[#0439D9] bg-[#0439D9] text-white' : 'border-[#C7D7F5] bg-white text-[#45628D] hover:bg-[#EEF3FF]'}`}>
                        {g}{ocupado && <span className="sr-only"> ocupado</span>}
                      </button>
                    )
                  })}
                </div>
                {!m.grupos?.length && <p className="mt-1.5 text-[11px] text-[#B45309]">No hay un grupo disponible seleccionado.</p>}
              </li>
            )
          })}
        </ul>
      )}

      <label className="flex flex-col gap-1 text-xs font-medium text-[#011140]">
        Agregar materia <span className="sr-only">(busca por nombre o sigla)</span>
        <span className={`flex items-center gap-2 rounded-md border px-3 py-2.5 focus-within:ring-1 focus-within:ring-[#E1ECFF] ${error ? 'border-[#DC2626]' : 'border-gray-300'}`}>
          <Search size={15} className="shrink-0 text-gray-400" aria-hidden="true" />
          <input
            name="materias"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Busca por nombre o sigla (mínimo 3 letras)"
            autoComplete="off"
            className="min-w-0 flex-1 text-xs outline-none"
          />
          {buscando && <LoaderCircle size={15} className="shrink-0 animate-spin text-[#0439D9]" aria-hidden="true" />}
        </span>
      </label>

      {visibles.length > 0 && (
        <ul aria-label="Materias encontradas" className="max-h-56 divide-y divide-[#EEF2F7] overflow-y-auto rounded-lg border border-[#E6EBF2]">
          {visibles.map((m) => {
            const on = elegidas.has(m.id)
            return (
              <li key={m.id}>
                <button type="button" onClick={() => alternar(m)} aria-pressed={on}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-xs hover:bg-[#F8FAFF] ${on ? 'bg-[#F5F8FF]' : ''}`}>
                  <span aria-hidden="true" className={`inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border ${on ? 'border-[#0439D9] bg-[#0439D9] text-white' : 'border-[#B9C7E0] bg-white'}`}>
                    {on && <Check size={13} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-[#011140]">{m.nombre}</span>
                    <span className="block text-[11px] text-[#627A9B]">{m.sigla}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {busqueda.trim().length >= 3 && !buscando && visibles.length === 0 && (
        <p className="text-xs text-[#627A9B]">No se encontraron materias con «{busqueda.trim()}».</p>
      )}
      {error && <p role="alert" className="text-xs font-medium text-[#B91C1C]">{error}</p>}
    </div>
  )
}

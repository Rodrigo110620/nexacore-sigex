import { useEffect, useState } from 'react'
import { BookOpen, Check, LoaderCircle, Search, X } from 'lucide-react'
import { buscarMaterias, gruposOcupados, type MateriaDto } from '../../services/materiaService'

interface SelectorMateriasProps {
  value: MateriaDto[]
  onChange: (materias: MateriaDto[]) => void
  error?: string
  /** El docente que se edita (sus grupos no cuentan como ocupados); sin él, es un docente nuevo. */
  idDocente?: number | null
}

/** Cuántos grupos libres se ofrecen por materia; el backend acepta hasta G20. */
const GRUPOS_OFRECIDOS = 6
const numero = (g: string) => Number(g.slice(1))

/** Los primeros grupos libres (sin docente) de G1 a G20, más los que ya tiene marcados este docente. */
function gruposLibres(ocupados: string[] | undefined, marcados: string[] = []) {
  const ocupado = new Set(ocupados ?? [])
  const libres: string[] = []
  for (let n = 1; n <= 20 && libres.length < GRUPOS_OFRECIDOS; n++) if (!ocupado.has(`G${n}`)) libres.push(`G${n}`)
  return [...new Set([...libres, ...marcados])].sort((a, b) => numero(a) - numero(b))
}

/**
 * IMP-12: elige las materias del docente y los grupos (G1, G2…) que da en cada una. Busca en el catálogo (mínimo 3 letras) y muestra las elegidas
 * como etiquetas que se pueden quitar. El docente solo podrá programar exámenes de estas materias.
 */
export default function SelectorMaterias({ value, onChange, error, idDocente }: SelectorMateriasProps) {
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<MateriaDto[]>([])
  const [buscando, setBuscando] = useState(false)
  const elegidas = new Set(value.map((m) => m.id))
  // Grupos que ya tienen otro docente, por materia: no se ofrecen (cada grupo de una materia tiene un solo docente).
  const [ocupados, setOcupados] = useState<Record<number, string[]>>({})
  const clave = value.map((m) => m.id).join(',')
  useEffect(() => {
    const faltan = clave ? clave.split(',').map(Number).filter((id) => !(id in ocupados)) : []
    if (!faltan.length) return
    const control = new AbortController()
    void Promise.all(faltan.map((id) => gruposOcupados(id, idDocente, control.signal).then((g) => [id, g] as const).catch(() => null)))
      .then((filas) => {
        const nuevos = Object.fromEntries(filas.filter((f) => f != null))
        if (Object.keys(nuevos).length) setOcupados((o) => ({ ...o, ...nuevos }))
      })
    return () => control.abort()
  }, [clave, idDocente, ocupados])

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

  // Con menos de 3 letras no se muestran resultados (los de una búsqueda anterior se ignoran).
  const visibles = busqueda.trim().length >= 3 ? resultados : []

  // Una materia nueva empieza con su primer grupo libre; el ADMIN marca los demás grupos que da el docente.
  const alternar = async (m: MateriaDto) => {
    if (elegidas.has(m.id)) { onChange(value.filter((x) => x.id !== m.id)); return }
    let tomados = ocupados[m.id]
    if (!tomados) {
      tomados = await gruposOcupados(m.id, idDocente).catch(() => [])
      setOcupados((o) => ({ ...o, [m.id]: tomados! }))
    }
    const primero = gruposLibres(tomados)[0]
    onChange([...value, { ...m, grupos: m.grupos?.length ? m.grupos : primero ? [primero] : [] }])
  }

  const alternarGrupo = (m: MateriaDto, g: string) => {
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
            const opciones = gruposLibres(ocupados[m.id], m.grupos)
            const nOcupados = ocupados[m.id]?.length ?? 0
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
                    return (
                      <button key={g} type="button" aria-pressed={on} onClick={() => alternarGrupo(m, g)}
                        className={`min-w-9 rounded-md border px-2 py-1 text-[11px] font-semibold ${on ? 'border-[#0439D9] bg-[#0439D9] text-white' : 'border-[#C7D7F5] bg-white text-[#45628D] hover:bg-[#EEF3FF]'}`}>
                        {g}
                      </button>
                    )
                  })}
                </div>
                {nOcupados > 0 && (
                  <p className="mt-1.5 text-[11px] text-[#627A9B]">
                    Solo se muestran los grupos libres: {ocupados[m.id]!.join(', ')} {nOcupados === 1 ? 'ya tiene' : 'ya tienen'} docente.
                  </p>
                )}
                {!m.grupos?.length && <p className="mt-1.5 text-[11px] text-[#627A9B]">Sin grupos: elige al menos uno (si no, se crea el G1 al programar su primer examen).</p>}
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

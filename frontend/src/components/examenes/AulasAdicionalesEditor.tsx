import { CircleAlert, Users, X } from 'lucide-react'
import { useId, useState } from 'react'
import { actualizarAforo, type AmbienteDto } from '../../services/ambienteService'
import FiltroDesplegable from '../ui/FiltroDesplegable'
import { aulasSinAforo, MAX_AULAS_ADICIONALES } from '../../utils/examFormUtils'

const AFORO_MAX = 1000

interface AulasAdicionalesEditorProps {
  ambientes: AmbienteDto[]
  idPrincipal: string
  value: number[]
  onChange: (ids: number[]) => void
  /** Solo ADMIN registra el aforo; el resto ve el aviso para pedírselo. */
  esAdmin: boolean
  onAforoGuardado: (ambiente: AmbienteDto) => void
}

/**
 * Aulas que se suman a la principal cuando los estudiantes no caben en una. Se llenan en el orden
 * de la lista, por orden alfabético de los estudiantes, hasta el aforo de cada una.
 */
export default function AulasAdicionalesEditor({
  ambientes, idPrincipal, value, onChange, esAdmin, onAforoGuardado,
}: AulasAdicionalesEditorProps) {
  const id = useId()
  const [aforos, setAforos] = useState<Record<number, string>>({})
  const [errores, setErrores] = useState<Record<number, string>>({})
  const [guardando, setGuardando] = useState<number | null>(null)

  const principal = ambientes.find((a) => String(a.id) === idPrincipal)
  if (!principal) return null

  const elegidas = value
    .map((idAula) => ambientes.find((a) => a.id === idAula))
    .filter((a): a is AmbienteDto => Boolean(a))
  const aulas = [principal, ...elegidas]
  const opciones = ambientes
    .filter((a) => a.id !== principal.id && !value.includes(a.id) && a.disponible !== false)
    .map((a) => ({ value: String(a.id), label: a.capacidad ? `${a.nombre} — Aforo ${a.capacidad}` : `${a.nombre} — Aforo sin registrar` }))
  const total = aulas.reduce((suma, a) => suma + (a.capacidad ?? 0), 0)
  const hayVarias = elegidas.length > 0

  const guardarAforo = async (aula: AmbienteDto) => {
    const capacidad = Number(aforos[aula.id])
    if (!Number.isInteger(capacidad) || capacidad < 1 || capacidad > AFORO_MAX) {
      setErrores((e) => ({ ...e, [aula.id]: `Indica un aforo entre 1 y ${AFORO_MAX}.` }))
      return
    }
    setGuardando(aula.id)
    try {
      onAforoGuardado(await actualizarAforo(aula.id, capacidad))
      setErrores((e) => ({ ...e, [aula.id]: '' }))
    } catch {
      setErrores((e) => ({ ...e, [aula.id]: 'No se pudo guardar el aforo. Intenta de nuevo.' }))
    } finally {
      setGuardando(null)
    }
  }

  const filaAula = (aula: AmbienteDto, indice: number) => (
    <li key={aula.id} className="rounded-lg border border-[#D8E3F5] bg-white px-3 py-2">
      <div className="flex items-center gap-2 text-xs text-[#011140]">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E9F1FF] text-[10px] font-bold text-[#0439D9]">
          {indice + 1}
        </span>
        <span className="font-semibold">{aula.nombre}</span>
        <span className="text-[#627A9B]">{indice === 0 ? 'principal' : ''}</span>
        <span className={`ml-auto ${aula.capacidad ? 'text-[#45628D]' : 'font-semibold text-red-600'}`}>
          {aula.capacidad ? `Aforo ${aula.capacidad}` : 'Sin aforo'}
        </span>
        {indice > 0 && (
          <button
            type="button"
            onClick={() => onChange(value.filter((v) => v !== aula.id))}
            aria-label={`Quitar ${aula.nombre}`}
            className="rounded p-0.5 text-[#627A9B] hover:bg-gray-100 hover:text-red-600"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {hayVarias && !aula.capacidad && (
        esAdmin ? (
          <div className="mt-2 flex items-center gap-2">
            <label htmlFor={`${id}-aforo-${aula.id}`} className="text-[11px] text-[#45628D]">Aforo:</label>
            <input
              id={`${id}-aforo-${aula.id}`}
              type="number"
              inputMode="numeric"
              min={1}
              max={AFORO_MAX}
              value={aforos[aula.id] ?? ''}
              onChange={(e) => setAforos((a) => ({ ...a, [aula.id]: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
              className="h-8 w-20 rounded-md border border-[#C9D7EC] px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9]"
            />
            <button
              type="button"
              disabled={guardando === aula.id}
              onClick={() => guardarAforo(aula)}
              className="h-8 rounded-md bg-[#0439D9] px-3 text-[11px] font-semibold text-white disabled:opacity-60"
            >
              {guardando === aula.id ? 'Guardando…' : 'Guardar aforo'}
            </button>
            {errores[aula.id] && <span className="text-[10px] text-red-600">{errores[aula.id]}</span>}
          </div>
        ) : (
          <p className="mt-1 text-[10px] text-red-600">Pide al administrador que registre el aforo de esta aula.</p>
        )
      )}
    </li>
  )

  return (
    <div className="mt-3 rounded-xl border border-dashed border-[#B8CBEF] bg-[#F8FAFD] p-3">
      <div className="flex items-center gap-2">
        <Users size={15} aria-hidden="true" className="text-[#0439D9]" />
        <p className="text-xs font-semibold text-[#011140]">Aulas del examen</p>
        {hayVarias && <span className="ml-auto text-[11px] text-[#45628D]">Capacidad total: {total} lugares</span>}
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-[#627A9B]">
        Si los estudiantes no caben en una, agrega más aulas: se reparten por orden alfabético y se llenan en este orden.
      </p>

      {hayVarias && <ol className="mt-2 space-y-1.5">{aulas.map(filaAula)}</ol>}
      {hayVarias && aulasSinAforo(ambientes, idPrincipal, value).length > 0 && (
        <p className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-red-600">
          <CircleAlert size={12} aria-hidden="true" /> Todas las aulas necesitan aforo para repartir a los estudiantes.
        </p>
      )}

      {value.length < MAX_AULAS_ADICIONALES && (
        <div className="mt-2">
          <label htmlFor={`${id}-agregar`} className="sr-only">Agregar aula</label>
          <FiltroDesplegable
            id={`${id}-agregar`}
            value=""
            onChange={(idAula) => { if (idAula) onChange([...value, Number(idAula)]) }}
            opciones={opciones}
            textoTodas="+ Agregar aula"
            placeholderBusqueda="Buscar aula…"
            className="h-9 rounded-lg text-xs"
          />
        </div>
      )}
    </div>
  )
}

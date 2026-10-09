import { CircleAlert, Pencil, Users, X } from 'lucide-react'
import { useId, useState } from 'react'
import { actualizarAforo, type AmbienteDto } from '../../services/ambienteService'
import type { ModoReparto } from '../../services/examenService'
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
  modoReparto: ModoReparto
  onModoRepartoChange: (modo: ModoReparto) => void
}

const MODOS: { valor: ModoReparto; titulo: string; detalle: string }[] = [
  {
    valor: 'ALFABETICO',
    titulo: 'Por orden alfabético',
    detalle: 'Cada estudiante sabe su aula antes del examen, según sus apellidos.',
  },
  {
    valor: 'LLEGADA',
    titulo: 'Por orden de llegada',
    detalle: 'Se llena la primera aula con los que van llegando; cuando se completa, los siguientes van a la otra.',
  },
]

/**
 * Aulas que se suman a la principal cuando los estudiantes no caben en una. Se llenan en el orden
 * de la lista, por orden alfabético de los estudiantes, hasta el aforo de cada una.
 */
export default function AulasAdicionalesEditor({
  ambientes, idPrincipal, value, onChange, esAdmin, onAforoGuardado, modoReparto, onModoRepartoChange,
}: AulasAdicionalesEditorProps) {
  const id = useId()
  const [aforos, setAforos] = useState<Record<number, string>>({})
  const [errores, setErrores] = useState<Record<number, string>>({})
  const [guardando, setGuardando] = useState<number | null>(null)
  /** Aula cuyo aforo se está editando (el aforo no se muestra salvo al editarlo o si falta). */
  const [editando, setEditando] = useState<number | null>(null)

  const principal = ambientes.find((a) => String(a.id) === idPrincipal)
  if (!principal) return null

  const elegidas = value
    .map((idAula) => ambientes.find((a) => a.id === idAula))
    .filter((a): a is AmbienteDto => Boolean(a))
  const aulas = [principal, ...elegidas]
  const opciones = ambientes
    .filter((a) => a.id !== principal.id && !value.includes(a.id))
    // Las ocupadas a esa hora se muestran, pero no se pueden elegir.
    .map((a) => ({ value: String(a.id), label: a.nombre, deshabilitada: a.disponible === false ? 'Ocupada' : undefined }))
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
      setEditando(null)
    } catch {
      setErrores((e) => ({ ...e, [aula.id]: 'No se pudo guardar el aforo. Intenta de nuevo.' }))
    } finally {
      setGuardando(null)
    }
  }

  const abrirEdicion = (aula: AmbienteDto) => {
    setAforos((a) => ({ ...a, [aula.id]: aula.capacidad ? String(aula.capacidad) : '' }))
    setErrores((e) => ({ ...e, [aula.id]: '' }))
    setEditando(aula.id)
  }

  const filaAula = (aula: AmbienteDto, indice: number) => {
    const falta = !aula.capacidad
    const mostrarCampo = esAdmin && (editando === aula.id || falta)
    return (
      <li key={aula.id} className="rounded-lg border border-[#D8E3F5] bg-white px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-[#011140]">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E9F1FF] text-[10px] font-bold text-[#0439D9]">
            {indice + 1}
          </span>
          <span className="font-semibold">{aula.nombre}</span>
          {indice === 0 && <span className="text-[#627A9B]">principal</span>}
          {indice > 0 && aula.disponible === false && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
              Ocupada en este horario
            </span>
          )}
          <span className="ml-auto" />
          {esAdmin && !falta && editando !== aula.id && (
            <button
              type="button"
              onClick={() => abrirEdicion(aula)}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold text-[#0439D9] hover:bg-[#E9F1FF]"
            >
              <Pencil size={12} aria-hidden="true" /> Editar aforo
            </button>
          )}
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
        {mostrarCampo && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label htmlFor={`${id}-aforo-${aula.id}`} className="text-[11px] text-[#45628D]">
              {falta ? 'Aforo (cuántos caben):' : 'Aforo:'}
            </label>
            <input
              id={`${id}-aforo-${aula.id}`}
              type="number"
              inputMode="numeric"
              min={1}
              max={AFORO_MAX}
              value={aforos[aula.id] ?? ''}
              onChange={(e) => setAforos((a) => ({ ...a, [aula.id]: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
              className="h-8 w-20 rounded-md border border-gray-300 px-2 text-xs focus:border-[#0439D9] focus:outline-none focus:ring-2 focus:ring-[#DCE7FF]"
            />
            <button
              type="button"
              disabled={guardando === aula.id}
              onClick={() => guardarAforo(aula)}
              className="h-8 rounded-md bg-[#0439D9] px-3 text-[11px] font-semibold text-white disabled:opacity-60"
            >
              {guardando === aula.id ? 'Guardando…' : 'Guardar aforo'}
            </button>
            {!falta && (
              <button
                type="button"
                onClick={() => setEditando(null)}
                className="h-8 rounded-md border border-[#C9D7EC] px-3 text-[11px] font-semibold text-[#45628D]"
              >
                Cancelar
              </button>
            )}
            {errores[aula.id] && <span className="text-[10px] text-red-600">{errores[aula.id]}</span>}
          </div>
        )}
        {!esAdmin && falta && (
          <p className="mt-1 text-[10px] text-red-600">Pide al administrador que registre el aforo de esta aula.</p>
        )}
      </li>
    )
  }

  return (
    <div className="mt-3 rounded-xl border border-dashed border-[#B8CBEF] bg-[#F8FAFD] p-3">
      <div className="flex items-center gap-2">
        <Users size={15} aria-hidden="true" className="text-[#0439D9]" />
        <p className="text-xs font-semibold text-[#011140]">Aulas del examen</p>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-[#627A9B]">
        Si los estudiantes no caben en una, agrega más aulas: cuando una se llena, los siguientes van a la próxima.
      </p>

      {hayVarias && (
        <fieldset className="mt-2">
          <legend className="text-[11px] font-semibold text-[#011140]">¿Cómo se reparten los estudiantes?</legend>
          <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
            {MODOS.map((m) => (
              <label
                key={m.valor}
                className={`flex cursor-pointer gap-2 rounded-lg border px-3 py-2 ${
                  modoReparto === m.valor ? 'border-[#0439D9] bg-[#E9F1FF]' : 'border-[#D8E3F5] bg-white'
                }`}
              >
                <input
                  type="radio"
                  name={`${id}-modo`}
                  value={m.valor}
                  checked={modoReparto === m.valor}
                  onChange={() => onModoRepartoChange(m.valor)}
                  className="mt-0.5 accent-[#0439D9]"
                />
                <span>
                  <span className="block text-xs font-semibold text-[#011140]">{m.titulo}</span>
                  <span className="block text-[10px] leading-snug text-[#627A9B]">{m.detalle}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

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

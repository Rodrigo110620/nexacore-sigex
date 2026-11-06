import { useEffect, useState } from 'react'
import { BookOpen, ChevronRight, UsersRound } from 'lucide-react'
import ErrorCarga from '../ui/ErrorCarga'
import { getEstudiantes, getMateriasDocente } from '../../services/estudianteService'
import type { MateriaDocenteInfo } from '../../types/estudiante'
import { TODOS_MIS_ESTUDIANTES, type GrupoElegido } from '../../utils/gruposDocente'


const total = (idMateria?: number, idParalelo?: number, signal?: AbortSignal) =>
  getEstudiantes({ page: 0, size: 1, search: '', idFacultad: '', idCarrera: '',
    idMateria: idMateria ? String(idMateria) : '', idParalelo: idParalelo ? String(idParalelo) : '' }, signal)
    .then((p) => p.totalRegistros)

/**
 * Estudiantes del DOCENTE: una card por cada materia y grupo con cuántos estudiantes tiene, y "Todos mis
 * estudiantes". Al tocar una, la lista de abajo muestra solo ese grupo.
 */
export default function GruposDocente({ elegido, onElegir }: { elegido: GrupoElegido; onElegir: (g: GrupoElegido) => void }) {
  const [grupos, setGrupos] = useState<MateriaDocenteInfo[] | null>(null)
  const [error, setError] = useState(false)
  const [intento, setIntento] = useState(0)
  const [cantidades, setCantidades] = useState<Record<string, number>>({})

  useEffect(() => {
    const controller = new AbortController()
    getMateriasDocente(controller.signal)
      .then((lista) => {
        if (controller.signal.aborted) return
        const ordenados = [...lista].sort((a, b) => a.materia.localeCompare(b.materia) || a.paralelo.localeCompare(b.paralelo, undefined, { numeric: true }))
        setGrupos(ordenados)
        setError(false)
        // Cuántos estudiantes tiene cada grupo (y el total), sin bloquear las cards.
        total(undefined, undefined, controller.signal).then((n) => setCantidades((c) => ({ ...c, todos: n }))).catch(() => undefined)
        for (const g of ordenados) {
          total(g.idMateria, g.idParalelo, controller.signal)
            .then((n) => setCantidades((c) => ({ ...c, [`${g.idMateria}-${g.idParalelo}`]: n })))
            .catch(() => undefined)
        }
      })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [intento])

  const cantidad = (clave: string) => {
    const n = cantidades[clave]
    return n == null ? '…' : `${n} ${n === 1 ? 'estudiante' : 'estudiantes'}`
  }

  if (error) return <ErrorCarga className="mb-4" mensaje="No se pudieron cargar tus materias." onReintentar={() => setIntento((i) => i + 1)} />
  if (!grupos) return <p role="status" className="mb-4 text-sm text-[#627A9B]">Cargando tus materias…</p>
  if (grupos.length === 0) {
    return <p className="mb-4 rounded-lg border border-[#D8E3F5] bg-white px-4 py-3 text-sm text-[#45628D]">No tienes materias con grupos asignados.</p>
  }

  const card = (activo: boolean) => `group flex min-h-[84px] w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${activo
    ? 'border-[#0439D9] bg-[#EEF3FF] ring-1 ring-[#0439D9]'
    : 'border-[#D8E3F5] bg-white hover:border-[#9DB4E8] hover:bg-[#F8FAFF]'}`

  return (
    <section aria-label="Mis materias y grupos" className="mb-4">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#45628D]">Mis materias y grupos</h2>
      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <li>
          <button type="button" aria-pressed={!elegido.idMateria} onClick={() => onElegir(TODOS_MIS_ESTUDIANTES)} className={card(!elegido.idMateria)}>
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0439D9] text-white"><UsersRound size={18} aria-hidden="true" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-[#011140]">Todos mis estudiantes</span>
              <span className="block text-xs text-[#45628D]">{cantidad('todos')}</span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-[#9DB4E8] group-hover:text-[#0439D9]" aria-hidden="true" />
          </button>
        </li>
        {grupos.map((g) => {
          const clave = `${g.idMateria}-${g.idParalelo}`
          const activo = elegido.idMateria === String(g.idMateria) && elegido.idParalelo === String(g.idParalelo)
          const titulo = `${g.materia} · ${g.paralelo}`
          return (
            <li key={clave}>
              <button type="button" aria-pressed={activo} aria-label={`${titulo}: ${cantidad(clave)}`}
                onClick={() => onElegir({ idMateria: String(g.idMateria), idParalelo: String(g.idParalelo), titulo })} className={card(activo)}>
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E9F1FF] text-[#0439D9]"><BookOpen size={18} aria-hidden="true" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-[#011140]" title={g.materia}>{g.materia}</span>
                  <span className="block text-xs text-[#45628D]"><span className="font-semibold text-[#0439D9]">{g.paralelo}</span> · {cantidad(clave)}</span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-[#9DB4E8] group-hover:text-[#0439D9]" aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

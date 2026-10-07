import { useState } from 'react'
import { CalendarDays, ChevronDown, Search } from 'lucide-react'
import type { ExamenDto } from '../../services/examenService'
import { estadoDelExamen, fechaLocal, type FaseExamen } from '../../utils/examenFormat'
import ExamenDelDiaFila from './ExamenDelDiaFila'

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const CAMPO =
  'h-11 rounded-md border border-[#B8CBEF] bg-white text-sm text-[#011140] placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9]'

const GRUPOS: { fase: FaseExamen; titulo: string; etiqueta: string; punto: string }[] = [
  { fase: 'en-curso', titulo: 'EN CURSO', etiqueta: 'bg-[#FDECEC] text-[#B91C1C]', punto: 'bg-[#B91C1C]' },
  { fase: 'proximo', titulo: 'PRÓXIMOS', etiqueta: 'bg-[#FEF3C7] text-[#B45309]', punto: 'bg-[#F59E0B]' },
  { fase: 'finalizado', titulo: 'FINALIZADOS', etiqueta: 'bg-[#F1F6FF] text-[#627A9B]', punto: 'bg-[#627A9B]' },
]

/** Exámenes de la fecha elegida (por defecto hoy) agrupados por fase, con buscador por asignatura o ambiente. */
export default function ExamenesDelDia({ examenes, ahora }: { examenes: ExamenDto[]; ahora: Date }) {
  const hoy = fechaLocal(ahora)
  const [fecha, setFecha] = useState(hoy)
  const [busqueda, setBusqueda] = useState('')
  const texto = normalizar(busqueda.trim())
  const delDia = examenes
    .filter((e) => e.fecha === fecha)
    .filter((e) => !texto || [e.asignatura, e.sigla, e.ambienteNombre].some((c) => normalizar(c ?? '').includes(texto)))
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
    .map((examen) => ({ examen, estado: estadoDelExamen(examen, ahora) }))
  const grupos = GRUPOS.map((g) => ({ ...g, filas: delDia.filter((f) => f.estado.fase === g.fase) })).filter((g) => g.filas.length > 0)
  const restantes = delDia.filter((f) => f.estado.fase !== 'finalizado').length
  const proximos = delDia.filter((f) => f.estado.fase === 'proximo').length

  return (
    <section aria-labelledby="examenes-del-dia" className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between gap-2">
          <h2 id="examenes-del-dia" className="flex items-center gap-1 text-[10px] font-bold uppercase text-[#011140] sm:gap-2 sm:text-sm">
            <CalendarDays size={14} className="text-[#0439D9] sm:h-4 sm:w-4" aria-hidden="true" />
            Todos los exámenes del día
          </h2>
          <span className="shrink-0 text-[9px] text-[#627A9B] md:hidden">{proximos} restantes</span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative sm:w-72">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              type="search"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por asignatura o ambiente..."
              aria-label="Buscar exámenes del día"
              className={`${CAMPO} h-9 w-full pl-10 pr-3 text-[11px] sm:h-11 sm:text-sm`}
            />
          </div>
          <label className="hidden items-center gap-2 text-xs font-semibold text-[#627A9B] sm:flex">
            Fecha:
            <input type="date" value={fecha} onChange={(event) => setFecha(event.target.value || hoy)} className={`${CAMPO} flex-1 px-3`} />
          </label>
        </div>
      </div>

      {delDia.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#B8CBEF] bg-white/70 px-4 py-10 text-center text-sm text-gray-500">
          {texto ? `Sin resultados para “${busqueda.trim()}”.` : 'No hay exámenes programados para esta fecha.'}
        </p>
      ) : (
        <div className="flex flex-col gap-2 sm:gap-0 sm:overflow-hidden sm:rounded-2xl sm:border sm:border-[#D8E3F5] sm:bg-white sm:shadow-sm">
          {grupos.map(({ fase, titulo, etiqueta, punto, filas }, i) => (
            <div key={fase} role="group" aria-label={`Exámenes ${titulo.toLowerCase()}`} className={`${fase === 'en-curso' ? 'hidden sm:block' : ''} sm:border-b sm:border-[#EDF1F7] sm:last:border-b-0`}>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-[#E2E6EC] bg-white px-2 py-1.5 sm:rounded-none sm:border-x-0 sm:border-t-0 sm:border-b sm:border-[#EDF1F7] sm:bg-[#F8FBFF] sm:px-4 sm:py-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${etiqueta}`}>
                  <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${punto}`} />
                  {titulo}
                </span>
                <label className="relative flex items-center gap-1 text-[9px] text-[#627A9B] sm:hidden">
                  {fecha.split('-').reverse().join('/')}
                  <ChevronDown size={12} aria-hidden="true" />
                  <input type="date" aria-label="Cambiar fecha móvil" value={fecha} onChange={(event) => setFecha(event.target.value || hoy)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                </label>
                {i === 0 && (
                  <span className="hidden text-[11px] text-[#627A9B] sm:inline">
                    {`${restantes} ${restantes === 1 ? 'evaluación restante' : 'evaluaciones restantes'}`}
                  </span>
                )}
              </div>
              <ul className="mt-2 flex flex-col gap-2 sm:mt-0 sm:block sm:divide-y sm:divide-[#EDF1F7] sm:gap-0">
                {filas.map(({ examen, estado }, j) => (
                  <ExamenDelDiaFila
                    key={`${examen.idExamen}-${examen.idParalelo}`}
                    examen={examen}
                    estado={estado}
                    siguiente={fase === 'proximo' && j === 0 && fecha === hoy}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

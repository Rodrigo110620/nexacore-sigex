import { useState } from 'react'
import { CalendarDays, Search } from 'lucide-react'
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

  return (
    <section aria-labelledby="examenes-del-dia" className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 id="examenes-del-dia" className="flex items-center gap-2 text-sm font-bold uppercase text-[#011140]">
          <CalendarDays size={16} className="text-[#0439D9]" aria-hidden="true" />
          Todos los exámenes del día
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative sm:w-72">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              type="search"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por asignatura o ambiente..."
              aria-label="Buscar exámenes del día"
              className={`${CAMPO} w-full pl-10 pr-3`}
            />
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-[#627A9B]">
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
        <div className="overflow-hidden rounded-2xl border border-[#D8E3F5] bg-white shadow-sm">
          {grupos.map(({ fase, titulo, etiqueta, punto, filas }, i) => (
            <div key={fase} role="group" aria-label={`Exámenes ${titulo.toLowerCase()}`} className="border-b border-[#EDF1F7] last:border-b-0">
              <div className="flex items-center justify-between gap-2 border-b border-[#EDF1F7] bg-[#F8FBFF] px-4 py-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${etiqueta}`}>
                  <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${punto}`} />
                  {titulo}
                </span>
                {i === 0 && (
                  <span className="text-[11px] text-[#627A9B]">
                    {`${restantes} ${restantes === 1 ? 'evaluación restante' : 'evaluaciones restantes'}`}
                  </span>
                )}
              </div>
              <ul className="divide-y divide-[#EDF1F7]">
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

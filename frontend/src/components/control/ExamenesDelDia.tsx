import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Building2, CalendarDays, Play, Search } from 'lucide-react'
import type { ExamenDto } from '../../services/examenService'
import { addMinutes, horaCorta } from '../../utils/examenFormat'

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const CAMPO =
  'h-11 rounded-md border border-[#B8CBEF] bg-white text-sm text-[#011140] placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9]'

/** Exámenes de la fecha elegida (por defecto hoy), con buscador por asignatura, sigla o aula. */
export default function ExamenesDelDia({ examenes, hoy }: { examenes: ExamenDto[]; hoy: string }) {
  const [fecha, setFecha] = useState(hoy)
  const [busqueda, setBusqueda] = useState('')
  const texto = normalizar(busqueda.trim())
  const delDia = examenes
    .filter((e) => e.fecha === fecha)
    .filter((e) => !texto || [e.asignatura, e.sigla, e.ambienteNombre].some((c) => normalizar(c ?? '').includes(texto)))
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))

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
              placeholder="Buscar por asignatura, sigla o aula..."
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
        <ul className="divide-y divide-[#EDF1F7] rounded-2xl border border-[#D8E3F5] bg-white shadow-sm">
          {delDia.map((e) => (
            <li key={`${e.idExamen}-${e.idParalelo}`} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F1F6FF] text-[#0439D9]">
                  <BookOpen size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-[#011140]">{e.asignatura}</p>
                  <p className="flex items-center gap-1 text-xs text-[#627A9B]">
                    <Building2 size={12} aria-hidden="true" />
                    {e.ambienteNombre} · {horaCorta(e.horaInicio)} - {addMinutes(e.horaInicio, e.duracionMinutos)}
                  </p>
                </div>
              </div>
              <Link
                to={`/dashboard/control/${e.idExamen}`}
                aria-label={`Iniciar control de ${e.asignatura}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0439D9] px-4 py-2 text-xs font-semibold text-white hover:bg-[#032db0]"
              >
                <Play size={14} aria-hidden="true" />
                Iniciar control
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

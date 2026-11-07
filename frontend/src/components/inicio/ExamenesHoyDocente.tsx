import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Clock3, MapPin } from 'lucide-react'
import { BarraDegradado } from './Graficas'
import ErrorCarga from '../ui/ErrorCarga'
import useResumenesExamenes from '../../hooks/useResumenesExamenes'
import type { ExamenDto } from '../../services/examenService'
import { ahoraServidorMs } from '../../services/tiempoService'
import { addMinutes, estadoDelExamen, etiquetaAulas, fechaLocal, formatFecha, horaCorta, materiaYGrupo } from '../../utils/examenFormat'

const ESTADO: Record<string, [string, string]> = {
  'en-curso': ['EN CURSO', 'bg-[#DCFCE7] text-[#15803D]'],
  proximo: ['PRÓXIMO', 'bg-[#E0E9FF] text-[#0439D9]'],
  finalizado: ['FINALIZADO', 'bg-[#EEF2F6] text-[#475569]'],
}

function Cifra({ color, valor, texto }: { color: string; valor: number | string; texto: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden="true" />
      <span className="font-bold tabular-nums text-[#011140]">{valor}</span>
      <span className="text-[#627A9B]">{texto}</span>
    </span>
  )
}

/**
 * DASH-01: los exámenes de hoy del docente con sus contadores en vivo (habilitados, ingresados y ausentes).
 * Antes de iniciar: 0 ingresados y todos los habilitados ausentes. Un expulsado sigue contando como
 * ingresado, con su propia marca; un trasladado cuenta una sola vez (en su aula nueva). Se actualiza con
 * cada ingreso o cambio en vivo, sin recargar, y cada 30 s cambia el estado (en curso, finalizado).
 */
export default function ExamenesHoyDocente({ examenes }: { examenes: ExamenDto[] }) {
  const [ahora, setAhora] = useState(() => new Date(ahoraServidorMs()))

  const hoy = fechaLocal(ahora)
  const deHoy = useMemo(() => {
    const unicos = new Map<number, ExamenDto>()
    for (const e of examenes) {
      if (e.fecha === hoy && e.estado?.toLowerCase() !== 'cancelado' && !unicos.has(e.idExamen)) unicos.set(e.idExamen, e)
    }
    return [...unicos.values()].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
  }, [examenes, hoy])
  const { resumenes, recargar } = useResumenesExamenes(deHoy.map((e) => e.idExamen), ahora)

  useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date(ahoraServidorMs())), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const proximo = useMemo(() => examenes
    .filter((e) => e.fecha > hoy && e.estado?.toLowerCase() !== 'cancelado')
    .sort((a, b) => `${a.fecha}${a.horaInicio}`.localeCompare(`${b.fecha}${b.horaInicio}`))[0], [examenes, hoy])

  return (
    <section aria-labelledby="examenes-hoy-docente" className="mx-auto mb-4 max-w-6xl rounded-xl border border-[#D8E3F5] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="examenes-hoy-docente" className="text-base font-extrabold text-[#011140]">Tus exámenes de hoy</h2>
          <p className="text-xs text-[#627A9B]">Los contadores se actualizan solos.</p>
        </div>
        {deHoy.some((e) => estadoDelExamen(e, ahora).fase === 'en-curso') && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DCFCE7] px-3 py-1 text-[11px] font-semibold text-[#15803D]">
            <span className="h-2 w-2 rounded-full bg-[#16A34A] shadow-[0_0_6px_rgba(22,163,74,0.6)]" aria-hidden="true" /> En vivo
          </span>
        )}
      </div>

      {deHoy.length === 0 ? (
        <div className="mt-3 flex items-start gap-3 rounded-lg bg-[#F8FAFF] p-3 text-sm text-[#45628D]">
          <CalendarDays size={18} className="mt-0.5 shrink-0 text-[#0439D9]" aria-hidden="true" />
          <p>
            No tienes exámenes hoy.
            {proximo && <> Tu próximo examen: <span className="font-semibold text-[#011140]">{proximo.asignatura}</span> · {formatFecha(proximo.fecha)} · {horaCorta(proximo.horaInicio)}.</>}
          </p>
        </div>
      ) : (
        <ul className="mt-2 divide-y divide-[#EEF2F7]">
          {deHoy.map((e) => {
            const estado = estadoDelExamen(e, ahora)
            const [etiqueta, clase] = ESTADO[estado.fase]
            const r = resumenes[e.idExamen]
            const datos = r && r !== 'error' ? r : null
            const ausentes = datos ? Math.max(0, datos.habilitados - datos.ingresados) : 0
            const pct = datos && datos.habilitados > 0 ? Math.round((datos.ingresados / datos.habilitados) * 100) : 0
            return (
              <li key={e.idExamen} aria-label={`Examen de hoy: ${e.asignatura}`} className="flex flex-col gap-2 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold text-[#011140]">{materiaYGrupo(e)}</p>
                  <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${clase}`}>{etiqueta}</span>
                </div>
                <p className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#011140]">
                  <span className="inline-flex items-center gap-1"><Clock3 size={13} className="text-[#45628D]" aria-hidden="true" />{horaCorta(e.horaInicio)} – {addMinutes(e.horaInicio, e.duracionMinutos)}</span>
                  <span className="inline-flex min-w-0 items-center gap-1"><MapPin size={13} className="shrink-0 text-[#45628D]" aria-hidden="true" /><span className="truncate">{etiquetaAulas(e)}</span></span>
                </p>
                {r === 'error' ? (
                  <ErrorCarga mensaje="No se pudieron cargar los contadores de este examen." onReintentar={recargar} />
                ) : !datos ? (
                  <p role="status" className="text-xs text-[#627A9B]">Cargando contadores…</p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" aria-label={`Contadores de ${e.asignatura}`}>
                      <Cifra color="bg-[#2563EB]" valor={datos.habilitados} texto="habilitados" />
                      <Cifra color="bg-[#16A34A]" valor={datos.ingresados} texto="ingresados" />
                      <Cifra color="bg-[#F59E0B]" valor={ausentes} texto="ausentes" />
                      <span className="ml-auto text-xs font-bold text-[#011140] max-sm:hidden">{pct} %</span>
                    </div>
                    {(datos.expulsados || datos.trasladados) ? (
                      <p className="text-[11px] text-[#627A9B]">
                        {datos.expulsados ? `${datos.expulsados} ${datos.expulsados === 1 ? 'expulsado' : 'expulsados'}: cuentan como ingresados. ` : ''}
                        {datos.trasladados ? `${datos.trasladados} ${datos.trasladados === 1 ? 'trasladado' : 'trasladados'} de aula: cuentan en su aula nueva.` : ''}
                      </p>
                    ) : null}
                    <BarraDegradado valor={datos.ingresados} max={datos.habilitados} desde="#22C55E" hasta="#0EA5E9" etiqueta={`Avance de ingreso de ${e.asignatura}`} />
                  </>
                )}
                <Link to={`/dashboard/control/${e.idExamen}`} className="inline-flex w-fit items-center gap-1 text-xs font-semibold text-[#0439D9] hover:underline">
                  Ver el control del examen <ArrowRight size={13} aria-hidden="true" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

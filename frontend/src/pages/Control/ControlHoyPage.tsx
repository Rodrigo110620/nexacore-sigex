import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarClock, ChevronDown, Clock3, MapPin } from 'lucide-react'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import CronometroExamen from '../../components/examenes/CronometroExamen'
import { BarraDegradado } from '../../components/inicio/Graficas'
import ErrorCarga from '../../components/ui/ErrorCarga'
import { useAuth } from '../../context/AuthContext'
import usePanelControl from '../../hooks/usePanelControl'
import useResumenesExamenes from '../../hooks/useResumenesExamenes'
import type { ResumenEstudiantes } from '../../services/controlExamenService'
import type { ExamenDto } from '../../services/examenService'
import { addMinutes, estadoDelExamen, etiquetaAulas, fechaLocal, formatFecha, horaCorta, materiaYGrupo } from '../../utils/examenFormat'
import { DIAS_LARGOS, TARJETA, formatoPct, porcentaje } from '../../utils/inicio'
import { registraControl, tienePermiso } from '../../utils/permisos'
import { aperturaControl } from '../../utils/tiempoExamen'

type Resumen = ResumenEstudiantes | 'error' | undefined

/**
 * Control = el tablero del día (Exámenes es la agenda completa). Solo los exámenes de hoy: el que está en curso
 * arriba, con cronómetro y contadores en vivo; los próximos con su hora de apertura; los terminados, plegados.
 * Sin exámenes hoy, el próximo que viene. El CONTROL y el docente «Inician control»; el ADMIN lo «Ve» (supervisa).
 */
export default function ControlHoyPage() {
  const auth = useAuth()
  const registra = registraControl(auth)
  const verAgenda = tienePermiso(auth, 'EXAMENES_GESTIONAR_TODOS', 'EXAMENES_GESTIONAR_PROPIOS')
  const { examenes, error, ahora, recargar } = usePanelControl()
  const [verTerminados, setVerTerminados] = useState(false)

  const hoy = fechaLocal(ahora)
  const unicos = useMemo(() => {
    const m = new Map<number, ExamenDto>()
    for (const e of examenes ?? []) if (!m.has(e.idExamen)) m.set(e.idExamen, e)
    return [...m.values()].sort((a, b) => (a.fecha + a.horaInicio).localeCompare(b.fecha + b.horaInicio))
  }, [examenes])
  const deHoy = unicos.filter((e) => e.fecha === hoy)
  const fase = (e: ExamenDto) => estadoDelExamen(e, ahora).fase
  const enCurso = deHoy.filter((e) => fase(e) === 'en-curso')
  const proximos = deHoy.filter((e) => fase(e) === 'proximo')
  const terminados = deHoy.filter((e) => fase(e) === 'finalizado')
  const siguiente = unicos.find((e) => e.fecha > hoy)
  const { resumenes } = useResumenesExamenes(deHoy.map((e) => e.idExamen), ahora)
  const accion = registra ? 'Iniciar control' : 'Ver control'

  return (
    <PanelLayout title="CONTROL DE INGRESO" description="Los exámenes de hoy: entra al control del que está en curso." topBarVariant="control">
      {/* Ancho completo, como el resto de las pantallas del personal (sin columnas vacías a los lados). */}
      <div className="flex w-full flex-col gap-3 px-4 py-3 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:gap-4 sm:px-5 sm:pt-4 min-[960px]:pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-base font-bold text-[#011140] sm:text-lg">Hoy · {DIAS_LARGOS[ahora.getDay()]} {formatFecha(hoy)}</h1>
          {verAgenda && <Link to="/dashboard/examenes" className="text-sm font-semibold text-[#0439D9] hover:underline">Ver todos los exámenes →</Link>}
        </div>

        {error ? <ErrorCarga mensaje={error} onReintentar={recargar} />
          : !examenes ? <p role="status" className="py-10 text-center text-sm text-[#627A9B]">Cargando los exámenes de hoy…</p>
          : <>
            {enCurso.length + proximos.length > 0 && (
              <section aria-label="Exámenes de hoy" className={`${TARJETA} overflow-hidden`}>
                <div aria-hidden="true" className={`${COLUMNAS} hidden border-b border-[#EEF2F7] bg-[#F8FAFF] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#627A9B] xl:grid`}>
                  <span>Estado</span><span>Examen</span><span>Horario · Aula</span><span>Ingreso</span><span>Termina en</span><span />
                </div>
                <ul className="divide-y divide-[#EEF2F7]">
                  {[...enCurso, ...proximos].map((e) => <FilaExamen key={e.idExamen} examen={e} fase={fase(e)} resumen={resumenes[e.idExamen]} accion={accion} />)}
                </ul>
              </section>
            )}

            {deHoy.length === 0 && (
              <section className={`${TARJETA} flex flex-col items-center gap-2 p-8 text-center`}>
                <CalendarClock size={28} className="text-[#0439D9]" aria-hidden="true" />
                <p className="text-base font-bold text-[#011140]">Hoy no hay exámenes</p>
                <p className="text-sm text-[#627A9B]">
                  {siguiente ? <>El próximo es <b className="text-[#011140]">{materiaYGrupo(siguiente)}</b>, el {formatFecha(siguiente.fecha)} a las {horaCorta(siguiente.horaInicio)} ({etiquetaAulas(siguiente)}).</> : 'No hay exámenes programados.'}
                </p>
              </section>
            )}

            {terminados.length > 0 && (
              <section aria-label="Terminados hoy" className={`${TARJETA} overflow-hidden`}>
                <button type="button" aria-expanded={verTerminados} onClick={() => setVerTerminados((v) => !v)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-[#011140] hover:bg-[#F8FAFF]">
                  <ChevronDown size={16} aria-hidden="true" className={`text-[#0439D9] transition-transform duration-200 ${verTerminados ? 'rotate-180' : ''}`} />
                  Terminados hoy ({terminados.length})
                </button>
                {verTerminados && (
                  <ul className="divide-y divide-[#EEF2F7] border-t border-[#EEF2F7]">
                    {terminados.map((e) => <FilaExamen key={e.idExamen} examen={e} fase="finalizado" resumen={resumenes[e.idExamen]} accion="Ver control" />)}
                  </ul>
                )}
              </section>
            )}
          </>}
      </div>
      <MobileBottomNav />
    </PanelLayout>
  )
}

// Lista: columnas en escritorio; en celular cada fila en dos o tres líneas (examen y botón arriba).
const COLUMNAS = 'xl:grid xl:grid-cols-[104px_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.4fr)_112px_150px] xl:items-center xl:gap-x-4'
const ESTADO = {
  'en-curso': { texto: 'En curso', clase: 'bg-[#DCFCE7] text-[#15803D]' },
  proximo: { texto: 'Próximo', clase: 'bg-[#E0E9FF] text-[#0439D9]' },
  finalizado: { texto: 'Terminado', clase: 'bg-[#F1F5F9] text-[#475569]' },
} as const

function FilaExamen({ examen, fase, resumen, accion }: { examen: ExamenDto; fase: string; resumen: Resumen; accion: string }) {
  const d = resumen && resumen !== 'error' ? resumen : null
  const habilitados = d?.habilitados ?? 0
  const ingresados = d?.ingresados ?? 0
  const estado = ESTADO[fase as keyof typeof ESTADO] ?? ESTADO.proximo
  const enCurso = fase === 'en-curso'
  const chip = <span className={`inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-bold ${estado.clase}`}>{enCurso && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#16A34A]" aria-hidden="true" />}{estado.texto}</span>
  const ingreso = fase === 'proximo'
    ? <span className="text-xs font-semibold text-[#0439D9]">Abre a las {aperturaControl(examen.fecha, examen.horaInicio).hora}</span>
    : d
      ? <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#45628D]">
          <b className="tabular-nums text-[#011140]">{ingresados}/{habilitados}</b>
          {habilitados > 0 && <span className="w-16 shrink-0"><BarraDegradado valor={ingresados} max={habilitados} desde="#22C55E" hasta="#0EA5E9" etiqueta={`Avance de ingreso de ${examen.asignatura}`} /></span>}
          <span className="xl:truncate">{habilitados > 0 ? `${formatoPct(porcentaje(ingresados, habilitados))} · ${habilitados - ingresados} ${habilitados - ingresados === 1 ? 'ausente' : 'ausentes'}` : 'sin habilitados'}</span>
        </span>
      : <span className="text-xs text-[#627A9B]">—</span>
  return (
    <li aria-label={`${estado.texto}: ${materiaYGrupo(examen)}`}
      className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 px-4 py-3 ${COLUMNAS} ${enCurso ? '' : 'bg-white'}`}>
      <span className="hidden xl:block">{chip}</span>
      {/* Celular: el nombre completo (hasta dos líneas) junto al botón; el chip baja con el horario. */}
      <b className="col-start-1 row-start-1 line-clamp-2 self-center text-sm text-[#011140] xl:col-start-auto xl:row-start-auto xl:line-clamp-1">{materiaYGrupo(examen)}</b>
      <span className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#45628D] xl:col-span-1">
        <span className="xl:hidden">{chip}</span>
        <span className="inline-flex items-center gap-1"><Clock3 size={13} aria-hidden="true" />{horaCorta(examen.horaInicio)} – {addMinutes(examen.horaInicio, examen.duracionMinutos)}</span>
        <span className="inline-flex items-center gap-1"><MapPin size={13} aria-hidden="true" />{etiquetaAulas(examen)}</span>
      </span>
      <span className="min-w-0">{ingreso}</span>
      <span className="justify-self-end xl:justify-self-start">{enCurso ? <CronometroExamen examen={examen} variante="compacto" /> : <span className="text-xs text-[#627A9B]">—</span>}</span>
      <Link to={`/dashboard/control/${examen.idExamen}`} aria-label={`${accion} de ${materiaYGrupo(examen)}`}
        className={`col-start-2 row-start-1 inline-flex min-h-9 items-center justify-center gap-1 justify-self-end whitespace-nowrap rounded-lg px-3 text-xs font-bold xl:col-start-auto xl:row-start-auto xl:min-h-10 xl:text-sm ${
          enCurso ? 'bg-[#0439D9] text-white hover:bg-[#0C41E1]' : 'border border-[#D8E3F5] bg-white text-[#0439D9] hover:bg-[#F1F6FF]'}`}>
        {enCurso ? accion : fase === 'proximo' ? 'Ver' : 'Ver control'} <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </li>
  )
}

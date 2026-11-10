import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarClock, ChevronDown, Clock3, MapPin } from 'lucide-react'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import CronometroExamen from '../../components/examenes/CronometroExamen'
import { BarraDegradado } from '../../components/inicio/Graficas'
import { EnVivo } from '../../components/inicio/Comun'
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
          <h1 className="text-lg font-bold text-[#011140]">Hoy · {DIAS_LARGOS[ahora.getDay()]} {formatFecha(hoy)}</h1>
          {verAgenda && <Link to="/dashboard/examenes" className="text-sm font-semibold text-[#0439D9] hover:underline">Ver todos los exámenes →</Link>}
        </div>

        {error ? <ErrorCarga mensaje={error} onReintentar={recargar} />
          : !examenes ? <p role="status" className="py-10 text-center text-sm text-[#627A9B]">Cargando los exámenes de hoy…</p>
          : <>
            {enCurso.length > 0 && (
              <section aria-label="En curso" className="grid gap-3 xl:grid-cols-2">
                {enCurso.map((e) => <TarjetaEnCurso key={e.idExamen} examen={e} resumen={resumenes[e.idExamen]} accion={accion} />)}
              </section>
            )}

            {proximos.length > 0 && (
              <section aria-label="Próximos de hoy" className="flex flex-col gap-2.5">
                <h2 className="text-xs font-bold uppercase tracking-wide text-[#45628D]">Próximos de hoy</h2>
                {proximos.map((e) => <FilaProxima key={e.idExamen} examen={e} accion={accion} />)}
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
                    {terminados.map((e) => {
                      const r = resumenes[e.idExamen]
                      const d = r && r !== 'error' ? r : null
                      return (
                        <li key={e.idExamen} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                          <span className="min-w-0 flex-1 font-semibold text-[#011140]">{materiaYGrupo(e)}</span>
                          <span className="text-xs text-[#627A9B]">{horaCorta(e.horaInicio)} – {addMinutes(e.horaInicio, e.duracionMinutos)} · {etiquetaAulas(e)}</span>
                          {d && <span className="text-xs font-semibold text-[#011140]">{d.ingresados} de {d.habilitados} ingresaron</span>}
                          <Link to={`/dashboard/control/${e.idExamen}`} className="text-xs font-semibold text-[#0439D9] hover:underline">Ver control →</Link>
                        </li>
                      )
                    })}
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

function TarjetaEnCurso({ examen, resumen, accion }: { examen: ExamenDto; resumen: Resumen; accion: string }) {
  const d = resumen && resumen !== 'error' ? resumen : null
  const habilitados = d?.habilitados ?? 0
  const ingresados = d?.ingresados ?? 0
  const contadores: [string, number, string][] = [
    ['Habilitados', habilitados, 'text-[#0439D9]'], ['Ingresados', ingresados, 'text-[#15803D]'], ['Ausentes', Math.max(0, habilitados - ingresados), 'text-[#B45309]'],
  ]
  // Compacta: título y cronómetro arriba; contadores, avance y el botón en una sola franja.
  return (
    <article aria-label={`En curso: ${materiaYGrupo(examen)}`} className={`${TARJETA} flex flex-col gap-3 p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-[#DCFCE7] px-2 py-0.5 text-[10px] font-bold text-[#15803D]">EN CURSO</span>
            <EnVivo texto="En vivo" />
          </div>
          <h2 className="mt-1 truncate text-base font-bold text-[#011140]">{materiaYGrupo(examen)}</h2>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#45628D]">
            <span className="inline-flex items-center gap-1"><Clock3 size={13} aria-hidden="true" />{horaCorta(examen.horaInicio)} – {addMinutes(examen.horaInicio, examen.duracionMinutos)}</span>
            <span className="inline-flex items-center gap-1"><MapPin size={13} aria-hidden="true" />{etiquetaAulas(examen)}</span>
          </p>
        </div>
        <CronometroExamen examen={examen} variante="compacto" />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#EEF2F7] pt-3">
        <dl className="flex flex-1 flex-wrap items-baseline gap-x-4 gap-y-1">
          {contadores.map(([t, v, c]) => (
            <div key={t} className="flex items-baseline gap-1.5">
              <dd className={`text-lg font-bold tabular-nums ${c}`}>{d ? v : '—'}</dd>
              <dt className="text-xs text-[#627A9B]">{t.toLowerCase()}</dt>
            </div>
          ))}
          {d && habilitados > 0 && <span className="text-xs font-semibold tabular-nums text-[#011140]">{formatoPct(porcentaje(ingresados, habilitados))}</span>}
        </dl>
        <Link to={`/dashboard/control/${examen.idExamen}`} aria-label={`${accion} de ${materiaYGrupo(examen)}`}
          className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-[10px] bg-[#0439D9] px-4 text-sm font-bold text-white hover:bg-[#0C41E1] sm:w-auto">
          {accion} <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
      {d && habilitados > 0 && <BarraDegradado valor={ingresados} max={habilitados} desde="#22C55E" hasta="#0EA5E9" etiqueta={`Avance de ingreso de ${examen.asignatura}`} />}
    </article>
  )
}

function FilaProxima({ examen, accion }: { examen: ExamenDto; accion: string }) {
  const apertura = aperturaControl(examen.fecha, examen.horaInicio)
  return (
    <article aria-label={`Próximo: ${materiaYGrupo(examen)}`} className={`${TARJETA} flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3`}>
      <span className="rounded-md bg-[#E0E9FF] px-2 py-0.5 text-[10px] font-bold text-[#0439D9]">PRÓXIMO</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-[#011140]">{materiaYGrupo(examen)}</p>
        <p className="text-xs text-[#45628D]">{horaCorta(examen.horaInicio)} – {addMinutes(examen.horaInicio, examen.duracionMinutos)} · {etiquetaAulas(examen)}</p>
      </div>
      <span className="text-xs font-semibold text-[#0439D9]">Abre a las {apertura.hora}</span>
      <Link to={`/dashboard/control/${examen.idExamen}`} className="text-xs font-semibold text-[#0439D9] hover:underline">{accion} →</Link>
    </article>
  )
}

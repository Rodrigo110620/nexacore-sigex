import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, CalendarClock, CalendarDays, ChevronDown, Clock3, GraduationCap, History, MapPin, Search, ShieldCheck, X } from 'lucide-react'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import CronometroExamen from '../../components/examenes/CronometroExamen'
import { BarraDegradado } from '../../components/inicio/Graficas'
import ErrorCarga from '../../components/ui/ErrorCarga'
import FiltroSelect from '../../components/ui/FiltroSelect'
import { useAuth } from '../../context/AuthContext'
import usePanelControl from '../../hooks/usePanelControl'
import useResumenesExamenes from '../../hooks/useResumenesExamenes'
import type { ResumenEstudiantes } from '../../services/controlExamenService'
import type { ExamenDto } from '../../services/examenService'
import { personalDelExamen } from '../../services/personalControlService'
import { addMinutes, estadoDelExamen, etiquetaAulas, fechaLocal, formatFecha, horaCorta, materiaYGrupo } from '../../utils/examenFormat'
import { coincide } from '../../utils/buscar'
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
  // null = automático: plegados si hay algo pendiente hoy; abiertos si ya terminaron todos (no queda la pantalla vacía).
  const [verTerminados, setVerTerminados] = useState<boolean | null>(null)

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
  const terminadosAbiertos = verTerminados ?? (enCurso.length + proximos.length === 0)
  const siguiente = unicos.find((e) => e.fecha > hoy)
  // Historial: los exámenes de días anteriores (los que este usuario controló o supervisó), del más reciente al más antiguo.
  const [parametros, setParametros] = useSearchParams()
  const enHistorial = parametros.get('vista') === 'historial'
  const cambiarVista = (historial: boolean) => setParametros(historial ? { vista: 'historial' } : {}, { replace: true })
  const pasados = useMemo(() => unicos.filter((e) => e.fecha < hoy).reverse(), [unicos, hoy])
  const [verPasados, setVerPasados] = useState(POR_PAGINA_HISTORIAL)
  // Buscador (materia, docente, aula o grupo) y fecha: el historial crece semana tras semana.
  const [buscar, setBuscar] = useState('')
  const [fechaHistorial, setFechaHistorial] = useState('')
  const fechasPasadas = useMemo(() => [...new Set(pasados.map((e) => e.fecha))], [pasados])
  const pasadosFiltrados = pasados.filter((e) => (!fechaHistorial || e.fecha === fechaHistorial)
    && coincide(buscar, e.asignatura, e.docente, e.ambienteNombre, etiquetaAulas(e), e.grupo, e.sigla))
  const pasadosVisibles = pasadosFiltrados.slice(0, verPasados)
  const filtrando = buscar.trim() !== '' || fechaHistorial !== ''
  const { resumenes } = useResumenesExamenes((enHistorial ? pasadosVisibles : deHoy).map((e) => e.idExamen), ahora)
  const accion = registra ? 'Iniciar control' : 'Ver control'
  // Quién está en cada examen: el control ve al docente; el docente ve a su personal de control; el admin, ambos.
  const gestionaTodos = tienePermiso(auth, 'EXAMENES_GESTIONAR_TODOS')
  const esDocente = !gestionaTodos && tienePermiso(auth, 'EXAMENES_GESTIONAR_PROPIOS')
  const verPersonal = gestionaTodos || esDocente
  const personal = usePersonalDeControl(verPersonal ? (enHistorial ? pasadosVisibles : deHoy).map((e) => e.idExamen) : [])
  const quien = { docente: !esDocente, personal: verPersonal ? personal : null }

  return (
    <PanelLayout title="CONTROL DE INGRESO" description="Los exámenes de hoy: entra al control del que está en curso." topBarVariant="control">
      {/* Ancho completo, como el resto de las pantallas del personal (sin columnas vacías a los lados). */}
      <div className="flex w-full flex-col gap-3 px-4 py-3 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:gap-4 sm:px-5 sm:pt-4 min-[960px]:pb-6">
        <div className="flex flex-wrap items-end justify-between gap-x-4 border-b border-[#D8E3F5]">
          <div role="tablist" aria-label="Control" className="grid w-full grid-cols-2 sm:flex sm:w-auto sm:gap-2">
            {[
              { historial: false, texto: `Hoy · ${DIAS_LARGOS[ahora.getDay()]} ${formatFecha(hoy)}`, corto: 'Hoy', icono: CalendarDays },
              { historial: true, texto: 'Historial', corto: 'Historial', icono: History },
            ].map(({ historial, texto, corto, icono: Icono }) => (
              <button key={corto} type="button" role="tab" aria-selected={enHistorial === historial} onClick={() => cambiarVista(historial)}
                className={`-mb-px inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-sm font-semibold transition-colors ${
                  enHistorial === historial ? 'border-[#0439D9] text-[#0439D9]' : 'border-transparent text-[#45628D] hover:border-[#B8CBEF] hover:text-[#011140]'}`}>
                <Icono size={15} aria-hidden="true" className="shrink-0" />
                <span className="sm:hidden">{corto}</span><span className="hidden sm:inline">{texto}</span>
                {historial && examenes && (
                  <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${enHistorial ? 'bg-[#0439D9] text-white' : 'bg-[#EDF2FE] text-[#45628D]'}`}>{pasados.length}</span>
                )}
              </button>
            ))}
          </div>
          {verAgenda && <Link to="/dashboard/examenes" className="hidden pb-3 text-sm font-semibold text-[#0439D9] hover:underline sm:block">Ver todos los exámenes →</Link>}
        </div>

        {error ? <ErrorCarga mensaje={error} onReintentar={recargar} />
          : !examenes ? <p role="status" className="py-10 text-center text-sm text-[#627A9B]">Cargando los exámenes…</p>
          : enHistorial ? (
            pasados.length === 0 ? (
              <section className={`${TARJETA} flex flex-col items-center gap-2 p-8 text-center`}>
                <History size={28} className="text-[#0439D9]" aria-hidden="true" />
                <p className="text-base font-bold text-[#011140]">Aún no hay exámenes pasados</p>
                <p className="text-sm text-[#627A9B]">Cuando termina el día, sus exámenes pasan aquí con su resultado de ingreso.</p>
              </section>
            ) : (
              <>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#627A9B]" aria-hidden="true" />
                  <input type="search" value={buscar} onChange={(ev) => { setBuscar(ev.target.value); setVerPasados(POR_PAGINA_HISTORIAL) }}
                    placeholder="Buscar por materia, docente o aula…" aria-label="Buscar en el historial"
                    className="h-11 w-full rounded-lg border border-[#B8CBEF] bg-white pl-9 pr-9 text-sm text-[#011140] placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9]/30" />
                  {buscar && (
                    <button type="button" onClick={() => setBuscar('')} aria-label="Limpiar búsqueda"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#627A9B] hover:bg-[#F1F6FF]"><X size={15} aria-hidden="true" /></button>
                  )}
                </div>
                <FiltroSelect etiqueta="Fecha" className="sm:w-60" value={fechaHistorial} onChange={(v) => { setFechaHistorial(v); setVerPasados(POR_PAGINA_HISTORIAL) }}>
                  <option value="">Todas las fechas</option>
                  {fechasPasadas.map((f) => <option key={f} value={f}>{DIAS_LARGOS[new Date(`${f}T00:00:00`).getDay()]} {formatFecha(f)}</option>)}
                </FiltroSelect>
              </div>
              {pasadosFiltrados.length === 0 ? (
                <section className={`${TARJETA} flex flex-col items-center gap-2 p-8 text-center`}>
                  <Search size={26} className="text-[#0439D9]" aria-hidden="true" />
                  <p className="text-sm font-semibold text-[#011140]">Sin resultados para los filtros aplicados.</p>
                  {filtrando && (
                    <button type="button" onClick={() => { setBuscar(''); setFechaHistorial('') }}
                      className="text-sm font-semibold text-[#0439D9] hover:underline">Quitar filtros</button>
                  )}
                </section>
              ) : (
              <section aria-label="Historial de exámenes" className={`${TARJETA} overflow-hidden`}>
                <div aria-hidden="true" className={`${COLUMNAS} hidden border-b border-[#EEF2F7] bg-[#F8FAFF] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#627A9B] xl:grid`}>
                  <span>Estado</span><span>Examen</span><span>Horario · Aula</span><span>Ingreso</span><span /><span />
                </div>
                <ul className="divide-y divide-[#EEF2F7]">
                  {pasadosVisibles.map((e, i) => (
                    <Fragment key={e.idExamen}>
                      {(i === 0 || pasadosVisibles[i - 1].fecha !== e.fecha) && (
                        <li className="bg-[#F8FAFC] px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#627A9B]">
                          {DIAS_LARGOS[new Date(`${e.fecha}T00:00:00`).getDay()]} {formatFecha(e.fecha)}
                        </li>
                      )}
                      <FilaExamen examen={e} fase="finalizado" resumen={resumenes[e.idExamen]} accion="Ver control" quien={quien} />
                    </Fragment>
                  ))}
                </ul>
                {pasadosFiltrados.length > verPasados && (
                  <button type="button" onClick={() => setVerPasados((n) => n + POR_PAGINA_HISTORIAL)}
                    className="w-full border-t border-[#EEF2F7] px-4 py-3 text-sm font-semibold text-[#0439D9] hover:bg-[#F8FAFF]">
                    Ver más ({pasadosFiltrados.length - verPasados} restantes)
                  </button>
                )}
              </section>
              )}
              </>
            )
          )
          : <>
            {enCurso.length + proximos.length > 0 && (
              <section aria-label="Exámenes de hoy" className={`${TARJETA} overflow-hidden`}>
                <div aria-hidden="true" className={`${COLUMNAS} hidden border-b border-[#EEF2F7] bg-[#F8FAFF] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#627A9B] xl:grid`}>
                  <span>Estado</span><span>Examen</span><span>Horario · Aula</span><span>Ingreso</span><span>Termina en</span><span />
                </div>
                <ul className="divide-y divide-[#EEF2F7]">
                  {[...enCurso, ...proximos].map((e) => <FilaExamen key={e.idExamen} examen={e} fase={fase(e)} resumen={resumenes[e.idExamen]} accion={accion} quien={quien} />)}
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

            {deHoy.length > 0 && enCurso.length + proximos.length === 0 && (
              <section className={`${TARJETA} flex items-start gap-3 p-4`}>
                <CalendarClock size={22} className="mt-0.5 shrink-0 text-[#0439D9]" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#011140]">Ya terminaron los exámenes de hoy</p>
                  <p className="text-sm text-[#627A9B]">
                    {siguiente ? <>El próximo es <b className="text-[#011140]">{materiaYGrupo(siguiente)}</b>, el {formatFecha(siguiente.fecha)} a las {horaCorta(siguiente.horaInicio)} ({etiquetaAulas(siguiente)}).</> : 'No hay más exámenes programados.'}
                  </p>
                </div>
              </section>
            )}

            {terminados.length > 0 && (
              <section aria-label="Terminados hoy" className={`${TARJETA} overflow-hidden`}>
                <button type="button" aria-expanded={terminadosAbiertos} onClick={() => setVerTerminados(!terminadosAbiertos)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-[#011140] hover:bg-[#F8FAFF]">
                  <ChevronDown size={16} aria-hidden="true" className={`text-[#0439D9] transition-transform duration-200 ${terminadosAbiertos ? 'rotate-180' : ''}`} />
                  Terminados hoy ({terminados.length})
                </button>
                {terminadosAbiertos && (
                  <ul className="divide-y divide-[#EEF2F7] border-t border-[#EEF2F7]">
                    {terminados.map((e) => <FilaExamen key={e.idExamen} examen={e} fase="finalizado" resumen={resumenes[e.idExamen]} accion="Ver control" quien={quien} />)}
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
const POR_PAGINA_HISTORIAL = 15
const COLUMNAS = 'xl:grid xl:grid-cols-[104px_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.4fr)_112px_150px] xl:items-center xl:gap-x-4'
const ESTADO = {
  'en-curso': { texto: 'En curso', clase: 'bg-[#DCFCE7] text-[#15803D]' },
  proximo: { texto: 'Próximo', clase: 'bg-[#E0E9FF] text-[#0439D9]' },
  finalizado: { texto: 'Terminado', clase: 'bg-[#F1F5F9] text-[#475569]' },
} as const

/** Nombres del personal de control de cada examen (null mientras carga o si no se pudo leer). */
function usePersonalDeControl(ids: number[]) {
  const clave = ids.join(',')
  const [personal, setPersonal] = useState<Record<number, string[]>>({})
  useEffect(() => {
    if (!clave) return
    let vigente = true
    void Promise.all(clave.split(',').map(Number).map((id) => personalDelExamen(id)
      .then((lista) => [id, lista.map((p) => `${p.nombre} ${p.apellidos}`.trim())] as const)
      .catch(() => null)))
      .then((filas) => {
        if (vigente) setPersonal(Object.fromEntries(filas.filter((f) => f != null)))
      })
    return () => { vigente = false }
  }, [clave])
  return personal
}

interface Quien { docente: boolean; personal: Record<number, string[]> | null }

/** Debajo del nombre del examen: su docente y/o su personal de control. */
function QuienEsta({ examen, quien }: { examen: ExamenDto; quien: Quien }) {
  const control = quien.personal?.[examen.idExamen]
  if (!quien.docente && !quien.personal) return null
  return (
    <span className="flex min-w-0 flex-col gap-0.5 text-[11px] text-[#45628D] xl:text-xs">
      {quien.docente && examen.docente && (
        <span className="inline-flex min-w-0 items-center gap-1" title={`Docente: ${examen.docente}`}>
          <GraduationCap size={13} className="shrink-0 text-[#0439D9]" aria-hidden="true" />
          <span className="line-clamp-2 break-words xl:truncate">Docente: <b className="font-semibold text-[#011140]">{examen.docente}</b></span>
        </span>
      )}
      {quien.personal && control !== undefined && (
        <span className="inline-flex min-w-0 items-start gap-1" title={control.length ? `Control: ${control.join(', ')}` : undefined}>
          <ShieldCheck size={13} className="mt-px shrink-0 text-[#0439D9]" aria-hidden="true" />
          {control.length
            ? <span className="line-clamp-2 break-words xl:line-clamp-2">Control: <b className="font-semibold text-[#011140]">{control.join(', ')}</b></span>
            : <span className="text-[#B45309]">Sin personal de control asignado</span>}
        </span>
      )}
    </span>
  )
}

function FilaExamen({ examen, fase, resumen, accion, quien }: { examen: ExamenDto; fase: string; resumen: Resumen; accion: string; quien: Quien }) {
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
      <span className="col-start-1 row-start-1 flex min-w-0 flex-col gap-0.5 self-center xl:col-start-auto xl:row-start-auto">
        <b className="line-clamp-2 text-sm text-[#011140] xl:line-clamp-1">{materiaYGrupo(examen)}</b>
        <span className="hidden xl:block"><QuienEsta examen={examen} quien={quien} /></span>
      </span>
      {/* Celular: docente y control en su propia fila, a todo el ancho (el botón no se estira). */}
      <span className="col-span-2 min-w-0 xl:hidden"><QuienEsta examen={examen} quien={quien} /></span>
      <span className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#45628D] xl:col-span-1">
        <span className="xl:hidden">{chip}</span>
        <span className="inline-flex items-center gap-1"><Clock3 size={13} aria-hidden="true" />{horaCorta(examen.horaInicio)} – {addMinutes(examen.horaInicio, examen.duracionMinutos)}</span>
        <span className="inline-flex items-center gap-1"><MapPin size={13} aria-hidden="true" />{etiquetaAulas(examen)}</span>
      </span>
      <span className="min-w-0">{ingreso}</span>
      <span className="justify-self-end xl:justify-self-start">{enCurso ? <CronometroExamen examen={examen} variante="compacto" /> : <span className="text-xs text-[#627A9B]">—</span>}</span>
      <Link to={`/dashboard/control/${examen.idExamen}`} aria-label={`${accion} de ${materiaYGrupo(examen)}`}
        className={`col-start-2 row-start-1 inline-flex min-h-9 items-center self-center justify-center gap-1 justify-self-end whitespace-nowrap rounded-lg px-3 text-xs font-bold xl:col-start-auto xl:row-start-auto xl:min-h-10 xl:text-sm ${
          enCurso ? 'bg-[#0439D9] text-white hover:bg-[#0C41E1]' : 'border border-[#D8E3F5] bg-white text-[#0439D9] hover:bg-[#F1F6FF]'}`}>
        {enCurso ? accion : fase === 'proximo' ? 'Ver' : 'Ver control'} <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </li>
  )
}

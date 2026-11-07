import { useEffect, useState } from 'react'
import { ArrowRight, BookOpen, CalendarDays, Info, LoaderCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import ErrorCarga from '../../components/ui/ErrorCarga'
import { useAuth } from '../../context/AuthContext'
import useEnVivo from '../../hooks/useEnVivo'
import useReloj from '../../hooks/useReloj'
import { listarExamenes, type ExamenDto } from '../../services/examenService'
import { offsetServidorMinutos } from '../../services/tiempoService'
import { etiquetaAulas, formatFecha, horaCorta, materiaYGrupo } from '../../utils/examenFormat'
import useResumenesExamenes from '../../hooks/useResumenesExamenes'
import { obtenerInicioDocente, type InicioDocente } from '../../services/inicioService'
import { BannerDocente, IndicadoresDocente, MisMaterias, RegistrosDocente } from '../../components/inicio/PanelDocente'
import { tienePermiso } from '../../utils/permisos'
import { ordenarPorFase, tiempoExamen } from '../../utils/tiempoExamen'
import ExamenHoyDocenteCard, { botonDocente } from './ExamenHoyDocenteCard'

export default function InicioDocentePage() {
  const auth = useAuth()
  const { nombre } = auth
  const ahora = useReloj(15_000)
  const [examenes, setExamenes] = useState<ExamenDto[]>([])
  const [cargando, setCargando] = useState(true)
  // Sección 18: materias, totales y registros del docente (GET /inicio/docente).
  const [panelDocente, setPanelDocente] = useState<InicioDocente | null>(null)
  const [errorPanel, setErrorPanel] = useState(false)
  const [recargaPanel, setRecargaPanel] = useState(0)
  const [error, setError] = useState('')
  const [recarga, setRecarga] = useState(0)

  useEnVivo((cambio) => cambio.tipo === 'EXAMEN', () => setRecarga((n) => n + 1))

  useEnVivo((cambio) => ['INGRESO', 'EXAMEN', 'HABILITACION'].includes(cambio.tipo), () => setRecargaPanel((n) => n + 1))
  useEffect(() => {
    const id = window.setInterval(() => setRecargaPanel((n) => n + 1), 60_000)
    return () => window.clearInterval(id)
  }, [])
  useEffect(() => {
    let vigente = true
    obtenerInicioDocente()
      .then((d) => { if (vigente) { setPanelDocente(d); setErrorPanel(false) } })
      .catch(() => { if (vigente) setErrorPanel(true) })
    return () => { vigente = false }
  }, [recargaPanel])

  useEffect(() => {
    let vigente = true
    listarExamenes()
      .then((listaExamenes) => {
        if (!vigente) return
        setError('')
        setExamenes(listaExamenes.filter((examen) => examen.estado?.toLowerCase() !== 'cancelado'))
      })
      .catch(() => {
        if (vigente) setError('No se pudieron cargar tus exámenes y grupos.')
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => { vigente = false }
  }, [recarga])

  const offset = offsetServidorMinutos()
  const fechaServidor = new Date(ahora + offset * 60_000)
  const hoy = fechaServidor.toISOString().slice(0, 10)
  const horaActual = fechaServidor.toISOString().slice(11, 16)
  const hora = fechaServidor.getUTCHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'
  const primerNombre = nombre?.trim().split(/\s+/)[0]
  const examenesHoy = ordenarPorFase(examenes.filter((examen) => examen.fecha === hoy), ahora, offset)
    .map((examen) => ({ examen, tiempo: tiempoExamen(examen, ahora, offset) }))
  const enCurso = examenesHoy.filter(({ tiempo }) => tiempo.fase === 'en_curso').length
  const proximo = ordenarPorFase(examenes.filter((examen) => examen.fecha > hoy), ahora, offset)
    .find((examen) => tiempoExamen(examen, ahora, offset).fase === 'programado')
  const puedeControlar = tienePermiso(auth, 'CONTROL_INGRESO_TODOS', 'CONTROL_INGRESO_PROPIOS')
  const puedeProgramar = tienePermiso(auth, 'EXAMENES_GESTIONAR_PROPIOS', 'EXAMENES_GESTIONAR_TODOS')

  const resumenes = useResumenesExamenes(examenesHoy.map(({ examen }) => examen.idExamen), ahora - (ahora % 30_000)).resumenes
  const totalHoy = examenesHoy.reduce((t, { examen }) => {
    const r = resumenes[examen.idExamen]
    return r && r !== 'error' ? { habilitados: t.habilitados + r.habilitados, ingresados: t.ingresados + r.ingresados } : t
  }, { habilitados: 0, ingresados: 0 })
  const proximoHoy = examenesHoy.find(({ tiempo }) => tiempo.fase === 'programado')?.examen

  return (
    <PanelLayout compactDesktop topBarVariant="docenteInicio" title="MI PANEL DOCENTE" description="Tus materias, exámenes y estudiantes">
      <div className="min-h-full bg-[#f2f5fa] text-[#011140]">
        <div className="mx-auto grid max-w-[1500px] gap-[18px] px-[18px] py-5 pb-[calc(4.75rem+env(safe-area-inset-bottom))] min-[960px]:px-[30px] min-[960px]:pb-6">
          {cargando ? (
            <div role="status" className={`${panel} flex min-h-40 items-center justify-center gap-2 text-sm text-[#42618e]`}>
              <LoaderCircle className="animate-spin text-[#0439D9]" size={20} aria-hidden="true" /> Cargando tu panel…
            </div>
          ) : error ? (
            <ErrorCarga mensaje={error} onReintentar={() => { setError(''); setCargando(true); setRecarga((n) => n + 1) }} />
          ) : (
            <>
              {/* Sección 18: banner con el saludo, el resumen del día y el avance de ingreso de hoy. */}
              <BannerDocente nombre={primerNombre} fecha={fechaConDia(hoy, true)} horaActual={horaActual} saludo={saludo}
                materias={panelDocente?.materias.length ?? 0} examenesHoy={examenesHoy.length} enCurso={enCurso}
                ingresados={totalHoy.ingresados} habilitados={totalHoy.habilitados} puedeProgramar={puedeProgramar} />

              {panelDocente && (
                <IndicadoresDocente datos={panelDocente} examenesHoy={examenesHoy.length} enCurso={enCurso}
                  proximoHoy={proximoHoy ? horaCorta(proximoHoy.horaInicio) : null} hora={hora} />
              )}
              {errorPanel && !panelDocente && (
                <ErrorCarga mensaje="No se pudieron cargar tus materias." onReintentar={() => setRecargaPanel((n) => n + 1)} />
              )}

              {/* Sección 15 (DASH-01): las tarjetas de los exámenes de hoy con sus contadores en vivo. */}
              {examenesHoy.length ? (
                <section aria-labelledby="examenes-hoy">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <h2 id="examenes-hoy" className="text-xs font-bold uppercase">Tus exámenes de hoy</h2>
                    <p className="hidden text-xs text-[#526e97] min-[960px]:block">Los contadores se actualizan solos</p>
                  </div>
                  <div className="grid gap-[18px] min-[960px]:grid-cols-2">
                    {examenesHoy.map(({ examen, tiempo }) => (
                      <ExamenHoyDocenteCard
                        key={`${examen.idExamen}-${examen.idParalelo}`}
                        examen={examen}
                        tiempo={tiempo}
                        horaActual={horaActual}
                        puedeControlar={puedeControlar}
                      />
                    ))}
                  </div>
                </section>
              ) : (
                <section className={`${panel} flex flex-col items-center gap-3 px-5 py-6 text-center min-[960px]:min-h-[160px] min-[960px]:justify-center`} aria-labelledby="sin-examenes">
                  <span className="grid size-14 place-items-center rounded-full bg-[#edf2fe] text-[#0439D9] min-[960px]:size-12"><CalendarDays size={25} aria-hidden="true" /></span>
                  <h2 id="sin-examenes" className="text-lg font-bold leading-tight">No tienes exámenes hoy</h2>
                  <p className="max-w-4xl text-sm leading-tight text-[#42618e]">
                    {proximo
                      ? `Tu próximo examen: ${materiaYGrupo(proximo)} · ${fechaConDia(proximo.fecha)} · ${horaCorta(proximo.horaInicio)}, ${etiquetaAulas(proximo)}. Ese día verás aquí los contadores en vivo.`
                      : 'Por ahora no tienes próximos exámenes programados.'}
                  </p>
                  <Link to="/dashboard/examenes" className={`${botonDocente} px-4 text-sm`}>Ver mis exámenes <ArrowRight size={17} aria-hidden="true" /></Link>
                </section>
              )}

              {/* Sección 18: sus materias y sus últimos registros. */}
              {panelDocente && (panelDocente.materias.length === 0 ? (
                <section className={`${panel} flex flex-col items-center gap-3 px-5 py-8 text-center`} aria-labelledby="sin-materias">
                  <span className="grid size-14 place-items-center rounded-full bg-[#edf2fe] text-[#0439D9]"><BookOpen size={25} aria-hidden="true" /></span>
                  <h2 id="sin-materias" className="text-lg font-bold">Aún no tienes materias asignadas</h2>
                  <p className="max-w-md text-sm text-[#42618e]">El administrador debe asignarte tus materias para que puedas programar exámenes y ver a tus estudiantes.</p>
                  <p className="inline-flex items-center gap-1.5 rounded-lg bg-[#edf2fe] px-3 py-2 text-xs font-semibold text-[#0439D9]"><Info size={14} aria-hidden="true" /> Contacta al administrador del sistema.</p>
                </section>
              ) : (
                <div className="grid gap-[18px] min-[1100px]:grid-cols-[minmax(0,1fr)_380px]">
                  <MisMaterias datos={panelDocente} hoy={hoy} horaActual={horaActual} puedeProgramar={puedeProgramar} />
                  <RegistrosDocente registros={panelDocente.recientes} />
                </div>
              ))}
            </>
          )}
        </div>
      </div>
      <MobileBottomNav />
    </PanelLayout>
  )
}

const panel = 'rounded-[14px] border border-[#e1e8f2] bg-white shadow-sm'
const diaSemana = new Intl.DateTimeFormat('es-BO', { weekday: 'long', timeZone: 'UTC' })

function fechaConDia(fecha: string, mayuscula = false) {
  const dia = diaSemana.format(new Date(`${fecha}T00:00:00Z`))
  return `${mayuscula ? dia[0].toUpperCase() + dia.slice(1) : dia} ${formatFecha(fecha)}`
}

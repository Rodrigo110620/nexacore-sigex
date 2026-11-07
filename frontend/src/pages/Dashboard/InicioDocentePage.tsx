import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowRight, CalendarDays, ChevronDown, LoaderCircle } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import ErrorCarga from '../../components/ui/ErrorCarga'
import { useAuth } from '../../context/AuthContext'
import useEnVivo from '../../hooks/useEnVivo'
import useReloj from '../../hooks/useReloj'
import { getFacultades } from '../../services/estudianteService'
import { listarExamenes, type ExamenDto } from '../../services/examenService'
import { offsetServidorMinutos } from '../../services/tiempoService'
import type { FacultadOption } from '../../types/estudiante'
import { etiquetaAulas, formatFecha, horaCorta } from '../../utils/examenFormat'
import { tienePermiso } from '../../utils/permisos'
import { ordenarPorFase, tiempoExamen } from '../../utils/tiempoExamen'
import ExamenHoyDocenteCard, { botonDocente } from './ExamenHoyDocenteCard'

export default function InicioDocentePage() {
  const auth = useAuth()
  const { nombre } = auth
  const ahora = useReloj(15_000)
  const navigate = useNavigate()
  const [facultades, setFacultades] = useState<FacultadOption[]>([])
  const [examenes, setExamenes] = useState<ExamenDto[]>([])
  const [idFacultad, setIdFacultad] = useState('')
  const [asignatura, setAsignatura] = useState('')
  const [grupo, setGrupo] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [recarga, setRecarga] = useState(0)

  useEnVivo((cambio) => cambio.tipo === 'EXAMEN', () => setRecarga((n) => n + 1))

  useEffect(() => {
    const controller = new AbortController()
    getFacultades(controller.signal)
      .then((listaFacultades) => {
        if (controller.signal.aborted) return
        setFacultades(listaFacultades)
        const cienciasYTecnologia = listaFacultades.find((facultad) =>
          facultad.nombre.toLocaleLowerCase('es').includes('ciencias y tecnolog'),
        )
        setIdFacultad(String(cienciasYTecnologia?.id ?? listaFacultades[0]?.id ?? ''))
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [])

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

  const materias = useMemo(() => {
    const unicas = new Map<string, string>()
    examenes.forEach((examen) => unicas.set(examen.asignatura, examen.sigla ? `${examen.asignatura} (${examen.sigla})` : examen.asignatura))
    return [...unicas.entries()].map(([valor, etiqueta]) => ({ valor, etiqueta })).sort((a, b) => a.etiqueta.localeCompare(b.etiqueta))
  }, [examenes])

  const grupos = useMemo(
    () => [...new Map(examenes
      .filter((examen) => asignatura && examen.asignatura === asignatura)
      .map((examen) => [examen.idParalelo, examen])).values()],
    [asignatura, examenes],
  )

  const seleccionarMateria = (valor: string) => {
    setAsignatura(valor)
    setGrupo('')
  }

  const irAMisExamenes = () => {
    if (!grupo) return
    navigate(`/dashboard/examenes?paralelo=${encodeURIComponent(grupo)}`)
  }

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
  const resumenDia = examenesHoy.length
    ? `${examenesHoy.length === 1 ? '1 examen hoy' : `${examenesHoy.length} exámenes hoy`}, ${enCurso} en curso`
    : 'no tienes exámenes hoy'
  const puedeControlar = tienePermiso(auth, 'CONTROL_INGRESO_TODOS', 'CONTROL_INGRESO_PROPIOS')

  return (
    <PanelLayout compactDesktop topBarVariant="docenteInicio" title="INICIO" description="Tus exámenes de hoy">
      <div className="min-h-full bg-[#f2f5fa] text-[#011140]">
        <div className="mx-auto grid max-w-[1500px] gap-[18px] px-[18px] py-5 pb-[calc(4.75rem+env(safe-area-inset-bottom))] min-[960px]:px-[30px] min-[960px]:pb-6">
          <header>
            <h1 className="text-[25px] font-extrabold leading-tight tracking-tight">¡{saludo}{primerNombre ? `, ${primerNombre}` : ''}!</h1>
            <p className="mt-1 text-sm text-[#42618e]">{fechaConDia(hoy, true)}{!cargando && !error && ` · ${resumenDia}`}</p>
          </header>

          {cargando ? (
            <div role="status" className={`${panel} flex min-h-40 items-center justify-center gap-2 text-sm text-[#42618e]`}>
              <LoaderCircle className="animate-spin text-[#0439D9]" size={20} aria-hidden="true" /> Cargando tus exámenes…
            </div>
          ) : error ? (
            <ErrorCarga mensaje={error} onReintentar={() => { setError(''); setCargando(true); setRecarga((n) => n + 1) }} />
          ) : examenesHoy.length ? (
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
            <section className={`${panel} flex flex-col items-center gap-3 px-5 py-6 text-center min-[960px]:min-h-[206px] min-[960px]:justify-center`} aria-labelledby="sin-examenes">
              <span className="grid size-14 place-items-center rounded-full bg-[#edf2fe] text-[#0439D9] min-[960px]:size-12"><CalendarDays size={25} aria-hidden="true" /></span>
              <h2 id="sin-examenes" className="text-lg font-bold leading-tight">No tienes exámenes hoy</h2>
              <p className="max-w-4xl text-sm leading-tight text-[#42618e]">
                {proximo
                  ? `Tu próximo examen: ${proximo.asignatura} · ${fechaConDia(proximo.fecha)} · ${horaCorta(proximo.horaInicio)}, ${etiquetaAulas(proximo)}. Ese día verás aquí los contadores en vivo.`
                  : 'Por ahora no tienes próximos exámenes programados.'}
              </p>
              <Link to="/dashboard/examenes" className={`${botonDocente} px-4 text-sm`}>Ver mis exámenes <ArrowRight size={17} aria-hidden="true" /></Link>
            </section>
          )}

          {!cargando && !error && (
            <section aria-labelledby="docente-grupo-title" className={`${panel} p-[18px] sm:p-[19px]`}>
              <div className="flex items-center justify-between gap-3">
                <h2 id="docente-grupo-title" className="text-lg font-bold leading-tight">¿Qué grupo deseas gestionar hoy?</h2>
                <span className="shrink-0 rounded-md bg-[#eaf0f4] px-2.5 py-1 text-[10px] font-bold text-[#435166]">YA EXISTE</span>
              </div>
              <div className="mt-3 grid gap-3 min-[960px]:grid-cols-3">
                <Selector label="1. Facultad" name="Facultad" value={idFacultad} onChange={setIdFacultad} disabled={!facultades.length}>
                  {facultades.length === 0 && <option value="">Sin facultades disponibles</option>}
                  {facultades.map((facultad) => <option key={facultad.id} value={facultad.id}>{facultad.nombre}</option>)}
                </Selector>
                <Selector label="2. Materia" name="Materia" value={asignatura} onChange={seleccionarMateria} disabled={!materias.length}>
                  <option value="">{materias.length === 0 ? 'Sin materias asignadas' : 'Selecciona una materia'}</option>
                  {materias.map((materia) => <option key={materia.valor} value={materia.valor}>{materia.etiqueta}</option>)}
                </Selector>
                <Selector label="3. Grupo" name="Grupo" value={grupo} onChange={setGrupo} disabled={!grupos.length}>
                  <option value="">{grupos.length === 0 ? 'Sin grupos disponibles' : 'Selecciona un grupo'}</option>
                  {grupos.map((examen) => <option key={examen.idParalelo} value={examen.idParalelo}>Grupo {examen.grupo ?? examen.idParalelo}</option>)}
                </Selector>
              </div>
              {examenes.length === 0 && <p className="mt-3 text-sm text-[#42618e]">Aún no tienes exámenes o grupos asignados.</p>}
              <div className={grupo || !examenes.length ? 'mt-3 flex justify-end' : 'hidden'}>
                <button type="button" onClick={irAMisExamenes} disabled={!grupo} className={`${botonDocente} w-full disabled:opacity-50 sm:w-auto`}>
                  Ir a mis exámenes de este grupo <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </section>
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

function Selector({ label, name, value, onChange, disabled, children }: {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
  children: ReactNode
}) {
  return (
    <label className="min-w-0">
      <span className="mb-1 block text-xs font-bold uppercase">{label}</span>
      <span className="relative block">
        <select aria-label={name} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}
          className="h-11 w-full appearance-none rounded-md border border-[#d5e2fa] bg-white pl-3 pr-8 text-sm outline-none focus:ring-2 focus:ring-[#0439D9] disabled:bg-slate-50 min-[960px]:h-9">
          {children}
        </select>
        <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#42618e]" />
      </span>
    </label>
  )
}

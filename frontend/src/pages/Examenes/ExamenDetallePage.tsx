import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock,
  FileText,
  Hourglass,
  LoaderCircle,
  MapPin,
  Monitor,
  Pencil,
  ShieldCheck,
  Trash2,
  UserRoundCheck,
  Users,
} from 'lucide-react'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import EditExamenModal from '../../components/examenes/EditExamenModal'
import EstudiantesHabilitadosTab from '../../components/examenes/EstudiantesHabilitadosTab'
import { useAuth } from '../../context/AuthContext'
import { getEstudianteById } from '../../services/estudianteService'
import { cancelarExamen, listarExamenes, type ExamenDto } from '../../services/examenService'
import {
  addMinutes,
  codigoExamen,
  estadoLabel,
  formatFecha,
  horaCorta,
  initialsOfName,
  semanaDelAnio,
} from '../../utils/examenFormat'

const PARTICULAR_PALETTES = [
  'border-[#BFDBFE] bg-[#EAF2FF] text-[#2563EB]',
  'border-[#E9D5FF] bg-[#F5F3FF] text-[#7C3AED]',
  'border-[#99F6E4] bg-[#ECFDF5] text-[#0F766E]',
] as const
const ADAPTACION_PALETTES = [
  'bg-[#EAF2FF] text-[#2563EB]',
  'bg-[#F5F3FF] text-[#7C3AED]',
  'bg-[#ECFDF5] text-[#0F766E]',
] as const

function InfoChip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex min-w-0 items-center gap-2 rounded-lg border border-[#EDF1F7] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#011140] min-[960px]:py-2">
      <span className="shrink-0 text-[#627A9B]">{icon}</span>
      <span className="truncate">{children}</span>
    </li>
  )
}

function EstadoPill({ cancelado, label }: { cancelado: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
      cancelado ? 'bg-[#FDECEC] text-[#B91C1C]' : 'bg-[#DCFCE7] text-[#166534]'
    }`}>
      <span aria-hidden="true" className="relative inline-flex h-2 w-2 shrink-0">
        {!cancelado && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-60 motion-reduce:hidden" />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            cancelado ? 'bg-[#B91C1C]' : 'bg-[#16A34A] motion-safe:animate-pulse'
          }`}
        />
      </span>
      {label}
    </span>
  )
}

function DatoTile({ label, value, hint, hintClass = 'text-gray-500', className = '' }: {
  label: string
  value: string
  hint?: ReactNode
  hintClass?: string
  className?: string
}) {
  return (
    <div className={`rounded-lg border border-[#EDF1F7] bg-[#F8FAFC] px-3.5 py-3 min-[960px]:px-2.5 min-[960px]:py-2 ${className}`}>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">{label}</dt>
      <dd className="mt-0.5 truncate text-base font-bold text-[#011140]">{value}</dd>
      {hint && <dd className={`truncate text-xs min-[960px]:text-[11px] ${hintClass}`}>{hint}</dd>}
    </div>
  )
}

export default function ExamenDetallePage() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const idExamen = Number(useParams().idExamen)
  const idParalelo = Number(useParams().idParalelo)
  const [examen, setExamen] = useState<ExamenDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'normas' | 'habilitados'>('normas')
  const [editOpen, setEditOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [habilitadosCount, setHabilitadosCount] = useState<number | null>(null)
  /** Código y CI de los estudiantes con norma particular, por idEstudiante. */
  const [datosNormas, setDatosNormas] = useState<Map<number, { codigoSis: string; ci: string }>>(new Map())

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const lista = await listarExamenes()
      const found = lista.find((e) => e.idExamen === idExamen && e.idParalelo === idParalelo) ?? null
      setExamen(found)
      if (!found) setError('No se encontró el examen.')
    } catch {
      setError('No se pudo cargar el examen.')
    } finally {
      setLoading(false)
    }
  }, [idExamen, idParalelo])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(handle)
  }, [load])

  useEffect(() => {
    const ids = [...new Set(
      (examen?.normasParticulares ?? [])
        .map((n) => n.idEstudiante)
        .filter((id): id is number => typeof id === 'number'),
    )]
    if (ids.length === 0) return
    const controller = new AbortController()
    // Si alguno falla se muestra solo el nombre de ese estudiante.
    void Promise.allSettled(ids.map((id) => getEstudianteById(id, controller.signal))).then((respuestas) => {
      if (controller.signal.aborted) return
      const datos = new Map<number, { codigoSis: string; ci: string }>()
      respuestas.forEach((r) => {
        if (r.status === 'fulfilled') datos.set(r.value.id, { codigoSis: r.value.codigoSis, ci: r.value.ci })
      })
      setDatosNormas(datos)
    })
    return () => controller.abort()
  }, [examen])

  const horaFin = examen ? addMinutes(examen.horaInicio, examen.duracionMinutos) : '—'
  const semana = examen ? semanaDelAnio(examen.fecha) : null
  const cancelado = examen?.estado === 'cancelado'

  return (
    <PanelLayout compactDesktop>
      <div
        className="min-h-full pb-[calc(4.5rem+env(safe-area-inset-bottom))] min-[960px]:pb-0"
        style={{
          background:
            'linear-gradient(to bottom, #FFFFFF 0%, #F8FBFF 28%, #E9F1FF 65%, #DCE9FF 100%)',
        }}
      >
        <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-6">
          <Link
            to="/dashboard/examenes"
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0439D9] hover:text-[#032db0]"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Volver a Exámenes
          </Link>

          {loading ? (
            <div role="status" aria-live="polite" className="rounded-lg border border-[#B8CBEF] bg-[#E9F1FF] px-6 py-12 text-center text-[#011140]">
              <LoaderCircle className="mx-auto animate-spin text-[#0439D9]" size={30} aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold">Cargando examen...</p>
            </div>
          ) : error || !examen ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error || 'No se encontró el examen.'}
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              <section className="rounded-2xl border border-[#D8E3F5] bg-white p-4 shadow-sm sm:px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-xl font-bold text-[#011140] sm:text-2xl">{examen.asignatura}</h1>
                      <span className="rounded-md border border-[#BFD2F8] bg-[#EAF2FF] px-2 py-0.5 text-[11px] font-semibold text-[#0439D9] min-[960px]:border-[#D8E3F5] min-[960px]:bg-[#F8FAFC] min-[960px]:text-[#627A9B]">
                        {codigoExamen(examen)}
                      </span>
                      <span className="hidden min-[960px]:inline-flex">
                        <EstadoPill cancelado={cancelado} label={estadoLabel(examen.estado)} />
                      </span>
                    </div>
                    <div className="mt-2 min-[960px]:hidden">
                      <EstadoPill cancelado={cancelado} label={estadoLabel(examen.estado)} />
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="hidden shrink-0 items-center gap-2 min-[960px]:flex">
                      <button
                        type="button"
                        onClick={() => setEditOpen(true)}
                        className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[#D8E3F5] bg-white px-4 text-sm font-semibold text-[#011140] hover:bg-[#EEF3FB]"
                      >
                        <Pencil size={14} aria-hidden="true" />
                        Editar Examen
                      </button>
                      {!cancelado && (
                        <button
                          type="button"
                          onClick={() => setCancelOpen(true)}
                          className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-red-100 bg-red-50 px-4 text-sm font-semibold text-red-600 hover:bg-red-100"
                        >
                          <Trash2 size={15} aria-hidden="true" />
                          Eliminar
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <ul className="mt-3 grid grid-cols-2 gap-2 border-t border-[#EDF1F7] pt-3 min-[960px]:flex min-[960px]:flex-wrap min-[960px]:border-t-0 min-[960px]:pt-0">
                  <InfoChip icon={<CalendarDays size={15} aria-hidden="true" />}>{formatFecha(examen.fecha)}</InfoChip>
                  <InfoChip icon={<Clock size={15} aria-hidden="true" />}>{horaCorta(examen.horaInicio)} hrs</InfoChip>
                  <InfoChip icon={<MapPin size={15} className="text-red-500" aria-hidden="true" />}>{examen.ambienteNombre}</InfoChip>
                  <InfoChip icon={<Hourglass size={15} aria-hidden="true" />}>{examen.duracionMinutos} min</InfoChip>
                </ul>
                {isAdmin && (
                  <div className="mt-3 grid grid-cols-2 gap-2 min-[960px]:hidden">
                    <button
                      type="button"
                      onClick={() => setEditOpen(true)}
                      className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#C9D7EC] bg-white text-sm font-semibold text-[#011140] hover:bg-[#EEF3FB] ${cancelado ? 'col-span-2' : ''}`}
                    >
                      <Pencil size={15} aria-hidden="true" />
                      Editar Examen
                    </button>
                    {!cancelado && (
                      <button
                        type="button"
                        onClick={() => setCancelOpen(true)}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 text-sm font-semibold text-red-600 hover:bg-red-100"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                        Eliminar
                      </button>
                    )}
                  </div>
                )}
              </section>

              <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
                <div role="tablist" className="flex min-w-max gap-6 border-b border-[#EDF1F7] px-1">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'normas'}
                    onClick={() => setTab('normas')}
                    className={`inline-flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold ${
                      tab === 'normas'
                        ? 'border-[#0439D9] text-[#0439D9]'
                        : 'border-transparent text-[#627A9B] hover:text-[#011140]'
                    }`}
                  >
                    <FileText size={16} aria-hidden="true" />
                    Configuración y Normas
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'habilitados'}
                    onClick={() => setTab('habilitados')}
                    className={`inline-flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold ${
                      tab === 'habilitados'
                        ? 'border-[#0439D9] text-[#0439D9]'
                        : 'border-transparent text-[#627A9B] hover:text-[#011140]'
                    }`}
                  >
                    <Users size={16} aria-hidden="true" />
                    Estudiantes Habilitados
                    {habilitadosCount !== null && (
                      <span className="rounded-full bg-[#E9F1FF] px-2 py-0.5 text-[11px] font-bold text-[#0439D9]">
                        {habilitadosCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {tab === 'normas' ? (
                <div className="flex flex-col gap-4">
                  <section className="rounded-2xl border border-[#D8E3F5] bg-white p-4 shadow-sm sm:px-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#E9F1FF] text-[#0439D9]">
                          <Monitor size={15} aria-hidden="true" />
                        </span>
                        <h2 className="text-xs font-bold uppercase tracking-wide text-[#011140] sm:text-sm">
                          Datos generales del examen
                        </h2>
                      </div>
                      <span className="shrink-0 rounded-md border border-[#D8E3F5] bg-[#F8FAFC] px-2 py-0.5 text-[10px] font-semibold text-[#627A9B]">
                        CONF-{codigoExamen(examen)}
                      </span>
                    </div>
                    <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      <DatoTile
                        className="sm:col-span-2 lg:col-span-1"
                        label="Asignatura"
                        value={examen.asignatura}
                        hint={`Código: ${examen.sigla || '—'}${examen.docente ? ` · ${examen.docente}` : ''}`}
                      />
                      <DatoTile
                        label="Fecha programada"
                        value={formatFecha(examen.fecha)}
                        hint={semana ? `Semana ${semana}` : undefined}
                        hintClass="font-medium text-[#15803D]"
                      />
                      <DatoTile
                        label="Horario y duración"
                        value={`${horaCorta(examen.horaInicio)} – ${horaFin}`}
                        hint={`${examen.duracionMinutos} minutos continuos`}
                      />
                      <DatoTile
                        className="sm:col-span-2 lg:col-span-1"
                        label="Ambiente asignado"
                        value={examen.ambienteNombre}
                        hint={
                          <span className="inline-flex items-center gap-1">
                            <Check size={12} aria-hidden="true" /> Sin conflictos
                          </span>
                        }
                        hintClass="font-medium text-[#15803D]"
                      />
                    </dl>
                  </section>

                  <section className="rounded-2xl border border-[#D8E3F5] bg-white p-4 shadow-sm sm:px-5">
                    <div className="mb-1 flex items-center gap-2.5">
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#E9F1FF] text-[#0439D9]">
                        <ShieldCheck size={15} aria-hidden="true" />
                      </span>
                      <h2 className="text-sm font-bold uppercase tracking-wide text-[#011140]">
                        Normas generales del examen
                      </h2>
                    </div>
                    <p className="mb-3 text-xs text-[#627A9B]">
                      Reglamento y directivas obligatorias para todos los postulantes habilitados.
                    </p>
                    {examen.normasGenerales?.length ? (
                      <ul className="flex flex-col gap-2">
                        {examen.normasGenerales.map((norma, index) => (
                          <li
                            key={`${index}-${norma}`}
                            className="flex items-start gap-3 rounded-lg border border-[#EDF1F7] bg-[#F8FAFC] px-3 py-3 text-sm text-[#011140] min-[960px]:bg-white min-[960px]:py-2.5"
                          >
                            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#FDE68A] bg-[#FEF3C7] text-[11px] font-bold text-[#B45309]">
                              {index + 1}
                            </span>
                            <span className="leading-relaxed">{norma}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">Sin normas generales registradas.</p>
                    )}
                  </section>

                  <section className="rounded-2xl border border-[#D8E3F5] bg-white p-4 shadow-sm sm:px-5">
                    <div className="mb-1 flex items-center gap-2.5">
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#E9F1FF] text-[#0439D9]">
                        <UserRoundCheck size={15} aria-hidden="true" />
                      </span>
                      <h2 className="text-sm font-bold uppercase tracking-wide text-[#011140]">
                        Normas particulares por estudiante
                      </h2>
                    </div>
                    <p className="mb-3 text-xs text-[#627A9B]">
                      Excepciones y adaptaciones curriculares o de accesibilidad asignadas a postulantes específicos.
                    </p>
                    {examen.normasParticulares?.length ? (
                      <ul className="flex flex-col gap-2">
                        {examen.normasParticulares.map((norma, index) => {
                          const datos = norma.idEstudiante != null ? datosNormas.get(norma.idEstudiante) : undefined
                          return (
                            <li
                              key={`${norma.estudiante}-${index}`}
                              className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 rounded-lg border border-[#EDF1F7] bg-[#F8FAFC] px-3 py-3 min-[960px]:bg-white"
                            >
                              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold min-[960px]:row-span-2 ${PARTICULAR_PALETTES[index % PARTICULAR_PALETTES.length]}`}>
                                {initialsOfName(norma.estudiante)}
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[#011140]">{norma.estudiante}</p>
                                {datos && (
                                  <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-[#627A9B]">
                                    <span className="rounded bg-[#EEF2F7] px-1.5 py-0.5 font-mono text-[#344054]">Cód: {datos.codigoSis}</span>
                                    <span aria-hidden="true">•</span>
                                    <span>CI: {datos.ci}</span>
                                  </p>
                                )}
                              </div>
                              <div className="col-span-2 mt-2 flex items-start gap-2 min-[960px]:col-span-1 min-[960px]:col-start-2 min-[960px]:mt-1.5">
                                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide min-[960px]:text-[9px] ${ADAPTACION_PALETTES[index % ADAPTACION_PALETTES.length]}`}>
                                  Adaptación
                                </span>
                                <p className="text-xs leading-relaxed text-[#011140]">{norma.texto}</p>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">Sin normas particulares.</p>
                    )}
                  </section>
                </div>
              ) : (
                <EstudiantesHabilitadosTab
                  idExamen={examen.idExamen}
                  idParalelo={examen.idParalelo}
                  isAdmin={isAdmin}
                  examenResumen={`${examen.asignatura} · ${formatFecha(examen.fecha)} · ${examen.ambienteNombre}`}
                  onCountChange={setHabilitadosCount}
                />
              )}
            </div>
          )}
        </div>
        <MobileBottomNav />
        <EditExamenModal
          isOpen={editOpen}
          examen={examen}
          onClose={() => setEditOpen(false)}
          onSuccess={(actualizado) => {
            setEditOpen(false)
            if (actualizado.idParalelo !== idParalelo) {
              navigate(`/dashboard/examenes/${actualizado.idExamen}/${actualizado.idParalelo}`, { replace: true })
            } else {
              void load()
            }
          }}
        />
        {cancelOpen && examen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-2xl border border-[#D8E3F5] bg-white p-6 shadow-xl">
              <h3 className="text-base font-bold text-[#011140]">¿Eliminar examen?</h3>
              <p className="mt-2 text-sm text-gray-600">
                Se marcará como <span className="font-semibold text-red-600">cancelado</span> el examen de{' '}
                <span className="font-semibold">{examen.asignatura}</span> ({formatFecha(examen.fecha)}).
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={() => setCancelOpen(false)}
                  className="flex-1 rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-medium text-[#011140] hover:bg-gray-50 disabled:opacity-50"
                >
                  Volver
                </button>
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={async () => {
                    setCancelling(true)
                    try {
                      await cancelarExamen(examen.idExamen, examen.idParalelo)
                      navigate('/dashboard/examenes', { replace: true })
                    } catch {
                      setError('No se pudo cancelar el examen.')
                      setCancelOpen(false)
                    } finally {
                      setCancelling(false)
                    }
                  }}
                  className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {cancelling ? 'Eliminando…' : 'Sí, eliminar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PanelLayout>
  )
}

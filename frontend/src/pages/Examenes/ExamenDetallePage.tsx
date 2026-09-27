import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Clock,
  FileText,
  MapPin,
  Pencil,
  Shield,
  Trash2,
  Users,
} from 'lucide-react'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import EditExamenModal from '../../components/examenes/EditExamenModal'
import { useAuth } from '../../context/AuthContext'
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

  const horaFin = examen ? addMinutes(examen.horaInicio, examen.duracionMinutos) : '—'
  const semana = examen ? semanaDelAnio(examen.fecha) : null

  return (
    <PanelLayout compactDesktop>
      <div
        className="min-h-full pb-[calc(4.5rem+env(safe-area-inset-bottom))] min-[960px]:pb-0"
        style={{
          background:
            'linear-gradient(to bottom, #FFFFFF 0%, #F8FBFF 28%, #E9F1FF 65%, #DCE9FF 100%)',
        }}
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
          <Link
            to="/dashboard/examenes"
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#3D70C9] hover:text-[#0439D9]"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Volver a Exámenes
          </Link>

          {loading ? (
            <p className="rounded-xl border border-[#D8E3F5] bg-white px-6 py-12 text-center text-sm text-gray-500">
              Cargando detalle…
            </p>
          ) : error || !examen ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error || 'No se encontró el examen.'}
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              <section className="rounded-xl border border-[#D8E3F5] bg-white px-5 py-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-xl font-bold text-[#011140] sm:text-2xl">{examen.asignatura}</h1>
                      <span className="rounded-md bg-[#F1F6FF] px-2 py-0.5 text-xs font-semibold text-[#0439D9]">
                        {codigoExamen(examen)}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                        examen.estado === 'cancelado' ? 'text-red-600' : 'text-[#15803D]'
                      }`}>
                        <span className={`h-2 w-2 rounded-full ${
                          examen.estado === 'cancelado' ? 'bg-red-500' : 'bg-[#22C55E]'
                        }`} aria-hidden="true" />
                        {estadoLabel(examen.estado)}
                      </span>
                    </div>
                    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#627A9B]">
                      <li className="inline-flex items-center gap-1.5">
                        <CalendarDays size={15} aria-hidden="true" />
                        {formatFecha(examen.fecha)}
                      </li>
                      <li className="inline-flex items-center gap-1.5">
                        <Clock size={15} aria-hidden="true" />
                        {horaCorta(examen.horaInicio)}
                      </li>
                      <li className="inline-flex items-center gap-1.5">
                        <MapPin size={15} aria-hidden="true" />
                        {examen.ambienteNombre}
                      </li>
                      <li className="inline-flex items-center gap-1.5">
                        <Clock size={15} aria-hidden="true" />
                        {examen.duracionMinutos} min
                      </li>
                    </ul>
                  </div>
                  {isAdmin && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setEditOpen(true)}
                        className="inline-flex h-10 items-center gap-2 rounded-md border border-[#D8E3F5] bg-white px-3 text-sm font-semibold text-[#011140] hover:bg-[#F8FAFC]"
                      >
                        <Pencil size={15} aria-hidden="true" />
                        Editar examen
                      </button>
                      {examen.estado !== 'cancelado' && (
                        <button
                          type="button"
                          onClick={() => setCancelOpen(true)}
                          className="inline-flex h-10 items-center gap-2 rounded-md border border-red-100 bg-white px-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={15} aria-hidden="true" />
                          Eliminar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </section>

              <div className="flex gap-6 border-b border-[#EDF1F7] px-1">
                <button
                  type="button"
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
                  onClick={() => setTab('habilitados')}
                  className={`inline-flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold ${
                    tab === 'habilitados'
                      ? 'border-[#0439D9] text-[#0439D9]'
                      : 'border-transparent text-[#627A9B] hover:text-[#011140]'
                  }`}
                >
                  <Users size={16} aria-hidden="true" />
                  Estudiantes Habilitados (0)
                </button>
              </div>

              {tab === 'normas' ? (
                <div className="flex flex-col gap-4">
                  <section className="rounded-xl border border-[#D8E3F5] bg-white px-5 py-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <BookOpen size={16} className="text-[#0439D9]" aria-hidden="true" />
                        <h2 className="text-sm font-bold uppercase tracking-wide text-[#011140]">
                          Datos generales del examen
                        </h2>
                      </div>
                      <span className="text-[11px] font-semibold text-[#627A9B]">
                        {codigoExamen(examen)}
                      </span>
                    </div>
                    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-[#627A9B]">Asignatura</dt>
                        <dd className="mt-1 text-sm font-semibold text-[#011140]">{examen.asignatura}</dd>
                        <dd className="text-xs text-gray-500">Código: {examen.sigla || '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-[#627A9B]">Fecha programada</dt>
                        <dd className="mt-1 text-sm font-semibold text-[#011140]">{formatFecha(examen.fecha)}</dd>
                        <dd className="text-xs text-gray-500">
                          {semana ? `Semana ${semana}` : '—'}
                          {examen.docente ? ` · ${examen.docente}` : ''}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-[#627A9B]">Horario y duración</dt>
                        <dd className="mt-1 text-sm font-semibold text-[#011140]">
                          {horaCorta(examen.horaInicio)} - {horaFin}
                        </dd>
                        <dd className="text-xs text-gray-500">{examen.duracionMinutos} minutos continuos</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-[#627A9B]">Ambiente asignado</dt>
                        <dd className="mt-1 text-sm font-semibold text-[#011140]">{examen.ambienteNombre}</dd>
                        <dd className="text-xs text-[#15803D]">Aula asignada</dd>
                      </div>
                    </dl>
                  </section>

                  <section className="rounded-xl border border-[#D8E3F5] bg-white px-5 py-4 shadow-sm">
                    <div className="mb-1 flex items-center gap-2">
                      <Shield size={16} className="text-[#0439D9]" aria-hidden="true" />
                      <h2 className="text-sm font-bold uppercase tracking-wide text-[#011140]">
                        Normas generales del examen
                      </h2>
                    </div>
                    <p className="mb-3 text-xs text-[#627A9B]">
                      Reglamento y directrices obligatorias para todos los postulantes habilitados.
                    </p>
                    {examen.normasGenerales?.length ? (
                      <ul className="flex flex-col gap-2">
                        {examen.normasGenerales.map((norma, index) => (
                          <li
                            key={`${index}-${norma}`}
                            className="flex items-start gap-3 rounded-lg border border-[#EDF1F7] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#011140]"
                          >
                            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EAF2FF] text-[11px] font-bold text-[#0439D9]">
                              {index + 1}
                            </span>
                            <span>{norma}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">Sin normas generales registradas.</p>
                    )}
                  </section>

                  <section className="rounded-xl border border-[#D8E3F5] bg-white px-5 py-4 shadow-sm">
                    <div className="mb-1 flex items-center gap-2">
                      <Users size={16} className="text-[#0439D9]" aria-hidden="true" />
                      <h2 className="text-sm font-bold uppercase tracking-wide text-[#011140]">
                        Normas particulares por estudiante
                      </h2>
                    </div>
                    <p className="mb-3 text-xs text-[#627A9B]">
                      Excepciones o adaptaciones curriculares o de accesibilidad asignadas a postulantes específicos.
                    </p>
                    {examen.normasParticulares?.length ? (
                      <ul className="flex flex-col gap-2">
                        {examen.normasParticulares.map((norma, index) => (
                          <li
                            key={`${norma.estudiante}-${index}`}
                            className="rounded-lg border border-[#EDF1F7] bg-[#F8FAFC] px-3 py-3"
                          >
                            <div className="flex items-start gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#BFDBFE] bg-[#EAF2FF] text-xs font-bold text-[#2563EB]">
                                {initialsOfName(norma.estudiante)}
                              </span>
                              <div>
                                <p className="text-sm font-semibold text-[#011140]">{norma.estudiante}</p>
                                <p className="mt-1 text-sm text-[#011140]">
                                  <span className="font-semibold text-[#0439D9]">Adaptación:</span>{' '}
                                  {norma.texto}
                                </p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">Sin normas particulares.</p>
                    )}
                  </section>
                </div>
              ) : (
                <section className="rounded-xl border border-dashed border-[#B8CBEF] bg-white px-5 py-12 text-center shadow-sm">
                  <Users size={32} className="mx-auto text-[#0439D9]/70" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold text-[#011140]">Aún no hay estudiantes habilitados</p>
                  <p className="mt-1 text-xs text-[#627A9B]">
                    La habilitación se registra en la inscripción al paralelo (HU4).
                  </p>
                </section>
              )}
            </div>
          )}
        </div>
        <MobileBottomNav />
        <EditExamenModal
          isOpen={editOpen}
          examen={examen}
          onClose={() => setEditOpen(false)}
          onSuccess={() => { setEditOpen(false); void load() }}
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

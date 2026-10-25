import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flag,
  ImageOff,
  Info,
  LoaderCircle,
  RefreshCw,
  RotateCw,
  TriangleAlert,
  X,
} from 'lucide-react'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import FotoEstudiante from '../../components/estudiantes/FotoEstudiante'
import ResultadoModal, { type Resultado } from '../../components/ui/ResultadoModal'
import {
  aprobarFoto,
  descartarReporteFoto,
  listarRevisionFotos,
  mensajeDeError,
  rechazarFoto,
  textoMotivoReporte,
  type SolicitudRevisionFoto,
} from '../../services/fotoRevisionService'
import { fechaCorta } from '../../utils/fechaCorta'
import useEnVivo from '../../hooks/useEnVivo'

const MOTIVO_MIN = 5
const MOTIVO_MAX = 200
const MOTIVOS_FRECUENTES = ['Foto borrosa', 'Rostro no visible', 'No es la misma persona', 'No es una foto de frente']

const nombreDe = (s: SolicitudRevisionFoto) => `${s.nombre} ${s.apellidos}`
const inicialesDe = (s: SolicitudRevisionFoto) => `${s.nombre.charAt(0)}${s.apellidos.charAt(0)}`.toUpperCase()

function fechaSolicitud(s: SolicitudRevisionFoto): string {
  if (s.enviadaEn) return `Enviada ${fechaCorta(s.enviadaEn)}`
  return `Reportada ${fechaCorta(s.reporte?.reportadoEn ?? '')}`
}

function OrigenBadge({ solicitud }: { solicitud: SolicitudRevisionFoto }) {
  if (solicitud.origen === 'REPORTE') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#FEECEC] px-2 py-0.5 text-[10px] font-semibold text-[#B91C1C]">
        <Flag size={11} aria-hidden="true" /> Reportada por control
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#E9F1FF] px-2 py-0.5 text-[10px] font-semibold text-[#0439D9]">
      <RefreshCw size={11} aria-hidden="true" /> Cambio de foto
    </span>
  )
}

function RechazarFotoModal({ solicitud, saving, onCancel, onConfirm }: {
  solicitud: SolicitudRevisionFoto
  saving: boolean
  onCancel: () => void
  onConfirm: (motivo: string) => void
}) {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const enviar = () => {
    const texto = motivo.trim()
    if (texto.length < MOTIVO_MIN || texto.length > MOTIVO_MAX) {
      setError(`El motivo debe tener entre ${MOTIVO_MIN} y ${MOTIVO_MAX} caracteres.`)
      return
    }
    onConfirm(texto)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="rechazar-foto-titulo"
        onSubmit={(e) => { e.preventDefault(); enviar() }}
        className="w-full max-w-md rounded-2xl border border-[#D8E3F5] bg-white p-5 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FEECEC] text-[#B91C1C]">
            <TriangleAlert size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 id="rechazar-foto-titulo" className="text-base font-bold text-[#011140]">Rechazar foto</h3>
            <p className="text-xs text-[#627A9B]">
              La foto actual de {nombreDe(solicitud)} no cambia. El estudiante verá este motivo en su perfil y podrá
              enviar otra foto.
            </p>
          </div>
          <button type="button" onClick={onCancel} disabled={saving} aria-label="Cerrar" className="shrink-0 rounded-full bg-[#F1F5F9] p-1.5 text-gray-500 hover:bg-gray-200">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <label htmlFor="rechazar-foto-motivo" className="mt-4 block text-xs font-semibold text-[#011140]">Motivo del rechazo</label>
        <textarea
          id="rechazar-foto-motivo"
          value={motivo}
          maxLength={MOTIVO_MAX}
          rows={3}
          aria-invalid={Boolean(error)}
          onChange={(e) => { setMotivo(e.target.value); setError('') }}
          placeholder="Ej. La foto está borrosa y no se distingue bien el rostro."
          className={`mt-1 w-full resize-none rounded-lg border px-3 py-2 text-sm text-[#011140] focus:outline-none focus:ring-2 focus:ring-[#0439D9]/25 ${error ? 'border-red-400' : 'border-[#B8CBEF]'}`}
        />
        <div className="mt-0.5 flex justify-between gap-2 text-[10px]">
          <span className={error ? 'text-red-600' : 'text-gray-400'}>{error || `Entre ${MOTIVO_MIN} y ${MOTIVO_MAX} caracteres.`}</span>
          <span className="shrink-0 text-gray-400">{motivo.length} / {MOTIVO_MAX}</span>
        </div>
        <p className="mt-3 text-[11px] font-semibold text-[#627A9B]">Motivos frecuentes</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {MOTIVOS_FRECUENTES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMotivo(m); setError('') }}
              className="rounded-full border border-[#D8E3F5] bg-[#F8FAFC] px-2.5 py-1 text-[11px] text-[#334155] hover:border-[#0439D9] hover:text-[#0439D9]"
            >
              {m}
            </button>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={saving} className="rounded-lg border border-[#D8E3F5] px-4 py-2.5 text-sm font-semibold text-[#011140]">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#B91C1C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#991B1B] disabled:opacity-60">
            <X size={15} aria-hidden="true" />
            {saving ? 'Rechazando…' : 'Rechazar foto'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Detalle({ solicitud, saving, onAprobar, onRechazar, onDescartar }: {
  solicitud: SolicitudRevisionFoto
  saving: boolean
  onAprobar: () => void
  onRechazar: () => void
  onDescartar: () => void
}) {
  const esperando = solicitud.estado === 'ESPERANDO_FOTO'
  const recuadro = 'flex aspect-[4/5] w-full items-center justify-center rounded-xl bg-[#E9F1FF] text-2xl font-bold text-[#7C93B8]'
  return (
    <article className="flex min-h-full flex-col rounded-xl border border-[#D8E3F5] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-[#011140]">{nombreDe(solicitud)}</h2>
          <p className="text-xs text-[#627A9B]">
            SIS {solicitud.codigoSis}
            {solicitud.carrera ? ` · ${solicitud.carrera}` : ''} · {fechaSolicitud(solicitud)}
          </p>
        </div>
        <OrigenBadge solicitud={solicitud} />
      </div>

      {solicitud.reporte && (
        <div className="mt-3 rounded-lg border border-[#FBCFD4] bg-[#FFF5F5] px-3 py-2 text-xs text-[#B91C1C]">
          <p className="font-semibold">
            Reporte de control
            {solicitud.reporte.reportadoPor ? ` · ${solicitud.reporte.reportadoPor}` : ''} · {fechaCorta(solicitud.reporte.reportadoEn)}
          </p>
          <p className="mt-0.5">
            {textoMotivoReporte(solicitud.reporte.motivo)}
            {solicitud.reporte.detalle ? `: “${solicitud.reporte.detalle}”` : '.'}
            {' '}Se le pidió al estudiante volver a escanear su rostro.
          </p>
        </div>
      )}

      <div className="mx-auto mt-5 grid w-full max-w-md grid-cols-2 gap-4">
        <figure className="min-w-0">
          <figcaption className="mb-2 text-xs font-semibold text-[#011140]">Foto actual</figcaption>
          <FotoEstudiante fotoUrl={solicitud.fotoActualUrl} nombre={`${nombreDe(solicitud)} (actual)`} iniciales={inicialesDe(solicitud)} className={recuadro} />
          <p className="mt-1.5 text-[10px] text-[#627A9B]">La que ve hoy el personal de control</p>
        </figure>
        <figure className="min-w-0">
          <figcaption className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[#011140]">
            Foto enviada
            {!esperando && <span className="rounded-full bg-[#E9F1FF] px-2 py-0.5 text-[10px] text-[#0439D9]">Nueva</span>}
          </figcaption>
          {esperando ? (
            <div className={`${recuadro} flex-col gap-2 border-2 border-dashed border-[#B8CBEF] bg-[#F8FAFC] px-3 text-center`}>
              <ImageOff size={28} aria-hidden="true" />
              <span className="text-[11px] font-medium leading-snug">El estudiante aún no envía su nueva foto</span>
            </div>
          ) : (
            <FotoEstudiante fotoUrl={solicitud.fotoUrl} nombre={`${nombreDe(solicitud)} (enviada)`} iniciales={inicialesDe(solicitud)} className={`${recuadro} ring-2 ring-[#0439D9]`} />
          )}
          <p className="mt-1.5 text-[10px] text-[#627A9B]">Escaneada por el estudiante</p>
        </figure>
      </div>

      <p className="mt-5 flex gap-2 rounded-lg bg-[#EFF6FF] p-3 text-[11px] leading-relaxed text-[#334E7A]">
        <Info size={14} className="mt-0.5 shrink-0 text-[#0439D9]" aria-hidden="true" />
        {esperando
          ? 'Si compruebas que la foto actual sí corresponde al estudiante, descarta el reporte: ya no tendrá que reemplazarla.'
          : 'Comprueba que sea la misma persona, con el rostro visible y de frente. Esta foto se usará para identificarla al ingresar a sus exámenes.'}
      </p>

      <div className="mt-auto flex flex-col-reverse gap-2 border-t border-[#EDF1F7] pt-4 sm:flex-row sm:justify-end">
        {solicitud.reporte && (
          <button type="button" onClick={onDescartar} disabled={saving} className="rounded-lg border border-[#D8E3F5] px-4 py-2.5 text-sm font-semibold text-[#011140] hover:bg-[#F8FAFC] disabled:opacity-60 sm:mr-auto">
            Descartar reporte
          </button>
        )}
        {!esperando && (
          <>
            <button type="button" onClick={onRechazar} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#FBCFD4] bg-white px-4 py-2.5 text-sm font-semibold text-[#B91C1C] hover:bg-[#FFF5F5] disabled:opacity-60">
              <X size={15} aria-hidden="true" /> Rechazar
            </button>
            <button type="button" onClick={onAprobar} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0439D9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#032db0] disabled:opacity-60">
              <Check size={15} aria-hidden="true" /> {saving ? 'Guardando…' : 'Aprobar foto'}
            </button>
          </>
        )}
      </div>
    </article>
  )
}

/** CTA-02: el ADMIN revisa los cambios de foto y las fotos que reportó el personal de control. */
export default function RevisionFotosPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudRevisionFoto[]>([])
  const [seleccionado, setSeleccionado] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [saving, setSaving] = useState(false)
  const [rechazando, setRechazando] = useState(false)
  const [exito, setExito] = useState('')
  const [resultado, setResultado] = useState<Resultado | null>(null)

  const cargar = useCallback(async (opciones?: { silencioso?: boolean }) => {
    if (!opciones?.silencioso) setLoading(true)
    setErrorCarga('')
    try {
      const lista = await listarRevisionFotos()
      setSolicitudes(lista)
      setSeleccionado((actual) => (lista.some((s) => s.idEstudiante === actual) ? actual : lista[0]?.idEstudiante ?? null))
    } catch (err) {
      setErrorCarga(mensajeDeError(err, 'No se pudieron cargar las fotos por revisar.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => { void cargar() }, 0)
    return () => window.clearTimeout(handle)
  }, [cargar])

  // En vivo: fotos nuevas de los estudiantes y reportes del control.
  useEnVivo((c) => c.tipo === 'FOTO' || c.tipo === 'FOTO_REPORTADA', () => void cargar({ silencioso: true }))

  const actual = solicitudes.find((s) => s.idEstudiante === seleccionado) ?? null

  const ejecutar = async (accion: () => Promise<void>, mensajeExito: string, fallback: string) => {
    setSaving(true)
    try {
      await accion()
      setRechazando(false)
      setExito(mensajeExito)
      await cargar()
    } catch (err) {
      setResultado({ tipo: 'error', mensaje: mensajeDeError(err, fallback) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <PanelLayout compactDesktop>
      <div
        className="min-h-full pb-[calc(4.5rem+env(safe-area-inset-bottom))] min-[960px]:pb-0"
        style={{ background: 'linear-gradient(to bottom, #FFFFFF 0%, #F8FBFF 28%, #E9F1FF 65%, #DCE9FF 100%)' }}
      >
        <section aria-labelledby="revision-fotos-titulo" className="px-3 py-4 sm:px-6 min-[960px]:px-4 xl:px-10">
          <div className="mx-auto max-w-7xl">
            <nav aria-label="Ruta" className="flex items-center gap-1.5 text-xs text-[#627A9B]">
              <Link to="/dashboard/estudiantes" className="inline-flex items-center gap-1 font-semibold text-[#0439D9] hover:underline">
                <ArrowLeft size={14} aria-hidden="true" /> Estudiantes
              </Link>
              <span aria-hidden="true">/</span>
              <span>Revisión de fotos</span>
            </nav>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h1 id="revision-fotos-titulo" className="text-xl font-bold text-[#011140]">Revisión de fotos</h1>
              {solicitudes.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF4E5] px-2 py-0.5 text-[11px] font-semibold text-[#B45309]">
                  <Clock size={12} aria-hidden="true" />
                  {solicitudes.length === 1 ? '1 pendiente' : `${solicitudes.length} pendientes`}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-[#627A9B]">
              La primera foto de cada estudiante se aprueba sola al escanearla. Aquí solo llegan los cambios de una foto ya
              aprobada y las fotos que el personal de control reportó.
            </p>

            {exito && (
              <div role="status" className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                <CheckCircle2 size={18} aria-hidden="true" /> {exito}
              </div>
            )}

            {loading && solicitudes.length === 0 ? (
              <div role="status" className="mt-6 rounded-xl border border-[#B8CBEF] bg-[#E9F1FF] px-6 py-12 text-center text-[#011140]">
                <LoaderCircle className="mx-auto animate-spin text-[#0439D9]" size={30} aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold">Cargando fotos por revisar…</p>
              </div>
            ) : errorCarga ? (
              <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-700">
                <p>{errorCarga}</p>
                <button type="button" onClick={() => void cargar()} className="mt-3 inline-flex items-center gap-1.5 font-semibold text-[#0439D9]">
                  <RotateCw size={14} aria-hidden="true" /> Reintentar
                </button>
              </div>
            ) : solicitudes.length === 0 ? (
              <div className="mt-6 rounded-xl border border-[#D8E3F5] bg-white px-6 py-14 text-center shadow-sm">
                <CheckCircle2 size={36} className="mx-auto text-emerald-500" aria-hidden="true" />
                <p className="mt-3 text-base font-bold text-[#011140]">No hay fotos por revisar</p>
                <p className="mt-1 text-sm text-[#627A9B]">
                  Cuando un estudiante suba una foto nueva o el personal de control reporte una, aparecerá aquí.
                </p>
                <Link to="/dashboard/estudiantes" className="mt-4 inline-flex rounded-lg border border-[#D8E3F5] px-4 py-2 text-sm font-semibold text-[#0439D9] hover:bg-[#E9F1FF]">
                  Volver a estudiantes
                </Link>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 min-[960px]:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
                <section aria-labelledby="solicitudes-titulo" className="rounded-xl border border-[#D8E3F5] bg-white p-3 shadow-sm">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <h2 id="solicitudes-titulo" className="text-sm font-bold text-[#011140]">Solicitudes</h2>
                    <span className="text-[11px] text-[#627A9B]">Más antiguas primero</span>
                  </div>
                  <ul className="space-y-2">
                    {solicitudes.map((s) => {
                      const activa = s.idEstudiante === seleccionado
                      return (
                        <li key={s.idEstudiante}>
                          <button
                            type="button"
                            aria-current={activa ? 'true' : undefined}
                            onClick={() => { setSeleccionado(s.idEstudiante); setExito('') }}
                            className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left ${
                              activa ? 'border-[#0439D9] bg-[#F4F8FF]' : 'border-[#E2E8F0] hover:bg-[#F8FAFC]'
                            }`}
                          >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E9F1FF] text-xs font-bold text-[#0439D9]">
                              {inicialesDe(s)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <OrigenBadge solicitud={s} />
                              <span className="mt-0.5 block truncate text-sm font-bold text-[#011140]">{nombreDe(s)}</span>
                              <span className="block text-[11px] text-[#627A9B]">SIS {s.codigoSis}</span>
                              <span className="flex items-center gap-1 text-[11px] text-[#627A9B]">
                                <Clock size={11} aria-hidden="true" />
                                {s.estado === 'ESPERANDO_FOTO' ? 'Esperando nueva foto' : fechaSolicitud(s)}
                              </span>
                            </span>
                            <ChevronRight size={16} className={activa ? 'text-[#0439D9]' : 'text-gray-300'} aria-hidden="true" />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </section>

                {actual && (
                  <Detalle
                    solicitud={actual}
                    saving={saving}
                    onRechazar={() => setRechazando(true)}
                    onAprobar={() => void ejecutar(
                      () => aprobarFoto(actual.idEstudiante),
                      `Se aprobó la foto de ${nombreDe(actual)}. Ya es la foto que ve el personal de control.`,
                      'No se pudo aprobar la foto.',
                    )}
                    onDescartar={() => void ejecutar(
                      () => descartarReporteFoto(actual.idEstudiante),
                      `Se descartó el reporte de ${nombreDe(actual)}. Su foto actual sigue vigente.`,
                      'No se pudo descartar el reporte.',
                    )}
                  />
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {rechazando && actual && (
        <RechazarFotoModal
          solicitud={actual}
          saving={saving}
          onCancel={() => setRechazando(false)}
          onConfirm={(motivo) => void ejecutar(
            () => rechazarFoto(actual.idEstudiante, motivo),
            `Se rechazó la foto de ${nombreDe(actual)}. Verá el motivo en su perfil y podrá enviar otra.`,
            'No se pudo rechazar la foto.',
          )}
        />
      )}
      <ResultadoModal resultado={resultado} onClose={() => setResultado(null)} />
      <MobileBottomNav />
    </PanelLayout>
  )
}

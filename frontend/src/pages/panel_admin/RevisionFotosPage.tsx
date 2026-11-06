import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, ChevronRight, Clock, LoaderCircle, RotateCw } from 'lucide-react'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import ResultadoModal, { type Resultado } from '../../components/ui/ResultadoModal'
import { aprobarFoto, descartarReporteFoto, listarRevisionFotos, mensajeDeError, rechazarFoto, type SolicitudRevisionFoto } from '../../services/fotoRevisionService'
import useEnVivo from '../../hooks/useEnVivo'
import { DetalleRevisionFoto as Detalle, OrigenBadge, RechazarFotoModal } from '../../components/fotos/RevisionFoto'
import { fechaSolicitud, inicialesDe, nombreDe } from '../../utils/revisionFoto'

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

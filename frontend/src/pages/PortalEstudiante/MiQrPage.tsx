import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays, Clock, LoaderCircle, MapPin, RotateCw, ShieldCheck, ShieldX, Sun, WifiOff } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import FotoEstudiante from '../../components/estudiantes/FotoEstudiante'
import PortalEstudianteLayout from '../../components/estudiantes/PortalEstudianteLayout'
import { PortalCargando, PortalError } from '../../components/estudiantes/PortalEstado'
import useMiPerfil from '../../hooks/useMiPerfil'
import {
  obtenerMisExamenes,
  obtenerMiQr,
  requiereRegistrarFoto,
  SinConexionError,
  type MiExamen,
  type MiQr,
} from '../../services/panelEstudianteService'
import { isOffline } from '../../utils/examFormUtils'
import { fechaLarga, horario, separarExamenes } from '../../utils/misExamenes'

/** Segundos antes del vencimiento en que se pide el QR siguiente, para que nunca se muestre uno vencido. */
const MARGEN_RENOVACION = 3

const horaConSegundos = (d: Date) => d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

/**
 * CTA-03 · Mi QR (Figma, sección 5): QR temporal de 60 s que se renueva solo, con cuenta regresiva
 * y la hora actual para que una captura no sirva. Sin conexión no se muestra un QR vencido.
 */
export default function MiQrPage() {
  const { perfil, cargando, error, recargar } = useMiPerfil()
  const [qr, setQr] = useState<MiQr | null>(null)
  const [sinConexion, setSinConexion] = useState(false)
  const [errorQr, setErrorQr] = useState('')
  const [ahora, setAhora] = useState(() => new Date())
  const [proximo, setProximo] = useState<MiExamen | null | undefined>(undefined)

  const pedirQr = useCallback(async () => {
    if (isOffline()) {
      setSinConexion(true)
      setQr(null)
      return
    }
    try {
      setQr(await obtenerMiQr())
      setSinConexion(false)
      setErrorQr('')
    } catch (err) {
      setQr(null)
      if (err instanceof SinConexionError) setSinConexion(true)
      else setErrorQr(err instanceof Error ? err.message : 'No se pudo generar tu QR.')
    }
  }, [])

  // Primer QR y examen asociado.
  useEffect(() => {
    const handle = window.setTimeout(() => { void pedirQr() }, 0)
    obtenerMisExamenes()
      .then((lista) => setProximo(separarExamenes(lista).proximo))
      .catch(() => setProximo(null))
    return () => window.clearTimeout(handle)
  }, [pedirQr])

  // Reloj de la marca de hora y la cuenta regresiva.
  useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  // Renovación: un poco antes de que venza, se pide el siguiente.
  useEffect(() => {
    if (!qr) return
    const restante = new Date(qr.expiraEn).getTime() - Date.now() - MARGEN_RENOVACION * 1000
    const handle = window.setTimeout(() => { void pedirQr() }, Math.max(0, restante))
    return () => window.clearTimeout(handle)
  }, [qr, pedirQr])

  // Al volver la conexión se genera un QR nuevo; al perderla se oculta el actual.
  useEffect(() => {
    const online = () => { void pedirQr() }
    const offline = () => { setSinConexion(true); setQr(null) }
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  }, [pedirQr])

  if (perfil && requiereRegistrarFoto(perfil)) return <Navigate to="/estudiante/foto" replace />

  const segundosRestantes = qr ? Math.max(0, Math.ceil((new Date(qr.expiraEn).getTime() - ahora.getTime()) / 1000)) : 0
  const noHabilitado = proximo?.habilitado === false
  const carrera = perfil?.carreras?.[0]
  const estado = sinConexion
    ? { texto: 'Sin conexión', clase: 'bg-[#FFF7E6] text-[#92400E]', icono: WifiOff }
    : noHabilitado
      ? { texto: 'No habilitado', clase: 'bg-[#FEF2F2] text-[#B91C1C]', icono: ShieldX }
      : { texto: 'QR vigente', clase: 'bg-[#ECFDF5] text-[#047857]', icono: ShieldCheck }
  const IconoEstado = estado.icono

  return (
    <PortalEstudianteLayout fotoUrl={perfil?.fotoUrl}>
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-8 sm:py-8">
        <Link to="/estudiante" className="inline-flex items-center gap-1 text-sm font-semibold text-[#0439D9] hover:underline">
          <ArrowLeft size={16} aria-hidden="true" /> Volver al panel
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-extrabold text-[#092068]">Mi QR de ingreso</h1>
            <p className="text-sm text-[#627A9B]">Muéstralo al personal de control al ingresar a tu examen.</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${estado.clase}`}>
            <IconoEstado size={14} aria-hidden="true" /> {estado.texto}
          </span>
        </div>

        {cargando ? (
          <div className="mt-6"><PortalCargando /></div>
        ) : error || !perfil ? (
          <div className="mt-6"><PortalError mensaje={error || 'No se pudo cargar tu perfil.'} onReintentar={recargar} /></div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,31rem)_minmax(0,1fr)]">
            <section aria-label="Credencial de ingreso" className="flex flex-col items-center rounded-2xl border border-[#D8E3F5] bg-white p-5 shadow-sm sm:p-7">
              <div className="flex w-full items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#627A9B]">QR temporal</p>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${estado.clase}`}>
                  <IconoEstado size={13} aria-hidden="true" /> {estado.texto}
                </span>
              </div>

              <div className="relative mt-4 flex aspect-square w-full max-w-[20rem] items-center justify-center rounded-xl border border-[#E2E8F0] bg-white p-2">
                {sinConexion ? (
                  <div className="flex flex-col items-center gap-2 px-6 text-center text-sm text-[#92400E]">
                    <WifiOff size={44} aria-hidden="true" />
                    <p className="font-semibold">Sin conexión a Internet</p>
                    <p className="text-xs">Tu QR se genera en el momento y dura 60 segundos: necesitas conexión para mostrarlo.</p>
                    <button type="button" onClick={() => void pedirQr()} className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-[#0439D9]">
                      <RotateCw size={14} aria-hidden="true" /> Reintentar
                    </button>
                  </div>
                ) : errorQr ? (
                  <div role="alert" className="flex flex-col items-center gap-2 px-6 text-center text-sm text-[#B91C1C]">
                    <p>{errorQr}</p>
                    <button type="button" onClick={() => void pedirQr()} className="inline-flex items-center gap-1 font-semibold text-[#0439D9]">
                      <RotateCw size={14} aria-hidden="true" /> Reintentar
                    </button>
                  </div>
                ) : qr ? (
                  <>
                    <img src={`data:image/png;base64,${qr.pngBase64}`} alt="Tu código QR de ingreso" className={`h-full w-full object-contain ${noHabilitado ? 'opacity-40' : ''}`} />
                    {noHabilitado && (
                      <span className="absolute rotate-[-12deg] rounded-lg border-2 border-[#B91C1C] bg-white/90 px-3 py-1 text-sm font-extrabold uppercase tracking-wide text-[#B91C1C]">
                        No habilitado
                      </span>
                    )}
                  </>
                ) : (
                  <LoaderCircle size={32} className="animate-spin text-[#0439D9]" aria-label="Generando tu QR" />
                )}
              </div>
              <p className="mt-2 font-mono text-[11px] text-[#627A9B]" aria-label="Hora actual">
                {ahora.toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'short' })} · {horaConSegundos(ahora)}
              </p>

              {qr && !sinConexion && (
                <div className="mt-3 w-full">
                  <p className="text-center text-sm font-semibold text-[#011140]">Se renueva en {segundosRestantes} s</p>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[#E2E8F0]" aria-hidden="true">
                    <div
                      className="h-full rounded-full bg-[#0439D9] transition-[width] duration-1000 ease-linear"
                      style={{ width: `${Math.min(100, (segundosRestantes / qr.segundosValidez) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-center text-[11px] text-[#627A9B]">Una captura de pantalla no sirve: el código cambia cada {qr.segundosValidez} segundos.</p>
                </div>
              )}

              <div className="mt-5 flex w-full items-center gap-3 rounded-xl bg-[#F8FBFF] p-3">
                <FotoEstudiante
                  fotoUrl={perfil.fotoUrl}
                  nombre={`${perfil.nombre} ${perfil.apellidos}`}
                  iniciales={`${perfil.nombre.charAt(0)}${perfil.apellidos.charAt(0)}`.toUpperCase()}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E9F1FF] text-sm font-bold text-[#0439D9]"
                />
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-[#011140]">{perfil.nombre} {perfil.apellidos}</p>
                  <p className="text-xs text-[#627A9B]">SIS {perfil.codigoSis}</p>
                  {carrera && <p className="truncate text-[11px] text-[#627A9B]">{carrera.nombreCarrera}</p>}
                </div>
              </div>
              <div className="mt-3 w-full rounded-xl border border-[#E2E8F0] p-3 text-xs text-[#45628D]">
                <p className="flex items-center gap-1.5 font-semibold text-[#011140]"><Sun size={16} aria-hidden="true" /> Sube el brillo</p>
                <p className="mt-1">Sube el brillo de tu pantalla y presenta también tu carnet. El personal de control comparará tu rostro con tu foto.</p>
              </div>
            </section>

            <section aria-label="Examen asociado" className="flex h-fit flex-col gap-4">
              {proximo === undefined ? (
                <div className="rounded-2xl border border-[#D8E3F5] bg-white p-6 text-sm text-[#627A9B] shadow-sm">Cargando tu próximo examen…</div>
              ) : proximo === null ? (
                <div className="rounded-2xl border border-[#D8E3F5] bg-white p-6 text-sm text-[#627A9B] shadow-sm">
                  No tienes exámenes programados. Tu QR solo te permite ingresar a los exámenes a los que estés habilitado.
                </div>
              ) : (
                <>
                  <article className="rounded-2xl border border-[#D8E3F5] bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold text-[#627A9B]">Tu próximo examen</p>
                    <p className="mt-1 text-xl font-bold text-[#011140]">{proximo.materia}</p>
                    <p className="mt-3 flex items-center gap-2 text-sm text-[#011140]"><CalendarDays size={18} className="text-[#0439D9]" aria-hidden="true" /> {fechaLarga(proximo.fecha)}</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <p className="flex items-center gap-2 text-sm text-[#011140]"><Clock size={18} className="text-[#0439D9]" aria-hidden="true" /> {horario(proximo)}</p>
                      <p className="flex items-center gap-2 text-sm text-[#011140]"><MapPin size={18} className="text-[#0439D9]" aria-hidden="true" /> {proximo.aula ? `Aula ${proximo.aula}` : 'Se asigna al llegar'}{proximo.aula && proximo.trasladadoDesde ? ` (te trasladaron desde ${proximo.trasladadoDesde})` : ''}</p>
                    </div>
                  </article>
                  {proximo.habilitado === false ? (
                    <div role="alert" className="rounded-2xl border border-[#FBCFD4] bg-[#FFF5F5] p-5 text-sm text-[#7F1D1D]">
                      <ShieldX size={28} className="text-[#B91C1C]" aria-hidden="true" />
                      <p className="mt-2 text-base font-bold text-[#B91C1C]">No estás habilitado para este examen</p>
                      <p className="mt-1">Razón: {proximo.motivoInhabilitacion || 'no indicada'}.</p>
                      <p className="mt-1 text-xs">El control de ingreso no te dejará ingresar. Si crees que es un error, comunícate con la administración antes del examen.</p>
                    </div>
                  ) : proximo.habilitado === null ? (
                    <div className="rounded-2xl border border-[#FDE68A] bg-[#FFF7E6] p-5 text-sm text-[#92400E]">
                      <Clock size={28} aria-hidden="true" />
                      <p className="mt-2 text-base font-bold">Tu habilitación está pendiente</p>
                      <p className="mt-1">La administración todavía no revisa tu habilitación para este examen.</p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] p-5 text-sm text-[#14532D]">
                      <ShieldCheck size={28} className="text-[#15803D]" aria-hidden="true" />
                      <p className="mt-2 text-base font-bold text-[#15803D]">Acceso habilitado</p>
                      <p className="mt-1">Estás habilitado para este examen. Llega con anticipación y presenta este QR.</p>
                    </div>
                  )}
                </>
              )}
              <p className="text-[11px] text-[#627A9B]">Tu QR es personal. Si crees que alguien lo copió, pide a la administración que lo regenere.</p>
            </section>
          </div>
        )}
      </div>
    </PortalEstudianteLayout>
  )
}

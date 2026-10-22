import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Camera, CircleAlert, CircleCheck, Clock, Eye, EyeOff, Flag, LockKeyhole, LogOut, RefreshCw, ScanFace, Send, TriangleAlert } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import AuthLayout from '../../components/layout/AuthLayout'
import { EncabezadoAsistente, ProgresoAsistente } from '../../components/auth/Asistente'
import { PortalCargando, PortalError } from '../../components/estudiantes/PortalEstado'
import EscaneoRostro, { type FotoCapturada } from '../../components/estudiantes/EscaneoRostro'
import { useAuth } from '../../context/AuthContext'
import useMiPerfil from '../../hooks/useMiPerfil'
import { useIsMobileDevice } from '../../hooks/useIsMobileDevice'
import { enviarMiFoto, requiereRegistrarFoto, type ResultadoEnvioFoto } from '../../services/panelEstudianteService'

const PASOS = ['Indicaciones', 'Escaneo', 'Confirmar']

const REQUISITOS = [
  'Rostro de frente, completo y centrado',
  'Buena luz, sin sombras fuertes en la cara',
  'Sin gorra, lentes oscuros ni barbijo',
  'Solo tú en la imagen, con fondo claro',
]

const CONTROLES_APROBADOS = ['Nítida', 'Bien iluminada', 'Rostro completo y centrado', 'Un solo rostro']

const CONSEJOS_TRAS_RECHAZO = [
  'Busca un lugar con buena luz',
  'Quédate quieto cuando se tome la foto de frente',
  'Limpia la cámara de tu celular',
]

function ListaVerificada({ titulo, items }: { titulo: string; items: string[] }) {
  return (
    <div className="mb-5">
      <p className="mb-2 text-xs font-semibold text-[#011140]">{titulo}</p>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-[#011140]">
            <CircleCheck size={16} className="mt-0.5 shrink-0 text-[#047857]" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * CTA-02: el estudiante registra su foto antes de usar el portal: indicaciones (o el motivo si se la
 * rechazaron o la reportó el personal de control) → escaneo con la cámara (foto de frente + 4 giros) →
 * revisa la foto y la confirma con su contraseña → foto registrada (o en revisión si era un cambio).
 *
 * Con `cambio`, el estudiante que ya tiene foto la cambia por voluntad propia: su foto actual sigue
 * vigente hasta que la administración apruebe la nueva.
 */
export default function RegistrarFotoPage({ cambio = false }: { cambio?: boolean }) {
  const isMobile = useIsMobileDevice()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { perfil, cargando, error, recargar } = useMiPerfil()
  const [fase, setFase] = useState<'indicaciones' | 'escaneo' | 'revision' | 'registrada'>('indicaciones')
  const [foto, setFoto] = useState<FotoCapturada | null>(null)
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [errorPassword, setErrorPassword] = useState('')
  const [errorEnvio, setErrorEnvio] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoEnvioFoto | null>(null)

  // La vista previa usa una URL temporal del navegador: se libera al cambiarla o al salir.
  useEffect(() => () => {
    if (foto) URL.revokeObjectURL(foto.url)
  }, [foto])

  const repetir = () => {
    setFoto(null)
    setErrorEnvio('')
    setFase('escaneo')
  }

  const registrar = async (event: FormEvent) => {
    event.preventDefault()
    if (!foto) return
    if (!password) {
      setErrorPassword('Escribe tu contraseña')
      return
    }
    setEnviando(true)
    setErrorEnvio('')
    try {
      setResultado(await enviarMiFoto(foto.archivo, password))
      setPassword('')
      setFase('registrada')
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'No se pudo enviar tu foto.'
      if (mensaje.toLowerCase().includes('contraseña')) setErrorPassword(mensaje)
      else setErrorEnvio(mensaje)
    } finally {
      setEnviando(false)
    }
  }

  const cerrarSesion = () => {
    logout()
    navigate('/login', { replace: true })
  }

  if (perfil && !cambio && !requiereRegistrarFoto(perfil)) return <Navigate to="/estudiante" replace />
  // Si la foto es obligatoria (no tiene, se la rechazaron o la reportaron), va por el flujo obligatorio.
  if (perfil && cambio && requiereRegistrarFoto(perfil)) return <Navigate to="/estudiante/foto" replace />

  const rechazada = perfil?.solicitudFoto?.estado === 'RECHAZADA'
  const reportada = Boolean(perfil?.fotoReportada)
  const titulo = cambio ? 'Cambiar mi foto' : 'Registrar mi foto'

  const cardClass = isMobile
    ? 'w-full bg-white'
    : 'w-full rounded-md border border-t-4 border-t-[#0439D9] bg-white px-10 py-12 shadow-lg shadow-[#92aad2]'

  return (
    <AuthLayout>
      <div className="mx-auto flex min-h-full w-full items-center justify-center p-7 sm:px-8">
        <div className={`w-full ${isMobile ? 'max-w-md' : 'max-w-xl'}`}>
          <div className={cardClass}>
            {cargando ? (
              <PortalCargando />
            ) : error ? (
              <PortalError mensaje={error} onReintentar={recargar} />
            ) : fase === 'escaneo' ? (
              <>
                <ProgresoAsistente titulo={titulo} pasos={PASOS} paso={2} />
                <EscaneoRostro
                  onCapturada={(capturada) => {
                    setFoto(capturada)
                    setFase('revision')
                  }}
                  onCancelar={() => setFase('indicaciones')}
                />
              </>
            ) : fase === 'revision' && foto ? (
              <form onSubmit={registrar} noValidate>
                <ProgresoAsistente titulo={titulo} pasos={PASOS} paso={3} />
                <EncabezadoAsistente icono={CircleCheck} tono="verde" titulo="Revisa tu foto">
                  Así te verá el personal de control. Si no te gusta cómo salió, repite el escaneo.
                </EncabezadoAsistente>
                {(cambio || reportada) && (
                  <p className="mb-4 flex items-start gap-2 rounded-xl border border-[#FDE68A] bg-[#FFF7E6] p-3 text-left text-xs text-[#92400E]">
                    <Clock size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    {reportada
                      ? 'La administración revisará tu foto nueva antes de usarla para identificarte.'
                      : 'Tu foto actual seguirá vigente hasta que la administración apruebe la nueva.'}
                  </p>
                )}
                <img
                  src={foto.url}
                  alt="Tu foto de frente"
                  className="mx-auto mb-4 aspect-[3/4] w-44 rounded-xl border-2 border-[#10B981] object-cover sm:w-48"
                />
                <ul className="mb-5 flex flex-wrap justify-center gap-2" aria-label="Controles de calidad aprobados">
                  {CONTROLES_APROBADOS.map((control) => (
                    <li key={control} className="inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF5] px-2.5 py-1 text-xs font-semibold text-[#047857]">
                      <CircleCheck size={14} aria-hidden="true" /> {control}
                    </li>
                  ))}
                </ul>
                <div className="mb-5 flex flex-col gap-2">
                  <label htmlFor="foto-password" className="text-xs font-semibold text-[#011140]">CONFIRMA TU CONTRASEÑA</label>
                  <div className="relative">
                    <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" size={17} aria-hidden="true" />
                    <input
                      id="foto-password"
                      type={verPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      aria-invalid={Boolean(errorPassword)}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        setErrorPassword('')
                      }}
                      className={`w-full rounded-xl border py-3 pl-11 pr-11 text-sm focus:outline-none focus:ring-1 ${
                        errorPassword ? 'border-[#FECACA] bg-[#FEF2F2] focus:ring-[#FECACA]' : 'border-[#D8E3F5] focus:ring-[#E1ECFF]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setVerPassword((v) => !v)}
                      aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748B]"
                    >
                      {verPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                    </button>
                  </div>
                  {errorPassword ? (
                    <p className="flex items-center gap-1 text-[0.70rem] text-[#B91C1C]">
                      <CircleAlert size={12} aria-hidden="true" /> {errorPassword}
                    </p>
                  ) : (
                    <p className="text-[11px] text-gray-500">Por seguridad, te la pedimos antes de enviar la foto.</p>
                  )}
                </div>
                {errorEnvio && (
                  <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-[#EF4444] bg-[#FFF1F2] p-3 text-xs text-[#B91C1C]">
                    <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <p>{errorEnvio}</p>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={enviando}
                  className="mb-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0439D9] text-sm font-bold text-white transition-colors hover:bg-[#0027a2] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {enviando ? 'ENVIANDO...' : <><Send size={16} aria-hidden="true" /> REGISTRAR FOTO</>}
                </button>
                <button
                  type="button"
                  onClick={repetir}
                  disabled={enviando}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#D8E3F5] bg-white text-sm font-semibold text-[#0439D9] hover:bg-[#F1F6FF] disabled:opacity-50"
                >
                  <RefreshCw size={16} aria-hidden="true" /> Repetir escaneo
                </button>
              </form>
            ) : fase === 'registrada' && resultado ? (
              <div className="flex flex-col items-center text-center">
                {resultado.estado === 'APROBADA' ? (
                  <EncabezadoAsistente icono={CircleCheck} tono="verde" titulo="¡Foto registrada!">
                    Ya es tu foto oficial. El personal de control la usará para identificarte al ingresar a tus exámenes.
                  </EncabezadoAsistente>
                ) : (
                  <EncabezadoAsistente icono={Clock} tono="ambar" titulo="Tu foto está en revisión">
                    La administración revisará tu foto nueva. Mientras tanto, el personal de control usa tu foto actual.
                  </EncabezadoAsistente>
                )}
                <p className="mb-6 rounded-xl border border-[#BFD2F5] bg-[#F1F6FF] p-3 text-left text-xs text-[#45628D]">
                  Solo se guardó tu foto de frente; las otras posiciones se usaron para comprobar que eras tú.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/estudiante', { replace: true })}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0439D9] text-sm font-bold text-white hover:bg-[#0027a2]"
                >
                  IR A MI PANEL <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            ) : reportada && !rechazada ? (
              <>
                <EncabezadoAsistente icono={Flag} tono="ambar" titulo="Vuelve a escanear tu rostro">
                  El personal de control reportó que tu foto no coincide contigo. Escanea tu rostro de nuevo; la
                  administración revisará la foto nueva.
                </EncabezadoAsistente>
                <ListaVerificada titulo="Para que tu foto sea aceptada:" items={REQUISITOS} />
              </>
            ) : rechazada ? (
              <>
                <EncabezadoAsistente icono={TriangleAlert} tono="rojo" titulo="Tu foto fue rechazada">
                  Necesitas registrar una foto nueva para seguir usando SIGEX.
                </EncabezadoAsistente>
                <div className="mb-5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4">
                  <p className="text-xs font-semibold text-[#B91C1C]">Motivo indicado por la administración</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#7F1D1D]">
                    {perfil?.solicitudFoto?.motivoRechazo || 'No se indicó un motivo.'}
                  </p>
                </div>
                <ListaVerificada titulo="Antes de volver a intentarlo:" items={CONSEJOS_TRAS_RECHAZO} />
              </>
            ) : (
              <>
                <ProgresoAsistente titulo={titulo} pasos={PASOS} paso={1} />
                {cambio ? (
                  <EncabezadoAsistente icono={Camera} titulo="Cambia tu foto">
                    Escanea tu rostro para enviar una foto nueva. Tu foto actual seguirá vigente hasta que la
                    administración apruebe la nueva.
                  </EncabezadoAsistente>
                ) : (
                  <EncabezadoAsistente icono={Camera} titulo="Registra tu foto">
                    Es obligatoria para usar SIGEX. El personal de control la usará para identificarte al ingresar a
                    tus exámenes.
                  </EncabezadoAsistente>
                )}
                <ListaVerificada titulo="Para que tu foto sea aceptada:" items={REQUISITOS} />
                <div className="mb-5 flex items-start gap-2 rounded-xl border border-[#BFD2F5] bg-[#F1F6FF] p-3 text-xs text-[#45628D]">
                  <ScanFace size={16} className="mt-0.5 shrink-0 text-[#0439D9]" aria-hidden="true" />
                  <p>
                    Te pediremos mover la cabeza en 5 posiciones para comprobar que eres tú, en vivo. Solo se guarda la
                    foto de frente.
                  </p>
                </div>
              </>
            )}

            {!cargando && !error && fase === 'indicaciones' && (
              <>
                <button
                  type="button"
                  onClick={() => setFase('escaneo')}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0439D9] text-sm font-bold text-white transition-colors hover:bg-[#0027a2] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Camera size={16} aria-hidden="true" />
                  {rechazada || reportada ? 'VOLVER A ESCANEAR' : 'ACTIVAR CÁMARA'}
                </button>
                <div className="mt-6 border-t border-[#E4E9F2] pt-5 text-center">
                  {cambio ? (
                    <button
                      type="button"
                      onClick={() => navigate('/estudiante')}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-[#0439D9] hover:underline"
                    >
                      <ArrowLeft size={16} aria-hidden="true" />
                      Cancelar y volver
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={cerrarSesion}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-[#0439D9] hover:underline"
                    >
                      <LogOut size={16} aria-hidden="true" />
                      Cerrar sesión
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AuthLayout>
  )
}

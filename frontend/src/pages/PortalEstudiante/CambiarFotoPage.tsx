import { FormEvent, useEffect, useState } from 'react'
import { CircleAlert, CircleCheck, Clock, Eye, EyeOff, Info, LockKeyhole, RefreshCw } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthLayout from '../../components/layout/AuthLayout'
import { EncabezadoAsistente, ProgresoAsistente } from '../../components/auth/Asistente'
import { PortalCargando, PortalError } from '../../components/estudiantes/PortalEstado'
import EscaneoRostro, { type FotoCapturada } from '../../components/estudiantes/EscaneoRostro'
import FotoEstudiante from '../../components/estudiantes/FotoEstudiante'
import useMiPerfil from '../../hooks/useMiPerfil'
import { useIsMobileDevice } from '../../hooks/useIsMobileDevice'
import { enviarMiFoto, requiereRegistrarFoto } from '../../services/panelEstudianteService'

const PASOS = ['Contraseña', 'Escaneo', 'Confirmar']
const CONTROLES_APROBADOS = ['Nítida', 'Bien iluminada', 'Rostro completo y centrado', 'Un solo rostro']

/**
 * CTA-02 · Cambiar foto (Figma, sección 6): confirma su contraseña → escanea su rostro → revisa la
 * foto → queda pendiente de aprobación. Su foto actual sigue vigente hasta que el ADMIN apruebe la nueva.
 */
export default function CambiarFotoPage() {
  const isMobile = useIsMobileDevice()
  const navigate = useNavigate()
  const { perfil, cargando, error, recargar } = useMiPerfil()
  const [fase, setFase] = useState<'contrasena' | 'escaneo' | 'revision' | 'enviada'>('contrasena')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [errorPassword, setErrorPassword] = useState('')
  const [foto, setFoto] = useState<FotoCapturada | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState('')

  // La vista previa usa una URL temporal del navegador: se libera al cambiarla o al salir.
  useEffect(() => () => {
    if (foto) URL.revokeObjectURL(foto.url)
  }, [foto])

  // Si la foto es obligatoria (no tiene, se la rechazaron o la reportaron), va por el flujo obligatorio.
  if (perfil && requiereRegistrarFoto(perfil)) return <Navigate to="/estudiante/foto" replace />

  const continuar = (event: FormEvent) => {
    event.preventDefault()
    if (!password) {
      setErrorPassword('Escribe tu contraseña')
      return
    }
    // La contraseña se comprueba al enviar la foto; si ya escaneó, vuelve a su vista previa.
    setFase(foto ? 'revision' : 'escaneo')
  }

  const usarFoto = async () => {
    if (!foto) return
    setEnviando(true)
    setErrorEnvio('')
    try {
      await enviarMiFoto(foto.archivo, password)
      setPassword('')
      setFase('enviada')
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'No se pudo enviar tu foto.'
      if (mensaje.toLowerCase().includes('contraseña')) {
        setErrorPassword(mensaje)
        setFase('contrasena')
      } else {
        setErrorEnvio(mensaje)
      }
    } finally {
      setEnviando(false)
    }
  }

  const cardClass = isMobile
    ? 'w-full bg-white'
    : 'w-full rounded-md border border-t-4 border-t-[#0439D9] bg-white px-10 py-12 shadow-lg shadow-[#92aad2]'
  const nombre = perfil ? `${perfil.nombre} ${perfil.apellidos}` : ''
  const iniciales = perfil ? `${perfil.nombre.charAt(0)}${perfil.apellidos.charAt(0)}`.toUpperCase() : ''

  return (
    <AuthLayout>
      <div className="mx-auto flex min-h-full w-full items-center justify-center p-7 sm:px-8">
        <div className={`w-full ${isMobile ? 'max-w-md' : 'max-w-xl'}`}>
          <div className={cardClass}>
            {cargando ? (
              <PortalCargando />
            ) : error ? (
              <PortalError mensaje={error} onReintentar={recargar} />
            ) : fase === 'contrasena' ? (
              <form noValidate onSubmit={continuar}>
                <ProgresoAsistente titulo="Cambiar mi foto" pasos={PASOS} paso={1} />
                <EncabezadoAsistente icono={LockKeyhole} titulo="Confirma tu contraseña">
                  Por seguridad, ingresa tu contraseña antes de cambiar tu foto de perfil.
                </EncabezadoAsistente>
                <label htmlFor="cambiar-foto-password" className="text-xs font-semibold text-[#011140]">CONTRASEÑA</label>
                <div className="relative mt-2">
                  <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" size={17} aria-hidden="true" />
                  <input
                    id="cambiar-foto-password"
                    type={verPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    aria-invalid={Boolean(errorPassword)}
                    onChange={(e) => { setPassword(e.target.value); setErrorPassword('') }}
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
                {errorPassword && (
                  <p className="mt-1 flex items-center gap-1 text-[0.70rem] text-[#B91C1C]">
                    <CircleAlert size={12} aria-hidden="true" /> {errorPassword}
                  </p>
                )}
                <Link to="/forgot-password" className="mt-2 inline-block text-xs font-semibold text-[#0439D9] hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/estudiante/perfil')}
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-[#D8E3F5] text-sm font-semibold text-[#0439D9] hover:bg-[#F1F6FF]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[#0439D9] text-sm font-bold text-white hover:bg-[#0027a2]"
                  >
                    Continuar
                  </button>
                </div>
              </form>
            ) : fase === 'escaneo' ? (
              <>
                <ProgresoAsistente titulo="Cambiar mi foto" pasos={PASOS} paso={2} />
                <EscaneoRostro
                  onCapturada={(capturada) => {
                    setFoto(capturada)
                    setFase('revision')
                  }}
                  onCancelar={() => navigate('/estudiante/perfil')}
                />
              </>
            ) : fase === 'revision' && foto ? (
              <>
                <ProgresoAsistente titulo="Cambiar mi foto" pasos={PASOS} paso={3} />
                <EncabezadoAsistente icono={CircleCheck} tono="verde" titulo="Revisa tu foto">
                  Así te verá el personal de control. Si no se ve clara, repite el escaneo.
                </EncabezadoAsistente>
                <img
                  src={foto.url}
                  alt="Tu foto nueva"
                  className="mx-auto mb-4 aspect-[3/4] w-44 rounded-xl border-2 border-[#10B981] object-cover sm:w-48"
                />
                <ul className="mb-4 flex flex-wrap justify-center gap-2" aria-label="Controles de calidad aprobados">
                  {CONTROLES_APROBADOS.map((control) => (
                    <li key={control} className="inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF5] px-2.5 py-1 text-xs font-semibold text-[#047857]">
                      <CircleCheck size={14} aria-hidden="true" /> {control}
                    </li>
                  ))}
                </ul>
                <p className="mb-5 flex items-start gap-2 rounded-xl border border-[#FDE68A] bg-[#FFF7E6] p-3 text-left text-xs text-[#92400E]">
                  <Clock size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  Tu foto actual seguirá vigente hasta que la administración apruebe la nueva.
                </p>
                {errorEnvio && (
                  <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-[#EF4444] bg-[#FFF1F2] p-3 text-xs text-[#B91C1C]">
                    <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <p>{errorEnvio}</p>
                  </div>
                )}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => { setFoto(null); setErrorEnvio(''); setFase('escaneo') }}
                    disabled={enviando}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#D8E3F5] bg-white text-sm font-semibold text-[#0439D9] hover:bg-[#F1F6FF] disabled:opacity-50"
                  >
                    <RefreshCw size={16} aria-hidden="true" /> Repetir escaneo
                  </button>
                  <button
                    type="button"
                    onClick={() => void usarFoto()}
                    disabled={enviando}
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[#0439D9] text-sm font-bold text-white hover:bg-[#0027a2] disabled:opacity-50"
                  >
                    {enviando ? 'Enviando…' : 'Usar esta foto'}
                  </button>
                </div>
              </>
            ) : fase === 'enviada' && foto && perfil ? (
              <div className="flex flex-col items-center text-center">
                <EncabezadoAsistente icono={Clock} tono="ambar" titulo="Foto enviada a revisión">
                  La administración revisará tu nueva foto.
                </EncabezadoAsistente>
                <span className="mb-4 inline-flex items-center gap-1 rounded-full bg-[#FFF7E6] px-3 py-1 text-xs font-semibold text-[#92400E]">
                  <Clock size={13} aria-hidden="true" /> Pendiente de aprobación
                </span>
                <div className="mb-5 grid w-full max-w-xs grid-cols-2 gap-4">
                  <figure>
                    <FotoEstudiante
                      fotoUrl={perfil.fotoUrl}
                      nombre={`${nombre} (vigente)`}
                      iniciales={iniciales}
                      className="flex aspect-[3/4] w-full items-center justify-center rounded-xl bg-[#E9F1FF] text-xl font-bold text-[#7C93B8]"
                    />
                    <figcaption className="mt-2 text-xs font-semibold text-[#011140]">
                      Foto vigente
                      <span className="ml-1 rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[10px] text-[#047857]">En uso</span>
                    </figcaption>
                  </figure>
                  <figure>
                    <img src={foto.url} alt="Tu foto nueva" className="aspect-[3/4] w-full rounded-xl object-cover ring-2 ring-[#F59E0B]" />
                    <figcaption className="mt-2 text-xs font-semibold text-[#011140]">
                      Foto nueva
                      <span className="ml-1 rounded-full bg-[#FFF7E6] px-2 py-0.5 text-[10px] text-[#92400E]">En revisión</span>
                    </figcaption>
                  </figure>
                </div>
                <p className="mb-6 flex items-start gap-2 rounded-xl border border-[#BFD2F5] bg-[#F1F6FF] p-3 text-left text-xs text-[#45628D]">
                  <Info size={16} className="mt-0.5 shrink-0 text-[#0439D9]" aria-hidden="true" />
                  Tu foto anterior sigue vigente hasta que la administración apruebe la nueva. Puedes ver el estado en tu perfil.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/estudiante/perfil', { replace: true })}
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#0439D9] text-sm font-bold text-white hover:bg-[#0027a2]"
                >
                  Entendido
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </AuthLayout>
  )
}

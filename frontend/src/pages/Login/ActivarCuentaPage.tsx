import { FormEvent, InputHTMLAttributes, ReactNode, useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  CircleCheck,
  Circle,
  Eye,
  EyeOff,
  IdCard,
  KeyRound,
  LockKeyhole,
  Mail,
  MailCheck,
  UserRoundCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../../components/layout/AuthLayout'
import { EncabezadoAsistente, ProgresoAsistente } from '../../components/auth/Asistente'
import {
  confirmarActivacionEstudiante,
  solicitarActivacionEstudiante,
  verificarCodigoActivacionEstudiante,
} from '../../services/authService'
import { motivoIdentificadorFicticio } from '../../utils/identificacionValidators'
import { validateNewPassword } from '../../utils/passwordPolicy'
import { ALLOWED_EMAIL_DOMAIN, FIELD_LIMITS } from '../../utils/validators'
import { useIsMobileDevice } from '../../hooks/useIsMobileDevice'

type Paso = 1 | 2 | 3 | 'exito'

const PASOS = ['Identidad', 'Correo', 'Contraseña']
/** El backend espera 60 s entre envíos del código; antes de eso no reenvía nada. */
const SEGUNDOS_ENTRE_ENVIOS = 60

const soloDigitos = (valor: string, max: number) => valor.replace(/\D/g, '').slice(0, max)

/** En la UMSS el correo del estudiante es su código SIS en el dominio institucional. */
const correoDelSis = (codigoSis: string) => `${codigoSis}@${ALLOWED_EMAIL_DOMAIN}`

/** Requisitos de la contraseña, en el mismo orden que la política del backend. */
function reglasPassword(password: string, codigoSis: string, ci: string) {
  return [
    { texto: '8 o más caracteres', cumple: [...password].length >= 8 },
    { texto: 'Una letra mayúscula', cumple: /\p{Lu}/u.test(password) },
    { texto: 'Una letra minúscula', cumple: /\p{Ll}/u.test(password) },
    { texto: 'Un número', cumple: /\p{Nd}/u.test(password) },
    { texto: 'Un símbolo', cumple: /[\p{P}\p{S}]/u.test(password) },
    {
      texto: 'No contiene tu código SIS ni tu C.I.',
      cumple: password.length > 0 && !password.includes(codigoSis) && !password.includes(ci),
    },
  ]
}

function nivelPassword(cumplidas: number, total: number) {
  if (cumplidas === total) return { texto: 'Fuerte', barras: 3, color: 'bg-[#059669]', textoColor: 'text-[#047857]' }
  if (cumplidas >= 4) return { texto: 'Media', barras: 2, color: 'bg-[#D97706]', textoColor: 'text-[#B45309]' }
  return { texto: 'Débil', barras: 1, color: 'bg-[#DC2626]', textoColor: 'text-[#B91C1C]' }
}

interface CampoProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  icono: LucideIcon
  error?: string
  accion?: ReactNode
}

function Campo({ id, label, icono: Icono, error, accion, ...input }: CampoProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-xs font-semibold text-[#011140]">{label}</label>
      <div className="relative">
        <Icono className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" size={17} aria-hidden="true" />
        <input
          id={id}
          aria-invalid={Boolean(error)}
          className={`w-full rounded-xl border py-3 pl-11 text-sm focus:outline-none focus:ring-1 disabled:bg-gray-50 ${accion ? 'pr-11' : 'pr-3'} ${
            error ? 'border-[#FECACA] bg-[#FEF2F2] focus:ring-[#FECACA]' : 'border-[#D8E3F5] focus:ring-[#E1ECFF]'
          }`}
          {...input}
        />
        {accion}
      </div>
      {error && (
        <p className="flex items-center gap-1 text-[0.70rem] text-[#B91C1C]">
          <CircleAlert size={12} aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  )
}

function Alerta({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-[#EF4444] bg-[#FFF1F2] p-3 text-xs text-[#B91C1C]">
      <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p>{children}</p>
    </div>
  )
}

function BotonPrincipal({ cargando, textoCargando, children }: { cargando: boolean; textoCargando: string; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={cargando}
      className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0439D9] text-sm font-bold text-white transition-colors hover:bg-[#0027a2] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {cargando ? textoCargando : children}
    </button>
  )
}

/** Activación de la cuenta del estudiante (CTA-01): identidad → código del correo → contraseña. */
export default function ActivarCuentaPage() {
  const isMobile = useIsMobileDevice()
  const navigate = useNavigate()
  const [paso, setPaso] = useState<Paso>(1)

  const [codigoSis, setCodigoSis] = useState('')
  const [ci, setCi] = useState('')
  const [codigo, setCodigo] = useState('')
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [verConfirmacion, setVerConfirmacion] = useState(false)

  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [avisoEnvio, setAvisoEnvio] = useState('')
  const [mensajeExito, setMensajeExito] = useState('')
  const [cargando, setCargando] = useState(false)
  const [reenviarEn, setReenviarEn] = useState(0)

  useEffect(() => {
    if (reenviarEn <= 0) return
    const id = window.setTimeout(() => setReenviarEn((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [reenviarEn])

  const limpiar = (campo: string) => {
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: '' }))
    if (errorGeneral) setErrorGeneral('')
  }

  const enviarCodigo = async () => {
    setCargando(true)
    setErrorGeneral('')
    try {
      const mensaje = await solicitarActivacionEstudiante({ codigoSis, ci, email: correoDelSis(codigoSis) })
      setAvisoEnvio(mensaje)
      setReenviarEn(SEGUNDOS_ENTRE_ENVIOS)
      return true
    } catch (err: unknown) {
      setErrorGeneral(err instanceof Error ? err.message : 'No se pudo enviar el código.')
      return false
    } finally {
      setCargando(false)
    }
  }

  const verificarIdentidad = async (event: FormEvent) => {
    event.preventDefault()
    const nuevos: Record<string, string> = {}
    if (!/^\d{9}$/.test(codigoSis)) nuevos.codigoSis = 'El código SIS debe tener 9 dígitos'
    else {
      const ficticio = motivoIdentificadorFicticio('codigo', codigoSis)
      if (ficticio) nuevos.codigoSis = ficticio
    }
    if (!/^\d{7,8}$/.test(ci)) nuevos.ci = 'El C.I. debe tener 7 u 8 dígitos'
    else {
      const ficticio = motivoIdentificadorFicticio('ci', ci)
      if (ficticio) nuevos.ci = ficticio
    }
    setErrores(nuevos)
    if (Object.keys(nuevos).length > 0) return
    if (await enviarCodigo()) setPaso(2)
  }

  const verificarCodigo = async (event: FormEvent) => {
    event.preventDefault()
    if (!/^\d{6}$/.test(codigo)) {
      setErrores({ codigo: 'El código tiene 6 dígitos' })
      return
    }
    setErrores({})
    setErrorGeneral('')
    // BUG-E03 de HU#5: con un código falso o vencido no se pasa a crear la contraseña.
    setCargando(true)
    try {
      await verificarCodigoActivacionEstudiante({ codigoSis, codigo })
      setPaso(3)
    } catch (err: unknown) {
      setErrores({ codigo: err instanceof Error ? err.message : 'No se pudo verificar el código.' })
    } finally {
      setCargando(false)
    }
  }

  const reglas = reglasPassword(password, codigoSis, ci)
  const cumplidas = reglas.filter((r) => r.cumple).length
  const nivel = nivelPassword(cumplidas, reglas.length)

  const activarCuenta = async (event: FormEvent) => {
    event.preventDefault()
    const nuevos: Record<string, string> = {}
    const errorPassword = validateNewPassword(password)
    if (errorPassword) nuevos.password = errorPassword
    else if (!reglas[reglas.length - 1].cumple) nuevos.password = 'La contraseña no puede contener tu código SIS ni tu C.I.'
    if (!confirmacion) nuevos.confirmacion = 'Confirma la contraseña'
    else if (password !== confirmacion) nuevos.confirmacion = 'Las contraseñas no coinciden'
    setErrores(nuevos)
    if (Object.keys(nuevos).length > 0) return

    setCargando(true)
    setErrorGeneral('')
    try {
      const mensaje = await confirmarActivacionEstudiante({
        codigoSis,
        codigo,
        passwordNueva: password,
        passwordConfirmacion: confirmacion,
      })
      setMensajeExito(mensaje)
      setPassword('')
      setConfirmacion('')
      setPaso('exito')
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'No se pudo activar la cuenta.'
      // El código se valida recién al confirmar: si falló, se vuelve al paso del código.
      if (mensaje.toLowerCase().includes('el código es incorrecto')) {
        setCodigo('')
        setErrores({ codigo: mensaje })
        setPaso(2)
      } else {
        setErrorGeneral(mensaje)
      }
    } finally {
      setCargando(false)
    }
  }

  const botonVer = (visible: boolean, alternar: () => void) => (
    <button
      type="button"
      onClick={alternar}
      aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748B]"
    >
      {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
    </button>
  )

  const cardClass = isMobile
    ? 'w-full bg-white'
    : 'w-full rounded-md border border-t-4 border-t-[#0439D9] bg-white px-10 py-12 shadow-lg shadow-[#92aad2]'

  return (
    <AuthLayout>
      <div className="mx-auto flex min-h-full w-full items-center justify-center p-7 sm:px-8">
        <div className={`flex w-full flex-col items-center ${isMobile ? 'max-w-md' : 'max-w-xl'}`}>
          {isMobile && (
            <div className="mb-6 flex w-full flex-col items-center">
              <p className="rounded-full border border-[#D8E3F5] bg-[#F4F8FF] px-4 py-2 text-center text-[11px] font-bold text-[#0439D9]">
                SISTEMA DE CONTROL &amp; INGRESO A EXÁMENES
              </p>
              <img src="/logo_app.png" alt="SIGEX" className="mt-7 h-15 w-48 object-contain" />
            </div>
          )}

          <div className="w-full">
            {paso !== 'exito' && (
              <Link
                to="/login"
                className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#0439D9] hover:text-[#0027a2]"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Volver al login
              </Link>
            )}

            <div className={cardClass}>
              {paso === 1 && (
                <>
                  <ProgresoAsistente titulo="Activar mi cuenta" pasos={PASOS} paso={1} />
                  <EncabezadoAsistente icono={UserRoundCheck} titulo="Verifica tu identidad">
                    Ingresa tu código SIS y tu C.I. registrados en la UMSS. Si coinciden, te enviaremos un código a tu
                    correo institucional.
                  </EncabezadoAsistente>
                  <form onSubmit={verificarIdentidad} noValidate className="flex flex-col gap-4">
                    <Campo
                      id="activacion-sis"
                      label="CÓDIGO SIS"
                      icono={IdCard}
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="202104010"
                      value={codigoSis}
                      error={errores.codigoSis}
                      onChange={(e) => {
                        setCodigoSis(soloDigitos(e.target.value, FIELD_LIMITS.codigoSis.max))
                        limpiar('codigoSis')
                      }}
                    />
                    <Campo
                      id="activacion-ci"
                      label="C.I."
                      icono={IdCard}
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="7 u 8 dígitos"
                      value={ci}
                      error={errores.ci}
                      onChange={(e) => {
                        setCi(soloDigitos(e.target.value, FIELD_LIMITS.documento.max))
                        limpiar('ci')
                      }}
                    />
                    <div className="flex items-start gap-2 rounded-xl border border-[#D8E3F5] bg-[#F8FAFC] p-3 text-xs">
                      <Mail size={16} className="mt-0.5 shrink-0 text-[#64748B]" aria-hidden="true" />
                      <p className="text-gray-500">
                        Te enviaremos el código a tu correo institucional:{' '}
                        <strong data-testid="correo-activacion" className="text-[#011140]">
                          {codigoSis.length === FIELD_LIMITS.codigoSis.max ? correoDelSis(codigoSis) : `código SIS@${ALLOWED_EMAIL_DOMAIN}`}
                        </strong>
                      </p>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Usamos estos datos solo para verificar tu identidad. No se muestran ni se comparten.
                    </p>
                    {errorGeneral && <Alerta>{errorGeneral}</Alerta>}
                    <BotonPrincipal cargando={cargando} textoCargando="VERIFICANDO...">
                      CONTINUAR <ArrowRight size={16} aria-hidden="true" />
                    </BotonPrincipal>
                  </form>
                </>
              )}

              {paso === 2 && (
                <>
                  <ProgresoAsistente titulo="Activar mi cuenta" pasos={PASOS} paso={2} />
                  <EncabezadoAsistente icono={MailCheck} titulo="Verifica tu correo">
                    Escribe el código de 6 dígitos que enviamos a <strong className="text-[#011140]">{correoDelSis(codigoSis)}</strong>.
                    Vence en 10 minutos.
                  </EncabezadoAsistente>
                  {avisoEnvio && (
                    <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#BFD2F5] bg-[#F1F6FF] p-3 text-xs text-[#45628D]">
                      <Mail size={16} className="mt-0.5 shrink-0 text-[#0439D9]" aria-hidden="true" />
                      <p>{avisoEnvio}</p>
                    </div>
                  )}
                  <form onSubmit={verificarCodigo} noValidate className="flex flex-col gap-4">
                    <Campo
                      id="activacion-codigo"
                      label="CÓDIGO DE VERIFICACIÓN"
                      icono={KeyRound}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="000000"
                      value={codigo}
                      error={errores.codigo}
                      onChange={(e) => {
                        setCodigo(soloDigitos(e.target.value, 6))
                        limpiar('codigo')
                      }}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-gray-500">¿No te llegó? Revisa también tu carpeta de spam.</span>
                      <button
                        type="button"
                        disabled={reenviarEn > 0 || cargando}
                        onClick={() => void enviarCodigo()}
                        className="font-semibold text-[#0439D9] hover:underline disabled:cursor-not-allowed disabled:text-[#A9B8CF] disabled:no-underline"
                      >
                        {reenviarEn > 0 ? `Reenviar código en ${reenviarEn} s` : 'Reenviar código'}
                      </button>
                    </div>
                    {errorGeneral && <Alerta>{errorGeneral}</Alerta>}
                    <BotonPrincipal cargando={false} textoCargando="">
                      CONTINUAR <ArrowRight size={16} aria-hidden="true" />
                    </BotonPrincipal>
                    <button
                      type="button"
                      onClick={() => {
                        setErrores({})
                        setErrorGeneral('')
                        setPaso(1)
                      }}
                      className="text-xs font-semibold text-[#0439D9] hover:underline"
                    >
                      Corregir mis datos
                    </button>
                  </form>
                </>
              )}

              {paso === 3 && (
                <>
                  <ProgresoAsistente titulo="Activar mi cuenta" pasos={PASOS} paso={3} />
                  <EncabezadoAsistente icono={LockKeyhole} titulo="Crea tu contraseña">
                    Protege tu cuenta institucional con una contraseña única y segura.
                  </EncabezadoAsistente>
                  <form onSubmit={activarCuenta} noValidate className="flex flex-col gap-4">
                    <Campo
                      id="activacion-password"
                      label="CONTRASEÑA"
                      icono={LockKeyhole}
                      type={verPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      error={errores.password}
                      accion={botonVer(verPassword, () => setVerPassword((v) => !v))}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        limpiar('password')
                      }}
                    />
                    {password && (
                      <div aria-live="polite">
                        <div className="mb-1 flex items-center justify-between text-[11px]">
                          <span className="text-gray-500">Seguridad de la contraseña</span>
                          <span className={`font-semibold ${nivel.textoColor}`}>{nivel.texto}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[1, 2, 3].map((barra) => (
                            <span key={barra} className={`h-1 rounded-full ${barra <= nivel.barras ? nivel.color : 'bg-[#E4E9F2]'}`} />
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="mb-2 text-xs font-semibold text-[#011140]">Tu contraseña debe cumplir:</p>
                      <ul className="flex flex-col gap-1.5">
                        {reglas.map(({ texto, cumple }) => (
                          <li key={texto} className={`flex items-center gap-2 text-xs ${cumple ? 'text-[#047857]' : 'text-gray-500'}`}>
                            {cumple ? <CircleCheck size={14} aria-hidden="true" /> : <Circle size={14} aria-hidden="true" />}
                            {texto}
                            <span className="sr-only">{cumple ? '(cumple)' : '(falta)'}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Campo
                      id="activacion-confirmacion"
                      label="CONFIRMAR CONTRASEÑA"
                      icono={LockKeyhole}
                      type={verConfirmacion ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmacion}
                      error={errores.confirmacion}
                      accion={botonVer(verConfirmacion, () => setVerConfirmacion((v) => !v))}
                      onChange={(e) => {
                        setConfirmacion(e.target.value)
                        limpiar('confirmacion')
                      }}
                    />
                    {confirmacion && password === confirmacion && !errores.confirmacion && (
                      <p className="flex items-center gap-1 text-[0.70rem] text-[#047857]">
                        <CircleCheck size={12} aria-hidden="true" /> Las contraseñas coinciden.
                      </p>
                    )}
                    {errorGeneral && <Alerta>{errorGeneral}</Alerta>}
                    <BotonPrincipal cargando={cargando} textoCargando="ACTIVANDO...">
                      ACTIVAR MI CUENTA <ArrowRight size={16} aria-hidden="true" />
                    </BotonPrincipal>
                  </form>
                </>
              )}

              {paso === 'exito' && (
                <div className="flex flex-col items-center text-center">
                  <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#ECFDF5] text-[#047857]">
                    <CheckCircle2 size={30} aria-hidden="true" />
                  </span>
                  <h1 className="text-2xl font-extrabold text-[#092068]">Tu cuenta está activa</h1>
                  <p className="mt-2 text-sm text-gray-500">{mensajeExito}</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Inicia sesión con tu correo institucional y la contraseña que acabas de crear.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="mt-8 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0439D9] text-sm font-bold text-white transition-colors hover:bg-[#0027a2]"
                  >
                    INICIAR SESIÓN <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {isMobile && (
            <p className="mt-auto pt-12 text-center text-xs leading-5 text-[#627A9B]">
              NexaCore Arquitectura de Software S.R.L 2026
              <br />
              Laboratorio TIS – UMSS v0.1
            </p>
          )}
        </div>
      </div>
    </AuthLayout>
  )
}

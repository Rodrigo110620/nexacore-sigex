import { FormEvent, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CircleAlert, Clock3, Eye, EyeOff, Lock, LockKeyhole, CheckCircle2 } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import AuthLayout from '../../components/layout/AuthLayout'
import { estadoEnlaceReset, resetPassword } from '../../services/authService'
import { PASSWORD_REQUIREMENTS, validateNewPassword } from '../../utils/passwordPolicy'
import { useIsMobileDevice } from '../../hooks/useIsMobileDevice'
import { PIE_CORTO } from '../../utils/version'

export default function ResetPasswordPage() {
  const isMobile = useIsMobileDevice()
  const [searchParams] = useSearchParams()
  const token = useMemo(() => searchParams.get('token')?.trim() ?? '', [searchParams])

  const [passwordNueva, setPasswordNueva] = useState('')
  const [passwordConfirmacion, setPasswordConfirmacion] = useState('')
  const [showNueva, setShowNueva] = useState(false)
  const [showConfirmacion, setShowConfirmacion] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)
  // «Enlace no válido» (sección 3 del diseño): se consulta al abrir; sin token, ya no sirve.
  const [enlace, setEnlace] = useState<{ token: string; valido: boolean | null } | null>(null)
  useEffect(() => {
    if (!token) return
    let vigente = true
    void estadoEnlaceReset(token).then((valido) => { if (vigente) setEnlace({ token, valido }) })
    return () => { vigente = false }
  }, [token])
  const enlaceInvalido = !token || (enlace?.token === token && enlace.valido === false)
  const verificando = Boolean(token) && enlace?.token !== token

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setGeneralError('')
    setSuccessMessage('')

    if (!token) {
      setGeneralError('Falta el enlace de restablecimiento. Solicita uno nuevo desde el login.')
      return
    }

    const errors: Record<string, string> = {}
    const nuevaError = validateNewPassword(passwordNueva)
    if (nuevaError) errors.passwordNueva = nuevaError
    if (!passwordConfirmacion.trim()) {
      errors.passwordConfirmacion = 'Confirma la nueva contraseña'
    } else if (passwordNueva !== passwordConfirmacion) {
      errors.passwordConfirmacion = 'Las contraseñas no coinciden'
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setLoading(true)
    try {
      const mensaje = await resetPassword({
        token,
        passwordNueva,
        passwordConfirmacion,
      })
      setSuccessMessage(mensaje)
      setPasswordNueva('')
      setPasswordConfirmacion('')
    } catch (err: unknown) {
      setGeneralError(err instanceof Error ? err.message : 'No se pudo actualizar la contraseña.')
    } finally {
      setLoading(false)
    }
  }

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
            {/* Con el enlace no válido, la tarjeta ya trae «Volver al inicio de sesión». */}
            {!enlaceInvalido && (
              <Link
                to="/login"
                className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#0439D9] hover:text-[#0027a2]"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Volver al login
              </Link>
            )}

            {enlaceInvalido ? (
              <div className={cardClass} role="alert">
                <span className="grid size-11 place-items-center rounded-xl bg-[#FFF7E6] text-[#B45309]" aria-hidden="true">
                  <Clock3 size={20} />
                </span>
                <h1 className="mt-4 text-2xl font-extrabold text-[#092068]">Este enlace ya no es válido</h1>
                <p className="mt-2 text-sm text-gray-500">El enlace venció (es válido 30 minutos) o ya fue usado.</p>
                <p className="mt-5 flex items-start gap-2 rounded-xl border border-[#FDE7B0] bg-[#FFFBEB] p-3 text-xs text-[#B45309]">
                  <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  Por seguridad, este enlace ya no permite cambiar tu contraseña. Solicita uno nuevo para continuar.
                </p>
                <Link to="/forgot-password"
                  className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0439D9] text-sm font-bold text-white transition-colors hover:bg-[#0027a2]">
                  Solicitar nuevo enlace <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <div className="mt-5 border-t border-[#E6EAF0] pt-4 text-center">
                  <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0439D9] hover:underline">
                    <ArrowLeft size={15} aria-hidden="true" /> Volver al inicio de sesión
                  </Link>
                </div>
                <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[#627A9B]">
                  <Lock size={12} aria-hidden="true" /> Acceso con tu cuenta institucional
                </p>
              </div>
            ) : verificando ? (
              <div className={cardClass}>
                <p role="status" className="py-6 text-center text-sm text-[#627A9B]">Verificando el enlace…</p>
              </div>
            ) : (
            <div className={cardClass}>
              <h1 className="text-2xl font-extrabold text-[#092068]">Restablecer contraseña</h1>
              <p className="mt-3 text-sm text-gray-500">
                Elige una contraseña nueva para tu cuenta SIGEX.
              </p>


              <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-[#011140]">NUEVA CONTRASEÑA</label>
                  <div className="relative">
                    <LockKeyhole
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]"
                      size={17}
                      aria-hidden="true"
                    />
                    <input
                      type={showNueva ? 'text' : 'password'}
                      value={passwordNueva}
                      disabled={!token || Boolean(successMessage)}
                      onChange={(e) => {
                        setPasswordNueva(e.target.value)
                        if (fieldErrors.passwordNueva) {
                          setFieldErrors((prev) => ({ ...prev, passwordNueva: '' }))
                        }
                      }}
                      className="w-full rounded-xl border border-[#D8E3F5] py-3 pl-11 pr-11 text-sm focus:outline-none focus:ring-1 focus:ring-[#E1ECFF] disabled:bg-gray-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNueva((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748B]"
                      aria-label={showNueva ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showNueva ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500">{PASSWORD_REQUIREMENTS}</p>
                  {fieldErrors.passwordNueva && (
                    <p className="text-[0.70rem] text-[#B91C1C]">{fieldErrors.passwordNueva}</p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-[#011140]">CONFIRMAR CONTRASEÑA</label>
                  <div className="relative">
                    <LockKeyhole
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]"
                      size={17}
                      aria-hidden="true"
                    />
                    <input
                      type={showConfirmacion ? 'text' : 'password'}
                      value={passwordConfirmacion}
                      disabled={!token || Boolean(successMessage)}
                      onChange={(e) => {
                        setPasswordConfirmacion(e.target.value)
                        if (fieldErrors.passwordConfirmacion) {
                          setFieldErrors((prev) => ({ ...prev, passwordConfirmacion: '' }))
                        }
                      }}
                      className="w-full rounded-xl border border-[#D8E3F5] py-3 pl-11 pr-11 text-sm focus:outline-none focus:ring-1 focus:ring-[#E1ECFF] disabled:bg-gray-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmacion((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748B]"
                      aria-label={showConfirmacion ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showConfirmacion ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {fieldErrors.passwordConfirmacion && (
                    <p className="text-[0.70rem] text-[#B91C1C]">{fieldErrors.passwordConfirmacion}</p>
                  )}
                </div>

                {generalError && (
                  <div className="flex items-start gap-2 rounded-xl border border-[#EF4444] bg-[#FFF1F2] p-3 text-xs text-[#B91C1C]">
                    <CircleAlert size={16} className="mt-0.5 shrink-0" />
                    <p>{generalError}</p>
                  </div>
                )}

                {successMessage && (
                  <div className="flex items-start gap-2 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-3 text-xs text-[#166534]">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-[#14532D]">Listo</p>
                      <p>{successMessage}</p>
                      <Link to="/login" className="mt-2 inline-block font-semibold underline">
                        Ir a iniciar sesión
                      </Link>
                    </div>
                  </div>
                )}

                {!successMessage && (
                  <button
                    type="submit"
                    disabled={loading || !token}
                    className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#0439D9] text-sm font-bold text-white transition-colors hover:bg-[#0027a2] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? 'GUARDANDO...' : 'GUARDAR CONTRASEÑA'}
                  </button>
                )}
              </form>
            </div>
            )}
          </div>

          {isMobile && (
            <p className="mt-auto pt-12 text-center text-xs leading-5 text-[#627A9B]">
              © 2026 NexaCore Arquitectura de Software S.R.L.
              <br />
              {PIE_CORTO}
            </p>
          )}
        </div>
      </div>
    </AuthLayout>
  )
}

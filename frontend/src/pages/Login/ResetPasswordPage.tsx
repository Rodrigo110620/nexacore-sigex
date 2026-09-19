import { FormEvent, useMemo, useState } from 'react'
import { ArrowLeft, CircleAlert, Eye, EyeOff, LockKeyhole, CheckCircle2 } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import AuthLayout from '../../components/layout/AuthLayout'
import { resetPassword } from '../../services/authService'

function validatePassword(value: string): string {
  if (!value.trim()) return 'La nueva contraseña es obligatoria'
  if (value.length < 6) return 'Mínimo 6 caracteres'
  if (value.length > 72) return 'Máximo 72 caracteres'
  return ''
}

export default function ResetPasswordPage() {
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setGeneralError('')
    setSuccessMessage('')

    if (!token) {
      setGeneralError('Falta el enlace de restablecimiento. Solicita uno nuevo desde el login.')
      return
    }

    const errors: Record<string, string> = {}
    const nuevaError = validatePassword(passwordNueva)
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

  return (
    <AuthLayout>
      <div className="mx-auto bg-slate-300 flex w-full max-w-lg flex-col justify-center  px-6 py-10 sm:px-8">
        <Link
          to="/login"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#0439D9] hover:text-[#0027a2]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Volver al login
        </Link>

        <h1 className="text-2xl font-bold text-[#092068]">Restablecer contraseña</h1>
        <p className="mt-2 text-sm text-gray-500">
          Elige una contraseña nueva para tu cuenta SIGEX.
        </p>

        {!token && (
          <div className="mt-6 flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs text-[#B91C1C]">
            <CircleAlert size={16} className="mt-0.5 shrink-0" />
            <div>
              <p>El enlace no incluye un token válido.</p>
              <Link to="/forgot-password" className="mt-1 inline-block font-semibold underline">
                Solicitar un enlace nuevo
              </Link>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[#011140]">NUEVA CONTRASEÑA</label>
            <div className="relative">
              <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" size={17} aria-hidden="true" />
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
            {fieldErrors.passwordNueva && (
              <p className="text-[0.70rem] text-[#B91C1C]">{fieldErrors.passwordNueva}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[#011140]">CONFIRMAR CONTRASEÑA</label>
            <div className="relative">
              <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" size={17} aria-hidden="true" />
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
    </AuthLayout>
  )
}

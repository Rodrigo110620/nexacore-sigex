import { FormEvent, useState } from 'react'
import { ArrowLeft, CircleAlert, Mail, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import AuthLayout from '../../components/layout/AuthLayout'
import { requestPasswordReset } from '../../services/authService'
import { validateEmail, FIELD_LIMITS } from '../../utils/validators'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [generalError, setGeneralError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setGeneralError('')
    setSuccessMessage('')

    const error = validateEmail(email)
    setEmailError(error)
    if (error) return

    setLoading(true)
    try {
      const mensaje = await requestPasswordReset(email.trim())
      setSuccessMessage(mensaje)
    } catch (err: unknown) {
      setGeneralError(err instanceof Error ? err.message : 'No se pudo enviar la solicitud.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="mx-auto flex w-full max-w-lg flex-col justify-center px-6 py-10 sm:px-8">
        <Link
          to="/login"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#0439D9] hover:text-[#0027a2]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Volver al login
        </Link>

        <div className="w-full  bg-white sm:px-4 lg:mt-0 lg:rounded-md lg:border lg:border-t-4 lg:border-t-[#0439D9] lg:px-10 lg:py-12 lg:shadow-lg lg:shadow-[#92aad2] xl:px-12">
          <h1 className="text-2xl font-bold text-[#092068]">¿Olvidaste tu contraseña?</h1>
          <p className="mt-3 text-sm text-gray-500">
            Ingresa tu correo. Si está registrado, te enviaremos un enlace para crear una nueva
            contraseña.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#011140]">CORREO ELECTRÓNICO</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" size={17} aria-hidden="true" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (emailError) setEmailError('')
                    if (generalError) setGeneralError('')
                  }}
                  placeholder="usuario@cualquierdominio"
                  maxLength={FIELD_LIMITS.email.max}
                  className={`w-full rounded-xl border py-3 pl-11 pr-3 text-sm focus:outline-none focus:ring-1 ${emailError
                    ? 'border-[#FECACA] bg-[#FEF2F2] focus:ring-[#FECACA]'
                    : 'border-[#D8E3F5] focus:ring-[#E1ECFF]'
                    }`}
                />
              </div>
              {emailError && (
                <p className="flex items-center gap-1 text-[0.70rem] text-[#B91C1C]">
                  <CircleAlert size={12} /> {emailError}
                </p>
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
                  <p className="font-bold text-[#14532D]">Revisa tu correo</p>
                  <p>{successMessage}</p>
                  <p className="mt-2 text-[11px] text-[#3F6212]">
                    Si no llega en unos minutos, revisa spam o solicita un enlace nuevo.
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#0439D9] text-sm font-bold text-white transition-colors hover:bg-[#0027a2] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'ENVIANDO...' : 'ENVIAR ENLACE'}
            </button>
          </form>

        </div>
      </div>
    </AuthLayout>
  )
}

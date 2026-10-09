import { FormEvent, useState } from 'react'
import { ArrowLeft, CircleAlert, Mail, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import AuthLayout from '../../components/layout/AuthLayout'
import { requestPasswordReset } from '../../services/authService'
import { validateEmail, FIELD_LIMITS } from '../../utils/validators'
import { useIsMobileDevice } from '../../hooks/useIsMobileDevice'

export default function ForgotPasswordPage() {
  const isMobile = useIsMobileDevice()
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
            <Link
              to="/login"
              className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#0439D9] hover:text-[#0027a2]"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Volver al login
            </Link>

            <div className={cardClass}>
              <h1 className="text-2xl font-extrabold text-[#092068]">¿Olvidaste tu contraseña?</h1>
              <p className="mt-3 text-sm text-gray-500">
                Ingresa tu correo institucional. Por seguridad, siempre verás el mismo mensaje: si el correo
                está registrado y activo, recibirás el enlace; si no, no se enviará nada.
              </p>

              <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-[#011140]">CORREO ELECTRÓNICO INSTITUCIONAL</label>
                  <div className="relative">
                    <Mail
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]"
                      size={17}
                      aria-hidden="true"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (emailError) setEmailError('')
                        if (generalError) setGeneralError('')
                        if (successMessage) setSuccessMessage('')
                      }}
                      placeholder="usuario@est.umss.edu"
                      maxLength={FIELD_LIMITS.email.max}
                      className={`w-full rounded-xl border py-3 pl-11 pr-3 text-sm focus:outline-none focus:ring-1 ${
                        emailError
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
                      <p className="font-bold text-[#14532D]">Solicitud recibida</p>
                      <p>{successMessage}</p>
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

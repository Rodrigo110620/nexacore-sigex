import { FormEvent, useEffect, useState } from 'react'
import {
  ArrowLeft,
  CircleAlert,
  Eye,
  EyeOff,
  IdCard,
  KeyRound,
  LoaderCircle,
  Mail,
  Shield,
  UserRound,
  CheckCircle2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import { PASSWORD_REQUIREMENTS, validateNewPassword } from '../../utils/passwordPolicy'
import {
  cambiarPassword,
  getMiPerfil,
  type PerfilUsuario,
} from '../../services/profileService'

export default function PerfilPage() {
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null)
  const [loadingPerfil, setLoadingPerfil] = useState(true)
  const [perfilError, setPerfilError] = useState('')

  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [passwordConfirmacion, setPasswordConfirmacion] = useState('')
  const [showActual, setShowActual] = useState(false)
  const [showNueva, setShowNueva] = useState(false)
  const [showConfirmacion, setShowConfirmacion] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoadingPerfil(true)
      setPerfilError('')
      try {
        const data = await getMiPerfil()
        if (!cancelled) setPerfil(data)
      } catch {
        if (!cancelled) setPerfilError('No se pudo cargar tu perfil. Intenta más tarde.')
      } finally {
        if (!cancelled) setLoadingPerfil(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmitPassword = async (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    setFormSuccess('')

    const errors: Record<string, string> = {}
    if (!passwordActual.trim()) errors.passwordActual = 'La contraseña actual es obligatoria'
    const nuevaError = validateNewPassword(passwordNueva)
    if (nuevaError) errors.passwordNueva = nuevaError
    if (!passwordConfirmacion.trim()) {
      errors.passwordConfirmacion = 'Confirma la nueva contraseña'
    } else if (passwordNueva !== passwordConfirmacion) {
      errors.passwordConfirmacion = 'Las contraseñas no coinciden'
    }
    if (passwordActual && passwordNueva && passwordActual === passwordNueva) {
      errors.passwordNueva = 'La nueva contraseña debe ser distinta a la actual'
    }

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    try {
      const mensaje = await cambiarPassword({
        passwordActual,
        passwordNueva,
        passwordConfirmacion,
      })
      setFormSuccess(mensaje)
      setPasswordActual('')
      setPasswordNueva('')
      setPasswordConfirmacion('')
      setFieldErrors({})
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : 'No se pudo cambiar la contraseña.')
    } finally {
      setSaving(false)
    }
  }

  const nombreCompleto = perfil
    ? `${perfil.nombre} ${perfil.apellidos}`.trim()
    : 'Usuario'
  const roleLabel = perfil?.roles?.length ? perfil.roles.join(', ') : 'Sin rol asignado'
  const initials = nombreCompleto
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'U'

  return (
    <PanelLayout>
      <div className="min-h-full bg-[#F8FBFF] pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-8">
        <section className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="mb-6">
            <Link
              to="/dashboard/usuarios"
              className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#0439D9] hover:text-[#0027a2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9]"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Volver
            </Link>
            <h1 className="text-xl font-bold text-[#011140] sm:text-2xl">Mi perfil</h1>
            <p className="mt-1 text-sm text-gray-600">
              Consulta tus datos y cambia tu contraseña de acceso.
            </p>
          </div>

          {loadingPerfil ? (
            <div
              role="status"
              className="rounded-2xl border border-[#D8E3F5] bg-white px-6 py-12 text-center text-[#011140]"
            >
              <LoaderCircle className="mx-auto animate-spin text-[#0439D9]" size={28} aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold">Cargando perfil...</p>
            </div>
          ) : perfilError ? (
            <div role="alert" className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-5 py-4 text-sm text-[#B91C1C]">
              {perfilError}
            </div>
          ) : perfil ? (
            <div className="rounded-2xl border border-[#D8E3F5] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#0439D9] text-lg font-bold text-white">
                  {initials}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold text-[#011140]">{nombreCompleto}</h2>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-[#0439D9]">
                    <Shield size={14} aria-hidden="true" />
                    {roleLabel}
                  </p>
                </div>
              </div>

              <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-[#EDF1F7] pt-5 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <UserRound size={18} className="mt-0.5 shrink-0 text-[#627A9B]" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-[#627A9B]">Nombres</dt>
                    <dd className="mt-0.5 break-words text-sm font-medium text-[#011140]">{perfil.nombre}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <UserRound size={18} className="mt-0.5 shrink-0 text-[#627A9B]" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-[#627A9B]">Apellidos</dt>
                    <dd className="mt-0.5 break-words text-sm font-medium text-[#011140]">{perfil.apellidos}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <IdCard size={18} className="mt-0.5 shrink-0 text-[#627A9B]" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-[#627A9B]">CI / Documento</dt>
                    <dd className="mt-0.5 text-sm font-medium text-[#011140]">{perfil.ci}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail size={18} className="mt-0.5 shrink-0 text-[#627A9B]" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-[#627A9B]">Correo</dt>
                    <dd className="mt-0.5 break-all text-sm font-medium text-[#011140]">{perfil.email}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield size={18} className="mt-0.5 shrink-0 text-[#627A9B]" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-[#627A9B]">Estado</dt>
                    <dd className="mt-0.5 text-sm font-medium capitalize text-[#011140]">{perfil.estado}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield size={18} className="mt-0.5 shrink-0 text-[#627A9B]" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-[#627A9B]">Roles</dt>
                    <dd className="mt-0.5 text-sm font-medium text-[#011140]">{roleLabel}</dd>
                  </div>
                </div>
              </dl>
            </div>
          ) : null}

          <div className="mt-5 rounded-2xl border border-[#D8E3F5] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E9F1FF] text-[#0439D9]">
                <KeyRound size={18} aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#011140]">Cambiar contraseña</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Ingresa tu contraseña actual y define una nueva.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitPassword} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#011140]">Contraseña actual *</label>
                <div className="relative">
                  <input
                    type={showActual ? 'text' : 'password'}
                    value={passwordActual}
                    onChange={(e) => {
                      setPasswordActual(e.target.value)
                      setFieldErrors((prev) => ({ ...prev, passwordActual: '' }))
                      setFormError('')
                      setFormSuccess('')
                    }}
                    className={`w-full rounded-xl border py-2.5 pl-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-[#0439D9] ${
                      fieldErrors.passwordActual ? 'border-red-500 bg-[#FEF2F2]' : 'border-[#D8E3F5]'
                    }`}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowActual((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7B9ACB]"
                    aria-label={showActual ? 'Ocultar contraseña actual' : 'Mostrar contraseña actual'}
                  >
                    {showActual ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {fieldErrors.passwordActual && (
                  <p className="mt-1 text-[11px] text-red-500">{fieldErrors.passwordActual}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#011140]">Nueva contraseña *</label>
                <div className="relative">
                  <input
                    type={showNueva ? 'text' : 'password'}
                    value={passwordNueva}
                    onChange={(e) => {
                      setPasswordNueva(e.target.value)
                      setFieldErrors((prev) => ({ ...prev, passwordNueva: '' }))
                      setFormError('')
                      setFormSuccess('')
                    }}
                    className={`w-full rounded-xl border py-2.5 pl-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-[#0439D9] ${
                      fieldErrors.passwordNueva ? 'border-red-500 bg-[#FEF2F2]' : 'border-[#D8E3F5]'
                    }`}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNueva((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7B9ACB]"
                    aria-label={showNueva ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'}
                  >
                    {showNueva ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-gray-500">{PASSWORD_REQUIREMENTS}</p>
                {fieldErrors.passwordNueva && (
                  <p className="mt-1 text-[11px] text-red-500">{fieldErrors.passwordNueva}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#011140]">Confirmar nueva contraseña *</label>
                <div className="relative">
                  <input
                    type={showConfirmacion ? 'text' : 'password'}
                    value={passwordConfirmacion}
                    onChange={(e) => {
                      setPasswordConfirmacion(e.target.value)
                      setFieldErrors((prev) => ({ ...prev, passwordConfirmacion: '' }))
                      setFormError('')
                      setFormSuccess('')
                    }}
                    className={`w-full rounded-xl border py-2.5 pl-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-[#0439D9] ${
                      fieldErrors.passwordConfirmacion ? 'border-red-500 bg-[#FEF2F2]' : 'border-[#D8E3F5]'
                    }`}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmacion((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7B9ACB]"
                    aria-label={showConfirmacion ? 'Ocultar confirmación' : 'Mostrar confirmación'}
                  >
                    {showConfirmacion ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {fieldErrors.passwordConfirmacion && (
                  <p className="mt-1 text-[11px] text-red-500">{fieldErrors.passwordConfirmacion}</p>
                )}
              </div>

              {formError && (
                <div className="flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs text-[#B91C1C]">
                  <CircleAlert size={16} className="mt-0.5 shrink-0" />
                  <p>{formError}</p>
                </div>
              )}

              {formSuccess && (
                <div className="flex items-start gap-2 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-3 text-xs text-[#166534]">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                  <p>{formSuccess}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={saving || loadingPerfil || Boolean(perfilError)}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#0439D9] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0027a2] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {saving ? 'Guardando...' : 'Actualizar contraseña'}
              </button>
            </form>
          </div>
        </section>
        <MobileBottomNav />
      </div>
    </PanelLayout>
  )
}

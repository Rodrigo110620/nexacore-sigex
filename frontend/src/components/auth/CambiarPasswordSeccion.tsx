import { FormEvent, useState } from 'react'
import { CircleAlert, CircleCheck, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react'
import { cambiarPassword } from '../../services/profileService'
import { PASSWORD_REQUIREMENTS, validateNewPassword } from '../../utils/passwordPolicy'

function CampoPassword({ id, etiqueta, valor, error, placeholder, onChange }: {
  id: string
  etiqueta: string
  valor: string
  error?: string
  placeholder?: string
  onChange: (valor: string) => void
}) {
  const [ver, setVer] = useState(false)
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold text-[#011140]">{etiqueta}</label>
      <div className="relative">
        <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" size={16} aria-hidden="true" />
        <input
          id={id}
          type={ver ? 'text' : 'password'}
          value={valor}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          autoComplete={id === 'perfil-password-actual' ? 'current-password' : 'new-password'}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-lg border py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 ${
            error ? 'border-[#FECACA] bg-[#FEF2F2] focus:ring-[#FECACA]' : 'border-[#D8E3F5] focus:ring-[#E1ECFF]'
          }`}
        />
        <button
          type="button"
          onClick={() => setVer((v) => !v)}
          aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B]"
        >
          {ver ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </div>
      {error && (
        <p className="flex items-center gap-1 text-[11px] text-[#B91C1C]">
          <CircleAlert size={12} aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  )
}

/**
 * «Seguridad · cambiar contraseña», igual para el estudiante y para el personal (ADMIN, DOCENTE, CONTROL).
 * {@code restriccion}: una regla extra del rol (p. ej. el estudiante no puede usar su nombre, código SIS ni CI).
 */
export default function CambiarPasswordSeccion({ restriccion }: {
  restriccion?: { texto: string; viola: (nueva: string) => boolean }
}) {
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorEnvio, setErrorEnvio] = useState('')
  const [exito, setExito] = useState('')
  const [guardando, setGuardando] = useState(false)

  const actualizarPassword = async (event: FormEvent) => {
    event.preventDefault()
    setErrorEnvio('')
    setExito('')
    const siguientes: Record<string, string> = {}
    if (!actual) siguientes.actual = 'Escribe tu contraseña actual'
    const errorNueva = validateNewPassword(nueva)
    if (errorNueva) siguientes.nueva = errorNueva
    else if (restriccion?.viola(nueva)) siguientes.nueva = restriccion.texto
    else if (actual && actual === nueva) siguientes.nueva = 'Debe ser distinta a tu contraseña actual'
    if (!confirmacion) siguientes.confirmacion = 'Repite la nueva contraseña'
    else if (confirmacion !== nueva) siguientes.confirmacion = 'Las contraseñas no coinciden'
    setErrores(siguientes)
    if (Object.keys(siguientes).length > 0) return

    setGuardando(true)
    try {
      setExito(await cambiarPassword({ passwordActual: actual, passwordNueva: nueva, passwordConfirmacion: confirmacion }))
      setActual('')
      setNueva('')
      setConfirmacion('')
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.'
      if (/actual/i.test(mensaje)) setErrores({ actual: mensaje })
      else setErrorEnvio(mensaje)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section aria-labelledby="perfil-seguridad" className="rounded-xl border border-[#D8E3F5] bg-white p-5 shadow-sm">
      <h2 id="perfil-seguridad" className="flex items-center gap-2 text-base font-bold text-[#011140]">
        <ShieldCheck size={18} className="text-[#0439D9]" aria-hidden="true" /> Seguridad
      </h2>
      <p className="text-xs text-gray-500">Protege el acceso a tu cuenta cambiando tu contraseña.</p>
      <form noValidate onSubmit={actualizarPassword} className="mt-3 grid gap-3 sm:grid-cols-3">
        <CampoPassword id="perfil-password-actual" etiqueta="Contraseña actual" valor={actual} error={errores.actual} onChange={(v) => { setActual(v); setErrores({}) }} />
        <CampoPassword id="perfil-password-nueva" etiqueta="Nueva contraseña" valor={nueva} error={errores.nueva} placeholder="Mínimo 8 caracteres" onChange={(v) => { setNueva(v); setErrores({}) }} />
        <CampoPassword id="perfil-password-confirmacion" etiqueta="Confirmar nueva contraseña" valor={confirmacion} error={errores.confirmacion} placeholder="Repite la nueva contraseña" onChange={(v) => { setConfirmacion(v); setErrores({}) }} />
        <p className="text-[11px] text-gray-500 sm:col-span-3">
          {PASSWORD_REQUIREMENTS}{restriccion ? ` ${restriccion.texto}.` : ''}
        </p>
        {errorEnvio && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 sm:col-span-3">{errorEnvio}</p>
        )}
        {exito && (
          <p role="status" className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 sm:col-span-3">
            <CircleCheck size={14} aria-hidden="true" /> {exito}
          </p>
        )}
        <div className="sm:col-span-3 sm:flex sm:justify-end">
          <button
            type="submit"
            disabled={guardando}
            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#0439D9] px-5 text-sm font-bold text-white hover:bg-[#0027a2] disabled:opacity-60 sm:w-auto"
          >
            {guardando ? 'Actualizando…' : 'Actualizar contraseña'}
          </button>
        </div>
      </form>
    </section>
  )
}

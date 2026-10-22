import { FormEvent, useState } from 'react'
import { ArrowLeft, Camera, CircleAlert, CircleCheck, Clock, Eye, EyeOff, Info, LockKeyhole, ShieldCheck, TriangleAlert } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import AuthLayout from '../../components/layout/AuthLayout'
import FotoEstudiante from '../../components/estudiantes/FotoEstudiante'
import { PortalCargando, PortalError } from '../../components/estudiantes/PortalEstado'
import useMiPerfil from '../../hooks/useMiPerfil'
import { cambiarPassword } from '../../services/profileService'
import { requiereRegistrarFoto } from '../../services/panelEstudianteService'
import { PASSWORD_REQUIREMENTS, usaDatosDelEstudiante, validateNewPassword } from '../../utils/passwordPolicy'

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-[#E8EEF7] bg-white p-3">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{etiqueta}</dt>
      <dd className="mt-1 truncate text-sm font-semibold text-[#011140]">{valor || '—'}</dd>
    </div>
  )
}

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

/** CTA-02 · Mi perfil del estudiante: su foto (con "Cambiar foto"), sus datos y el cambio de contraseña. */
export default function MiPerfilPage() {
  const { perfil, cargando, error, recargar } = useMiPerfil()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorEnvio, setErrorEnvio] = useState('')
  const [exito, setExito] = useState('')
  const [guardando, setGuardando] = useState(false)

  if (perfil && requiereRegistrarFoto(perfil)) return <Navigate to="/estudiante/foto" replace />

  const actualizarPassword = async (event: FormEvent) => {
    event.preventDefault()
    if (!perfil) return
    setErrorEnvio('')
    setExito('')
    const siguientes: Record<string, string> = {}
    if (!actual) siguientes.actual = 'Escribe tu contraseña actual'
    const errorNueva = validateNewPassword(nueva)
    if (errorNueva) siguientes.nueva = errorNueva
    else if (usaDatosDelEstudiante(nueva, perfil.codigoSis, perfil.nombre)) siguientes.nueva = 'No puede contener tu nombre, tu código SIS ni tu CI'
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

  const solicitud = perfil?.solicitudFoto
  const carrera = perfil?.carreras?.[0]

  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8">
        <Link to="/estudiante" className="inline-flex items-center gap-1 text-sm font-semibold text-[#0439D9] hover:underline">
          <ArrowLeft size={16} aria-hidden="true" /> Volver al inicio
        </Link>
        <h1 className="mt-3 text-2xl font-extrabold text-[#092068]">Mi perfil</h1>
        <p className="text-sm text-gray-500">Consulta tus datos registrados y administra la seguridad de tu cuenta.</p>

        {cargando ? (
          <div className="mt-6"><PortalCargando /></div>
        ) : error || !perfil ? (
          <div className="mt-6"><PortalError mensaje={error || 'No se pudo cargar tu perfil.'} onReintentar={recargar} /></div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <section aria-label="Mi foto" className="flex flex-col items-center rounded-xl border border-[#D8E3F5] bg-white p-5 text-center shadow-sm">
              <FotoEstudiante
                fotoUrl={perfil.fotoUrl}
                nombre={`${perfil.nombre} ${perfil.apellidos}`}
                iniciales={`${perfil.nombre.charAt(0)}${perfil.apellidos.charAt(0)}`.toUpperCase()}
                className="flex aspect-[3/4] w-36 items-center justify-center rounded-xl bg-[#E9F1FF] text-2xl font-bold text-[#7C93B8]"
              />
              <p className="mt-3 text-base font-bold text-[#011140]">{perfil.nombre} {perfil.apellidos}</p>
              <p className="text-xs text-[#627A9B]">SIS {perfil.codigoSis}</p>
              {solicitud?.estado === 'PENDIENTE' ? (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#FFF7E6] px-2.5 py-1 text-[11px] font-semibold text-[#92400E]">
                  <Clock size={12} aria-hidden="true" /> Foto nueva en revisión
                </span>
              ) : (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2.5 py-1 text-[11px] font-semibold text-[#047857]">
                  <CircleCheck size={12} aria-hidden="true" /> Foto aprobada
                </span>
              )}
              {solicitud?.estado === 'RECHAZADA' && (
                <div className="mt-3 w-full rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-left text-xs text-[#7F1D1D]">
                  <p className="flex items-center gap-1 font-semibold text-[#B91C1C]">
                    <TriangleAlert size={13} aria-hidden="true" /> Tu foto nueva fue rechazada
                  </p>
                  <p className="mt-1">{solicitud.motivoRechazo || 'No se indicó un motivo.'}</p>
                  <p className="mt-1 text-[#92400E]">Tu foto anterior sigue vigente. Puedes enviar otra cuando quieras.</p>
                </div>
              )}
              <Link
                to="/estudiante/foto/cambiar"
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#D8E3F5] text-sm font-semibold text-[#0439D9] hover:bg-[#F1F6FF]"
              >
                <Camera size={16} aria-hidden="true" />
                {solicitud?.estado === 'RECHAZADA' ? 'Subir otra foto' : 'Cambiar foto'}
              </Link>
              <p className="mt-2 flex gap-1.5 text-left text-[11px] text-gray-500">
                <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                Si cambias tu foto, la actual seguirá vigente hasta que la administración apruebe la nueva.
              </p>
            </section>

            <div className="flex min-w-0 flex-col gap-4">
              <section aria-labelledby="perfil-datos" className="rounded-xl border border-[#D8E3F5] bg-white p-5 shadow-sm">
                <h2 id="perfil-datos" className="text-base font-bold text-[#011140]">Datos personales y académicos</h2>
                <p className="text-xs text-gray-500">Solo lectura. Estos datos provienen del registro de la universidad.</p>
                <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Dato etiqueta="Nombre completo" valor={`${perfil.nombre} ${perfil.apellidos}`} />
                  <Dato etiqueta="Código SIS" valor={perfil.codigoSis} />
                  <Dato etiqueta="Cédula de identidad" valor={perfil.ciEnmascarado} />
                  <Dato etiqueta="Correo institucional" valor={perfil.email} />
                  <Dato etiqueta="Carrera" valor={carrera?.nombreCarrera ?? ''} />
                  <Dato etiqueta="Facultad" valor={carrera?.nombreFacultad ?? ''} />
                  <Dato etiqueta="Teléfono" valor={perfil.telefono ?? ''} />
                  <Dato etiqueta="Estado de matrícula" valor={perfil.estadoMatricula === 'NO_MATRICULADO' ? 'No matriculado' : 'Matriculado'} />
                </dl>
                <p className="mt-3 text-[11px] text-gray-500">Si algún dato es incorrecto, comunícate con la administración.</p>
              </section>

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
                    {PASSWORD_REQUIREMENTS} No puede contener tu nombre, tu código SIS ni tu CI.
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
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  )
}

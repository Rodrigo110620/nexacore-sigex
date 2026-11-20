import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  IdCard,
  LoaderCircle,
  Mail,
  Shield,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import PanelLayout from '../../components/layout/PanelLayout'
import CambiarPasswordSeccion from '../../components/auth/CambiarPasswordSeccion'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import {
  getMiPerfil,
  getPerfilDelRol,
  type PerfilDelRol as DatosDelRol,
  type PerfilUsuario,
} from '../../services/profileService'
import ErrorCarga from '../../components/ui/ErrorCarga'
import PerfilDelRol from '../../components/perfil/PerfilDelRol'
import CabeceraPerfil from '../../components/perfil/CabeceraPerfil'

export default function PerfilPage() {
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null)
  const [loadingPerfil, setLoadingPerfil] = useState(true)
  const [perfilError, setPerfilError] = useState('')
  const [recargaPerfil, setRecargaPerfil] = useState(0)
  const [rol, setRol] = useState<DatosDelRol | null>(null)
  const [errorRol, setErrorRol] = useState(false)
  const [recargaRol, setRecargaRol] = useState(0)

  useEffect(() => {
    let vigente = true
    getPerfilDelRol()
      .then((d) => { if (vigente) { setRol(d); setErrorRol(false) } })
      .catch(() => { if (vigente) setErrorRol(true) })
    return () => { vigente = false }
  }, [recargaRol])


  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoadingPerfil(true)
      setPerfilError('')
      try {
        const data = await getMiPerfil()
        if (!cancelled) setPerfil(data)
      } catch {
        if (!cancelled) setPerfilError('No se pudo cargar tu perfil.')
      } finally {
        if (!cancelled) setLoadingPerfil(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [recargaPerfil])



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
    <PanelLayout title="MI PERFIL" description="Tus datos, tu foto de perfil y el cambio de contraseña.">
      <div className="min-h-full bg-[#F8FBFF] pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-8">
        <section className="w-full px-4 py-6 sm:px-5 sm:py-8">
          <div className="mb-6">
            <Link
              to="/dashboard/inicio"
              className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#0439D9] hover:text-[#0027a2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9]"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Volver
            </Link>
            <h1 className="text-xl font-bold text-[#011140] sm:text-2xl">Mi perfil</h1>
            <p className="mt-1 text-sm text-gray-600">
              Tus datos, lo propio de tu rol y el cambio de contraseña.
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
            <ErrorCarga mensaje={perfilError} onReintentar={() => setRecargaPerfil((n) => n + 1)} />
          ) : perfil ? (
            <>
              <CabeceraPerfil nombre={nombreCompleto} iniciales={initials} email={perfil.email} roles={perfil.roles}
                fotoUrl={rol?.fotoUrl ?? null} onFotoCambiada={() => setRecargaRol((n) => n + 1)} />
              <section aria-label="Datos personales" className="mt-5 rounded-2xl border border-[#D8E3F5] bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-base font-bold text-[#011140]">Datos personales</h2>
                <p className="mb-4 mt-1 text-sm text-gray-600">Para cambiarlos, pide al administrador.</p>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              </section>
              {/* Lo propio de cada rol: datos y materias del docente, exámenes del control, permisos. */}
              {errorRol ? (
                <ErrorCarga className="mt-5" mensaje="No se pudo cargar la información de tu rol." onReintentar={() => setRecargaRol((n) => n + 1)} />
              ) : rol ? (
                <PerfilDelRol datos={rol} esAdmin={perfil.roles.includes('ADMIN')} />
              ) : (
                <p role="status" className="mt-5 text-sm text-[#627A9B]">Cargando la información de tu rol…</p>
              )}
            </>
          ) : null}


          {/* Cambiar contraseña: el mismo formulario que el estudiante. */}
          <div className="mt-5"><CambiarPasswordSeccion /></div>
        </section>
        <MobileBottomNav />
      </div>
    </PanelLayout>
  )
}

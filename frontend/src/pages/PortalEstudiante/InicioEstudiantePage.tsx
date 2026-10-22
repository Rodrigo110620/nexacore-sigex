import { Camera, CircleCheck, Clock, GraduationCap, LogOut, TriangleAlert } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthLayout from '../../components/layout/AuthLayout'
import { PortalCargando, PortalError } from '../../components/estudiantes/PortalEstado'
import FotoEstudiante from '../../components/estudiantes/FotoEstudiante'
import { useAuth } from '../../context/AuthContext'
import useMiPerfil from '../../hooks/useMiPerfil'
import { requiereRegistrarFoto } from '../../services/panelEstudianteService'

/**
 * Inicio del rol ESTUDIANTE. Si todavía no tiene foto (o se la rechazaron) lo manda a registrarla,
 * porque es obligatoria (CTA-02). El panel con sus exámenes y su QR llega en las siguientes historias.
 */
export default function InicioEstudiantePage() {
  const { nombre, logout } = useAuth()
  const navigate = useNavigate()
  const { perfil, cargando, error, recargar } = useMiPerfil()

  const cerrarSesion = () => {
    logout()
    navigate('/login', { replace: true })
  }

  if (perfil && requiereRegistrarFoto(perfil)) return <Navigate to="/estudiante/foto" replace />

  return (
    <AuthLayout>
      <div className="mx-auto flex min-h-full w-full items-center justify-center p-7 sm:px-8">
        <section className="w-full max-w-xl rounded-md border border-t-4 border-t-[#0439D9] bg-white px-8 py-10 text-center shadow-lg shadow-[#92aad2] sm:px-10">
          {cargando ? (
            <PortalCargando />
          ) : error ? (
            <PortalError mensaje={error} onReintentar={recargar} />
          ) : (
            <>
              <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#F1F6FF] text-[#0439D9]">
                <GraduationCap size={28} aria-hidden="true" />
              </span>
              <h1 className="text-2xl font-extrabold text-[#092068]">Hola{nombre ? `, ${nombre}` : ''}</h1>
              <p className="mt-2 text-sm text-gray-500">Tu cuenta de estudiante está activa.</p>
              {perfil && (
                <div className="mx-auto mt-5 flex max-w-sm items-center gap-4 rounded-xl border border-[#D8E3F5] bg-[#F8FBFF] p-3 text-left">
                  <FotoEstudiante
                    fotoUrl={perfil.fotoUrl}
                    nombre={`${perfil.nombre} ${perfil.apellidos}`}
                    iniciales={`${perfil.nombre.charAt(0)}${perfil.apellidos.charAt(0)}`.toUpperCase()}
                    className="flex h-20 w-16 shrink-0 items-center justify-center rounded-lg bg-[#E9F1FF] text-sm font-bold text-[#7C93B8]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#011140]">Mi foto</p>
                    {perfil.solicitudFoto?.estado === 'PENDIENTE' ? (
                      <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#FFF7E6] px-2 py-0.5 text-[11px] font-semibold text-[#92400E]">
                        <Clock size={12} aria-hidden="true" /> Foto nueva en revisión
                      </p>
                    ) : perfil.solicitudFoto?.estado === 'RECHAZADA' ? (
                      <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[11px] font-semibold text-[#B91C1C]">
                        <TriangleAlert size={12} aria-hidden="true" /> Cambio rechazado
                      </p>
                    ) : (
                      <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-semibold text-[#047857]">
                        <CircleCheck size={12} aria-hidden="true" /> Foto aprobada
                      </p>
                    )}
                    <p className="mt-1 text-[11px] leading-snug text-gray-500">
                      {perfil.solicitudFoto?.estado === 'PENDIENTE'
                        ? 'Mientras tanto, el personal de control usa tu foto actual.'
                        : perfil.solicitudFoto?.estado === 'RECHAZADA'
                          ? `Motivo: ${perfil.solicitudFoto.motivoRechazo || 'no indicado'}. Tu foto anterior sigue vigente.`
                          : 'Es la que usa el personal de control para identificarte.'}
                    </p>
                    <Link
                      to="/estudiante/foto/cambiar"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0439D9] hover:underline"
                    >
                      <Camera size={14} aria-hidden="true" />
                      {perfil.solicitudFoto?.estado === 'RECHAZADA' ? 'Subir otra foto' : 'Cambiar foto'}
                    </Link>
                  </div>
                </div>
              )}
              <p className="mt-4 text-sm text-gray-500">Muy pronto podrás ver aquí tus exámenes y tu QR de ingreso.</p>
            </>
          )}
          <button
            type="button"
            onClick={cerrarSesion}
            className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#D8E3F5] px-6 text-sm font-semibold text-[#0439D9] transition-colors hover:bg-[#F1F6FF]"
          >
            <LogOut size={16} aria-hidden="true" />
            Cerrar sesión
          </button>
        </section>
      </div>
    </AuthLayout>
  )
}

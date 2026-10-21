import { Clock, GraduationCap, LogOut } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import AuthLayout from '../../components/layout/AuthLayout'
import { PortalCargando, PortalError } from '../../components/estudiantes/PortalEstado'
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
              {perfil?.solicitudFoto?.estado === 'PENDIENTE' && (
                <p className="mx-auto mt-4 flex max-w-sm items-start gap-2 rounded-xl border border-[#FDE68A] bg-[#FFF7E6] p-3 text-left text-xs text-[#92400E]">
                  <Clock size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  Tu foto nueva está en revisión. Mientras tanto, el personal de control usa tu foto actual.
                </p>
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

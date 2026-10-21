import { Camera, CircleCheck, LogOut, ScanFace, TriangleAlert } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import AuthLayout from '../../components/layout/AuthLayout'
import { EncabezadoAsistente, ProgresoAsistente } from '../../components/auth/Asistente'
import { PortalCargando, PortalError } from '../../components/estudiantes/PortalEstado'
import { useAuth } from '../../context/AuthContext'
import useMiPerfil from '../../hooks/useMiPerfil'
import { useIsMobileDevice } from '../../hooks/useIsMobileDevice'
import { requiereRegistrarFoto } from '../../services/panelEstudianteService'

const PASOS = ['Indicaciones', 'Escaneo', 'Confirmar']

const REQUISITOS = [
  'Rostro de frente, completo y centrado',
  'Buena luz, sin sombras fuertes en la cara',
  'Sin gorra, lentes oscuros ni barbijo',
  'Solo tú en la imagen, con fondo claro',
]

const CONSEJOS_TRAS_RECHAZO = [
  'Busca un lugar con buena luz',
  'Quédate quieto cuando se tome la foto de frente',
  'Limpia la cámara de tu celular',
]

function ListaVerificada({ titulo, items }: { titulo: string; items: string[] }) {
  return (
    <div className="mb-5">
      <p className="mb-2 text-xs font-semibold text-[#011140]">{titulo}</p>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-[#011140]">
            <CircleCheck size={16} className="mt-0.5 shrink-0 text-[#047857]" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * CTA-02: el estudiante registra su foto antes de usar el portal. Esta parte muestra las
 * indicaciones (o el motivo si se la rechazaron); el escaneo con la cámara llega en la siguiente.
 */
export default function RegistrarFotoPage() {
  const isMobile = useIsMobileDevice()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { perfil, cargando, error, recargar } = useMiPerfil()

  const cerrarSesion = () => {
    logout()
    navigate('/login', { replace: true })
  }

  if (perfil && !requiereRegistrarFoto(perfil)) return <Navigate to="/estudiante" replace />

  const rechazada = perfil?.solicitudFoto?.estado === 'RECHAZADA'

  const cardClass = isMobile
    ? 'w-full bg-white'
    : 'w-full rounded-md border border-t-4 border-t-[#0439D9] bg-white px-10 py-12 shadow-lg shadow-[#92aad2]'

  return (
    <AuthLayout>
      <div className="mx-auto flex min-h-full w-full items-center justify-center p-7 sm:px-8">
        <div className={`w-full ${isMobile ? 'max-w-md' : 'max-w-xl'}`}>
          <div className={cardClass}>
            {cargando ? (
              <PortalCargando />
            ) : error ? (
              <PortalError mensaje={error} onReintentar={recargar} />
            ) : rechazada ? (
              <>
                <EncabezadoAsistente icono={TriangleAlert} tono="rojo" titulo="Tu foto fue rechazada">
                  Necesitas registrar una foto nueva para seguir usando SIGEX.
                </EncabezadoAsistente>
                <div className="mb-5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4">
                  <p className="text-xs font-semibold text-[#B91C1C]">Motivo indicado por la administración</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#7F1D1D]">
                    {perfil?.solicitudFoto?.motivoRechazo || 'No se indicó un motivo.'}
                  </p>
                </div>
                <ListaVerificada titulo="Antes de volver a intentarlo:" items={CONSEJOS_TRAS_RECHAZO} />
              </>
            ) : (
              <>
                <ProgresoAsistente titulo="Registrar mi foto" pasos={PASOS} paso={1} />
                <EncabezadoAsistente icono={Camera} titulo="Registra tu foto">
                  Es obligatoria para usar SIGEX. El personal de control la usará para identificarte al ingresar a
                  tus exámenes.
                </EncabezadoAsistente>
                <ListaVerificada titulo="Para que tu foto sea aceptada:" items={REQUISITOS} />
                <div className="mb-5 flex items-start gap-2 rounded-xl border border-[#BFD2F5] bg-[#F1F6FF] p-3 text-xs text-[#45628D]">
                  <ScanFace size={16} className="mt-0.5 shrink-0 text-[#0439D9]" aria-hidden="true" />
                  <p>
                    Te pediremos mover la cabeza en 5 posiciones para comprobar que eres tú, en vivo. Solo se guarda la
                    foto de frente.
                  </p>
                </div>
              </>
            )}

            {!cargando && !error && (
              <>
                <button
                  type="button"
                  disabled
                  title="El escaneo con la cámara se habilita en la siguiente parte"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0439D9] text-sm font-bold text-white transition-colors hover:bg-[#0027a2] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Camera size={16} aria-hidden="true" />
                  {rechazada ? 'VOLVER A ESCANEAR' : 'ACTIVAR CÁMARA'}
                </button>
                <div className="mt-6 border-t border-[#E4E9F2] pt-5 text-center">
                  <button
                    type="button"
                    onClick={cerrarSesion}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#0439D9] hover:underline"
                  >
                    <LogOut size={16} aria-hidden="true" />
                    Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AuthLayout>
  )
}

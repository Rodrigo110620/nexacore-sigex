import { Camera, CircleCheck, Clock, Info, TriangleAlert } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import CambiarPasswordSeccion from '../../components/auth/CambiarPasswordSeccion'
import SesionesActivas from '../../components/perfil/SesionesActivas'
import PortalEstudianteLayout from '../../components/estudiantes/PortalEstudianteLayout'
import FotoEstudiante from '../../components/estudiantes/FotoEstudiante'
import { PortalCargando, PortalError } from '../../components/estudiantes/PortalEstado'
import useMiPerfil from '../../hooks/useMiPerfil'
import { requiereRegistrarFoto } from '../../services/panelEstudianteService'
import { usaDatosDelEstudiante } from '../../utils/passwordPolicy'

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-[#E8EEF7] bg-white p-3">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{etiqueta}</dt>
      <dd className="mt-1 truncate text-sm font-semibold text-[#011140]">{valor || '—'}</dd>
    </div>
  )
}

/** CTA-02 · Mi perfil del estudiante: su foto (con "Cambiar foto"), sus datos y el cambio de contraseña. */
export default function MiPerfilPage() {
  const { perfil, cargando, error, recargar } = useMiPerfil()

  if (perfil && requiereRegistrarFoto(perfil)) return <Navigate to="/estudiante/foto" replace />



  const solicitud = perfil?.solicitudFoto
  const carrera = perfil?.carreras?.[0]

  return (
    <PortalEstudianteLayout fotoUrl={perfil?.fotoUrl}>
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8">
        <h1 className="text-2xl font-extrabold text-[#092068]">Mi perfil</h1>
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

              <CambiarPasswordSeccion restriccion={perfil ? {
                texto: 'No puede contener tu nombre, tu código SIS ni tu CI',
                viola: (nueva) => usaDatosDelEstudiante(nueva, perfil.codigoSis, perfil.nombre),
              } : undefined} />
              <SesionesActivas />
            </div>
          </div>
        )}
      </div>
    </PortalEstudianteLayout>
  )
}

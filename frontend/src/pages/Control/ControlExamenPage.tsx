import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Building2, DoorOpen, ScanLine, TriangleAlert, Download, CalendarDays, Clock, User } from 'lucide-react'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import ResumenExamenCards from '../../components/control/ResumenExamenCards'
import EstudiantesExamenSeccion from '../../components/control/EstudiantesExamenSeccion'
import useExamen from '../../hooks/useExamen'
import useEstudiantesExamen from '../../hooks/useEstudiantesExamen'
import CronometroExamen from '../../components/examenes/CronometroExamen'

import { useAuth } from '../../context/AuthContext'
import { tienePermiso } from '../../utils/permisos'
import api from '../../services/api'
import { formatFecha } from '../../utils/examenFormat' 

export default function ControlExamenPage() {
  const idExamen = Number(useParams().idExamen)
  const idValido = Number.isInteger(idExamen) && idExamen > 0
  const examen = useExamen(idExamen)
  const datos = useEstudiantesExamen(idExamen)
  const ubicacion = examen && [examen.ambienteUbicacion, examen.ambienteNombre].filter(Boolean).join(' · ')
  const ambienteAcceso = examen?.ambienteNombre
    ? /^aula\b/i.test(examen.ambienteNombre) ? examen.ambienteNombre : `Aula ${examen.ambienteNombre}`
    : 'Aula'

  const auth = useAuth()
  const puedeExportar = tienePermiso(auth, 'REPORTES_EXPORTAR')

  const descargarAsistencia = async (formato: 'xlsx') => {
    try {
      const response = await api.get(`/examenes/${idExamen}/asistencia.${formato}`, {
        responseType: 'blob', 
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `asistencia_${idExamen}.${formato}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      alert('No se pudo descargar el archivo. Revisa tus permisos o la conexión.')
    }
  }

  if (datos.accesoDenegado) {
    return <PanelLayout compactDesktop topBarVariant="controlMinimal" title="CONTROL DE INGRESO" description="Acceso al examen">
      <div className="p-6" role="alert"><p className="text-sm text-[#B91C1C]">No tienes permiso para acceder a este examen.</p><Link to="/dashboard/control" className="mt-3 inline-block text-sm font-semibold text-[#0439D9]">Volver a Control</Link></div>
      <MobileBottomNav variant="controlDetail" />
    </PanelLayout>
  }

  return (
    <PanelLayout compactDesktop topBarVariant="controlMinimal" locationLabel={ubicacion} title="CONTROL DE INGRESO" description="Estudiantes asignados al examen y su habilitación.">
      <div className="flex w-full flex-col gap-3 px-4 py-3 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:px-5 sm:py-4 min-[960px]:pb-6">
        
        <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-[#011140]">
              Control de ingreso · {examen?.asignatura}
            </h1>
            
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#627A9B] sm:text-xs">
              {examen?.fecha && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={14} className="text-[#627A9B]" />
                  {formatFecha(examen.fecha)}
                </span>
              )}
              {examen?.horaInicio && (
                <span className="flex items-center gap-1.5">
                  <Clock size={14} className="text-[#627A9B]" />
                  {examen.horaInicio.slice(0, 5)} - {examen.duracionMinutos} min
                </span>
              )}
              {examen?.docente && (
                <span className="flex items-center gap-1.5">
                  <User size={14} className="text-[#627A9B]" />
                  Docente: {examen.docente}
                </span>
              )}
              {examen?.ambienteNombre && (
                <span className="flex items-center gap-1.5">
                  <Building2 size={14} className="text-[#627A9B]" />
                  Aula {examen.ambienteNombre}
                </span>
              )}
            </div>
          </div>

          {puedeExportar && (
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <button
                onClick={() => descargarAsistencia('xlsx')}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#B8CBEF] bg-white px-4 py-2.5 text-sm font-semibold text-[#0439D9] shadow-sm transition-colors hover:bg-[#F1F6FF] sm:w-auto"
              >
                <Download size={16} />
                Descargar Excel
              </button>
              {/* Aquí tu compañero agregará el botón de PDF con fondo azul */}
            </div>
          )}
        </section>

        {examen && <CronometroExamen examen={examen} />}
        
        {idValido ? (
          <>
            <section
              className="flex flex-col gap-2 rounded-xl p-3 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5"
              style={{ background: 'linear-gradient(90deg, #011140 0%, #0439D9 100%)' }}
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 sm:h-11 sm:w-11">
                  <DoorOpen size={20} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-white/70 sm:text-[10px]">Protocolo de autenticación rápida</p>
                  <p className="text-xs font-bold sm:text-base">Apertura de Acceso al {ambienteAcceso}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/dashboard/control/${idExamen}/informacion`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/50 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 sm:w-auto sm:px-4 sm:py-2.5 sm:text-sm"
                >
                  <TriangleAlert size={16} aria-hidden="true" />
                  Información de ingreso
                </Link>
                <Link
                  to={`/dashboard/control/${idExamen}/identificar`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#0439D9] hover:bg-[#E9F1FF] sm:w-auto sm:px-4 sm:py-2.5 sm:text-sm"
                >
                  <ScanLine size={16} aria-hidden="true" />
                  Iniciar Control de Ingreso
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </section>
            <div className="mt-4">
              <ResumenExamenCards resumen={datos.resumen} idExamen={idExamen} />
            </div>
            <EstudiantesExamenSeccion idExamen={idExamen} examen={[examen?.asignatura, examen?.ambienteNombre].filter(Boolean).join(' · ')} datosExamen={examen} {...datos} />
          </>
        ) : (
          <p className="text-sm text-[#B91C1C]">El examen indicado no es válido.</p>
        )}
      </div>
      <MobileBottomNav variant="controlDetail" />
    </PanelLayout>
  )
}
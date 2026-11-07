import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Building2, DoorOpen, ScanLine, TriangleAlert, Download, CalendarDays, Clock, User, Lock } from 'lucide-react'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import ResumenExamenCards from '../../components/control/ResumenExamenCards'
import EstudiantesExamenSeccion from '../../components/control/EstudiantesExamenSeccion'
import useExamen from '../../hooks/useExamen'
import useEstudiantesExamen from '../../hooks/useEstudiantesExamen'
import CronometroExamen from '../../components/examenes/CronometroExamen'
import ResultadoModal, { type Resultado } from '../../components/ui/ResultadoModal'
import { useAuth } from '../../context/AuthContext'
import { tienePermiso } from '../../utils/permisos'
import VistaPreviaExamen from '../../components/examenes/VistaPreviaExamen'
import { addMinutes, formatFecha, horaCorta, materiaYGrupo } from '../../utils/examenFormat'

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

  // El estado llega calculado con la hora (programado, en_curso, finalizado, cancelado).
  const estadoExamen = examen?.estado?.toUpperCase() || 'PROGRAMADO'
  const examenIniciado = estadoExamen === 'EN_CURSO' || estadoExamen === 'FINALIZADO'

  // DASH-05: el Excel se descarga con el nombre del servidor; si falla (por ejemplo, 409), aviso del sistema.
  const [resultado, setResultado] = useState<Resultado | null>(null)
  // DASH-04 (acta en PDF) y DASH-05 (asistencia en Excel), como en la sección 12 del diseño.
  // Antes de descargar se ve la vista previa (el PDF tal cual; el Excel, sus primeras filas).
  const [previa, setPrevia] = useState<'pdf' | 'xlsx' | null>(null)
  const descargar = (formato: 'pdf' | 'excel') => {
    if (!examenIniciado || !idValido) return
    setPrevia(formato === 'pdf' ? 'pdf' : 'xlsx')
  }

  if (datos.accesoDenegado) {
    return <PanelLayout compactDesktop topBarVariant="controlMinimal" title="CONTROL DE INGRESO" description="Acceso al examen">
      <div className="p-6" role="alert"><p className="text-sm text-[#B91C1C]">No tienes permiso para acceder a este examen.</p><Link to="/dashboard/control" className="mt-3 inline-block text-sm font-semibold text-[#0439D9]">Volver a Control</Link></div>
      <MobileBottomNav variant="controlDetail" />
    </PanelLayout>
  }

  return (
    <PanelLayout compactDesktop topBarVariant="controlMinimal" locationLabel={ubicacion} title="CONTROL DE INGRESO" description="Estudiantes asignados al examen y su habilitación.">
      <div className="flex w-full flex-col gap-3 px-4 py-3 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:px-5 sm:pt-4 min-[960px]:pb-6">
        
        <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">

            {/* Como en el diseño (sección 12): «Panel del examen» con su estado. */}
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-3">
              <h1 className="text-xl font-bold text-[#011140] text-center sm:text-left">
                Panel del examen
              </h1>
              
              <div className="flex w-full justify-center sm:w-auto sm:justify-start">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                  estadoExamen === 'EN_CURSO' 
                    ? 'bg-[#ECFDF3] text-[#15803D]' 
                    : estadoExamen === 'FINALIZADO'
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-[#EEF2FF] text-[#3730A3]' 
                }`}>
                  {estadoExamen === 'EN_CURSO' ? 'En curso' : estadoExamen === 'FINALIZADO' ? 'Finalizado' : 'Programado'}
                </span>
              </div>
            </div>
            
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-[#627A9B] sm:justify-start sm:text-xs">
              {examen && <span className="font-semibold text-[#011140]">{materiaYGrupo(examen)}</span>}
              {examen?.fecha && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={14} className="text-[#627A9B]" />
                  {formatFecha(examen.fecha)}
                </span>
              )}
              {examen?.horaInicio && (
                <span className="flex items-center gap-1.5">
                  <Clock size={14} className="text-[#627A9B]" />
                  {horaCorta(examen.horaInicio)} – {addMinutes(examen.horaInicio, examen.duracionMinutos)}
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
            <div className="flex w-full shrink-0 flex-col items-center gap-2 sm:w-auto sm:items-end">
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <button
                  type="button"
                  onClick={() => void descargar('pdf')}
                  disabled={!examenIniciado}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0439D9] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#032db0] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none sm:w-auto"
                >
                  <Download size={16} aria-hidden="true" />
                  Descargar PDF
                </button>
                <button
                  type="button"
                  onClick={() => void descargar('excel')}
                  disabled={!examenIniciado}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#B8CBEF] bg-white px-4 py-2.5 text-sm font-semibold text-[#0439D9] shadow-sm transition-colors hover:bg-[#F1F6FF] disabled:cursor-not-allowed disabled:border-transparent disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none sm:w-auto"
                >
                  <Download size={16} aria-hidden="true" />
                  Descargar Excel
                </button>
              </div>

              {!examenIniciado && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-[#B45309] sm:text-xs">
                  <Lock size={12} /> El examen aún no ha iniciado
                </span>
              )}
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
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
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
      <ResultadoModal resultado={resultado} onClose={() => setResultado(null)} />
      <VistaPreviaExamen idExamen={idValido ? Number(idExamen) : null} formato={previa} onClose={() => setPrevia(null)} />
      <MobileBottomNav variant="controlDetail" />
    </PanelLayout>
  )
}
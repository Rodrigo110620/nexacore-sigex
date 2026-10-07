import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Building2, DoorOpen, ScanLine, TriangleAlert } from 'lucide-react'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import ControlIngresoHeader from '../../components/control/ControlIngresoHeader'
import ResumenExamenCards from '../../components/control/ResumenExamenCards'
import EstudiantesExamenSeccion from '../../components/control/EstudiantesExamenSeccion'
import useExamen from '../../hooks/useExamen'
import useEstudiantesExamen from '../../hooks/useEstudiantesExamen'

/** "Control del examen": estudiantes asignados, su habilitación y el acceso a la identificación. */
export default function ControlExamenPage() {
  const idExamen = Number(useParams().idExamen)
  const idValido = Number.isInteger(idExamen) && idExamen > 0
  const examen = useExamen(idExamen)
  const datos = useEstudiantesExamen(idExamen)
  const ubicacion = examen && [examen.ambienteUbicacion, examen.ambienteNombre].filter(Boolean).join(' · ')
  const ambienteAcceso = examen?.ambienteNombre
    ? /^aula\b/i.test(examen.ambienteNombre) ? examen.ambienteNombre : `Aula ${examen.ambienteNombre}`
    : 'Aula'

  return (
    <PanelLayout compactDesktop topBarVariant="controlMinimal" locationLabel={ubicacion} title="CONTROL DE INGRESO" description="Estudiantes asignados al examen y su habilitación.">
      <div className="flex w-full flex-col gap-3 px-4 py-3 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:px-5 sm:py-4 min-[960px]:pb-6">
        {ubicacion && (
          <span className="inline-flex w-fit max-w-full items-center gap-1 rounded-full border border-[#E2E6EC] bg-white px-2 py-1 text-[10px] text-[#344158] min-[960px]:hidden">
            <Building2 size={11} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{ubicacion}</span>
          </span>
        )}
        <section>
          <ControlIngresoHeader
            materia={examen?.asignatura}
            aula={examen?.ambienteNombre}
            fecha={examen?.fecha}
            hora={examen?.horaInicio}
            docente={examen?.docente}
            duracionMinutos={examen?.duracionMinutos}
          />
        </section>
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
                  to={`/dashboard/control/${idExamen}/intentos`}
                  className="hidden items-center justify-center gap-2 rounded-lg border border-white/50 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10 sm:inline-flex"
                >
                  <TriangleAlert size={16} aria-hidden="true" />
                  Ver intentos
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
              <ResumenExamenCards resumen={datos.resumen} />
            </div>
            <EstudiantesExamenSeccion idExamen={idExamen} {...datos} />
          </>
        ) : (
          <p className="text-sm text-[#B91C1C]">El examen indicado no es válido.</p>
        )}
      </div>
      <MobileBottomNav variant="controlDetail" />
    </PanelLayout>
  )
}

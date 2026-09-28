import { Link, useParams } from 'react-router-dom'
import { ArrowRight, DoorOpen, ScanLine } from 'lucide-react'
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

  return (
    <PanelLayout compactDesktop title="CONTROL DE INGRESO" description="Estudiantes asignados al examen y su habilitación.">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-5 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:px-6 min-[960px]:pb-6">
        <section className="overflow-hidden rounded-2xl border border-[#D8E3F5] bg-white shadow-sm">
          <ControlIngresoHeader
            materia={examen?.asignatura}
            aula={examen?.ambienteNombre}
            fecha={examen?.fecha}
            hora={examen?.horaInicio}
          />
        </section>
        {idValido ? (
          <>
            <section
              className="flex flex-col gap-4 rounded-2xl p-5 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between"
              style={{ background: 'linear-gradient(90deg, #011140 0%, #0439D9 100%)' }}
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <DoorOpen size={20} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">Protocolo de autenticación rápida</p>
                  <p className="text-base font-bold">Apertura de Acceso al Aula {examen?.ambienteNombre ?? ''}</p>
                </div>
              </div>
              <Link
                to={`/dashboard/control/${idExamen}/identificar`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#0439D9] hover:bg-[#E9F1FF]"
              >
                <ScanLine size={16} aria-hidden="true" />
                Iniciar Control de Ingreso
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </section>
            <ResumenExamenCards resumen={datos.resumen} />
            <EstudiantesExamenSeccion idExamen={idExamen} {...datos} />
          </>
        ) : (
          <p className="text-sm text-[#B91C1C]">El examen indicado no es válido.</p>
        )}
      </div>
      <MobileBottomNav />
    </PanelLayout>
  )
}

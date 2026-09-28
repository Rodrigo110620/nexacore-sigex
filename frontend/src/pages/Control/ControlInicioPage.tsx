import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import ExamenEnCursoCard from '../../components/control/ExamenEnCursoCard'
import ExamenesDelDia from '../../components/control/ExamenesDelDia'
import { useAuth } from '../../context/AuthContext'
import usePanelControl from '../../hooks/usePanelControl'
import { estaEnCurso, fechaLocal } from '../../utils/examenFormat'

/** Inicio del rol CONTROL: exámenes en curso con su aforo en vivo y los exámenes del día. */
export default function ControlInicioPage() {
  const { nombre } = useAuth()
  const { examenes, error, ahora } = usePanelControl()
  const enCurso = examenes?.filter((e) => estaEnCurso(e, ahora)) ?? []

  return (
    <PanelLayout compactDesktop title="CONTROL DE INGRESO" description={nombre ? `Bienvenido, ${nombre}` : 'Panel de control de ingreso'}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-5 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:px-6 min-[960px]:pb-6">
        <section aria-labelledby="examenes-en-curso" className="flex flex-col gap-3">
          <h2 id="examenes-en-curso" className="flex items-center gap-2 text-sm font-bold uppercase text-[#011140]">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#B91C1C]" />
            Exámenes activos ahora
            {enCurso.length > 0 && (
              <span className="rounded-full bg-[#FDECEC] px-2 py-0.5 text-[10px] font-semibold text-[#B91C1C]">EN CURSO</span>
            )}
          </h2>
          {error ? (
            <p role="alert" className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs text-[#B91C1C]">{error}</p>
          ) : !examenes ? (
            <p className="py-10 text-center text-sm text-gray-500">Cargando exámenes…</p>
          ) : enCurso.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#B8CBEF] bg-white/70 px-4 py-10 text-center text-sm text-gray-500">
              No hay exámenes en curso en este momento.
            </p>
          ) : (
            enCurso.map((e) => <ExamenEnCursoCard key={`${e.idExamen}-${e.idParalelo}`} examen={e} ahora={ahora} />)
          )}
        </section>
        {examenes && <ExamenesDelDia examenes={examenes} hoy={fechaLocal(ahora)} />}
      </div>
      <MobileBottomNav />
    </PanelLayout>
  )
}

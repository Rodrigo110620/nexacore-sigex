import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import ExamenEnCursoCard from '../../components/control/ExamenEnCursoCard'
import ExamenesDelDia from '../../components/control/ExamenesDelDia'
import { useAuth } from '../../context/AuthContext'
import usePanelControl from '../../hooks/usePanelControl'
import { estaEnCurso } from '../../utils/examenFormat'
import { Building2 } from 'lucide-react'

/**
 * Inicio de CONTROL y ADMIN (ControlRoute deja pasar solo a esos roles): exámenes en curso
 * con su aforo en vivo y los exámenes del día. CONTROL lo usa para trabajar y ADMIN para supervisar.
 */
export default function ControlInicioPage() {
  const { nombre } = useAuth()
  const { examenes, error, ahora } = usePanelControl()
  const enCurso = examenes?.filter((e) => estaEnCurso(e, ahora)) ?? []
  const ambienteActual = enCurso[0] ?? examenes?.[0]
  const ubicacion = ambienteActual && [ambienteActual.ambienteUbicacion, ambienteActual.ambienteNombre].filter(Boolean).join(' · ')

  return (
    <PanelLayout compactDesktop topBarVariant="controlMinimal" locationLabel={ubicacion} title="CONTROL DE INGRESO" description={nombre ? `Bienvenido, ${nombre}` : 'Panel de control de ingreso'}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-3 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:gap-6 sm:px-6 sm:py-5 min-[960px]:pb-6">
        <div className="min-[960px]:hidden">
          <div className="flex items-center justify-between gap-2">
            {ubicacion && (
              <span className="inline-flex min-w-0 items-center gap-1 rounded-full border border-[#E2E6EC] bg-white px-2 py-1 text-[10px] text-[#344158]">
                <Building2 size={11} className="shrink-0" aria-hidden="true" />
                <span className="truncate">{ubicacion}</span>
              </span>
            )}
            <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-[#087F59]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" aria-hidden="true" />
              En línea
            </span>
          </div>
          <h1 className="mt-2 text-base font-extrabold uppercase leading-tight text-[#011140]">Control de ingreso</h1>
          <p className="mt-1 text-[11px] text-[#627A9B]">{nombre ? `Bienvenido, ${nombre}` : 'Panel de control de ingreso'}</p>
        </div>
        <section aria-labelledby="examenes-en-curso" className="flex flex-col gap-3">
          <h2 id="examenes-en-curso" className="flex items-center gap-2 text-[11px] font-bold uppercase text-[#011140] sm:text-sm">
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
        {examenes && <ExamenesDelDia examenes={examenes} ahora={ahora} />}
      </div>
      <MobileBottomNav variant="controlHome" />
    </PanelLayout>
  )
}

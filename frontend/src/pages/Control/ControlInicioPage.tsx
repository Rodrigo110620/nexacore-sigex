import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
/** Inicio reservado para el módulo general del personal de control. */
export default function ControlInicioPage() {
  return (
    <PanelLayout compactDesktop title="INICIO" description="Módulo en progreso">
      <div className="mx-auto flex min-h-full w-full max-w-5xl items-center justify-center px-4 py-10 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:px-6 min-[960px]:pb-10">
        <section className="w-full max-w-md rounded-2xl border border-dashed border-[#B8CBEF] bg-white/70 px-6 py-14 text-center">
          <p className="text-sm font-semibold text-[#011140]">Inicio en progreso</p>
          <p className="mt-1 text-xs text-[#627A9B]">Utiliza la sección Control para gestionar el ingreso a los exámenes.</p>
        </section>
      </div>
      <MobileBottomNav />
    </PanelLayout>
  )
}

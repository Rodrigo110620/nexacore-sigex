import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import BandejaAyuda from '../../components/ayuda/BandejaAyuda'

/** Mesa de ayuda del ADMIN: las consultas de estudiantes y personal, con su respuesta por correo. */
export default function MesaAyudaPage() {
  return (
    <PanelLayout compactDesktop title="MESA DE AYUDA" description="Consultas de estudiantes y personal: respóndelas y les llega a su correo.">
      <div className="min-h-full pb-[calc(4.5rem+env(safe-area-inset-bottom))] min-[960px]:pb-0"
        style={{ background: 'linear-gradient(to bottom, #FFFFFF 0%, #F8FBFF 28%, #E9F1FF 65%, #DCE9FF 100%)' }}>
        <section aria-label="Mesa de ayuda" className="px-3 py-4 sm:px-5">
          <BandejaAyuda />
        </section>
      </div>
      <MobileBottomNav />
    </PanelLayout>
  )
}

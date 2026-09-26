import { useState } from 'react'
import { BookCheck, Plus, Search } from 'lucide-react'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import RegisterExamenModal from '../../components/examenes/RegisterExamenModal'
import { useAuth } from '../../context/AuthContext'

/** MAST-03: listado shell + modal Registrar Nuevo Examen (mockup UI). */
export default function ExamenesPage() {
  const { isAdmin } = useAuth()
  const [query, setQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <PanelLayout compactDesktop>
      <div
        className="min-h-full pb-[calc(4.5rem+env(safe-area-inset-bottom))] min-[960px]:pb-0"
        style={{
          background:
            'linear-gradient(to bottom, #FFFFFF 0%, #F8FBFF 28%, #E9F1FF 65%, #DCE9FF 100%)',
        }}
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-5 sm:px-6 sm:py-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-[#011140] sm:text-2xl">Exámenes</h1>
              <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">
                Registra y configura exámenes, ambientes y normas (MAST-03).
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0439D9] px-4 text-sm font-semibold text-white hover:bg-[#032db0]"
              >
                <Plus size={18} aria-hidden="true" />
                Registrar examen
              </button>
            )}
          </header>

          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por asignatura, ambiente o fecha"
              aria-label="Buscar exámenes"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-[#011140] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0439D9]/30"
            />
          </div>

          <section
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#B8CBEF] bg-white/70 px-4 py-14 text-center"
            aria-live="polite"
          >
            <BookCheck size={36} className="mb-3 text-[#0439D9]/70" aria-hidden="true" />
            <p className="text-sm font-semibold text-[#011140]">Aún no hay exámenes para mostrar</p>
            <p className="mt-1 max-w-sm text-xs text-gray-500">
              {query.trim()
                ? `Sin resultados para “${query.trim()}”.`
                : 'Usa “Registrar examen” para abrir el formulario de planificación.'}
            </p>
          </section>
        </div>
        <MobileBottomNav />
        <RegisterExamenModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </div>
    </PanelLayout>
  )
}

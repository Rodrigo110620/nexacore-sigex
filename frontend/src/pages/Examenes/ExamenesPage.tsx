import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookCheck, ChevronDown, Eye, Plus, Search, Upload } from 'lucide-react'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import RegisterExamenModal from '../../components/examenes/RegisterExamenModal'
import UserPagination from '../../components/users/UserPagination'
import { useAuth } from '../../context/AuthContext'
import { listarExamenes, type ExamenDto } from '../../services/examenService'
import { addMinutes, estadoLabel, formatFecha, horaCorta } from '../../utils/examenFormat'

const PAGE_SIZE = 5

const AVATAR_PALETTES = [
  'border-[#99F6E4] bg-[#ECFDF5] text-[#0F766E]',
  'border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]',
  'border-[#FDE68A] bg-[#FFF8E7] text-[#D97706]',
  'border-[#E9D5FF] bg-[#F5F3FF] text-[#7C3AED]',
  'border-[#BFDBFE] bg-[#EAF2FF] text-[#2563EB]',
] as const

function initialsOf(examen: ExamenDto): string {
  const sigla = examen.sigla?.trim()
  if (sigla && sigla !== '—') {
    return sigla.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'EX'
  }
  const words = (examen.asignatura ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'EX'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase()
}

export default function ExamenesPage() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [ambienteFiltro, setAmbienteFiltro] = useState('')
  const [fechaFiltro, setFechaFiltro] = useState('')
  const [page, setPage] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [examenes, setExamenes] = useState<ExamenDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setExamenes(await listarExamenes())
    } catch {
      setError('No se pudo cargar la lista de exámenes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(handle)
  }, [load])

  const ambientes = useMemo(
    () => [...new Set(examenes.map((e) => e.ambienteNombre).filter(Boolean))].sort(),
    [examenes],
  )
  const fechas = useMemo(
    () => [...new Set(examenes.map((e) => e.fecha).filter(Boolean))].sort(),
    [examenes],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return examenes.filter((e) => {
      if (ambienteFiltro && e.ambienteNombre !== ambienteFiltro) return false
      if (fechaFiltro && e.fecha !== fechaFiltro) return false
      if (!q) return true
      return (
        (e.asignatura ?? '').toLowerCase().includes(q) ||
        (e.sigla ?? '').toLowerCase().includes(q) ||
        (e.ambienteNombre ?? '').toLowerCase().includes(q) ||
        (e.fecha ?? '').includes(q) ||
        formatFecha(e.fecha).includes(q) ||
        (e.docente ?? '').toLowerCase().includes(q)
      )
    })
  }, [examenes, query, ambienteFiltro, fechaFiltro])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages - 1)
  const paged = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE)

  return (
    <PanelLayout compactDesktop>
      <div
        className="min-h-full pb-[calc(4.5rem+env(safe-area-inset-bottom))] min-[960px]:pb-0"
        style={{
          background:
            'linear-gradient(to bottom, #FFFFFF 0%, #F8FBFF 28%, #E9F1FF 65%, #DCE9FF 100%)',
        }}
      >
        <section aria-label="Gestión de exámenes" className="bg-transparent px-3 py-4 sm:px-6 sm:py-8 min-[960px]:px-4 xl:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="mb-4 bg-transparent sm:mb-6 min-[960px]:rounded-xl min-[960px]:bg-white min-[960px]:p-3 min-[960px]:shadow-sm min-[960px]:ring-1 min-[960px]:ring-[#D8E3F5]">
              <div className="flex flex-col gap-3 min-[960px]:flex-row min-[960px]:flex-wrap min-[960px]:items-end xl:flex-nowrap">
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 min-[960px]:grid-cols-[minmax(0,1fr)_12rem_12rem]">
                  <div className="relative col-span-2 min-[960px]:col-span-1">
                    <Search
                      size={17}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#011140]"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => { setQuery(e.target.value); setPage(0) }}
                      placeholder="Buscar por asignatura, fecha o ambiente..."
                      aria-label="Buscar exámenes"
                      className="h-11 w-full rounded-md border border-[#B8CBEF] bg-white pl-10 pr-3 text-sm text-[#011140] placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9]"
                    />
                  </div>
                  <div className="relative">
                    <select
                      value={ambienteFiltro}
                      onChange={(e) => { setAmbienteFiltro(e.target.value); setPage(0) }}
                      aria-label="Filtrar por ambiente"
                      className="h-11 w-full appearance-none rounded-md border border-[#B8CBEF] bg-white pl-3 pr-8 text-xs text-[#011140] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] sm:text-sm"
                    >
                      <option value="">Todos los ambientes</option>
                      {ambientes.map((nombre) => (
                        <option key={nombre} value={nombre}>{nombre}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#627A9B]" aria-hidden="true" />
                  </div>
                  <div className="relative">
                    <select
                      value={fechaFiltro}
                      onChange={(e) => { setFechaFiltro(e.target.value); setPage(0) }}
                      aria-label="Filtrar por fecha"
                      className="h-11 w-full appearance-none rounded-md border border-[#B8CBEF] bg-white pl-3 pr-8 text-xs text-[#011140] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] sm:text-sm"
                    >
                      <option value="">Todas las fechas</option>
                      {fechas.map((fecha) => (
                        <option key={fecha} value={fecha}>{formatFecha(fecha)}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#627A9B]" aria-hidden="true" />
                  </div>
                </div>
                <div className="order-first grid grid-cols-[minmax(0,1fr)_auto] gap-2 min-[960px]:order-last min-[960px]:ml-auto min-[960px]:flex min-[960px]:shrink-0">
                  <button
                    type="button"
                    disabled
                    aria-label="Exportar exámenes, no disponible"
                    className="order-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[#D8E3F5] bg-white px-3 text-sm font-semibold text-[#627A9B] disabled:cursor-not-allowed disabled:opacity-80 min-[960px]:order-1 min-[960px]:w-auto min-[960px]:px-4"
                  >
                    <Upload size={16} aria-hidden="true" />
                    <span className="truncate">Exportar</span>
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="order-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#0439D9] px-3 text-sm font-semibold text-white hover:bg-[#0c41e1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] focus-visible:ring-offset-2 min-[960px]:order-2 min-[960px]:w-auto min-[960px]:px-4"
                    >
                      <Plus size={16} aria-hidden="true" />
                      <span className="truncate">Registrar Examen</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            )}

            {loading ? (
              <p className="rounded-lg border border-[#B8CBEF] bg-white px-6 py-12 text-center text-sm text-gray-500">
                Cargando exámenes…
              </p>
            ) : filtered.length === 0 ? (
              <section className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#B8CBEF] bg-white/70 px-4 py-14 text-center">
                <BookCheck size={36} className="mb-3 text-[#0439D9]/70" aria-hidden="true" />
                <p className="text-sm font-semibold text-[#011140]">Aún no hay exámenes para mostrar</p>
                <p className="mt-1 max-w-sm text-xs text-gray-500">
                  {query.trim() || ambienteFiltro || fechaFiltro
                    ? 'Sin resultados para los filtros aplicados.'
                    : 'Usa “Registrar Examen” para planificar una evaluación.'}
                </p>
              </section>
            ) : (
              <>
                <div className="min-[960px]:hidden space-y-2">
                  {paged.map((e, index) => (
                    <article
                      key={`${e.idExamen}-${e.idParalelo}`}
                      className="rounded-xl border border-[#D8E3F5] bg-white px-4 py-3 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${AVATAR_PALETTES[index % AVATAR_PALETTES.length]}`}>
                          {initialsOf(e)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[#011140]">{e.asignatura}</p>
                          <p className="text-[11px] text-gray-500">Cód: {e.sigla || '—'}</p>
                          <p className="mt-1 text-xs text-gray-600">
                            {formatFecha(e.fecha)} · {horaCorta(e.horaInicio)} - {addMinutes(e.horaInicio, e.duracionMinutos)} · {e.ambienteNombre}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#15803D]">
                          <span className="h-2 w-2 rounded-full bg-[#22C55E]" aria-hidden="true" />
                          {estadoLabel(e.estado)}
                        </span>
                        <button
                          type="button"
                          onClick={() => navigate(`/dashboard/examenes/${e.idExamen}/${e.idParalelo}`)}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-[#3D70C9] hover:bg-[#F1F6FF]"
                        >
                          <Eye size={14} aria-hidden="true" />
                          Ver detalle
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="hidden max-w-full overflow-x-auto rounded-lg border border-[#D8E3F5] bg-white min-[960px]:block">
                  <table className="w-full min-w-[860px] text-left">
                    <caption className="sr-only">Lista de exámenes programados</caption>
                    <thead className="bg-[#F8FAFC] text-xs uppercase tracking-wide text-[#627A9B]">
                      <tr>
                        <th scope="col" className="px-5 py-3 font-bold">Asignatura</th>
                        <th scope="col" className="px-5 py-3 font-bold">Fecha</th>
                        <th scope="col" className="px-5 py-3 font-bold">Hora</th>
                        <th scope="col" className="px-5 py-3 font-bold">Ambiente</th>
                        <th scope="col" className="px-5 py-3 font-bold">Estado / Aforo</th>
                        <th scope="col" className="px-5 py-3 text-center font-bold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EDF1F7] bg-white text-sm text-[#011140]">
                      {paged.map((e, index) => (
                        <tr key={`${e.idExamen}-${e.idParalelo}`}>
                          <th scope="row" className="px-5 py-3 font-normal">
                            <div className="flex items-center gap-3">
                              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${AVATAR_PALETTES[index % AVATAR_PALETTES.length]}`}>
                                {initialsOf(e)}
                              </span>
                              <span>
                                <span className="block font-semibold">{e.asignatura}</span>
                                <span className="mt-0.5 block text-xs text-gray-500">Cód: {e.sigla || '—'}</span>
                              </span>
                            </div>
                          </th>
                          <td className="whitespace-nowrap px-5 py-3 text-gray-600">{formatFecha(e.fecha)}</td>
                          <td className="whitespace-nowrap px-5 py-3 text-gray-600">
                            {horaCorta(e.horaInicio)} - {addMinutes(e.horaInicio, e.duracionMinutos)}
                          </td>
                          <td className="px-5 py-3 text-gray-600">{e.ambienteNombre}</td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                              e.estado === 'cancelado' ? 'text-red-600' : 'text-[#15803D]'
                            }`}>
                              <span className={`h-2 w-2 rounded-full ${
                                e.estado === 'cancelado' ? 'bg-red-500' : 'bg-[#22C55E]'
                              }`} aria-hidden="true" />
                              {estadoLabel(e.estado)}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => navigate(`/dashboard/examenes/${e.idExamen}/${e.idParalelo}`)}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-[#3D70C9] hover:bg-[#F1F6FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9]"
                              >
                                <Eye size={15} aria-hidden="true" />
                                Ver detalle
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <UserPagination
                  page={currentPage}
                  pageSize={PAGE_SIZE}
                  totalRecords={filtered.length}
                  totalPages={Math.ceil(filtered.length / PAGE_SIZE)}
                  onPageChange={setPage}
                  itemLabel="exámenes programados"
                />
              </>
            )}
          </div>
        </section>
        <MobileBottomNav />
        <RegisterExamenModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => void load()}
        />
      </div>
    </PanelLayout>
  )
}

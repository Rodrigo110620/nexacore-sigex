import { useEffect, useState } from 'react'
import { CheckCircle2, CircleAlert, LoaderCircle, Upload, UserPlus } from 'lucide-react'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import EstudianteTable from '../../components/estudiantes/EstudianteTable'
import EstudianteFilters from '../../components/estudiantes/EstudianteFilters'
import RegistrarEstudianteModal from '../../components/estudiantes/RegistrarEstudianteModal'
import ImportarEstudiantesModal from '../../components/estudiantes/ImportarEstudiantesModal'
import TablePagination from '../../components/users/TablePagination'
import EmptyState from '../../components/users/EmptyState'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import useEstudiantes from '../../hooks/useEstudiantes'
import type { EstudianteFilterParams, EstudianteListItem } from '../../types/estudiante'
import type { ImportarEstudiantesResponse } from '../../services/estudianteService'
import EstudianteCardList from '../../components/estudiantes/EstudianteCardList'
import FichaEstudianteModal from '../../components/estudiantes/FichaEstudianteModal'
import EditarEstudianteModal from '../../components/estudiantes/EditarEstudianteModal'

const initialFilters: EstudianteFilterParams = { search: '', idFacultad: '', idCarrera: '' }

export default function EstudiantesPage() {
  const [draftFilters, setDraftFilters] = useState<EstudianteFilterParams>(initialFilters)
  const debouncedSearch = useDebouncedValue(draftFilters.search, 300)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [fichaEstudiante, setFichaEstudiante] = useState<EstudianteListItem | null>(null)
  const [editarEstudianteId, setEditarEstudianteId] = useState<number | null>(null)

  const {
    data,
    estudiantes,
    loading,
    error,
    updateFilters,
    changePage,
    retry,
  } = useEstudiantes()

  const handleViewClick = (estudiante: EstudianteListItem) => {
    setFichaEstudiante(estudiante)
  }

  // 🆕 Handler para editar
  const handleEditClick = (estudiante: EstudianteListItem) => {
    setEditarEstudianteId(estudiante.id)
  }

  useEffect(() => {
    updateFilters({
      search: debouncedSearch.trim(),
      idFacultad: draftFilters.idFacultad,
      idCarrera: draftFilters.idCarrera,
    })
  }, [debouncedSearch, draftFilters.idCarrera, draftFilters.idFacultad, updateFilters])

  const handleFiltersChange = (next: EstudianteFilterParams) => setDraftFilters(next)

  const handleRegistered = (nombre: string) => {
    setRegisterOpen(false)
    setSuccessMessage(`${nombre} fue registrado correctamente.`)
    changePage(0)
    retry()
    window.setTimeout(() => setSuccessMessage(''), 5000)
  }

  const handleImported = (result: ImportarEstudiantesResponse) => {
    if (result.insertados === 0) return
    setSuccessMessage(`Se importaron ${result.insertados} estudiantes.`)
    changePage(0)
    retry()
    window.setTimeout(() => setSuccessMessage(''), 5000)
  }

  // Para cuando se guarda la edición
  const handleSaved = () => {
    setEditarEstudianteId(null)
    retry()
  }

  const hasActiveFilters = Boolean(draftFilters.search.trim() || draftFilters.idFacultad || draftFilters.idCarrera)
  const filtersDisabled = error?.kind === 'unauthorized' || error?.kind === 'forbidden'

  return (
    <PanelLayout compactDesktop>
      <div
        className="min-h-full pb-[calc(4.5rem+env(safe-area-inset-bottom))] min-[960px]:pb-0"
        style={{ background: 'linear-gradient(to bottom, #FFFFFF 0%, #F8FBFF 28%, #E9F1FF 65%, #DCE9FF 100%)' }}
      >
        <section aria-label="Gestión de estudiantes" className="bg-transparent px-3 py-4 sm:px-6 sm:py-8 min-[960px]:px-4 xl:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="mb-4 rounded-xl border border-[#D8E3F5] bg-white px-4 py-3 shadow-sm min-[960px]:hidden">
              <h1 className="text-sm font-extrabold text-[#011140]">GESTIÓN DE ESTUDIANTES</h1>
              <p className="mt-1 text-[11px] leading-relaxed text-[#627A9B]">
                Busca y visualiza en tiempo real el padrón oficial de postulantes y alumnos matriculados para jornadas de evaluación.
              </p>
            </div>
            {successMessage && <div role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"><CheckCircle2 size={18} />{successMessage}</div>}
            <div className="mb-4 bg-transparent sm:mb-6 min-[960px]:rounded-xl min-[960px]:bg-white min-[960px]:p-3 min-[960px]:shadow-sm min-[960px]:ring-1 min-[960px]:ring-[#D8E3F5]">
              <div className="flex flex-col gap-3 min-[960px]:flex-row min-[960px]:flex-wrap min-[960px]:items-end xl:flex-nowrap">
                <div className="min-w-0 flex-1 min-[960px]:basis-full xl:basis-auto">
                  <EstudianteFilters value={draftFilters} onChange={handleFiltersChange} disabled={filtersDisabled} />
                </div>
                <div className="order-first grid grid-cols-[minmax(0,1fr)_auto] gap-2 min-[960px]:order-last min-[960px]:ml-auto min-[960px]:flex min-[960px]:shrink-0">
                  <button
                    type="button"
                    onClick={() => setImportOpen(true)}
                    aria-label="Importar estudiantes"
                    className="order-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[#D8E3F5] bg-white px-3 text-sm font-semibold text-[#0439D9] hover:bg-[#E9F1FF] min-[960px]:order-1 min-[960px]:w-auto min-[960px]:px-4"
                  >
                    <Upload size={16} aria-hidden="true" className="shrink-0" />
                    <span className="hidden truncate sm:inline">Importar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegisterOpen(true)}
                    className="order-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#0439D9] px-3 text-sm font-semibold text-white shadow-md hover:bg-[#0c41e1] min-[960px]:order-2 min-[960px]:w-auto min-[960px]:px-4"
                  >
                    <UserPlus size={16} aria-hidden="true" className="shrink-0" />
                    <span className="truncate">Registrar Estudiante</span>
                  </button>
                </div>
              </div>
            </div>

            <RegistrarEstudianteModal open={registerOpen} onClose={() => setRegisterOpen(false)} onRegistered={handleRegistered} />
            <ImportarEstudiantesModal open={importOpen} onClose={() => setImportOpen(false)} onImported={handleImported} />

            <FichaEstudianteModal
              open={Boolean(fichaEstudiante)}
              estudiante={fichaEstudiante}
              onClose={() => setFichaEstudiante(null)}
            />

            {/* 🆕 Modal de editar */}
            <EditarEstudianteModal
              open={editarEstudianteId !== null}
              estudianteId={editarEstudianteId}
              onClose={() => setEditarEstudianteId(null)}
              onSaved={handleSaved}
            />

            <div className="flex flex-col">
              {loading ? (
                <div role="status" aria-live="polite" className="rounded-lg border border-[#B8CBEF] bg-[#E9F1FF] px-6 py-12 text-center text-[#011140]">
                  <LoaderCircle className="mx-auto animate-spin text-[#0439D9]" size={30} aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold">Cargando estudiantes...</p>
                </div>
              ) : error ? (
                <div role="alert" className="rounded-lg border border-[#B91C1C] bg-white px-6 py-8 text-center">
                  <CircleAlert className="mx-auto text-[#B91C1C]" size={30} aria-hidden="true" />
                  <h2 className="mt-3 text-base font-bold text-[#B91C1C]">
                    {error.kind === 'forbidden'
                      ? 'Acceso restringido'
                      : error.kind === 'unauthorized'
                        ? 'Sesión expirada'
                        : 'No pudimos cargar los estudiantes'}
                  </h2>
                  <p className="mt-2 text-sm text-[#B91C1C]">{error.message}</p>
                  {(error.kind === 'network' || error.kind === 'unknown') && (
                    <button
                      type="button"
                      onClick={retry}
                      className="mt-5 inline-flex h-11 items-center rounded-md bg-[#0439D9] px-5 text-sm font-semibold text-white hover:bg-[#011140]"
                    >
                      Reintentar
                    </button>
                  )}
                </div>
              ) : estudiantes.length > 0 ? (
                <div className="rounded-xl bg-[#E9F1FF] p-3 min-[960px]:rounded-none min-[960px]:bg-transparent min-[960px]:p-0">
                  {/* Móvil */}
                  <div className="min-[960px]:hidden">
                    <EstudianteCardList
                      estudiantes={estudiantes}
                      onViewClick={handleViewClick}
                      onEditClick={handleEditClick}
                    />
                  </div>
                  {/* Desktop */}
                  <div className="hidden min-[960px]:block">
                    <EstudianteTable
                      estudiantes={estudiantes}
                      onViewClick={handleViewClick}
                      onEditClick={handleEditClick}
                    />
                  </div>
                  {/* Paginación */}
                  <TablePagination
                    page={data.pagina}
                    pageSize={data.tamano}
                    totalRecords={data.totalRegistros}
                    totalPages={data.totalPaginas}
                    onPageChange={changePage}
                    itemLabel="estudiantes matriculados"
                  />
                </div>
              ) : (
                <EmptyState message={hasActiveFilters ? 'No se encontraron estudiantes con los filtros seleccionados.' : 'No hay estudiantes registrados.'} />
              )}
            </div>
          </div>
        </section>
        <MobileBottomNav />
      </div>
    </PanelLayout>
  )
}
import { BUSQUEDA_MAX, sanearBusqueda } from '../../utils/habilitacionValidators'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, CircleAlert, ImageUp, LoaderCircle, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import EstudianteTable from '../../components/estudiantes/EstudianteTable'
import EstudianteFilters from '../../components/estudiantes/EstudianteFilters'
import RegistrarEstudianteModal from '../../components/estudiantes/RegistrarEstudianteModal'
import ImportarEstudiantesModal from '../../components/estudiantes/ImportarEstudiantesModal'
import VistaPreviaDescarga, { type FormatoDescarga } from '../../components/ui/VistaPreviaDescarga'
import MenuImportarExportar from '../../components/ui/MenuImportarExportar'
import { obtenerArchivo } from '../../services/descargas'
import { getCarreras, getFacultades, getMateriasDocente } from '../../services/estudianteService'
import TablePagination from '../../components/users/TablePagination'
import EmptyState from '../../components/users/EmptyState'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import useEstudiantes from '../../hooks/useEstudiantes'
import type { EstudianteFilterParams, EstudianteListItem } from '../../types/estudiante'
import type { ImportarEstudiantesResponse } from '../../services/estudianteService'
import EstudianteCardList from '../../components/estudiantes/EstudianteCardList'
import FichaEstudianteModal from '../../components/estudiantes/FichaEstudianteModal'
import EditarEstudianteModal from '../../components/estudiantes/EditarEstudianteModal'
import { useAuth } from '../../context/AuthContext'
import { listarRevisionFotos } from '../../services/fotoRevisionService'
import { tienePermiso } from '../../utils/permisos'
import GruposDocente from '../../components/estudiantes/GruposDocente'
import { TODOS_MIS_ESTUDIANTES, type GrupoElegido } from '../../utils/gruposDocente'

const initialFilters: EstudianteFilterParams = { search: '', idFacultad: '', idCarrera: '' }

export default function EstudiantesPage() {
  const auth = useAuth()
  // Registrar, editar e importar: ESTUDIANTES_GESTIONAR (ADMIN). DOCENTE y CONTROL solo consultan.
  const puedeEditar = !auth.roles.includes('DOCENTE') && tienePermiso(auth, 'ESTUDIANTES_GESTIONAR')
  // El DOCENTE (solo ve sus exámenes) solo ve a los estudiantes de sus paralelos y exámenes; lo filtra el servidor.
  const soloSusEstudiantes = tienePermiso(auth, 'EXAMENES_VER_PROPIOS') && !tienePermiso(auth, 'EXAMENES_VER_TODOS', 'REPORTES_VER')
  // Revisión de fotos: el ADMIN todas; el DOCENTE y el CONTROL, las reportadas en sus exámenes.
  const esAdmin = tienePermiso(auth, 'FOTOS_REVISAR', 'FOTOS_REPORTAR')
  // La planilla la descargan el ADMIN y el DOCENTE (solo sus estudiantes), con los filtros de la pantalla.
  const puedeDescargarLista = tienePermiso(auth, 'ESTUDIANTES_GESTIONAR', 'REPORTES_EXPORTAR')
  const [fotosPorRevisar, setFotosPorRevisar] = useState(0)

  const [draftFilters, setDraftFilters] = useState<EstudianteFilterParams>(initialFilters)
  // DOCENTE: elige una card de materia y grupo; la lista muestra solo ese grupo.
  const [grupo, setGrupo] = useState<GrupoElegido>(TODOS_MIS_ESTUDIANTES)
  const elegirGrupo = (g: GrupoElegido) => {
    setGrupo(g)
    setDraftFilters((f) => ({ ...f, idMateria: g.idMateria, idParalelo: g.idParalelo }))
  }
  const debouncedSearch = useDebouncedValue(draftFilters.search, 300)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [previaLista, setPreviaLista] = useState(false)
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

  const handleEditClick = (estudiante: EstudianteListItem) => {
    if (!puedeEditar) return
    setEditarEstudianteId(estudiante.id)
  }

  useEffect(() => {
    updateFilters({
      search: debouncedSearch.trim(),
      idMateria: draftFilters.idMateria,
      idParalelo: draftFilters.idParalelo,
      idFacultad: draftFilters.idFacultad,
      idCarrera: draftFilters.idCarrera,
    })
  }, [debouncedSearch, draftFilters.idMateria, draftFilters.idParalelo, draftFilters.idCarrera, draftFilters.idFacultad, updateFilters])

  useEffect(() => {
    if (!esAdmin) return
    let cancelado = false
    listarRevisionFotos()
      .then((lista) => { if (!cancelado) setFotosPorRevisar(lista.length) })
      .catch(() => { /* el acceso sigue disponible aunque no se sepa cuántas hay */ })
    return () => { cancelado = true }
  }, [esAdmin])

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

  const handleSaved = () => {
    setEditarEstudianteId(null)
    retry()
  }

  const filtrosLista = useMemo(() => ({
    search: debouncedSearch.trim() || undefined,
    idFacultad: draftFilters.idFacultad || undefined,
    idCarrera: draftFilters.idCarrera || undefined,
    idMateria: draftFilters.idMateria || undefined,
    idParalelo: draftFilters.idParalelo || undefined,
  }), [debouncedSearch, draftFilters.idFacultad, draftFilters.idCarrera, draftFilters.idMateria, draftFilters.idParalelo])
  // Lo que se descarga se elige en la misma ventana (al abrir, con los filtros de la pantalla).
  const [filtrosDescarga, setFiltrosDescarga] = useState<FiltrosLista>({})
  const abrirDescarga = () => {
    setFiltrosDescarga(filtrosLista)
    setPreviaLista(true)
  }
  const obtenerLista = useCallback((f: FormatoDescarga) =>
    obtenerArchivo(`/estudiantes/planilla.${f}`, filtrosDescarga, `planilla_estudiantes.${f}`), [filtrosDescarga])
  const obtenerListaCsv = useCallback(() => obtenerArchivo('/estudiantes/planilla.csv', filtrosDescarga, 'planilla_estudiantes.csv'), [filtrosDescarga])

  const hasActiveFilters = Boolean(draftFilters.idMateria || draftFilters.idParalelo || draftFilters.search.trim() || draftFilters.idFacultad || draftFilters.idCarrera)
  const filtersDisabled = error?.kind === 'unauthorized' || error?.kind === 'forbidden'

  return (
    <PanelLayout compactDesktop>
      <div
        className="min-h-full pb-[calc(4.5rem+env(safe-area-inset-bottom))] min-[960px]:pb-0"
        style={{ background: 'linear-gradient(to bottom, #FFFFFF 0%, #F8FBFF 28%, #E9F1FF 65%, #DCE9FF 100%)' }}
      >
        <section aria-label="Gestión de estudiantes" className="bg-transparent px-3 py-4 sm:px-6 sm:py-4 min-[960px]:px-4 xl:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="mb-4 border-b border-[#D8E3F5] pb-3 min-[960px]:hidden">
              <h1 className="text-sm font-bold text-[#011140]">GESTIÓN DE ESTUDIANTES</h1>
              <p className="mt-1 text-[11px] leading-relaxed text-[#627A9B]">
                Busca y visualiza en tiempo real el padrón oficial de postulantes y alumnos matriculados para jornadas de evaluación.
              </p>
            </div>
            {soloSusEstudiantes && <GruposDocente elegido={grupo} onElegir={elegirGrupo} />}
            {successMessage && <div role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"><CheckCircle2 size={18} />{successMessage}</div>}
            <div className="mb-4 bg-transparent sm:mb-6 min-[960px]:rounded-xl min-[960px]:bg-white min-[960px]:p-3 min-[960px]:shadow-sm min-[960px]:ring-1 min-[960px]:ring-[#D8E3F5]">
              {/* Filtros y botones en una sola fila desde 1280 px; más angosto, los botones bajan para que nada se encime. */}
              <div className="flex flex-col gap-3 min-[960px]:flex-row min-[960px]:flex-wrap min-[960px]:items-end min-[1280px]:flex-nowrap">
                <div className="min-w-0 flex-1 min-[960px]:basis-full min-[1280px]:basis-auto">
                  {soloSusEstudiantes ? (
                    <BuscadorDelGrupo titulo={grupo.titulo} value={draftFilters} onChange={handleFiltersChange} disabled={filtersDisabled} />
                  ) : <EstudianteFilters value={draftFilters} onChange={handleFiltersChange} disabled={filtersDisabled} />}
                </div>
                <div className="order-first grid grid-cols-[minmax(0,1fr)_auto] gap-2 min-[960px]:order-last min-[960px]:ml-auto min-[960px]:flex min-[960px]:shrink-0">
                  {esAdmin && (
                    <Link
                      to="/dashboard/estudiantes/fotos"
                      aria-label="Revisión de fotos"
                      title="Revisión de fotos"
                      className="order-3 col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#D8E3F5] bg-white px-3 text-sm font-semibold text-[#011140] hover:bg-[#E9F1FF] min-[960px]:order-none"
                    >
                      <ImageUp size={16} aria-hidden="true" className="shrink-0 text-[#0439D9]" />
                      <span className="min-[960px]:hidden">Revisión de fotos</span>
                      {fotosPorRevisar > 0 && (
                        <span aria-label={`${fotosPorRevisar} por revisar`} className="rounded-full bg-[#B45309] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                          {fotosPorRevisar}
                        </span>
                      )}
                    </Link>
                  )}
                  {(puedeEditar || puedeDescargarLista) && (
                    <MenuImportarExportar
                      puedeImportar={puedeEditar}
                      puedeExportar={puedeDescargarLista}
                      importar={{ titulo: 'Importar estudiantes', detalle: 'Desde un archivo CSV o Excel' }}
                      exportar={{ titulo: 'Descargar lista', detalle: hasActiveFilters ? 'Con los filtros aplicados · PDF, Excel o CSV' : 'PDF, Excel o CSV, con vista previa' }}
                      onImportar={() => setImportOpen(true)}
                      onExportar={abrirDescarga}
                    />
                  )}
                  {/* Registrar: solo quien gestiona estudiantes (ADMIN); a los demás no se les muestra. */}
                  {puedeEditar && (<>
                  <button
                    type="button"
                    onClick={() => setRegisterOpen(true)}
                    className="order-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#0439D9] px-3 text-sm font-semibold text-white shadow-md hover:bg-[#0c41e1] min-[960px]:order-2 min-[960px]:w-auto min-[960px]:px-4"
                  >
                    <UserPlus size={16} aria-hidden="true" className="shrink-0" />
                    <span className="truncate">Registrar Estudiante</span>
                  </button>
                  </>)}
                </div>
              </div>
            </div>

            <VistaPreviaDescarga open={previaLista} titulo="Lista de estudiantes" formatos={FORMATOS_LISTA}
              obtener={obtenerLista} obtenerCsv={obtenerListaCsv} onClose={() => setPreviaLista(false)}
              filtros={<FiltrosDescargaLista value={filtrosDescarga} onChange={setFiltrosDescarga} soloSusEstudiantes={soloSusEstudiantes} />} />

            {/* Modales: solo se pueden abrir si puedeEditar */}
            {puedeEditar && (
              <>
                <RegistrarEstudianteModal open={registerOpen} onClose={() => setRegisterOpen(false)} onRegistered={handleRegistered} />
                <ImportarEstudiantesModal open={importOpen} onClose={() => setImportOpen(false)} onImported={handleImported} />
                <EditarEstudianteModal
                  open={editarEstudianteId !== null}
                  estudianteId={editarEstudianteId}
                  onClose={() => setEditarEstudianteId(null)}
                  onSaved={handleSaved}
                />
              </>
            )}

            <FichaEstudianteModal
              open={Boolean(fichaEstudiante)}
              estudiante={fichaEstudiante}
              // El DOCENTE también, con sus estudiantes (los únicos que ve); el servidor lo verifica.
              puedeRegenerarQr={puedeEditar || soloSusEstudiantes}
              onClose={() => setFichaEstudiante(null)}
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
                <div className="min-[960px]:rounded-none">                  {/* Móvil */}
                  <div className="min-[960px]:hidden">
                    <EstudianteCardList
                      estudiantes={estudiantes}
                      onViewClick={handleViewClick}
                      onEditClick={handleEditClick}
                      puedeEditar={puedeEditar}
                      ocultarMaterias={Boolean(grupo.idMateria)}
                    />
                  </div>
                  {/* Desktop */}
                  <div className="hidden min-[960px]:block">
                    <EstudianteTable
                      estudiantes={estudiantes}
                      onViewClick={handleViewClick}
                      onEditClick={handleEditClick}
                      puedeEditar={puedeEditar}
                      ocultarMaterias={Boolean(grupo.idMateria)}
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
                <EmptyState message={hasActiveFilters ? 'No se encontraron estudiantes con los filtros seleccionados.' : 'No hay estudiantes para mostrar.'} />
              )}
            </div>
          </div>
        </section>
        <MobileBottomNav />
      </div>
    </PanelLayout>
  )
}

/** DOCENTE: el título del grupo elegido en las cards y el buscador dentro de ese grupo. */
function BuscadorDelGrupo({ titulo, value, onChange, disabled }: {
  titulo: string
  value: EstudianteFilterParams
  onChange: (value: EstudianteFilterParams) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <h2 className="text-base font-bold text-[#011140]">{titulo}</h2>
      <label className="w-full text-xs font-semibold text-[#45628D] sm:max-w-xl sm:flex-1">
        <span className="sr-only">Buscar estudiante</span>
        <input aria-label="Buscar estudiante" value={value.search} maxLength={BUSQUEDA_MAX} disabled={disabled}
          placeholder="Buscar por nombre, CI o código SIS" onChange={(e) => onChange({ ...value, search: sanearBusqueda(e.target.value) })}
          className="h-11 w-full min-w-0 rounded-md border border-[#B8CBEF] bg-white px-3 text-sm text-[#011140] disabled:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9]" />
      </label>
    </div>
  )
}

const FORMATOS_LISTA: FormatoDescarga[] = ['pdf', 'xlsx', 'csv']

interface FiltrosLista {
  search?: string
  idFacultad?: string
  idCarrera?: string
  idMateria?: string
  idParalelo?: string
}

/**
 * Qué estudiantes se descargan: el ADMIN elige facultad y carrera; el DOCENTE, una de sus materias y su grupo.
 * Cada cambio vuelve a preparar la vista previa.
 */
function FiltrosDescargaLista({ value, onChange, soloSusEstudiantes }: {
  value: FiltrosLista
  onChange: (f: FiltrosLista) => void
  soloSusEstudiantes: boolean
}) {
  const [facultades, setFacultades] = useState<{ id: number; nombre: string }[]>([])
  const [carreras, setCarreras] = useState<{ idCarrera: number; nombre: string }[]>([])
  const [grupos, setGrupos] = useState<{ idMateria: number; materia: string; idParalelo: number; paralelo: string }[]>([])

  useEffect(() => {
    const control = new AbortController()
    if (soloSusEstudiantes) getMateriasDocente(control.signal).then(setGrupos).catch(() => setGrupos([]))
    else getFacultades(control.signal).then(setFacultades).catch(() => setFacultades([]))
    return () => control.abort()
  }, [soloSusEstudiantes])

  useEffect(() => {
    if (soloSusEstudiantes || !value.idFacultad) return
    const control = new AbortController()
    getCarreras(value.idFacultad, control.signal).then(setCarreras).catch(() => setCarreras([]))
    return () => control.abort()
  }, [soloSusEstudiantes, value.idFacultad])

  const campo = 'h-10 w-full rounded-md border border-[#D8E3F5] bg-white px-2 text-sm text-[#011140] focus:outline-none focus:ring-2 focus:ring-[#0439D9]'
  if (soloSusEstudiantes) {
    const actual = value.idMateria ? `${value.idMateria}:${value.idParalelo ?? ''}` : ''
    return (
      <label className="flex flex-col gap-1 text-xs font-semibold text-[#45628D] sm:max-w-md">
        Materia y grupo
        <select aria-label="Materia y grupo a descargar" value={actual} className={campo}
          onChange={(e) => {
            const [idMateria, idParalelo] = e.target.value.split(':')
            onChange({ ...value, idMateria: idMateria || undefined, idParalelo: idParalelo || undefined })
          }}>
          <option value="">Todas mis materias y grupos</option>
          {grupos.map((g) => <option key={`${g.idMateria}:${g.idParalelo}`} value={`${g.idMateria}:${g.idParalelo}`}>{g.materia} · {g.paralelo}</option>)}
        </select>
      </label>
    )
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-xs font-semibold text-[#45628D]">
        Facultad
        <select aria-label="Facultad a descargar" value={value.idFacultad ?? ''} className={campo}
          onChange={(e) => onChange({ ...value, idFacultad: e.target.value || undefined, idCarrera: undefined })}>
          <option value="">Todas las facultades</option>
          {facultades.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-[#45628D]">
        Carrera
        <select aria-label="Carrera a descargar" value={value.idCarrera ?? ''} className={campo} disabled={!value.idFacultad}
          onChange={(e) => onChange({ ...value, idCarrera: e.target.value || undefined })}>
          <option value="">{value.idFacultad ? 'Todas las carreras' : 'Elige primero la facultad'}</option>
          {carreras.map((c) => <option key={c.idCarrera} value={c.idCarrera}>{c.nombre}</option>)}
        </select>
      </label>
    </div>
  )
}


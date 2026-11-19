import { BUSQUEDA_MAX, sanearBusqueda } from '../../utils/habilitacionValidators'
import { useFilasVivas } from '../../hooks/useFilasNuevas'
import { FilasVivas, NumeroVivo } from '../../components/ui/FilaViva'
import useEnVivo from '../../hooks/useEnVivo'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, CircleAlert, ImageUp, LoaderCircle, Search, UserPlus, Users, X } from 'lucide-react'
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
import { getCarreras, getEstudiantes, getFacultades, getMateriasDocente } from '../../services/estudianteService'
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

  // Con ?buscar=<código SIS> en la dirección (p. ej. desde un enlace), la lista abre ya filtrada.
  const [draftFilters, setDraftFilters] = useState<EstudianteFilterParams>(() => {
    const buscar = new URLSearchParams(window.location.search).get('buscar')
    return buscar ? { ...initialFilters, search: buscar } : initialFilters
  })
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
    recargarEnSilencio,
  } = useEstudiantes()
  // En vivo: altas, ediciones, importaciones, cuentas activadas y fotos nuevas aparecen sin recargar la página.
  const [enVivo, setEnVivo] = useState(0)
  useEnVivo((c) => c.tipo === 'ESTUDIANTE' || c.tipo === 'FOTO', () => { recargarEnSilencio(); setEnVivo((n) => n + 1) })

  // En vivo: las filas que llegan o cambian (cuenta activada, foto, datos) se resaltan unos segundos.
  // Mientras carga no hay lista: así la lista vacía de antes de cargar no cuenta como base (todo saldría «Nuevo»).
  const filasVivas = useMemo(() => (loading ? undefined : estudiantes.map((e) => ({
    id: e.id,
    firma: JSON.stringify([e.nombre, e.apellidos, e.ci, e.codigoSis, e.telefono, e.estadoMatricula, e.tieneCuenta, e.fotoUrl, e.carreras?.map((c) => c.idCarrera)]),
  }))), [estudiantes, loading])
  const vivas = useFilasVivas(filasVivas, JSON.stringify([data.pagina, debouncedSearch, draftFilters]))

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
      cuenta: draftFilters.cuenta,
    })
  }, [debouncedSearch, draftFilters.idMateria, draftFilters.idParalelo, draftFilters.idCarrera, draftFilters.idFacultad, draftFilters.cuenta, updateFilters])

  // Cuántos activaron su cuenta y cuántos no, con la misma búsqueda y filtros (sin el de cuenta).
  const [conteoCuentas, setConteoCuentas] = useState<{ todos: number; activada: number; sinActivar: number } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    const base = {
      page: 0, size: 1, search: debouncedSearch.trim(), idFacultad: draftFilters.idFacultad, idCarrera: draftFilters.idCarrera,
      idMateria: draftFilters.idMateria, idParalelo: draftFilters.idParalelo,
    }
    Promise.all([
      getEstudiantes(base, controller.signal),
      getEstudiantes({ ...base, cuenta: 'ACTIVADA' }, controller.signal),
      getEstudiantes({ ...base, cuenta: 'SIN_ACTIVAR' }, controller.signal),
    ]).then(([t, a, s]) => setConteoCuentas({ todos: t.totalRegistros, activada: a.totalRegistros, sinActivar: s.totalRegistros }))
      .catch(() => { if (!controller.signal.aborted) setConteoCuentas(null) })
    return () => controller.abort()
  }, [debouncedSearch, draftFilters.idFacultad, draftFilters.idCarrera, draftFilters.idMateria, draftFilters.idParalelo, data.totalRegistros, enVivo])

  useEffect(() => {
    if (!esAdmin) return
    let cancelado = false
    listarRevisionFotos()
      .then((lista) => { if (!cancelado) setFotosPorRevisar(lista.length) })
      .catch(() => { /* el acceso sigue disponible aunque no se sepa cuántas hay */ })
    return () => { cancelado = true }
  }, [esAdmin, enVivo])

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

  const hasActiveFilters = Boolean(draftFilters.idMateria || draftFilters.idParalelo || draftFilters.search.trim() || draftFilters.idFacultad || draftFilters.idCarrera || draftFilters.cuenta)
  const filtersDisabled = error?.kind === 'unauthorized' || error?.kind === 'forbidden'

  return (
    <PanelLayout compactDesktop>
      <div
        className="min-h-full pb-[calc(4.5rem+env(safe-area-inset-bottom))] min-[960px]:pb-0"
        style={{ background: 'linear-gradient(to bottom, #FFFFFF 0%, #F8FBFF 28%, #E9F1FF 65%, #DCE9FF 100%)' }}
      >
        <section aria-label="Gestión de estudiantes" className="bg-transparent px-3 py-4 sm:px-5 sm:py-4">
          <div className="w-full">
            <div className="mb-4 border-b border-[#D8E3F5] pb-3 min-[960px]:hidden">
              <h1 className="text-sm font-bold text-[#011140]">GESTIÓN DE ESTUDIANTES</h1>
              <p className="mt-1 text-[11px] leading-relaxed text-[#627A9B]">
                Busca y visualiza en tiempo real el padrón oficial de postulantes y alumnos matriculados para jornadas de evaluación.
              </p>
            </div>
            {soloSusEstudiantes && <GruposDocente elegido={grupo} onElegir={elegirGrupo} />}
            {successMessage && <div role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"><CheckCircle2 size={18} />{successMessage}</div>}
            <div className="mb-4 bg-transparent sm:mb-6 min-[960px]:rounded-xl min-[960px]:bg-white min-[960px]:p-3 min-[960px]:shadow-sm min-[960px]:ring-1 min-[960px]:ring-[#D8E3F5]">
              {/* Filtros y botones en una sola fila desde 1360 px; más angosto, los botones bajan para que nada se encime. */}
              <div className="flex flex-col gap-3 min-[960px]:flex-row min-[960px]:flex-wrap min-[960px]:items-end min-[1360px]:flex-nowrap">
                <div className="min-w-0 flex-1 min-[960px]:basis-full min-[1360px]:basis-auto">
                  {soloSusEstudiantes ? (
                    <BuscadorDelGrupo titulo={grupo.titulo} total={loading ? undefined : data.totalRegistros} value={draftFilters} onChange={handleFiltersChange} disabled={filtersDisabled} />
                  ) : <EstudianteFilters value={draftFilters} onChange={handleFiltersChange} disabled={filtersDisabled} />}
                </div>
                <div className={`order-first grid ${puedeEditar ? 'grid-cols-[minmax(0,1fr)_auto]' : 'grid-cols-2'} gap-2 min-[960px]:order-last min-[960px]:ml-auto min-[960px]:flex min-[960px]:shrink-0`}>
                  {esAdmin && (
                    <Link
                      to="/dashboard/estudiantes/fotos"
                      aria-label="Revisión de fotos"
                      title="Revisión de fotos"
                      className={`order-3 ${puedeEditar ? 'col-span-2' : ''} inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#D8E3F5] bg-white px-3 text-sm font-semibold text-[#011140] hover:bg-[#E9F1FF] min-[960px]:order-none`}
                    >
                      <ImageUp size={16} aria-hidden="true" className="shrink-0 text-[#0439D9]" />
                      <span className="min-[960px]:hidden">Revisión de fotos</span>
                      <span className="hidden min-[960px]:inline">Fotos</span>
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
                    <span className="truncate" aria-hidden="true"><span className="min-[1360px]:hidden 2xl:inline">Registrar Estudiante</span><span className="hidden min-[1360px]:inline 2xl:hidden">Registrar</span></span>
                    <span className="sr-only">Registrar Estudiante</span>
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

            {/* Quiénes activaron su cuenta: sin cuenta no tienen su QR para el examen. */}
            <div role="tablist" aria-label="Cuenta del estudiante" className="mb-3 grid grid-cols-3 border-b border-[#D8E3F5] sm:flex sm:gap-2">
              {([['', 'Todos', conteoCuentas?.todos], ['ACTIVADA', 'Cuenta activada', conteoCuentas?.activada], ['SIN_ACTIVAR', 'Sin activar', conteoCuentas?.sinActivar]] as const).map(([valor, texto, n]) => {
                const activa = (draftFilters.cuenta ?? '') === valor
                return (
                  <button key={texto} type="button" role="tab" aria-selected={activa}
                    onClick={() => setDraftFilters((f) => ({ ...f, cuenta: valor }))}
                    className={`-mb-px inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-2 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${
                      activa ? 'border-[#0439D9] text-[#0439D9]' : 'border-transparent text-[#45628D] hover:border-[#B8CBEF] hover:text-[#011140]'}`}>
                    {texto}
                    {n != null && (
                      <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${activa ? 'bg-[#0439D9] text-white' : valor === 'SIN_ACTIVAR' && n > 0 ? 'bg-[#FEF3C7] text-[#B45309]' : 'bg-[#EDF2FE] text-[#45628D]'}`}><NumeroVivo valor={n} /></span>
                    )}
                  </button>
                )
              })}
            </div>

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
                <FilasVivas marcadas={vivas}>
                <div className="min-[960px]:rounded-none">                  {/* Móvil y laptops chicas: la tabla necesita 920 px, así que hasta 1100 px van tarjetas. */}
                  <div className="min-[1100px]:hidden">
                    <EstudianteCardList
                      estudiantes={estudiantes}
                      onViewClick={handleViewClick}
                      onEditClick={handleEditClick}
                      puedeEditar={puedeEditar}
                      ocultarMaterias={Boolean(grupo.idMateria)}
                    />
                  </div>
                  {/* Desktop */}
                  <div className="hidden min-[1100px]:block">
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
                </FilasVivas>
              ) : (
                <EmptyState message={draftFilters.cuenta === 'SIN_ACTIVAR' && !draftFilters.search.trim() ? 'Todos los estudiantes activaron su cuenta.' : hasActiveFilters ? 'No se encontraron estudiantes con los filtros seleccionados.' : 'No hay estudiantes para mostrar.'} />
              )}
            </div>
          </div>
        </section>
        <MobileBottomNav />
      </div>
    </PanelLayout>
  )
}

/** DOCENTE: el título del grupo elegido (con cuántos son) y el buscador dentro de ese grupo. */
function BuscadorDelGrupo({ titulo, total, value, onChange, disabled }: {
  titulo: string
  total?: number
  value: EstudianteFilterParams
  onChange: (value: EstudianteFilterParams) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 shrink-0 items-center gap-2.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#E9F1FF] text-[#0439D9]"><Users size={19} aria-hidden="true" /></span>
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-bold leading-tight text-[#011140]">{titulo}</h2>
          <p className="text-xs text-[#627A9B]">
            {total == null ? 'Cargando…' : <><b className="font-semibold tabular-nums text-[#011140]"><NumeroVivo valor={total} /></b> {total === 1 ? 'estudiante' : 'estudiantes'}</>}
          </p>
        </div>
      </div>
      <label className="relative block w-full min-w-0 sm:flex-1">
        <span className="sr-only">Buscar estudiante</span>
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8BA0BF]" aria-hidden="true" />
        <input aria-label="Buscar estudiante" type="search" value={value.search} maxLength={BUSQUEDA_MAX} disabled={disabled}
          placeholder="Buscar por nombre, CI o código SIS" onChange={(e) => onChange({ ...value, search: sanearBusqueda(e.target.value) })}
          className="h-11 w-full min-w-0 rounded-lg border border-[#D8E3F5] bg-[#F8FAFF] pl-9 pr-9 text-sm text-[#011140] outline-none transition-colors placeholder:text-[#8BA0BF] hover:border-[#B8CBEF] focus:border-[#0439D9] focus:bg-white focus:ring-2 focus:ring-[#0439D9]/15 disabled:bg-gray-100 [&::-webkit-search-cancel-button]:hidden" />
        {value.search && (
          <button type="button" onClick={() => onChange({ ...value, search: '' })} aria-label="Borrar la búsqueda"
            className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-[#627A9B] hover:bg-[#F1F6FF]"><X size={15} aria-hidden="true" /></button>
        )}
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


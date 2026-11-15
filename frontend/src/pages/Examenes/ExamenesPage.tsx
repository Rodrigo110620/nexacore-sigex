import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Ban, BookCheck, CalendarDays, Clock, Eye, History, LoaderCircle, MapPin, Plus, Search } from 'lucide-react'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import RegisterExamenModal from '../../components/examenes/RegisterExamenModal'
import UserPagination from '../../components/users/TablePagination'
import { getUserAvatarPalette } from '../../components/users/userAvatar.utils'
import { useAuth } from '../../context/AuthContext'
import { listarExamenes, type ExamenDto } from '../../services/examenService'
import { addMinutes, fechaLocal, formatFecha, horaCorta, initialsOfName } from '../../utils/examenFormat'
import useEnVivo from '../../hooks/useEnVivo'
import EstadoExamenBadge from '../../components/examenes/EstadoExamenBadge'
import { ordenarPorFase, tiempoExamen } from '../../utils/tiempoExamen'
import { DIAS_LARGOS } from '../../utils/inicio'
import { offsetServidorMinutos } from '../../services/tiempoService'
import useReloj from '../../hooks/useReloj'
import { tienePermiso } from '../../utils/permisos'
import ErrorCarga from '../../components/ui/ErrorCarga'
import FiltroSelect from '../../components/ui/FiltroSelect'
import { contiene } from '../../utils/textoBusqueda'

const PAGE_SIZE = 5

/**
 * Exámenes se reparte en tres pestañas para que la lista no se llene con lo pasado:
 * «Hoy y próximos» (los de hoy primero, también los que ya terminaron hoy), «Historial» (días anteriores, del
 * más reciente al más antiguo; pasan solos al terminar el día) y «Cancelados».
 */
type Vista = 'activos' | 'historial' | 'cancelados'
const VISTAS: { id: Vista; texto: string; icono: typeof CalendarDays }[] = [
  { id: 'activos', texto: 'Hoy y próximos', icono: CalendarDays },
  { id: 'historial', texto: 'Historial', icono: History },
  { id: 'cancelados', texto: 'Cancelados', icono: Ban },
]

/** «Hoy · Jueves 12/11/2026», «Mañana · Viernes 13/11/2026», «Ayer · …» o «Lunes 16/11/2026». */
function tituloDia(fecha: string, hoy: string): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const dia = new Date(y, m - 1, d)
  const diferencia = Math.round((dia.getTime() - new Date(`${hoy}T00:00:00`).getTime()) / 86_400_000)
  const nombre = `${DIAS_LARGOS[dia.getDay()]} ${formatFecha(fecha)}`
  return diferencia === 0 ? `Hoy · ${nombre}` : diferencia === 1 ? `Mañana · ${nombre}` : diferencia === -1 ? `Ayer · ${nombre}` : nombre
}

function ExamAvatar({ examen, size = 'card' }: { examen: ExamenDto; size?: 'card' | 'compact' }) {
  const sizeClass = size === 'card' ? 'h-9 w-9 text-xs' : 'h-8 w-8 text-[11px]'
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-lg border font-bold ${sizeClass} ${getUserAvatarPalette({ id: examen.idExamen })}`}
    >
      {initialsOfName(examen.asignatura)}
    </span>
  )
}

export default function ExamenesPage() {
  const auth = useAuth()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const isControlView = location.pathname === '/dashboard/control'
  const paraleloSeleccionado = searchParams.get('paralelo')
  // El control se opera desde Control (tablero del día); Exámenes es la agenda: solo «Ver detalle».
  // Solo el DOCENTE registra sus exámenes; el ADMIN supervisa, edita, reprograma y cancela, pero no crea.
  const canRegister = tienePermiso(auth, 'EXAMENES_GESTIONAR_PROPIOS') && !isControlView
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [ambienteFiltro, setAmbienteFiltro] = useState('')
  const [fechaFiltro, setFechaFiltro] = useState('')
  const [grupoFiltro, setGrupoFiltro] = useState('')
  // Solo el ADMIN ve los exámenes de todos: puede filtrar por docente (el docente ve solo los suyos).
  const filtraDocente = tienePermiso(auth, 'EXAMENES_GESTIONAR_TODOS')
  const [docenteFiltro, setDocenteFiltro] = useState('')
  const [page, setPage] = useState(0)
  // ?vista=historial|cancelados (queda en la URL: al volver del detalle se sigue en la misma pestaña).
  const vistaParam = searchParams.get('vista')
  const vista: Vista = vistaParam === 'historial' || vistaParam === 'cancelados' ? vistaParam : 'activos'
  const cambiarVista = (v: Vista) => {
    setSearchParams((actual) => {
      const siguiente = new URLSearchParams(actual)
      if (v === 'activos') siguiente.delete('vista'); else siguiente.set('vista', v)
      return siguiente
    }, { replace: true })
    // Cada pestaña arma sus opciones: al cambiar, los filtros vuelven a «Todos».
    setFechaFiltro('')
    setDocenteFiltro('')
    setAmbienteFiltro('')
    setGrupoFiltro('')
    setPage(0)
  }
  // ?nuevo=1 (desde «Programar examen» del inicio del docente) abre el formulario.
  const [isModalOpen, setIsModalOpen] = useState(() => searchParams.get('nuevo') === '1')
  // …y con &materia=&nombre= (Mis materias del inicio) llega con esa materia ya elegida.
  const [materiaInicial, setMateriaInicial] = useState(() => {
    const id = Number(searchParams.get('materia'))
    const nombre = searchParams.get('nombre')
    return id > 0 && nombre ? { id, nombre } : null
  })
  const [examenes, setExamenes] = useState<ExamenDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (opciones?: { silencioso?: boolean }) => {
    if (!opciones?.silencioso) setLoading(true)
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

  useEnVivo((c) => c.tipo === 'EXAMEN' || c.tipo === 'HABILITACION' || c.tipo === 'INGRESO', () => void load({ silencioso: true }))

  const ahora = useReloj(30_000)
  const hoy = fechaLocal(new Date(ahora))
  const porVista = useMemo(() => {
    const grupos: Record<Vista, ExamenDto[]> = { activos: [], historial: [], cancelados: [] }
    for (const e of examenes) {
      if (tiempoExamen(e, ahora, offsetServidorMinutos()).fase === 'cancelado') grupos.cancelados.push(e)
      else if (e.fecha >= hoy) grupos.activos.push(e)
      else grupos.historial.push(e)
    }
    return grupos
  }, [examenes, ahora, hoy])

  const ambientes = useMemo(
    () => [...new Set(porVista[vista].map((e) => e.ambienteNombre).filter(Boolean))].sort(),
    [porVista, vista],
  )
  const fechas = useMemo(
    () => [...new Set(porVista[vista].map((e) => e.fecha).filter(Boolean))].sort((a, b) => (vista === 'activos' ? a.localeCompare(b) : b.localeCompare(a))),
    [porVista, vista],
  )
  const docentes = useMemo(
    () => [...new Set(porVista[vista].map((e) => e.docente).filter((d): d is string => Boolean(d)))].sort((a, b) => a.localeCompare(b, 'es')),
    [porVista, vista],
  )
  // G1, G2… ordenados por número.
  const grupos = useMemo(
    () => [...new Set(porVista[vista].map((e) => e.grupo).filter((g): g is string => Boolean(g)))]
      .sort((a, b) => a.localeCompare(b, 'es', { numeric: true })),
    [porVista, vista],
  )

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase()
    return porVista[vista].filter((e) => {
      if (paraleloSeleccionado && String(e.idParalelo) !== paraleloSeleccionado) return false
      if (ambienteFiltro && e.ambienteNombre !== ambienteFiltro) return false
      if (fechaFiltro && e.fecha !== fechaFiltro) return false
      if (grupoFiltro && e.grupo !== grupoFiltro) return false
      if (docenteFiltro && e.docente !== docenteFiltro) return false
      if (!q) return true
      return (
        // Sin distinguir tildes: «fisica» encuentra «Física».
        contiene(e.asignatura, q) ||
        contiene(e.sigla, q) ||
        contiene(e.ambienteNombre, q) ||
        (e.fecha ?? '').includes(q) ||
        formatFecha(e.fecha).includes(q) ||
        contiene(e.docente, q) ||
        (e.grupo ?? '').toLowerCase() === q
      )
    })
  }, [porVista, vista, query, ambienteFiltro, fechaFiltro, grupoFiltro, docenteFiltro, paraleloSeleccionado])

  // Hoy y próximos: día por día desde hoy; dentro del día, en curso, próximos y al final los que ya terminaron.
  // Historial y cancelados: del más reciente al más antiguo.
  const filtered = useMemo(() => {
    const ordenados = ordenarPorFase(filtrados, ahora, offsetServidorMinutos())
    return vista === 'activos'
      ? [...ordenados].sort((a, b) => a.fecha.localeCompare(b.fecha))
      : [...filtrados].sort((a, b) => (b.fecha + b.horaInicio).localeCompare(a.fecha + a.horaInicio))
  }, [filtrados, ahora, vista])
  /** Título del día antes del primer examen de cada fecha en la página. */
  const conTitulo = (i: number) => i === 0 || paged[i - 1].fecha !== paged[i].fecha

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages - 1)
  const paged = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE)

  const hayFiltros = Boolean(query.trim() || ambienteFiltro || fechaFiltro || grupoFiltro || docenteFiltro)
  const quitarFiltros = () => {
    setQuery(''); setAmbienteFiltro(''); setFechaFiltro(''); setGrupoFiltro(''); setDocenteFiltro(''); setPage(0)
  }
  // Los mismos filtros en celular (2 por fila) y en escritorio (en la barra): nombre arriba, lo elegido abajo.
  const filtrosExamen = (
    <>
      <FiltroSelect etiqueta="Ambiente" value={ambienteFiltro} onChange={(v) => { setAmbienteFiltro(v); setPage(0) }}>
        <option value="">Todos los ambientes</option>
        {ambientes.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}
      </FiltroSelect>
      <FiltroSelect etiqueta="Fecha" value={fechaFiltro} onChange={(v) => { setFechaFiltro(v); setPage(0) }}>
        <option value="">Todas las fechas</option>
        {fechas.map((fecha) => <option key={fecha} value={fecha}>{formatFecha(fecha)}</option>)}
      </FiltroSelect>
      <FiltroSelect etiqueta="Grupo" value={grupoFiltro} onChange={(v) => { setGrupoFiltro(v); setPage(0) }}>
        <option value="">Todos los grupos</option>
        {grupos.map((g) => <option key={g} value={g}>{g}</option>)}
      </FiltroSelect>
      {filtraDocente && (
        <FiltroSelect etiqueta="Docente" value={docenteFiltro} onChange={(v) => { setDocenteFiltro(v); setPage(0) }}>
          <option value="">Todos los docentes</option>
          {docentes.map((d) => <option key={d} value={d}>{d}</option>)}
        </FiltroSelect>
      )}
    </>
  )

  return (
    <PanelLayout
      compactDesktop
      title={isControlView ? 'CONTROL DE INGRESO' : 'GESTIÓN DE EXÁMENES'}
      description={isControlView ? 'Selecciona un examen para realizar el control de ingreso.' : 'Administra los exámenes programados y su habilitación.'}
      topBarVariant={isControlView ? 'control' : 'default'}
    >
      <div
        className="min-h-full pb-[calc(4.5rem+env(safe-area-inset-bottom))] min-[960px]:pb-0"
        style={{
          background:
            'linear-gradient(to bottom, #FFFFFF 0%, #F8FBFF 28%, #E9F1FF 65%, #DCE9FF 100%)',
        }}
      >
        <section aria-label="Gestión de exámenes" className="bg-transparent px-3 py-4 sm:px-5 sm:py-3">
          <div className="w-full">
            
            {!isControlView && (
              <div className="mb-4 border-b border-[#E6EAF0] pb-3 min-[960px]:hidden">
                <h1 className="text-base font-bold uppercase text-[#171C27]">GESTIÓN DE EXÁMENES</h1>
                <p className="mt-0 text-xs text-[#627A9B]">
                  Administra los exámenes programados y su habilitación.
                </p>
              </div>
            )}

            <div className="mb-4 bg-transparent sm:mb-6 min-[960px]:rounded-xl min-[960px]:bg-white min-[960px]:p-3 min-[960px]:shadow-sm min-[960px]:ring-1 min-[960px]:ring-[#D8E3F5]">
              <div className="flex flex-col gap-3 min-[960px]:flex-row min-[960px]:flex-wrap min-[960px]:items-end xl:flex-nowrap">
                {canRegister && (
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0439D9] text-sm font-semibold text-white shadow-sm hover:bg-[#0c41e1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] focus-visible:ring-offset-2 min-[960px]:hidden"
                  >
                    <Plus size={18} aria-hidden="true" />
                    Registrar Examen
                  </button>
                )}
                <div className="relative w-full min-[960px]:hidden">
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
                    className="h-11 w-full rounded-lg border border-[#B8CBEF] bg-white pl-10 pr-3 text-sm text-[#011140] placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9]"
                  />
                </div>
                <div className="grid w-full grid-cols-2 gap-2 min-[960px]:hidden">
                  {filtrosExamen}
                </div>
                <div className={`hidden min-w-0 flex-1 gap-2 min-[960px]:grid ${filtraDocente ? 'grid-cols-[minmax(12rem,1fr)_11rem_10rem_9rem_13rem] items-center' : 'grid-cols-[minmax(12rem,1fr)_12rem_10rem_10.5rem] items-center'}`}>
                  <div className="relative">
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
                  {filtrosExamen}
                </div>
                <div className="hidden min-[960px]:ml-auto min-[960px]:flex min-[960px]:shrink-0 min-[960px]:gap-2">
                  {canRegister && (
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#0439D9] px-4 text-sm font-semibold text-white hover:bg-[#0c41e1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] focus-visible:ring-offset-2"
                    >
                      <Plus size={16} aria-hidden="true" />
                      <span className="truncate">Registrar Examen</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-3 flex items-end justify-between gap-3 border-b border-[#D8E3F5]">
            <div role="tablist" aria-label="Exámenes por estado" className="grid min-w-0 flex-1 grid-cols-3 sm:flex sm:flex-none sm:gap-2">
              {VISTAS.map(({ id, texto, icono: Icono }) => {
                const activa = vista === id
                return (
                  <button key={id} type="button" role="tab" aria-selected={activa} onClick={() => cambiarVista(id)}
                    className={`-mb-px inline-flex min-h-11 min-w-0 items-center justify-center gap-1 whitespace-nowrap border-b-2 px-1.5 text-xs font-semibold transition-colors sm:gap-1.5 sm:px-3 sm:text-sm ${
                      activa ? 'border-[#0439D9] text-[#0439D9]' : 'border-transparent text-[#45628D] hover:border-[#B8CBEF] hover:text-[#011140]'}`}>
                    <Icono size={15} aria-hidden="true" className="hidden shrink-0 sm:block" />
                    {texto}
                    {!loading && (
                      <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${activa ? 'bg-[#0439D9] text-white' : 'bg-[#EDF2FE] text-[#45628D]'}`}>
                        {porVista[id].length}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            {hayFiltros && (
              <button type="button" onClick={quitarFiltros} className="hidden shrink-0 pb-3 text-sm font-semibold text-[#0439D9] hover:underline sm:block">
                Quitar filtros
              </button>
            )}
            </div>
            {hayFiltros && (
              <button type="button" onClick={quitarFiltros} className="-mt-1 mb-2 text-sm font-semibold text-[#0439D9] hover:underline sm:hidden">
                Quitar filtros
              </button>
            )}

            {error && (
              <ErrorCarga className="mb-4" mensaje={error} onReintentar={() => void load()} />
            )}

            <div>
            {loading ? (
              <div role="status" aria-live="polite" className="rounded-lg border border-[#B8CBEF] bg-[#E9F1FF] px-6 py-12 text-center text-[#011140]">
              <LoaderCircle className="mx-auto animate-spin text-[#0439D9]" size={30} aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold">Cargando exámenes...</p>
            </div>
            ) : filtered.length === 0 ? (
              <section className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#B8CBEF] bg-white/70 px-4 py-14 text-center">
                <BookCheck size={36} className="mb-3 text-[#0439D9]/70" aria-hidden="true" />
                <p className="text-sm font-semibold text-[#011140]">
                  {vista === 'historial' ? 'Aún no hay exámenes en el historial' : vista === 'cancelados' ? 'No hay exámenes cancelados' : 'No hay exámenes para hoy ni próximos'}
                </p>
                <p className="mt-1 max-w-sm text-xs text-gray-500">
                  {query.trim() || ambienteFiltro || fechaFiltro || grupoFiltro || docenteFiltro
                    ? 'Sin resultados para los filtros aplicados.'
                    : vista === 'historial' ? 'Cuando termina el día, sus exámenes pasan aquí.'
                    : vista === 'cancelados' ? 'Aquí aparecen los exámenes que se cancelen.'
                    : isControlView ? 'No hay exámenes disponibles para realizar control.' : canRegister ? 'Usa “Registrar Examen” para planificar una evaluación.' : 'Aún no hay exámenes: los programan los docentes.'}
                </p>
              </section>
            ) : (
              <>
                <div className="min-[960px]:hidden space-y-1.5">
                  {paged.map((e, i) => (
                    <div key={`${e.idExamen}-${e.idParalelo}`}>
                    {conTitulo(i) && (
                      <h2 className={`px-1 pb-1 text-xs font-bold uppercase tracking-wide ${e.fecha === hoy ? 'text-[#0439D9]' : 'text-[#627A9B]'} ${i === 0 ? '' : 'pt-2'}`}>
                        {tituloDia(e.fecha, hoy)}
                      </h2>
                    )}
                    <article
                      key={`${e.idExamen}-${e.idParalelo}`}
                      className="rounded-xl border border-[#D8E3F5] bg-white px-3 py-2"
                    >
                      <div className="flex items-start gap-2.5">
                        <ExamAvatar examen={e} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-[#011140]">{e.asignatura}</p>
                              <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-[#627A9B]">
                                <GrupoBadge grupo={e.grupo} /> Cód: {e.sigla || '—'}
                              </p>
                            </div>
                            <EstadoExamenBadge examen={e} />
                          </div>
                          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-600">
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays size={11} aria-hidden="true" className="text-[#627A9B]" />
                              {formatFecha(e.fecha)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock size={11} aria-hidden="true" className="text-[#627A9B]" />
                              {horaCorta(e.horaInicio)}-{addMinutes(e.horaInicio, e.duracionMinutos)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={11} aria-hidden="true" className="text-[#627A9B]" />
                              {e.ambienteNombre}
                            </span>
                          </p>
                          <div className="mt-1 flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => navigate(`/dashboard/examenes/${e.idExamen}/${e.idParalelo}`)}
                              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-semibold text-[#3D70C9] hover:bg-[#F1F6FF]"
                            >
                              <Eye size={13} aria-hidden="true" />
                              Ver detalle
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                    </div>
                  ))}
                </div>

                <div className="hidden max-w-full overflow-x-auto rounded-lg border border-[#D8E3F5] bg-white min-[960px]:block">
                  <table className="w-full min-w-[760px] table-fixed text-left">
                    <caption className="sr-only">Lista de exámenes programados</caption>
                    <thead className="bg-[#F8FAFC] text-xs uppercase tracking-wide text-[#627A9B]">
                      <tr>
                        {/* La fecha va en el título de cada día; las columnas cortas se ajustan a su contenido. */}
                        <th scope="col" className="w-[34%] px-5 py-3 font-bold">Asignatura</th>
                        <th scope="col" className="w-[9%] px-4 py-3 font-bold">Grupo</th>
                        <th scope="col" className="w-[15%] px-4 py-3 font-bold">Horario</th>
                        <th scope="col" className="w-[13%] px-4 py-3 font-bold">Ambiente</th>
                        <th scope="col" className="w-[16%] px-4 py-3 font-bold">Estado / Aforo</th>
                        <th scope="col" className="w-[13%] py-3 pl-4 pr-5 text-right font-bold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EDF1F7] bg-white text-sm text-[#011140]">
                      {paged.map((e, i) => (
                        <Fragment key={`${e.idExamen}-${e.idParalelo}`}>
                        {conTitulo(i) && (
                          <tr className={e.fecha === hoy ? 'bg-[#EEF4FF]' : 'bg-[#F8FAFC]'}>
                            <th scope="colgroup" colSpan={6} className={`px-5 py-2 text-left text-xs font-bold uppercase tracking-wide ${e.fecha === hoy ? 'text-[#0439D9]' : 'text-[#627A9B]'}`}>
                              {tituloDia(e.fecha, hoy)}
                            </th>
                          </tr>
                        )}
                        <tr>
                          <th scope="row" className="px-5 py-3 font-normal">
                            <div className="flex items-center gap-3">
                              <ExamAvatar examen={e} size="compact" />
                              <span>
                                <span className="block font-semibold">{e.asignatura}</span>
                                <span className="mt-0.5 block text-xs text-gray-500">Cód: {e.sigla || '—'}</span>
                              </span>
                            </div>
                          </th>
                          <td className="px-4 py-3"><GrupoBadge grupo={e.grupo} /></td>
                          <td className="whitespace-nowrap px-4 py-3 tabular-nums text-gray-600">
                            {horaCorta(e.horaInicio)} - {addMinutes(e.horaInicio, e.duracionMinutos)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-gray-600">{e.ambienteNombre}</td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <EstadoExamenBadge examen={e} className="text-sm" />
                          </td>
                          <td className="py-3 pl-4 pr-5">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => navigate(`/dashboard/examenes/${e.idExamen}/${e.idParalelo}`)}
                                className="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1.5 text-sm font-medium text-[#3D70C9] hover:bg-[#F1F6FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9]"
                              >
                                <Eye size={15} aria-hidden="true" />
                                Ver detalle
                              </button>
                            </div>
                          </td>
                        </tr>
                        </Fragment>
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
                  itemLabel={vista === 'historial' ? 'exámenes en el historial' : vista === 'cancelados' ? 'exámenes cancelados' : 'exámenes'}
                />
              </>
            )}
            </div>
          </div>
        </section>
        <MobileBottomNav />
        <RegisterExamenModal
          isOpen={isModalOpen && canRegister}
          onClose={() => { setIsModalOpen(false); setMateriaInicial(null) }}
          onSuccess={() => void load()}
          materiaInicial={materiaInicial}
        />
      </div>
    </PanelLayout>
  )
}

/** El grupo del examen (G1, G2…) como etiqueta corta; «—» si no tiene. */
function GrupoBadge({ grupo }: { grupo?: string | null }) {
  return grupo
    ? <span className="inline-flex shrink-0 items-center rounded-md bg-[#EDF2FE] px-2 py-0.5 text-xs font-bold text-[#0439D9]">{grupo}</span>
    : <span className="text-xs text-gray-400">—</span>
}


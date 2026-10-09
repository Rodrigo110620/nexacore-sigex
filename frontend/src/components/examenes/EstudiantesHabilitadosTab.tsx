import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, CheckCheck, ChevronDown, CircleAlert, DoorOpen, Hourglass, LoaderCircle, Plus, Search, X } from 'lucide-react'
import TablePagination from '../users/TablePagination'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { initialsOfName } from '../../utils/examenFormat'
import { isNetworkError, isOffline } from '../../utils/examFormUtils'
import {
  BUSQUEDA_MAX,
  RAZON_MAX,
  sanearBusqueda,
  sanearRazon,
  validateRazonInhabilitacion,
} from '../../utils/habilitacionValidators'
import ResultadoModal, { type Resultado } from '../ui/ResultadoModal'
import AsociarEstudiantesModal from './AsociarEstudiantesModal'
import { ConfirmDiscardDialog } from './ExamFormDialogs'
import {
  actualizarHabilitacion,
  listarEstudiantesExamen,
  obtenerRepartoAulas,
  type EstadoHabilitacion,
  type EstudianteHabilitacionDto,
  type RepartoAulasDto,
} from '../../services/habilitacionService'

const PAGE_SIZE = 5
/** Sin tildes y en minúsculas, para que "Pérez" y "perez" coincidan. */
const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const AVATARS = [
  'border-[#99F6E4] bg-[#ECFDF5] text-[#0F766E]',
  'border-[#FDE68A] bg-[#FFF8E7] text-[#D97706]',
  'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]',
  'border-[#BFDBFE] bg-[#EAF2FF] text-[#2563EB]',
] as const

function estadoVisual(estado: EstadoHabilitacion) {
  if (estado === 'HABILITADO') {
    return {
      label: 'Habilitado',
      className: 'text-[#15803D]',
      iconWrap: 'bg-[#22C55E] text-white',
      badge: 'border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]',
      icon: 'check' as const,
    }
  }
  if (estado === 'PENDIENTE') {
    return {
      label: 'Pendiente',
      className: 'text-[#B45309]',
      iconWrap: 'bg-[#F59E0B] text-white',
      badge: 'border-[#FDE68A] bg-[#FFF8E7] text-[#B45309]',
      icon: 'pending' as const,
    }
  }
  return {
    label: 'No habilitado',
    className: 'text-[#B91C1C]',
    iconWrap: 'bg-[#EF4444] text-white',
    badge: 'border-[#FBCFD4] bg-[#FEF2F2] text-[#B91C1C]',
    icon: 'x' as const,
  }
}

function EstadoIcono({ icon }: { icon: ReturnType<typeof estadoVisual>['icon'] }) {
  if (icon === 'check') return <Check size={12} strokeWidth={3} aria-hidden="true" />
  if (icon === 'pending') return <Hourglass size={11} strokeWidth={2.5} aria-hidden="true" />
  return <X size={12} strokeWidth={3} aria-hidden="true" />
}

/** Mensaje del backend (ErrorResponse.mensaje) o el genérico. */
const mensajeDeError = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { mensaje?: string } } }).response?.data?.mensaje || fallback

/** Estados que se eligen al cambiar la habilitación; PENDIENTE solo es el estado inicial al asociar. */
type EstadoCambio = Exclude<EstadoHabilitacion, 'PENDIENTE'>

/** Razones frecuentes: al elegir una se completa el campo. */
const RAZONES_EJEMPLO = [
  'No cumple requisitos previos',
  'Deuda pendiente',
  'Sanción académica',
  'Documentación incompleta',
] as const

const SIN_CONEXION = 'No hay conexión a Internet. No se guardó ningún cambio; verifica tu conexión e inténtalo de nuevo.'

interface EstudiantesHabilitadosTabProps {
  idExamen: number
  idParalelo: number
  isAdmin: boolean
  /** Asignatura, fecha y ambiente del examen, para el modal "Cambiar". */
  examenResumen?: string
  onCountChange?: (count: number) => void
}

export default function EstudiantesHabilitadosTab({
  idExamen,
  idParalelo,
  isAdmin,
  examenResumen,
  onCountChange,
}: EstudiantesHabilitadosTabProps) {
  const [estudiantes, setEstudiantes] = useState<EstudianteHabilitacionDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 300)
  const [facultad, setFacultad] = useState('')
  const [estado, setEstado] = useState('')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<number[]>([])
  const [asociarOpen, setAsociarOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  /** Estudiantes a los que se les cambia el estado desde el modal (uno con "Cambiar" o varios al deshabilitar). */
  const [cambio, setCambio] = useState<{
    ids: number[]
    titulo: string
    codigo?: string
    estadoInicial: EstadoCambio
    motivoInicial: string
  } | null>(null)
  const [cambiarEstado, setCambiarEstado] = useState<EstadoCambio>('HABILITADO')
  const [cambiarMotivo, setCambiarMotivo] = useState('')
  const [motivoError, setMotivoError] = useState('')
  const [confirmarCierre, setConfirmarCierre] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [reparto, setReparto] = useState<RepartoAulasDto | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listarEstudiantesExamen(idExamen, idParalelo)
      setEstudiantes(data)
      onCountChange?.(data.length)
    } catch {
      setError('No se pudo cargar los estudiantes del examen.')
    } finally {
      setLoading(false)
    }
  }, [idExamen, idParalelo, onCountChange])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(handle)
  }, [load])

  // Asociar o cambiar la habilitación mueve el reparto alfabético: se vuelve a pedir con cada cambio.
  useEffect(() => {
    let cancelado = false
    Promise.resolve(obtenerRepartoAulas(idExamen, idParalelo))
      .then((r) => { if (!cancelado) setReparto(r ?? null) })
      .catch(() => { if (!cancelado) setReparto(null) })
    return () => { cancelado = true }
  }, [estudiantes, idExamen, idParalelo])

  // Con una sola aula y todos ubicados, la columna y el resumen no aportan nada.
  const mostrarAulas = Boolean(reparto && (reparto.aulas.length > 1 || reparto.sinAula > 0))

  const asociadosIds = useMemo(() => new Set(estudiantes.map((e) => e.idEstudiante)), [estudiantes])

  const facultades = useMemo(
    () => [...new Set(estudiantes.flatMap((e) => e.facultad.split(', ')).filter((f) => f && f !== '—'))].sort(),
    [estudiantes],
  )

  const filtered = useMemo(() => {
    const q = normalizar(debouncedQuery.trim())
    return estudiantes.filter((e) => {
      if (facultad && !e.facultad.split(', ').includes(facultad)) return false
      if (estado && e.estadoHabilitacion !== estado) return false
      if (!q) return true
      return [`${e.nombre} ${e.apellidos}`, `${e.apellidos} ${e.nombre}`, e.ci, e.codigoSis]
        .some((campo) => normalizar(campo ?? '').includes(q))
    })
  }, [estudiantes, debouncedQuery, facultad, estado])
  const hasActiveFilters = Boolean(query.trim() || facultad || estado)

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages - 1)
  const paged = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE)
  const allPageSelected = paged.length > 0 && paged.every((e) => selected.includes(e.idEstudiante))
  /** Solo cuentan los seleccionados que siguen visibles con los filtros actuales. */
  const seleccionEfectiva = useMemo(() => {
    const visibles = new Set(filtered.map((e) => e.idEstudiante))
    return selected.filter((id) => visibles.has(id))
  }, [filtered, selected])

  const abrirCambio = (
    ids: number[],
    titulo: string,
    estadoInicial: EstadoCambio,
    motivo = '',
    codigo?: string,
  ) => {
    setCambio({ ids, titulo, codigo, estadoInicial, motivoInicial: motivo })
    setCambiarEstado(estadoInicial)
    setCambiarMotivo(motivo)
    setMotivoError('')
    setConfirmarCierre(false)
    setError('')
  }

  const abrirCambioIndividual = (e: EstudianteHabilitacionDto) => {
    const noHabilitado = e.estadoHabilitacion === 'NO_HABILITADO'
    abrirCambio(
      [e.idEstudiante],
      `${e.nombre} ${e.apellidos}`,
      noHabilitado ? 'NO_HABILITADO' : 'HABILITADO',
      noHabilitado ? (e.motivo ?? '') : '',
      e.codigoSis,
    )
  }

  const cambioSinGuardar = Boolean(
    cambio && (cambiarEstado !== cambio.estadoInicial || cambiarMotivo !== cambio.motivoInicial),
  )

  const cerrarCambio = () => {
    if (saving) return
    if (cambioSinGuardar) {
      setConfirmarCierre(true)
      return
    }
    setCambio(null)
  }

  const applyEstado = async (ids: number[], next: EstadoCambio, motivo?: string) => {
    if (isOffline()) {
      setResultado({ tipo: 'offline', mensaje: SIN_CONEXION })
      return
    }
    setSaving(true)
    setError('')
    try {
      const data = await actualizarHabilitacion(idExamen, idParalelo, {
        idsEstudiante: ids,
        estadoHabilitacion: next,
        motivo,
      })
      setEstudiantes(data)
      onCountChange?.(data.length)
      setSelected([])
      setCambio(null)
      const quienes = ids.length === 1 ? 'al estudiante' : `a los ${ids.length} estudiantes`
      setResultado({
        tipo: 'exito',
        mensaje: next === 'HABILITADO'
          ? `Se habilitó ${quienes} para este examen.`
          : `Se registró como no habilitado ${quienes} para este examen.`,
      })
    } catch (err) {
      // El listado no cambia: cada estudiante conserva su estado anterior.
      setResultado(isNetworkError(err)
        ? { tipo: 'offline', mensaje: SIN_CONEXION }
        : { tipo: 'error', mensaje: mensajeDeError(err, 'No se pudo actualizar la habilitación.') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="flex flex-col gap-4">
      {mostrarAulas && reparto && <ResumenAulas reparto={reparto} />}
      <div className="rounded-xl border border-[#D8E3F5] bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#011140]" aria-hidden="true" />
            <input
              type="search"
              value={query}
              maxLength={BUSQUEDA_MAX}
              onChange={(e) => { setQuery(sanearBusqueda(e.target.value)); setPage(0) }}
              placeholder="Buscar por nombre, CI o código…"
              autoComplete="off"
              aria-label="Buscar estudiantes"
              className="h-11 w-full rounded-md border border-[#B8CBEF] bg-white pl-10 pr-3 text-sm text-[#011140] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm font-medium text-[#627A9B] lg:inline">Filtros:</span>
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 lg:w-[20rem] lg:flex-none">
              <div className="relative">
                <select
                  value={facultad}
                  onChange={(e) => { setFacultad(e.target.value); setPage(0) }}
                  aria-label="Filtrar por facultad"
                  className="h-11 w-full appearance-none rounded-md border border-[#B8CBEF] bg-white pl-3 pr-8 text-sm text-[#011140]"
                >
                  <option value="">Facultad</option>
                  {facultades.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#627A9B]" aria-hidden="true" />
              </div>
              <div className="relative">
                <select
                  value={estado}
                  onChange={(e) => { setEstado(e.target.value); setPage(0) }}
                  aria-label="Filtrar por estado"
                  className="h-11 w-full appearance-none rounded-md border border-[#B8CBEF] bg-white pl-3 pr-8 text-sm text-[#011140]"
                >
                  <option value="">Estado</option>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="HABILITADO">Habilitado</option>
                  <option value="NO_HABILITADO">No habilitado</option>
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#627A9B]" aria-hidden="true" />
              </div>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setAsociarOpen(true)}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#0439D9] px-3 text-sm font-semibold text-white hover:bg-[#0c41e1] lg:gap-2 lg:px-4"
              >
                <Plus size={16} aria-hidden="true" />
                <span className="lg:hidden">Asociar</span>
                <span className="hidden lg:inline">Asociar Estudiantes</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}

      {loading ? (
        <div role="status" aria-live="polite" className="rounded-lg border border-[#B8CBEF] bg-[#E9F1FF] px-6 py-12 text-center text-[#011140]">
          <LoaderCircle className="mx-auto animate-spin text-[#0439D9]" size={30} aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold">Cargando estudiantes...</p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3 min-[960px]:hidden">
            {paged.length === 0 ? (
              <li className="rounded-xl border border-[#D8E3F5] bg-white px-4 py-10 text-center text-sm text-gray-500">
                {hasActiveFilters
                  ? 'Sin resultados para los filtros aplicados.'
                  : 'No hay estudiantes asociados a este examen.'}
              </li>
            ) : paged.map((e, index) => {
              const noHabilitado = e.estadoHabilitacion === 'NO_HABILITADO'
              const visual = estadoVisual(e.estadoHabilitacion)
              return (
                <li
                  key={e.idEstudiante}
                  className={`rounded-xl border bg-white shadow-sm ${noHabilitado ? 'border-[#FBCFD4]' : 'border-[#D8E3F5]'}`}
                >
                  <div className="flex items-start gap-3 p-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(e.idEstudiante)}
                      onChange={(ev) => {
                        setSelected((prev) => (
                          ev.target.checked
                            ? [...prev, e.idEstudiante]
                            : prev.filter((id) => id !== e.idEstudiante)
                        ))
                      }}
                      aria-label={`Seleccionar a ${e.nombre} ${e.apellidos}`}
                      className="mt-1 h-4 w-4 shrink-0"
                    />
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${AVATARS[index % AVATARS.length]}`}>
                      {initialsOfName(`${e.nombre} ${e.apellidos}`)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[#011140]">{e.nombre} {e.apellidos}</p>
                      <p className="mt-0.5 truncate text-[11px] text-[#627A9B]">Cód: {e.codigoSis}</p>
                      <p className="truncate text-[11px] text-[#627A9B]">CI: {e.ci}</p>
                    </div>
                    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${visual.badge}`}>
                      <EstadoIcono icon={visual.icon} />
                      {visual.label}
                    </span>
                  </div>
                  <div className="flex items-end justify-between gap-3 border-t border-[#EDF1F7] px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">Motivo / Razón</p>
                      <p className={`text-sm ${noHabilitado ? 'font-medium text-[#B91C1C]' : 'text-[#011140]'}`}>{e.motivo || '—'}</p>
                      {mostrarAulas && (
                        <p className="mt-1.5 text-[11px] text-[#627A9B]">Aula: <AulaDe estudiante={e} /></p>
                      )}
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => abrirCambioIndividual(e)}
                        className="inline-flex h-9 shrink-0 items-center rounded-md border border-[#D8E3F5] bg-white px-3 text-sm font-semibold text-[#011140] hover:bg-[#F8FAFC]"
                      >
                        Cambiar
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="hidden max-w-full overflow-x-auto rounded-lg border border-[#D8E3F5] bg-white min-[960px]:block">
            <table className="w-full min-w-[860px] text-left">
              <caption className="sr-only">Estudiantes habilitados del examen</caption>
              <thead className="bg-[#F8FAFC] text-xs uppercase tracking-wide text-[#627A9B]">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={(e) => {
                        const ids = paged.map((s) => s.idEstudiante)
                        setSelected((prev) => (
                          e.target.checked
                            ? [...new Set([...prev, ...ids])]
                            : prev.filter((id) => !ids.includes(id))
                        ))
                      }}
                      aria-label="Seleccionar todos de esta página"
                    />
                  </th>
                  <th scope="col" className="px-4 py-3 font-bold">Estudiante</th>
                  <th scope="col" className="px-4 py-3 font-bold">CI</th>
                  <th scope="col" className="px-4 py-3 font-bold">Estado de habilitación</th>
                  <th scope="col" className="px-4 py-3 font-bold">Motivo / Razón</th>
                  {mostrarAulas && <th scope="col" className="px-4 py-3 font-bold">Aula</th>}
                  <th scope="col" className="px-4 py-3 text-center font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF1F7] text-sm">
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={mostrarAulas ? 7 : 6} className="px-4 py-10 text-center text-sm text-gray-500">
                      {hasActiveFilters
                        ? 'Sin resultados para los filtros aplicados.'
                        : 'No hay estudiantes asociados a este examen.'}
                    </td>
                  </tr>
                ) : paged.map((e, index) => {
                  const visual = estadoVisual(e.estadoHabilitacion)
                  return (
                    <tr key={e.idEstudiante}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.includes(e.idEstudiante)}
                          onChange={(ev) => {
                            setSelected((prev) => (
                              ev.target.checked
                                ? [...prev, e.idEstudiante]
                                : prev.filter((id) => id !== e.idEstudiante)
                            ))
                          }}
                          aria-label={`Seleccionar a ${e.nombre} ${e.apellidos}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${AVATARS[index % AVATARS.length]}`}>
                            {initialsOfName(`${e.nombre} ${e.apellidos}`)}
                          </span>
                          <span>
                            <span className="block font-semibold text-[#011140]">{e.nombre} {e.apellidos}</span>
                            <span className="text-xs text-gray-500">Cód: {e.codigoSis}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{e.ci}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-2 text-sm font-medium ${visual.className}`}>
                          <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${visual.iconWrap}`}>
                            <EstadoIcono icon={visual.icon} />
                          </span>
                          {visual.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{e.motivo ?? '—'}</td>
                      {mostrarAulas && <td className="px-4 py-3"><AulaDe estudiante={e} /></td>}
                      <td className="px-4 py-3 text-center">
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => abrirCambioIndividual(e)}
                            className="text-sm font-semibold text-[#3D70C9] hover:underline"
                          >
                            Cambiar
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-[#D8E3F5] bg-white px-4 py-3 min-[960px]:flex-row min-[960px]:items-center min-[960px]:justify-between">
            <div className="flex items-center justify-between gap-2 text-sm text-[#011140] min-[960px]:justify-start">
              <label className="inline-flex items-center gap-2 font-semibold min-[960px]:font-normal">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && filtered.every((e) => selected.includes(e.idEstudiante))}
                  onChange={(e) => {
                    setSelected(e.target.checked ? filtered.map((s) => s.idEstudiante) : [])
                  }}
                  className="h-4 w-4"
                />
                Seleccionar todos
              </label>
              <span className="text-[#627A9B]">
                <span className="font-bold text-[#011140]">{seleccionEfectiva.length}</span> de {filtered.length} seleccionados
              </span>
              <span className="hidden text-[#627A9B] min-[960px]:inline">Acciones por bloque</span>
            </div>
            {isAdmin && (
              <div className="grid grid-cols-2 gap-2 min-[960px]:flex">
                <button
                  type="button"
                  disabled={seleccionEfectiva.length === 0 || saving}
                  onClick={() => void applyEstado(seleccionEfectiva, 'HABILITADO')}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-[#0439D9] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Check size={15} aria-hidden="true" />
                  <span className="min-[960px]:hidden">Habilitar selección</span>
                  <span className="hidden min-[960px]:inline">Habilitar seleccionados</span>
                </button>
                <button
                  type="button"
                  disabled={seleccionEfectiva.length === 0 || saving}
                  onClick={() => abrirCambio(
                    seleccionEfectiva,
                    seleccionEfectiva.length === 1
                      ? '1 estudiante seleccionado'
                      : `${seleccionEfectiva.length} estudiantes seleccionados`,
                    'NO_HABILITADO',
                  )}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X size={15} aria-hidden="true" />
                  <span className="min-[960px]:hidden">Deshabilitar</span>
                  <span className="hidden min-[960px]:inline">Deshabilitar seleccionados</span>
                </button>
              </div>
            )}
          </div>

          <TablePagination
            page={currentPage}
            pageSize={PAGE_SIZE}
            totalRecords={filtered.length}
            totalPages={totalPages}
            onPageChange={setPage}
            itemLabel="estudiantes"
          />
        </>
      )}

      {asociarOpen && (
        <AsociarEstudiantesModal
          idExamen={idExamen}
          idParalelo={idParalelo}
          examenResumen={examenResumen}
          asociados={asociadosIds}
          onAsociados={(lista) => {
            setEstudiantes(lista)
            onCountChange?.(lista.length)
          }}
          onClose={() => setAsociarOpen(false)}
        />
      )}

      {cambio && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-[#011140]/25 pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:z-50 sm:items-center sm:bg-black/45 sm:p-4">
          <form
            noValidate
            role="dialog"
            aria-modal="true"
            aria-labelledby="cambiar-titulo"
            className="relative flex max-h-[85dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-[#D8E3F5] bg-white shadow-2xl sm:max-h-[min(92dvh,900px)] sm:rounded-3xl sm:shadow-xl"
            onSubmit={(event) => {
              event.preventDefault()
              if (cambiarEstado === 'NO_HABILITADO') {
                // El espacio final que queda al terminar de escribir se recorta antes de validar.
                const razon = cambiarMotivo.trim()
                setCambiarMotivo(razon)
                const errorRazon = validateRazonInhabilitacion(razon)
                if (errorRazon) {
                  setMotivoError(errorRazon)
                  return
                }
                void applyEstado(cambio.ids, 'NO_HABILITADO', razon)
                return
              }
              void applyEstado(cambio.ids, 'HABILITADO')
            }}
          >
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#E9EEF6] px-4 pb-3 pt-2 sm:border-b-0 sm:px-10 sm:pb-0 sm:pt-9">
              <div className="min-w-0 flex-1">
                <div aria-hidden="true" className="mx-auto mb-3 h-1 w-11 rounded-full bg-[#C4D2E7] sm:hidden" />
                <h3 id="cambiar-titulo" className="text-base font-bold tracking-tight text-[#011140] sm:text-2xl">
                  Cambiar estado de habilitación
                </h3>
              </div>
              <button
                type="button"
                onClick={cerrarCambio}
                disabled={saving}
                aria-label="Cerrar"
                className="mt-4 shrink-0 rounded-full bg-[#F1F6FF] p-2 text-[#627A9B] transition-colors hover:bg-[#F2F4F7] hover:text-[#011140] disabled:opacity-50 sm:-mr-1.5 sm:mt-0 sm:rounded-lg sm:bg-transparent sm:p-1.5 sm:text-[#667085]"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-10 sm:pb-0">
            <dl className="mt-4 space-y-2 sm:mt-6 rounded-2xl border border-[#E4E9F2] bg-[#F8FAFD] px-5 py-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[#475467]">{cambio.ids.length > 1 ? 'Estudiantes:' : 'Estudiante:'}</dt>
                <dd className="text-right font-semibold text-[#101828]">{cambio.titulo}</dd>
              </div>
              {cambio.codigo && (
                <div className="flex justify-between gap-4">
                  <dt className="text-[#475467]">Código:</dt>
                  <dd className="text-right font-semibold text-[#101828]">{cambio.codigo}</dd>
                </div>
              )}
              {examenResumen && (
                <div className="flex justify-between gap-4">
                  <dt className="text-[#475467]">Examen:</dt>
                  <dd className="text-right text-[#101828]">{examenResumen}</dd>
                </div>
              )}
            </dl>

            <fieldset className="mt-5 sm:mt-6 sm:border-t sm:border-[#E4E9F2] sm:pt-6">
              <legend className="sr-only">Nuevo estado</legend>
              <p aria-hidden="true" className="text-xs font-semibold uppercase tracking-[0.08em] text-[#98A2B3] sm:text-sm sm:text-[#101828]">Nuevo estado:</p>
              <div className="mt-3 space-y-3">
                {([
                  { valor: 'HABILITADO', label: 'Habilitado', Icono: CheckCheck,
                    activo: 'border-[#86EFAC] bg-[#F0FDF4] ring-1 ring-[#86EFAC]', texto: 'text-[#15803D]', radio: 'accent-[#16A34A]' },
                  { valor: 'NO_HABILITADO', label: 'No habilitado', Icono: X,
                    activo: 'border-[#FCA5A5] bg-[#FEF2F2] ring-1 ring-[#FCA5A5]', texto: 'text-[#DC2626]', radio: 'accent-[#DC2626]' },
                ] as const).map(({ valor, label, Icono, activo, texto, radio }) => (
                  <label
                    key={valor}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-5 py-4 transition-colors ${
                      cambiarEstado === valor ? activo : 'border-[#D0D5DD] bg-white hover:bg-[#F9FAFB]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cambiar-estado"
                      value={valor}
                      checked={cambiarEstado === valor}
                      onChange={() => { setCambiarEstado(valor); setMotivoError('') }}
                      className={`h-5 w-5 cursor-pointer ${radio}`}
                    />
                    <Icono size={18} aria-hidden="true" className={texto} />
                    <span className={`text-[15px] font-semibold ${texto}`}>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {cambiarEstado === 'NO_HABILITADO' && (
              <div className="mt-5 sm:mt-6 sm:border-t sm:border-[#E4E9F2] sm:pt-6">
                <label htmlFor="cambiar-motivo" className="block text-sm font-semibold text-[#101828]">
                  Razón de inhabilitación: <span className="text-red-500">*</span>
                </label>
                <input
                  id="cambiar-motivo"
                  value={cambiarMotivo}
                  maxLength={RAZON_MAX}
                  aria-invalid={Boolean(motivoError)}
                  aria-describedby={motivoError ? 'cambiar-motivo-error' : undefined}
                  placeholder="Ej. Deuda en biblioteca"
                  onChange={(e) => { setCambiarMotivo(sanearRazon(e.target.value)); if (motivoError) setMotivoError('') }}
                  onBlur={() => {
                    const razon = cambiarMotivo.trim()
                    setCambiarMotivo(razon)
                    if (razon) setMotivoError(validateRazonInhabilitacion(razon) ?? '')
                  }}
                  className={`mt-3 h-12 w-full rounded-xl border bg-white px-4 text-sm text-[#101828] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] ${motivoError ? 'border-red-400' : 'border-[#B8CBEF]'}`}
                />
                <div className="mt-1 flex justify-between gap-2 text-xs">
                  <span id="cambiar-motivo-error" className="text-red-600">{motivoError}</span>
                  <span className="shrink-0 text-gray-400">{cambiarMotivo.length}/{RAZON_MAX}</span>
                </div>
                <div className="mt-2 rounded-2xl border border-[#E4E9F2] bg-[#F8FAFD] px-5 py-4">
                  <p className="text-sm font-semibold text-[#101828]">Ejemplos:</p>
                  <ul className="mt-2 space-y-1.5">
                    {RAZONES_EJEMPLO.map((razon) => (
                      <li key={razon}>
                        <button
                          type="button"
                          onClick={() => { setCambiarMotivo(razon); setMotivoError('') }}
                          className="text-left text-sm text-[#344054] transition-colors hover:text-[#0439D9]"
                        >
                          • {razon}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            </div>

            <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-[#E9EEF6] bg-white px-4 py-3 sm:mx-10 sm:mt-6 sm:flex-row sm:justify-end sm:gap-3 sm:border-[#E4E9F2] sm:px-0 sm:pb-9 sm:pt-6">
              <button
                type="button"
                onClick={cerrarCambio}
                disabled={saving}
                className="w-full rounded-lg border border-[#C9D7EC] bg-white px-4 py-2 text-sm font-semibold text-[#45628D] transition-colors hover:bg-[#F9FAFB] disabled:opacity-50 sm:w-auto sm:rounded-xl sm:border-[#D0D5DD] sm:px-6 sm:py-2.5 sm:text-[#101828]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="min-h-11 w-full rounded-lg bg-[#0439D9] px-4 py-3 text-sm font-bold text-white shadow-md shadow-[#0439D9]/20 transition-colors hover:bg-[#0331BD] disabled:opacity-60 sm:w-auto sm:rounded-xl sm:px-7 sm:py-2.5 sm:font-semibold sm:shadow-none"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </footer>
            <ConfirmDiscardDialog
              open={confirmarCierre}
              onStay={() => setConfirmarCierre(false)}
              onLeave={() => { setConfirmarCierre(false); setCambio(null) }}
            />
          </form>
        </div>
      )}

      <ResultadoModal resultado={resultado} onClose={() => setResultado(null)} />
    </section>
  )
}

/** Aula del estudiante; los NO habilitados no ocupan lugar y quien no entra se marca en rojo. */
function AulaDe({ estudiante }: { estudiante: EstudianteHabilitacionDto }) {
  if (estudiante.aula) return <span className="font-semibold text-[#011140]">{estudiante.aula}</span>
  if (estudiante.estadoHabilitacion === 'NO_HABILITADO') return <span className="text-gray-400">—</span>
  return <span className="font-semibold text-red-600">Sin aula</span>
}

/** Ocupación por aula según el reparto alfabético, con aviso si alguien no tiene lugar. */
function ResumenAulas({ reparto }: { reparto: RepartoAulasDto }) {
  return (
    <div className="rounded-xl border border-[#D8E3F5] bg-white p-3 shadow-sm">
      <p className="flex items-center gap-1.5 text-xs font-bold text-[#011140]">
        <DoorOpen size={15} aria-hidden="true" className="text-[#0439D9]" />
        Reparto por aula (orden alfabético)
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {reparto.aulas.map((a) => {
          const lleno = a.capacidad !== null && a.asignados >= a.capacidad
          return (
            <li key={a.idAmbiente} className={`rounded-lg border px-3 py-1.5 text-xs ${lleno ? 'border-amber-300 bg-amber-50' : 'border-[#D8E3F5] bg-[#F8FAFD]'}`}>
              <span className="font-semibold text-[#011140]">{a.nombre}</span>{' '}
              <span className="text-[#45628D]">{a.capacidad !== null ? `${a.asignados}/${a.capacidad}` : `${a.asignados} · sin aforo`}</span>
            </li>
          )
        })}
      </ul>
      {reparto.sinAula > 0 && (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-red-600">
          <CircleAlert size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
          {reparto.sinAula === 1 ? '1 estudiante no tiene aula' : `${reparto.sinAula} estudiantes no tienen aula`}:
          agrega otra aula al examen o registra un aforo mayor.
        </p>
      )}
    </div>
  )
}

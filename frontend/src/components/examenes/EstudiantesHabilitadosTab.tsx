import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, Hourglass, LoaderCircle, Plus, Search, X } from 'lucide-react'
import TablePagination from '../users/TablePagination'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { initialsOfName } from '../../utils/examenFormat'
import { isNetworkError, isOffline } from '../../utils/examFormUtils'
import {
  BUSQUEDA_MAX,
  RAZON_MAX,
  sanearBusqueda,
  sanearPegado,
  validateRazonInhabilitacion,
} from '../../utils/habilitacionValidators'
import ResultadoModal, { type Resultado } from '../ui/ResultadoModal'
import AsociarEstudiantesModal from './AsociarEstudiantesModal'
import { ConfirmDiscardDialog } from './ExamFormDialogs'
import {
  actualizarHabilitacion,
  listarEstudiantesExamen,
  type EstadoHabilitacion,
  type EstudianteHabilitacionDto,
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
    detalle?: string
    estadoInicial: EstadoCambio
    motivoInicial: string
  } | null>(null)
  const [cambiarEstado, setCambiarEstado] = useState<EstadoCambio>('HABILITADO')
  const [cambiarMotivo, setCambiarMotivo] = useState('')
  const [motivoError, setMotivoError] = useState('')
  const [confirmarCierre, setConfirmarCierre] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)

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
    detalle?: string,
  ) => {
    setCambio({ ids, titulo, detalle, estadoInicial, motivoInicial: motivo })
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
      `CI ${e.ci} · Cód. ${e.codigoSis}`,
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
                  <th scope="col" className="px-4 py-3 text-center font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF1F7] text-sm">
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
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
          asociados={asociadosIds}
          onAsociados={(lista) => {
            setEstudiantes(lista)
            onCountChange?.(lista.length)
          }}
          onClose={() => setAsociarOpen(false)}
        />
      )}

      {cambio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            noValidate
            role="dialog"
            aria-modal="true"
            aria-labelledby="cambiar-titulo"
            className="relative w-full max-w-md rounded-2xl border border-[#D8E3F5] bg-white p-6 shadow-xl"
            onSubmit={(event) => {
              event.preventDefault()
              if (cambiarEstado === 'NO_HABILITADO') {
                const errorRazon = validateRazonInhabilitacion(cambiarMotivo)
                if (errorRazon) {
                  setMotivoError(errorRazon)
                  return
                }
                void applyEstado(cambio.ids, 'NO_HABILITADO', cambiarMotivo)
                return
              }
              void applyEstado(cambio.ids, 'HABILITADO')
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 id="cambiar-titulo" className="text-base font-bold text-[#011140]">Cambiar habilitación</h3>
                <p className="mt-1 text-sm font-medium text-[#011140]">{cambio.titulo}</p>
                {cambio.detalle && <p className="text-xs text-gray-500">{cambio.detalle}</p>}
                {examenResumen && <p className="mt-1 text-xs text-[#627A9B]">Examen: {examenResumen}</p>}
              </div>
              <button
                type="button"
                onClick={cerrarCambio}
                disabled={saving}
                aria-label="Cerrar"
                className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <label htmlFor="cambiar-estado" className="mt-4 block text-xs font-semibold text-[#627A9B]">Estado</label>
            <select
              id="cambiar-estado"
              value={cambiarEstado}
              onChange={(e) => { setCambiarEstado(e.target.value as EstadoCambio); setMotivoError('') }}
              className="mt-1 h-11 w-full rounded-md border border-[#B8CBEF] px-3 text-sm"
            >
              <option value="HABILITADO">Habilitado</option>
              <option value="NO_HABILITADO">No habilitado</option>
            </select>
            {cambiarEstado === 'NO_HABILITADO' && (
              <>
                <label htmlFor="cambiar-motivo" className="mt-3 block text-xs font-semibold text-[#627A9B]">
                  Razón de inhabilitación <span className="text-red-500">*</span>
                </label>
                <input
                  id="cambiar-motivo"
                  value={cambiarMotivo}
                  maxLength={RAZON_MAX}
                  aria-invalid={Boolean(motivoError)}
                  aria-describedby={motivoError ? 'cambiar-motivo-error' : undefined}
                  placeholder="Ej. Deuda en biblioteca"
                  onChange={(e) => { setCambiarMotivo(sanearPegado(e.target.value)); if (motivoError) setMotivoError('') }}
                  onBlur={() => { if (cambiarMotivo) setMotivoError(validateRazonInhabilitacion(cambiarMotivo) ?? '') }}
                  className={`mt-1 h-11 w-full rounded-md border px-3 text-sm ${motivoError ? 'border-red-400' : 'border-[#B8CBEF]'}`}
                />
                <div className="mt-1 flex justify-between gap-2 text-xs">
                  <span id="cambiar-motivo-error" className="text-red-600">{motivoError}</span>
                  <span className="shrink-0 text-gray-400">{cambiarMotivo.length}/{RAZON_MAX}</span>
                </div>
              </>
            )}
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={cerrarCambio} disabled={saving} className="flex-1 rounded-lg border py-2.5 text-sm font-medium">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-[#0439D9] py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
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

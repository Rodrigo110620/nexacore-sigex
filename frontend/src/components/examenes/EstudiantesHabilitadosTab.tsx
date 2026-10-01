import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react'
import TablePagination from '../users/TablePagination'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { initialsOfName } from '../../utils/examenFormat'
import AsociarEstudiantesModal from './AsociarEstudiantesModal'
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
      icon: 'check' as const,
    }
  }
  return {
    label: 'No habilitado',
    className: 'text-[#B91C1C]',
    iconWrap: 'bg-[#EF4444] text-white',
    icon: 'x' as const,
  }
}

interface EstudiantesHabilitadosTabProps {
  idExamen: number
  idParalelo: number
  isAdmin: boolean
  onCountChange?: (count: number) => void
}

export default function EstudiantesHabilitadosTab({
  idExamen,
  idParalelo,
  isAdmin,
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
  const [cambiar, setCambiar] = useState<EstudianteHabilitacionDto | null>(null)
  const [cambiarEstado, setCambiarEstado] = useState<EstadoHabilitacion>('HABILITADO')
  const [cambiarMotivo, setCambiarMotivo] = useState('')

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

  const applyEstado = async (ids: number[], next: EstadoHabilitacion, motivo?: string) => {
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
      setCambiar(null)
    } catch {
      setError('No se pudo actualizar la habilitación.')
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
              onChange={(e) => { setQuery(e.target.value); setPage(0) }}
              placeholder="Buscar por nombre, CI, código SIS"
              autoComplete="off"
              aria-label="Buscar estudiantes"
              className="h-11 w-full rounded-md border border-[#B8CBEF] bg-white pl-10 pr-3 text-sm text-[#011140] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm font-medium text-[#627A9B] lg:inline">Filtros:</span>
            <div className="grid grid-cols-2 gap-2 lg:w-[20rem]">
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
                  <option value="HABILITADO">Habilitado</option>
                  <option value="NO_HABILITADO">No habilitado</option>
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#627A9B]" aria-hidden="true" />
              </div>
            </div>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setAsociarOpen(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#0439D9] px-4 text-sm font-semibold text-white hover:bg-[#0c41e1]"
            >
              <Plus size={16} aria-hidden="true" />
              Asociar Estudiantes
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}

      {loading ? (
        <p className="rounded-lg border border-[#D8E3F5] bg-white px-6 py-10 text-center text-sm text-gray-500">
          Cargando estudiantes…
        </p>
      ) : (
        <>
          <div className="max-w-full overflow-x-auto rounded-lg border border-[#D8E3F5] bg-white">
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
                            {visual.icon === 'check' ? <Check size={12} strokeWidth={3} aria-hidden="true" /> : <X size={12} strokeWidth={3} aria-hidden="true" />}
                          </span>
                          {visual.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{e.motivo ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => {
                              setCambiar(e)
                              setCambiarEstado(e.estadoHabilitacion)
                              setCambiarMotivo(e.motivo ?? '')
                            }}
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

          <div className="flex flex-col gap-3 rounded-lg border border-[#D8E3F5] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-[#011140]">
              <input
                type="checkbox"
                checked={filtered.length > 0 && filtered.every((e) => selected.includes(e.idEstudiante))}
                onChange={(e) => {
                  setSelected(e.target.checked ? filtered.map((s) => s.idEstudiante) : [])
                }}
              />
              Seleccionar todos
              <span className="text-[#627A9B]">{selected.length} de {filtered.length} seleccionados</span>
              <span className="hidden text-[#627A9B] sm:inline">Acciones por bloque</span>
            </label>
            {isAdmin && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={selected.length === 0 || saving}
                  onClick={() => void applyEstado(selected, 'HABILITADO', 'Matrícula regular confirmada')}
                  className="inline-flex h-10 items-center gap-1.5 rounded-md bg-[#0439D9] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Check size={15} aria-hidden="true" />
                  Habilitar seleccionados
                </button>
                <button
                  type="button"
                  disabled={selected.length === 0 || saving}
                  onClick={() => void applyEstado(selected, 'NO_HABILITADO', 'Razón: Deuda / bloqueo SIGA')}
                  className="inline-flex h-10 items-center gap-1.5 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X size={15} aria-hidden="true" />
                  Deshabilitar seleccionados
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

      {cambiar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            className="w-full max-w-md rounded-2xl border border-[#D8E3F5] bg-white p-6 shadow-xl"
            onSubmit={(event) => {
              event.preventDefault()
              void applyEstado([cambiar.idEstudiante], cambiarEstado, cambiarMotivo)
            }}
          >
            <h3 className="text-base font-bold text-[#011140]">Cambiar habilitación</h3>
            <p className="mt-1 text-sm text-gray-500">{cambiar.nombre} {cambiar.apellidos}</p>
            <label className="mt-4 block text-xs font-semibold text-[#627A9B]">Estado</label>
            <select
              value={cambiarEstado}
              onChange={(e) => setCambiarEstado(e.target.value as EstadoHabilitacion)}
              className="mt-1 h-11 w-full rounded-md border border-[#B8CBEF] px-3 text-sm"
            >
              <option value="HABILITADO">Habilitado</option>
              <option value="NO_HABILITADO">No habilitado</option>
            </select>
            <label className="mt-3 block text-xs font-semibold text-[#627A9B]">Motivo / razón</label>
            <input
              value={cambiarMotivo}
              onChange={(e) => setCambiarMotivo(e.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-[#B8CBEF] px-3 text-sm"
            />
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setCambiar(null)} className="flex-1 rounded-lg border py-2.5 text-sm font-medium">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-[#0439D9] py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}

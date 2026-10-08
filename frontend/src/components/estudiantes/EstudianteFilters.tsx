import { Search } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { getCarreras, getFacultades } from '../../services/estudianteService'
import FiltroDesplegable from '../ui/FiltroDesplegable'
import { BUSQUEDA_MAX, sanearBusqueda } from '../../utils/habilitacionValidators'
import type {
  CarreraOption,
  EstudianteFilterParams,
  FacultadOption,
} from '../../types/estudiante'

interface EstudianteFiltersProps {
  value: EstudianteFilterParams
  onChange: (next: EstudianteFilterParams) => void
  disabled?: boolean
  /** Para contenedores angostos (modales): el buscador ocupa su fila y los filtros van debajo. */
  compact?: boolean
}

export default function EstudianteFilters({ value, onChange, disabled = false, compact = false }: EstudianteFiltersProps) {
  const id = useId()
  const searchId = `${id}-search`
  const facultadId = `${id}-facultad`
  const carreraId = `${id}-carrera`

  const [facultades, setFacultades] = useState<FacultadOption[]>([])
  const [carreras, setCarreras] = useState<CarreraOption[]>([])

  useEffect(() => {
    const controller = new AbortController()
    getFacultades(controller.signal)
      .then(setFacultades)
      .catch(() => setFacultades([]))
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    getCarreras(value.idFacultad || undefined, controller.signal)
      .then(setCarreras)
      .catch(() => setCarreras([]))
    return () => controller.abort()
  }, [value.idFacultad])

  const handleFacultadChange = useCallback(
    (newIdFacultad: string) => {
      onChange({
        ...value,
        idFacultad: newIdFacultad,
        idCarrera: '',
      })
    },
    [onChange, value],
  )

  const opcionesFacultad = useMemo(
    () => [...facultades]
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      .map((f) => ({ value: String(f.id), label: f.nombre })),
    [facultades],
  )
  // Sin facultad elegida se listan todas las carreras agrupadas por su facultad.
  const opcionesCarrera = useMemo(
    () => [...carreras]
      .sort((a, b) => a.nombreFacultad.localeCompare(b.nombreFacultad, 'es') || a.nombre.localeCompare(b.nombre, 'es'))
      .map((c) => ({
        value: String(c.idCarrera),
        label: c.nombre,
        grupo: value.idFacultad ? undefined : c.nombreFacultad,
      })),
    [carreras, value.idFacultad],
  )
  const campoClass = `${compact ? 'h-10 rounded-lg' : 'h-11 rounded-md'} text-xs sm:text-sm`

  return (
    <section aria-labelledby={`${id}-title`} className="min-w-0 bg-transparent">
      <h2 id={`${id}-title`} className="sr-only">Filtros de estudiantes</h2>
      <div
        className={compact
          ? 'flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-3'
          : 'grid min-w-0 grid-cols-2 gap-2 sm:gap-3 min-[960px]:grid-cols-[minmax(0,1fr)_14rem_14rem]'}
      >
        <div className={compact ? 'w-full min-w-0' : 'col-span-2 min-w-0 min-[960px]:col-span-1'}>
          <label htmlFor={searchId} className="sr-only">Buscar estudiantes</label>
          <div className="relative">
            <Search aria-hidden="true" size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#011140]" />
            <input
              id={searchId}
              type="search"
              value={value.search}
              maxLength={BUSQUEDA_MAX}
              onChange={(e) => onChange({ ...value, search: sanearBusqueda(e.target.value) })}
              placeholder="Buscar por nombre, CI, código SIS"
              autoComplete="off"
              disabled={disabled }
              className={`${compact ? 'h-12 rounded-xl bg-[#F8FAFD]' : 'h-11 rounded-md bg-white'} w-full min-w-0 border border-[#B8CBEF] pl-10 pr-3 text-sm text-[#011140] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] disabled:cursor-not-allowed disabled:bg-gray-100`}
            />
          </div>
        </div>

        {/* En móvil se omite la etiqueta para que "Todas las facultades" quepa sin cortarse. */}
        {compact && <span className="hidden text-sm font-semibold text-[#011140] sm:inline">Filtros:</span>}

        <div className={compact ? 'min-w-0 flex-1 sm:w-60 sm:flex-none' : 'min-w-0'}>
          <label htmlFor={facultadId} className="sr-only">Facultad</label>
          <FiltroDesplegable
            id={facultadId}
            value={value.idFacultad}
            onChange={handleFacultadChange}
            opciones={opcionesFacultad}
            textoTodas="Todas las facultades"
            placeholderBusqueda="Buscar facultad…"
            disabled={disabled}
            className={campoClass}
          />
        </div>

        <div className={compact ? 'min-w-0 flex-1 sm:w-60 sm:flex-none' : 'min-w-0'}>
          <label htmlFor={carreraId} className="sr-only">Carrera</label>
          <FiltroDesplegable
            id={carreraId}
            value={value.idCarrera}
            onChange={(idCarrera) => onChange({ ...value, idCarrera })}
            opciones={opcionesCarrera}
            textoTodas="Todas las carreras"
            placeholderBusqueda="Buscar carrera…"
            disabled={disabled}
            className={campoClass}
          />
        </div>
      </div>
    </section>
  )
}

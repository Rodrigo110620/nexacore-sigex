import { Search, ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useId, useState } from 'react'
import { getCarreras, getFacultades } from '../../services/estudianteService'
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

        {compact && <span className="text-sm font-semibold text-[#011140]">Filtros:</span>}

        <div className={compact ? 'min-w-0 flex-1 sm:w-56 sm:flex-none' : 'min-w-0'}>
          <label htmlFor={facultadId} className="sr-only">Facultad</label>
          <div className="relative">
            <select
              id={facultadId}
              value={value.idFacultad}
              onChange={(e) => handleFacultadChange(e.target.value)}
               disabled={disabled}
              className={`${compact ? 'h-10 rounded-lg' : 'h-11 rounded-md'} w-full min-w-0 appearance-none border border-[#B8CBEF] bg-white pl-2 pr-7 text-xs text-[#011140] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] disabled:cursor-not-allowed disabled:bg-gray-100 sm:pl-4 sm:pr-10 sm:text-sm`}
            >
              <option value="">Todas las facultades</option>
              {facultades.map((f) => (
                <option key={f.id} value={String(f.id)}>
                  {f.nombre}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" size={17} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#011140] sm:right-3" />
          </div>
        </div>

        <div className={compact ? 'min-w-0 flex-1 sm:w-56 sm:flex-none' : 'min-w-0'}>
          <label htmlFor={carreraId} className="sr-only">Carrera</label>
          <div className="relative">
            <select
              id={carreraId}
              value={value.idCarrera}
              onChange={(e) => onChange({ ...value, idCarrera: e.target.value })}
              disabled={disabled}
              className={`${compact ? 'h-10 rounded-lg' : 'h-11 rounded-md'} w-full min-w-0 appearance-none border border-[#B8CBEF] bg-white pl-2 pr-7 text-xs text-[#011140] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] disabled:cursor-not-allowed disabled:bg-gray-100 sm:pl-4 sm:pr-10 sm:text-sm`}
            >
              <option value="">
                {value.idFacultad ? 'Todas las carreras' : 'Todas las carreras'}
              </option>
              {carreras.map((c) => (
                <option key={c.idCarrera} value={String(c.idCarrera)}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" size={17} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#011140] sm:right-3" />
          </div>
        </div>
      </div>
    </section>
  )
}

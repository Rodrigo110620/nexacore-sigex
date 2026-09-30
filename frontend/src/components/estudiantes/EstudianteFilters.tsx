import { Search, ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useId, useState } from 'react'
import { getCarreras, getFacultades } from '../../services/estudianteService'
import type {
  CarreraOption,
  EstudianteFilterParams,
  FacultadOption,
} from '../../types/estudiante'

interface EstudianteFiltersProps {
  value: EstudianteFilterParams
  onChange: (next: EstudianteFilterParams) => void
  disabled?: boolean
}

export default function EstudianteFilters({ value, onChange, disabled = false }: EstudianteFiltersProps) {
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
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3 min-[960px]:grid-cols-[minmax(0,1fr)_14rem_14rem]">
        <div className="col-span-2 min-w-0 min-[960px]:col-span-1">
          <label htmlFor={searchId} className="sr-only">Buscar estudiantes</label>
          <div className="relative">
            <Search aria-hidden="true" size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#011140]" />
            <input
              id={searchId}
              type="search"
              value={value.search}
              onChange={(e) => onChange({ ...value, search: e.target.value })}
              placeholder="Buscar por nombre, CI, código SIS"
              autoComplete="off"
              disabled={disabled }
              className="h-11 w-full min-w-0 rounded-md border border-[#B8CBEF] bg-white pl-10 pr-3 text-sm text-[#011140] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>
        </div>

        <div className="min-w-0">
          <label htmlFor={facultadId} className="sr-only">Facultad</label>
          <div className="relative">
            <select
              id={facultadId}
              value={value.idFacultad}
              onChange={(e) => handleFacultadChange(e.target.value)}
               disabled={disabled}
              className="h-11 w-full min-w-0 appearance-none rounded-md border border-[#B8CBEF] bg-white pl-2 pr-7 text-xs text-[#011140] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] disabled:cursor-not-allowed disabled:bg-gray-100 sm:pl-4 sm:pr-10 sm:text-sm"
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

        <div className="min-w-0">
          <label htmlFor={carreraId} className="sr-only">Carrera</label>
          <div className="relative">
            <select
              id={carreraId}
              value={value.idCarrera}
              onChange={(e) => onChange({ ...value, idCarrera: e.target.value })}
              disabled={disabled}
              className="h-11 w-full min-w-0 appearance-none rounded-md border border-[#B8CBEF] bg-white pl-2 pr-7 text-xs text-[#011140] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] disabled:cursor-not-allowed disabled:bg-gray-100 sm:pl-4 sm:pr-10 sm:text-sm"
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

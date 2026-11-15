import { Search } from 'lucide-react'
import FiltroSelect from '../ui/FiltroSelect'
import { useId } from 'react'
import type { UserFilterParams } from '../../types/user'
import { useRoles } from '../../hooks/useRoles'

interface UserFiltersProps {
  value: UserFilterParams
  onChange: (next: UserFilterParams) => void
  disabled?: boolean
}

export default function UserFilters({ value, onChange, disabled = false }: UserFiltersProps) {
  const id = useId()
  const searchId = `${id}-search`
  const { roles } = useRoles()

  return (
    <section aria-labelledby={`${id}-title`} className="min-w-0 bg-transparent">
      <h2 id={`${id}-title`} className="sr-only">Filtros de usuarios</h2>
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3 min-[960px]:grid-cols-[minmax(0,1fr)_12rem_12rem]">
        <div className="col-span-2 min-w-0 min-[960px]:col-span-1">
          <label htmlFor={searchId} className="sr-only">Buscar usuarios</label>
          <div className="relative">
            <Search aria-hidden="true" size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#011140]" />
            <input
              id={searchId}
              name="search"
              type="search"
              value={value.search}
              onChange={(event) => onChange({ ...value, search: event.target.value })}
              placeholder="Buscar por nombre, email o DNI..."
              autoComplete="off"
              disabled={disabled}
              className="h-11 w-full min-w-0 rounded-md border border-[#B8CBEF] bg-white pl-10 pr-3 text-sm text-[#011140] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>
        </div>

        <FiltroSelect etiqueta="Rol" value={value.rol} disabled={disabled}
          onChange={(v) => onChange({ ...value, rol: v as UserFilterParams['rol'] })}>
              <option value="">Todos los roles</option>
              {roles.map(r => (
                <option key={r.value} value={r.value}>{r.value}</option>
              ))}
        </FiltroSelect>

        <FiltroSelect etiqueta="Estado" value={value.estado} disabled={disabled}
          onChange={(v) => onChange({ ...value, estado: v as UserFilterParams['estado'] })}>
              <option value="">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
        </FiltroSelect>
      </div>
    </section>
  )
}

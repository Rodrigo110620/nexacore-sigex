import { Search, ChevronDown } from 'lucide-react'
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
  const roleId = `${id}-role`
  const statusId = `${id}-status`
  const { roles } = useRoles()

  return (
    <section aria-labelledby={`${id}-title`} className="min-w-0 bg-transparent">
      <h2 id={`${id}-title`} className="sr-only">Filtros de usuarios</h2>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_12rem_12rem]">
        <div className="min-w-0 sm:col-span-2 lg:col-span-1">
          <label htmlFor={searchId} className="mb-1.5 block text-sm font-semibold text-[#011140]">Buscar usuarios</label>
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

        <div className="min-w-0">
          <label htmlFor={roleId} className="mb-1.5 block text-sm font-semibold text-[#011140]">Rol</label>
          <div className="relative">
            <select
              id={roleId}
              name="rol"
              value={value.rol}
              onChange={(event) => onChange({ ...value, rol: event.target.value as UserFilterParams['rol'] })}
              disabled={disabled}
              className="h-11 w-full min-w-0 appearance-none rounded-md border border-[#B8CBEF] bg-white pl-4 pr-10 text-sm text-[#011140] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="">Todos los roles</option>
              {roles.map(r => (
                <option key={r.value} value={r.value}>{r.value}</option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              size={17}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#011140]"
            />
          </div>
        </div>

        <div className="min-w-0">
          <label htmlFor={statusId} className="mb-1.5 block text-sm font-semibold text-[#011140]">Estado</label>
          <div className="relative">
            <select
              id={statusId}
              name="estado"
              value={value.estado}
              onChange={(event) => onChange({ ...value, estado: event.target.value as UserFilterParams['estado'] })}
              disabled={disabled}
              className="h-11 w-full min-w-0 appearance-none rounded-md border border-[#B8CBEF] bg-white pl-4 pr-10 text-sm text-[#011140] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
            <ChevronDown
              aria-hidden="true"
              size={17}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#011140]"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
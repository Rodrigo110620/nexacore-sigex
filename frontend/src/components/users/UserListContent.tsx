import { Download, UserPlus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import EmptyState from './EmptyState'
import UserCardList from './UserCardList'
import UserFilters from './UserFilters'
import UserTable from './UserTable'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import type { UserFilterParams, UserListItem } from '../../types/user'

interface UserListContentProps {
  users: UserListItem[]
  onFiltersChange?: (filters: UserFilterParams) => void
}

const initialFilters: UserFilterParams = { search: '', rol: '', estado: '' }

export default function UserListContent({ users, onFiltersChange }: UserListContentProps) {
  const [draftFilters, setDraftFilters] = useState<UserFilterParams>(initialFilters)
  const debouncedSearch = useDebouncedValue(draftFilters.search, 300)
  const lastEmittedRef = useRef<UserFilterParams>(initialFilters)

  useEffect(() => {
    if (!onFiltersChange) return

    const nextFilters: UserFilterParams = {
      search: debouncedSearch.trim(),
      rol: draftFilters.rol,
      estado: draftFilters.estado,
    }

    const lastFilters = lastEmittedRef.current
    const didChange =
      lastFilters.search !== nextFilters.search ||
      lastFilters.rol !== nextFilters.rol ||
      lastFilters.estado !== nextFilters.estado

    if (!didChange) return

    lastEmittedRef.current = nextFilters
    onFiltersChange(nextFilters)
  }, [debouncedSearch, draftFilters.rol, draftFilters.estado, onFiltersChange])

  return (
    <section aria-labelledby="users-title" className="bg-white px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-600">Administración</p>
            <h1 id="users-title" className="mt-1 text-2xl font-bold text-[#011140]">Gestión de usuarios</h1>
            <p className="mt-2 text-sm text-gray-600">Consulta las cuentas registradas, sus roles y estados de acceso.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled
              aria-label="Exportar usuarios, no disponible"
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Download size={16} aria-hidden="true" />
              Exportar
            </button>
            <button
              type="button"
              disabled
              aria-label="Registrar usuario, no disponible"
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <UserPlus size={16} aria-hidden="true" />
              Registrar
            </button>
          </div>
        </div>
        <p className="mb-4 text-xs text-gray-500">Funciones disponibles próximamente.</p>
        <div className="mb-6">
          <UserFilters value={draftFilters} onChange={setDraftFilters} />
        </div>
        {users.length > 0 ? (
          <>
            <div className="lg:hidden">
              <UserCardList users={users} />
            </div>
            <div className="hidden lg:block">
              <UserTable users={users} />
            </div>
          </>
        ) : <EmptyState />}
      </div>
    </section>
  )
}
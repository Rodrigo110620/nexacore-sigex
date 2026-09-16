import { CircleAlert, LoaderCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import EmptyState from './EmptyState'
import UserCardList from './UserCardList'
import UserFilters from './UserFilters'
import UserTable from './UserTable'
import UserPagination from './UserPagination'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import type { UserLoadError } from '../../hooks/useUsers'
import type { UserFilterParams, UserListItem } from '../../types/user'

interface UserListContentProps {
  users: UserListItem[]
  onFiltersChange?: (filters: UserFilterParams) => void
  loading?: boolean
  error?: UserLoadError | null
  page?: number
  pageSize?: number
  totalRecords?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  onRetry?: () => void
}

const initialFilters: UserFilterParams = { search: '', rol: '', estado: '' }

export default function UserListContent({
  users,
  onFiltersChange,
  loading = false,
  error = null,
  page = 0,
  pageSize = 10,
  totalRecords = users.length,
  totalPages = users.length > 0 ? 1 : 0,
  onPageChange,
  onRetry,
}: UserListContentProps) {
  const [draftFilters, setDraftFilters] = useState<UserFilterParams>(initialFilters)
  const debouncedSearch = useDebouncedValue(draftFilters.search, 300)
  const lastEmittedRef = useRef<UserFilterParams>(initialFilters)
  const hasActiveFilters = Boolean(draftFilters.search.trim() || draftFilters.rol || draftFilters.estado)
  const filtersDisabled = loading || error?.kind === 'unauthorized' || error?.kind === 'forbidden'

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
        </div>
        <div className="mb-6">
          <UserFilters value={draftFilters} onChange={setDraftFilters} disabled={filtersDisabled} />
        </div>

        {loading ? (
          <div role="status" aria-live="polite" className="rounded-lg border border-[#B8CBEF] bg-[#E9F1FF] px-6 py-12 text-center text-[#011140]">
            <LoaderCircle className="mx-auto animate-spin text-[#0439D9]" size={30} aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold">Cargando usuarios...</p>
          </div>
        ) : error ? (
          <div role="alert" className="rounded-lg border border-[#B91C1C] bg-white px-6 py-8 text-center">
            <CircleAlert className="mx-auto text-[#B91C1C]" size={30} aria-hidden="true" />
            <h2 className="mt-3 text-base font-bold text-[#B91C1C]">
              {error.kind === 'forbidden'
                ? 'Acceso restringido'
                : error.kind === 'unauthorized'
                  ? 'Sesión expirada'
                  : 'No pudimos cargar los usuarios'}
            </h2>
            <p className="mt-2 text-sm text-[#B91C1C]">{error.message}</p>
            {(error.kind === 'network' || error.kind === 'unknown') && onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="mt-5 inline-flex h-11 items-center rounded-md bg-[#0439D9] px-5 text-sm font-semibold text-white hover:bg-[#011140] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] focus-visible:ring-offset-2"
              >
                Reintentar
              </button>
            ) : null}
          </div>
        ) : users.length > 0 ? (
          <>
            <div className="lg:hidden">
              <UserCardList users={users} />
            </div>
            <div className="hidden lg:block">
              <UserTable users={users} />
            </div>
            {onPageChange ? (
              <UserPagination
                page={page}
                pageSize={pageSize}
                totalRecords={totalRecords}
                totalPages={totalPages}
                onPageChange={onPageChange}
              />
            ) : null}
          </>
        ) : (
          <EmptyState message={hasActiveFilters ? 'No se encontraron usuarios con los filtros seleccionados.' : undefined} />
        )}
      </div>
    </section>
  )
}

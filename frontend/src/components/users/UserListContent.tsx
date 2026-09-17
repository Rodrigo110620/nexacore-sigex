import { CircleAlert, Download, LoaderCircle, UserPlus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import EmptyState from './EmptyState'
import UserCardList from './UserCardList'
import UserFilters from './UserFilters'
import UserTable from './UserTable'
import UserPagination from './UserPagination'
import UserStatsCards from './UserStatsCards'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import type { UserLoadError } from '../../hooks/useUsers'
import type { UserFilterParams, UserListItem } from '../../types/user'
import type { UserStats } from '../../types/totalUser'

interface UserListContentProps {
  users: UserListItem[]
  stats?: UserStats
  onFiltersChange?: (filters: UserFilterParams) => void
  loading?: boolean
  error?: UserLoadError | null
  page?: number
  pageSize?: number
  totalRecords?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  onRetry?: () => void
  onRegisterClick?: () => void
}

const initialFilters: UserFilterParams = { search: '', rol: '', estado: '' }

export default function UserListContent({
  users,
  stats,
  onFiltersChange,
  loading = false,
  error = null,
  page = 0,
  pageSize = 10,
  totalRecords = users.length,
  totalPages = users.length > 0 ? 1 : 0,
  onPageChange,
  onRetry,
  onRegisterClick,
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
    <section aria-labelledby="users-title" className="bg-transparent px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="-mx-4 -mt-8 mb-6 bg-white px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
          <div>
            <p className="text-sm font-semibold text-gray-600">Administración</p>
            <h1 id="users-title" className="mt-1 text-2xl font-bold text-[#011140]">Gestión de usuarios</h1>
            <p className="mt-2 text-sm text-gray-600">Consulta las cuentas registradas, sus roles y estados de acceso.</p>
          </div>
        </div>

        <div className="mb-6 rounded-xl bg-white p-3 shadow-sm ring-1 ring-[#D8E3F5] sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="min-w-0 flex-1">
              <UserFilters value={draftFilters} onChange={setDraftFilters} disabled={filtersDisabled} />
            </div>
            <div className="flex flex-wrap gap-2 lg:shrink-0">
              <button
                type="button"
                disabled
                aria-label="Exportar usuarios, no disponible"
                className="inline-flex h-11 items-center gap-2 rounded-md border border-[#D8E3F5] bg-[#F8FAFC] px-4 text-sm font-semibold text-[#627A9B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-80"
              >
                <Download size={16} aria-hidden="true" />
                Exportar
              </button>
              <button
                type="button"
                onClick={onRegisterClick}
                disabled={!onRegisterClick}
                aria-label="Registrar Usuario"
                className="inline-flex h-11 items-center gap-2 rounded-md bg-[#0439D9] px-4 text-sm font-semibold text-white hover:bg-[#0c41e1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <UserPlus size={16} aria-hidden="true" />
                Registrar Usuario
              </button>
            </div>
          </div>
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

        {stats && (
          <div className="mt-6">
            <UserStatsCards stats={stats} />
          </div>
        )}
      </div>
    </section>
  )
}
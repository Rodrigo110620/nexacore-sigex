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
  onEditClick?: (user: UserListItem) => void
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
  onEditClick,
}: UserListContentProps) {
  const [draftFilters, setDraftFilters] = useState<UserFilterParams>(initialFilters)
  const debouncedSearch = useDebouncedValue(draftFilters.search, 300)
  const lastEmittedRef = useRef<UserFilterParams>(initialFilters)
  const hasActiveFilters = Boolean(draftFilters.search.trim() || draftFilters.rol || draftFilters.estado)
  const filtersDisabled = error?.kind === 'unauthorized' || error?.kind === 'forbidden'

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
    <section aria-label="Gestión de usuarios" className="bg-transparent px-3 py-4 sm:px-6 sm:py-8 min-[960px]:px-4 xl:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 bg-transparent sm:mb-6 min-[960px]:rounded-xl min-[960px]:bg-white min-[960px]:p-4 min-[960px]:shadow-sm min-[960px]:ring-1 min-[960px]:ring-[#D8E3F5]">
          <div className="flex flex-col gap-3 min-[960px]:flex-row min-[960px]:flex-wrap min-[960px]:items-end xl:flex-nowrap">
            <div className="min-w-0 flex-1 min-[960px]:basis-full xl:basis-auto">
              <UserFilters value={draftFilters} onChange={setDraftFilters} disabled={filtersDisabled} />
            </div>
            <div className="order-first grid grid-cols-[minmax(0,1fr)_auto] gap-2 min-[960px]:order-last min-[960px]:ml-auto min-[960px]:flex min-[960px]:shrink-0">
              <button
                type="button"
                disabled
                aria-label="Exportar usuarios, no disponible"
                className="order-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[#D8E3F5] bg-white px-3 text-sm font-semibold text-[#627A9B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-80 min-[960px]:order-1 min-[960px]:w-auto min-[960px]:bg-[#F8FAFC] min-[960px]:px-4"
              >
                <Download size={16} aria-hidden="true" />
                <span className="truncate">Exportar</span>
              </button>
              <button
                type="button"
                onClick={onRegisterClick}
                disabled={!onRegisterClick}
                aria-label="Registrar Usuario"
                className="order-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#0439D9] px-3 text-sm font-semibold text-white hover:bg-[#0c41e1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 min-[960px]:order-2 min-[960px]:w-auto min-[960px]:px-4"
              >
                <UserPlus size={16} aria-hidden="true" className="shrink-0" />
                <span className="truncate">Registrar Usuario</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          {stats && (
            <div className="order-1 mb-4 min-[960px]:order-2 min-[960px]:mb-0 min-[960px]:mt-6">
              <UserStatsCards stats={stats} />
            </div>
          )}
          <div className="order-2 min-[960px]:order-1">
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
              <div className="rounded-xl bg-[#E9F1FF] p-3 min-[960px]:rounded-none min-[960px]:bg-transparent min-[960px]:p-0">
                <div className="min-[960px]:hidden">
                  <UserCardList users={users} onEditClick={onEditClick} />
                </div>
                <div className="hidden min-[960px]:block">
                  <UserTable users={users} onEditClick={onEditClick} />
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
              </div>
            ) : (
              <EmptyState message={hasActiveFilters ? 'No se encontraron usuarios con los filtros seleccionados.' : undefined} />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

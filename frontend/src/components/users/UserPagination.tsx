import { ChevronLeft, ChevronRight } from 'lucide-react'

type PaginationItem = number | 'ellipsis-start' | 'ellipsis-end'

function getPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index)
  }

  const lastPage = totalPages - 1

  if (currentPage <= 3) {
    return [0, 1, 2, 3, 4, 'ellipsis-end', lastPage]
  }

  if (currentPage >= lastPage - 3) {
    return [0, 'ellipsis-start', lastPage - 4, lastPage - 3, lastPage - 2, lastPage - 1, lastPage]
  }

  return [
    0,
    'ellipsis-start',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    'ellipsis-end',
    lastPage,
  ]
}

interface UserPaginationProps {
  page: number
  totalPages: number
  totalRecords: number
  pageSize: number
  onPageChange: (page: number) => void
  disabled?: boolean
}

export default function UserPagination({
  page,
  totalPages,
  totalRecords,
  pageSize,
  onPageChange,
  disabled = false,
}: UserPaginationProps) {
  if (totalRecords === 0 || totalPages === 0) return null

  const currentPage = Math.min(Math.max(page, 0), totalPages - 1)
  const firstRecord = currentPage * pageSize + 1
  const lastRecord = Math.min((currentPage + 1) * pageSize, totalRecords)
  const isFirstPage = currentPage === 0
  const isLastPage = currentPage === totalPages - 1
  const paginationItems = getPaginationItems(currentPage, totalPages)

  return (
    <nav
      aria-label="Paginación de usuarios"
      className="mt-6 flex flex-col gap-3 rounded-lg border border-[#D8E3F5] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-[#011140]">
        Mostrando <span className="font-semibold">{firstRecord}–{lastRecord}</span> de{' '}
        <span className="font-semibold">{totalRecords}</span> usuarios
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={disabled || isFirstPage}
          aria-label="Página anterior"
          className="inline-flex h-11 items-center gap-1 rounded-md border border-[#B8CBEF] bg-white px-3 text-sm font-semibold text-[#0439D9] hover:bg-[#E9F1FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
        >
          <ChevronLeft size={17} aria-hidden="true" />
          Anterior
        </button>

        <div className="flex flex-wrap items-center justify-center gap-1" aria-label={`Página ${currentPage + 1} de ${totalPages}`}>
          {paginationItems.map((item) => {
            if (typeof item !== 'number') {
              return (
                <span key={item} aria-hidden="true" className="inline-flex h-11 min-w-7 items-center justify-center px-1 text-[#011140]">
                  …
                </span>
              )
            }

            const isCurrent = item === currentPage
            return (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                disabled={disabled || item < 0 || item >= totalPages}
                aria-label={`Ir a la página ${item + 1}`}
                aria-current={isCurrent ? 'page' : undefined}
                className={`inline-flex h-11 min-w-11 items-center justify-center rounded-md border px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 ${
                  isCurrent
                    ? 'border-[#0439D9] bg-[#0439D9] text-white'
                    : 'border-[#B8CBEF] bg-white text-[#0439D9] hover:bg-[#E9F1FF]'
                }`}
              >
                {item + 1}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={disabled || isLastPage}
          aria-label="Página siguiente"
          className="inline-flex h-11 items-center gap-1 rounded-md border border-[#B8CBEF] bg-white px-3 text-sm font-semibold text-[#0439D9] hover:bg-[#E9F1FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
        >
          Siguiente
          <ChevronRight size={17} aria-hidden="true" />
        </button>
      </div>
    </nav>
  )
}

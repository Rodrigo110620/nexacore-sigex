import axios from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getUsers } from '../services/userService'
import type { UserFilterParams } from '../types/user'
import type { UserListPage } from '../types/userApi'

export type UserLoadErrorKind =
  | 'unauthorized'
  | 'forbidden'
  | 'network'
  | 'unknown'

export interface UserLoadError {
  kind: UserLoadErrorKind
  message: string
}

export interface UseUsersOptions {
  size?: number
}

const initialFilters: UserFilterParams = { search: '', rol: '', estado: '' }

function createEmptyPage(size: number): UserListPage {
  return {
    contenido: [],
    pagina: 0,
    tamano: size,
    totalRegistros: 0,
    totalPaginas: 0,
  }
}

function classifyError(error: unknown): UserLoadError {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      return {
        kind: 'unauthorized',
        message: 'Tu sesión expiró. Ingresa nuevamente para continuar.',
      }
    }

    if (error.response?.status === 403) {
      const message = error.response.data?.mensaje
      return {
        kind: 'forbidden',
        message: typeof message === 'string' && message.trim()
          ? message
          : 'No tienes permisos para consultar los usuarios.',
      }
    }

    if (!error.response) {
      return {
        kind: 'network',
        message: 'No se pudo conectar con el servidor.',
      }
    }
  }

  return {
    kind: 'unknown',
    message: 'No se pudo cargar la lista de usuarios.',
  }
}

export default function useUsers(options: UseUsersOptions = {}) {
  const size = options.size ?? 10
  const [data, setData] = useState<UserListPage>(() => createEmptyPage(size))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<UserLoadError | null>(null)
  const [filters, setFilters] = useState<UserFilterParams>(initialFilters)
  const [page, setPage] = useState(0)
  const [retryCount, setRetryCount] = useState(0)
  const requestIdRef = useRef(0)

  useEffect(() => {
    const controller = new AbortController()
    const requestId = ++requestIdRef.current

    setLoading(true)
    setError(null)

    getUsers({
      page,
      size,
      search: filters.search,
      rol: filters.rol,
      estado: filters.estado,
    }, controller.signal)
      .then((response) => {
        if (controller.signal.aborted || requestId !== requestIdRef.current) return
        setData(response)
        setLoading(false)
      })
      .catch((requestError: unknown) => {
        if (
          controller.signal.aborted ||
          requestId !== requestIdRef.current ||
          axios.isCancel(requestError) ||
          (axios.isAxiosError(requestError) && requestError.code === 'ERR_CANCELED')
        ) return

        setError(classifyError(requestError))
        setLoading(false)
      })

    return () => {
      controller.abort()
    }
  }, [filters, page, retryCount, size])

  const updateFilters = useCallback((nextFilters: UserFilterParams) => {
    setFilters((currentFilters) => {
      const didChange =
        currentFilters.search !== nextFilters.search ||
        currentFilters.rol !== nextFilters.rol ||
        currentFilters.estado !== nextFilters.estado

      return didChange ? nextFilters : currentFilters
    })
    setPage(0)
  }, [])

  const changePage = useCallback((nextPage: number) => {
    const normalizedPage = Number.isFinite(nextPage)
      ? Math.max(0, Math.trunc(nextPage))
      : 0
    setPage((currentPage) => currentPage === normalizedPage ? currentPage : normalizedPage)
  }, [])

  const retry = useCallback(() => {
    setRetryCount((currentCount) => currentCount + 1)
  }, [])

  return {
    data,
    users: data.contenido,
    loading,
    error,
    filters,
    page,
    size,
    updateFilters,
    changePage,
    retry,
  }
}

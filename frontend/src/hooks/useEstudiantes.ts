import axios from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getEstudiantes } from '../services/estudianteService'
import type { EstudianteFilterParams, EstudianteListPage } from '../types/estudiante'

export type EstudianteLoadErrorKind = 'unauthorized' | 'forbidden' | 'network' | 'unknown'

export interface EstudianteLoadError {
  kind: EstudianteLoadErrorKind
  message: string
}

export interface UseEstudiantesOptions {
  size?: number
}

const initialFilters: EstudianteFilterParams = { search: '', idFacultad: '', idCarrera: '' }

function createEmptyPage(size: number): EstudianteListPage {
  return { contenido: [], pagina: 0, tamano: size, totalRegistros: 0, totalPaginas: 0 }
}

function classifyError(error: unknown): EstudianteLoadError {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      return { kind: 'unauthorized', message: 'Tu sesión expiró. Ingresa nuevamente.' }
    }
    if (error.response?.status === 403) {
      return { kind: 'forbidden', message: 'No tienes permisos para consultar estudiantes.' }
    }
    if (!error.response) {
      return { kind: 'network', message: 'No se pudo conectar con el servidor.' }
    }
  }
  return { kind: 'unknown', message: 'No se pudo cargar la lista de estudiantes.' }
}

export default function useEstudiantes(options: UseEstudiantesOptions = {}) {
  const size = options.size ?? 5
  const [data, setData] = useState<EstudianteListPage>(() => createEmptyPage(size))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<EstudianteLoadError | null>(null)
  const [filters, setFilters] = useState<EstudianteFilterParams>(initialFilters)
  const [page, setPage] = useState(0)
  const [retryCount, setRetryCount] = useState(0)
  const requestIdRef = useRef(0)

  useEffect(() => {
    const controller = new AbortController()
    const requestId = ++requestIdRef.current

    getEstudiantes(
      {
        page,
        size,
        search: filters.search,
        idFacultad: filters.idFacultad,
        idCarrera: filters.idCarrera,
      },
      controller.signal,
    )
      .then((response) => {
        if (controller.signal.aborted || requestId !== requestIdRef.current) return
        setData(response)
        setLoading(false)
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted || requestId !== requestIdRef.current) return
        if (
          axios.isCancel(requestError) ||
          (axios.isAxiosError(requestError) && requestError.code === 'ERR_CANCELED')
        )
          return
        setError(classifyError(requestError))
        setLoading(false)
      })

    return () => controller.abort()
  }, [filters, page, retryCount, size])

  const updateFilters = useCallback((nextFilters: EstudianteFilterParams) => {
    setLoading(true)
    setError(null)
    setFilters((current) => {
      const didChange =
        current.search !== nextFilters.search ||
        current.idFacultad !== nextFilters.idFacultad ||
        current.idCarrera !== nextFilters.idCarrera
      return didChange ? nextFilters : current
    })
    setPage(0)
  }, [])

  const changePage = useCallback((nextPage: number) => {
    const normalized = Number.isFinite(nextPage) ? Math.max(0, Math.trunc(nextPage)) : 0
    setPage((current) => {
      if (current === normalized) return current
      setLoading(true)
      setError(null)
      return normalized
    })
  }, [])

  const retry = useCallback(() => {
    setLoading(true)
    setError(null)
    setRetryCount((c) => c + 1)
  }, [])

  return {
    data,
    estudiantes: data.contenido,
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
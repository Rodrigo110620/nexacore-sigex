import { useEffect, useState } from 'react'
import useEnVivo from './useEnVivo'
import axios from 'axios'
import {
  listarEstudiantesExamen,
  obtenerResumenExamen,
  type EstudianteAsignado,
  type FiltroEstado,
  type ResumenEstudiantes,
} from '../services/controlExamenService'
import type { PageResponse } from '../types/userApi'

interface Resultado {
  alcance: string
  numeroPagina: number
  pagina?: PageResponse<EstudianteAsignado>
  error?: string
  accesoDenegado?: boolean
}

function mensajeDeError(error: unknown): string {
  const datos = axios.isAxiosError(error) ? (error.response?.data as { mensaje?: string } | undefined) : undefined
  return datos?.mensaje ?? 'No se pudo cargar la lista de estudiantes. Intenta de nuevo.'
}

/**
 * Resumen y lista paginada de los estudiantes del examen. Cambiar de pestaña vuelve a la página 0.
 * "cargando" se deriva de si la última respuesta corresponde a la pestaña y página actuales.
 */
export default function useEstudiantesExamen(idExamen: number) {
  const [estado, setEstado] = useState<FiltroEstado>('TODOS')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768 ? 3 : 5)
  const [resumen, setResumen] = useState<ResumenEstudiantes>()
  const [resultado, setResultado] = useState<Resultado>()
  /** Sube con cada cambio en vivo del examen: recarga resumen y lista sin volver a "cargando". */
  const [recarga, setRecarga] = useState(0)

  useEnVivo((c) => c.idExamen === idExamen || c.tipo === 'FOTO', () => setRecarga((n) => n + 1))
  const alcance = `${idExamen}|${estado}|${pageSize}`
  const idValido = Number.isInteger(idExamen) && idExamen > 0

  useEffect(() => {
    const actualizar = () => {
      const nuevo = window.innerWidth < 768 ? 3 : 5
      setPageSize(nuevo)
      setPage(0)
    }
    window.addEventListener('resize', actualizar)
    return () => window.removeEventListener('resize', actualizar)
  }, [])

  useEffect(() => {
    if (!idValido) return
    let vigente = true
    obtenerResumenExamen(idExamen)
      .then((datos) => {
        if (vigente) setResumen(datos)
      })
      .catch(() => undefined) // el error del examen lo muestra la lista
    return () => {
      vigente = false
    }
  }, [idExamen, idValido, recarga])

  useEffect(() => {
    if (!idValido) return
    let vigente = true
    listarEstudiantesExamen(idExamen, estado, page, pageSize)
      .then((pagina) => {
        if (!vigente) return
        const ultimaPagina = Math.max(0, pagina.totalPaginas - 1)
        if (page > ultimaPagina) {
          setPage(ultimaPagina)
          return
        }
        setResultado({ alcance, numeroPagina: page, pagina })
      })
      .catch((error) => {
        if (vigente) setResultado({ alcance, numeroPagina: page, error: mensajeDeError(error), accesoDenegado: axios.isAxiosError(error) && error.response?.status === 403 })
      })
    return () => {
      vigente = false
    }
  }, [alcance, idExamen, idValido, estado, page, pageSize, recarga])

  // Solo la última respuesta del mismo examen, filtro y tamaño puede servir como vista previa.
  const delListado = resultado?.alcance === alcance ? resultado : undefined
  const actual = delListado?.numeroPagina === page ? delListado : undefined
  const cambiarEstado = (nuevo: FiltroEstado) => {
    if (nuevo !== estado) setResultado(undefined)
    setEstado(nuevo)
    setPage(0)
  }

  const refetch = () => {
    setResultado((previo) => previo?.error ? undefined : previo)
    setRecarga((n) => n + 1)
  }
  return { resumen, estado, cambiarEstado, setPage, pagina: delListado?.pagina, error: actual?.error, accesoDenegado: actual?.accesoDenegado, cargando: !actual, refetch }
}

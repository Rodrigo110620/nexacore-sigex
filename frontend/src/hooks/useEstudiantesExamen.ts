import { useEffect, useState } from 'react'
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
  clave: string
  pagina?: PageResponse<EstudianteAsignado>
  error?: string
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
  const [resumen, setResumen] = useState<ResumenEstudiantes>()
  const [resultado, setResultado] = useState<Resultado>()
  const clave = `${idExamen}|${estado}|${page}`
  const idValido = Number.isInteger(idExamen) && idExamen > 0

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
  }, [idExamen, idValido])

  useEffect(() => {
    if (!idValido) return
    let vigente = true
    listarEstudiantesExamen(idExamen, estado, page)
      .then((pagina) => {
        if (vigente) setResultado({ clave, pagina })
      })
      .catch((error) => {
        if (vigente) setResultado({ clave, error: mensajeDeError(error) })
      })
    return () => {
      vigente = false
    }
  }, [clave, idExamen, idValido, estado, page])

  const actual = resultado?.clave === clave ? resultado : undefined
  const cambiarEstado = (nuevo: FiltroEstado) => {
    setEstado(nuevo)
    setPage(0)
  }

  return { resumen, estado, cambiarEstado, setPage, pagina: actual?.pagina, error: actual?.error, cargando: !actual }
}

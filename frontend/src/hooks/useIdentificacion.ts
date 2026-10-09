import { useCallback, useRef, useState } from 'react'
import axios from 'axios'
import {
  identificarEstudiante,
  type EstudianteIdentificado,
  type TipoIdentificacion,
} from '../services/identificacionService'

export type BusquedaEstudiante =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'encontrado' | 'no_vinculado'; estudiante: EstudianteIdentificado }
  | { status: 'no_encontrado' | 'error'; mensaje: string }

const IDLE: BusquedaEstudiante = { status: 'idle' }

/** 404 → no_encontrado; cualquier otro fallo → error, con el mensaje del backend si lo trae. */
function busquedaFallida(error: unknown): BusquedaEstudiante {
  const respuesta = axios.isAxiosError(error) ? error.response : undefined
  const mensaje = (respuesta?.data as { mensaje?: string } | undefined)?.mensaje
  if (respuesta?.status === 404) {
    return { status: 'no_encontrado', mensaje: mensaje ?? 'No se encontró al estudiante.' }
  }
  return { status: 'error', mensaje: mensaje ?? 'No se pudo consultar al estudiante. Intenta de nuevo.' }
}

/**
 * Identifica a un estudiante dentro de un examen.
 * Solo cuenta la última búsqueda: si llega tarde la respuesta de una anterior,
 * o se llamó a reset() mientras cargaba, se descarta.
 */
export default function useIdentificacion(idExamen: number) {
  const [busqueda, setBusqueda] = useState<BusquedaEstudiante>(IDLE)
  const ultimaBusqueda = useRef(0)

  const buscar = useCallback(
    async (tipo: TipoIdentificacion, valor: string) => {
      const id = ++ultimaBusqueda.current
      setBusqueda({ status: 'loading' })
      try {
        const estudiante = await identificarEstudiante(idExamen, tipo, valor)
        if (id !== ultimaBusqueda.current) return
        const status = estudiante.estado === 'NO_VINCULADO' ? 'no_vinculado' : 'encontrado'
        setBusqueda({ status, estudiante })
      } catch (error) {
        if (id === ultimaBusqueda.current) setBusqueda(busquedaFallida(error))
      }
    },
    [idExamen],
  )

  const reset = useCallback(() => {
    ultimaBusqueda.current += 1
    setBusqueda(IDLE)
  }, [])

  return { busqueda, buscar, reset }
}

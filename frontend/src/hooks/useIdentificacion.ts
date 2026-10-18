import { useCallback, useRef, useState } from 'react'
import axios from 'axios'
import {
  identificarEstudiante,
  identificarQr,
  type EstudianteIdentificado,
  type TipoIdentificacion,
} from '../services/identificacionService'
import { isNetworkError, isOffline } from '../utils/examFormUtils'

export type BusquedaEstudiante =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'qr_invalido' }
  | { status: 'encontrado' | 'no_vinculado'; estudiante: EstudianteIdentificado }
  | { status: 'no_encontrado' | 'error'; mensaje: string }

const IDLE: BusquedaEstudiante = { status: 'idle' }

export const SIN_CONEXION_IDENTIFICAR =
  'Sin conexión a Internet: no es posible identificar al estudiante. Verifica tu conexión y vuelve a presionar Buscar.'

export type ResultadoBusquedaQr = 'encontrado' | 'no_vinculado' | 'invalido' | 'error'

/** Sin conexión → error propio; 404 → no_encontrado; cualquier otro fallo → error, con el mensaje del backend si lo trae. */
function busquedaFallida(error: unknown, mostrarMensajeBackend = true): BusquedaEstudiante {
  if (isNetworkError(error)) return { status: 'error', mensaje: SIN_CONEXION_IDENTIFICAR }
  const respuesta = axios.isAxiosError(error) ? error.response : undefined
  const mensaje = mostrarMensajeBackend ? (respuesta?.data as { mensaje?: string } | undefined)?.mensaje : undefined
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
      // Sin conexión no se intenta la búsqueda; el método y el dato quedan en pantalla para reintentar.
      if (isOffline()) {
        setBusqueda({ status: 'error', mensaje: SIN_CONEXION_IDENTIFICAR })
        return
      }
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

  const buscarQr = useCallback(async (contenido: string): Promise<ResultadoBusquedaQr> => {
    const id = ++ultimaBusqueda.current
    if (isOffline()) { setBusqueda({ status: 'error', mensaje: SIN_CONEXION_IDENTIFICAR }); return 'error' }
    setBusqueda({ status: 'loading' })
    try {
      const estudiante = await identificarQr(idExamen, contenido)
      if (id !== ultimaBusqueda.current) return 'error'
      const resultado = estudiante.estado === 'NO_VINCULADO' ? 'no_vinculado' : 'encontrado'
      setBusqueda({ status: resultado, estudiante })
      return resultado
    } catch (error) {
      if (id !== ultimaBusqueda.current) return 'error'
      const respuesta = axios.isAxiosError(error) ? error.response : undefined
      if (respuesta?.status === 400) {
        setBusqueda({ status: 'qr_invalido' })
        return 'invalido'
      }
      // Un error del servidor podría repetir la credencial recibida: no mostrarlo en el flujo QR.
      setBusqueda(busquedaFallida(error, false))
      return 'error'
    }
  }, [idExamen])

  const reset = useCallback(() => {
    ultimaBusqueda.current += 1
    setBusqueda(IDLE)
  }, [])

  return { busqueda, buscar, buscarQr, reset }
}

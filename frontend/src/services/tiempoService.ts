import api from './api'

/** GET /tiempo: hora del servidor (Bolivia). */
interface TiempoServidor {
  ahora: string
  epochMs: number
  zona: string
  offsetMinutos: number
}

/** Bolivia (UTC-4, sin horario de verano): se usa hasta que responde el servidor. */
const OFFSET_BOLIVIA = -240

let diferenciaMs = 0
let offsetMinutos = OFFSET_BOLIVIA
let sincronizacion: Promise<void> | null = null

/**
 * Corrige el reloj del dispositivo con la hora del servidor (una vez por sesión). Así un celular con
 * la hora mal no muestra otro tiempo de examen. Sin conexión, se queda con el reloj del dispositivo.
 */
export function sincronizarReloj(): Promise<void> {
  if (!sincronizacion) {
    sincronizacion = (async () => {
      const antes = Date.now()
      const { data } = await api.get<TiempoServidor>('/tiempo')
      const despues = Date.now()
      // La respuesta tardó (despues - antes): el servidor marcó su hora a mitad de camino.
      diferenciaMs = data.epochMs - (antes + despues) / 2
      offsetMinutos = data.offsetMinutos
    })().catch(() => {
      sincronizacion = null
    })
  }
  return sincronizacion
}

/** Instante actual según el servidor, en milisegundos. */
export const ahoraServidorMs = () => Date.now() + diferenciaMs

/** Diferencia con UTC de la zona del servidor, en minutos (Bolivia: -240). */
export const offsetServidorMinutos = () => offsetMinutos

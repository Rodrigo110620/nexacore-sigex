import api from './api'

/** Reporte del control de ingreso notificado al personal (GET /notificaciones). */
export interface Notificacion {
  id: number
  tipo: 'FOTO_REPORTADA' | 'QR_DUPLICADO' | 'INTENTO_INGRESO' | 'AULA_INCORRECTA' | 'EXCEPCION_NO_HABILITADO'
    | 'EXPULSION' | 'INGRESO_MANUAL' | string
  titulo: string
  detalle: string | null
  idExamen: number | null
  idEstudiante: number | null
  enlace: string | null
  creadaEn: string
  leida: boolean
}

/** Evento de ventana con cada notificación en vivo, para que la pantalla abierta se actualice. */
export const EVENTO_NOTIFICACION = 'sigex:notificacion'

/** Escucha las notificaciones en vivo que recibe la campana (sin abrir otra conexión). */
export function alRecibirNotificacion(fn: (n: Notificacion) => void): () => void {
  const manejador = (e: Event) => fn((e as CustomEvent<Notificacion>).detail)
  window.addEventListener(EVENTO_NOTIFICACION, manejador)
  return () => window.removeEventListener(EVENTO_NOTIFICACION, manejador)
}

export async function listarNotificaciones(): Promise<Notificacion[]> {
  const { data } = await api.get<Notificacion[]>('/notificaciones')
  return data
}

export async function marcarNotificacionLeida(id: number): Promise<void> {
  await api.post(`/notificaciones/${id}/leida`)
}

export async function marcarTodasLeidas(): Promise<void> {
  await api.post('/notificaciones/leidas')
}

/** Quita una notificación de mi lista; los demás la siguen viendo. */
export async function quitarNotificacion(id: number): Promise<void> {
  await api.delete(`/notificaciones/${id}`)
}

/** Limpia todas mis notificaciones hasta ahora; las nuevas siguen llegando. */
export async function limpiarNotificaciones(): Promise<void> {
  await api.delete('/notificaciones')
}

/** Aviso liviano de que algo cambió (evento "cambio"): la pantalla abierta recarga si le afecta. */
export interface CambioEnVivo {
  tipo: 'INGRESO' | 'HABILITACION' | 'EXAMEN' | 'FOTO' | 'RECONECTADO' | string
  idExamen: number | null
  idEstudiante: number | null
}

/** Evento de ventana con cada cambio en vivo (también con cada notificación y al reconectar). */
export const EVENTO_CAMBIO = 'sigex:cambio'

export function emitirCambioLocal(cambio: CambioEnVivo) {
  window.dispatchEvent(new CustomEvent(EVENTO_CAMBIO, { detail: cambio }))
}

export function alRecibirCambio(fn: (c: CambioEnVivo) => void): () => void {
  const manejador = (e: Event) => fn((e as CustomEvent<CambioEnVivo>).detail)
  window.addEventListener(EVENTO_CAMBIO, manejador)
  return () => window.removeEventListener(EVENTO_CAMBIO, manejador)
}

interface Manejadores {
  onNotificacion?: (n: Notificacion) => void
  onCambio?: (c: CambioEnVivo) => void
  onReconectado?: () => void
}

/** Notificaciones y cambios del personal (GET /notificaciones/stream). */
export function escucharNotificaciones(
  onNotificacion: (n: Notificacion) => void,
  onReconectado?: () => void,
  onCambio?: (c: CambioEnVivo) => void,
): () => void {
  return escucharEventos('/notificaciones/stream', { onNotificacion, onCambio, onReconectado })
}

/**
 * Escucha eventos en vivo (Server-Sent Events). Usa fetch para mandar el token en la cabecera
 * (EventSource no permite cabeceras y el token no debe ir en la URL). Si la conexión se corta,
 * reconecta sola con espera creciente y avisa con onReconectado para recargar lo perdido.
 * Devuelve la función para dejar de escuchar.
 */
export function escucharEventos(ruta: string, manejadores: Manejadores): () => void {
  const control = new AbortController()
  const base = (api.defaults.baseURL ?? '/api/v1').replace(/\/$/, '')
  let espera = 2000
  let primera = true

  const conectar = async () => {
    while (!control.signal.aborted) {
      const token = localStorage.getItem('token')
      if (!token) return
      try {
        const respuesta = await fetch(`${base}${ruta}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
          signal: control.signal,
        })
        // Sesión vencida o sin permiso: no insistir (el resto de la app maneja el 401).
        if (respuesta.status === 401 || respuesta.status === 403) return
        if (!respuesta.ok || !respuesta.body) throw new Error(`HTTP ${respuesta.status}`)
        if (!primera) manejadores.onReconectado?.()
        primera = false
        espera = 2000
        await leerEventos(respuesta.body, manejadores)
      } catch {
        if (control.signal.aborted) return
      }
      await new Promise((r) => setTimeout(r, espera))
      espera = Math.min(espera * 2, 30000)
    }
  }
  void conectar()
  return () => control.abort()
}

async function leerEventos(cuerpo: ReadableStream<Uint8Array>, manejadores: Manejadores) {
  const lector = cuerpo.getReader()
  const decoder = new TextDecoder()
  let pendiente = ''
  for (;;) {
    const { value, done } = await lector.read()
    if (done) return
    pendiente += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
    let fin = pendiente.indexOf('\n\n')
    while (fin >= 0) {
      const bloque = pendiente.slice(0, fin)
      pendiente = pendiente.slice(fin + 2)
      const lineas = bloque.split('\n')
      const evento = lineas.find((l) => l.startsWith('event:'))?.slice(6).trim()
      const datos = lineas.filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trimStart()).join('\n')
      if (datos && (evento === 'notificacion' || evento === 'cambio')) {
        try {
          const json = JSON.parse(datos)
          if (evento === 'notificacion') manejadores.onNotificacion?.(json as Notificacion)
          else manejadores.onCambio?.(json as CambioEnVivo)
        } catch {
          // Evento mal formado: se ignora.
        }
      }
      fin = pendiente.indexOf('\n\n')
    }
  }
}

/**
 * Fotos de los estudiantes guardadas en el dispositivo (IndexedDB) para el control sin servidor: son lo que permite
 * reconocer al estudiante en la puerta y no entran en localStorage (unos 50 KB cada una).
 * Si el navegador no tiene IndexedDB (o está bloqueado), todo sigue funcionando, solo sin fotos guardadas.
 */
const BASE = 'sigex-offline'
const ALMACEN = 'fotos'
/** Se borran las que llevan más de 7 días sin actualizarse. */
const VIGENCIA_MS = 7 * 24 * 60 * 60 * 1000

interface FotoGuardada { url: string; foto: Blob; guardadaEn: number }

let abierta: Promise<IDBDatabase | null> | null = null
function abrir(): Promise<IDBDatabase | null> {
  if (abierta) return abierta
  abierta = new Promise((resolver) => {
    try {
      if (typeof indexedDB === 'undefined') { resolver(null); return }
      const pedido = indexedDB.open(BASE, 1)
      pedido.onupgradeneeded = () => { pedido.result.createObjectStore(ALMACEN, { keyPath: 'url' }) }
      pedido.onsuccess = () => resolver(pedido.result)
      pedido.onerror = () => resolver(null)
      pedido.onblocked = () => resolver(null)
    } catch {
      resolver(null)
    }
  })
  return abierta
}

function operar<T>(modo: IDBTransactionMode, accion: (almacen: IDBObjectStore) => IDBRequest<T> | void): Promise<T | null> {
  return abrir().then((db) => new Promise<T | null>((resolver) => {
    if (!db) { resolver(null); return }
    try {
      const tx = db.transaction(ALMACEN, modo)
      const pedido = accion(tx.objectStore(ALMACEN))
      tx.oncomplete = () => resolver(pedido ? (pedido.result as T) : null)
      tx.onerror = () => resolver(null)
      tx.onabort = () => resolver(null)
    } catch {
      resolver(null)
    }
  }))
}

/** La clave es la ruta de la foto sin el prefijo de la API (/estudiantes/4/foto). */
function clave(url: string) { return url.replace(/^.*\/api\/v1/, '') }

export async function guardarFotoOffline(url: string, foto: Blob): Promise<void> {
  await operar('readwrite', (a) => { a.put({ url: clave(url), foto, guardadaEn: Date.now() } satisfies FotoGuardada) })
}

export async function fotoOffline(url: string): Promise<Blob | null> {
  const guardada = await operar<FotoGuardada | undefined>('readonly', (a) => a.get(clave(url)))
  return guardada?.foto ?? null
}

/** Borra las fotos viejas para no ocupar espacio de más. */
export async function limpiarFotosOffline(ahora = Date.now()): Promise<void> {
  await operar('readwrite', (a) => {
    const cursor = a.openCursor()
    cursor.onsuccess = () => {
      const c = cursor.result
      if (!c) return
      if (ahora - (c.value as FotoGuardada).guardadaEn > VIGENCIA_MS) c.delete()
      c.continue()
    }
  })
}

/* SIGEX: service worker. Lo genera el build (vite.config.ts) con la lista de archivos de esa versión.
 * Guarda la app (HTML, JS, CSS, imágenes) para que abra aunque el servidor o el internet estén caídos.
 * Nunca guarda /api: los datos los maneja el modo sin conexión del control. */
const VERSION = '__VERSION__'
const ARCHIVOS = __ARCHIVOS__
const CACHE = `sigex-app-${VERSION}`

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE)
    // Uno por uno: si falta un archivo opcional, el resto igual queda guardado.
    await Promise.all(['/', ...ARCHIVOS].map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined)))
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const nombre of await caches.keys()) if (nombre.startsWith('sigex-app-') && nombre !== CACHE) await caches.delete(nombre)
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  // Páginas: primero el servidor (versión nueva tras un despliegue); si no responde, la app guardada.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const respuesta = await fetch(request)
        if (respuesta.ok) return respuesta
        throw new Error(String(respuesta.status))
      } catch {
        return (await caches.match('/', { ignoreSearch: true })) ?? (await caches.match('/index.html')) ?? Response.error()
      }
    })())
    return
  }

  // Archivos estáticos: los guardados primero (tienen hash en el nombre); los nuevos se guardan al pedirlos.
  event.respondWith((async () => {
    const guardado = await caches.match(request)
    if (guardado) return guardado
    const respuesta = await fetch(request)
    if (respuesta.ok && respuesta.type === 'basic') {
      const copia = respuesta.clone()
      void caches.open(CACHE).then((cache) => cache.put(request, copia))
    }
    return respuesta
  })())
})

/**
 * Registra el service worker solo en producción: guarda la app para que abra aunque el servidor esté caído.
 * En desarrollo no, para no servir versiones viejas mientras se programa.
 */
export function registrarServiceWorker(
  entorno: { produccion: boolean } = { produccion: import.meta.env.PROD },
  nav: Navigator = navigator,
) {
  if (!entorno.produccion || !('serviceWorker' in nav)) return false
  window.addEventListener('load', () => {
    nav.serviceWorker.register('/sw.js').catch(() => {
      // Sin service worker la app funciona igual; solo no abre sin servidor.
    })
  })
  return true
}

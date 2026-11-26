/** Evento de ventana que abre la mesa de ayuda (una sola para toda la app: MesaAyudaGlobal). */
export const EVENTO_MESA_AYUDA = 'sigex:mesa-ayuda'

/** Abre la mesa de ayuda; con sesión, el nombre ya viene escrito. Si ya está abierta, no abre otra. */
export function abrirMesaAyuda(nombreInicial = '', temaInicial?: string) {
  window.dispatchEvent(new CustomEvent(EVENTO_MESA_AYUDA, { detail: { nombreInicial, temaInicial } }))
}

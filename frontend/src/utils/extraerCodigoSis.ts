/** Claves en las que un QR con JSON puede traer el código SIS. */
const CLAVES = ['codigoSis', 'codigo_sis', 'codigo']

function desdeJson(texto: string): string | undefined {
  try {
    const datos: unknown = JSON.parse(texto)
    if (!datos || typeof datos !== 'object') return undefined
    const valor = CLAVES.map((clave) => (datos as Record<string, unknown>)[clave]).find((v) => v != null)
    return valor == null ? undefined : String(valor)
  } catch {
    return undefined
  }
}

function desdeUrl(texto: string): string | undefined {
  try {
    const url = new URL(texto)
    const parametro = CLAVES.map((clave) => url.searchParams.get(clave)).find(Boolean)
    return parametro ?? url.pathname.split('/').filter(Boolean).pop()
  } catch {
    return undefined
  }
}

/**
 * Obtiene el código SIS leído de un QR: dentro de un JSON ({"codigoSis": ...}), en una URL
 * (?codigoSis=... o último tramo de la ruta) o, si no, el texto tal cual. Siempre sin espacios.
 */
export function extraerCodigoSis(contenido: string): string {
  const texto = contenido.trim()
  return (desdeJson(texto) ?? desdeUrl(texto) ?? texto).trim()
}
